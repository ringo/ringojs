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

public class FileResource extends AbstractResource {

    File file;

    public FileResource(File file) throws IOException {
        this(file, null);
    }

    protected FileResource(File file, FileRepository repository) throws IOException {
        // make sure our directory has an absolute path,
        // see http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
        file = file.getCanonicalFile();

        this.file = file;
        this.repository = repository == null ?
                new FileRepository(file.getParentFile()) : repository;
        path = file.getPath();
        name = file.getName();
        // base name is short name with extension cut off
        int lastDot = name.lastIndexOf(".");
        baseName = (lastDot == -1) ? name : name.substring(0, lastDot);
    }

    public InputStream getInputStream() throws IOException {
        return stripShebang(new FileInputStream(file));
    }

    public URL getUrl() throws MalformedURLException {
        return new URL("file:" + file.getAbsolutePath());
    }

    public long lastModified() {
        return file.lastModified();
    }

    public long getLength() {
        return file.length();
    }

    public boolean exists() {
        return file.exists();
    }

    @Override
    public int hashCode() {
        return 17 + path.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof FileResource && path.equals(((FileResource)obj).path);
    }

    @Override
    public String toString() {
        return getPath();
    }
}
