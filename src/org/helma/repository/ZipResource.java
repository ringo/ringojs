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
 * $RCSfile: ZipResource.java,v $
 * $Author: hannes $
 * $Revision: 1.7 $
 * $Date: 2005/12/19 22:15:11 $
 */

package org.helma.repository;

import java.io.*;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public final class ZipResource implements Resource {

    private String entryName;
    private ZipRepository repository;
    private String path;
    private String name;
    private String baseName;

    protected ZipResource(String zipentryName, ZipRepository repository) {
        this.entryName = zipentryName;
        this.repository = repository;

        int lastSlash = entryName.lastIndexOf('/');

        name = entryName.substring(lastSlash + 1);
        path = new StringBuffer(repository.getPath()).append('/')
                .append(name).toString();

        // base name is short name with extension cut off
        int lastDot = name.lastIndexOf(".");
        baseName = (lastDot == -1) ? name : name.substring(0, lastDot);
    }

    @Override
    public long lastModified() {
        return repository.lastModified();
    }

    @Override
    public long getChecksum() {
        return repository.lastModified();
    }

    @Override
    public InputStream getInputStream() throws IOException {
        ZipFile zipfile = null;
        try {
            zipfile = repository.getZipFile();
            ZipEntry entry = zipfile.getEntry(entryName);
            if (entry == null) {
                throw new IOException("Zip resource " + this + " does not exist");
            }
            int size = (int) entry.getSize();
            byte[] buf = new byte[size];
            InputStream in = zipfile.getInputStream(entry);
            int read = 0;
            while (read < size) {
                int r = in.read(buf, read, size-read);
                if (r == -1)
                    break;
                read += r;
            }
            in.close();
            return new ByteArrayInputStream(buf);
        } finally {
            try {
                if (zipfile != null) zipfile.close();
            } catch (Exception ex) {
                // ignore exception in close
            }
        }
    }

    @Override
    public Reader getReader() throws IOException {
        return new InputStreamReader(getInputStream());
    }

    @Override
    public boolean exists() {
        ZipFile zipfile = null;
        try {
            zipfile = repository.getZipFile();
            return (zipfile.getEntry(entryName) != null);
        } catch (Exception ex) {
            return false;
        } finally {
            try {
                if (zipfile != null) zipfile.close();
            } catch (Exception ex) {
                // ignore exception in close
            }
        }
    }

    @Override
    public String getContent(String encoding) throws IOException {
        ZipFile zipfile = null;
        try {
            zipfile = repository.getZipFile();
            ZipEntry entry = zipfile.getEntry(entryName);
            if (entry == null) {
                return "";
            }
            InputStream in = zipfile.getInputStream(entry);
            int size = (int) entry.getSize();
            byte[] buf = new byte[size];
            int read = 0;
            while (read < size) {
                int r = in.read(buf, read, size-read);
                if (r == -1)
                    break;
                read += r;
            }
            in.close();
            return encoding == null ?
                    new String(buf) :
                    new String(buf, encoding);
        } finally {
            if (zipfile != null) {
                zipfile.close();
            }
        }
    }

    @Override
    public String getContent() throws IOException {
        return getContent(null);
    }

    @Override
    public String getPath() {
        return path;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public String getBaseName() {
        return baseName;
    }

    @Override
    public URL getUrl() {
        // TODO: we might want to return a Jar URL
        // http://java.sun.com/j2se/1.5.0/docs/api/java/net/JarURLConnection.html
        throw new UnsupportedOperationException("getUrl() not implemented for ZipResource");
    }

    @Override
    public long getLength() {
        ZipFile zipfile = null;
        try {
            zipfile = repository.getZipFile();
            return zipfile.getEntry(entryName).getSize();            
        } catch (Exception ex) {
            return 0;
        } finally {
            try {
                if (zipfile != null) zipfile.close();
            } catch (Exception ex) {
                // ignore exception in close
            }
        }
    }

    @Override
    public Repository getParentRepository() {
        return repository;
    }

    @Override
    public int hashCode() {
        return 17 + path.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof ZipResource && path.equals(((ZipResource) obj).path);
    }

    @Override
    public String toString() {
        return getPath();
    }
}
