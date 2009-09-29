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

import org.helma.engine.RhinoEngine;
import org.helma.engine.ModuleScope;
import org.helma.engine.SyntaxError;
import org.helma.repository.FileRepository;
import org.helma.repository.Repository;
import org.mozilla.javascript.RhinoSecurityManager;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.RhinoException;

import static java.lang.System.err;
import static java.lang.System.out;
import java.util.ArrayList;
import java.util.List;
import java.io.IOException;

public class HelmaRunner {

    HelmaConfiguration config;
    RhinoEngine engine;
    Context cx;
    ModuleScope module;
    String scriptName = null;
    String[] scriptArgs = new String[0];
    boolean runShell = false;
    boolean debug = false;

    public HelmaRunner() {
    }

    public static void main(String[] args) throws IOException {
        HelmaRunner runner = new HelmaRunner();
        runner.run(args);
    }

    public void parseArgs(String[] args) throws IOException {

        int optlevel = 0;
        List<String> bootstrapScripts = new ArrayList<String>();

        String helmaHome = System.getProperty("helma.home");
        if (helmaHome == null) {
            helmaHome = System.getenv("HELMA_HOME");
        }
        if (helmaHome == null) {
            helmaHome = ".";
        }
        Repository home = new FileRepository(helmaHome);
        String modulePath = System.getProperty("helma.modulepath");
        if (modulePath == null) {
            modulePath = System.getenv("HELMA_MODULE_PATH");
        }

        if (args != null && args.length > 0) {
            int i;
            for (i = 0; i < args.length; i++) {
                String option = args[i];
                if (!option.startsWith("-")) {
                    break;
                }
                if ("--help".equals(option) || "-h".equals(option)) {
                    printUsage();
                    return;
                } else if ("--interactive".equals(option) || "-i".equals(option)) {
                    runShell = true;
                } else if ("--debug".equals(option) || "-d".equals(option)) {
                    debug = true;
                } else if ("--optlevel".equals(option) || "-o".equals(option)) {
                    if (++i == args.length) {
                        missingValueError(option);
                    }
                    try {
                        optlevel = Integer.parseInt(args[i]);
                    } catch (NumberFormatException x) {
                        rangeError(option);
                    }
                    if (optlevel < -1 || optlevel > 9) {
                        rangeError(option);
                    }
                } else if ("--policy".equals(option) || "-p".equals(option)) {
                    if (++i == args.length) {
                        missingValueError(option);
                    }
                    System.setProperty("java.security.policy", args[i]);
                    System.setSecurityManager(new RhinoSecurityManager());
                } else if ("--bootstrap".equals(option) || "-b".equals(option)) {
                    if (++i == args.length) {
                        missingValueError(option);
                    }
                    bootstrapScripts.add(args[i]);
                } else {
                    unknownOptionError(option);
                }
            }
            if (i < args.length) {
                scriptName = args[i];
                scriptArgs = new String[args.length - i];
                System.arraycopy(args, i, scriptArgs, 0, scriptArgs.length);
            }
        }

        try {
            config = new HelmaConfiguration(home, modulePath, "modules");
            config.setPolicyEnabled(System.getProperty("java.security.policy") != null);
            config.setMainScript(scriptName);
            config.setArguments(scriptArgs);
            config.setOptLevel(optlevel);
            config.setBootstrapScripts(bootstrapScripts);
            engine = new RhinoEngine(config, null);
        } catch (Exception x) {
            reportError(x, debug);
        }
    }

    public void run(String[] args) {
        try {
            parseArgs(args);
            if (engine == null) {
                return;
            }
            if (scriptName != null) {
                engine.runScript(config.getMainResource(), scriptArgs);
            }
            if (scriptName == null || runShell) {
                new HelmaShell(config, engine, debug).run();
            }
        } catch (Exception x) {
            reportError(x, debug);
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
            engine.invoke(module, "init", (Object[]) scriptArgs);
        } catch (NoSuchMethodException nsm) {
            // daemon life-cycle method not implemented
        } catch (Exception x) {
            reportError(x, debug);
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
                reportError(x, debug);
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
                reportError(x, debug);
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
                reportError(x, debug);
                System.exit(-1);
            }
        }
    }

    private static void missingValueError(String option) {
        exitWithError(option + " option requires a value.", -1);
    }

    private static void rangeError(String option) {
        exitWithError(option + " value must be a number between -1 and 9.", -1);
    }

    private static void unknownOptionError(String option) {
        exitWithError(option + " option requires a value.", -1);
    }

    private static void exitWithError(String message, int code) {
        err.println(message);
        err.println("Run with -h flag for more information on supported options.");
        System.exit(code);
    }

    public static void reportError(Exception x, boolean debug) {
        if (x instanceof RhinoException) {
            System.err.println(x.getMessage());
        } else {
            System.err.println(x.toString());
        }
        List<SyntaxError> errors = RhinoEngine.errors.get();
        if (errors != null && !errors.isEmpty()) {
            for (SyntaxError error : errors) {
                System.err.println(error);
            }
        }
        if (x instanceof RhinoException) {
            System.err.println(((RhinoException) x).getScriptStackTrace());
        }
        if (debug) {
            x.printStackTrace();
        }
    }

    public static void printUsage() {
        out.println("Usage:");
        out.println("  helma [option] ... [file] [arg] ...");
        out.println("Options:");
        out.println("  -b, -bootstrap script : Run additional bootstrap script");
        out.println("  -d, --debug           : Print stack traces for shell errors");
        out.println("  -h, --help            : Display this help message");
        out.println("  -i, --interactive     : Start shell after script file has run");
        out.println("  -o, --optlevel n      : Set Rhino optimization level (-1 to 9)");
        out.println("  -p, --policy url      : Set java policy file and enable security manager");
    }
}
