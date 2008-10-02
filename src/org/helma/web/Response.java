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

import org.mozilla.javascript.*;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * This class represents a HTTP Response. The current Response object
 * can be accessed as global variable res.
 *
 * @rhinoclass Response
 */
public class Response extends ScriptableObject {

    protected HttpServletResponse response;
    protected int status = 200;
    private static final long serialVersionUID = 8492609461086704262L;

    public Response() {
        response = null;
    }

    public Response(Object res) {
        if (res instanceof Wrapper) {
            res = ((Wrapper) res).unwrap();
        }
        if (res instanceof HttpServletResponse) {
            this.response = (HttpServletResponse) res;
        } else {
            throw new IllegalArgumentException("Expected HttpServletResponse, got " + res);
        }
    }

    /**
     * Get or set the HTTP status code of the response.
     * @return the HTTP status code of the response.
     */
    public int jsGet_status()  {
        return status;
    }

    /**
     * Set the HTTP status code of the response.
     * @param status the HTTP status code of the response
     */
    public void jsSet_status(int status) {
        response.setStatus(status);
        this.status = status;
    }

    /**
     * Get the servlet request as a wrapped java object
     * @return the servlet request as a wrapped java object
     */
    public Object jsGet_servletResponse() {
        return Context.toObject(response, getParentScope());
    }

    /**
     * Property to set/get the Content-Type header of the current HTTP response.
     *
     *   res.contentType = "text/html";
     *
     * @return the MIME content type
     */
    public String jsGet_contentType() {
        return response.getContentType();
    }

    /**
     * Property to set/get the Content-Type header of the current HTTP response.
     *
     *   res.contentType = "text/html";
     * 
     * @param contentType the MIME content type
     */
    public void jsSet_contentType(String contentType) {
        response.setContentType(contentType);
    }

    /**
     * Convert the arguments to strings and write them to the HTTP response.
     * This method takes a variable number of arguments. This is similar to
     * *writeln()*, but does not append a newline sequence to the output.
     *
     * @param cx the rhino context
     * @param thisObj the object the method was called on
     * @param args the arguments
     * @param funObj the function object
     * @return the response object
     * @rhinoparam arg Object one ore more objects to write to the response buffer
     */
    public static Object jsFunction_write(Context cx, Scriptable thisObj,
                                        Object[] args, Function funObj)
            throws IOException {
        Response res = (Response) thisObj;
        res.write(args);
        return thisObj;
    }

    /**
     * Convert the arguments to strings and write them to the HTTP response,
     * followed by a newline sequence. This method takes a variable number
     * of arguments and works exactly as write(), except for the trailing newline.
     *
     * @param cx the rhino context
     * @param thisObj the object the method was called on
     * @param args the arguments
     * @param funObj the function object
     * @return teh response object
     * @rhinoparam arg Object one ore more objects to write to the response buffer
     */
    public static Object jsFunction_writeln(Context cx, Scriptable thisObj,
                                          Object[] args, Function funObj)
            throws IOException {
        Response res = (Response) thisObj;
        res.write(args);
        res.write("\r\n");
        return thisObj;
    }

    /**
     * Write a number of objects to the buffer separated by space characters.
     * @param args the arguments to write
     * @return the buffer instance
     */
    public ScriptableObject write(Object... args) throws IOException {
        int length = args.length;
        PrintWriter writer = response.getWriter();
        for (int i = 0; i < length; i++) {
            writer.write(Context.toString(args[i]));
            if (i < length - 1) {
                writer.write(" ");
            }
        }
        return this;
    }

    public void jsFunction_flush() throws IOException {
        response.flushBuffer();
    }

    public void jsFunction_resetBuffer() {
        response.resetBuffer();
    }

    public void jsFunction_reset() {
        response.reset();
    }

    public int jsGet_bufferSize() {
        return response.getBufferSize();
    }

