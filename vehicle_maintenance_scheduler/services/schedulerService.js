const axios = require("axios")
const { getToken } = require("../../config/tokenManager")
const { logEvent } = require("../../utils/logger")

const fetchData = async () => {
  try {
    const token = await getToken()

    const response = await axios.get(
      "http://20.207.122.201/evaluation-service/schedule",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data

  } catch (error) {
    await logEvent("error", "External API failed")

    return {
      error: true,
      message: "External API is protected or unavailable",
      fallback: true
    }
  }
}

module.exports = { fetchData }
