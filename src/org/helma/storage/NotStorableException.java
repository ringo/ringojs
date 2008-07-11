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

/**
 * Thrown by {@link Storage#store(Object, java.io.OutputStream)}.
 */
public class NotStorableException extends Exception {

    /**
     * Create an exception for a non-persistable object
     * @param obj the object that is causing this exception
     */
    public NotStorableException(Object obj) {
        super(obj == null ?
                "Can't store null reference" :
                "Can't store object of class " + obj.getClass());
    }
}
