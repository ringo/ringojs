/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2003 Helma Software. All Rights Reserved.
 *
 * $RCSfile: FileResource.java,v $
 * $Author: hannes $
 * $Revision: 1.8 $
 * $Date: 2006/04/07 14:37:11 $
 */

package org.helma.repository;

import java.io.*;
import java.net.MalformedURLException;
import java.net.URL;

public class FileResource implements Resource {

    File file;
    Repository repository;
    String path;
    String name;
    String baseName;
    boolean stripShebang = false;

    public FileResource(File file) {
        this(file, null);
    }

    protected FileResource(File file, Repository repository) {
        // make sure our directory has an absolute path,
        // see http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
        try {
            file = file.getCanonicalFile();
        } catch (IOException iox) {
            file = file.getAbsoluteFile();
        }

        this.file = file;
        this.repository = repository == null ?
                new FileRepository(file.getParentFile()) : repository;
        path = file.getPath();
        name = file.getName();
        // base name is short name with extension cut off
        int lastDot = name.lastIndexOf(".");
        baseName = (lastDot == -1) ? name : name.substring(0, lastDot);
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

    public InputStream getInputStream() throws IOException {
        InputStream stream = new FileInputStream(file);
        if (stripShebang) {
            stream = new BufferedInputStream(stream);
            stream.mark(2);
            if (stream.read() == '#' && stream.read() == '!') {
                // skip a line: a line is terminated by \n or \r or \r\n (just as
                // in BufferedReader#readLine)
                for (int c = stream.read(); c != -1; c = stream.read()) {
                    if (c == '\n')
                        break;
                    if (c == '\r') {
                        stream.mark(1);
                        if (stream.read() != '\n')
                            stream.reset();
                        break;
                    }
                }
            } else {
                stream.reset();
            }
        }
        return stream;
    }

    public Reader getReader() throws IOException {
        return new InputStreamReader(getInputStream());
    }

    public URL getUrl() throws MalformedURLException {
        return new URL("file:" + file.getAbsolutePath());
    }

    public long lastModified() {
        return file.lastModified();
    }

    public long getChecksum() {
        return lastModified();
    }

    public String getContent(String encoding) throws IOException {
        InputStream in = getInputStream();
        int size = (int) file.length();
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

    public long getLength() {
        return file.length();
    }

    public boolean exists() {
        return file.exists();
    }

    public Repository getParentRepository() {
        return repository;
    }


    public boolean getStripShebang() {
        return stripShebang;
    }

    public void setStripShebang(boolean stripShebang) {
        this.stripShebang = stripShebang;
    }

    public int hashCode() {
        return 17 + path.hashCode();
    }

    public boolean equals(Object obj) {
        return obj instanceof FileResource && path.equals(((FileResource)obj).path);
    }

    public String toString() {
        return getPath();
    }
}
