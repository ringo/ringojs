/**
 * The HttpClient and it's convinience methods provide 
 */

importPackage(org.eclipse.jetty.client);

include('core/object');
var {Buffer} = require('ringo/buffer');
var {getMimeParameter} = require('ringo/webapp/util');
var base64 = require('ringo/base64');
var log = require('ringo/logging').getLogger(module.id);

export('request', 'post', 'get', 'del', 'put', 'Client');

module.shared = true;

/**
 * Wrapper around jetty.http.HttpCookie.
 */
var Cookie = function(cookieStr) {
    
    /**
     * @returns {String} the cookie's name
     */
    Object.defineProperty(this, "name", {
        get: function() {
            return cookie.getName();
        }
    });

    /**
     * @returns {String} the cookie value
     */
    Object.defineProperty(this, "value", {
        get: function() {
            return cookie.getValue();
        }
    });
    /**
     * @returns {String} the cookie domain
     */
    Object.defineProperty(this, "domain", {
        get: function() {
            return cookie.getDomain();
        }
    });
    
    /**
     * @returns {String} the cookie path
     */
    Object.defineProperty(this, "path", {
        get: function() {
            return cookie.getPath();
        }
    });
    
    /**
     * Parses the cookie string passed as argument
     * @param {String} cookieStr The cookie string as received from the remote server
     * @returns {Object} An object containing all key/value pairs of the cookiestr
     */
    var parse = function(cookieStr) {
        if (cookieStr != null) {
            var cookie = {};
            var m = Cookie.PATTERN.exec(cookieStr);
            if (m) {
                cookie.name = m[1].trim();
                cookie.value = m[2] ? m[2].trim() : "";
            }
            while ((m = Cookie.PATTERN.exec(cookieStr)) != null) {
                var key = m[1].trim();
                var value = m[2] ? m[2].trim() : "";
                cookie[key.toLowerCase()] = value;
            }
            return cookie;
        }
        return null;
    };

    var cookieData = parse(cookieStr);
    // FIXME FUTURE httpclient doesn't care about maxage or httponly (yet) so we don't either
    var cookie = null;
    if (cookieData.name && cookieData.value) {
        if (cookieData.domain) {
            if (cookieData.path) {
                cookie = new Packages.org.eclipse.jetty.http.HttpCookie(
                    cookieData.name,
                    cookieData.value,
                    cookieData.domain,
                    cookieData.path
                );
            } else {
                cookie = new Packages.org.eclipse.jetty.http.HttpCookie(
                    cookieData.name,
                    cookieData.value,
                    cookieData.domain
                );            
            }
        } else {
            cookie = new Packages.org.eclipse.jetty.http.HttpCookie(cookieData.name, cookieData.value);
        }
    }
    
    return this;
};

/**
 * An instance of java.text.SimpleDateFormat used for both parsing
 * an "expires" string into a date and vice versa
 * @type java.text.SimpleDateFormat
 * @final
 */
Cookie.DATEFORMAT = new java.text.SimpleDateFormat("EEE, dd-MMM-yy HH:mm:ss z");

/**
 * A regular expression used for parsing cookie strings
 * @type RegExp
 * @final
 */
Cookie.PATTERN = /([^=;]+)=?([^;]*)(?:;\s*|$)/g;


/**
 * An Exchange encapsulates the Request and Response of an HTTP Exchange.
 * @constructor
 */
