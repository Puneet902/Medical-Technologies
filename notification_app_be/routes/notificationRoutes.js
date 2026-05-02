const express = require("express")
const { getPriorityNotifications } = require("../controllers/notificationController")

const router = express.Router()

router.get("/priority", getPriorityNotifications)

module.exports = router
