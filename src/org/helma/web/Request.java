/*
 *  Copyright 2005 Hannes Wallnoefer <hannes@helma.at>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.helma.web;

import org.helma.util.CaseInsensitiveMap;
import org.helma.util.ScriptableMap;
import org.helma.util.ParameterMap;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Wrapper;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import java.util.*;
import java.io.UnsupportedEncodingException;

/**
 * This class represents a HTTP Request. The current Request object
 * can be accessed as global variable req.
 *
 * @rhinoclass Request
 */
public class Request extends ScriptableObject {

    private HttpServletRequest request;
    private Session session;
    private Scriptable cookies, params, headers;
    private static final long serialVersionUID = -2167096504665220425L;

    public Request() {
        super();
    }

    public Request(Object req) {
        if (req instanceof Wrapper) {
            req = ((Wrapper) req).unwrap();
        }
        if (req instanceof HttpServletRequest) {
            this.request = (HttpServletRequest) req;
        } else {
            throw new IllegalArgumentException("Expected HttpServletRequest, got " + req);
        }
    }

    /**
     * Get the servlet request as a wrapped java object
     * @return the servlet request as a wrapped java object
     */
    public Object jsGet_servletRequest() {
        return Context.toObject(request, getParentScope());
    }

    /**
     * The host name of the server that received the request.
     * @return the name of the server to which the request was sent
     */
    public String jsGet_host() {
        return request.getServerName();
    }

    /**
     * The port number on which this request was received.
     * @return an integer specifying the port number
     */
    public int jsGet_port() {
        return request.getServerPort();
    }

    /**
     * Get the session object for this request, creating it if it doesn't exist
     * @return the session associated with this request
     */
    public Object jsGet_session() {
        if (session == null) {
            session = new Session(request, getParentScope());
        }
        return session;
    }

    /**
     * Returns the name of the HTTP method with which this request was made,
     * for example, GET, POST, or PUT.
     * @return the HTTP method as String
     */
    public String jsGet_method() {
        return request.getMethod();
    }

    /**
     * Checks if the argument string matches the HTTP method of this request.
     * @param method a method name
     * @return true if the method matches
     */
    public boolean jsFunction_isMethod(String method) {
        return method != null && method.equalsIgnoreCase(request.getMethod());
    }

    /**
     * Returns any extra path information associated with the URL the client
     * sent when it made this request. The extra path information follows the
     * servlet path but precedes the query string. This method returns null
     * if there was no extra path information.
     * @return the extra path info as String
     */
    public String jsGet_pathInfo() {
        return request.getPathInfo();
    }

    /**
     * Returns any extra path information after the servlet name but before
     * the query string, and translates it to a real path. Same as the value
     * of the CGI variable PATH_TRANSLATED. If the URL does not have any extra
     * path information, this method returns null.
     * @return the real path, or null if the URL does not have any extra path information
     */
    public String jsGet_pathTranslated() {
        return request.getPathTranslated();
    }

    /**
     * The name and version of the protocol the request uses in the form
     * protocol/majorVersion.minorVersion, for example, HTTP/1.1.
     * @return the name of the protocol used to make this request
     */
    public String jsGet_protocol() {
        return request.getProtocol();
    }

    /**
     * The name of the scheme used to make this request, for example, http, https, or ftp.
     * @return the name of the scheme used to make this request
     */
    public String jsGet_scheme() {
        return request.getScheme();
    }

    /**
     * The request's URI path, as passed in the first line of the HTTP request.
     * @return the URI path of the request
     */
    public String jsGet_path() {
        return request.getRequestURI();
    }

    /**
     * The request's unparsed query string, or null if the request contains no query string.
     * @return the query string or null if the URL contains no query string
     */
    public String jsGet_queryString() {
        return request.getQueryString();
    }

    /**
     * Return the encoding used for parameter parsing.
     * @return the charset name
     */
    public String jsGet_charset() {
        return request.getCharacterEncoding();
    }

    /**
     * Set the request encoding to be used for parameter parsing.
     * @param charset the charset name
     * @throws UnsupportedEncodingException if charset name is not a valid encoding
     */
    public void jsSet_charset(String charset) throws UnsupportedEncodingException {
        request.setCharacterEncoding(charset);
    }

