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
import org.helma.repository.Repository;
import org.helma.util.ScriptableList;
import org.helma.util.ScriptUtils;
import org.helma.util.StringUtils;
import org.helma.template.SkinParser;
import org.helma.template.UnbalancedTagException;
import org.helma.template.SkinRenderer;
import org.helma.template.MacroTag;

import java.io.*;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * This class contains the native functions Helma adds to the global scope. 
 */
public class GlobalFunctions {

    /**
     * Init functions on a new top level scope
     * @param scope the global scope
     */
    public static void init(ScriptableObject scope) {
        scope.defineFunctionProperties(
                new String[] {"importModule",
                              "importModuleAs",
                              "importFromModule",
                              "importJar",
                              "getResource",
                              "parseSkin"
                             },
                GlobalFunctions.class,
                ScriptableObject.DONTENUM);
    }

    /**
     * Evaluate a JavaScript resource.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @return null
     * @throws org.mozilla.javascript.JavaScriptException javascript evaluation error
     * @throws java.io.IOException error reading the resource
     */
    public static Object importModule(Context cx, Scriptable thisObj, Object[] args, Function funObj)
            throws JavaScriptException, IOException {
        ScriptUtils.checkArguments(args, 1, 1);
        String moduleName = ScriptUtils.getStringArgument(args, 0);
        importInternal(moduleName, moduleName, thisObj, cx);
        return Undefined.instance;
    }

    /**
     * Evaluate a JavaScript resource.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @return null
     * @throws JavaScriptException javascript evaluation error
     * @throws IOException error reading the resource
     */
    public static Object importModuleAs(Context cx, Scriptable thisObj, Object[] args, Function funObj)
            throws JavaScriptException, IOException {
        ScriptUtils.checkArguments(args, 2, 2);
        String moduleName = ScriptUtils.getStringArgument(args, 0);
        String as = ScriptUtils.getStringArgument(args, 1);
        importInternal(moduleName, as, thisObj, cx);
        return Undefined.instance;
    }

    /**
     * Evaluate a JavaScript resource.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @return null
     * @throws JavaScriptException javascript evaluation error
     * @throws IOException error reading the resource
     */
    public static Object importFromModule(Context cx, Scriptable thisObj, Object[] args, Function funObj)
            throws JavaScriptException, IOException {
        ScriptUtils.checkArguments(args, 2, -1);
        String moduleName = ScriptUtils.getStringArgument(args, 0);
        Scriptable scope = importInternal(moduleName, null, thisObj, cx);
        for (int i = 1; i < args.length; i++) {
            String property = ScriptUtils.getStringArgument(args, i);
            if ("*".equals(property)) {
                Object[] ids = scope.getIds();
                for (Object id: ids) {
                    if (id instanceof String) {
                        property = (String) id;
                        Object value = scope.get(property, scope);
                        if (value != null && value != Scriptable.NOT_FOUND)
                            thisObj.put(property, thisObj, value);
                    }
                }
                break;
            }
            Object value = scope.get(property, scope);
            if (value == null || value == Scriptable.NOT_FOUND) {
                throw new IllegalArgumentException("Property '" + property +
                        "' is not defined in module " + moduleName);
            }
            thisObj.put(property, thisObj, value);
        }
        return Undefined.instance;
    }

    private static Scriptable importInternal(String moduleName, String as, Scriptable thisObj,  Context cx)
            throws JavaScriptException, IOException {
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        Scriptable parentScope = ScriptRuntime.getTopCallScope(cx);
        ReloadableScript script = engine.getScript(moduleName, getLocalRepository(thisObj));
        Scriptable scope = script.load(parentScope, thisObj, cx);
        // split as string and walk through
        if (as != null) {
            if (as.indexOf('.') == -1) {
                thisObj.put(as, thisObj, scope);
            } else {
                String[] arr = StringUtils.split(as, ".");
                Scriptable obj = thisObj;
                for (int i = 0; i < arr.length - 1; i++) {
                    Object value = obj.get(arr[i], obj);
                    if (value == null || value == Scriptable.NOT_FOUND || !(value instanceof Scriptable)) {
                        Scriptable newObj = cx.newObject(engine.topLevelScope);
                        obj.put(arr[i], obj, newObj);
                        obj = newObj;
                    } else {
                        obj = (Scriptable) value;
                    }
                }
                obj.put(arr[arr.length - 1], obj, scope);
            }
        }
        return scope;
    }

    private static Repository getLocalRepository(Scriptable scriptable) {
        // add the importing module's repository to the search path so we find local modules
        if (scriptable instanceof ModuleScope)
            return ((ModuleScope) scriptable).getRepository();
        return null;
    }

    /**
     * Add a resource to the application classpath.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @throws java.net.MalformedURLException resource delivered bogus URL
     * @return null
     */
    public static Object importJar(Context cx, Scriptable thisObj, Object[] args, Function funObj)
            throws MalformedURLException {
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ScriptUtils.checkArguments(args, 1, 1);
        String path = ScriptUtils.getStringArgument(args, 0);
        // add the importing module's repository to the search path so we find local modules
        Resource resource = engine.findResource(path, getLocalRepository(thisObj));
        URL url = resource.getUrl();
        engine.loader.addURL(url);
        return Undefined.instance;
    }

    /**
     * Add a resource to the application classpath.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @return the resource
     */
    public static Object getResource(Context cx, Scriptable thisObj, Object[] args, Function funObj) {
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ScriptUtils.checkArguments(args, 1, 1);
        String path = ScriptUtils.getStringArgument(args, 0);
        // add the importing module's repository to the search path so we find local modules
        Resource resource = engine.findResource(path, getLocalRepository(thisObj));
        return Context.javaToJS(resource, engine.topLevelScope);
    }


    /**
     * Get a list of resource wrapped as JS array.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @return the resource
     */
    public static Object getResources(Context cx, Scriptable thisObj, Object[] args, Function funObj) {
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ScriptUtils.checkArguments(args, 1, 1);
        String path = ScriptUtils.getStringArgument(args, 0);
        return new ScriptableList(engine.topLevelScope, engine.getResources(path));
    }

    /**
     * Parse a string or resource as skin.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @throws IOException an I/O related error occurred
     * @throws org.helma.template.UnbalancedTagException the skin contains unbalanced macro tags
     * @return the resource
     */
    public static Object parseSkin(final Context cx, final Scriptable thisObj,
                                   Object[] args, Function funObj)
            throws IOException, UnbalancedTagException {
        final RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ScriptUtils.checkArguments(args, 2, 2);
        Object desc = ScriptUtils.getObjectArgument(args, 0);
        if (!(args[1] instanceof Function)) {
            throw new IllegalArgumentException("Second argument to parseSkin must be a function");
        }
        final Function func = (Function) args[1];
        Resource res;
        if (desc instanceof Resource) {
            res = (Resource) desc;
        } else if (desc instanceof String) {
            res = engine.getResource((String) desc);
        } else {
            throw new IllegalArgumentException("Can't converert to skin resource: " + desc);
        }           
        if (!res.exists()) {
            throw new FileNotFoundException("Resource '" + res + "' not found");
        }
        SkinParser parser = new SkinParser(new SkinRenderer() {
            public void renderText(String text) {
                func.call(cx, thisObj, null, new Object[] {text});
            }

            public void renderMacro(MacroTag macro) {
                func.call(cx, thisObj, null,
                        new Object[] {engine.wrapArgument(macro, thisObj)});
            }
        });
        parser.parse(res);
        return true;
    }

}