var Exchange = function(url, options, callbacks) {
    if (!url) throw new Error('missing url argument');

    var opts = Object.merge(options, {
        'data': {},
        'headers': {},
        'method': 'GET',
        'contentType': 'application/x-www-form-urlencoded;charset=utf-8',
        'username': undefined,
        'password': undefined
    });
      
    this.toString = function() {
        return "[ringo.httpclient.Exchange] " + url + "/";
    };
    
    Object.defineProperty(this, "status", {
        get: function() {
            return exchange.getResponseStatus();
        }
    });
    Object.defineProperty(this, "contentType", {
        get: function() {
            return responseFields.getStringField('Content-Type');
        }
    });
    Object.defineProperty(this, "content", {
        get: function() {
            return exchange.getResponseContent();
        }
    });
    Object.defineProperty(this, "contentBytes", {
        get: function() {
            return exchange.getResponseContentBytes();
        }
    });
    Object.defineProperty(this, "contentChunk", {
        get: function() {
            return exchange.getRequestContentChunk();
        }
    });
    Object.defineProperty(this, "contentExchange", {
        get: function() {
            return exchange;
        }
    });
    Object.defineProperty(this, "responseHeaders", {
        get: function() {
            return responseFields;
        }
    });
    Object.defineProperty(this, "cookies", {
        get: function() {
            var cookies = {};
            var cookieHeaders = responseFields.getValues("Set-Cookie");
            while (cookieHeaders.hasMoreElements()) {
                var cookie = new Cookie(cookieHeaders.nextElement());
                cookies[cookie.name] = cookie;
            }
            return cookies;
        }
    });

    /**
     * return response encoding
     * NOTE HttpExchange._encoding knows about this but is protected
     */
    Object.defineProperty(this, "encoding", {
        get: function() {
            return getMimeParameter(this.contentType, "charset") || 'utf-8';
        }
    });

    /**
    * encode an object's properties into an uri encoded string
    */
    var encodeContent = function(content) {
        var buf = new Buffer();
        var value;
        for (var key in content) {
            value = content[key];
            if (value instanceof Array) {
                if (key.substring(key.length - 6) == "_array") {
                    key = key.substring(0,key.length - 6);
                }
                for (var i = 0; i < value.length; i++) {
                    buf.write(encodeURIComponent(key));
                    buf.write("=");
                    buf.write(encodeURIComponent(value[i]));
                    buf.write("&");
                }
            } else {
                buf.write(encodeURIComponent(key));
                buf.write("=");
                buf.write(encodeURIComponent(value));
                buf.write("&");
            }
        }
        var encodedContent = buf.toString();
        encodedContent = encodedContent.substring(0, encodedContent.length-1);
        return encodedContent;
    };

    /**
    * Constructor
    */

    var self = this;
    var responseFields = new org.eclipse.jetty.http.HttpFields();
    var exchange = new JavaAdapter(ContentExchange, {
        'onResponseComplete': function() {
            this.super$onResponseComplete();
            if (typeof(callbacks.complete) === 'function') {
                callbacks.complete(self.content, self.status, self.contentType, self);
            }
            if (self.status >= 200 && self.status < 400) {
                if (typeof(callbacks.success) === 'function') {
                    callbacks.success(self.content, self.status, self.contentType, self);
                }
            } else if (self.status >= 300 && self.status < 400) {
                // FIXME auto handle redirects
            } else if (typeof(callbacks.error) === 'function') {
                callbacks.error(null, self);
            }
            return;
        },
        'onResponseContent': function(content) {
            if (typeof(callbacks.part) === 'function') {
                // NOTE if content is not decodable this is bad
                //      probably better to pass buffer or bytes here
                callbacks.part(content.toString(self.encoding), self.status, self.contentType, self);
            }
            this.super$onResponseContent(content);
            return;
        },
        'onResponseHeader': function(key, value) {
            this.super$onResponseHeader(key, value);
            responseFields.add(key, value);
            return;
        },
        'onConnectionFailed': function(exception) {
            this.super$onConnectionFailed(exception);
            if (typeof(callbacks.error) === 'function') {
                callbacks.error(exception, self);
            }
            return;
        },
        'onException': function(exception) {
            this.super$onException(exception);
            if (typeof(callbacks.error) === 'function') {
                callbacks.error(exception, self);
            }
            return;
        },
        'onExpire': function() {
            this.super$onExpire();
            if (typeof(callbacks.error) === 'function') {
                // FIXME need a timeout exception to pass
                callbacks.error('expired', this);
            }
            return;
        },
    });
    
    exchange.setRequestContentType(opts.contentType);
    exchange.setMethod(opts.method);
    
    if (opts.username && opts.password) {
        var authKey = base64.encode(opts.username + ':' + opts.password);
        var authHeaderValue = "Basic " + authKey;
        exchange.addRequestHeader("Authorization", authHeaderValue);
    }
    
    for (var headerKey in opts.headers) {
        exchange.addRequestHeader(headerKey, opts.headers[headerKey]);
    }
    
    // set content
    var content = opts.data;
    if (opts.data instanceof Object) {
        content = encodeContent(opts.data);
    }
    
    if (opts.method === 'POST') {
        if (typeof(content) === 'string') {
            exchange.setRequestContent(org.eclipse.jetty.io.ByteArrayBuffer(content));
        // FIXME only allow streaming types
        } else if (typeof(content) !== 'undefined') {
            exchange.setRequestContentSource(content);
        }
    } else if (typeof(content) === 'string' && content.length) {
        url += "?" + content;
    }
    exchange.setURL(url);
    // FIXME we could add a RedirectListener right here to auto-handle redirects
    
    return this;
};

/**
 * Defaults for options passable to to request()
 */
