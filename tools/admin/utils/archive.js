addToClasspath("../jars/commons-compress-1.21.jar");

const {Files, Paths, StandardCopyOption} = java.nio.file;
const {CompressorStreamFactory} = org.apache.commons.compress.compressors;
const {ArchiveStreamFactory} = org.apache.commons.compress.archivers;
const {BufferedInputStream} = java.io;

const fs = require("fs");

const files = require("./files");
const strings = require("ringo/utils/strings");

const getEntries = exports.getEntries = (archiveInputStream) => {
    const entries = [];
    let entry = null;
    try {
        while ((entry = archiveInputStream.getNextEntry()) != null) {
            entries.push(entry.getName());
        }
        return entries;
    } finally {
        archiveInputStream && archiveInputStream.close();
    }
};

const getBasePath = exports.getBasePath = (path) => {
    const entries = getEntries(newArchiveInputStream(path));
    const basePath = entries.reduce((prev, current) => {
        return strings.getCommonPrefix(prev, current);
    });
    return Paths.get(basePath).normalize();
};

const extract = (archiveInputStream, directory, basePath) => {
    try {
        let entry = null;
        while ((entry = archiveInputStream.getNextEntry()) != null) {
            if (!archiveInputStream.canReadEntryData(entry)) {
                throw new Error("Unable to read archive entry data " + entry.getName());
            }
            let entryPath = Paths.get(entry.getName());
            let destination = Paths.get(directory, basePath.relativize(entryPath)).normalize();
            if (!destination.startsWith(directory)) {
                throw new Error("Invalid archive entry: " + destination + " is not inside " + directory);
            }
            if (entry.isDirectory()) {
                if (!Files.isDirectory(destination) && !Files.createDirectories(destination)) {
                    throw new Error("Failed to create directory " + destination);
                }
            } else {
                let parent = destination.getParent();
                if (!Files.isDirectory(parent) && !Files.createDirectories(parent)) {
                    throw new Error("Failed to create parent directory " + parent);
                }
                Files.copy(archiveInputStream, Paths.get(destination), [StandardCopyOption.REPLACE_EXISTING]);
            }
        }
    } finally {
        archiveInputStream && archiveInputStream.close();
    }
    return directory;
};

const newInputStream = (path) => {
    let inputStream = new BufferedInputStream(Files.newInputStream(Paths.get(path)));
    try {
        // FIXME: why does compressor input stream not support mark? need to wrap again...
        return new BufferedInputStream(new CompressorStreamFactory().createCompressorInputStream(inputStream));
    } catch (e) {
        return inputStream;
    }
};

const newArchiveInputStream = (path) => {
    const inputStream = newInputStream(path);
    return new ArchiveStreamFactory().createArchiveInputStream(inputStream);
};

exports.extract = (path) => {
    // determine the base path in the archive - this will be stripped during
    // extraction since we don't need it - the package will be installed in the
    // package name directory
    const basePath = getBasePath(path);
    const tempDirectory = files.createTempDirectory();
    try {
        return extract(newArchiveInputStream(path), tempDirectory, basePath);
    } catch (e) {
        tempDirectory && fs.removeTree(tempDirectory);
        throw e;
    }
};

exports.install = (sourceDirectory, destinationDirectory) => {
    return files.move(sourceDirectory, destinationDirectory);
};
