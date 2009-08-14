include('io');

export('print', 'stdin', 'stdout', 'stderr', 'args', 'env');

var print = global.print;

var stdin = new TextInputStream(new IO(java.lang.System['in'], null));
var stdout = new TextOutputStream(new IO(null, java.lang.System.out));
var stderr = new TextOutputStream(new IO(null, java.lang.System.err));

var args = global.arguments || [];

var env = new ScriptableMap(java.lang.System.getenv());