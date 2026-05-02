const axios = require("axios")
const { getToken } = require("../config/tokenManager")

const Log = async (stack, level, packageName, message) => {
  try {
    const token = await getToken()
    await axios.post(
      "http://20.207.122.201/evaluation-service/logs",
      { stack, level, package: packageName, message },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  } catch (err) {
    console.log("Logging failed:", err.message)
  }
}

module.exports = Log
