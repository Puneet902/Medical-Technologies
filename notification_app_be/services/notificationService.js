const axios = require("axios")
const { getToken } = require("../../config/tokenManager")
const Log = require("../../logging_middleware/logger")

const TYPE_WEIGHT = { Placement: 3, Result: 2, Event: 1 }

function score(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0
  const ts = new Date(notification.Timestamp).getTime()
  return weight * 1e12 + ts
}

async function getTopNotifications(n = 10) {
  const token = await getToken()
  await Log("backend", "info", "service", "Fetching notifications from external API")

  const response = await axios.get(
    "http://20.207.122.201/evaluation-service/notifications",
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const notifications = response.data.notifications || []
  await Log("backend", "info", "service", `Fetched ${notifications.length} notifications, computing top ${n}`)

  const scored = notifications.map(n => ({ ...n, _score: score(n) }))
  scored.sort((a, b) => b._score - a._score)
  const top = scored.slice(0, n).map(({ _score, ...rest }) => rest)

  await Log("backend", "info", "service", `Returning top ${top.length} priority notifications`)
  return top
}

module.exports = { getTopNotifications }
