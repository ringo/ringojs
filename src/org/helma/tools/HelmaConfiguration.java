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
import org.helma.repository.ZipRepository;
import org.helma.util.StringUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.List;

public class HelmaConfiguration {

    File home;
    List<Repository> repositories;
    Class[] hostClasses = null;
    org.helma.tools.launcher.HelmaClassLoader loader;

    public HelmaConfiguration()
            throws FileNotFoundException  {
        this(null, null);
    }

    public HelmaConfiguration(String helmaHome)
            throws FileNotFoundException {
        this(helmaHome, null);
    }

    public HelmaConfiguration(String helmaHome, String helmaModulePath)
            throws FileNotFoundException {
        if (helmaHome == null) {
            helmaHome = System.getProperty("helma.home", "");
        }
        home = new File(helmaHome);
        if (!home.isAbsolute()) {
            home = home.getAbsoluteFile();
        }
        repositories = new ArrayList<Repository>();

        if (helmaModulePath == null) {
            helmaModulePath = System.getProperty("helma.modulepath", ".");
        }
        String[] reps = StringUtils.split(helmaModulePath, ",");
        for (String rep: reps) {
            rep = rep.trim();
            File file = new File(rep);
            if (!file.isAbsolute()) {
                // if path is relative, try to resolve against current directory first,
                // then relative to helma installation directory.
                file = file.getAbsoluteFile();
                if (!file.exists()) {
                    file = new File(home, rep);
                }
            }
            if (!file.exists()) {
                throw new FileNotFoundException("File '" + file + "' does not exist.");
            }
            if (rep.toLowerCase().endsWith(".zip")) {
                repositories.add(new ZipRepository(file));
            } else {
                repositories.add(new FileRepository(file));
            }
        }
        // always add modules from helma home
        repositories.add(new FileRepository(new File(home, "modules")));
        // System.err.println("Parsed repository list: " + repositories);
    }

    /**
     * Return the helma install directory
     * @return the helma home directory
     */
    public File getHelmaHome() {
        return home;
    }

    /**
     * Get a list of repositoris from the given helmaHome and helmaPath settings
     * using the helma.home and helma.path system properties as fallback.
     * @return a list of repositories matching the arguments and/or system properties
     */
    public List<Repository> getRepositories() {
        return repositories;
    }

    /**
     * Set the host classes to be added to the Rhino engine.
     * @param classes a list of Rhino host classes
     */
    public void setHostClasses(Class[] classes) {
        this.hostClasses = classes;
    }

    /**
     * Create a new RhinoEngine with the settings defined by this configuration.
     * @return a new RhinoEngine
     */
    public RhinoEngine createEngine() {
        return new RhinoEngine(repositories, hostClasses);
    }


}
