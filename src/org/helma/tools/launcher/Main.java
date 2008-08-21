/*
 *  Copyright 2006 Hannes Wallnoefer <hannes@helma.at>
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

package org.helma.tools.launcher;

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.URLDecoder;

/**
 * Main launcher class. This figures out the Helma home directory,
 * sets up the classpath, and launches one of the Helma tools.
 */
public class Main {
        
    /**
     * Helma boot method. This retrieves the Helma home directory, creates the
     * classpath and invokes main() in one of the helma tool classes.
     *
     * @param args command line arguments
     *
     */
    public static void main(String[] args) {
        try {
            File home = getHelmaHome();
            ClassLoader loader = createClassLoader(home);

            // set default log4j configuration file
            if (System.getProperty("log4j.configuration") == null) {
                File file = new File(home, "modules/helma/log4j.properties"); 
                System.setProperty("log4j.configuration", "file:" + file.getPath());
            }

            Class clazz = loader.loadClass("org.helma.tools.HelmaRunner");
            Class[] cargs = new Class[] {args.getClass()};
            Method main = clazz.getMethod("main", cargs);
            Object[] nargs = new Object[] {args};

            // and invoke the static main(String, String[]) method
            main.invoke(null, nargs);
        } catch (Exception x) {
            // unable to get Helma installation dir from launcher jar
            System.err.println("Uncaught exception: ");
            x.printStackTrace();
            System.exit(2);
        }
    }


    /**
     * Create a server-wide ClassLoader from our install directory.
     * This will be used as parent ClassLoader for all application
     * ClassLoaders.
     *
     * @param home the helma install directory
     * @return the main classloader we'll be using
     * @throws java.net.MalformedURLException
     */
    public static ClassLoader createClassLoader(File home)
            throws MalformedURLException {
        String classpath = System.getProperty("helma.classpath", "lib/**");
        String[] classes = classpath.split(",");
        HelmaClassLoader loader = new HelmaClassLoader(home, classes);

        // set the new class loader as context class loader
        Thread.currentThread().setContextClassLoader(loader);
        return loader;
    }


    /**
     * Get the Helma install directory.
     *
     * @return the base install directory we're running in
     * @throws IOException an I/O related exception occurred
     * @throws MalformedURLException the jar URL couldn't be parsed
     */
    public static File getHelmaHome()
            throws IOException, MalformedURLException {
        // check if home directory is set via system property
        String helmaHome = System.getProperty("helma.home");

        if (helmaHome == null) {

            URLClassLoader loader = (URLClassLoader)
                                       ClassLoader.getSystemClassLoader();
            URL launcherUrl = loader.findResource("org/helma/tools/launcher/Main.class");

            // this is a  JAR URL of the form
            //    jar:<url>!/{entry}
            // we strip away the jar: prefix and the !/{entry} suffix
            // to get the original jar file URL

            String jarUrl = launcherUrl.toString();
            // decode installDir in case it is URL-encoded
            try {
                jarUrl = URLDecoder.decode(jarUrl, System.getProperty("file.encoding"));
            } catch (UnsupportedEncodingException x) {
                System.err.println("Unable to decode jar URL: " + x);
            }

            if (!jarUrl.startsWith("jar:") || jarUrl.indexOf("!") < 0) {
                helmaHome = System.getProperty("user.dir");
                System.err.println("Warning: helma.home system property is not set ");
                System.err.println("         and not started from launcher.jar. Using ");
                System.err.println("         current working directory as install dir.");
            } else {
                int excl = jarUrl.indexOf("!");
                jarUrl = jarUrl.substring(4, excl);
                launcherUrl = new URL(jarUrl);
                helmaHome = new File(launcherUrl.getPath()).getParent();
                if (helmaHome == null) {
                    helmaHome = ".";
                }
            }
        }

        File home = new File(helmaHome).getCanonicalFile();
        // set System property
        System.setProperty("helma.home", home.getPath());
        return home;
    }

}
