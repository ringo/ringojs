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
 * $RCSfile: AbstractRepository.java,v $
 * $Author: hannes $
 * $Revision: 1.7 $
 * $Date: 2006/04/07 14:37:11 $
 */

package org.helma.repository;

import org.helma.util.StringUtils;

import java.io.IOException;
import java.util.*;

/**
 * Provides common methods and fields for the default implementations of the
 * repository interface
 */
public abstract class AbstractRepository implements Repository {


    /**
     * Parent repository this repository is contained in.
     */
    AbstractRepository parent;

    /**
     * Cache for direct child repositories
     */
    Map<String, AbstractRepository> repositories = new WeakHashMap<String, AbstractRepository>();

    /**
     * Cache for direct resources
     */
    Map<String, AbstractResource> resources = new WeakHashMap<String, AbstractResource>();

    /**
     * Cached name for faster access
     */
    String path;

    /**
     * Cached short name for faster access
     */
    String name;

    /**
     * Called to create a child resource for this repository if it exists.
     * @param name the name of the child resource
     * @return the child resource, or null if no resource with the given name exists
     * @throws IOException an I/O error occurred
     */
    protected abstract Resource lookupResource(String name) throws IOException;

    /**
     * Add the repository's resources into the list, optionally descending into
     * nested repositories.
     * @param list the list to add the resources to
     * @param recursive whether to descend into nested repositories
     * @throws IOException an I/O related error occurred
     */
    protected abstract void getResources(List<Resource> list, boolean recursive)
            throws IOException;

    /**
     * Get the full name that identifies this repository globally
     */
    public String getPath() {
        return path;
    }

    /**
     * Get the local name that identifies this repository locally within its
     * parent repository
     */
    public String getName() {
        return name;
    }

    /**
     * Mark this repository as root repository.
     */
    public void setRoot() {
        parent = null;
    }

    /**
     * Get the path of this repository relative to its root repository.
     *
     * @return the repository path
     */
    public String getRelativePath() {
        if (parent == null) {
            return "";
        } else {
            StringBuffer b = new StringBuffer();
            getRelativePath(b);
            return b.toString();
        }
    }

    protected void getRelativePath(StringBuffer buffer) {
        if (parent != null) {
            parent.getRelativePath(buffer);
            buffer.append(name).append('/');
        } 
    }

    /**
     * Utility method to get the name for the module defined by this resource.
     *
     * @return the module name according to the securable module spec
     */
    public String getModuleName() {
        return getRelativePath();
    }

    /**
     * Get a resource contained in this repository identified by the given local name.
     * If the name can't be resolved to a resource, a resource object is returned
     * for which {@link Resource exists()} returns <code>false<code>.
     */
    public synchronized Resource getResource(String path) throws IOException {
        String[] ids = StringUtils.split(path, SEPARATOR);
        if (ids.length == 1) {
            return lookupResource(path);
        }
        Repository repository = this;
        for (int i = 0; i < ids.length - 1 && repository != null; i++) {
            repository = repository.getChildRepository(ids[i]);
        }
        return repository == null ? null : repository.getResource(ids[ids.length - 1]);
    }

    /**
     * Get this repository's parent repository.
     */
    public AbstractRepository getParentRepository() {
        if (parent == null) {
            throw new RuntimeException("Tried to escape root repository");
        }
        return parent;
    }

    /**
     * Get the repository's root repository
     */
    public Repository getRootRepository() {
        if (parent == null) {
            return this;
        }
        return parent.getRootRepository();
    }

    public Resource[] getResources() throws IOException {
        return getResources(false);
    }

    public Resource[] getResources(boolean recursive) throws IOException {
        List<Resource> list = new ArrayList<Resource>();
        getResources(list, recursive);
        return list.toArray(new Resource[list.size()]);
    }

    public Resource[] getResources(String resourcePath, boolean recursive)
            throws IOException {
        String[] subs = StringUtils.split(resourcePath, SEPARATOR);
        Repository repository = this;
        for (String sub : subs) {
            repository = repository.getChildRepository(sub);
            if (repository == null || !repository.exists()) {
                return new Resource[0];
            }
        }
        return repository.getResources(recursive);
    }

    /**
     * Returns the repositories full name as string representation.
     * @see {getName()}
     */
    public String toString() {
        return getPath();
    }

}
