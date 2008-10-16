/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 2005 Hannes Wallnoefer. All Rights Reserved.
 */
package org.helma.javascript;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.ErrorReporter;
import org.mozilla.javascript.Scriptable;
import org.helma.repository.Trackable;
import org.helma.tools.HelmaConfiguration;

import java.util.HashMap;

public class HelmaContextFactory extends ContextFactory {

    RhinoEngine engine;

    int languageVersion = Context.VERSION_1_8;
    boolean strictMode = false;
    boolean warningAsError = false;
    int optimizationLevel = 0;
    boolean generatingDebug = true;
    ErrorReporter errorReporter;


    public HelmaContextFactory(RhinoEngine engine, HelmaConfiguration config) {
        this.engine = engine;
        optimizationLevel = config.getOptLevel();
        languageVersion = config.getLanguageVersion();
    }

    protected boolean hasFeature(Context cx, int featureIndex) {
        switch (featureIndex) {
          case Context.FEATURE_STRICT_VARS:
          case Context.FEATURE_STRICT_EVAL:
          case Context.FEATURE_STRICT_MODE:
            return strictMode;

          case Context.FEATURE_RESERVED_KEYWORD_AS_IDENTIFIER:
            return true;

          case Context.FEATURE_WARNING_AS_ERROR:
            return warningAsError;
        }

        return super.hasFeature(cx, featureIndex);
    }

    protected void onContextCreated(Context cx) {
        super.onContextCreated(cx);
        cx.putThreadLocal("engine", engine);
        cx.putThreadLocal("modules", new HashMap<Trackable, Scriptable>());
        cx.setApplicationClassLoader(engine.loader);
        cx.setWrapFactory(engine.wrapFactory);
        cx.setLanguageVersion(languageVersion);
        cx.setOptimizationLevel(optimizationLevel);
        if (errorReporter != null) {
            cx.setErrorReporter(errorReporter);
        }
        cx.setGeneratingDebug(generatingDebug);
    }

    protected void onContextReleased(Context cx) {
        super.onContextReleased(cx);
        cx.removeThreadLocal("engine");
        cx.removeThreadLocal("modules");
        cx.removeThreadLocal("threadscope");
    }

    public void setStrictMode(boolean flag)
    {
        checkNotSealed();
        this.strictMode = flag;
    }

    public void setWarningAsError(boolean flag)
    {
        checkNotSealed();
        this.warningAsError = flag;
    }

    public void setLanguageVersion(int version)
    {
        Context.checkLanguageVersion(version);
        checkNotSealed();
        this.languageVersion = version;
    }

    public void setOptimizationLevel(int optimizationLevel)
    {
        Context.checkOptimizationLevel(optimizationLevel);
        checkNotSealed();
        this.optimizationLevel = optimizationLevel;
    }

    public void setErrorReporter(ErrorReporter errorReporter)
    {
        if (errorReporter == null) throw new IllegalArgumentException();
        this.errorReporter = errorReporter;
    }

    public void setGeneratingDebug(boolean generatingDebug)
    {
        this.generatingDebug = generatingDebug;
    }

}
