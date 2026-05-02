# Stage 1

## REST API Design — Campus Notification Platform

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get all notifications for the logged-in user |
| GET | `/notifications/:id` | Get a specific notification |
| POST | `/notifications` | Create a new notification (HR/Admin) |
| PATCH | `/notifications/:id/read` | Mark a notification as read |
| DELETE | `/notifications/:id` | Delete a notification |
| GET | `/notifications/unread/count` | Get count of unread notifications |

### Request / Response Schemas

**GET /notifications**
```
Headers: { Authorization: "Bearer <token>" }

Response 200:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement" | "Result" | "Event",
      "message": "string",
      "isRead": false,
      "timestamp": "2026-04-22T17:51:30Z"
    }
  ]
}
```

**POST /notifications**
```
Headers: { Authorization: "Bearer <token>", Content-Type: "application/json" }

Body:
{
  "type": "Placement",
  "message": "Google hiring drive on 10th May",
  "targetStudents": ["student_id_1", "student_id_2"]
}

Response 201:
{
  "notificationId": "uuid",
  "message": "Notification created successfully"
}
```

**PATCH /notifications/:id/read**
```
Headers: { Authorization: "Bearer <token>" }

Response 200:
{
  "message": "Marked as read"
}
```

### Real-Time Notification Mechanism

Use **WebSockets** (via `socket.io`):
- When a student logs in, they join a room identified by their `studentID`
- When HR sends a notification, the server emits it to all target student rooms instantly
- Fallback: Server-Sent Events (SSE) for clients that don't support WebSockets

---

# Stage 2

## Persistent Storage — DB Choice and Schema

**Recommended DB: PostgreSQL**
- ACID compliance ensures no notification is lost
- Relational model fits well (students ↔ notifications many-to-many)
- Rich indexing and partitioning support for scale

### Schema

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  roll_no VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  UNIQUE(student_id, notification_id)
);
```

### Queries Based on Stage 1 APIs

**GET /notifications (for student 1042):**
```sql
SELECT n.id, n.type, n.message, sn.is_read, n.created_at
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notification_id
WHERE sn.student_id = $1
ORDER BY n.created_at DESC;
```

**PATCH /notifications/:id/read:**
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1 AND notification_id = $2;
```

**GET /notifications/unread/count:**
```sql
SELECT COUNT(*) FROM student_notifications
WHERE student_id = $1 AND is_read = FALSE;
```

### Problems at Scale (50,000 students, 5,000,000 notifications)

- Full table scans on `student_notifications` become slow
- `ORDER BY created_at DESC` without indexes is O(n log n) on huge tables
- Write amplification: sending to 50k students inserts 50k rows per notification

**Solutions:**
- Add composite indexes (see Stage 3)
- Partition `student_notifications` by `student_id` range or hash
- Use a message queue for bulk inserts instead of synchronous DB writes

---

# Stage 3

## Query Analysis and Optimization

### Given Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**Is this query accurate?**
Structurally yes, but `SELECT *` is wasteful — it fetches all columns including ones the client doesn't need.

**Why is it slow?**
- No index on `(studentID, isRead, createdAt)` — full table scan on 5M rows
- `SELECT *` increases I/O and memory usage
- With 50k students each having many notifications, this is O(n) without indexing

**Optimized Query:**
```sql
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**Add a composite index:**
```sql
CREATE INDEX idx_notif_student_unread_time
ON notifications(studentID, isRead, createdAt DESC);
```

**Likely computation cost improvement:** Query goes from O(n) full scan to O(log n) index lookup + O(k) result fetch where k = number of unread notifications for that student.

### Should we index every column?

**No.** Adding indexes on every column:
- Slows down every INSERT/UPDATE/DELETE (each index must be updated)
- Wastes disk space
- The query planner may still pick wrong indexes
- Only index columns used in WHERE, JOIN, and ORDER BY clauses

### Query: Students with Placement notification in last 7 days

```sql
SELECT DISTINCT s.id, s.name, s.email
FROM students s
JOIN student_notifications sn ON s.id = sn.student_id
JOIN notifications n ON sn.notification_id = n.id
WHERE n.type = 'Placement'
AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## Performance — DB Overwhelmed on Page Load

