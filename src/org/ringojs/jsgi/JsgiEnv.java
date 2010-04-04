/*
 *  Copyright 2009 Hannes Wallnoefer <hannes@helma.at>
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

package org.ringojs.jsgi;

import org.mozilla.javascript.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Enumeration;
import java.lang.reflect.Method;

public class JsgiEnv extends ScriptableObject {

    HttpServletRequest request;
    HttpServletResponse response;

    public JsgiEnv(Context cx, Scriptable scope) throws NoSuchMethodException {
        int flags = PERMANENT;
        defineProperty("REQUEST_METHOD", null, getMethod("getRequestMethod"), null, flags);
        defineProperty("SERVER_NAME", null, getMethod("getServerName"), null, flags);
        defineProperty("SERVER_PORT", null, getMethod("getServerPort"), null, flags);
        defineProperty("QUERY_STRING", null, getMethod("getQueryString"), null, flags);
        defineProperty("HTTP_VERSION", null, getMethod("getHttpVersion"), null, flags);
        defineProperty("REMOTE_HOST", null, getMethod("getRemoteHost"), null, flags);
        Scriptable version = cx.newArray(scope, new Object[] {Integer.valueOf(0), Integer.valueOf(1)});
        ScriptableObject.defineProperty(this, "jsgi.version", version, flags);
        ScriptableObject.defineProperty(this, "jsgi.multithread", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(this, "jsgi.multiprocess", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(this, "jsgi.run_once", Boolean.FALSE, flags);
        defineProperty("jsgi.url_scheme", null, getMethod("getUrlScheme"), null, flags);
        defineProperty("jsgi.servlet_request", null, getMethod("getServletRequest"), null, flags);
        defineProperty("jsgi.servlet_response", null, getMethod("getServletResponse"), null, flags);
        // JSGI spec and Jack's lint require env.constructor to be Object
        defineProperty("constructor", scope.get("Object", scope), DONTENUM);
        setPrototype(ScriptableObject.getObjectPrototype(scope));
        setParentScope(scope);
    }

    public JsgiEnv(HttpServletRequest request, HttpServletResponse response,
                   Scriptable prototype, Scriptable scope) {
        this.request = request;
        this.response = response;
        setPrototype(prototype);
        setParentScope(scope);
        for (Enumeration e = request.getHeaderNames(); e.hasMoreElements(); ) {
            String name = (String) e.nextElement();
            String value = request.getHeader(name);
            name = name.replace('-', '_').toUpperCase();
            if (!"CONTENT_LENGTH".equals(name) && !"CONTENT_TYPE".equals(name)) {
                name = "HTTP_" + name;
            }
            put(name, this, value);
        }
        put("SCRIPT_NAME", this, checkString(request.getContextPath() + request.getServletPath()));
        put("PATH_INFO", this, checkString(request.getPathInfo()));
        // JSGI spec and Jack's lint require env.constructor to be Object
        defineProperty("constructor", scope.get("Object", scope), DONTENUM);
    }

    public String getRequestMethod() {
        return checkString(request.getMethod());
    }

    public String getServerName() {
        return checkString(request.getServerName());
    }
    
    public String getServerPort() {
        return checkString(Integer.toString(request.getServerPort()));
    }

    public String getQueryString() {
        return checkString(request.getQueryString());
    }

    public String getHttpVersion() {
        return checkString(request.getProtocol());
    }

    public String getRemoteHost() {
        return checkString(request.getRemoteHost());
    }

    public String getUrlScheme() {
        return request.isSecure() ? "https" : "http";
    }

    public Object getServletRequest() {
        return Context.javaToJS(request, this);
    }

    public Object getServletResponse() {
        return Context.javaToJS(response, this);
    }

    private static Method getMethod(String name) throws NoSuchMethodException {
        return JsgiEnv.class.getDeclaredMethod(name);
    }

    private static String checkString(String str) {
        return str == null ? "" : str;
    }

    /**
     * Return the name of the class.
     */
    @Override
    public String getClassName() {
        return "JsgiEnv";
    }
}
