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

exports.getMimeParameter = function(headerValue, paramName) {
    if (!headerValue)
        return null;
    var start, end = 0;
    paramName = paramName.toLowerCase();
    while((start = headerValue.indexOf(";", end)) > -1) {
        end = headerValue.indexOf(";", ++start);
        if (end < 0)
            end = headerValue.length;
        var eq = headerValue.indexOf("=", start);
        if (eq > start && eq < end) {
            var name = headerValue.slice(start, eq);
            if (name.toLowerCase().trim() == paramName) {
                var value = headerValue.slice(eq + 1, end).trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    return value.slice(1, -1).replace('\\\\', '\\').replace('\\"', '"');
                } else if (value.startsWith('<') && value.endsWith('>')) {
                    return value.slice(1, -1);
                }

                return value;
            }
        }
    }
    return null;
};
