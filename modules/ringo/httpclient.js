/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2006 Helma Software. All Rights Reserved.
 *
 * $RCSfile: Http.js,v $
 * $Author: hannes $
 * $Revision: 8725 $
 * $Date: 2007-12-19 11:13:54 +0100 (Mit, 19 Dez 2007) $
 */


/**
 * @fileoverview Fields and methods of the ringo.http module.
 */

// take care of any dependencies
require('core/date');
require('core/string');

export("Client", "Cookie");

/**
 * Creates a new instance of ringo.http.Client
 * @class This class provides functionality to programatically issue
 * an Http request based on java.net.HttpUrlConnection.
 * By default the request will use method <code>GET</code>.
 * @returns A newly created ringo.http.Client instance
 * @constructor
 */
function Client() {
    var self = this;
    var proxy = null;
    var content = "";
    var userAgent = "RingoJS Http Client";
    var method = "GET";
    var cookies = null;
    var credentials = null;
    var followRedirects = true;
    var binaryMode = false;
    var headers = {};
    var timeout = {
        "connect": 0,
        "socket": 0
    };
    var maxResponseSize = null;

    var responseHandler = function(connection, result) {
       var input;
       try {
          input = new java.io.BufferedInputStream(connection.getInputStream());
       } catch (error) {
          input = new java.io.BufferedInputStream(connection.getErrorStream());
       }
       if (input) {
          var body = new java.io.ByteArrayOutputStream();
          var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
          var len;
          var currentSize = 0;
          while ((len = input.read(buf)) > -1) {
             body.write(buf, 0, len);
             currentSize += len;
             if (maxResponseSize && currentSize > maxResponseSize) {
                throw new Error("Maximum allowed response size is exceeded");
             }
          }
          try {
             input.close();
          } catch (error) {
             // safe to ignore 
          }
          if (binaryMode && (result.code >= 200 && result.code < 300)) {
             // only honor binaryMode if the request succeeded
             result.content = body.toByteArray();
          } else {
             result.content = result.charset ?
                      body.toString(result.charset) :
                      body.toString();
          }
          // adjust content length
          if (result.content) {
             result.length = result.content.length;
          }
       }
    };

    /** @private */
    var setTimeout = function(type, value) {
        var v = java.lang.System.getProperty("java.specification.version");
        if (parseFloat(v, 10) >= 1.5) {
            timeout[type] = value;
        } else {
            app.logger.warn("ringo.http.Client: Timeouts can only be set with Java Runtime version >= 1.5");
        }
        return true;
    }

    /**
     * Sets the proxy host and port for later use. The argument must
     * be in <code>host:port</code> format (eg. "proxy.example.com:3128").
     * @param {String} proxyString The proxy to use for this request
     * @see #getProxy
     */
    this.setProxy = function(proxyString) {
        var idx = proxyString.indexOf(":");
        var host = proxyString.substring(0, idx);
        var port = proxyString.substring(idx+1);
        if (java.lang.Class.forName("java.net.Proxy") != null) {
            // construct a proxy instance
            var socket = new java.net.InetSocketAddress(host, port);
            proxy = new java.net.Proxy(java.net.Proxy.Type.HTTP, socket);
        } else {
            // the pre jdk1.5 way: set the system properties
            var sys = java.lang.System.getProperties();
            if (host) {
                app.logger.warn("[RingoJS Http Client] WARNING: setting system http proxy to " + host + ":" + port);
                sys.put("http.proxySet", "true");
                sys.put("http.proxyHost", host);
                sys.put("http.proxyPort", port);
            }
        }
        return;
    };

    /**
     * Returns the proxy in <code>host:port</code> format
     * @return The proxy defined for this request
     * @type String
     * @see #setProxy
     */
    this.getProxy = function() {
        if (proxy != null) {
            return proxy.address().getHostName() + ":" + proxy.address().getPort();
        } else if (sys.get("http.proxySet") == "true") {
            return sys.get("http.proxyHost") + ":" + sys.get("http.proxyPort");
        } else {
            return null;
        }
    };

    /**
     * Sets the credentials for basic http authentication
     * @param {String} username The username
     * @param {String} password The password
     */
    this.setCredentials = function(username, password) {
        var str = new java.lang.String(username + ":" + password);
        credentials = (new Packages.sun.misc.BASE64Encoder()).encode(str.getBytes());
        return;
    }

    /**
     * Sets the content to send to the remote server within this request.
     * @param {String|Object} stringOrObject The content of the request, which
     * can be either a string or an object. In the latter case all properties
     * and their values are concatenated into a single string.
     * If a property is an array, then for each value the propertyname and value pair is added.
     * If the name of an array property ends with "_array" then the _array part is removed.  
     */
    this.setContent = function(stringOrObject) {
        if (stringOrObject != null) {
            if (stringOrObject instanceof Object) {
                var Buffer = require('ringo/buffer').Buffer;
                var buf = new Buffer();
                var value;
                for (var key in stringOrObject) {
                    value = stringOrObject[key];
                    if (value instanceof Array) {
                        if (key.substring(key.length - 6) == "_array") 
                            key = key.substring(0,key.length - 6); 
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
                content = buf.toString();
                content = content.substring(0, content.length-1);
            } else {
                content = String(stringOrObject);
            }
        } else {
           content = null;
        }
        return;
    };
    
    /**
     * Sets the request method to use.
     * @param {String} m The method to use (<code>GET</code>, <code>POST</code> ...)
     * @see #getMethod
     */
    this.setMethod = function(m) {
        method = m;
        return;
    };

    /**
     * Returns the currently defined request method.
     * @returns The method used
     * @type String
     * @see #setMethod
     */
    this.getMethod = function() {
        return method;
    };

    /**
     * Sets a single HTTP request header field
     * @param {String} name The name of the header field
     * @param {String} value The value of the header field
     * @see #getHeader
     */
    this.setHeader = function(name, value) {
        headers[name] = value;
        return;
    };

    /**
     * Returns the value of the request header field with the given name
     * @param {String} name The name of the request header field
     * @returns The value of the request header field
     * @type String
     * @see #setHeader
     */
    this.getHeader = function(name) {
        return headers[name];
    };

    /**
     * Adds a cookie with the name and value passed as arguments
     * to the list of cookies to send to the remote server.
     * @param {String} name The name of the cookie
     * @param {String} value The value of the cookie
     * @see #getCookie
     * @see #getCookies
     */
    this.setCookie = function(name, value) {
        if (name != null && value != null) {
            // store the cookie in the cookies map
            if (!cookies) {
                cookies = {};
            }
            cookies[name] = new Cookie(name, value);
        }
        return;
    };

    /**
     * Returns the value of the cookie with the given name
     * @param {String} name The name of the cookie
     * @returns The value of the cookie
     * @type String
     * @see #setCookie
     */
    this.getCookie = function(name) {
        return (cookies != null) ? cookies[name] : null;
    };

    /**
     * Adds the cookies passed as argument to the list of cookies to send
     * to the remote server.
     * @param {Array} cookies An array containing objects with the properties
     * "name" (the name of the cookie) and "value" (the value of the cookie) set. 
     */
    this.setCookies = function(cookies) {
        if (cookies != null) {
            for (var i=0; i<cookies.length; i++) {
                this.setCookie(cookies[i].name, cookies[i].value);
            }
        }
        return;
    };

    /**
     * Returns all cookies set for this client
     * @return An object containing all cookies, where the property
     * name is the name of the cookie, and the value is the cookie value
     * @see #setCookie
     */
    this.getCookies = function() {
        return cookies;
    };

    /**
     * Sets the connection timeout to the amount of milliseconds
     * passed as argument
     * @param {Number} timeout The connection timeout in milliseconds
     * @see #getTimeout
     */
    this.setTimeout = function(timeout) {
        setTimeout("connect", timeout);
        return;
    };

    /**
     * Sets the read timeout (the maximum time a request may take after
     * the connection has been successfully established) to the amount of
     * milliseconds passed as argument.
     * @param {Number} timeout The read timeout in milliseconds
     * @see #getReadTimeout
     */
    this.setReadTimeout = function(timeout) {
        setTimeout("socket", timeout);
        return true;
    };

    /**
     * Returns the connection timeout
     * @returns The connection timeout in milliseconds
     * @type Number
     * @see #setTimeout
     */
    this.getTimeout = function() {
        return timeout.connect;
    };

    /**
     * Returns the read timeout (the maximum time a request may take after
     * the connection has been successfully established).
     * @returns The read timeout in milliseconds
     * @type Number
     * @see #setReadTimeout
     */
    this.getReadTimeout = function() {
        return timeout.socket;
    };

    /**
     * Enables or disables following redirects
     * @param {Boolean} value If false this client won't follow redirects (the default is
     * to follow them)
     * @see #getFollowRedirects
     */
    this.setFollowRedirects = function(value) {
        followRedirects = value;
        return;
    };

    /**
     * Returns true if the client follows redirects
     * @returns True if the client follows redirects, false otherwise.
     * @see #setFollowRedirects
     */
    this.getFollowRedirects = function() {
        return followRedirects;
    };

    /**
     * Sets the HTTP "User-Agent" header field to the string passed as argument
     * @param {String} agent The string to use as value of the
     * "User-Agent" header field (defaults to "RingoJS Http Client")
     * @see #getUserAgent
     */
    this.setUserAgent = function(agent) {
        userAgent = agent;
        return;
    };

    /**
     * Returns the value of the HTTP "User-Agent" header field
     * @returns The value of the field
     * @type String
     * @see #setUserAgent
     */
    this.getUserAgent = function() {
        return userAgent;
    };

    /**
     * Switches content text encoding on or off. Depending on this
     * the content received from the remote server will be either a
     * string or a byte array.
     * @param {Boolean} mode If true binary mode is activated
     * @see #getBinaryMode
     */
    this.setBinaryMode = function(mode) {
        binaryMode = mode;
        return;
    };

    /**
     * Returns the currently defined binary mode of this client
     * @returns The binary mode of this client
     * @type Boolean
     * @see #setBinaryMode
     */
    this.getBinaryMode = function() {
        return binaryMode;
    };

    /**
     * Sets the max allowed size for the response stream
     * @param {Integer} Size in Byte
     */
    this.setMaxResponseSize = function(size) {
        maxResponseSize = size;
        return;
     };

    /**
     * Returns the currently set max response size
     * @returns The max responsesize
     * @type Integer
     * @see #setMaxResponseSize
     */
    this.getMaxResponseSize = function() {
       return maxResponseSize;
    };

    /**
     * Overloads the default response handler.
     * Use this do implement your own response handling, like storing the response directly to the harddisk
     * The handler function gets two parameter, first is the java.net.URLConnection and second is the result object.
     * Note that custom response handler functions should check the HTTP status code before reading
     * the response. The status code for successful requests is 200. Response bodies for requests with
     * status codes less than 400 can be read from the connection's input stream, while response bodies
     * with 4xx or 5xx status codes must be read using the error stream.
     * @param {function} Response handler function
     */
    this.setResponseHandler = function(callback) {
       responseHandler = callback;
       return;
    };

    /**
     * Get the response handler. This is the function used to read the HTTP response body.
     * @returns The response handler function
     */
    this.getResponseHandler = function() {
       return responseHandler;
    }

    /**
     * Executes a http request
     * @param {String} url The url to request
     * @param {Date|String} opt If this argument is a string, it is used
     * as value for the "If-None-Match" request header field. If it is a
     * Date instance it is used as "IfModifiedSince" condition for this request.
     * @return A result object containing the following properties:
     * <ul>
     * <li><code>url</code>: (String) The Url of the request</li>
     * <li><code>location</code>: (String) The value of the location header field</li>
     * <li><code>code</code>: (Number) The HTTP response code</li>
     * <li><code>message</code>: (String) An optional HTTP response message</li>
     * <li><code>length</code>: (Number) The content length of the response</li>
     * <li><code>type</code>: (String) The mimetype of the response</li>
     * <li><code>charset</code>: (String) The character set of the response</li>
     * <li><code>encoding</code>: (String) An optional encoding to use with the response</li>
     * <li><code>lastModified</code>: (String) The value of the lastModified response header field</li>
     * <li><code>eTag</code>: (String) The eTag as received from the remote server</li>
     * <li><code>cookie</code>: (ringo.http.Cookie) An object containing the cookie parameters, if the remote
           server has set the "Set-Cookie" header field</li>
     * <li><code>headers</code>: (java.util.Map) A map object containing the headers, access them using get("headername")
     * <li><code>content</code>: (String|ByteArray) The response received from the server. Can be either
           a string or a byte array (see #setBinaryMode)</li>
     * </ul>
     */
    this.getUrl = function(url, opt) {
        if (typeof url == "string") {
            if (!(url = evalUrl(url)))
                throw new Error("'" + url + "' is not a valid URL.");
        } else if (!(url instanceof java.net.URL)) {
            throw new Error("'" + url + "' is not a valid URL.");
        }
        
        var conn = proxy ? url.openConnection(proxy) : url.openConnection();
        // Note: we must call setInstanceFollowRedirects() instead of
        // static method setFollowRedirects(), as the latter will
        // set the default value for all url connections, and will not work for
        // url connections that have already been created.
        conn.setInstanceFollowRedirects(followRedirects);
        conn.setAllowUserInteraction(false);
        conn.setRequestMethod(method);
        conn.setRequestProperty("User-Agent", userAgent);

        if (opt) {
            if (opt instanceof Date)
                conn.setIfModifiedSince(opt.getTime());
            else if ((typeof opt == "string") && (opt.length > 0))
                conn.setRequestProperty("If-None-Match", opt);
        }

        var userinfo;
        if (userinfo = url.getUserInfo()) {
           userinfo = userinfo.split(/:/, 2);
           this.setCredentials(userinfo[0], userinfo[1]);
        }
        if (credentials != null) {
            conn.setRequestProperty("Authorization", "Basic " + credentials);
        }
        // set timeouts
        if (parseFloat(java.lang.System.getProperty("java.specification.version"), 10) >= 1.5) {
            conn.setConnectTimeout(timeout.connect);
            conn.setReadTimeout(timeout.socket);
        }
        // set header fields
        for (var i in headers) {
            conn.setRequestProperty(i, headers[i]);
        }
        // set cookies
        if (cookies != null) {
            var arr = [];
            for (var i in cookies) {
                arr[arr.length] = cookies[i].getFieldValue();
            }
            conn.setRequestProperty("Cookie", arr.join(";"));
        }
        // set content
        if (content) {
            conn.setRequestProperty("Content-Length", content.length);
            conn.setDoOutput(true);
            var out = new java.io.OutputStreamWriter(conn.getOutputStream());
            out.write(content);
            out.flush();
            out.close();
        }

        var result = {
            url: conn.getURL(),
            location: conn.getHeaderField("location"),
            code: conn.getResponseCode(),
            message: conn.getResponseMessage(),
            length: conn.getContentLength(),
            type: conn.getContentType(),
            encoding: conn.getContentEncoding(),
            lastModified: null,
            eTag: conn.getHeaderField("ETag"),
            cookies: null,
            headers: conn.getHeaderFields(),
            content: null
        }

        // parse all "Set-Cookie" header fields into an array of
        // ringo.http.Cookie instances
        var setCookies = conn.getHeaderFields().get("Set-Cookie");
        if (setCookies != null) {
            var arr = [];
            var cookie;
            for (var i=0; i<setCookies.size(); i++) {
                if ((cookie = Cookie.parse(setCookies.get(i))) != null) {
                    arr.push(cookie);
                }
            }
            if (arr.length > 0) {
                result.cookies = arr;
            }
        }

        var lastmod = conn.getLastModified();
        if (lastmod) {
            result.lastModified = new Date(lastmod);
        }

        if (maxResponseSize && result.length > maxResponseSize) {
           throw new Error("Maximum allowed response size is exceeded");
        }

        if (result.type && result.type.indexOf("charset=") != -1) {
           var charset = result.type.substring(result.type.indexOf("charset=") + 8);
           charset = charset.replace(/[;"]/g, '').trim();
           result.charset = charset;
        }

        // invoke response handler
        responseHandler(conn, result);

        conn.disconnect();
        return result;
    }

    /** @ignore */
    this.toString = function() {
        return "[ringo.http.Client]";
    };

    return this;
};


/**
 * Evaluates the url passed as argument.
 * @param {String} url The url or uri string to evaluate
 * @returns If the argument is a valid url, this method returns
 * a new instance of java.net.URL, otherwise it returns null.
 * @type java.net.URL
 */
function evalUrl(url) {
    try {
        return new java.net.URL(url);
    } catch (err) {
        return null;
    }
};


/**
 * Sets the global http proxy setting. If no proxy definition
 * is passed to this method, any existing proxy setting is
 * cleared. Internally this method sets the system properties
 * <code>http.proxySet</code>, <code>http.proxyHost</code> and
 * <code>http.proxyPort</code>. Keep in mind that this is valid for
 * the whole Java Virtual Machine, therefor using this method
 * can potentially influence other running RingoJS applications too!
 * @param {String} proxyString A proxy definition in <code>host:port</code>
 * format (eg. "proxy.example.com:3128");
 * @member ringo.http
 */
function setProxy(proxyString) {
    var sys = java.lang.System.getProperties();
    if (proxyString) {
        var idx = proxyString.indexOf(":");
        var host = proxyString.substring(0, idx);
        var port = proxyString.substring(idx+1);
        if (!port)
            port = "3128";
        else if (typeof port == "number")
            port = port.toString();
        app.logger.info("ringo.http.setProxy " + proxyString);
        sys.put("http.proxySet", "true");
        sys.put("http.proxyHost", host);
        sys.put("http.proxyPort", port);
    } else {
        sys.put("http.proxySet", "false");
        sys.put("http.proxyHost", "");
        sys.put("http.prodyPort", "");
    }
    return;
    
};


/**
 * Returns the proxy setting of the Java Virtual Machine
 * the RingoJS application server is running in. If no
 * proxy is set, this method returns boolean false.
 * @returns The global proxy setting in <code>host:port</code>
 * format (eg. "proxy.example.com:3128"), or boolean false.
 * @type String|Boolean
 * @member ringo.http
 */
function getProxy() {
    var sys = java.lang.System.getProperties();
    if (sys.get("http.proxySet") == "true")
        return sys.get("http.proxyHost") + ":" + sys.get("http.proxyPort");
    return false;
};

/** @ignore */
/* ringo.http.toString = function() {
    return "[ringo.http]";
}; */

/**
 * Creates a new instance of ringo.http.Cookie
 * @class Instances of this object represent a HTTP cookie
 * @param {String} name The name of the cookie
 * @param {String} value The value of the cookie
 * @returns A newly created Cookie instance
 * @constructor
 */
function Cookie(name, value) {
    /**
     * The name of the Cookie
     * @type String
     */
    this.name = name;

    /**
     * The value of the Cookie
     * @type String
     */
    this.value = value;

    /**
     * An optional date defining the lifetime of this cookie
     * @type Date
     */
    this.expires = null;

    /**
     * An optional path where this cookie is valid
     * @type String
     */
    this.path = null;

    /**
     * An optional domain where this cookie is valid
     * @type String
     */
    this.domain = null;

    return this;
}

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
 * Parses the cookie string passed as argument into an instance of ringo.http
 * @param {String} cookieStr The cookie string as received from the remote server
 * @returns An instance of Cookie containing the cookie parameters
 * @type Cookie
 */
Cookie.parse = function(cookieStr) {
    if (cookieStr != null) {
        var cookie = new Cookie;
        var m = Cookie.PATTERN.exec(cookieStr);
        if (m) {
            cookie.name = m[1].trim();
            cookie.value = m[2] ? m[2].trim() : "";
        }
        while ((m = Cookie.PATTERN.exec(cookieStr)) != null) {
            var key = m[1].trim();
            var value = m[2] ? m[2].trim() : "";
            switch (key.toLowerCase()) {
                case "expires":
                    // try to parse the expires date string into a date object
                    try {
                        cookie.expires = Cookie.DATEFORMAT.parse(value);
                    } catch (e) {
                        // ignore
                    }
                    break;
                default:
                    cookie[key.toLowerCase()] = value;
                    break;
            }
        }
        return cookie;
    }
    return null;
};

/**
 * Returns this cookie in a format useable to set the HTTP header field "Cookie"
 * @return This cookie formatted as HTTP header field value
 * @type String
 */
Cookie.prototype.getFieldValue = function() {
    return this.name + "=" + this.value;
};

/** @ignore */
Cookie.prototype.toString = function() {
    return "[Cookie " + this.name + " " + this.value + "]";
};

