require("dotenv").config()
const express = require("express");
const requestLogger = require("./logging_middleware/logger");
const schedulerRoutes = require("./vehicle_maintenance_scheduler/routes/schedulerRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(requestLogger);

app.use("/api", schedulerRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Vehicle Maintenance Scheduler API is running" });
});

app.listen(PORT, () => {
  process.stdout.write(`Server started on port ${PORT}\n`);
});

module.exports = app;
