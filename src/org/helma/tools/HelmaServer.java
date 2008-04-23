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
import org.mortbay.jetty.bio.SocketConnector;
import org.mortbay.xml.XmlConfiguration;
import org.helma.util.StringUtils;

import java.io.File;
import java.util.Map;
import java.net.URL;

public class HelmaServer {

    public static void main(String[] args) throws Exception {
        if (args.length == 0 || "-h".equals(args[0])) {
            printUsage();
            return;
        }
        String modulePath = ".,modules";
        if (args.length > 0) {
            modulePath = StringUtils.join(args, ",") + ",modules";
        }
        HelmaConfiguration helmaconfig = new HelmaConfiguration(null, null);
        File configFile = new File(helmaconfig.getHelmaHome(), "etc/jetty.xml");
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
        System.err.println("Simply pass one or more application directories as command line arguments.");
    }
}
