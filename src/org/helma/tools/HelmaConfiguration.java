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
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Collections;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * This class describes the configuration for a Helma NG application or shell session.
 * @author hannes
 */
public class HelmaConfiguration {

    private Repository home;
    private List<Repository> repositories;
    private Resource mainResource;
    private String[] arguments;
    private int optimizationLevel = 0;
    private int languageVersion = 180;
    private boolean parentProtoProperties = false;
    private Class<?>[] hostClasses = null;
    private HelmaClassLoader loader;
    private ClassShutter classShutter = null;
    private List<String> bootstrapScripts;
    private boolean sealed = false;
    private boolean policyEnabled = false;

    /**
     * Create a new Helma configuration and sets up its module search path.
     *
     * @param helmaHome the helma installation directory
     * @param modulePath the module search path as comma separated string
     * @param systemModules system module path to append to module path, or null
     * @throws FileNotFoundException if a moudule path item does not exist
     */
    public HelmaConfiguration(Repository helmaHome, String[] modulePath, String systemModules)
            throws IOException {
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
        String parentProto = System.getProperty("rhino.parentproto");
        if (parentProto != null) {
            parentProtoProperties = Integer.parseInt(parentProto) != 0;
        }

        if (modulePath != null) {
            for (int i = 0; i < modulePath.length; i++) {
                String path = modulePath[i].trim();
                Repository repository = resolveRootRepository(path);
                if (repository != null && repository.exists()) {
                    repositories.add(repository);
                } else {
                    System.err.println("Cannot resolve module path entry: " + path);
                }
            }
        }

        // append system modules path relative to helma home
        if (systemModules != null) {
            Repository repository = resolveRootRepository(systemModules);
                if (repository != null && repository.exists()) {
                    repositories.add(repository);
                } else {
                    System.err.println("Cannot resolve system module root: " + systemModules);
                }
        }

        // now that repositories are set up try to set default log4j configuration file
        if (System.getProperty("log4j.configuration") == null) {
            Resource log4jConfig = getResource("config/log4j.properties");
            try {
                System.setProperty("log4j.configuration", log4jConfig.getUrl().toString());
            } catch (MalformedURLException x) {
                System.setProperty("log4j.configuration", "file:" + log4jConfig.getPath());
            }
        }
        getLogger().debug("Parsed repository list: " + repositories);
    }

    /**
     * Resolve a module repository path.
     * @param path the path
     * @return a repository
     * @throws FileNotFoundException if the path couldn't be resolved
     */
    public Repository resolveRootRepository(String path) throws IOException {
        Repository repository = home.getChildRepository(path);
        if (repository != null && repository.exists()) {
            repository.setRoot();
            return repository;
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
            return new ZipRepository(file);
        } else {
            return new FileRepository(file);
        }
    }

    /**
     * Set the main script for this configuration. If the scriptName argument is not null,
     * we check whether the script is already contained in the helma module path.
     *
     * If not, the script's parent repository is prepended to the module path. If scriptName is
     * null, we prepend the current working directory to the module path.
     * @param scriptName the name of the script, or null.
     * @throws FileNotFoundException if the script repository does not exist
     */
    public void setMainScript(String scriptName) throws IOException {
        if (scriptName != null) {
            // check if the script is a zip file
            if (scriptName.toLowerCase().endsWith(".zip")) {
                ZipRepository zipRepo = new ZipRepository(new File(scriptName));
                mainResource = zipRepo.getResource("main.js");
                if (mainResource.exists()) {
                    repositories.add(0, zipRepo);
                    return;
                }
            }
            // check if script is a path within a zip file
            int zip = scriptName.toLowerCase().indexOf(".zip/");
            if (zip > -1) {
                String zipFile = scriptName.substring(0, zip + 4);
                String scriptPath = scriptName.substring(zip + 5);
                ZipRepository zipRepo = new ZipRepository(new File(zipFile));
                mainResource = zipRepo.getResource(scriptPath);
                if (mainResource.exists()) {
                    repositories.add(0, zipRepo);
                    return;
                }
            }
            // check if the script exists as a standalone file
            Resource script = new FileResource(new File(scriptName));
            if (script.exists()) {
                // check if we are contained in one of the existing repositories
                String scriptPath = script.getPath();
                for (Repository repo : repositories) {
                    if (repo instanceof FileRepository && scriptPath.indexOf(repo.getPath()) == 0) {
                        // found a repository that contains main script - use it as base for module name
                        script = repo.getResource(scriptPath.substring(repo.getPath().length()));
                        mainResource = script;
                        return;
                    }
                }
                // not found in the existing repositories - add parent as first element of module path
                repositories.add(0, script.getParentRepository());
                mainResource = script;
            } else {
                // check if the script can be found in the module path
                script = getResource(scriptName);
                if (!script.exists()) {
                    // try converting module name to file path and lookup in module path
                    script = getResource(scriptName + ".js");
                }
                if (!script.exists()) {
                    // try to resolve script as module name in current directory
                    Repository current = new FileRepository(new File(System.getProperty("user.dir")));
                    script = current.getResource(scriptName + ".js");
                    if (!script.exists()) {
                        // no luck resolving the script name, give up
                        throw new FileNotFoundException("Can't find file " + scriptName);
                    }
                    // found as module name in current directory, so add it to module path
                    repositories.add(0, current);
                }
                // found the script, so set mainModule
                mainResource = script;
            }
        } else {
            // no script file, add current directory to module path
            File currentDir = new File(System.getProperty("user.dir"));
            repositories.add(0, new FileRepository(currentDir));
        }
    }

