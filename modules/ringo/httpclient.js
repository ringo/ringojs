/**
 * @fileOverview A scalable HTTP client that provides both synchronous and
 * asynchronous modes of operation.
 */

importPackage(org.eclipse.jetty.client);

require('core/object');
var {ByteString, Binary} = require('binary');
var {Buffer} = require('ringo/buffer');
var {Decoder} = require('ringo/encoding');
var {getMimeParameter} = require('ringo/webapp/util');
var base64 = require('ringo/base64');
var log = require('ringo/logging').getLogger(module.id);

export('request', 'post', 'get', 'del', 'put', 'Client');

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
                cookie = new org.eclipse.jetty.http.HttpCookie(
                    cookieData.name,
                    cookieData.value,
                    cookieData.domain,
                    cookieData.path
                );
            } else {
                cookie = new org.eclipse.jetty.http.HttpCookie(
                    cookieData.name,
                    cookieData.value,
                    cookieData.domain
                );            
            }
        } else {
            cookie = new org.eclipse.jetty.http.HttpCookie(cookieData.name, cookieData.value);
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
        data: {},
        headers: {},
        method: 'GET',
        contentType: 'application/x-www-form-urlencoded;charset=utf-8',
        username: undefined,
        password: undefined
    });

    this.toString = function() {
        return "[ringo.httpclient.Exchange] " + url;
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
            return ByteString.wrap(exchange.getResponseContentBytes());
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

    var getStatusMessage = function(status) {
        var message;
        try {
            var code = org.eclipse.jetty.http.HttpStatus.getCode(status);
            message = code && code.getMessage();
        } catch (error) {
             // ignore
        }
        return message || "Unknown status code (" + status + ")";
    };

    /**
    * Constructor
    */

    var self = this;
    var responseFields = new org.eclipse.jetty.http.HttpFields();
    var decoder;
    var exchange = new JavaAdapter(ContentExchange, {
        onResponseComplete: function() {
            this.super$onResponseComplete();
            var content = opts.binary ? self.contentBytes : self.content;
            if (typeof(callbacks.complete) === 'function') {
                callbacks.complete(content, self.status, self.contentType, self);
            }
            // FIXME auto handle redirects for 3xx responses -
            // these are currently treated as success
            if (self.status >= 200 && self.status < 400) {
                if (typeof(callbacks.success) === 'function') {
                    callbacks.success(content, self.status, self.contentType, self);
                }
            } else if (typeof(callbacks.error) === 'function') {
                var message = getStatusMessage(self.status);
                callbacks.error(message, self.status, self);
            }
            return;
        },
        onResponseContent: function(content) {
            if (typeof(callbacks.part) === 'function') {
                if (opts.binary) {
                    var bytes = ByteString.wrap(content.asArray());
                    callbacks.part(bytes, self.status, self.contentType, self);
                } else {
                    decoder = decoder || new Decoder(self.encoding);
                    bytes = content.array();
                    if (bytes == null) {
                        decoder.decode(content.asArray(), 0, content.length());
                    } else {
                        decoder.decode(bytes, content.getIndex(), content.putIndex());
                    }
                    callbacks.part(decoder.toString(), self.status, self.contentType, self);
                    decoder.clear();
                }
            } else {
                this.super$onResponseContent(content);
            }
            return;
        },
        onResponseHeader: function(key, value) {
            this.super$onResponseHeader(key, value);
            responseFields.add(key, value);
            return;
        },
        onConnectionFailed: function(exception) {
            this.super$onConnectionFailed(exception);
            if (typeof(callbacks.error) === 'function') {
                var message = exception.getMessage() || exception.toString();
                callbacks.error(message, 0, self);
            }
            return;
        },
        onException: function(exception) {
            this.super$onException(exception);
            if (typeof(callbacks.error) === 'function') {
                var message = exception.getMessage() || exception.toString();
                callbacks.error(message, 0, self);
            }
            return;
        },
        onExpire: function() {
            this.super$onExpire();
            if (typeof(callbacks.error) === 'function') {
                callbacks.error('Request expired', 0, self);
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
    
    if (opts.method === 'POST' || opts.method === 'PUT') {
        if (typeof(content) === 'string') {
            exchange.setRequestContent(new org.eclipse.jetty.io.ByteArrayBuffer(content, "utf-8"));
        } else if (content instanceof Binary) {
            exchange.setRequestContent(new org.eclipse.jetty.io.ByteArrayBuffer(content));
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
        data: {},
        headers: {},
        method: 'GET',
        contentType: 'application/x-www-form-urlencoded;charset=utf-8',
        username: undefined,
        password: undefined,
        // client
        async: false,
        cache: true,
        binary: false
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
            url: args[0]
        };

    } else if (args.length == 2) {
        if (types[1] == 'function') {
            return {
                url: args[0],
                success: args[1]
            };
        } else {
            return {
                url: args[0],
                data: args[1]
            };
        }
        throw new Error('two argument form must be (url, success) or (url, data)');
    } else if (args.length == 3) {
        if (types[1] == 'function' && types[2] == 'function') {
            return {
                url: args[0],
                success: args[1],
                error: args[2]
            };
        } else if (types[1] == 'object' && types[2] == 'function') {
            return {
                url: args[0],
                data: args[1],
                success: args[2]
            };
        } else {
            throw new Error('three argument form must be (url, success, error) or (url, data, success)');
        }
    }
    throw new Error('unknown arguments');
};

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
     * Make a GET request.
     * @param {String} url the url to request
     * @param {Object|String} data request data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     * @returns {Exchange} exchange object
     * @see Client.instance.request
     */
    this.get = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, success, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            method: 'GET',
            url: url,
            data: data,
            success: success,
            error: error
        });    
    };
    
    /**
     * Make a POST request.
     * @param {String} url the url to request
     * @param {Object|String|Binary|Stream} data request data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     * @returns {Exchange} exchange object
     * @see Client.instance.request
     */
    this.post = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, success, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            method: 'POST',
            url: url,
            data: data,
            success: success,
            error: error
        });
    };
    
    /**
     * Make a DELETE request.
     * @param {String} url the url to request
     * @param {Object|String} data request data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     * @returns {Exchange} exchange object
     * @see Client.instance.request
     */
    this.del = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, success, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            method: 'DELETE',
            url: url,
            data: data,
            success: success,
            error: error
        });
    };
    
    /**
     * Make a PUT request.
     * @param {String} url the url to request
     * @param {Object|String|Binary|Stream} data request data, optional
     * @param {Function} success callback in case of successful status code, optional
     * @param {Function} error callback in case of any error - transmission or response, optional
     * @returns {Exchange} exchange object
     * @see Client.instance.request
     */
    this.put = function(url, data, success, error) {
        if (arguments.length < 4) {
            var {url, data, success, error} = extractOptionalArguments(arguments);
        }
        return this.request({
            method: 'PUT',
            url: url,
            data: data,
            success: success,
            error: error
        });
    };
    
    /**
     * Make a generic request.
     *
     * #### Generic request options
     *
     *  The `options` object may contain the following properties:
     *
     *  - `url`: the request URL
     *  - `method`: request method such as GET or POST
     *  - `data`: request data as string, object, or, for POST or PUT requests,
     *     Stream or Binary.
     *  - `headers`: request headers
     *  - `username`: username for HTTP authentication
     *  - `password`: password for HTTP authentication
     *  - `contentType`: the contentType
     *  - `async`: if true this method will return immedialtely , else it will block
     *     until the request is completed
     *  - `binary`: if true if content should be delivered as binary,
     *     else it will be decoded to string
     *
     *  #### Callbacks
     *
     *  The `options` object may also contain the following callback functions:
     *
     *  - `complete`: called when the request is completed
     *  - `success`: called when the request is completed successfully
     *  - `error`: called when the request is completed with an error
     *  - `part`: called when a part of the response is available
     *  - `beforeSend`: called with the Exchange object as argument before the request is sent
     *
     *  The following arguments are passed to the `complete`, `success` and `part` callbacks:
     *  1. `content`: the content as String or ByteString
     *  2. `status`: the HTTP status code
     *  3. `contentType`: the content type
     *  4. `exchange`: the exchange object
     *
     *  The following arguments are passed to the `error` callback:
     *  1. `message`: the error message. This is either the message from an exception thrown
     *     during request processing or an HTTP error message
     *  2. `status`: the HTTP status code. This is `0` if no response was received
     *  3. `exchange`: the exchange object
     *  
     * @param {Object} options
     * @returns {Exchange} exchange object
     */
    this.request = function(options) {
        var opts = defaultOptions(options);
        var exchange = new Exchange(opts.url, {
            method: opts.method,
            data: opts.data,
            headers: opts.headers,
            username: opts.username,
            password: opts.password,
            contentType: opts.contentType,
            binary: opts.binary
        }, {
            success: opts.success,
            complete: opts.complete,
            error: opts.error,
            part: opts.part
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
 * Convenience function to make a generic HTTP request without creating a new client.
 * @param {Object} options
 * @returns {Exchange} exchange object
 * @see Client.instance.request
 */
var request = defaultClient.request;
/**
 * Convenience function to make a POST request without creating a new client.
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} success callback in case of successful status code, optional
 * @param {Function} error callback in case of any error - transmission or response, optional
 * @returns {Exchange} exchange object
 * @see Client.instance.request
 */
var post = defaultClient.post;
/**
 * Convenience function to make a GET request without creating a new client.
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} success callback in case of successful status code, optional
 * @param {Function} error callback in case of any error - transmission or response, optional
 * @returns {Exchange} exchange object
 * @see Client.instance.request
 */
var get = defaultClient.get;
/**
 * Convenience function to make a DELETE request without creating a new client.
 * @param {String} url the url to request
 * @param {Object|String} data request data, optional
 * @param {Function} success callback in case of successful status code, optional
 * @param {Function} error callback in case of any error - transmission or response, optional
 * @returns {Exchange} exchange object
 * @see Client.instance.request
 */
var del = defaultClient.del;

/**
 * Convenience function to make a PUT request without creating a new client.
 * @param {String} url the url to request
 * @param {Object|String|Binary|Stream} data request data, optional
 * @param {Function} success callback in case of successful status code, optional
 * @param {Function} error callback in case of any error - transmission or response, optional
 * @returns {Exchange} exchange object
 * @see Client.instance.request
 */
var put = defaultClient.put;


