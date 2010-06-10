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

public class JsgiRequest extends ScriptableObject {

    Scriptable jsgiObject;
    HttpServletRequest request;
    HttpServletResponse response;
    int readonly = PERMANENT | READONLY;
    Object httpVersion;

    /**
     * Prototype constructor
     */
    public JsgiRequest(Context cx, Scriptable scope) throws NoSuchMethodException {
        setParentScope(scope);
        setPrototype(ScriptableObject.getObjectPrototype(scope));
        defineProperty("host", null, getMethod("getServerName"), null, readonly);
        defineProperty("port", null, getMethod("getServerPort"), null, readonly);
        defineProperty("queryString", null, getMethod("getQueryString"), null, readonly);
        defineProperty("version", null, getMethod("getHttpVersion"), null, readonly);
        defineProperty("remoteAddress", null, getMethod("getRemoteHost"), null, readonly);
        defineProperty("scheme", null, getMethod("getUrlScheme"), null, readonly);
        // JSGI spec and Jack's lint require env.constructor to be Object
        defineProperty("constructor", ScriptableObject.getProperty(scope, "Object"), DONTENUM);
        Scriptable jsgi = jsgiObject = cx.newObject(scope);
        Scriptable version = cx.newArray(scope, new Object[] {Integer.valueOf(0), Integer.valueOf(3)});
        ScriptableObject.defineProperty(jsgi, "version", version, readonly);
        ScriptableObject.defineProperty(jsgi, "multithread", Boolean.TRUE, readonly);
        ScriptableObject.defineProperty(jsgi, "multiprocess", Boolean.FALSE, readonly);
        ScriptableObject.defineProperty(jsgi, "async", Boolean.TRUE, readonly);
        ScriptableObject.defineProperty(jsgi, "runOnce", Boolean.FALSE, readonly);
        ScriptableObject.defineProperty(jsgi, "cgi", Boolean.FALSE, readonly);
    }

    /**
     * Instance constructor
     */
    public JsgiRequest(Context cx, HttpServletRequest request, HttpServletResponse response,
                   JsgiRequest prototype, Scriptable scope) {
        this.request = request;
        this.response = response;
        setPrototype(prototype);
        setParentScope(scope);
        Scriptable jsgi = cx.newObject(scope);
        jsgi.setPrototype(prototype.jsgiObject);
        ScriptableObject.defineProperty(this, "jsgi", jsgi, PERMANENT);
        Scriptable headers = cx.newObject(scope);
        ScriptableObject.defineProperty(this, "headers", headers, PERMANENT);
        for (Enumeration e = request.getHeaderNames(); e.hasMoreElements(); ) {
            String name = (String) e.nextElement();
            String value = request.getHeader(name);
            name = name.toLowerCase();
            headers.put(name, headers, value);
        }
        put("scriptName", this, checkString(request.getContextPath() + request.getServletPath()));
        put("pathInfo", this, checkString(request.getPathInfo()));
        put("method", this, checkString(request.getMethod()));
        Scriptable env = cx.newObject(scope);
        ScriptableObject.defineProperty(this, "env", env, PERMANENT);
        ScriptableObject.defineProperty(env, "servletRequest", Context.javaToJS(request, this), PERMANENT);
        ScriptableObject.defineProperty(env, "servletResponse", Context.javaToJS(response, this), PERMANENT);
        // JSGI spec and Jack's lint require env.constructor to be Object
        defineProperty("constructor", scope.get("Object", scope), DONTENUM);
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

    public Object getHttpVersion() {
        if (httpVersion == null) {
            Context cx = Context.getCurrentContext();
            Scriptable scope = getParentScope();
            String protocol = request.getProtocol();
            if (protocol != null) {
                int major = protocol.indexOf('/');
                int minor = protocol.indexOf('.');
                if (major > -1 && minor > major) {
                    major = Integer.parseInt(protocol.substring(major + 1, minor));
                    minor = Integer.parseInt(protocol.substring(minor + 1));
                    httpVersion =  cx.newArray(scope, new Object[] {
                            Integer.valueOf(major), Integer.valueOf(minor)});
                }
            }
            if (httpVersion == null) {
                cx.newArray(scope, new Object[0]);
            }
        }
        return httpVersion;
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
        return JsgiRequest.class.getDeclaredMethod(name);
    }

    private static String checkString(String str) {
        return str == null ? "" : str;
    }

    /**
     * Return the name of the class.
     */
    @Override
    public String getClassName() {
        return "JsgiRequest";
    }
}
