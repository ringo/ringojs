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

import org.ringojs.engine.RhinoEngine;
import org.ringojs.engine.ModuleScope;
import org.ringojs.engine.SyntaxError;
import org.ringojs.repository.FileRepository;
import org.ringojs.repository.Repository;
import org.ringojs.repository.ZipRepository;
import org.ringojs.util.StringUtils;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.RhinoException;

import static java.lang.System.err;
import static java.lang.System.out;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Formatter;
import java.io.IOException;
import java.io.File;
import java.io.PrintStream;

public class RingoRunner {

    RingoConfiguration config;
    RhinoEngine engine;
    Context cx;
    ModuleScope module;
    int optlevel;
    String scriptName = null;
    String[] scriptArgs = new String[0];
    String expr = null;
    File history = null;
    String charset;
    boolean runShell = false;
    boolean debug = false;
    boolean verbose = false;
    boolean silent = false;
    boolean legacyMode = false;
    boolean productionMode = false;
    List<String> bootScripts = new ArrayList<String>();

    static final String[][] options = {
        {"b", "bootscript", "Run additional bootstrap script", "FILE"},
        {"c", "charset", "Set character encoding for scripts (default: utf-8)", "CHARSET"},
        {"D", "java-property", "Set Java system property K to value V", "K=V"},
        {"d", "debug", "Run with debugger GUI", ""},
        {"e", "expression", "Run the given expression as script", "EXPR"},
        {"h", "help", "Display this help message", ""},
        {"H", "history", "Use custom history file (default: ~/.ringo-history)", "FILE"},
        {"i", "interactive", "Start shell after script file has run", ""},
        {"l", "legacy-mode", "Enable __parent__ and __proto__ and suppress warnings", ""},
        {"o", "optlevel", "Set Rhino optimization level (-1 to 9)", "OPT"},
        {"p", "production", "Disable module reloading and warnings", ""},
        {"P", "policy", "Set java policy file and enable security manager", "URL"},
        {"s", "silent", "Disable shell prompt and echo for piped stdin/stdout", ""},
        {"V", "verbose", "Print java stack traces on errors", ""},
        {"v", "version", "Print version number and exit", ""},
    };

    public RingoRunner() {
    }

    public static void main(String[] args) throws IOException {
        RingoRunner runner = new RingoRunner();
        runner.run(args);
    }

    public void parseArgs(String[] args) throws IOException {

        if (args != null && args.length > 0) {
            int i = parseOptions(args);
            if (i < args.length) {
                scriptName = args[i];
                scriptArgs = new String[args.length - i];
                System.arraycopy(args, i, scriptArgs, 0, scriptArgs.length);
            }
        }

        String ringoHome = System.getProperty("ringo.home");
        if (ringoHome == null) {
            ringoHome = System.getenv("RINGO_HOME");
        }
        if (ringoHome == null) {
            ringoHome = ".";
        }
        File file = new File(ringoHome);
        Repository home = file.isFile() && StringUtils.isZipOrJarFile(ringoHome) ?
                new ZipRepository(file) : new FileRepository(file);
        String modulePath = System.getProperty("ringo.modulepath");
        if (modulePath == null) {
            modulePath = System.getenv("RINGO_MODULE_PATH");
        }

        try {
            String[] paths = modulePath == null ?
                    new String[0] : StringUtils.split(modulePath, File.pathSeparator);
            config = new RingoConfiguration(home, paths, "modules");
            config.setPolicyEnabled(System.getProperty("java.security.policy") != null);
            config.setMainScript(scriptName);
            config.setArguments(scriptArgs);
            config.setOptLevel(optlevel);
            config.setBootstrapScripts(bootScripts);
            config.setDebug(debug);
            config.setVerbose(verbose);
            config.setParentProtoProperties(legacyMode);
            config.setStrictVars(!legacyMode && !productionMode);
            config.setReloading(!productionMode);
            if (charset != null) {
                config.setCharset(charset);
            }
            engine = new RhinoEngine(config, null);
        } catch (Exception x) {
            reportError(x, err, verbose);
        }
    }

