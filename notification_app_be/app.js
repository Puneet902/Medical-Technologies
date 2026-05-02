require("dotenv").config({ path: "../.env" })
const express = require("express")
const notificationRoutes = require("./routes/notificationRoutes")

const app = express()
const PORT = process.env.NOTIF_PORT || 3001

app.use(express.json())
app.use("/api/notifications", notificationRoutes)

app.listen(PORT, () => {
  process.stdout.write(`Notification service started on port ${PORT}\n`)
})

module.exports = app
