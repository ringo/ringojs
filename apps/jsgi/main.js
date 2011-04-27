// Start the HTTP server on default port
if (require.main === module) {
    require("ringo/httpserver").main(module.directory);
}
