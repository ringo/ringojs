var log = require("ringo/logging").getLogger(module.id);
var Context = require("./context");
var {DefaultServlet} = org.eclipse.jetty.servlet;

var StaticContext = module.exports = function StaticContext() {
    Context.apply(this, arguments);
    return this;
};

StaticContext.prototype = Object.create(Context.prototype);
StaticContext.prototype.constructor = StaticContext;


StaticContext.prototype.serve = function(directory, initParameters) {
    log.debug("Adding static handler {} -> {}",
            this.contextHandler.getContextPath(), directory);
    var repo = getRepository(directory);
    this.contextHandler.setResourceBase(repo.exists() ? repo.getPath() : directory);
    return this.addServlet("/*", DefaultServlet, initParameters);
};