
include("ringo/unittest");
var {join, directory} = require("fs");

importPackage(org.ringojs.repository);
var path = join(directory(module.path), "data");
var repo  = new FileRepository(path);

require("./common").setup(exports, path, repo);

if (require.main == module.id) {
    require("ringo/unittest").run(exports);
}
