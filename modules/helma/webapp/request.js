require('core.string');
import('helma.system', 'system');

system.addHostObject(org.helma.web.Request);
system.addHostObject(org.helma.web.Session);

var log = require('helma.logging').getLogger(__name__);

(function() {

    /**
     * Return true if this is a HTTP POST request.
     */
    this.isPost = function() {
        return this.method == "POST";
    }

    /**
     * Return true if this is a HTTP GET request.
     */
    this.isGet = function() {
        return this.method == "GET";
    }
 
}).apply(Request.prototype);
