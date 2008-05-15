importModule('core.string');

var __shared__ = true;
var configured = false;

function setConfig(resource) {
    if (resource.endsWith('.properties') || resource.endsWith('.props')) {
       org.apache.log4j.PropertyConfigurator.configure(resource);
    } else {
       org.apache.log4j.xml.DOMConfigurator.configure(resource);
    }
    configured = true;
}

function getLogger(name) {
    if (!configured) {
        org.apache.log4j.BasicConfigurator.configure();
        configured = true;
    }
    return org.apache.log4j.Logger.getLogger(name);
}