    /**
     * Get the main script resource resolved by calling {@link #setMainScript(String)}.
     * @return the main script resource, or null
     */
    public Resource getMainResource() {
        return mainResource;
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
        return (mainResource == null)? defaultValue : mainResource.getModuleName();
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
     * Get the flag to enable __parent__ and __proto__ properties on JS objects
     * @return true if __parent__ and __proto__ properties should be enabled
     */
    public boolean hasParentProtoProperties() {
        return parentProtoProperties;
    }

    /**
     * Set the flag to enable __parent__ and __proto__ properties on JS objects
     * @param flag true to enable __parent__ and __proto__ properties
     */
    public void setParentProtoProperties(boolean flag) {
        this.parentProtoProperties = flag;
    }

    /**
     * Get a resource from our script repository
     * @param path the resource path
     * @return the resource
     */
    public Resource getResource(String path) throws IOException {
        for (Repository repo: repositories) {
            Resource res = repo.getResource(path);
            if (res != null && res.exists()) {
                return res;
            }
        }
        return new NotFound(path);
    }

    /**
     * Get a resource from our script repository
     * @param path the resource path
     * @return the resource
     */
    public Repository getRepository(String path) throws IOException {
        for (Repository repo: repositories) {
            Repository repository = repo.getChildRepository(path);
            if (repository.exists()) {
                return repository;
            }
        }
        return null;
    }

    /**
     * Get a list of all child resources for the given path relative to
     * our script repository.
     * @param path the repository path
     * @param recursive whether to include nested resources
     * @return a list of all contained child resources
     */
    public List<Resource> getResources(String path, boolean recursive) throws IOException {
        List<Resource> list = new ArrayList<Resource>();
        for (Repository repo: repositories) {
            Collections.addAll(list, repo.getResources(path, recursive));
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

    public boolean isPolicyEnabled() {
        return policyEnabled;
    }

    public void setPolicyEnabled(boolean hasPolicy) {
        this.policyEnabled = hasPolicy;
    }

    public List<String> getBootstrapScripts() {
        return bootstrapScripts;
    }

    public String[] getArguments() {
        return arguments;
    }

    public void setArguments(String[] arguments) {
        this.arguments = arguments;
    }

    public void setBootstrapScripts(List<String> bootstrapScripts) {
        this.bootstrapScripts = bootstrapScripts;
    }

    private Logger getLogger() {
        return Logger.getLogger("org.helma.tools");
    }

}

class NotFound extends AbstractResource {

    NotFound(String path) {
        this.path = path;
        int slash = path.lastIndexOf('/');
        this.name = slash < 0 ? path : path.substring(slash + 1);
        setBaseNameFromName(name);
    }

    public long getLength() {
        return 0;
    }

    public InputStream getInputStream() throws IOException {
        throw new FileNotFoundException("\"" + path + "\" not found");
    }

    public long lastModified() {
        return 0;
    }

    public boolean exists() {
        return false;
    }

    public URL getUrl() throws UnsupportedOperationException, MalformedURLException {
        throw new MalformedURLException("Unable to resolve \"" + path + "\"");
    }

    public String toString() {
        return "Resource \"" + path + "\"";
    }
}
