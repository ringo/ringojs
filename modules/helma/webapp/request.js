require('core/string');
import('helma/system', 'system');

if (!global.Request) {

    system.addHostObject(org.helma.web.Request);
    system.addHostObject(org.helma.web.Session);

    var log = require('helma/logging').getLogger(__name__);

    Object.defineProperty(Request.prototype, "isGet", {
        getter: function() {
            return this.isMethod("GET");
        }
    });

    Object.defineProperty(Request.prototype, "isPost", {
        getter: function() {
            return this.isMethod("POST");
        }
    });

    Object.defineProperty(Request.prototype, "isPut", {
        getter: function() {
            return this.isMethod("PUT");
        }
    });

    Object.defineProperty(Request.prototype, "isDelete", {
        getter: function() {
            return this.isMethod("DELETE");
        }
    });

    Object.defineProperty(Request.prototype, "isHead", {
        getter: function() {
            return this.isMethod("HEAD");
        }
    });

}