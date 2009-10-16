include('io');

export('print', 'stdin', 'stdout', 'stderr', 'args', 'env');

var print = global.print;

var stdin = new TextStream(new Stream(java.lang.System['in']));
var stdout = new TextStream(new Stream(java.lang.System.out));
var stderr = new TextStream(new Stream(java.lang.System.err));

var args = global.arguments || [];

var env = new ScriptableMap(java.lang.System.getenv());