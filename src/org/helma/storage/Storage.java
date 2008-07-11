/*
 *  Copyright 2006 Hannes Wallnoefer <hannes@helma.at>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.helma.storage;

import java.io.OutputStream;
import java.io.InputStream;
import java.io.IOException;

/**
 * Interface for storing and retrieving objects to/from streams
 */
public interface Storage {

    /**
     * Store an object to an output stream
     * @param obj the object
     * @param out the output stream
     * @throws IOException an I/O exception occurred
     * @throws NotStorableException the object can't be persisted
     */
    public void store(Object obj, OutputStream out)
            throws IOException, NotStorableException;

    /**
     * Retrieve an object from an input stream
     * @param type the expected object type
     * @param id the object id
     * @param in the input stream
     * @throws IOException an I/O exception occurred
     * @throws ClassNotFoundException the class for the object couldn't be loaded
     * @return the object
     */
    public Object retrieve(String type, String id, InputStream in) 
            throws IOException, ClassNotFoundException;

}
