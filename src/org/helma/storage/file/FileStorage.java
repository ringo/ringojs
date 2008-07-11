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

import org.helma.storage.Storage;
import org.helma.storage.NotStorableException;

import java.io.*;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

public class FileStorage {

    /**
     * our home directory
     */
    private File dbHome;

    /**
     * Our object persister
     */
    private Storage persister;


    private HashMap<String,Long> ids = new HashMap<String,Long>();

    /**
     * Create a new Minibase with the given directory
     * @param dbHome the directory to store stuff in
     * @param persister the object persister
     * @throws IOException an I/O related error
     */
    public FileStorage(File dbHome, Storage persister) throws IOException {
        assert dbHome != null : "dbHome must not be null";
        assert persister != null : "persister must not be null";
        this.dbHome = dbHome.isAbsolute() ? dbHome : dbHome.getAbsoluteFile();
        if (!this.dbHome.exists() && !this.dbHome.mkdirs()) {
            throw new IOException("Can't create database directory " + dbHome);
        } else if (!this.dbHome.canWrite()) {
            throw new IOException("No write permission for database directory " + dbHome);
        }
        this.persister = persister;
    }

    /**
     * Start a new transaction.
     *
     * @return the new tranaction object
     * @throws IOException I/O related exception
     */
    public FileStorageTransaction beginTransaction() throws IOException {
        return new FileStorageTransaction();
    }

    /**
     * committ the given transaction, makint its changes persistent
     *
     * @param txn the transaction.
     * @throws IOException I/O related exception
     */
    public void commitTransaction(FileStorageTransaction txn) throws IOException {
        txn.commit();
    }

    /**
     * Abort the given transaction
     *
     * @param txn the transaction.
     * @throws IOException I/O related exception
     */
    public void abortTransaction(FileStorageTransaction txn) throws IOException {
        txn.abort();
    }

    /**
     * Retrieves a Node from the database.
     *
     * @param txn the current transaction
     * @param type the object type
     * @param id the object id
     * @return the object associated with the given key
     * @throws IOException if an I/O error occurred loading the object.
     * @throws ClassNotFoundException the class couldn't be loaded
     */
    public Object get(FileStorageTransaction txn, String type, String id)
                  throws IOException, ClassNotFoundException {
        File dir = new File(dbHome, type);
        File file = new File(dir, id);

        if (!file.exists()) {
            return null;
        } else if (!file.isFile()) {
            throw new IOException("Is not a regular file: " + file);
        }
        InputStream in = new FileInputStream(file);
        Object value = persister.retrieve(type, id, in);
        in.close();
        return value;
    }

    /**
     * Get all objects stored in the database of a given type.
     * @param txn the current transaction
     * @param type the object type to retrieve
     * @return an array of all objects belonging to that type
     * @throws IOException if an I/O error occurred loading the object.
     * @throws ClassNotFoundException the class couldn't be loaded
    */
    public Object[] getAll(FileStorageTransaction txn, String type)
            throws IOException, ClassNotFoundException {
        File dir = new File(dbHome, type);
        if (!dir.exists() || !dir.isDirectory()) {
            return new Object[0];
        }
        File[] files = dir.listFiles();
        List<Object> list = new ArrayList<Object>(files.length);

        for (File file: files) {
            if (!file.isFile()) {
                continue;
            }
            InputStream in = new FileInputStream(file);
            list.add(persister.retrieve(type, file.getName(), in));
            in.close();
        }
        return list.toArray();
    }

    /**
     * Save a node with the given key. Writes the node to a temporary file
     * which is copied to its final name when the transaction is committed.
     *
     * @param txn the transaction
     * @param type the object type
     * @param obj the object to insert
     * @throws IOException an I/O exception occurred
     * @throws org.helma.db.NotPersistableException the object isn't persistable
     * @return the id of the inserted object
     */
    public String insert(FileStorageTransaction txn, String type, Object obj)
                throws IOException, NotStorableException {
        return store(txn, type, null, obj);
    }

    /**
     * Update a node with the given key. Writes the node to a temporary file
     * which is copied to its final name when the transaction is committed.
     *
     * @param txn the transaction
     * @param type the object type
     * @param id the object id
     * @param obj the object to update
     * @throws IOException an I/O exception occurred
     * @throws org.helma.storage.NotStorableException the object isn't persistable
     */
    public void update(FileStorageTransaction txn, String type, String id, Object obj)
                throws IOException, NotStorableException {
        if (id == null) {
            throw new IllegalArgumentException("id must not be null in update()");
        }
        store(txn, type, id, obj);
    }

    /**
     * Internal object store method
     */
    private String store(FileStorageTransaction txn, String type, String id, Object obj)
                throws IOException, NotStorableException {
        File dir = new File(dbHome, type);
        if (!dir.exists()) {
            if (!dir.mkdirs()) {
                throw new IOException("Can't create directory for type " + type);
            }
        }
        if (id == null) {
            id = generateId(type, dir);
        }
        File file = new File(dir, id);
        String tempFileName = type + id + ".";
        File tempFile = File.createTempFile(tempFileName, ".tmp", dbHome);
        OutputStream out = null;
        try {
            out = new FileOutputStream(tempFile);
            persister.store(obj, out);
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (IOException ignore) {
                    // ignore
                }
            }
        }

        if (file.exists() && !file.canWrite()) {
            throw new IOException("No write permission for " + file);
        }
        Resource res = new Resource(file, tempFile);
        txn.addResource(res, FileStorageTransaction.ADDED);
        return id;
    }

    /**
     * Marks an element from the database as deleted
     *
     * @param txn the transaction
     * @param type the object type
     * @param id the object id
     * @throws IOException an I/O exception occurred
     */
    public void remove(FileStorageTransaction txn, String type, String id)
                    throws IOException {
        File file = new File(new File(dbHome, type), id);
        Resource res = new Resource(file, null);
        txn.addResource(res, FileStorageTransaction.DELETED);
    }

    /**
     * Generate an id for a type, checking that the given directory dosen't contain
     * a file with the id as name.
     * @param type the type
     * @param dir the directory containing this type's items
     * @return a new unused id
     */
    protected synchronized String generateId(String type, File dir) {
        long key = ids.containsKey(type) ? ids.get(type) : 1;
        File file = new File(dir, Long.toString(key, 36));
        while(file.exists()) {
            key += 1;
            file = new File(dir, Long.toString(key, 36));
        }

        ids.put(type, key + 1);
        return file.getName();
    }

    /**
     * A holder class for two files, the temporary file and the permanent one
     */
    class Resource {
        File tmpfile;
        File file;

        public Resource(File file, File tmpfile) {
            this.file = file;
            this.tmpfile = tmpfile;
        }
    }

}
