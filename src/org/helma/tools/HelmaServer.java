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

import org.mortbay.jetty.Server;
import org.mortbay.jetty.servlet.Context;
import org.mortbay.jetty.servlet.ServletHolder;
import org.mortbay.jetty.handler.ContextHandlerCollection;
import org.mortbay.xml.XmlConfiguration;
import org.helma.util.StringUtils;
import org.helma.repository.Repository;
import org.helma.repository.Resource;

import java.io.File;
import java.util.Map;
import java.util.List;
import java.net.URL;

public class HelmaServer {

    public static void main(String[] args) throws Exception {
        String modulePath = ".,modules";
        if (args.length > 0) {
            if ("--help".equals(args[0]) || "-h".equals(args[0])) {
                printUsage();
                return;
            }
            modulePath = StringUtils.join(args, ",") + ",modules";
        }
        HelmaConfiguration config = new HelmaConfiguration(null, modulePath);
        List<Repository> repositories = config.getRepositories();
        boolean found = false;
        for (Repository repo: repositories) {
            Resource res = repo.getResource("main.js");
            if (res.exists()) {
                found = true;
                break;
            }
        }
        if (!found) {
            System.out.println("Error:");
            System.out.println("    File main.js not found in module path.");
            printUsage();
            return;
        }
        File configFile = new File(config.getHelmaHome(), "etc/jetty.xml");
        URL configUrl = new URL("file:" + configFile);
        XmlConfiguration xmlconfig = new XmlConfiguration(configUrl);
        Server server = new Server();
        xmlconfig.configure(server);
        Map idMap = xmlconfig.getIdMap();
        ContextHandlerCollection handler = (ContextHandlerCollection) idMap.get("Contexts");
        Context context = new Context(handler, "/", true, false);
        ServletHolder holder = context.addServlet("org.helma.web.HelmaServlet", "/*");
        holder.setInitParameter("helmaModulePath", modulePath);
        server.start();
    }

    public static void printUsage() {
        System.out.println("Usage:");
        System.out.println("    java -jar server.jar [APPDIR]");
    }
}
