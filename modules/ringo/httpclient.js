var {URL, URLConnection, HttpCookie} = java.net;
var {InputStream, BufferedOutputStream, OutputStreamWriter, BufferedWriter,
        ByteArrayOutputStream, PrintWriter, OutputStreamWriter} = java.io;
var {GZIPInputStream, InflaterInputStream} = java.util.zip;
var {TextStream, MemoryStream} = require("io");
var {getMimeParameter, Headers, urlEncode} = require('ringo/utils/http');
var {ByteArray} = require("binary");
var objects = require("ringo/utils/objects");
var base64 = require("ringo/base64");
var {Buffer} = require("ringo/buffer");
var {Random} = java.util;

export("request", "get", "post", "put", "del", "TextPart", "BinaryPart");

const VERSION = "0.1";
const CRLF = "\r\n";
const BOUNDARY_CHARS = "-_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Defaults for options passable to to request()
 */
var prepareOptions = function(options) {
    var defaultValues = {
        "data": {},
        "headers": {},
        "method": "GET",
        "username": undefined,
        "password": undefined,
        "followRedirects": true,
        "readTimeout": 0,
        "connectTimeout": 0,
        "binary": false
    };
    var opts = options ? objects.merge(options, defaultValues) : defaultValues;
    Headers(opts.headers);
    opts.contentType = opts.contentType
            || opts.headers.get("Content-Type")
            || "application/x-www-form-urlencoded;charset=utf-8";
    return opts;
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
 * A wrapper around java.net.HttpCookie
 * @param {java.net.HttpCookie} httpCookie The HttpCookie instance to wrap
 * @returns {Cookie} A newly created Cookie instance
 * @constructor
 */
var Cookie = function(httpCookie) {

    Object.defineProperties(this, {
        /**
         * @returns {String} the cookie's name
         */
        "name": {
            "get": function() {
                return httpCookie.getName();
            }
        },
        /**
         * @returns {String} the cookie value
         */
        "value": {
            "get": function() {
                return httpCookie.getValue();
            }
        },
        /**
         * @returns {String} the cookie domain
         */
        "domain": {
            "get": function() {
                return httpCookie.getDomain();
            }
        },
        /**
         * @returns {String} the cookie path
         */
        "path": {
            "get": function() {
                return httpCookie.getPath();
            }
        },

        /**
         * @returns {Number} the max age of this cookie in seconds
         */
        "maxAge": {
            "get": function() {
                return httpCookie.getMaxAge();
            }
        },

        /**
         * @returns {String} true if this cookie is restricted to a secure protocol
         */
        "isSecure": {
            "get": function() {
                return httpCookie.getSecure();
            }
        },

        /**
         * @returns {String} the cookie version
         */
        "version": {
            "get": function() {
                return httpCookie.getVersion();
            }
        }
    });

    return this;
};

/**
 * Writes the data to the connection's output stream
 * @param {Object} data The data
 * @param {java.net.HttpURLConnection} connection The connection
 * @param {String} charset The character set name
 * @param {String} contentType The content type
 */
var writeData = function(data, connection, charset, contentType) {
    connection.setRequestProperty("Content-Type", contentType);
    var outStream;
    try {
        outStream = new Stream(connection.getOutputStream());
        if (data instanceof InputStream) {
            (new Stream(data)).copy(outStream).close();
        } else if (data instanceof Binary) {
            (new MemoryStream(data)).copy(outStream).close();
        } else if (data instanceof Stream) {
            data.copy(outStream).close();
        } else {
            if (data instanceof TextStream) {
                data = data.read();
            } else if (data instanceof Object) {
                data = urlEncode(data);
            }
            if (typeof(data) === "string" && data.length > 0) {
                var writer = new BufferedWriter(OutputStreamWriter(outStream, charset));
                writer.write(data);
                writer.close();
            }
        }
    } finally {
        outStream && outStream.close();
    }
};

/**
 * Generates a multipart boundary
 * @returns {String} A multipart boundary
 */
var generateBoundary = function() {
    // taken from apache httpclient
    var buffer = new Buffer();
    var random = new Random();
    var count = random.nextInt(11) + 30; // a random size from 30 to 40
    for (let i=0; i<count; i++) {
        buffer.write(BOUNDARY_CHARS[random.nextInt(BOUNDARY_CHARS.length)]);
    }
    return buffer.toString();
};

/**
 * Writes the multipart data to the connection's output stream
 * @param {Object} data An object containing the multipart data
 * @param {java.net.HttpURLConnection} connection The connection to write the data to
 * @param {String} charset The charset
 * @param {String} boundary The multipart boundary
 */
var writeMultipartData = function(data, connection, charset, boundary) {
    connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
    var outStream, writer;
    try {
        outStream = new Stream(connection.getOutputStream());
        writer = new PrintWriter(new OutputStreamWriter(outStream, charset), true);
        for (let [name, part] in Iterator(data)) {
            writer.append("--" + boundary).append(CRLF);
            part.write(name, writer, outStream);
        }
        writer.append("--").append(boundary).append("--").append(CRLF);
    } finally {
        writer && writer.close();
        outStream && outStream.close();
    }
};

/**
 * Reads the response and returns it as ByteArray
 * @param {java.net.HttpURLConnection} connection The connection
 * @returns {ByteArray} The response as ByteArray
 */
var readResponse = function(connection) {
    var status = connection.getResponseCode();
    var inStream;
    try {
        inStream = connection[(status >= 200 && status < 400) ?
                "getInputStream" : "getErrorStream"]();
        var encoding = connection.getContentEncoding();
        if (encoding != null) {
            if (encoding === "gzip") {
                inStream = new GZIPInputStream(inStream);
            } else if (encoding === "deflate") {
                inStream = new InflaterInputStream(inStream);
            }
        }
        inStream = new Stream(inStream);
        var outStream = new ByteArrayOutputStream(8192);
        inStream.copy(outStream);
        return new ByteArray(outStream.toByteArray());
    } finally {
        inStream && inStream.close();
    }
};

/**
 * @name Exchange
 * @param {String} url The URL
 * @param {Object} options The options
 * @param {Object} callbacks An object containing success, error and complete
 * callback methods
 * @returns {Exchange} A newly constructed Exchange instance
 * @constructor
 */
var Exchange = function(url, options, callbacks) {
    var reqData = options.data;
    var connection = null;
    var responseContent;
    var responseContentBytes;
    var isDone = false;
    var isException;

    Object.defineProperties(this, {
        /**
         * The connection used by this Exchange instance
         * @name Exchange.prototype.connection
         */
        "connection": {
            "get": function() {
                return connection;
            }, "enumerable": true
        },
        /**
         * True if the request has completed, false otherwise
         * @name Exchange.prototype.done
         */
        "done": {
            "get": function() {
                return isDone;
            }, enumerable: true
        },
        /**
         * The response body as String
         * @name Exchange.prototype.content
         */
        "content": {
            "get": function() {
                if (responseContent !== undefined) {
                    return responseContent;
                }
                return responseContent = this.contentBytes==null?null:this.contentBytes.decodeToString(this.encoding);
            }, "enumerable": true
        },
        /**
         * The response body as ByteArray
         * @name Exchange.prototype.contentBytes
         */
        "contentBytes": {
            "get": function() {
                return responseContentBytes;
            }, "enumerable": true
        }
    });

    try {
        if (options.method !== "POST" && options.method !== "PUT") {
            reqData = urlEncode(reqData);
            if (typeof(reqData) === "string" && reqData.length > 0) {
                url += "?" + reqData;
            }
        }
        connection = (new URL(url)).openConnection();
        connection.setAllowUserInteraction(false);
        connection.setConnectTimeout(options.connectTimeout);
        connection.setReadTimeout(options.readTimeout);
        connection.setFollowRedirects(options.followRedirects);
        connection.setRequestMethod(options.method);
        connection.setRequestProperty("User-Agent", "RingoJS HttpClient " + VERSION);
        connection.setRequestProperty("Accept-Encoding", "gzip,deflate");

        // deal with username:password in url
        var userInfo = connection.getURL().getUserInfo();
        if (userInfo) {
            var [username, password] = userInfo.split(":");
            options.username = options.username || username;
            options.password = options.password || password;
        }
        // set authentication header
        if (typeof(options.username) === "string" && typeof(options.password) === "string") {
            var authKey = base64.encode(options.username + ':' + options.password);
            connection.setRequestProperty("Authorization", "Basic " + authKey);
        }
        // set header keys specified in options
        for (let key in options.headers) {
            connection.setRequestProperty(key, options.headers[key]);
        }
        if (typeof(callbacks.beforeSend) === "function") {
            callbacks.beforeSend(this);
        }

        if (options.method === "POST" || options.method === "PUT") {
            connection.setDoOutput(true);
            var charset = getMimeParameter(options.contentType, "charset") || "utf-8";
            if (options.method === "POST" && options.contentType === "multipart/form-data") {
                writeMultipartData(reqData, connection, charset, generateBoundary());
            } else {
                writeData(reqData, connection, charset, options.contentType);
            }
        }
        responseContentBytes = readResponse(connection);
        if (this.status > 300) {
            throw new Error(this.status);
        }
        if (typeof(callbacks.success) === "function") {
            var content = (options.binary === true) ? this.contentBytes : this.content;
            callbacks.success(content, this.status, this.contentType, this);
        }
    } catch (e if e.javaException instanceof java.net.SocketTimeoutException) {
        isException = 'timeout';
        if (typeof(callbacks.error) === "function") {
            callbacks.error("timeout", 500, this);
        }
    } catch (e) {
        if (typeof(callbacks.error) === "function") {
            callbacks.error(this.message, this.status, this);
        }
    } finally {
        isDone = true;
        try {
            if (typeof(callbacks.complete) === "function") {
                if (isException) {
                    callbacks.complete(isException, 500, undefined, this);
                } else {
                    var content = (options.binary === true) ? this.contentBytes : this.content;
                    callbacks.complete(content, this.status, this.contentType, this);
                }
            }
        } finally {
            connection && connection.disconnect();
        }
    }

    return this;
};

Object.defineProperties(Exchange.prototype, {
    /**
     * The URL wrapped by this Exchange instance
     * @type java.net.URL
     * @name Exchange.prototype.url
     */
    "url": {
        "get": function() {
            return this.connection.getURL();
        }, "enumerable": true
    },
    /**
     * The response status code
     * @type Number
     * @name Exchange.prototype.status
     */
    "status": {
        "get": function() {
            return this.connection.getResponseCode();
        }, "enumerable": true
    },
    /**
     * The response status message
     * @type String
     * @name Exchange.prototype.message
     */
    "message": {
        "get": function() {
            return this.connection.getResponseMessage();
        }, "enumerable": true
    },
    /**
     * The response headers
     * @name Exchange.prototype.headers
     */
    "headers": {
        "get": function() {
            return new ScriptableMap(this.connection.getHeaderFields());
        }, enumerable: true
    },
    /**
     * The cookies set by the server
     * @name Exchange.prototype.cookies
     */
    "cookies": {
        "get": function() {
            var cookies = {};
            var cookieHeaders = this.connection.getHeaderField("Set-Cookie");
            if (cookieHeaders !== null) {
                var list = new ScriptableList(HttpCookie.parse(cookieHeaders));
                for each (let httpCookie in list) {
                    let cookie = new Cookie(httpCookie);
                    cookies[cookie.name] = cookie;
                }
            }
            return cookies;
        }, enumerable: true
    },
    /**
     * The response encoding
     * @type String
     * @name Exchange.prototype.encoding
     */
    "encoding": {
        "get": function() {
            return getMimeParameter(this.contentType, "charset") || "utf-8";
        }, "enumerable": true
    },
    /**
     * The response content type
     * @type String
     * @name Exchange.prototype.contentType
     */
    "contentType": {
        "get": function() {
            return this.connection.getContentType();
        }, "enumerable": true
    },
    /**
     * The response content length
     * @type Number
     * @name Exchange.prototype.contentLength
     */
    "contentLength": {
        "get": function() {
            return this.connection.getContentLength();
        }, "enumerable": true
    }
});

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
 *  - `binary`: if true if content should be delivered as binary,
 *     else it will be decoded to string
 *  - `followRedirects`: whether HTTP redirects (response code 3xx) should be
 *     automatically followed; default: true
 *  - `readTimeout`: setting for read timeout in millis. 0 return implies that the option
 *     is disabled (i.e., timeout of infinity); default: 0 (or until impl decides its time)
 *  - `connectTimeout`: Sets a specified timeout value, in milliseconds, to be used
 *     when opening a communications link to the resource referenced by this
 *     URLConnection. A timeout of zero is interpreted as an infinite timeout.;
 *     default: 0 (or until impl decides its time)
 *
 *  #### Callbacks
 *
 *  The `options` object may also contain the following callback functions:
 *
 *  - `complete`: called when the request is completed
 *  - `success`: called when the request is completed successfully
 *  - `error`: called when the request is completed with an error
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
 * @see #get
 * @see #post
 * @see #put
 * @see #del
 */
var request = function(options) {
    var opts = prepareOptions(options);
    return new Exchange(opts.url, {
        "method": opts.method,
        "data": opts.data,
        "headers": opts.headers,
        "username": opts.username,
        "password": opts.password,
        "contentType": opts.contentType,
        "followRedirects": opts.followRedirects,
        "connectTimeout": opts.connectTimeout,
        "readTimeout": opts.readTimeout,
        "binary": opts.binary
    }, {
        "beforeSend": opts.beforeSend,
        "success": opts.success,
        "complete": opts.complete,
        "error": opts.error
    });
};

/**
 * Creates an options object based on the arguments passed
 * @param {String} method The request method
 * @param {String} url The URL
 * @param {String|Object|Stream|Binary} data Optional data to send to the server
 * @param {Function} success Optional success callback
 * @param {Function} error Optional error callback
 * @returns An options object
 */
var createOptions = function(method, url, data, success, error) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length < 4) {
        var {url, data, success, error} = extractOptionalArguments(args);
    }
    return {
        method: method,
        url: url,
        data: data,
        success: success,
        error: error
    };
};