    /**
     * Property to get the Content-Type header of the current HTTP request.
     * @return the MIME content type
     */
    public String jsGet_contentType() {
        return request.getContentType();
    }

    /**
     * The length, in bytes, of the request body and made available by the input stream,
     * or -1 if the length is not known.
     * @return the length of the request body
     */
    public int jsGet_contentLength() {
        return request.getContentLength();
    }

    /**
     * Returns the value of the specified request header as JavaScript array of Strings.
     * @param name the header name
     * @return the header value as Array of Strings
     */
    public Object jsFunction_getHeaders(String name) {
        return getJsArray(request.getHeaders(name));
    }

    /**
     * Returns the value of the specified request header as Date object.
     * @param name the header name
     * @return the header value parsed as date, or null if the header doesn't exist
     */
    public Object jsFunction_getDateHeader(String name) {
        long date = request.getDateHeader(name);
        if (date == -1) {
            return null;
        } else {
            return Context.getCurrentContext()
                    .newObject(getParentScope(), "Date", new Object[] {date});
        }
    }

    /**
     * Returns the value of the specified request header as integer number.
     * @param name the header name
     * @return the header value parsed as integer, or -1 if the header doesn't exist
     */
    public int jsFunction_getIntHeader(String name) {
        return request.getIntHeader(name);
    }

    /**
     * A JavaScript object reflecting the headers of this request.
     * @return the request headers as JavaScript object
     */
    public Object jsGet_headers() {
        if (headers == null) {
            Map<String,String> headerMap = new HashMap<String,String>();
            for (Enumeration e = request.getHeaderNames(); e.hasMoreElements(); ) {
                String name = (String) e.nextElement();
                if (!headerMap.containsKey(name)) {
                    headerMap.put(name, request.getHeader(name));
                }
            }
            headers = new ScriptableMap(getParentScope(),
                    new CaseInsensitiveMap<String,String>(headerMap));
        }
        return headers;
    }

    /**
     * Return the parameter map wrapped as scriptable object.
     * @return the parameter map, wrapped as scriptable object.
     */
    public Object jsGet_params() {
        if (params == null) {
            params = new ScriptableMap(getParentScope(),
                    new ParameterMap(request.getParameterMap()));
        }
        return params;
    }

    /**
     * A JavaScript object containint the cookies the client sent with this request.
     * @return the request cookies as JavaScript object
     */
    public Object jsGet_cookies() {
        if (cookies == null) {
            Cookie[] cookieArray = request.getCookies();
            ParameterMap cookieMap = new ParameterMap();
            if (cookieArray != null) {
                for (Cookie cookie : cookieArray) {
                    if (!cookieMap.containsKey(cookie.getName())) {
                        cookieMap.put(cookie.getName(), cookie);
                    }
                }
            }
            cookies = new ScriptableMap(getParentScope(), cookieMap);
        }
        return cookies;
    }

   /**
     * Returns a JavaScript array containing the request's cookies as
     * *servlet cookie|http://java.sun.com/products/servlet/2.5/docs/servlet-2_5-mr2/javax/servlet/http/Cookie.html*
     * instances. This method should be used if there are multiple cookies with the same
     * name, or if access to other cookie properties beyond its name and value are required.
     * Otherwise, it is more convenient to use the *req.cookies|cookies* object. 
     * @return a JavaScript array with the request's cookie objects
     */
    /* public Object jsFunction_getCookies() {
        return getJsArray(request.getCookies());
    } */

    public String getClassName() {
        return "Request";
    }

    protected Scriptable getJsArray(Enumeration en) {
        List<Object> list = new ArrayList<Object>();
        while (en.hasMoreElements()) {
            list.add(en.nextElement());
        }
        Context cx = Context.getCurrentContext();
        return cx.newArray(getParentScope(), list.toArray());
    }

    protected Scriptable getJsArray(Object[] arr) {
        Scriptable scope = getParentScope();
        Context cx = Context.getCurrentContext();
        if (arr == null) {
            return cx.newArray(scope, 0);
        }
        int length = arr.length;
        Scriptable array = cx.newArray(scope, length);
        for (int i = 0; i < length; i++) {
            if (arr[i] != null) {
                array.put(i, array, Context.toObject(arr[i], scope));
            }
        }
        return array;
    }

}
