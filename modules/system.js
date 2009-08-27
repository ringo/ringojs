include('io');

export('print', 'stdin', 'stdout', 'stderr', 'args', 'env');

var print = global.print;

var stdin = new TextInputStream(new IOStream(java.lang.System['in']));
var stdout = new TextOutputStream(new IOStream(java.lang.System.out));
var stderr = new TextOutputStream(new IOStream(java.lang.System.err));

var args = global.arguments || [];

var env = new ScriptableMap(java.lang.System.getenv());