/**
 * Executes a GET request
 * @param {String} url The URL
 * @param {Object|String} data The data to append as GET parameters to the URL
 * @param {Function} success Optional success callback
 * @param {Function} error Optional error callback
 * @returns The Exchange instance representing the request and response
 * @type Exchange
 */
var get = function(url, data, success, error) {
    return request(createOptions("GET", url, data, success, error));
};

/**
 * Executes a POST request
 * @param {String} url The URL
 * @param {Object|String|Stream|Binary} data The data to send to the server
 * @param {Function} success Optional success callback
 * @param {Function} error Optional error callback
 * @returns The Exchange instance representing the request and response
 * @type Exchange
 */
var post = function(url, data, success, error) {
    return request(createOptions("POST", url, data, success, error));
};

/**
 * Executes a DELETE request
 * @param {String} url The URL
 * @param {Object|String} data The data to append as GET parameters to the URL
 * @param {Function} success Optional success callback
 * @param {Function} error Optional error callback
 * @returns The Exchange instance representing the request and response
 * @type Exchange
 */
var del = function(url, data, success, error) {
    return request(createOptions("DELETE", url, data, success, error));
};

/**
 * Executes a PUT request
 * @param {String} url The URL
 * @param {Object|String|Stream|Binary} data The data send to the server
 * @param {Function} success Optional success callback
 * @param {Function} error Optional error callback
 * @returns The Exchange instance representing the request and response
 * @type Exchange
 */
