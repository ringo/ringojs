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

import java.util.*;
import java.io.IOException;

/**
 * Provides common methods and fields for the default implementations of the
 * repository interface
 */
public abstract class AbstractRepository implements Repository {


    /**
     * Parent repository this repository is contained in.
     */
    Repository parent;

    /**
     * Holds direct child repositories
     */
    Repository[] repositories;

    /**
     * Holds mounted repositories
     */
    Map<String,Repository> mounted = new HashMap<String,Repository>();

    /**
     * Holds direct resources
     */
    Map<String,Resource> resources = new HashMap<String,Resource>();

    /**
     * Cached name for faster access
     */
    String name;

    /**
     * Cached short name for faster access
     */
    String shortName;

    /*
     * empty repository array for convenience
     */
    final static Repository[] emptyRepositories = new Repository[0]; 

    /**
     * Called to check the repository's content.
     */
    public abstract void update();

    /**
     * Called to create a child resource for this repository
     */
    protected abstract Resource createResource(String name);

    /**
     * Get the full name that identifies this repository globally
     */
    public String getName() {
        return name;
    }

    /**
     * Get the local name that identifies this repository locally within its
     * parent repository
     */
    public String getShortName() {
        return shortName;
    }

    /**
     * Get this repository's logical script root repository.
     *
     *@see {isScriptRoot()}
     */
    public Repository getRootRepository() {
        if (parent == null || isScriptRoot()) {
            return this;
        } else {
            return parent.getRootRepository();
        }
    }

    /**
     * Mount a child repository under the given path name.
     *
     * @param pathname the path name
     * @param child    the child element
     */
    public void mountRepository(Repository child, String pathname) {
        if (!child.equals(mounted.get(pathname)))
            mounted.put(pathname, child);
    }

    /**
     * Get a resource contained in this repository identified by the given local name.
     * If the name can't be resolved to a resource, a resource object is returned
     * for which {@link Resource exists()} returns <code>false<code>.
     */
    public synchronized Resource getResource(String path) {
        String[] subs = StringUtils.split(path, "/");
        if (subs.length == 1) {
            Resource res = resources.get(subs[0]);
            // if resource does not exist, create it
            if (res == null) {
                res = createResource(subs[0]);
                resources.put(subs[0], res);
            }
            return res;
        }
        Repository repository = this;
        int i = 0;
        while (i < subs.length - 1) {
            repository = repository.getChildRepository(subs[i++]);
        }
        return repository.getResource(subs[i]);
    }

    /**
     * Get a list of resources contained in this repository identified by the
     * given local name.
     * @param path the repository path
     * @return a list of all nested child resources
     */
    public List<Resource> getResources(String path) {
        String[] subs = StringUtils.split(path, "/");
        Repository repository = this;
        for (String sub: subs) {
            repository = repository.getChildRepository(sub);
        }
        if (!repository.exists()) {
            System.err.println("Warning: resource path doesn not exist: " + path);
        }
        try {
            return repository.getAllResources();
        } catch (IOException iox) {
            return Collections.EMPTY_LIST;
        }
    }

    /**
     * Get an iterator over the resources contained in this repository.
     */
    public synchronized Iterator<Resource> getResources() {
        update();
        return resources.values().iterator();
    }

    /**
     * Get an iterator over the sub-repositories contained in this repository.
     */
    public synchronized Repository[] getRepositories() {
        update();
        return repositories;
    }

    /**
     * Get this repository's parent repository.
     */
    public Repository getParentRepository() {
        return parent;
    }

    /**
     * Get a deep list of this repository's resources, including all resources
     * contained in sub-reposotories.
     */
    public synchronized List<Resource> getAllResources() throws IOException {
        update();
        ArrayList<Resource> allResources = new ArrayList<Resource>();
        allResources.addAll(resources.values());

        for (Repository repository: repositories) {
            allResources.addAll(repository.getAllResources());
        }

        return allResources;
    }

    /**
     * Returns the repositories full name as string representation.
     * @see {getName()}
     */
    public String toString() {
        return getName();
    }

}
