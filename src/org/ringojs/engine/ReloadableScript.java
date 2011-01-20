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

package org.ringojs.engine;

import org.ringojs.repository.Resource;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.ToolErrorReporter;

import java.io.IOException;
import java.io.Reader;
import java.lang.ref.ReferenceQueue;
import java.lang.ref.SoftReference;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.util.*;
import java.security.CodeSource;
import java.security.CodeSigner;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * This class represents a JavaScript Resource.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class ReloadableScript {

    final Resource resource;
    final RhinoEngine engine;
    final String moduleName;
    // true if we should reload modified source files
    boolean reloading;
    // the checksum of the underlying resource or repository when
    // the script was last compiled
    long checksum = -1;
    // true if module scope is shared
    Shared shared = Shared.UNKNOWN;
    // the compiled script
    ScriptReference scriptref;
    // any exception that may have been thrown during compilation.
    // we keep this around in order to be able to rethrow without trying
    // to recompile if the underlying resource or repository hasn't changed
    Exception exception = null;
    List<SyntaxError> errors;
    // the loaded module scope is cached for shared modules
    ModuleScope moduleScope = null;
    // Set of direct module dependencies
    HashSet<ReloadableScript> dependencies = new HashSet<ReloadableScript>();
    // the static script cache
    static ScriptCache cache = new ScriptCache();

    private enum Shared {
        UNKNOWN, FALSE, TRUE
    }

    private static Logger log = Logger.getLogger("org.ringojs.engine.ReloadableScript");

    /**
     * Construct a Script from the given script resource.
     *
     * @param source the JavaScript resource or repository containing the script.
     * @param engine the rhino engine
     */
    public ReloadableScript(Resource source, RhinoEngine engine) {
        this.resource = source;
        this.engine = engine;
        reloading = engine.getConfig().isReloading();
        moduleName = source.getModuleName();
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
        // only use shared code cache if optlevel >= 0
        int optlevel = cx.getOptimizationLevel();
        if (scriptref == null && optlevel > -1) {
            scriptref = cache.get(resource);
        }
        Script script = null;
        if (scriptref != null) {
            script = scriptref.get();
            checksum = scriptref.checksum;
            errors = scriptref.errors;
            exception = scriptref.exception;
        }
        // recompile if neither script or exception are available, or if source has been updated
        if ((script == null && exception == null) || (reloading && checksum != resource.getChecksum())) {
            shared = Shared.UNKNOWN;
            if (!resource.exists()) {
                throw new IOException(resource + " not found or not readable");
            }
            exception = null;
            errors = null;
            script = compileScript(cx);
            scriptref = cache.createReference(resource, script, this);
            if (optlevel > -1) {
                cache.put(resource, scriptref);
            }
        }
        if (errors != null && !errors.isEmpty()) {
            RhinoEngine.errors.get().addAll(errors);
        }
        if (exception != null) {
            throw exception instanceof RhinoException ?
                (RhinoException) exception : new WrappedException(exception);
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
    protected synchronized Script compileScript(final Context cx)
            throws JavaScriptException, IOException {
        final String path = resource.getRelativePath();
        final ErrorReporter errorReporter = cx.getErrorReporter();
        cx.setErrorReporter(new ErrorCollector());
        Script script = null;
        String charset = engine.getCharset();
        try {
            final CodeSource source = engine.isPolicyEnabled() ?
                    new CodeSource(resource.getUrl(), (CodeSigner[]) null) : null;
            final Reader reader = resource.getReader(charset);
            script = AccessController.doPrivileged(new PrivilegedAction<Script>() {
                public Script run() {
                    try {
                        return cx.compileReader(reader, path, 1, source);
                    } catch (Exception x) {
                        exception = x;
                    }
                    return null;
                }
            });
        } catch (Exception x) {
            exception = x;
        } finally {
            cx.setErrorReporter(errorReporter);
            checksum = resource.getChecksum();
        }
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
        Map<Resource,ModuleScope> modules = RhinoEngine.modules.get();
        ModuleScope module = scope instanceof ModuleScope ?
                (ModuleScope) scope : null;
        if (module != null) {
            modules.put(resource, module);
        }
        Object value = script.exec(cx, scope);
        if (scope instanceof ModuleScope) {
            checkShared(module);
        }
        return value;
    }

    /**
     * Get a module scope loaded with this script
     *
     * @param prototype the prototype for the module, usually the shared top level scope
     * @param cx the rhino context
     * @return a new module scope
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    protected ModuleScope load(Scriptable prototype, Context cx)
            throws JavaScriptException, IOException {
        // check if we already came across the module in the current context/request
        Map<Resource, ModuleScope> modules = RhinoEngine.modules.get();
        if (modules.containsKey(resource)) {
            return modules.get(resource);
        }
        ModuleScope module = moduleScope;
        if (shared == Shared.TRUE
                && module != null
                && (!reloading || module.getChecksum() == getChecksum())) {
            // Reuse cached scope for shared modules.
            modules.put(resource, module);
            return module;
        }

        if (shared == Shared.UNKNOWN) {
            module = execSync(cx, getScript(cx), module, prototype, modules);
        } else {
            module = exec(cx, getScript(cx), module, prototype, modules);
        }
        return module;
    }

    private synchronized ModuleScope execSync(Context cx, Script script,
                                              ModuleScope module, Scriptable prototype,
                                              Map<Resource, ModuleScope> modules)
            throws IOException {
        return exec(cx, script, module, prototype, modules);
    }

    private ModuleScope exec(Context cx, Script script, ModuleScope module,
                             Scriptable prototype, Map<Resource, ModuleScope> modules)
            throws IOException {
        if (module == null) {
            module = new ModuleScope(moduleName, resource, prototype, cx);
        } else {
            module.reset();
        }
        if (log.isLoggable(Level.FINE)) {
            log.fine("Loading module: " + moduleName);
        }
        modules.put(resource, module);
        // warnings are disabled in shell - enable warnings for module loading
        ErrorReporter er = cx.getErrorReporter();
        ToolErrorReporter reporter = er instanceof ToolErrorReporter ?
                (ToolErrorReporter) er : null;
        if (reporter != null && !reporter.isReportingWarnings()) {
            try {
                reporter.setIsReportingWarnings(true);
                script.exec(cx, module);
            } finally {
                reporter.setIsReportingWarnings(false);
            }
        } else {
            script.exec(cx, module);
        }
        checkShared(module);
        return module;
    }

    /**
     * Return true if this represents a module shared among all threads/contexts
     * @return true of this script represents a shared module
     */
    public boolean isShared() {
        return shared == Shared.TRUE;
    }

    /**
     * Check if the module has the module.shared flag set, and set the moduleScope
     * field accordingly.
     * @param module the module scope
     * @throws IOException source could not be checked because of an I/O error
     */
    protected void checkShared(ModuleScope module) throws IOException {
        Scriptable meta = module.getMetaObject();
        // main module is always treated as shared to guarantee the require.main
        // property meets the requirements of the Securable Modules spec
        boolean isShared = meta.get("shared", meta) != Boolean.FALSE
                || moduleName.equals(engine.getMainModule());
        shared = isShared ? Shared.TRUE : Shared.FALSE;
        if (isShared) {
            module.setChecksum(getChecksum());
            engine.registerSharedScript(resource, this);
            moduleScope = module;
        } else {
            engine.removeSharedScript(resource);
            moduleScope = null;
        }
    }

    /**
     * Get the checksum of the script. For ordinary (non-shared) modules this is just
     * the checksum of the script code itself. For shared modules, it includes the
     * transitive sum of loaded module checksums, as shared modules need to be re-evaluated
     * even if just a dependency has been updated.
     * @return the evaluation checksum for this script
     * @throws IOException source could not be checked because of an I/O error
     */
    protected long getChecksum() throws IOException {
        long cs = resource.getChecksum();
        if (shared == Shared.TRUE) {
            Set<ReloadableScript> set = new HashSet<ReloadableScript>();
            set.add(this);
            for (ReloadableScript script: dependencies) {
                cs += script.getNestedChecksum(set);
            }
        }
        return cs;
    }

    /**
     * Get the recursive checksum of this script as a dependency. Since the checksum
     * field may not be up-to-date we directly get the checksum from the underlying
     * resource.
     * @param set visited script set to prevent cyclic invokation
     * @return the nested checksum
     * @throws IOException source could not be checked because of an I/O error
     */
    protected long getNestedChecksum(Set<ReloadableScript> set) throws IOException {
        if (set.contains(this)) {
            return 0;
        }
        set.add(this);
        long cs = resource.getChecksum();
        for (ReloadableScript script: dependencies) {
            cs += script.getNestedChecksum(set);
        }
        return cs;

    }

    /**
     * Register a script that this script depends on. This means that the script
     * has been loaded directly or indirectly from the top scope of this module.
     *
     * The purpose of this is to keep track of modules loaded indirectly by shared
     * modules, as we wouldn't normally notice they have been updated.
     *
     * Scripts loaded __after__ a module has been loaded do not count as dependencies,
     * as they will be checked again at runtime.
     *
     * @param script a script we depend on
     */
    protected void addDependency(ReloadableScript script) {
        if (!dependencies.contains(script)) {
            dependencies.add(script);
        }
    }

    /**
     * Hash code delegates to source.
     * @return the hash code
     */
    @Override
    public int hashCode() {
        return resource.hashCode();
    }

    /**
     * Equal check delegates to source.
     * @param obj the object to compare ourself to
     * @return true if it is a script with the same resource
     */
    @Override
    public boolean equals(Object obj) {
        return obj instanceof ReloadableScript
                && resource.equals(((ReloadableScript) obj).resource);
    }

    /**
     * An ErrorReporter instance used during compilation that records SyntaxErrors.
     * This way, we can reproduce the error messages for a faulty module without
     * having to recompile it each time it is required.
     */
    class ErrorCollector implements ErrorReporter {

        public void warning(String message, String sourceName,
                            int line, String lineSource, int lineOffset) {
            System.err.println("Warning: " + new SyntaxError(message, sourceName, line, lineSource, lineOffset));
        }

        public void error(String message, String sourceName,
                          int line, String lineSource, int lineOffset) {
            if (errors == null) {
                errors = new ArrayList<SyntaxError>();
            }
            errors.add(new SyntaxError(message, sourceName, line, lineSource, lineOffset));
            String error = "SyntaxError";
            if (message.startsWith("TypeError: ")) {
                error = "TypeError";
                message = message.substring(11);
            }
            // we could collect more syntax errors here by not throwing an exception
            // but reporting multiple errors may be just confusing
            throw ScriptRuntime.constructError(error, message, sourceName,
                                               line, lineSource, lineOffset);
        }

        public EvaluatorException runtimeError(String message, String sourceName,
                                               int line, String lineSource, int lineOffset) {
            return new EvaluatorException(message, sourceName, line, lineSource, lineOffset);
        }
    }

    static class ScriptReference extends SoftReference<Script> {
        Resource source;
        long checksum;
        List<SyntaxError> errors;
        Exception exception;


        ScriptReference(Resource source, Script script, ReloadableScript rescript, ReferenceQueue<Script> queue)
                throws IOException {
            super(script, queue);
            this.source = source;
            this.checksum = rescript.checksum;
            this.errors = rescript.errors;
            this.exception = rescript.exception;
        }
    }

    static class ScriptCache {
        ConcurrentHashMap<Resource, ScriptReference> map;
        ReferenceQueue<Script> queue;

        ScriptCache() {
            map = new ConcurrentHashMap<Resource, ScriptReference>();
            queue = new ReferenceQueue<Script>();
        }

        ScriptReference createReference(Resource source, Script script,
                                        ReloadableScript rescript)
                throws IOException {
            return new ScriptReference(source, script, rescript, queue);
        }

        ScriptReference get(Resource source) {
            ScriptReference ref;
            while((ref = (ScriptReference) queue.poll()) != null) {
                map.remove(ref.source);
            }
            return map.get(source);
        }

        void put(Resource source, ScriptReference ref)
                throws IOException {
            map.put(source, ref);
        }
    }

}


