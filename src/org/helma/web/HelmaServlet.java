/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.invoker.org/download/invoker/license.txt
 *
 * Copyright 2005 Hannes Wallnoefer. All Rights Reserved.
 */

package org.helma.web;

import org.helma.javascript.RhinoEngine;
import org.helma.template.MacroTag;
import org.helma.tools.HelmaConfiguration;
import org.helma.util.StringUtils;
import org.helma.repository.FileRepository;
import org.helma.repository.Repository;
import org.helma.repository.WebappRepository;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.FileNotFoundException;

/**
 * Helma servlet class used to access helma from a web server.
 */
public class HelmaServlet extends HttpServlet {

    protected RhinoEngine engine;
    private String module, function;

    static protected Class[] defaultHostClasses =
        new Class[] {
            Request.class,
            Response.class,
            Session.class,
            MacroTag.class
        };

    private static final long serialVersionUID = 9078627193637127187L;

    /**
     * Zero argument constructor used by servlet config.
     */
    public HelmaServlet() {}

    /**
     * Build a servlet around an already existing rhino engine.
     * This is used when starting the server from a script or shell.
     * @param engine a rhino engine
     */
    public HelmaServlet(RhinoEngine engine) {
        this.engine = engine;
    }

    public void init(ServletConfig config) throws ServletException {
        module = getInitParam(config, "module", "app");
        function = getInitParam(config, "function", "handler");

        if (engine == null) {
            try {
                String classNames = config.getInitParameter("hostClasses");
                Class[] classes = defaultHostClasses;
                if (classNames != null) {
                    Class[] custom = StringUtils.toClassArray(classNames, ", ");
                    Class[] copy = new Class[classes.length + custom.length];
                    System.arraycopy(classes, 0, copy, 0, classes.length);
                    System.arraycopy(custom, 0, copy, classes.length, custom.length);
                    classes = copy;
                }
                String helmaHome = getInitParam(config, "home", "WEB-INF");
                String modulePath = getInitParam(config, "modulePath", "modules");
                Repository home = new WebappRepository(config.getServletContext(), helmaHome);
                if (!home.exists()) {
                    home = new FileRepository(helmaHome);
                }
                HelmaConfiguration helmaConfig =
                        new HelmaConfiguration(home, modulePath, "modules");
                helmaConfig.setHostClasses(classes);
                engine = new RhinoEngine(helmaConfig, null);
            } catch (ClassNotFoundException x) {
                throw new ServletException(x);
            } catch (FileNotFoundException x) {
                throw new ServletException(x);
            }
        }
    }

    protected void service(final HttpServletRequest req,
                           final HttpServletResponse res)
            throws ServletException, IOException {
        try {
            engine.invoke(module, function, new Request(req), new Response(res));
        } catch (RedirectException redir) {
            res.sendRedirect(redir.getMessage());
        } catch (NoSuchMethodException x) {
            throw new ServletException("Method not found", x);
        }
    }

    private String getInitParam(ServletConfig config, String name, String defaultValue) {
        String value = config.getInitParameter(name);
        return value == null ? defaultValue : value;
    }
    
}
