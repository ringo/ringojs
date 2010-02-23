
include("ringo/unittest");
include("file");

importPackage(org.ringojs.repository);
var path = join(dirname(module.path), "data.zip");
var repo  = new ZipRepository(path);

require("./common").setup(exports, path, repo);

if (require.main == module.id) {
    require("ringo/unittest").run(exports);
}