const express = require("express");
const { getSchedule } = require("../controllers/schedulerController");

const router = express.Router();

router.get("/schedule", getSchedule);

module.exports = router;
