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

import org.ringojs.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.ringojs.repository.*;
import org.mozilla.javascript.ClassShutter;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Collections;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * This class describes the configuration for a RingoJS application or shell session.
 * @author hannes
 */
public class RingoConfiguration {

    private Repository home;
    private List<Repository> repositories;
    private Resource mainResource;
    private String[] arguments;
    private int optimizationLevel = 0;
    private boolean strictVars = true;
    private boolean debug = false;
    private boolean verbose = false;
    private int languageVersion = 180;
    private boolean parentProtoProperties = false;
    private Class<?>[] hostClasses = null;
    private ClassShutter classShutter = null;
    private List<String> bootstrapScripts;
    private boolean sealed = false;
    private boolean policyEnabled = false;
    private boolean reloading = true;
    private String charset = "UTF-8";

    /**
     * Create a new Ringo configuration and sets up its module search path.
     *
     * @param ringoHome the ringo installation directory
     * @param modulePath the module search path as comma separated string
     * @param systemModules system module path to append to module path, or null
     * @throws FileNotFoundException if a moudule path item does not exist
     */
    public RingoConfiguration(Repository ringoHome, String[] modulePath, String systemModules)
            throws IOException {
        repositories = new ArrayList<Repository>();
        home = ringoHome;
        home.setAbsolute(true);

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
            for (String aModulePath : modulePath) {
                String path = aModulePath.trim();
                addModuleRepository(resolveRootRepository(path));
            }
        }

        // append system modules path relative to ringo home
        if (systemModules != null) {
            addModuleRepository(resolveRootRepository(systemModules));
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

    public void addModuleRepository(Repository repository) throws IOException {
        if (repository != null && repository.exists()) {
            repository.setRoot();
            repositories.add(repository);
        } else {
            throw new FileNotFoundException(repository.getPath());
        }
    }

    /**
     * Resolve a module repository path.
     * @param path the path
     * @return a repository
     * @throws FileNotFoundException if the path couldn't be resolved
     */
    public Repository resolveRootRepository(String path) throws IOException {
        File file = new File(path);
        if (!file.isAbsolute()) {
            // Try to resolve as installation repository child first
            Repository repository = home.getChildRepository(path);
            if (repository != null && repository.exists()) {
                repository.setRoot();
                return repository;
            }
            // Try to resolve path as classpath resource
            URL url = RingoConfiguration.class.getResource("/" + path);
            if (url != null && "jar".equals(url.getProtocol())) {
                String jar = url.getPath();
                int excl = jar.indexOf("!");

                if (excl > -1) {
                    url = new URL(jar.substring(0, excl));
                    if ("file".equals(url.getProtocol())) {
                        jar = url.getPath();
                        try {
                            jar = URLDecoder.decode(jar, System.getProperty("file.encoding"));
                        } catch (UnsupportedEncodingException x) {
                            System.err.println("Unable to decode jar URL: " + x);
                        }
                        repository = new ZipRepository(jar).getChildRepository(path);
                        if (repository.exists()) {
                            repository.setRoot();
                            return repository;
                        }
                    }
                }
            }
            // then try to resolve against current directory
            file = file.getAbsoluteFile();
        }
        if (!file.exists()) {
            throw new FileNotFoundException("File '" + file + "' does not exist.");
        }
        if (file.isFile() && StringUtils.isZipOrJarFile(path)) {
            return new ZipRepository(file);
        } else {
            return new FileRepository(file);
        }
    }

    /**
     * Set the main script for this configuration. If the scriptName argument is not null,
     * we check whether the script is already contained in the ringo module path.
     *
     * If not, the script's parent repository is prepended to the module path. If scriptName is
     * null, we prepend the current working directory to the module path.
     * @param scriptName the name of the script, or null.
     * @throws FileNotFoundException if the script repository does not exist
     */
    public void setMainScript(String scriptName) throws IOException {
        if (scriptName != null) {
            File file = new File(scriptName);
            // check if the script is a zip file
            if (file.isFile() && StringUtils.isZipOrJarFile(scriptName)) {
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
            Resource script = new FileResource(file);
            if (script.exists()) {
                // check if we are contained in one of the existing repositories
                String scriptPath = script.getPath();
                for (Repository repo : repositories) {
                    if (repo instanceof FileRepository && scriptPath.indexOf(repo.getPath()) == 0) {
                        // found a repository that contains main script - use it as base for module name
                        // reparent to make sure script resource is relative to parent                        
                        mainResource = repo.getResource(scriptPath.substring(repo.getPath().length()));
                        return;
                    }
                }
                // not found in the existing repositories - note that we do not add
                // parent directory as first element of module path anymore.
                // Instead, the script is set to absolute mode so module id will return the absolute path
                script.setAbsolute(true);
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
     * Return the ringo install directory
     * @return the ringo home directory
     */
    public Repository getRingoHome() {
        return home;
    }

    /**
     * Get a list of repositoris from the given ringoHome and ringoPath settings
     * using the ringo.home and ringo.path system properties as fallback.
     * @return a list of repositories matching the arguments and/or system properties
     */
    public List<Repository> getRepositories() {
        return repositories;
    }

    /**
     * Get the module name of the main resource of the configuration.
     * @return the name of the main module
     */
    public String getMainModule() {
        return (mainResource == null)? null : mainResource.getModuleName();
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

    public boolean getDebug() {
        return debug;
    }

    public void setDebug(boolean debug) {
        this.debug = debug;
        if (debug) {
            setOptLevel(-1);
        }
    }

    public boolean isVerbose() {
        return verbose;
    }

    public void setVerbose(boolean verbose) {
        this.verbose = verbose;
    }

    public boolean getStrictVars() {
        return strictVars;
    }

    public void setStrictVars(boolean strictVars) {
        this.strictVars = strictVars;
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
     * @throws IOException an I/O error occurred
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
     * @throws IOException an I/O error occurred
     */
    public Repository getRepository(String path) throws IOException {
        for (Repository repo: repositories) {
            Repository repository = repo.getChildRepository(path);
            if (repository != null && repository.exists()) {
                return repository;
            }
        }
        return new FileRepository(path);
    }

    /**
     * Get a list of all child resources for the given path relative to
     * our script repository.
     * @param path the repository path
     * @param recursive whether to include nested resources
     * @return a list of all contained child resources
     * @throws IOException an I/O error occurred
     */
    public List<Resource> getResources(String path, boolean recursive) throws IOException {
        List<Resource> list = new ArrayList<Resource>();
        for (Repository repo: repositories) {
            Collections.addAll(list, repo.getResources(path, recursive));
        }
        return list;
    }

    public String getCharset() {
        return charset;
    }

    public void setCharset(String charset) {
        this.charset = charset;
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

    public boolean isReloading() {
        return reloading;
    }

    public void setReloading(boolean reloading) {
        this.reloading = reloading;
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
        return LoggerFactory.getLogger("org.ringojs.tools");
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
