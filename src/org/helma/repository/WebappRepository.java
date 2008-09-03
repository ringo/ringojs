package org.helma.repository;

import javax.servlet.ServletContext;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Set;
import java.net.URL;
import java.net.MalformedURLException;

public class WebappRepository extends AbstractRepository {

    ServletContext context;

    long timestamp;

    public WebappRepository(ServletContext context, String path) {
        this.context = context;
        this.parent = null;
        if (path == null) {
            path = "/";
        } else if (!path.endsWith("/")) {
            path = path + "/";
        }
        this.path = path;
        this.name = path;
        this.timestamp = System.currentTimeMillis();
    }

    protected WebappRepository(ServletContext context, WebappRepository parent, String name) {
        this.context = context;
        this.parent = parent;
        this.name = name;
        this.path = parent.path + name + "/";
        this.timestamp = parent.timestamp;
    }

    public long getChecksum() {
        return timestamp;
    }

    public long lastModified() {
        return timestamp;
    }

    public boolean exists() {
        if ("/".equals(path)) {
            return true;
        }
        Set paths = context.getResourcePaths(path);
        return (paths != null && !paths.isEmpty());
    }

    public Repository getChildRepository(String name) {
        return new WebappRepository(context, this, name);
    }

    public URL getUrl() throws MalformedURLException {
        return context.getResource(path);
    }

    public void update() {
        Set paths = context.getResourcePaths(path);
        if (paths != null) {

            ArrayList<Repository> newRepositories = new ArrayList<Repository>(paths.size());
            HashMap<String,Resource> newResources = new HashMap<String,Resource>(paths.size());

            for (Object obj: paths) {
                String path = (String) obj;
                if (path.endsWith("/")) {
                    int n = path.lastIndexOf('/', path.length() - 2);
                    String name = path.substring(n + 1, path.length() - 1);
                    newRepositories.add(new WebappRepository(context, this, name));
                } else {
                    int n = path.lastIndexOf('/', path.length() - 1);
                    String name = path.substring(n + 1);
                    newResources.put(name, new WebappResource(context, this, name));
                }
            }

            repositories = newRepositories.toArray(new Repository[newRepositories.size()]);
            resources = newResources;

        } else {
            repositories = emptyRepositories;
            resources = new HashMap<String,Resource>();
        }
    }

    protected Resource createResource(String name) {
        return new WebappResource(context, this, name);
    }
}
