const { fetchData } = require("../services/schedulerService")

const getSchedule = async (_req, res) => {
  try {
    const data = await fetchData()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedule data"
    })
  }
}

module.exports = { getSchedule }