    public void run(String[] args) {
        try {
            parseArgs(args);
            if (engine == null) {
                return;
            }
            if (expr != null) {
                engine.evaluateExpression(expr);
            }
            if (scriptName != null) {
                engine.runScript(config.getMainResource(), scriptArgs);
            }
            if ((scriptName == null && expr == null)  || runShell) {
                // autodetect --silent option if stdin or stdout is redirected
                if (!silent) {
                    // System.console() is only available on Java 6 or later
                    try {
                        Method systemConsole = System.class.getMethod("console");
                        silent = systemConsole.invoke(null) == null;
                    } catch (NoSuchMethodException nsm) {
                        // System.console() not available
                    }
                }
                new RingoShell(engine, history, silent).run();
            }
        } catch (Exception x) {
            reportError(x, err, verbose);
            System.exit(-1);
        }
    }

    public void init(String[] args) {
        try {
            parseArgs(args);
            if (engine == null) {
                return;
            }
            if (scriptName == null) {
                throw new RuntimeException("daemon interface requires a script argument");
            }
            cx = engine.getContextFactory().enterContext();
            module = engine.loadModule(cx, config.getMainResource().getModuleName(), null);
            engine.invoke(module, "init");
        } catch (NoSuchMethodException nsm) {
            // daemon life-cycle method not implemented
        } catch (Exception x) {
            reportError(x, err, verbose);
            System.exit(-1);
        }
    }

    public void start() {
        if (cx != null) {
            try {
                engine.invoke(module, "start");
            } catch (NoSuchMethodException nsm) {
                // daemon life-cycle method not implemented
            } catch (Exception x) {
                reportError(x, err, verbose);
                System.exit(-1);
            }
        }
    }


    public void stop() {
        if (cx != null) {
            try {
                engine.invoke(module, "stop");
            } catch (NoSuchMethodException nsm) {
                // daemon life-cycle method not implemented
            } catch (Exception x) {
                reportError(x, err, verbose);
                System.exit(-1);
            }
        }
    }

    public void destroy() {
        if (cx != null) {
            try {
                engine.invoke(module, "destroy");
            } catch (NoSuchMethodException nsm) {
                // daemon life-cycle method not implemented
            } catch (Exception x) {
                reportError(x, err, verbose);
                System.exit(-1);
            }
        }
    }

    private int parseOptions(String[] args) {
        int i;
        for (i = 0; i < args.length; i++) {
            String option = args[i];
            if (!option.startsWith("-")) {
                break;
            }
            String nextArg = i < args.length - 1 ? args[i + 1] : null;
            int result;
            if (option.startsWith("--")) {
                result = parseLongOption(option.substring(2), nextArg);
            } else {
                result = parseShortOption(option.substring(1), nextArg);
            }
            if (result < 0) {
                break;
            } else {
                i += result;
            }
        }
        return i;
    }

    private int parseShortOption(String opt, String nextArg) {
        int length = opt.length();
        for (int i = 0; i < length; i++) {
            String[] def = null;
            char c = opt.charAt(i);
            for (String[] d : options) {
                if (d[0].charAt(0) == c) {
                    def = d;
                    break;
                }
            }
            if (def == null) {
                unknownOptionError("-" + Character.toString(c));
            }
            String optarg = null;
            int consumedNext = 0;
            if (!def[3].equals("")) {
                if (i == length - 1) {
                    if (nextArg == null) {
                        missingValueError("-" + def[0]);
                    }
                    optarg = nextArg;
                    consumedNext = 1;
                } else {
                    optarg = opt.substring(i + 1);
                    if (optarg.length() == 0) {
                        missingValueError("-" + def[0]);
                    }
                }
                i = length;
            }
            processOption(def[1], optarg);
            if (i >= length) {
                return consumedNext;
            }
        }
        return 0;
    }

