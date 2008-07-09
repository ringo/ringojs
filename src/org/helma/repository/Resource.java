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
 * $RCSfile: Resource.java,v $
 * $Author: hannes $
 * $Revision: 1.4 $
 * $Date: 2005/12/19 22:15:11 $
 */

package org.helma.repository;

import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * Resource represents a pointer to some kind of information (code, skin, ...)
 * from which the content can be fetched
 */
public interface Resource {

    /**
     * Returns the date the resource was last modified
     * @return last modified date
     */
    public long lastModified();

    /**
     * Checks wether this resource actually (still) exists
     * @return true if the resource exists
     */
    public boolean exists();

    /**
     * Returns the lengh of the resource's content
     * @return content length
     */
    public long getLength();

    /**
     * Returns an input stream to the content of the resource
     * @throws IOException if a I/O related error occurs
     * @return content input stream
     */
    public InputStream getInputStream() throws IOException;

    /**
     * Returns a reader for the resource
     * @return the reader
     * @throws IOException if a I/O related error occurs
     */
    public Reader getReader() throws IOException;

    /**
     * Returns the content of the resource in a given encoding
     * @param encoding
     * @return content
     */
    public String getContent(String encoding) throws IOException;

    /**
     * Returns the content of the resource
     * @return content
     */
    public String getContent() throws IOException;

    /**
     * Returns the path of the resource.
     * @return path of the resource
     */
    public String getPath();

    /**
     * Returns the short name of the resource.
     * @return short name of the resource
     */
    public String getName();

    /**
     * Returns the short name of the resource with the file extension
     * (everything following the last dot character) cut off.
     * @return the file name without the file extension
     */
    public String getBaseName();

    /**
     * Returns an url to the resource if the repository of this resource is
     * able to provide urls
     * @return url to the resource
     */
    public URL getUrl() throws UnsupportedOperationException, MalformedURLException;

    /**
     * Returns the repository the resource does belong to
     * @return upper repository
     */
    public Repository getRepository();

}
