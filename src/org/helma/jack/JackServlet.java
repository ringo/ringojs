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

import org.helma.tools.HelmaConfiguration;
import org.helma.repository.Repository;
import org.helma.repository.FileRepository;
import org.helma.repository.WebappRepository;
import org.helma.javascript.RhinoEngine;
import org.mozilla.javascript.Callable;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import java.io.FileNotFoundException;
import java.io.IOException;

public class JackServlet extends HttpServlet {

    String module, function;
    RhinoEngine engine;
    Callable callable;

    public JackServlet() {}

    public JackServlet(RhinoEngine engine) throws ServletException {
        this(engine, null);
    }

    public JackServlet(RhinoEngine engine, Callable callable) throws ServletException {
        this.engine = engine;
        this.callable = callable;
        try {
            engine.defineHostClass(JackEnv.class);
        } catch (Exception x) {
            throw new ServletException(x);
        }
    }

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        module = getInitParam(config, "moduleName", "app");
        function = getInitParam(config, "functionName", "handler");

        if (engine == null) {
            String helmaHome = getInitParam(config, "helmaHome", "WEB-INF");
            String modulePath = getInitParam(config, "modulePath", "modules");

            Repository home = new WebappRepository(config.getServletContext(), helmaHome);
            if (!home.exists()) {
                home = new FileRepository(helmaHome);
            }
            try {
                HelmaConfiguration helmaConfig = new HelmaConfiguration(home, modulePath, "modules");
                helmaConfig.setHostClasses(new Class[] { JackEnv.class });
                engine = new RhinoEngine(helmaConfig, null);
            } catch (FileNotFoundException x) {
                throw new ServletException(x);
            }
        }
    }

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            JackEnv env = new JackEnv(request, response);
            engine.invoke("helma/httpserver", "initRequest", env);
            Object result = callable == null ?
                    engine.invoke(module, function, env) :
                    engine.invoke(callable, env);
            engine.invoke("helma/httpserver", "commitResponse", env, result);
        } catch (NoSuchMethodException x) {
            throw new ServletException("Method not found", x);
        }
    }

    private String getInitParam(ServletConfig config, String name, String defaultValue) {
        String value = config.getInitParameter(name);
        return value == null ? defaultValue : value;
    }

}
