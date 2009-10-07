
include("helma/unittest");
include("file");

importPackage(org.helma.repository);
var path = join(dirname(module.path), "data");
var repo  = new FileRepository(path);

require("./common").setup(exports, path, repo);

if (require.main == module.id) {
    require("helma/unittest").run(exports);
}