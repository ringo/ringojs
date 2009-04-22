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

package org.helma.jack;

import org.mozilla.javascript.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Enumeration;
import java.lang.reflect.Method;

public class JackEnv extends ScriptableObject {

    HttpServletRequest request;
    HttpServletResponse response;

    public JackEnv() {}

    public JackEnv(Object req, Object res) {
        if (!(req instanceof HttpServletRequest)) {
            throw new IllegalArgumentException("Wrong argument: " + req);
        } else if (!(res instanceof HttpServletResponse)) {
            throw new IllegalArgumentException("Wrong argument: " + res);
        }
        this.request = (HttpServletRequest) req;
        this.response = (HttpServletResponse) res;
        for (Enumeration e = request.getHeaderNames(); e.hasMoreElements(); ) {
            String name = (String) e.nextElement();
            String value = request.getHeader(name);
            name = name.replace('-', '_').toUpperCase();
            if (!"CONTENT_LENGTH".equals(value) && !"CONTENT_TYPE".equals(value)) {
                name = "HTTP_" + name;
            }
            put(name, this, value);
        }
    }


    public String getScriptName() {
        return checkString(request.getServletPath());
    }

    public String getPathInfo() {
        return checkString(request.getPathInfo());
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

    public static void finishInit(Scriptable scope, FunctionObject constructor, Scriptable prototype)
            throws NoSuchMethodException {
        int flags = PERMANENT;
        Context cx = Context.getCurrentContext();
        ScriptableObject proto = (ScriptableObject) prototype;
        proto.defineProperty("SCRIPT_NAME", null, getMethod("getScriptName"), null, flags);
        proto.defineProperty("PATH_INFO", null, getMethod("getPathInfo"), null, flags);
        proto.defineProperty("REQUEST_METHOD", null, getMethod("getRequestMethod"), null, flags);
        proto.defineProperty("SERVER_NAME", null, getMethod("getServerName"), null, flags);
        proto.defineProperty("SERVER_PORT", null, getMethod("getServerPort"), null, flags);
        proto.defineProperty("QUERY_STRING", null, getMethod("getQueryString"), null, flags);
        proto.defineProperty("HTTP_VERSION", null, getMethod("getHttpVersion"), null, flags);
        proto.defineProperty("REMOTE_HOST", null, getMethod("getRemoteHost"), null, flags);
        Scriptable version = cx.newArray(scope, new Object[] {Integer.valueOf(0), Integer.valueOf(1)});
        ScriptableObject.defineProperty(proto, "jack.version", version, flags);
        ScriptableObject.defineProperty(proto, "jack.multithread", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(proto, "jack.multiprocess", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(proto, "jack.run_once", Boolean.FALSE, flags);
        proto.defineProperty("jack.url_scheme", null, getMethod("getUrlScheme"), null, flags);
        proto.defineProperty("jack.servlet_request", null, getMethod("getServletRequest"), null, flags);
        proto.defineProperty("jack.servlet_response", null, getMethod("getServletResponse"), null, flags);
    }

    private static Method getMethod(String name) throws NoSuchMethodException {
        return JackEnv.class.getDeclaredMethod(name);
    }

    private static String checkString(String str) {
        return str == null ? "" : str;
    }

    /**
     * Return the name of the class.
     */
    @Override
    public String getClassName() {
        return "JackEnv";
    }
}
