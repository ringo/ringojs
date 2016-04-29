/**
 * @fileoverview A module for sending HTTP requests and receiving HTTP responses.
 *
 * @example var {request} = require('ringo/httpclient');
 * var exchange = request({
 *    method: 'GET',
 *    url: 'http://ringojs.org/',
 *    headers: {
 *       'x-custom-header': 'foobar'
 *    }
 * });
 *
 * if(exchange.status == 200) {
 *    console.log(exchange.content);
 * }
 */

var {URL, URLConnection, HttpCookie, Proxy, InetSocketAddress} = java.net;
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
var log = require("ringo/logging").getLogger(module.id);

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
        "readTimeout": 30000,
        "connectTimeout": 60000,
        "binary": false,
        "beforeSend": null
    };
    var opts = options ? objects.merge(options, defaultValues) : defaultValues;
    Headers(opts.headers);
    opts.contentType = opts.contentType
            || opts.headers.get("Content-Type")
            || "application/x-www-form-urlencoded;charset=utf-8";
    return opts;
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
 * Writes the data to the connection's output stream.
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
 * Generates a multipart boundary.
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
 * Writes the multipart data to the connection's output stream.
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
 * Reads the response and returns it as ByteArray.
 * @param {java.net.HttpURLConnection} connection The connection
 * @returns {ByteArray} The response as ByteArray
 */
var readResponse = function(connection) {
    var status = connection.getResponseCode();
    var inStream;
    try {
        inStream = connection[(status >= 200 && status < 400) ?
                "getInputStream" : "getErrorStream"]();
        // return null in case of responses with an empty body
        if (inStream === null) {
            return null;
        }
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
 * @returns {Exchange} A newly constructed Exchange instance
 * @constructor
 */
var Exchange = function(url, options) {
    var reqData = options.data;
    var connection = null;
    var responseContent;
    var responseContentBytes;
    var thrownException;

    Object.defineProperties(this, {
        /**
         * The connection used by this Exchange instance.
         * @name Exchange.prototype.connection
         */
        "connection": {
            "get": function() {
                return connection;
            }, "enumerable": true
        },
        /**
         * The response body as String.
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
         * The response body as ByteArray.
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
        var url = new URL(url);
        if (options.proxy) {
            var host, port;
            if (typeof(options.proxy) == "string") {
                [host, port] = options.proxy.split(":");
            } else {
                host = options.proxy.host;
                port = options.proxy.port;
            }
            connection = url.openConnection(
                new Proxy(Proxy.Type.HTTP, new InetSocketAddress(host, port || 3128))
            );
        } else {
            connection = url.openConnection();
        }
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
        if (typeof(options.beforeSend) === "function") {
            options.beforeSend(this);
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
    } finally {
        connection && connection.disconnect();
    }

    return this;
};

Object.defineProperties(Exchange.prototype, {
    /**
     * The URL wrapped by this Exchange instance.
     * @type java.net.URL
     * @name Exchange.prototype.url
     */
    "url": {
        "get": function() {
            return this.connection.getURL();
        }, "enumerable": true
    },
    /**
     * The response status code.
     * @type Number
     * @name Exchange.prototype.status
     */
    "status": {
        "get": function() {
            return this.connection.getResponseCode();
        }, "enumerable": true
    },
    /**
     * The response status message.
     * @type String
     * @name Exchange.prototype.message
     */
    "message": {
        "get": function() {
            return this.connection.getResponseMessage();
        }, "enumerable": true
    },
    /**
     * The response headers.
     * @name Exchange.prototype.headers
     */
    "headers": {
        "get": function() {
            // This is required since getHeaderFields() returns an unmodifiable Map
            // http://hg.openjdk.java.net/jdk8/jdk8/jdk/file/687fd7c7986d/src/share/classes/sun/net/www/protocol/http/HttpURLConnection.java#l2919
            var headerFields = new java.util.HashMap(this.connection.getHeaderFields());

            // drops the HTTP Status-Line with the key null
            // null => HTTP/1.1 200 OK
            // this is required since ScriptableMap cannot deal with null keys!
            headerFields.remove(null);

            return new ScriptableMap(headerFields);
        }, enumerable: true
    },
    /**
     * The cookies set by the server.
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
     * The response encoding.
     * @type String
     * @name Exchange.prototype.encoding
     */
    "encoding": {
        "get": function() {
            return getMimeParameter(this.contentType, "charset") || "utf-8";
        }, "enumerable": true
    },
    /**
     * The response content type.
     * @type String
     * @name Exchange.prototype.contentType
     */
    "contentType": {
        "get": function() {
            return this.connection.getContentType();
        }, "enumerable": true
    },
    /**
     * The response content length.
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
 *  - `proxy`: proxy-settings as string ("proxy.host:port") or object {host: "hostname.org", port: 3128}
 *  - `contentType`: the contentType
 *  - `binary`: if true if content should be delivered as binary,
 *     else it will be decoded to string
 *  - `followRedirects`: whether HTTP redirects (response code 3xx) should be
 *     automatically followed; default: true
 *  - `readTimeout`: setting for read timeout in millis. 0 return implies that the option
 *     is disabled (i.e., timeout of infinity); default: 30000 ms (or until impl decides its time)
 *  - `connectTimeout`: Sets a specified timeout value, in milliseconds, to be used
 *     when opening a communications link to the resource referenced by this
 *     URLConnection. A timeout of zero is interpreted as an infinite timeout.;
 *     default: 60000 ms (or until impl decides its time)
 *
 * @param {Object} options
 * @returns {Exchange} exchange object
 * @see #get
 * @see #post
 * @see #put
 * @see #del
 */
var request = function(options) {
    if (options.complete != null || options.success != null || options.error != null) {
        log.warn("ringo/httpclient does not support callbacks anymore!");
    }

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
        "binary": opts.binary,
        "proxy": opts.proxy,
        "beforeSend": opts.beforeSend
    });
};

/**
 * Creates an options object based on the arguments passed.
 * @param {String} method The request method
 * @param {String} url The URL
 * @param {String|Object|Stream|Binary} data Optional data to send to the server
 * @returns An options object
 * @type Object<method, url, data>
 */
var createOptions = function(method, url, data) {
    return {
        method: method,
        url: url,
        data: data
    };
};

/**
 * Executes a GET request.
 * @param {String} url The URL
 * @param {Object|String} data The data to append as GET parameters to the URL
 * @returns {Exchange} The Exchange instance representing the request and response
 */
var get = function(url, data) {
    return request(createOptions("GET", url, data));
};

/**
 * Executes a POST request.
 * @param {String} url The URL
 * @param {Object|String|Stream|Binary} data The data to send to the server
 * @returns {Exchange} The Exchange instance representing the request and response
 */
var post = function(url, data) {
    return request(createOptions("POST", url, data));
};

/**
 * Executes a DELETE request.
 * @param {String} url The URL
 * @param {Object|String} data The data to append as GET parameters to the URL
 * @returns {Exchange} The Exchange instance representing the request and response
 */
var del = function(url, data) {
    return request(createOptions("DELETE", url, data));
};

/**
 * Executes a PUT request.
 * @param {String} url The URL
 * @param {Object|String|Stream|Binary} data The data send to the server
 * @returns {Exchange} The Exchange instance representing the request and response
 */
var put = function(url, data) {
    return request(createOptions("PUT", url, data));
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
     * Writes this TextPart's data.
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
