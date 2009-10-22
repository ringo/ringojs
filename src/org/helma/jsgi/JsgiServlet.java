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

package org.helma.jsgi;

import org.helma.tools.HelmaConfiguration;
import org.helma.tools.HelmaRunner;
import org.helma.repository.Repository;
import org.helma.repository.FileRepository;
import org.helma.repository.WebappRepository;
import org.helma.engine.RhinoEngine;
import org.helma.util.StringUtils;
import org.mozilla.javascript.Callable;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import java.io.IOException;
import java.io.File;

public class JsgiServlet extends HttpServlet {

    String module;
    Object function;
    RhinoEngine engine;

    public JsgiServlet() {}

    public JsgiServlet(RhinoEngine engine) throws ServletException {
        this(engine, null);
    }

    public JsgiServlet(RhinoEngine engine, Callable callable) throws ServletException {
        this.engine = engine;
        this.function = callable;
        try {
            engine.defineHostClass(JsgiEnv.class);
        } catch (Exception x) {
            throw new ServletException(x);
        }
    }

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        // don't overwrite function if it was set in constructor
        if (function == null) {
            module = getInitParam(config, "moduleName", "helma/webapp");
            function = getInitParam(config, "functionName", "handleRequest");
        }

        if (engine == null) {
            String helmaHome = getInitParam(config, "helmaHome", "WEB-INF");
            String modulePath = getInitParam(config, "modulePath", "app");

            Repository home = new WebappRepository(config.getServletContext(), helmaHome);
            try {
                if (!home.exists()) {
                    home = new FileRepository(helmaHome);
                }
                String[] paths = StringUtils.split(modulePath, File.pathSeparator);
                HelmaConfiguration helmaConfig = new HelmaConfiguration(home, paths, "modules");
                helmaConfig.setHostClasses(new Class[] { JsgiEnv.class });
                engine = new RhinoEngine(helmaConfig, null);
            } catch (Exception x) {
                throw new ServletException(x);
            }
        }
    }

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            JsgiEnv env = new JsgiEnv(request, response);
            engine.invoke("helma/jsgi", "handleRequest", module, function, env);
        } catch (NoSuchMethodException x) {
            throw new ServletException(x);
        } catch (Exception x) {
            HelmaRunner.reportError(x, System.err, false);
            throw(new ServletException(x));
        }
    }

    private String getInitParam(ServletConfig config, String name, String defaultValue) {
        String value = config.getInitParameter(name);
        return value == null ? defaultValue : value;
    }

}
