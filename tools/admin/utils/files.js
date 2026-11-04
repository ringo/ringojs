const {Files, Paths, StandardCopyOption} = java.nio.file;
const {PosixFilePermissions} = java.nio.file.attribute;

exports.createTempDirectory = () => {
    return Files.createTempDirectory("ringo-admin-",
            PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwxrwxrwx"))).toString();
};

exports.move = (source, target) => {
    return Files.move(Paths.get(source), Paths.get(target), [StandardCopyOption.REPLACE_EXISTING]);
};

/**
 * Returns the directory a package gets installed into. The name is read from
 * the package.json of a downloaded package and therefore untrusted: it has to
 * be a single path segment, otherwise it could address a directory outside of
 * the packages directory, which the caller then replaces.
 * @param {String} packagesDirectory The packages directory
 * @param {String} name The package name
 * @returns {java.nio.file.Path} The absolute, normalized install directory
 * @throws {Error} If the name is not a valid package name
 */
exports.getInstallDirectory = (packagesDirectory, name) => {
    if (typeof name !== "string" || name === "" || name === "." || name === ".." ||
            /[\/\\\0]/.test(name)) {
        throw new Error("Invalid package name: " + JSON.stringify(name));
    }
    const base = Paths.get(packagesDirectory).toAbsolutePath().normalize();
    const installDirectory = base.resolve(name).normalize();
    if (!installDirectory.startsWith(base) || installDirectory.equals(base)) {
        throw new Error("Invalid package name: " + JSON.stringify(name) +
                " is not inside " + base);
    }
    return installDirectory;
};