    private int parseLongOption(String opt, String nextArg) {
        String[] def = null;
        for (String[] d : options) {
            if (opt.equals(d[1]) || (opt.startsWith(d[1])
                                 && opt.charAt(d[1].length()) == '=')) {
                def = d;
                break;
            }
        }
        if (def == null) {
            unknownOptionError("--" + opt);
        }
        String optarg = null;
        int consumedNext = 0;
        if (!def[3].equals("")) {
            if (opt.equals(def[1])) {
                if (nextArg == null) {
                    missingValueError("--" + def[1]);
                }
                optarg = nextArg;
                consumedNext = 1;
            } else {
                int length = def[1].length();
                if (opt.charAt(length) != '=') {
                    missingValueError("--" + def[1]);
                }
                optarg = opt.substring(length + 1);
            }
        }
        processOption(def[1], optarg);
        return consumedNext;
    }

    private void processOption(String option, String arg) {
        if ("help".equals(option)) {
            printUsage();
            System.exit(0);
        } else if ("interactive".equals(option)) {
            runShell = true;
        } else if ("debug".equals(option)) {
            debug = true;
        } else if ("optlevel".equals(option)) {
            try {
                optlevel = Integer.parseInt(arg);
            } catch (NumberFormatException x) {
                rangeError(option);
            }
            if (optlevel < -1 || optlevel > 9) {
                rangeError(option);
            }
        } else if ("history".equals(option)) {
            history = new File(arg);
        } else if ("policy".equals(option)) {
            System.setProperty("java.security.policy", arg);
            System.setSecurityManager(new RingoSecurityManager());
        } else if ("java-property".equals(option)) {
            if (arg.indexOf("=") > -1) {
                String property[] = arg.split("=", 2);
                System.setProperty(property[0], property[1]);
            }
        } else if ("bootscript".equals(option)) {
            bootScripts.add(arg);
        } else if ("charset".equals(option)) {
            charset = arg;
        } else if ("expression".equals(option)) {
            expr = arg;
        } else if ("silent".equals(option)) {
            silent = runShell = true;
        } else if ("production".equals(option)) {
            productionMode = true;
        } else if ("verbose".equals(option)) {
            verbose = true;
        } else if ("legacy-mode".equals(option)) {
            legacyMode = true;
        } else if ("version".equals(option)) {
            printVersion();
            System.exit(0);
        }
    }

    private static void missingValueError(String option) {
        exitWithError(option + " option requires a value.", -1);
    }

    private static void rangeError(String option) {
        exitWithError(option + " value must be a number between -1 and 9.", -1);
    }

    private static void unknownOptionError(String option) {
        exitWithError("Unknown option: " + option, -1);
    }

    private static void exitWithError(String message, int code) {
        err.println(message);
        err.println("Use -h or --help for a list of supported options.");
        System.exit(code);
    }

    public static void reportError(Throwable x, PrintStream output, boolean debug) {
        if (x instanceof RhinoException) {
            output.println(x.getMessage());
        } else {
            output.println(x.toString());
        }
        List<SyntaxError> errors = RhinoEngine.errors.get();
        if (errors != null && !errors.isEmpty()) {
            for (SyntaxError error : errors) {
                output.println(error);
            }
        }
        if (x instanceof RhinoException) {
            output.println(((RhinoException) x).getScriptStackTrace());
        }
        if (debug) {
            x.printStackTrace(output);
        }
    }

    public static void printUsage() {
        out.println("Usage:");
        out.println("  ringo [option] ... [script] [arg] ...");
        out.println("Options:");
        Formatter formatter = new Formatter(out);
        for (String[] opt : options) {
            String def = new Formatter().format("-%1$s --%2$s %4$s", (Object[]) opt).toString();
            formatter.format("  %1$-23s %2$s%n", def, opt[2]);
        }
    }

    public static void printVersion() {
        out.print("RingoJS version ");
        out.println(RhinoEngine.VERSION.get(0) + "." + RhinoEngine.VERSION.get(1));
    }

}
