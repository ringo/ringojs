package org.helma.repository;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;

public abstract class AbstractResource implements Resource {

    protected AbstractRepository repository;
    protected String path;
    protected String name;
    protected String baseName;

    protected void setBaseNameFromName(String name) {
        // base name is short name with extension cut off
        int lastDot = name.lastIndexOf(".");
        this.baseName = (lastDot == -1) ? name : name.substring(0, lastDot);
    }

    public String getPath() {
        return path;
    }

    public String getName() {
        return name;
    }

    public String getBaseName() {
        return baseName;
    }

    public Reader getReader() throws IOException {
        return new InputStreamReader(getInputStream());
    }

    public String getContent(String encoding) throws IOException {
        InputStream in = getInputStream();
        int size = (int) getLength();
        byte[] buf = new byte[size];
        int read = 0;
        while (read < size) {
            int r = in.read(buf, read, size - read);
            if (r == -1)
                break;
            read += r;
        }
        if (in != null)
            in.close();
        return encoding == null ?
                new String(buf) :
                new String(buf, encoding);
    }

    public String getContent() throws IOException {
        return getContent(null);
    }

    /**
     * Get the path of this resource relative to its root repository.
     *
     * @return the relative resource path
     */
    public String getRelativePath() {
        if (repository == null) {
            return name;
        } else {
            StringBuffer b = new StringBuffer();
            repository.getRelativePath(b);
            b.append(name);
            return b.toString();
        }
    }

    /**
     * Utility method to get the name for the module defined by this resource.
     *
     * @return the module name according to the securable module spec
     */
    public String getModuleName() {
        if (repository == null) {
            return baseName;
        } else {
            StringBuffer b = new StringBuffer();
            repository.getRelativePath(b);
            b.append(baseName);
            return b.toString();
        }
    }

    public long getChecksum() {
        return lastModified();
    }
}
