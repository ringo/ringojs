
include("ringo/unittest");
var {absolute, join} = require("fs");
require("core/string");

exports.setup = function(exports, path, repo) {

    exports.testGetResource = function() {
        var res = repo.getResource("test.txt");
        assertEqual(res.name, "test.txt");
        assertTrue(res.exists());
        assertEqual(res.baseName, "test");
        assertEqual(res.path, absolute(join(path, "test.txt")));
        assertEqual(res.content, "hello world!");
    };

    exports.testGetNestedResource = function() {
        var res = repo.getResource("nested/nested.txt");
        assertEqual(res.name, "nested.txt");
        assertTrue(res.exists());
        assertEqual(res.baseName, "nested");
        assertEqual(res.path, absolute(join(path, "nested", "nested.txt")));
        assertEqual(res.length, 2240);
        assertEqual(res.content.length, 2240);
        assertTrue(res.content.startsWith("Lorem ipsum dolor sit amet"));
        assertTrue(res.content.trim().endsWith("id est laborum."));
    };

    exports.testNonExistingResource = function() {
        var res = repo.getResource("doesNotExist.txt");
        assertNotNull(res);
        assertFalse(res.exists());
        assertThrows(function() {res.content});
    };

    exports.testNestedNonExistingResource = function() {
        var res = repo.getResource("foo/bar/doesNotExist.txt");
        assertNotNull(res);
        assertFalse(res.exists());
        assertThrows(function() {res.content});
    };

    exports.testGetRepositories = function() {
        var repos = repo.getRepositories();
        assertEqual(repos.length, 1);
        assertEqual(repos[0].name, "nested");
    }

    exports.testGetResources = function() {
        var res = repo.getResources();
        assertEqual(res.length, 1);
        assertEqual(res[0].name, "test.txt");
    }

    exports.testGetRecursiveResources = function() {
        var res = repo.getResources(true);
        assertEqual(res.length, 2);
        res = res.sort(function(a, b) a.length > b.length);
        assertEqual(res[0].name, "test.txt");
        assertEqual(res[0].relativePath, "test.txt");
        assertEqual(res[0].path, absolute(join(path, "test.txt")));
        assertEqual(res[1].name, "nested.txt");
        assertEqual(res[1].relativePath, "nested/nested.txt");
        assertEqual(res[1].path, absolute(join(path, "nested/nested.txt")));
    }

    exports.testGetNestedResources = function() {
        var res = repo.getResources("nested", false);
        assertEqual(res.length, 1);
        assertEqual(res[0].name, "nested.txt");
        assertEqual(res[0].relativePath, "nested/nested.txt");
    }

};