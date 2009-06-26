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
import org.helma.repository.FileRepository;
import org.helma.repository.Repository;
import org.mozilla.javascript.RhinoSecurityManager;

import java.util.ArrayList;
import java.util.List;

public class HelmaRunner {

    HelmaConfiguration config;
    RhinoEngine engine;
    String scriptName = null;
    String[] scriptArgs = new String[0];
    boolean runShell = false;
    boolean debug = false;

    public HelmaRunner() {
    }

    public static void main(String[] args) {
        HelmaRunner runner = new HelmaRunner();
        runner.init(args);
        runner.start();
    }

    public void init(String[] args) {

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
                String arg = args[i];
                if (!arg.startsWith("-")) {
                    break;
                }
                if ("--help".equals(arg) || "-h".equals(arg)) {
                    printUsage();
                    return;
                } else if ("--interactive".equals(arg) || "-i".equals(arg)) {
                    runShell = true;
                } else if ("--debug".equals(arg) || "-d".equals(arg)) {
                    debug = true;
                } else if ("--optlevel".equals(arg) || "-o".equals(arg)) {
                    if (++i == args.length) {
                        exitWithError(arg + " option requires a value.");
                    }
                    try {
                        optlevel = Integer.parseInt(args[i]);
                    } catch (NumberFormatException x) {
                        exitWithError(arg + " value must be a number between -1 and 9.");
                    }
                    if (optlevel < -1 || optlevel > 9) {
                        exitWithError(arg + " value must be a number between -1 and 9.");
                    }
                } else if ("--policy".equals(arg) || "-p".equals(arg)) {
                    if (++i == args.length) {
                        exitWithError(arg + " option requires a value.");
                    }
                    System.setProperty("java.security.policy", args[i]);
                    System.setSecurityManager(new RhinoSecurityManager());
                } else if ("--bootstrap".equals(arg) || "-b".equals(arg)) {
                    if (++i == args.length) {
                        exitWithError(arg + " option requires a value.");
                    }
                    bootstrapScripts.add(args[i]);
                } else {
                    exitWithError("Unknown option: " + arg);
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
            config.addScriptRepository(scriptName);
            config.setOptLevel(optlevel);
            config.setBootstrapScripts(bootstrapScripts);
            engine = new RhinoEngine(config, null);
        } catch (Exception x) {
            if (debug) {
                x.printStackTrace();
            } else {
                System.err.println(x);
            }
            System.exit(-1);
        }
    }

    public void start() {
        if (engine == null) {
            return;
        }
        try {
            if (scriptName != null) {
                engine.runScript(scriptName, scriptArgs);
            }
            if (scriptName == null || runShell) {
                new HelmaShell(config, engine, debug).run();
            }
        } catch (Exception x) {
            if (debug) {
                x.printStackTrace();
            } else {
                System.err.println(x);
            }
            System.exit(-1);
        }
    }

    public void stop() {
        if (engine == null) {
            return;
        }
    }

    public void destroy() {
        if (engine == null) {
            return;
        }
    }

    private static void exitWithError(String errorMessage) {
        System.err.println(errorMessage);
        System.err.println("Run with -h flag for more information on supported options.");
        System.exit(-1);
    }

    public static void printUsage() {
        System.out.println("Usage:");
        System.out.println("  helma [option] ... [file] [arg] ...");
        System.out.println("Options:");
        System.out.println("  -b, -bootstrap script : Run additional bootstrap script");
        System.out.println("  -d, --debug           : Print stack traces for shell errors");
        System.out.println("  -h, --help            : Display this help message");
        System.out.println("  -i, --interactive     : Start shell after script file has run");
        System.out.println("  -o, --optlevel n      : Set Rhino optimization level (-1 to 9)");
        System.out.println("  -p, --policy url      : Set java policy file and enable security manager");
    }
}