**Problem:** Fetching notifications on every page load for every student hits the DB directly, causing high read load.

### Solutions and Tradeoffs

**1. Redis Cache (Recommended)**
- Cache each student's notification list with a TTL (e.g., 60 seconds)
- On new notification: invalidate relevant cache keys
- Tradeoff: Students may see notifications up to 60s late; adds Redis infra cost

**2. Pagination**
- Don't fetch all notifications — fetch 20 at a time with cursor-based pagination
- Reduces query result size dramatically
- Tradeoff: Frontend must implement infinite scroll / "load more"

**3. Push Instead of Pull (WebSocket)**
- Don't fetch on page load — push new notifications via WebSocket when they arrive
- Store only unread count in cache; fetch list only when user opens notification panel
- Tradeoff: Requires persistent WebSocket connections; more complex server infra

**4. Read Replicas**
- Route all GET queries to a read replica of the DB
- Write replica handles inserts only
- Tradeoff: Slight replication lag; adds infrastructure cost

**Best combined strategy:** Redis cache + pagination + WebSocket push for new notifications. The DB only gets queried on cache miss or first load.

---

# Stage 5

## Reliable notify_all Redesign

### Shortcomings of Current Implementation

```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)   # sequential, slow
        save_to_db(student_id, message)   # sequential, slow
        push_to_app(student_id, message)
```

1. **Sequential loop** — sending 50k emails one-by-one is extremely slow
2. **No atomicity** — if `send_email` fails for 200 students, `save_to_db` may have already run for some, causing inconsistency
3. **No retry** — failed emails are silently lost with no way to retry
4. **Partial failure undetected** — no tracking of which students succeeded/failed

### Should DB save and email happen together?

**No.** They should be decoupled:
- DB save is fast and reliable — do it first
- Email is an external call — slow, can fail, should be best-effort with retry

### Redesigned Pseudocode

```
function notify_all(student_ids, message):
    # Step 1: Save all to DB in a single batch insert
    batch_save_to_db(student_ids, message)

    # Step 2: Enqueue all students to a message queue (e.g., Bull/RabbitMQ)
    for student_id in student_ids:
        queue.enqueue("send_notification", { student_id, message })

# Worker processes queue concurrently (e.g., 100 workers in parallel)
worker.process("send_notification", async (job):
    try:
        send_email(job.student_id, job.message)
        push_to_app(job.student_id, job.message)
    catch error:
        queue.retry(job, max_retries=3, backoff=exponential)
        # After max retries, move to dead-letter queue for manual review
)
```

**Benefits:**
- Batch DB insert is O(1) round trip for all 50k students
- Workers process emails in parallel — 100x faster
- Failed emails go to dead-letter queue — no silent losses
- DB is always consistent regardless of email failures

---

# Stage 6

## Priority Inbox — Top N Notifications

### Approach

Priority is determined by two factors:
1. **Type weight**: Placement (3) > Result (2) > Event (1)
2. **Recency**: More recent notifications rank higher within the same type

**Scoring formula:**
```
score = typeWeight * 1e12 + timestamp_ms
```

This ensures type is the dominant factor while recency breaks ties within the same type.

### Maintaining Top 10 as New Notifications Arrive

Use a **min-heap of size 10**:
- When a new notification arrives, compute its score
- If the heap has < 10 items: push it
- If score > heap minimum: remove min, push new notification
- If score ≤ heap minimum: discard

This gives O(log 10) = O(1) per new notification — efficient at any scale.

### Implementation

See `notification_app_be/` for the working implementation.
`GET /api/notifications/priority` returns the top 10 priority notifications.
