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

import org.apache.log4j.Logger;
import org.helma.repository.*;
import org.helma.util.StringUtils;
import org.helma.tools.launcher.HelmaClassLoader;
import org.mozilla.javascript.ClassShutter;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.List;

/**
 * This class describes the configuration for a Helma NG application or shell session.
 * @author hannes
 */
public class HelmaConfiguration {

    Repository home;
    List<Repository> repositories;
    String mainModule;
    int optimizationLevel = 0;
    int languageVersion = 180;
    Class<?>[] hostClasses = null;
    HelmaClassLoader loader;
    ClassShutter classShutter = null;
    boolean sealed = false;

    /**
     * Create a new Helma configuration and sets up its module search path.
     *
     * @param helmaHome the helma installation directory
     * @param modulePath the module search path as comma separated string
     * @param systemModules system module path to append to module path, or null
     * @throws FileNotFoundException if a moudule path item does not exist
     */
    public HelmaConfiguration(Repository helmaHome, String modulePath, String systemModules)
            throws FileNotFoundException {
        repositories = new ArrayList<Repository>();
        home = helmaHome;

        String optLevel = System.getProperty("rhino.optlevel");
        if (optLevel != null) {
            optimizationLevel = Integer.parseInt(optLevel);
        }
        String langVersion = System.getProperty("rhino.langversion");
        if (langVersion != null) {
            languageVersion = Integer.parseInt(langVersion);
        }

        if (modulePath != null) {
            String[] paths = StringUtils.split(modulePath, File.pathSeparator);
            for (int i = 0; i < paths.length; i++) {
                String path = paths[i].trim();
                Repository repo = home.getChildRepository(path);
                if (repo.exists()) {
                    repositories.add(repo);
                    continue;
                }
                File file = new File(path);
                if (!file.isAbsolute()) {
                    // if path is relative, try to resolve against current directory first,
                    // then relative to helma installation directory.
                    file = file.getAbsoluteFile();
                    if (!file.exists()) {
                        file = new File(home.getPath(), path);
                    }
                }
                if (!file.exists()) {
                    throw new FileNotFoundException("File '" + file + "' does not exist.");
                }
                if (path.toLowerCase().endsWith(".zip")) {
                    repositories.add(new ZipRepository(file));
                } else {
                    if (i == 0 && file.isFile()) {
                        Resource res = new FileResource(file);
                        mainModule = res.getBaseName();
                        repositories.add(res.getParentRepository());
                    } else {
                        repositories.add(new FileRepository(file));
                    }
                }
            }
        }

        // append system modules path relative to helma home
        if (systemModules != null) {
            Repository modules = home.getChildRepository(systemModules);
            repositories.add(modules);
        }

        Logger.getLogger("org.helma.tools").debug("Parsed repository list: " + repositories);
    }

    /**
     * If the scriptName argument is not null, prepend the script's parent repository
     * to the module path. Otherwise, prepend the current working directory to the module path.
     * @param scriptName the name of the script, or null.
     * @throws FileNotFoundException if the script repository does not exist
     */
    public void addScriptRepository(String scriptName) throws FileNotFoundException {
        // add script's parent directory to repository path,
        // or the current directory if no script is run
        if (scriptName != null) {
            Resource script = new FileResource(new File(scriptName));
            // check if the script can be found in the module path
            if (!script.exists() && !repositories.isEmpty()) {
                script = getResource(scriptName);
                if (!script.exists()) {
                    scriptName = scriptName.replace('.', File.separatorChar) + ".js";
                    script = getResource(scriptName);
                }
            } else {
                // found script file outside the module path, add its parent directory
                repositories.add(0, script.getParentRepository());
            }
            if (!script.exists()) {
                throw new FileNotFoundException("Can't find file " + scriptName);
            }
        } else {
            // no script file, add current directory to module search path
            repositories.add(0, new FileRepository(new File(".")));
        }
    }

    /**
     * Return the helma install directory
     * @return the helma home directory
     */
    public Repository getHelmaHome() {
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
     * Get the main resource of the configuration. This is the JavaScript file
     * we call the main function on to run the application.
     * @param defaultValue the default value to return in case the
     * main module name is not defined
     * @return the main module
     */
    public String getMainModule(String defaultValue) {
        return (mainModule == null)? defaultValue : mainModule;
    }

    /**
     * Set the host classes to be added to the Rhino engine.
     * @param classes a list of Rhino host classes
     */
    public void setHostClasses(Class<?>[] classes) {
        this.hostClasses = classes;
    }

    /**
     * Get the host classes to be added to the Rhino engine.
     * @return a list of Rhino host classes
     */
    public Class<?>[] getHostClasses() {
        return hostClasses;
    }

    /**
     * Get the Rhino optimization level
     * @return int value between -1 and 9
     */
    public int getOptLevel() {
        return optimizationLevel;
    }

    /**
     * Set the Rhino optimization level
     * @param optlevel int value between -1 and 9
     */
    public void setOptLevel(int optlevel) {
        this.optimizationLevel = optlevel;
    }

    /**
     * Get the desired JavaScript langauge version
     * @return int value between 0 and 180
     */
    public int getLanguageVersion() {
        return languageVersion;
    }

    /**
     * Get a resource from our script repository
     * @param path the resource path
     * @return the resource
     */
    public Resource getResource(String path) {
        for (Repository repo: repositories) {
            Resource res = repo.getResource(path);
            if (res.exists()) {
                return res;
            }
        }
        return repositories.get(0).getResource(path);
    }

    /**
     * Get a resource from our script repository
     * @param path the resource path
     * @return the resource
     */
    public Repository getRepository(String path) {
        for (Repository repo: repositories) {
            Repository repository = repo.getChildRepository(path);
            if (repository.exists()) {
                return repository;
            }
        }
        return repositories.get(0).getChildRepository(path);
    }

    /**
     * Get a list of all child resources for the given path relative to
     * our script repository.
     * @param path the repository path
     * @param recursive whether to include nested resources
     * @return a list of all contained child resources
     */
    public List<Resource> getResources(String path, boolean recursive) {
        List<Resource> list = new ArrayList<Resource>();
        for (Repository repo: repositories) {
            list.addAll(repo.getResources(path, recursive));
        }
        return list;
    }

    public ClassShutter getClassShutter() {
        return classShutter;
    }

    public void setClassShutter(ClassShutter classShutter) {
        this.classShutter = classShutter;
    }

    public boolean isSealed() {
        return sealed;
    }

    public void setSealed(boolean sealed) {
        this.sealed = sealed;
    }

}