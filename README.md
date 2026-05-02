<img width="1714" height="463" alt="image" src="https://github.com/user-attachments/assets/abceb63f-a900-4e52-a898-04a3ce2839af" />

<img width="1540" height="875" alt="image" src="https://github.com/user-attachments/assets/c3dbfa0a-b0c9-4a4f-a188-503f5f10e0a5" />

# Backend Engineering Assessment — Afford Medical Technologies

## Project Structure

```
├── logging_middleware/
│   └── logger.js                   # Reusable Log(stack, level, package, message) — posts to eval logging API
├── vehicle_maintenance_scheduler/
│   ├── routes/schedulerRoutes.js
│   ├── controllers/schedulerController.js
│   └── services/schedulerService.js    # Fetches depots & vehicles with auto-auth
├── notification_app_be/
│   ├── routes/notificationRoutes.js
│   ├── controllers/notificationController.js
│   └── services/notificationService.js # Priority inbox — top N by type + recency
├── config/
│   └── tokenManager.js             # Auto-refreshes Bearer token from auth API
├── utils/
│   └── logger.js                   # Wrapper around logging_middleware
├── notification_system_design.md   # Stages 1–6 design document
├── app.js                          # Main Express server (port 3000)
└── .gitignore
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root with your credentials:
   ```
   EMAIL=...
   NAME=...
   ROLL_NO=...
   ACCESS_CODE=...
   CLIENT_ID=...
   CLIENT_SECRET=...
   ```

3. Start the server:
   ```bash
   npm start        # production
   npm run dev      # development (nodemon)
   ```

## API Endpoints

### Vehicle Maintenance Scheduler (port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/schedule` | Fetches depot & vehicle data from external API |

### Notification Service (port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/priority?n=10` | Returns top N priority notifications |

## Scheduler Logic

`vehicle_maintenance_scheduler/scheduler.js` runs a **0/1 knapsack algorithm** over vehicles to maximise total importance score within a depot's mechanic-hour budget.

## Priority Inbox (Stage 6)

Notifications are scored as:
```
score = typeWeight * 1e12 + timestamp_ms
```
Where `Placement=3 > Result=2 > Event=1`. Top N are returned sorted by score.

## Key Design Decisions

- **Auto token refresh**: `config/tokenManager.js` automatically fetches a fresh token when expired — no manual intervention needed.
- **Mandatory logging**: Every significant event is logged via `logging_middleware/logger.js` using `Log(stack, level, package, message)`.
- **No hardcoded secrets**: All credentials are loaded from `.env` (excluded from git).

## Notification System Design

See [`notification_system_design.md`](./notification_system_design.md) for full design covering Stages 1–6:
REST API design, DB schema, query optimisation, caching, bulk notification reliability, and priority inbox algorithm.
