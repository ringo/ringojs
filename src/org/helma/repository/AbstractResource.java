package org.helma.repository;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;

public abstract class AbstractResource implements Resource {

    protected Repository repository;
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

    public long getChecksum() {
        return lastModified();
    }
}
