/**
 * @fileoverview This module provides classes to uncompress zip files and streams.
 * @since 0.5
 */

const fs = require('fs');
const io = require('io');
const {ZipFile, ZipInputStream} = java.util.zip;

/**
 * A class to read and unpack a local zip file.
 * @param {String} path the location of the zip file
 */
exports.ZipFile = function(path) {
    const zipfile = new ZipFile(path);
    const entries = [];
    const map = {};
    const enumerator = zipfile.entries();
    while (enumerator.hasMoreElements()) {
        let entry = enumerator.nextElement();
        map[entry.name] = entry;
        entries.push(entry.name);
    }

    const getEntry = (name) => {
        const entry = map[name];
        if (!entry) {
            throw new Error("Invalid zip entry: " + name);
        }
        return entry;
    };

    /**
     * An array containing the names of all entries in this zip file.
     * @type Array
     */
    this.entries = entries;

    /**
     * Get an input stream to read the entry with the given name.
     * @param {String} name the entry name
     */
    this.open = (name) => {
        return new io.Stream(zipfile.getInputStream(getEntry(name)));
    };

    /**
     * Returns true if the entry with the given name represents a directory.
     * @param {String} name the entry name
     */
    this.isDirectory = (name) => {
        const entry = map[name];
        return entry && entry.isDirectory();
    };

    /**
     * Returns true if the entry with the given name represents a file.
     * @param {String} name the entry name
     */
    this.isFile = (name) => {
        const entry = map[name];
        return entry && !entry.isDirectory();
    };

    /**
     * Returns the uncompressed size in bytes in the given entry, or -1 if not known.
     * @param {String} name the entry name
     */
    this.getSize = (name) => {
        return getEntry(name).getSize();
    };

    /**
     * Returns the last modification timestamp of the given entry, or -1 if not available.
     * @param {String} name the entry name
     */
    this.getTime = (name) => {
        return getEntry(name).getTime();
    };

    /**
     * Close the zip file.
     */
    this.close = () => {
        zipfile.close();
    };

    return this;
};

/**
 * A streaming iterator over a zip file or stream. Each item yielded
 * by this iterator is an input stream to read a single zip entry.
 * Each entry stream has additional name, isDirectory, isFile, size, and time
 * properties with the same semantics of the corresponding methods in ZipFile.
 * @param {Stream|String} resource an input stream or file name
 * @see #ZipFile
 */
module.exports.ZipIterator = function*(resource) {
    const zipStream = new ZipInputStream((typeof resource == "string") ?
            fs.openRaw(resource) : resource);
    const stream = new io.Stream(zipStream);
    try {
        let entry;
        while ((entry = zipStream.getNextEntry())) {
            yield {
                "name": entry.getName(),
                "isDirectory": entry.isDirectory(),
                "isFile": !entry.isDirectory(),
                "size": entry.getSize(),
                "time": entry.getTime()
            };
        }
    } finally {
        stream.close();
    }
};
