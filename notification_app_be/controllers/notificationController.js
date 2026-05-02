const { getTopNotifications } = require("../services/notificationService")
const Log = require("../../logging_middleware/logger")

const getPriorityNotifications = async (req, res) => {
  try {
    const n = parseInt(req.query.n) || 10
    const data = await getTopNotifications(n)
    res.json({ success: true, count: data.length, notifications: data })
  } catch (error) {
    await Log("backend", "error", "controller", `Failed to get priority notifications: ${error.message}`)
    res.status(500).json({ success: false, message: "Failed to fetch notifications" })
  }
}

module.exports = { getPriorityNotifications }
