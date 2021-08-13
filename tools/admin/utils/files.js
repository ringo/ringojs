const {Files, Paths, StandardCopyOption} = java.nio.file;
const {PosixFilePermissions} = java.nio.file.attribute;

exports.createTempDirectory = () => {
    return Files.createTempDirectory("ringo-admin-",
            PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwxrwxrwx"))).toString();
};

exports.move = (source, target) => {
    return Files.move(Paths.get(source), Paths.get(target), [StandardCopyOption.REPLACE_EXISTING]);
};

exports.getInstallDirectory = (packagesDirectory, name) => {
    return Paths.get(packagesDirectory, name);
};