var put = function(url, data, success, error) {
    return request(createOptions("PUT", url, data, success, error));
};

/**
 * @name TextPart
 * @param {String|TextStream} data The data
 * @param {String} charset The charset
 * @param {String} filename An optional file name
 * @returns {TextPart} A newly constructed TextPart instance
 * @constructor
 */
var TextPart = function(data, charset, filename) {

    /**
     * Writes this TextPart's data
     * @param {String} name The name of the text part
     * @param {java.io.PrintWriter} writer The writer
     * @param {java.io.OutputStream} outStream The output stream
     * @ignore
     */
    this.write = function(name, writer, outStream) {
        writer.append("Content-Disposition: form-data; name=\"")
                .append(name).append("\"");
        if (filename != null) {
            writer.append("; filename=\"").append(filename).append("\"");
        }
        writer.append(CRLF);
        writer.append("Content-Type: text/plain; charset=")
                .append(charset || "utf-8").append(CRLF);
        writer.append(CRLF).flush();
        if (data instanceof TextStream) {
            data.copy(new TextStream(outStream, {
                "charset": charset || "utf-8"
            })).close();
            outStream.flush();
        } else {
            writer.append(data);
        }
        writer.append(CRLF).flush();
    };

    return this;
};

/**
 * @name BinaryPart
 * @param {String} data The data
 * @param {String} charset The charset
 * @param {String} filename An optional file name
 * @returns {BinaryPart} A newly constructed BinaryPart instance
 * @constructor
 */
var BinaryPart = function(data, filename) {

    /**
     * Writes this BinaryPart's data
     * @param {String} name The name of the text part
     * @param {java.io.PrintWriter} writer The writer
     * @param {java.io.OutputStream} outStream The output stream
     * @ignore
     */
    this.write = function(name, writer, outStream) {
        writer.append("Content-Disposition: form-data; name=\"")
                .append(name).append("\"");
        if (filename != null) {
            writer.append("; filename=\"").append(filename).append("\"");
        }
        writer.append(CRLF);
        writer.append("Content-Type: ")
                .append(URLConnection.guessContentTypeFromName(filename))
                .append(CRLF);
        writer.append("Content-Transfer-Encoding: binary").append(CRLF);
        writer.append(CRLF).flush();
        if (data instanceof InputStream) {
            (new Stream(data)).copy(outStream).close();
        } else if (data instanceof Binary) {
            (new MemoryStream(data)).copy(outStream).close();
        } else if (data instanceof Stream) {
            data.copy(outStream).close();
        }
        writer.append(CRLF).flush();
    };

    return this;
};
