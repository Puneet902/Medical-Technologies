const axios = require("axios")

let accessToken = null
let tokenExpiry = 0

const getNewToken = async () => {
  const response = await axios.post(
    "http://20.207.122.201/evaluation-service/auth",
    {
      email: process.env.EMAIL,
      name: process.env.NAME,
      rollNo: process.env.ROLL_NO,
      accessCode: process.env.ACCESS_CODE,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET
    }
  )

  accessToken = response.data.access_token
  tokenExpiry = response.data.expires_in * 1000

  return accessToken
}

const getToken = async () => {
  if (!accessToken || Date.now() >= tokenExpiry) {
    return await getNewToken()
  }
  return accessToken
}

module.exports = { getToken }
