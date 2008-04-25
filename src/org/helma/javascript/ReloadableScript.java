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

import org.mozilla.javascript.*;
import org.helma.repository.Resource;

import java.io.*;

/**
 * This class represents a JavaScript Resource.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class ReloadableScript {

    Resource resource;
    RhinoEngine engine;
    long timestamp;
    Script script;
    Exception exception = null;
    // the loaded module scope is cached for shared modules
    ModuleScope moduleScope = null;
    // script type - one of UNKNOW, ORDINARY, JSADAPTER
    short scriptType = UNKNOWN;

    final static short UNKNOWN = 0,
                     ORDINARY = 0,
                     JSADAPTER = 2;

    /**
     * Construct a Script from the given script resource.
     *
     * @param resource the JavaScript resource to be applied to this prototype.
     * @param engine the rhino engine
     */
    public ReloadableScript(Resource resource, RhinoEngine engine) {
        this.resource = resource;
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
            if (!resource.exists()) {
                throw new FileNotFoundException(resource + " not found or not readable");
            }
            try {
                exception = null;
                script = cx.compileReader(resource.getReader(), resource.getName(), 1, null);
            } catch (Exception x) {
                exception = x;
            } finally {
                scriptType = UNKNOWN;
                timestamp = resource.lastModified();
            }
        }

        if (exception != null) {
            throw exception instanceof WrappedException ?
                (WrappedException) exception : new WrappedException(exception);
        }

        return script;
    }

    /**
     * Evaluate the script on a module scope and return the result
     *
     * @param parentScope the parent scope for the module
     * @param cx the rhino context
     * @return the result of the evaluation
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    public Object evaluate(Scriptable parentScope, Context cx)
            throws JavaScriptException, IOException {
        ModuleScope scope = new ModuleScope(resource, null, parentScope);
        Script script = getScript(cx);
        return script.exec(cx, scope);
    }

    /**
     * Get a module scope loaded with this script
     *
     * @param parentScope the parent scope for the module
     * @param loadingScope the scope requesting the module to be loaded
     * @param cx the rhino context
     * @return a new module scope
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    public synchronized Scriptable load(Scriptable parentScope, Scriptable loadingScope, Context cx)
            throws JavaScriptException, IOException {
        ModuleScope owner = null;
        if (loadingScope instanceof ModuleScope)
            owner = (ModuleScope) loadingScope;
        Script script = getScript(cx);
        ModuleScope scope = moduleScope;
        // FIXME: caching of shared modules causes code updates to
        // go unnoticed for indirectly loaded modules!
        if (scope != null) {
            // use cached scope unless script has been reloaded
            if (scriptType != UNKNOWN) {
                return scope;
            }
        } else {
            scope = new ModuleScope(resource, owner, parentScope);
        }
        script.exec(cx, scope);
        // find out if this is a JSAdapter type scope
        if (scriptType == UNKNOWN) {
            scriptType = scope.has("__get__", scope) ||
                         scope.has("__has__", scope) ||
                         scope.has("__put__", scope) ||
                         scope.has("__delete__", scope) ||
                         scope.has("__getIds__", scope) ? JSADAPTER : ORDINARY;
        }
        scope.setHasAdapterFunctions(scriptType == JSADAPTER);
        if (scope.get("__shared__", scope) == Boolean.TRUE) {
            moduleScope = scope;
        }
        return scope;
    }

    /**
     * Get the resource of the script.
     * @return the script resource
     */
    public Resource getResource() {
        return resource;
    }

    /**
     * Checks if the main file or any of the files it includes were updated 
     * since the script was last parsed and evaluated.
     * @return true if none of the included files has been updated since
     * we last checked.
     */
    protected boolean isUpToDate() {
        return resource.exists() && resource.lastModified() == timestamp;
    }

}

