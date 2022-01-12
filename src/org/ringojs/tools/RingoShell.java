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

package org.ringojs.tools;

import org.jline.reader.*;
import org.jline.reader.impl.DefaultParser;
import org.jline.reader.impl.completer.AggregateCompleter;
import org.jline.reader.impl.completer.StringsCompleter;
import org.jline.reader.impl.history.DefaultHistory;
import org.jline.terminal.Terminal;
import org.jline.terminal.TerminalBuilder;
import org.ringojs.engine.ModuleScope;
import org.ringojs.engine.ReloadableScript;
import org.ringojs.engine.RhinoEngine;
import org.ringojs.engine.RingoConfig;
import org.ringojs.engine.RingoWorker;
import org.ringojs.engine.ScriptError;
import org.ringojs.repository.Repository;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.ToolErrorReporter;
import org.ringojs.repository.Resource;
import org.ringojs.repository.StringResource;
import org.ringojs.wrappers.ScriptableList;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.security.CodeSource;
import java.security.CodeSigner;

/**
 * RingoShell is a simple interactive shell that provides the
 * additional global functions implemented by Ringo.
 */
public class RingoShell {

    final RingoConfig config;
    final RhinoEngine engine;
    final RingoWorker worker;
    Scriptable scope;
    boolean silent;
    Path history;
    CodeSource codeSource = null;
    final String PROMPT = ">> ";
    final String SECONDARY_PROMPT = ".. ";

    public RingoShell(RhinoEngine engine) throws IOException {
        this(engine, null, false);
    }

    public RingoShell(RhinoEngine engine, Path history, boolean silent)
            throws IOException {
        this.config = engine.getConfig();
        this.engine = engine;
        this.history = history;
        this.worker = engine.getWorker();
        this.scope = engine.getShellScope(worker);
        this.silent = silent;
    }

