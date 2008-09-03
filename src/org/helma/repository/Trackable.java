package org.helma.repository;

import java.net.URL;
import java.net.MalformedURLException;

/**
 * Parent interface for both Repository and Resource interfaces. 
 * Describes an entity defined by a file-system like path.
 */
public interface Trackable {

    /**
     * Returns the date the resource was last modified
     * @return last modified date
     */
    public long lastModified();

    /**
     * Checksum of the resource content. Implementations should make sure
     * to return a different checksum if the resource's content has changed.
     *
     * @return checksum
     */
    public long getChecksum();

    /**
     * Checks wether this resource actually (still) exists
     * @return true if the resource exists
     */
    public boolean exists();

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
     * Returns an url to the resource if the repository of this resource is
     * able to provide urls
     * @return url to the resource
     */
    public URL getUrl() throws UnsupportedOperationException, MalformedURLException;

    /**
     * Returns the parent repository containing this resource
     * @return parent repository
     */
    public Repository getParentRepository();

}
