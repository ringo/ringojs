include('helma/unittest');
var File = require('helma/file').File;
require('core/string');

var filename = 'helma_file_test_' + String.random(10);
var string1 = 'Hallo Welt!';
var string2 = 'Sch\u00f6ne Gr\u00fc\u00dfe aus Hildesheim!'

exports.setUp = exports.tearDown = function() {
    var file = new File(filename);
    if (file.exists()) {
        if (!file.remove())
            writeln("Warning: Couldn't remove file", filename);
    }
}

exports.removeFile = function() {
    var file = new File(filename);
    file.remove();
    assertFalse(file.exists());
}

exports.testReadWriteFile = function() {
    var file = new File(filename);
    file.remove();
    assertFalse(file.exists());
    file.open();
    file.write(string1);
    file.close();
    assertTrue(file.exists());
    assertEqual(file.getLength(), string1.length)
    file.open({append: true});
    file.write(string2);
    file.close();
    var content = file.readAll();
    assertEqual(content, string1 + string2);
    file.open();
    var line = file.readln();
    assertEqual(line, string1 + string2);
    file.close();
}

exports.testEncoding = function() {
    var test = function(options) {
        var file = new File(filename);
        file.remove();
        assertFalse(file.exists());
        file.open(options);
        file.write(string2);
        file.close();
        assertTrue(file.exists());
        file.open(options);
        assertEqual(file.readln(), string2);
        file.close();
    }
    test({charset: 'utf-8'});
    test({charset: 'iso_8859_1'});
}