    public void run() throws IOException {
        if (silent) {
            // bypass console if running with redirected stdin or stout
            runSilently();
            return;
        }
        preloadShellModule();
        Terminal terminal = TerminalBuilder.builder()
            .name("RingoJS Terminal")
            .build();
        if (history == null) {
            history = Paths.get(System.getProperty("user.home"), ".ringo-history");
        }
        DefaultParser parser = new DefaultParser();
        parser.setEofOnUnclosedBracket(DefaultParser.Bracket.CURLY,
            DefaultParser.Bracket.ROUND,
            DefaultParser.Bracket.SQUARE);
        parser.setEofOnEscapedNewLine(true);
        LineReader reader = LineReaderBuilder.builder()
            .terminal(terminal)
            .parser(parser)
            .variable(LineReader.HISTORY_FILE, history)
            .variable(LineReader.SECONDARY_PROMPT_PATTERN, SECONDARY_PROMPT)
            .variable(LineReader.INDENTATION, 4)
            .history(new DefaultHistory())
            .completer(new AggregateCompleter(
                new JSCompleter(terminal),
                new StringsCompleter(getJsKeywordCandidates())
            ))
            .option(LineReader.Option.HISTORY_TIMESTAMPED, false)
            .build();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                reader.getHistory().save();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }));

        int lineno = 0;
        while (true) {
            Context cx = engine.getContextFactory().enterContext(null);
            cx.setErrorReporter(new ToolErrorReporter(false, System.err));
            String source = "";
            try {
                source = reader.readLine(PROMPT);
                lineno++;
            } catch (UserInterruptException ignore) {
            } catch (EndOfFileException e) {
                break;
            }
            try {
                Resource res = new StringResource("<stdin>", source, lineno);
                ReloadableScript script = new ReloadableScript(res, engine);
                Object result = worker.evaluateScript(cx, script, scope);

                printResult(result, System.out);
                lineno++;
                // trigger GC once in a while - if we run in non-interpreter mode
                // we generate a lot of classes to unload
                if (lineno % 10 == 0) {
                    System.gc();
                }
            } catch (Exception ex) {
                // TODO: should this print to System.err?
                printError(ex, System.out, config.isVerbose());
            } finally {
                Context.exit();
            }
        }
        System.exit(0);
    }

    protected void printResult(Object result, PrintStream out) {
        try {
            worker.invoke("ringo/shell", "printResult", result);
        } catch (Exception x) {
            // Avoid printing out undefined or function definitions.
            if (result != Context.getUndefinedValue()) {
                out.println(Context.toString(result));
            }
            out.flush();
        }
    }

    protected void printError(Exception ex, PrintStream out, boolean verbose) {
        List<ScriptError> errors = worker.getErrors();
        try {
            worker.invoke("ringo/shell", "printError", ex,
                    new ScriptableList(scope, errors), verbose);
        } catch (Exception x) {
            // fall back to RingoRunner.reportError()
            RingoRunner.reportError(ex, out, errors, verbose);
        }
    }

    private void runSilently() throws IOException {
        int lineno = 0;
        outer: while (true) {
            Context cx = engine.getContextFactory().enterContext(null);
            cx.setErrorReporter(new ToolErrorReporter(false, System.err));
            String source = "";
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            do {
                String line = reader.readLine();
                if (line == null) {
                    // reached EOF
                    break outer;
                }
                source = source + line + "\n";
                lineno++;
            } while (!cx.stringIsCompilableUnit(source));
            try {
                Resource res = new StringResource("<stdin>", source, lineno);
                ReloadableScript script = new ReloadableScript(res, engine);
                worker.evaluateScript(cx, script, scope);
                lineno++;
            } catch (Exception ex) {
                RingoRunner.reportError(ex, System.err, worker.getErrors(),
                        config.isVerbose());
            } finally {
                Context.exit();
            }
        }
        System.exit(0);
    }

    // preload ringo/shell in separate thread
    private void preloadShellModule() {
        Thread t = new Thread() {
            public void run() {
                Context cx = engine.getContextFactory().enterContext(null);
                try {
                    worker.loadModule(cx, "ringo/shell", null);
                } catch (Exception ignore) {
                    // ignore
                } finally {
                    Context.exit();
                }
            }
        };
        t.setPriority(Thread.MIN_PRIORITY);
        t.setDaemon(true);
        t.start();
    }

    private Candidate[] getJsKeywordCandidates() {
        return Arrays.stream(jsKeywords)
            .map(str -> new Candidate(str, str, null, null, null, null, false))
            .toArray(Candidate[]::new);
    }

    class JSCompleter implements Completer {

        final Pattern variables = Pattern.compile(
                "(^|\\s|[^\\w\\.'\"])([\\w\\.]+)$");
        Terminal terminal;

        JSCompleter(Terminal terminal) {
            this.terminal = terminal;
        }

        @Override
        public void complete(LineReader lineReader, ParsedLine parsedLine, List<Candidate> list) {
            try {
                String line = parsedLine.line();
                Matcher match = variables.matcher(line);
                if (match.find()) {
                    String path = match.group(2);
                    Scriptable obj = scope;
                    String[] parts = path.split("\\.", -1);
                    for (int k = 0; k < parts.length - 1; k++) {
                        Object o = ScriptableObject.getProperty(obj, parts[k]);
                        if (o == null || o == ScriptableObject.NOT_FOUND) {
                            return;
                        }
                        obj = ScriptRuntime.toObject(scope, o);
                    }
                    String lastPart = parts[parts.length - 1];
                    String prefix = line.substring(0, line.length() - lastPart.length());
                    while (obj != null) {
                        Object[] ids = obj.getIds();
                        collectIds(ids, obj, prefix, lastPart, list);
                        if (list.size() <= 3 && obj instanceof ScriptableObject) {
                            ids = ((ScriptableObject) obj).getAllIds();
                            collectIds(ids, obj, prefix, lastPart, list);
                        }
                        if (path.endsWith(".") && obj instanceof ModuleScope) {
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
        }

        private void collectIds(Object[] ids, Scriptable obj, String line, String lastPart, List<Candidate> list) {
            for (Object id: ids) {
                if (!(id instanceof String)) {
                    continue;
                }
                String str = (String) id;
                if (str.startsWith(lastPart)) {
                    if (ScriptableObject.getProperty(obj, str) instanceof Callable) {
                        str += "(";
                    }
                    Candidate candidate = new Candidate(line + str, line + str, null, null, null, null, false);
                    list.add(candidate);
                }
            }
        }

    }

    private static final String[] jsKeywords =
        new String[] {
            "break",
            "case",
            "catch",
            "const",
            "continue",
            "debugger",
            "default",
            "delete",
            "do",
            "else",
            "false",
            "finally",
            "for",
            "function",
            "if",
            "in",
            "instanceof",
            "let",
            "new",
            "null",
            "return",
            "switch",
            "this",
            "throw",
            "true",
            "try",
            "typeof",
            "var",
            "void",
            "while",
            "with",
            "yield"
    };

}

