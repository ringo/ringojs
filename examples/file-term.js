const fs = require('fs');
const {GREEN, BLUE, writeln, RESET} = require('ringo/term');

const filename = module.path;

// text streams have an iterator that reads the next line
let file = fs.open(filename);  // text mode
file.forEach(function(line) {
   writeln(GREEN, line, RESET);
});

// binary streams read into ByteArrays/ByteStrings
file = fs.open(filename, {binary: true});
writeln(BLUE, file.read(), RESET)
