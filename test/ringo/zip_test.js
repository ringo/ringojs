const assert = require("assert");
const {ZipFile, ZipIterator} = require("../../modules/ringo/zip");

exports.testSimpleZipFile = function () {
    const file = new ZipFile(module.resolve("./zip_testfile.zip"));
    assert.strictEqual(file.entries.join(","), "01-helloworld.txt,02-longtext.txt,03-ringologo.svg,04-some-image.png,05-folder/06-another-helloworld.txt");
};

exports.testZipIterator = function () {
    const zipIterator = new ZipIterator(module.resolve("./zip_testfile.zip"));

    const expectedResult = [
        "01-helloworld.txt",
        "02-longtext.txt",
        "03-ringologo.svg",
        "04-some-image.png",
        "05-folder/06-another-helloworld.txt",
    ];

    try {
        const result = expectedResult.map(() => {
            return zipIterator.next().value.name;
        });
        assert.deepEqual(result, expectedResult);
    } catch (e) {
        assert.fail("Could not iterate over the zip file entries: " + e);
    }

};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
