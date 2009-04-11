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
import java.util.Enumeration;
import java.io.IOException;
import java.lang.reflect.Method;

public class JackEnv extends ScriptableObject {

    HttpServletRequest req;

    public JackEnv() {}

    public JackEnv(Object obj) {
        if (!(obj instanceof HttpServletRequest)) {
            throw new IllegalArgumentException("Wrong argument: " + obj);
        }
        req = (HttpServletRequest) obj;
        for (Enumeration e = req.getHeaderNames(); e.hasMoreElements(); ) {
            String name = (String) e.nextElement();
            String value = req.getHeader(name);
            name = name.replace('-', '_').toUpperCase();
            if (!"CONTENT_LENGTH".equals(value) && !"CONTENT_TYPE".equals(value)) {
                name = "HTTP_" + name;
            }
            put(name, this, value);
        }
    }


    public String getScriptName() {
        return req.getServletPath();
    }

    public String getPathInfo() {
        return req.getPathInfo();
    }

    public String getRequestMethod() {
        return req.getMethod();
    }

    public String getServerName() {
        return req.getServerName();
    }
    
    public String getServerPort() {
        return Integer.toString(req.getServerPort());
    }

    public String getQueryString() {
        return req.getQueryString();
    }

    public String getHttpVersion() {
        return req.getProtocol();
    }

    public String getRemoteHost() {
        return req.getRemoteHost();
    }

    public String getUrlScheme() {
        return req.isSecure() ? "https" : "http";
    }

    public Object getInputStream() {
        try {
            return req.getInputStream();
        } catch (IOException iox) {
            return Undefined.instance;
        }
    }

    public Object getErrorStream() {
        return System.err;
    }

    public static void finishInit(Scriptable scope, FunctionObject constructor, Scriptable prototype)
            throws NoSuchMethodException {
        int flags = READONLY | PERMANENT;
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
        proto.defineProperty("jack.input", null, getMethod("getInputStream"), null, flags);
        proto.defineProperty("jack.error", null, getMethod("getErrorStream"), null, flags);
        Scriptable version = cx.newArray(scope, new Object[] {new Integer(0), new Integer(1)});
        ScriptableObject.defineProperty(proto, "jack.version", version, flags);
        ScriptableObject.defineProperty(proto, "jack.multithread", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(proto, "jack.multiprocess", Boolean.TRUE, flags);
        ScriptableObject.defineProperty(proto, "jack.run_once", Boolean.FALSE, flags);
        proto.defineProperty("jack.url_scheme", null, getMethod("getUrlScheme"), null, flags);
    }

    private static Method getMethod(String name) throws NoSuchMethodException {
        return JackEnv.class.getDeclaredMethod(name);
    }

    @Override
    public Object get(String name, Scriptable start) {
        // FIXME: implement IO wrappers
        if ("jack.input".equals(name)) {
            try {
                return Context.toObject(req.getInputStream(), this);
            } catch (IOException iox) {
                return Undefined.instance;
            }
        } else if ("jack.error".equals(name)) {
            return Context.toObject(System.err, this);
        }
        return super.get(name, start);
    }

    /**
     * Return the name of the class.
     */
    @Override
    public String getClassName() {
        return "JackEnv";
    }
}
