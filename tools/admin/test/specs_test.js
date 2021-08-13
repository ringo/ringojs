const assert = require("assert");
const specs = require("../utils/specs");
const constants = require("../constants");

exports.testIsGit = () => {
    [
        "file://xyz",
        "http://xyz",
        "https://xyz"
    ].forEach(uri => assert.isFalse(specs.isGit(uri), uri));
    [
        "git://xyz",
        "git+ssh://xyz",
        "ssh://xyz",
        "git+http://xyz",
        "git+https://xyz",
        "git+file://xyz"
    ].forEach(uri => assert.isTrue(specs.isGit(uri), uri));
};

exports.testIsGitHub = () => {
    [
        "http://github.com/ringo/ringojs",
        "https://github.com/ringo/ringojs",
        "git://github.com/ringo/ringojs",
        "git+http://github.com/ringo/ringojs",
        "git+https://github.com/ringo/ringojs"
    ].forEach(uri => assert.isTrue(specs.isGitHub(uri), uri));
    [
        "ssh://github.com/ringo/ringojs",
        "https://github.com",
        "https://github.com/ringo"
    ].forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
};

exports.testIsHttp = () => {
    [
        "http://xyz",
        "https://xyz"
    ].forEach(uri => assert.isTrue(specs.isHttp(uri), uri));
};

exports.testNewGitHubSpec = () => {
    [
        "https://github.com/ringo/ringojs",
        "https://github.com/ringo/ringojs#HEAD",
        "https://github.com/ringo/ringojs#v2.x",
        "https://github.com/ringo/ringojs#82116b6d1a474a37fb2783a127d4168190e61745",
    ].forEach(uri => {
        const spec = specs.newGitHubSpec(uri);
        const [url, treeish] = uri.split("#");
        assert.strictEqual(spec.type, constants.TYPE_GIT, uri);
        assert.strictEqual(spec.url, url, uri);
        assert.strictEqual(spec.treeish, treeish || null, uri);
    });
};

exports.testNewGitSpec = () => {
    const schemes = [
        "git",
        "git+ssh",
        "ssh",
        "git+http",
        "git+https",
        "git+file"
    ];
    const uris =         [
        "example.com/path/to/repo",
        "example.com/path/to/repo#HEAD",
        "example.com/path/to/repo#v2.x",
        "example.com/path/to/repo#82116b6d1a474a37fb2783a127d4168190e61745",
    ];
    schemes.forEach(scheme => {
        uris.map(part => [scheme, part].join("://"))
            .forEach(uri => {
                const spec = specs.newGitSpec(uri);
                const [url, treeish] = uri.split("#");
                assert.strictEqual(spec.type, constants.TYPE_GIT, uri);
                assert.strictEqual(spec.url, url, uri);
                assert.strictEqual(spec.treeish, treeish || null, uri);
            });
    })
};

exports.testNewHttpSpec = () => {
    const schemes = [
        "http", "https"
    ];
    const uris = [
        "github.com/ringo/ringojs/releases/download/v2.0.0/ringojs-2.0.0.tar.gz",
        "github.com/ringo/ringojs/releases/download/v2.0.0/ringojs-2.0.0.tar",
        "github.com/ringo/ringojs/releases/download/v2.0.0/ringojs-2.0.0.zip"
    ];
    schemes.forEach(scheme => {
        uris.map(part => [scheme, part].join("://"))
            .forEach(url => {
                const spec = specs.newHttpSpec(url);
                assert.strictEqual(spec.type, constants.TYPE_HTTP, url);
                assert.strictEqual(spec.url, url, url);
            });
    });
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    require('system').exit(require('test').run(exports));
}
