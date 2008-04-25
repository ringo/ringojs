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

import org.helma.util.StringUtils;
import org.helma.javascript.RhinoEngine;
import org.helma.tools.HelmaConfiguration;
import org.helma.template.MacroTag;
import org.mozilla.javascript.WrappedException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;
import javax.servlet.ServletConfig;
import java.io.IOException;
import java.util.concurrent.*;

/**
 * Helma servlet class used to access helma from a web server.
 */
public class HelmaServlet extends HttpServlet {

    protected RhinoEngine engine;

    private ExecutorService pool;

    static protected Class[] defaultHostClasses =
        new Class[] {
            ScriptableRequest.class,
            ScriptableResponse.class,
            ScriptableSession.class,
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
        pool = Executors.newFixedThreadPool(8);
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
                HelmaConfiguration helmaconf = new HelmaConfiguration(
                        config.getInitParameter("helmaHome"),
                        config.getInitParameter("helmaModulePath"));
                helmaconf.setHostClasses(classes);
                engine = helmaconf.createEngine();
            } catch (Exception x) {
                throw new ServletException(x);
            }
        }
    }

    protected void service(final HttpServletRequest req,
                           final HttpServletResponse res)
            throws ServletException, IOException {
        Future<Status> future = pool.submit(new Callable<Status>() {
            public Status call() {
                Object[] args = {
                    new ScriptableRequest(req),
                    new ScriptableResponse(res),
                    new ScriptableSession(req)
                };
                Status status = new Status();
                try {
                    engine.invoke(null, "main", "handleRequest", args);
                } catch (RedirectException redir) {
                    status.redirect = redir.getMessage();
                } catch (WrappedException wx) {
                    status.exception = wx.getWrappedException();
                } catch (Exception x) {
                    status.exception = x;
                }
                return status;
            }
        });
        try {
            Status status = future.get(5, TimeUnit.SECONDS);
            if (status.redirect != null) {
                res.sendRedirect(status.redirect);
            } else if (status.exception != null) {
                throw new ServletException(status.exception);
            }
        } catch (InterruptedException x) {
            throw new ServletException("Interrupted", x);
        } catch (ExecutionException x) {
            throw new ServletException("Execution Error", x);
        } catch (TimeoutException x) {
            throw new ServletException("Request timed out", x);
        }
    }

    class Status {
        volatile Throwable exception;
        volatile String redirect;
    }
    
}
