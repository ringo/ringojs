/*
 *  Copyright 2004 Hannes Wallnoefer <hannes@helma.at>
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

package org.helma.javascript;

import org.helma.repository.Repository;
import org.helma.repository.Resource;
import org.helma.repository.Trackable;
import org.mozilla.javascript.*;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * This class represents a JavaScript Resource.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class ReloadableScript {

    final Trackable source;
    final RhinoEngine engine;
    // the checksum of the underlying resource or repository when
    // the script was last compiled
    long checksum = -1;
    // true if module scope is shared
    boolean shared;
    // the compiled script
    Script script;
    // any exception that may have been thrown during compilation.
    // we keep this around in order to be able to rethrow without trying
    // to recompile if the underlying resource or repository hasn't changed
    Exception exception = null;
    // the loaded module scope is cached for shared modules
    ModuleScope moduleScope = null;


    /**
     * Construct a Script from the given script resource.
     *
     * @param source the JavaScript resource or repository containing the script.
     * @param engine the rhino engine
     */
    public ReloadableScript(Trackable source, RhinoEngine engine) {
        this.source = source;
        this.engine = engine;
    }

    /**
     * Get the actual compiled script.
     *
     * @param cx the current Context
     * @throws JavaScriptException if an error occurred compiling the script code
     * @throws IOException if an error occurred reading the script file
     * @return the compiled and up-to-date script
     */
    public synchronized Script getScript(Context cx)
            throws JavaScriptException, IOException {
        if (!isUpToDate()) {
            if (!source.exists()) {
                throw new FileNotFoundException(source + " not found or not readable");
            }
            if (source instanceof Repository) {
                script = getComposedScript(cx);
            } else {
                script = getSimpleScript(cx);
            }
        }
        if (exception != null) {
            throw exception instanceof WrappedException ?
                (WrappedException) exception : new WrappedException(exception);
        }
        return script;
    }

    /**
     * Get a script from a single script file.
     * @param cx the current Context
     * @throws JavaScriptException if an error occurred compiling the script code
     * @throws IOException if an error occurred reading the script file
     * @return the compiled and up-to-date script
     */
    protected synchronized Script getSimpleScript(Context cx)
            throws JavaScriptException, IOException {
        Resource resource = (Resource) source;
        try {
            exception = null;
            script = cx.compileReader(resource.getReader(), resource.getPath(), 1, null);
        } catch (Exception x) {
            exception = x;
        } finally {
            checksum = resource.getChecksum();
        }
        return script;
    }

    /**
     * Get the a script composed out of multiple scripts. This is a bit of a hack
     * we have in order to support helma 1 like one-directory-per-prototype like
     * compilation mode.
     *
     * @param cx the current Context
     * @throws JavaScriptException if an error occurred compiling the script code
     * @throws IOException if an error occurred reading the script file
     * @return the compiled and up-to-date script
     */
    protected synchronized Script getComposedScript(Context cx)
            throws JavaScriptException, IOException {
        Repository repository = (Repository) source;
        List<Resource> resources = repository.getResources(false);
        final List<Script> scripts = new ArrayList<Script>();
        try {
            exception = null;
            for (Resource res: resources) {
                if (res.getName().endsWith(".js")) {
                    scripts.add(cx.compileReader(res.getReader(), res.getPath(), 1, null));
                }
           }
        } catch (Exception x) {
            exception = x;
        } finally {
            checksum = repository.getChecksum();
        }
        script =  new Script() {
            public Object exec(Context cx, Scriptable scope) {
                for (Script script: scripts) {
                    script.exec(cx, scope);
                }
                return null;
            }
        };
        return script;
    }


    /**
     * Evaluate the script on a module scope and return the result
     *
     * @param scope the scope to evaluate the script on
     * @param cx the rhino context
     * @return the result of the evaluation
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    public Object evaluate(Scriptable scope, Context cx)
            throws JavaScriptException, IOException {
        Script script = getScript(cx);
        Map<Trackable,Scriptable> modules = (Map<Trackable,Scriptable>) cx.getThreadLocal("modules");
        if (scope instanceof ModuleScope) {
            moduleScope = (ModuleScope) scope;
            modules.put(source, scope);
        }
        return script.exec(cx, scope);
    }

    /**
     * Get a module scope loaded with this script
     *
     * @param prototype the parent scope for the module
     * @param moduleName the module name
     * @param cx the rhino context
     * @return a new module scope
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    protected synchronized Scriptable load(Scriptable prototype, String moduleName, Context cx)
            throws JavaScriptException, IOException {
        // check if we already came across the module in the current context/request
        Map<Trackable,Scriptable> modules = (Map<Trackable,Scriptable>) cx.getThreadLocal("modules");
        if (modules.containsKey(source)) {
            return modules.get(source);
        }
        Script script = getScript(cx);
        ModuleScope module = moduleScope;
        if (module != null) {
            // Reuse cached scope for shared modules.
            // If any shared module has been updated, the force_reload flag is set
            // in the context. This is necessary to catch changes in shared modules
            // loaded by other shared modules.
            boolean forceReload = cx.getThreadLocal("force_reload") == Boolean.TRUE;
            if (module.getChecksum() == checksum && !forceReload) {
                modules.put(source, module);
                return module;
            }
            module.delete("__shared__");
        } else {
            module = new ModuleScope(moduleName, source, prototype);
        }
        modules.put(source, module);
        script.exec(cx, module);
        module.setChecksum(checksum);
        shared = module.get("__shared__", module) == Boolean.TRUE;
        moduleScope = shared ? module : null;
        return module;
    }

    /**
     * Return true if this represents a module shared among all threads/contexts
     * @return true of this script represents a shared module
     */
    public boolean isShared() {
        return shared;
    }

    /**
     * Checks if the main file or any of the files it includes were updated 
     * since the script was last parsed and evaluated.
     * @return true if none of the included files has been updated since
     * we last checked.
     */
    protected boolean isUpToDate() {
        return source.getChecksum() == checksum;
    }

}


