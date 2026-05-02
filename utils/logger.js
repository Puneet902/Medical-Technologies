const Log = require("../logging_middleware/logger")

module.exports = { logEvent: (level, message, pkg = "service") => Log("backend", level, pkg, message) }
