/*
 *  Copyright 2006 Hannes Wallnoefer <hannes@helma.at>
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

import org.helma.util.ScriptableMap;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Wrapper;
import org.mozilla.javascript.Scriptable;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

/**
 * This class represents a HTTP session instance. The implementation
 * is compatible to the Helma 1.* session object, but based on top
 * of the Servlet container's session support.
 *
 * @rhinoclass Session
 * @desc A scriptable HTTP user session
 */
public class Session extends ScriptableObject {

    HttpServletRequest request;
    private static final long serialVersionUID = 6101876387501354846L;

    public Session() {
        super();
    }

    public Session(Object req) {
        if (req instanceof Wrapper) {
            req = ((Wrapper) req).unwrap();
        }
        if (req instanceof HttpServletRequest) {
            this.request = (HttpServletRequest) req;
        } else {
            throw new IllegalArgumentException("Expected HttpServletRequest, got " + req);
        }
    }

    protected Session(HttpServletRequest request, Scriptable scope) {
        this.request = request;
        setParentScope(scope);
        setPrototype(getClassPrototype(scope, getClassName()));
    }

    /**
     * The id of the current user session.
     * @return the id of the session.
     */
    public String jsGet_id() {
        return getSession().getId();
    }

    /**
     * A generic JavaScript object associated with the current session.
     * @return A JavaScript Object associated with the session
     */
    public Object jsGet_data() {
        return new ScriptableMap(getParentScope(), getData());
    }

    /**
     * Invalidates the current user session.
     */
    public void jsFunction_invalidate() {
        getSession().invalidate();
    }

    /**
     * true if the client does not yet know about the session or
     * if the client chooses not to join the session.
     * @return true if the server has created a session,
     *         but the client has not yet joined
     */
    public boolean jsFunction_isNew() {
        return getSession().isNew();
    }

    public Map getData() {
        HttpSession session = getSession();
        Map data = (Map) session.getAttribute("helma");
        if (data == null) {
            data = new HashMap();
            session.setAttribute("helma", data);
        }
        return data;
    }

    protected HttpSession getSession() {
        return request.getSession();
    }

    public String getClassName() {
        return "Session";
    }
}
