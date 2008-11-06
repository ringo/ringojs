package org.helma.repository;

import javax.servlet.ServletContext;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;

public class WebappResource extends AbstractResource {

    ServletContext context;

    protected WebappResource(ServletContext context, WebappRepository repository, String name) {
        this.context = context;
        this.repository = repository;
        this.name = name;
        this.path = repository.getPath() + name;
        setBaseNameFromName(name);
    }

    @Override
    public long lastModified() {
        return repository.lastModified();
    }

    @Override
    public boolean exists() {
        try {
            return context.getResource(path) != null;
        } catch (MalformedURLException mux) {
            return false;
        }
    }

    @Override
    public long getLength() {
        return 0;
    }

    @Override
    public InputStream getInputStream() throws IOException {
        return context.getResourceAsStream(path);
    }

    @Override
    public URL getUrl() throws MalformedURLException {
        return context.getResource(path);
    }

    @Override
    public Repository getParentRepository() {
        return repository;
    }
}
