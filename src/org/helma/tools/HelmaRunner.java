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

import java.util.Arrays;

import org.helma.javascript.RhinoEngine;
import org.helma.repository.FileRepository;

public class HelmaRunner {

    public static void main(String[] args) throws Exception {
        String scriptName = null;
        String[] scriptArgs = new String[0];
        boolean interactive = false;

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
            		interactive = true;
            	}
            }
            if (i < args.length) {
            	scriptName = args[i++];
                if (i < args.length) {
                	scriptArgs = Arrays.copyOfRange(args, i, args.length);
                }
            }
        }

        FileRepository home = new FileRepository(System.getProperty("helma.home", "."));
        HelmaConfiguration config = new HelmaConfiguration(home, scriptName);
        RhinoEngine engine = new RhinoEngine(config);
        if (scriptName != null) {
        	engine.runScript(scriptName, scriptArgs);
        }
        if (scriptName == null || interactive) {
        	new HelmaShell(engine).run();
        }
    }

    public static void printUsage() {
        System.out.println("Usage:");
        System.out.println("  java -jar run.jar [option] ... [file] [arg] ...");
        System.out.println("Options:");
        System.out.println("  -i, --interactive  : Start shell after script file has run");
        System.out.println("  -h, --help         : Display this help message");
    }
}
