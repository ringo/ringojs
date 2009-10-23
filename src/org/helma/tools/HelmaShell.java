/*
 *  Copyright 2008 Hannes Wallnoefer <hannes@helma.at>
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

package org.helma.tools;

import jline.Completor;
import jline.ConsoleReader;
import jline.History;
import org.helma.engine.ModuleScope;
import org.helma.engine.RhinoEngine;
import org.helma.repository.Repository;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.ToolErrorReporter;

import java.io.*;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.security.CodeSource;
import java.security.CodeSigner;

/**
 * HelmaShell is a simple interactive shell that provides the
 * additional global functions implemented by Helma.
 */
public class HelmaShell {

    HelmaConfiguration config;
    RhinoEngine engine;
    Scriptable scope;
    boolean debug;
    boolean silent;
    CodeSource codeSource = null;

    public HelmaShell(HelmaConfiguration config, RhinoEngine engine,
                      boolean debug, boolean silent)
            throws IOException {
        this.config = config;
        this.engine = engine;
    	this.scope = engine.getShellScope();
        this.debug = debug;
        this.silent = silent;
        // FIXME give shell code a trusted code source in case security is on
        if (config.isPolicyEnabled()) {
            Repository modules = config.getHelmaHome().getChildRepository("modules");
            codeSource = new CodeSource(modules.getUrl(), (CodeSigner[])null);
        }
    }
    
    public void run() throws IOException {
        if (silent) {
            // bypass console if running with redirected stdin or stout
            runSilently();
            return;
        }
        ConsoleReader reader = new ConsoleReader();
        reader.setBellEnabled(false);
        if (debug) {
            reader.setDebug(new PrintWriter(new FileWriter("jline.debug")));
        }
        reader.addCompletor(new JSCompletor());
        File historyFile = new File(System.getProperty("user.home"), ".helma-history");
        reader.setHistory(new History(historyFile));
        PrintWriter out = new PrintWriter(System.out);
        int lineno = 0;
        repl: while (true) {
            Context cx = engine.getContextFactory().enterContext();
            cx.setErrorReporter(new ToolErrorReporter(false, System.err));
            cx.setOptimizationLevel(-1);
            String source = "";
            String prompt = "helma> ";
            while (true) {
                String newline = reader.readLine(prompt);
                if (newline == null) {
                    // NULL input, if e.g. Ctrl-D was pressed
                    out.println();
                    out.flush();
                    break repl;
                }
                source = source + newline + "\n";
                lineno++;
                if (cx.stringIsCompilableUnit(source))
                    break;
                prompt = "     > ";
            }
            try {
                Object result = cx.evaluateString(scope, source, "<stdin>", lineno, codeSource);
                // Avoid printing out undefined or function definitions.
                if (result != Context.getUndefinedValue()) {
                    out.println(Context.toString(result));
                }
                out.flush();
                lineno++;
            } catch (Exception ex) {
                HelmaRunner.reportError(ex, System.out, debug);
            } finally {
                Context.exit();
            }
        }
        System.exit(0);
    }

    private void runSilently() throws IOException {
        int lineno = 0;
        outer: while (true) {
            Context cx = engine.getContextFactory().enterContext();
            cx.setErrorReporter(new ToolErrorReporter(false, System.err));
            cx.setOptimizationLevel(-1);
            String source = "";
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            while (true) {
                String line = reader.readLine();
                if (line == null) {
                    // reached EOF
                    break outer;
                }
                source = source + line + "\n";
                lineno++;
                if (cx.stringIsCompilableUnit(source))
                    break;
            }
            try {
                cx.evaluateString(scope, source, "<stdin>", lineno, codeSource);
                lineno++;
            } catch (Exception ex) {
                HelmaRunner.reportError(ex, System.err, debug);
            } finally {
                Context.exit();
            }
        }
        System.exit(0);
    }

    class JSCompletor implements Completor {

        Pattern variables = Pattern.compile(
                "(^|\\s|[^\\w\\.'\"])([\\w\\.]+)$");
        Pattern keywords = Pattern.compile(
                "(^|\\s)([\\w]+)$");

        public int complete(String s, int i, List list) {
            int start = i;
            try {
                Matcher match = keywords.matcher(s);
                if (match.find() && s.length() == i) {
                    String word = match.group(2);
                    for(String str: jsKeywords) {
                        if (str.startsWith(word)) {
                            list.add(str);
                        }
                    }
                }
                match = variables.matcher(s);
                if (match.find() && s.length() == i) {
                    String word = match.group(2);
                    Scriptable obj = scope;
                    String[] parts = word.split("\\.", -1);
                    for (int k = 0; k < parts.length - 1; k++) {
                        Object o = ScriptableObject.getProperty(obj, parts[k]);
                        if (o == null || o == ScriptableObject.NOT_FOUND) {
                            return start;
                        }
                        obj = ScriptRuntime.toObject(scope, o);
                    }
                    String lastpart = parts[parts.length - 1];
                    // set return value to beginning of word we're replacing
                    start = i - lastpart.length();
                    while (obj != null) {
                        // System.err.println(word + " -- " + obj);
                        Object[] ids = obj instanceof ScriptableObject ?
                                ((ScriptableObject) obj).getAllIds() :
                                obj.getIds();
                        for(Object id: ids) {
                            String str = id.toString();
                            if (str.startsWith(lastpart) || word.endsWith(".")) {
                                if (obj.get(str, obj) instanceof Callable) {
                                    list.add(str + "(");
                                } else {
                                    list.add(str);
                                }
                            }
                        }
                        if (word.endsWith(".") && obj instanceof ModuleScope) {
                            // don't walk scope prototype chain if nothing to compare yet -
                            // the list is just too long.
                            break;
                        }
                        obj = obj.getPrototype();
                    }
                }
            } catch (Exception ignore) {
                // ignore.printStackTrace();
            }
            Collections.sort(list);
            return start;
        }

    }

    static String[] jsKeywords =
        new String[] {
            "break",
            "case",
            "catch",
            "continue",
            "default",
            "delete",
            "do",
            "else",
            "finally",
            "for",
            "function",
            "if",
            "in",
            "instanceof",
            "new",
            "return",
            "switch",
            "this",
            "throw",
            "try",
            "typeof",
            "var",
            "void",
            "while",
            "with"
    };

}