    public void jsSet_bufferSize(int size) {
        response.setBufferSize(size);
    }

    public String jsGet_encoding() {
        return response.getCharacterEncoding();
    }

    public void jsSet_encoding(String encoding) {
        response.setCharacterEncoding(encoding);
    }

    /**
     * Set a HTTP cookie with the given name and value. This function takes at least
     * two arguments, a cookie name and a cookie value. Optionally, the third
     * argument specifies the number of days the cookie is to be stored by the client.
     * The cookie path and domain may be specified as fourth and fifth argument,
     * respectively.
     *
     * A negative days value means the cookie should be used only during the current
     * user session and discarded afterwards. A days value of 0 means the cookie should
     * be immediately discarded by the client and can therefore be used to delete a cookie.
     *
     * @param cx the rhino context
     * @param thisObj the object the method was called on
     * @param args the arguments
     * @param funObj the function object
     * @rhinoparam name String the cookie name
     * @rhinoparam value String  the cookie value
     * @rhinoparam days Integer number of days the cookie should be stored
     * @rhinoparam path String the URL path to apply the cookie to
     * @rhinoparam domain String the domain to apply the cookie to
     */
    public static void jsFunction_setCookie(Context cx, Scriptable thisObj,
                                          Object[] args, Function funObj) {
        if (!(thisObj instanceof Response))
            throw new IllegalArgumentException("setCookie() must be called on response object");
        if (args.length < 2 || args.length > 5)
            throw new IllegalArgumentException(
                    "res.setCookie() requires between 2 and 5 arguments");
        Response response = (Response) thisObj;
        String name = getStringArgument(args, 0, null);
        if (name == null)
            throw new IllegalArgumentException("cookie name must not be null");
        String value = getStringArgument(args, 1, null);
        int days = getIntArgument(args, 2, -1);
        String path = getStringArgument(args, 3, "/");
        String domain = getStringArgument(args, 4, null);
        response.setCookie(name, value, days, path, domain);
    }

    static String getStringArgument(Object[] args, int pos, String defaultValue) {
        if (pos >= args.length || args[pos] == null) 
            return defaultValue;
        if (!(args[pos] instanceof String))
            throw new IllegalArgumentException("Expected String as argument " + (pos + 1));
        return (String) args[pos];
    }

    static int getIntArgument(Object[] args, int pos, int defaultValue) {
        if (pos >= args.length || args[pos] == null)
            return defaultValue;
        if (!(args[pos] instanceof Number))
            throw new IllegalArgumentException("Expected Number as argument " + (pos + 1));
        return ((Number) args[pos]).intValue();
    }


    void setCookie(String name, String value, int days, String path, String domain) {
        Cookie cookie = new Cookie(name, value);
        // NOTE: If cookie version is set to 1, cookie values will be quoted.
        // c.setVersion(1);
        if (days > -1) {
            // Cookie time to live, days -> seconds
            cookie.setMaxAge(days * 60 * 60 * 24);
        }
        if (path != null) {
            cookie.setPath(path);
        } else {
            cookie.setPath("/");
        }
        if (domain != null) {
            cookie.setDomain(domain);
        }
        response.addCookie(cookie);
    }

    /**
     * Redirect the current request to another URL. Calling this method
     * causes the current request to terminate immediately by throwing an Error.
     * Care should be taken to clean up any resources before doing a redirect. 
     *
     * @param target the target URL
     */
    public void jsFunction_redirect(String target) {
        throw new RedirectException(target);
    }

    public ServletOutputStream getOutputStream() {
        try {
            return response.getOutputStream();
        } catch (IOException x) {
            throw new WrappedException(x);
        }
    }

    public HttpServletResponse getServletResponse() {
        return response;
    }

    public String getClassName() {
        return "Response";
    }
}

/**
 * Error class thrown to signal a HTTP redirect.
 */
class RedirectException extends Error {
    public RedirectException(String destination) {
        super(destination);
    }
}