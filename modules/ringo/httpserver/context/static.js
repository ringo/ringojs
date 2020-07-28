const log = require("ringo/logging").getLogger(module.id);
const Context = require("./context");
const {DefaultServlet} = org.eclipse.jetty.servlet;

/**
 * Static files context handler constructor
 * @param {org.eclipse.jetty.server.handler.ContextHandlerCollection} The parent container of this context handler
 * @param {String} The mountpoint of this context handler
 * @param {Object} An options object (see <a href="./builder.html#serveApplication">HttpServerBuilder.serveApplication</a>)
 * @constructor
 * @extends Context
 */
const StaticContext = module.exports = function StaticContext() {
    Context.apply(this, arguments);
    return this;
};

StaticContext.prototype = Object.create(Context.prototype);
StaticContext.prototype.constructor = StaticContext;

/**
 * Serve the files in the specified directory
 * @param {String} directory The path to the directory containing the static files
 * @param {Object} initParameters An object containing init parameters to pass
 * to the servlet holder (see <a href="../builder.html#serveStatic">HttpServerBuilder.serveStatic()</a>
 * @returns {org.eclipse.jetty.servlet.ServletHolder}
 */
StaticContext.prototype.serve = function(directory, initParameters) {
    log.debug("Adding static handler {} -> {}",
            this.contextHandler.getContextPath(), directory);
    const repo = getRepository(directory);
    this.contextHandler.setResourceBase(repo.exists() ? repo.getPath() : directory);
    return this.addServlet("/*", DefaultServlet, initParameters);
};