var defaultOptions = function(options) {
    return Object.merge(options || {}, {
        // exchange
        'data': {},
        'headers': {},
        'method': 'GET',
        'contentType': 'application/x-www-form-urlencoded;charset=utf-8',
        'username': undefined,
        'password': undefined,
        // client
        'async': false, // NOTE: true doesn't make sense for ringo
        'cache': true,
        'timeout': 1000
    });
};

/**
 * Of the 4 arguments to get/post all but the first (url) are optional.
 * This fn puts the right arguments - depending on their type - into the options object
 * which can be used to call request()
 * @param {Array} Arguments Array
 * @returns {Object<{url, data, success, error}>} Object holding attributes for call to request()
 */
var extractOptionalArguments = function(args) {

    var types = [];
    for each (var arg in args) {
        types.push(typeof(arg));
    }
    
    if (types[0] != 'string') {
        throw new Error('first argument (url) must be string');
    }

    if (args.length == 1) {
        return {
            'url': args[0]
        };

    } else if (args.length == 2) {
        if (types[1] == 'function') {
            return {
                'url': args[0],
                'success': args[1]
            };
        } else if (types[1] == 'object') {
            return {
                'url': args[0],
                'data': args[1]
            };
        }
        throw new Error('two argument form must be (url, success) or (url, data)');
    } else if (args.length == 3) {
        if (types[1] == 'function' && types[2] == 'function') {
            return {
                'url': args[0],
                'success': args[1],
                'error': args[2]
            };
        } else if (types[1] == 'object' && types[2] == 'function') {
            return {
                'url': args[0],
                'data': args[1],
                'success': args[2]
            };
        } else {
            throw new Error('three argument form must be (url, success, error) or (url, data, success)');
        }
    }
    throw new Error('unknown arguments');
}

/**
 * A HttpClient which can be used for multiple requests.
 *
 * Use this Client instead of the convinience methods if you do lots
 * of requests (especially if they go to the same hosts)
 * or if you want cookies to be preserved between multiple requests.
 
 * @param {Number} timeout The connection timeout
 * @constructor
 */
var Client = function(timeout) {

    /**
     * @param {String} url the url to request
     * @param {Object|String|java.io.InputStream} data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     */
    this.get = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, sucess, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            'method': 'GET',
            'url': url,
            'data': data,
            'success': success,
            'error': error
        });    
    };
    
    /**
     * @param {String} url the url to request
     * @param {Object|String|java.io.InputStream} data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     */
    this.post = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, sucess, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            'method': 'POST',
            'url': url,
            'data': data,
            'success': success,
            'error': error
        });
    };
    
    /**
     * @param {String} url the url to request
     * @param {Object|String|java.io.InputStream} data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     */
    this.del = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, sucess, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            'method': 'DELETE',
            'url': url,
            'data': data,
            'success': success,
            'error': error
        });
    };
    
    /**
     * @param {String} url the url to request
     * @param {Object|String|java.io.InputStream} data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     */
    this.put = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, sucess, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            'method': 'PUT',
            'url': url,
            'data': data,
            'success': success,
            'error': error
        });
    };
    
    /**
     * Do a generic request.
     * @param {Object} options
     */
    this.request = function(options) {
        var opts = defaultOptions(options);
        var exchange = new Exchange(opts.url, {
            'method': opts.method,
            'data': opts.data,
            'headers': opts.headers,
            'username': opts.username,
            'password': opts.password,
            'contentType': opts.contentType
        }, {
            'success': opts.success,
            'complete': opts.complete,
            'error': opts.error,
            'part': opts.part
        });
        if (typeof(opts.beforeSend) === 'function') {
            opts.beforeSend(exchange);
        }
        try {
            client.send(exchange.contentExchange);
        } catch (e) { // probably java.net.ConnectException
            if (typeof(callbacks.error) === 'function') {
                callbacks.error(e, exchange);
            }
        }
        if (opts.async === false) {
            exchange.contentExchange.waitForDone();
        }
        return exchange;
    };

    var client = new HttpClient();
    if (typeof timeout == "number") {
        client.setTimeout(timeout);
    }
    // client.setIdleTimeout(10000);
    // TODO proxy stuff
    //client.setProxy(Adress);
    //client.setProxyAuthentication(ProxyAuthorization);
    client.start();
    return this;
};

// avoid reinstantiating default client if module is reevaluated.
var defaultClient = defaultClient || new Client();

/**
 * @param {Object} options
 */
var request = defaultClient.request;
var post = defaultClient.post;
var get = defaultClient.get;
var del = defaultClient.del;
var put = defaultClient.put;


