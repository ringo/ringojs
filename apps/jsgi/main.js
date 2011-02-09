// Start the HTTP server on default port
if (require.main === module) {
    var app = require("./config").app
    require("ringo/httpserver").Server({ app: app }).start()
}
