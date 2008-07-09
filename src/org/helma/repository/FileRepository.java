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
 * $RCSfile: FileRepository.java,v $
 * $Author: hannes $
 * $Revision: 1.14 $
 * $Date: 2006/04/07 14:37:11 $
 */

package org.helma.repository;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * Repository implementation for directories providing file resources
 */
public class FileRepository extends AbstractRepository {

    // Directory serving sub-repositories and file resources
    protected File directory;

    protected long lastModified = -1;
    protected long lastChecksum = 0;
    protected long lastChecksumTime = 0;

    /**
     * Defines how long the checksum of the repository will be cached
     */
    final long cacheTime = 1000L;

    /**
     * Constructs a FileRepository using the given argument
     * @param initArgs absolute path to the directory
     */
    public FileRepository(String initArgs) {
        this(new File(initArgs), null);
    }

    /**
     * Constructs a FileRepository using the given directory as top-level
     * repository
     * @param dir directory
     */
    public FileRepository(File dir) {
        this(dir, null);
    }

    /**
     * Constructs a FileRepository using the given directory and top-level
     * repository
     * @param dir directory
     * @param parent top-level repository
     */
    protected FileRepository(File dir, FileRepository parent) {
        // make sure our directory has an absolute path,
        // see http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
        try {
            directory = dir.getCanonicalFile();
        } catch (IOException iox) {
            directory = dir.getAbsoluteFile();
        }

        if (parent == null) {
            path = name = directory.getAbsolutePath();
        } else {
            this.parent = parent;
            name = directory.getName();
            path = directory.getAbsolutePath();
        }
    }

    /**
     * Check whether the repository exists.
     * @return true if the repository exists.
     */
    public boolean exists() {
        return directory.exists() && directory.isDirectory();
    }

    /**
     * Get a child repository with the given name
     *
     * @param name the name of the repository
     * @return the child repository
     */
    public Repository getChildRepository(String name) {
        return new FileRepository(new File(directory, name), this);
    }

    /**
     * Returns the date the repository was last modified.
     *
     * @return last modified date
     */
    public long lastModified() {
        return directory.lastModified();
    }

    /**
     * Checksum of the repository and all its contained resources. Implementations
     * should make sure to return a different checksum if any contained resource
     * has changed.
     *
     * @return checksum
     * @throws IOException an I/O error occurred
     */
    public synchronized long getChecksum() {
        // delay checksum check if already checked recently
        if (System.currentTimeMillis() > lastChecksumTime + cacheTime) {

            update();
            long checksum = lastModified;

            for (Resource res: resources.values()) {
                checksum += res.lastModified();
            }

            lastChecksum = checksum;
            lastChecksumTime = System.currentTimeMillis();
        }

        return lastChecksum;
    }

    /**
     * Updates the content cache of the repository
     * Gets called from within all methods returning sub-repositories or
     * resources
     */
    public synchronized void update() {
        if (!directory.exists()) {
            repositories = emptyRepositories;
            if (resources == null) {
                resources = new HashMap<String,Resource>();
            } else {
                resources.clear();
            }
            lastModified = 0;
            return;
        }

        if (directory.lastModified() != lastModified) {
            lastModified = directory.lastModified();

            File[] list = directory.listFiles();

            ArrayList<Repository> newRepositories = new ArrayList<Repository>(list.length);
            HashMap<String,Resource> newResources = new HashMap<String,Resource>(list.length);

            for (File file: list) {
                if (file.isDirectory()) {
                    // a nested directory aka child file repository
                    newRepositories.add(new FileRepository(file, this));
                } else if (file.getName().endsWith(".zip")) {
                    // a nested zip repository
                    newRepositories.add(new ZipRepository(file, this));
                } else if (file.isFile()) {
                    // a file resource
                    FileResource resource = new FileResource(file, this);
                    newResources.put(resource.getName(), resource);
                }
            }

            repositories = newRepositories.toArray(new Repository[newRepositories.size()]);
            resources = newResources;
        }
    }

    /**
     * Called to create a child resource for this repository
     */
    protected Resource createResource(String name) {
        return new FileResource(new File(directory, name), this);
    }

    /**
     * Get the repository's directory
     */
    public File getDirectory() {
        return directory;
    }

    public int hashCode() {
        return 17 + (37 * directory.hashCode());
    }

    public boolean equals(Object obj) {
        return obj instanceof FileRepository &&
               directory.equals(((FileRepository) obj).directory);
    }

    public String toString() {
        return new StringBuffer("FileRepository[").append(path).append("]").toString();
    }
}
