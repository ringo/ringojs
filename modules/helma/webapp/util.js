require('core/string');

exports.ResponseFilter = function(body, filter) {
    this.forEach = function(fn) {
        body.forEach(function(block) {
            var filtered = filter(block);
            if (filtered != null) {
                fn(filtered);
            }
        });
    };
};

exports.getSubHeader = function(headerValue, subHeaderName) {
    if (!headerValue)
        return null;
    var parts = String(headerValue).split(/;/);
    for (var i = 1; i < parts.length; i++) {
        var part = parts[i].trim()
        if (part.startsWith(subHeaderName)) {
            var eq = part.indexOf("=");
            if (eq > -1) {
                 return part.substring(eq + 1).trim();
            }
        }
    }
    return null;
};
