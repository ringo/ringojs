const system = require("system");
const assert = require("assert");
const specs = require("../utils/specs");

const {URI} = java.net;

const GIT_URLS = {
    negative: [
        "http://example.com/xyz",
        "https://example.com/xyz",
        "file://example.com/xyz"
    ],
    positive: [
        "git://example.com/xyz",
        "git+ssh://example.com/xyz",
        "ssh://example.com/xyz",
        "git+http://example.com/xyz",
        "git+https://example.com/xyz",
        "git+file://example.com/xyz"
    ]
};

const GITHUB_URLS = {
    positive: [
        "ringo/ringojs",
        "ringo/ringojs#master",
        "http://github.com/ringo/ringojs",
        "https://github.com/ringo/ringojs",
        "https://github.com/ringo/ringojs#master",
        "https://github.com/ringo/ringojs#HEAD",
        "https://github.com/ringo/ringojs#v2.x",
        "https://github.com/ringo/ringojs#82116b6d1a474a37fb2783a127d4168190e61745"
    ],
    negative: [
        "ringo",
        "ringo/ringojs/wrong",
        "ringo/wröng"
    ]
};

const ARCHIVE_URLS = {
    positive: [
        "http://example.com/archive.tar",
        "https://example.com/archive.tar",
        "http://example.com/archive.tar.gz",
        "https://example.com/archive.tar.gz",
        "http://example.com/archive.tgz",
        "https://example.com/archive.tgz",
        "http://example.com/archive.zip",
        "https://example.com/archive.zip"
    ],
    negative: [
        "http://example.com/archive",
        "https://example.com/archive"
    ]
};

exports.testIsGit = () => {
    GIT_URLS.positive.forEach(uri => assert.isTrue(specs.isGit(uri), uri));
    GIT_URLS.negative.forEach(uri => assert.isFalse(specs.isGit(uri), uri));
    GITHUB_URLS.positive.forEach(uri => assert.isFalse(specs.isGit(uri), uri));
    GITHUB_URLS.negative.forEach(uri => assert.isFalse(specs.isGit(uri), uri));
    ARCHIVE_URLS.positive.forEach(uri => assert.isFalse(specs.isGit(uri), uri));
    ARCHIVE_URLS.negative.forEach(uri => assert.isFalse(specs.isGit(uri), uri));
};

exports.testIsGitHub = () => {
    GITHUB_URLS.positive.forEach(uri => assert.isTrue(specs.isGitHub(uri), uri));
    GITHUB_URLS.negative.forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
    GIT_URLS.positive.forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
    GIT_URLS.negative.forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
    ARCHIVE_URLS.positive.forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
    ARCHIVE_URLS.negative.forEach(uri => assert.isFalse(specs.isGitHub(uri), uri));
};

exports.testIsArchive = () => {
    ARCHIVE_URLS.positive.forEach(uri => assert.isTrue(specs.isArchive(uri), uri));
    ARCHIVE_URLS.negative.forEach(uri => assert.isFalse(specs.isArchive(uri), uri));
    GITHUB_URLS.positive.forEach(uri => assert.isFalse(specs.isArchive(uri), uri));
    GITHUB_URLS.negative.forEach(uri => assert.isFalse(specs.isArchive(uri), uri));
    GIT_URLS.positive.forEach(uri => assert.isFalse(specs.isArchive(uri), uri));
    GIT_URLS.negative.forEach(uri => assert.isFalse(specs.isArchive(uri), uri));
};

exports.testNewGitHubSpec = () => {
    GITHUB_URLS.positive.forEach(uri => {
        const spec = specs.newGitHubSpec(uri);
        let [url, treeish] = uri.split("#");
        if (!url.includes("github.com")) {
            url = "https://github.com/" + url;
        }
        assert.strictEqual(spec.type, specs.TYPE_GIT, uri);
        assert.strictEqual(spec.url, url, uri);
        assert.strictEqual(spec.treeish, treeish || null, uri);
    });
};

exports.testNewGitSpec = () => {
    const schemes = [
        {value: "git", expected: "git"},
        {value: "git+ssh", expected: "ssh"},
        {value: "ssh", expected: "ssh"},
        {value: "git+http", expected: "http"},
        {value: "git+https", expected: "https"},
        {value: "git+file", expected: "file"}
    ];
    const uris =         [
        "//example.com/path/to/repo",
        "//example.com/path/to/repo#HEAD",
        "//example.com/path/to/repo#v2.x",
        "//example.com/path/to/repo#82116b6d1a474a37fb2783a127d4168190e61745",
    ];
    schemes.forEach(scheme => {
        uris.forEach(uri => {
            const gitUrl = [scheme.value, uri].join(":");
            const spec = specs.newGitSpec(gitUrl);
            const treeish = gitUrl.split("#")[1] || null;
            const receivedUri = URI.create(spec.url);
            const expectedUri = URI.create(gitUrl);
            assert.strictEqual(spec.type, specs.TYPE_GIT, gitUrl);
            assert.strictEqual(receivedUri.getScheme(), scheme.expected, gitUrl);
            assert.strictEqual(receivedUri.getSchemeSpecificPart(), expectedUri.getSchemeSpecificPart(), gitUrl);
            assert.strictEqual(spec.treeish, expectedUri.getFragment(), gitUrl);
        });
    });
};

exports.testNewArchiveSpec = () => {
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
                const spec = specs.newArchiveSpec(url);
                assert.strictEqual(spec.type, specs.TYPE_ARCHIVE, url);
                assert.strictEqual(spec.url, url, url);
            });
    });
};

exports.testGet = () => {
    const tests = [
        {urls: GIT_URLS.positive, type: specs.TYPE_GIT},
        {urls: GITHUB_URLS.positive, type: specs.TYPE_GIT},
        {urls: ARCHIVE_URLS.positive, type: specs.TYPE_ARCHIVE}
    ];
    const test = (test) => {
        test.urls.forEach(url => assert.strictEqual(specs.get(url).type, test.type, url));
    };
    tests.forEach(test);
    tests.reverse().forEach(test);
    for (let i=0; i<100; i+=1) {
        test(tests[Math.round(Math.random() * (tests.length - 1))]);
    }
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
