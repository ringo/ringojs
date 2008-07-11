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

package org.helma.storage.file;

import java.io.IOException;
import java.util.ArrayList;

public class FileStorageTransaction {

    protected static final int ADDED = 0;
    protected static final int UPDATED = 1;
    protected static final int DELETED = 2;

    ArrayList<FileStorage.Resource> writeFiles = new ArrayList<FileStorage.Resource>();
    ArrayList<FileStorage.Resource> deleteFiles = new ArrayList<FileStorage.Resource>();

    /**
     * Complete the transaction by making its changes persistent.
     * @throws IOException an I/O related error occurred
     */
    protected void commit() throws IOException {
        // move through updated/created files and persist them
        int l = writeFiles.size();
        for (int i=0; i<l; i++) {
            FileStorage.Resource res = writeFiles.get(i);
            try {
                // because of a Java/Windows quirk, we have to delete
                // the existing file before trying to overwrite it
                if (res.file.exists()) {
                    res.file.delete();
                }
                // move temporary file to permanent name
                if (res.tmpfile.renameTo(res.file)) {
                    // success - delete tmp file
                    res.tmpfile.delete();
                } else {
                    // error - leave tmp file and print a message
                    System.err.println("Couldn't move file, committed version is in " +
                                        res.tmpfile);
                }
            } catch (SecurityException ignore) {
                // shouldn't happen
            }
        }

        // move through deleted files and delete them
        l = deleteFiles.size();
        for (int i=0; i<l; i++) {
            FileStorage.Resource res = deleteFiles.get(i);
            // delete files enlisted as deleted
            try {
                res.file.delete();
            } catch (SecurityException ignore) {
                // shouldn't happen
            }
        }
        // clear registered resources
        writeFiles.clear();
        deleteFiles.clear();
    }

    /**
     * Rollback the transaction, forgetting the changed items
     * @throws IOException an I/O related error occurred
     */
    protected void abort() throws IOException {
        int l = writeFiles.size();
        for (int i=0; i<l; i++) {
            FileStorage.Resource res = writeFiles.get(i);
            // delete tmp files created by this transaction
            try {
                res.tmpfile.delete();
            } catch (SecurityException ignore) {
                // shouldn't happen
            }
        }

        // clear registered resources
        writeFiles.clear();
        deleteFiles.clear();
    }

    /**
     * Adds a resource to the list of resources encompassed by this transaction
     *
     * @param res the resource to add
     * @param status the status of the resource (ADDED|UPDATED|DELETED)
     * @throws IOException an I/O related error occurred
     */
    protected void addResource(FileStorage.Resource res, int status)
           throws IOException {
        if (status == DELETED) {
            deleteFiles.add(res);
        } else {
            writeFiles.add(res);
        }
    }


}
