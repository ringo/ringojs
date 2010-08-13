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

import org.eclipse.jetty.continuation.ContinuationSupport;
import org.mozilla.javascript.Context;
import org.ringojs.tools.RingoConfiguration;
import org.ringojs.tools.RingoRunner;
import org.ringojs.repository.Repository;
import org.ringojs.repository.FileRepository;
import org.ringojs.repository.WebappRepository;
import org.ringojs.engine.RhinoEngine;
import org.ringojs.util.StringUtils;
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
    JsgiRequest requestProto;
    boolean hasContinuation = false;

    public JsgiServlet() {}

    public JsgiServlet(RhinoEngine engine) throws ServletException {
        this(engine, null);
    }

    public JsgiServlet(RhinoEngine engine, Callable callable) throws ServletException {
        this.engine = engine;
        this.function = callable;
    }

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        // don't overwrite function if it was set in constructor
        if (function == null) {
            module = getStringParameter(config, "config", "config");
            function = getStringParameter(config, "app", "app");
        }

        if (engine == null) {
            String ringoHome = getStringParameter(config, "ringo-home", "/WEB-INF");
            String modulePath = getStringParameter(config, "module-path", "app");
            int optlevel = getIntParameter(config, "optlevel", 0);
            boolean debug = getBooleanParameter(config, "debug", false);
            boolean production = getBooleanParameter(config, "production", false);
            boolean verbose = getBooleanParameter(config, "verbose", false);
            boolean legacyMode = getBooleanParameter(config, "legacy-mode", false);

            Repository home = new WebappRepository(config.getServletContext(), ringoHome);
            try {
                if (!home.exists()) {
                    home = new FileRepository(ringoHome);
                    System.err.println("Resource \"" + ringoHome + "\" not found, "
                            + "reverting to file repository " + home);
                }
                // Use ',' as platform agnostic path separator
                String[] paths = StringUtils.split(modulePath, ",");
                RingoConfiguration ringoConfig = new RingoConfiguration(home, paths, "modules");
                ringoConfig.setDebug(debug);
                ringoConfig.setVerbose(verbose);
                ringoConfig.setParentProtoProperties(legacyMode);
                ringoConfig.setStrictVars(!legacyMode && !production);
                ringoConfig.setReloading(!production);
                ringoConfig.setOptLevel(optlevel);
                engine = new RhinoEngine(ringoConfig, null);
            } catch (Exception x) {
                throw new ServletException(x);
            }
        }

        Context cx = engine.getContextFactory().enterContext();
        try {
            requestProto = new JsgiRequest(cx, engine.getScope());
        } catch (NoSuchMethodException nsm) {
            throw new ServletException(nsm);
        } finally {
            Context.exit();
        }

        try {
            hasContinuation = ContinuationSupport.class != null;
        } catch (NoClassDefFoundError ignore) {
            hasContinuation = false;
        }
    }

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            if (hasContinuation && ContinuationSupport.getContinuation(request).isExpired()) {
                return; // continuation timeouts are handled by ringo/jsgi module
            }
        } catch (Exception ignore) {
            // continuation may not be set up even if class is availble - ignore
        }
        Context cx = engine.getContextFactory().enterContext();
        try {
            JsgiRequest req = new JsgiRequest(cx, request, response, requestProto, engine.getScope());
            engine.invoke("ringo/jsgi", "handleRequest", module, function, req);
        } catch (NoSuchMethodException x) {
            RingoRunner.reportError(x, System.err, false);
            throw new ServletException(x);
        } catch (Exception x) {
            RingoRunner.reportError(x, System.err, false);
            throw new ServletException(x);
        } finally {
            Context.exit();
        }
    }

    protected String getStringParameter(ServletConfig config, String name, String defaultValue) {
        String value = config.getInitParameter(name);
        return value == null ? defaultValue : value;
    }

    protected int getIntParameter(ServletConfig config, String name, int defaultValue) {
        String value = config.getInitParameter(name);
        if (value != null) {
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException nfx) {
                System.err.println("Invalid value for parameter \"" + name + "\": " + value);
            }
        }
        return defaultValue;
    }

    protected boolean getBooleanParameter(ServletConfig config, String name, boolean defaultValue) {
        String value = config.getInitParameter(name);
        if (value != null) {
            if ("true".equals(value) || "1".equals(value) || "on".equals(value)) {
                return true;
            }
            if ("false".equals(value) || "0".equals(value) || "off".equals(value)) {
                return false;
            }
            System.err.println("Invalid value for parameter \"" + name + "\": " + value);
        }
        return defaultValue;
    }
}
