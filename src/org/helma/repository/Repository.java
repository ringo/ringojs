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
 * $RCSfile: Repository.java,v $
 * $Author: hannes $
 * $Revision: 1.3 $
 * $Date: 2005/05/24 14:32:45 $
 */

package org.helma.repository;

import java.io.IOException;
import java.util.Iterator;
import java.util.List;

/**
 * Repository represents an abstract container of resources (e.g. code, skins, ...).
 * In addition to resources, repositories may contain other repositories, building
 * a hierarchical structure.
 */
public interface Repository extends Trackable {

    /**
     * Returns a specific direct resource of the repository
     *
     * @param resourceName name of the child resource to return
     * @return specified child resource
     */
    public Resource getResource(String resourceName);

    /**
     * Get a list of resources contained in this repository identified by the
     * given local name.
     * @param resourcePath the repository path
     * @param recursive whether to include nested resources
     * @return a list of all nested child resources
     */
    public List<Resource> getResources(String resourcePath, boolean recursive);


    /**
     * Get a list of resources contained in this repository identified by the
     * given local name.
     * @param recursive whether to include nested resources
     * @return a list of all nested child resources
     */
    public List<Resource> getResources(boolean recursive);

    /**
     * Returns this repository's direct child repositories
     *
     * @return direct repositories
     * @throws IOException an I/O error occurred
     */
    public Repository[] getRepositories() throws IOException;

    /**
     * Get a child repository with the given name
     * @param name the name of the repository
     * @return the child repository
     */
    public Repository getChildRepository(String name);

}