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

import org.mozilla.javascript.ScriptableObject;

import javax.servlet.http.HttpServletRequest;
import java.util.Enumeration;

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

    public String jsGet_SCRIPT_NAME() {
        return req.getServletPath();
    }

    public String jsGet_PATH_INFO() {
        return req.getPathInfo();
    }

    public String jsGet_REQUEST_METHOD() {
        return req.getMethod();
    }

    public String jsGet_SERVER_NAME() {
        return req.getServerName();
    }
    
    public String jsGet_SERVER_PORT() {
        return Integer.toString(req.getServerPort());
    }

    public String jsGet_QUERY_STRING() {
        return req.getQueryString();
    }

    public String jsGet_HTTP_VERSION() {
        return req.getProtocol();
    }

    public String jsGet_REMOTE_HOST() {
        return req.getRemoteHost();
    }

    /**
     * Return the name of the class.
     */
    public String getClassName() {
        return "JackEnv";
    }
}
