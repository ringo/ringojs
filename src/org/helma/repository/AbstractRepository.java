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

import java.io.File;
import java.util.*;

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
     * Holds direct resources
     */
    Map<String,Resource> resources = new HashMap<String,Resource>();

    /**
     * Cached name for faster access
     */
    String path;

    /**
     * Cached short name for faster access
     */
    String name;

    /*
     * empty repository array for convenience
     */
    final static Repository[] emptyRepositories = new Repository[0];

    /**
     * String containing file separator characters. Always include slash character,
     * plus the native separator char if it isn't the slash.
     */
    final static String separator =
            File.separatorChar == '/' ? "/" : File.separator + "/";

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
     * Get a resource contained in this repository identified by the given local name.
     * If the name can't be resolved to a resource, a resource object is returned
     * for which {@link Resource exists()} returns <code>false<code>.
     */
    public synchronized Resource getResource(String path) {
        String[] subs = StringUtils.split(path, separator);
        if (subs.length == 1) {
            Resource resource = resources.get(subs[0]);
            if (resource != null) {
                return resource;
            }
            // if resource does not exist, create it
            return createResource(subs[0]);
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
     * @param recursive whether to include nested resources
     * @return a list of all nested child resources
     */
    public List<Resource> getResources(String path, boolean recursive) {
        String[] subs = StringUtils.split(path, separator);
        Repository repository = this;
        for (String sub: subs) {
            repository = repository.getChildRepository(sub);
        }
        if (!repository.exists()) {
            return Collections.emptyList();
        }
        return repository.getResources(recursive);
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
    public synchronized List<Resource> getResources(boolean recursive) {
        update();
        ArrayList<Resource> allResources = new ArrayList<Resource>();
        allResources.addAll(resources.values());

        if (recursive) {
            for (Repository repository: repositories) {
                allResources.addAll(repository.getResources(true));
            }
        }

        return allResources;
    }

    /**
     * Returns the repositories full name as string representation.
     * @see {getName()}
     */
    public String toString() {
        return getPath();
    }

}
