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

import org.helma.javascript.RhinoEngine;
import org.helma.javascript.ModuleScope;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.ToolErrorReporter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.Collections;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

import jline.ConsoleReader;
import jline.Completor;

/**
 * HelmaShell is a simple interactive shell that provides the
 * additional global functions implemented by Helma.
 */
public class HelmaShell {

    static ModuleScope scope;

    public static void main(String[] args) throws IOException {
        HelmaConfiguration config = new HelmaConfiguration();
        RhinoEngine engine = config.createEngine();
        scope = engine.getShellScope();
        ConsoleReader reader = new ConsoleReader();
        reader.setBellEnabled(false);
        reader.addCompletor(new JSCompletor());
        PrintWriter out = new PrintWriter(System.out);
        int lineno = 1;
        Context cx = engine.getContextFactory().enterContext();
        cx.setErrorReporter(new ToolErrorReporter(true, System.out));
        try {
            while (true) {
                String source = "";
                String prompt = "helma> ";
                while (true) {
                    String newline = reader.readLine(prompt);
                    source = source + newline + "\n";
                    lineno++;
                    if (cx.stringIsCompilableUnit(source))
                        break;
                    prompt = "     > ";
                }
                try {
                    Object result = cx.evaluateString(scope, source, "<shell>", lineno, null);
                    // Avoid printing out undefined or function definitions.
                    if (result != Context.getUndefinedValue()) {
                        out.println(Context.toString(result));
                    }               
                    out.flush();
                    lineno++;
                } catch (RhinoException ex) {
                    Context.reportError(ex.getMessage(), ex.sourceName(),
                        ex.lineNumber(), ex.lineSource(), ex.columnNumber());
                } catch (Exception ex) {
                    Context.reportError(ex.toString());
                }
            }
        } finally {
            Context.exit();
        }

    }

    static class JSCompletor implements Completor {

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
                        obj = ScriptRuntime.toObject(scope, obj.get(parts[k], obj));

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
                                list.add(str);
                            }
                        }
                        if (word.endsWith(".") && obj instanceof ModuleScope) {
                            // don't walk scope prototype chain if nothing to compare yet -
                            // the list is just too long.
                            break;
                        }
                        obj = (ScriptableObject) obj.getPrototype();
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

