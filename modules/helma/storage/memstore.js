require('core/object');
require('core/array');
require('core/JSON');
include('helma/functional');

export("Storable");

var __shared__ = true;
var log = require('helma/logging').getLogger(__name__);

var Storable = require('./storable').Storable;
Storable.setStoreImplementation(this);

var datastore = datastore || new MemStore();

function list(type, options, thisObj) {
    var array = getAll(type);
    if (options) {
        // first filter out the the items we're not interested in
        var filter = options.filter;
        if (typeof filter == "function") {
            array = array.filter(filter, thisObj);
        }
        // then put them into order
        var orderBy = options.orderBy,
                ascDesc = options.order == "desc" ? -1 : 1;
        if (options.orderBy) {
            array = array.sort(function(o1, o2) {
                var p1 = o1[orderBy],
                        p2 = o2[orderBy];
                if (p1 < p2) return -1 * ascDesc;
                if (p1 > p2) return  1 * ascDesc;
                return 0;
            })
        }
        // finally apply pagination/slicing
        var start = parseInt(options.start, 10),
                max = parseInt(options.max, 10);
        if (isFinite(start) || isFinite(max)) {
            start = start || 0;
            array = array.slice(start, start + max || array.length);
        }
    }
    return array;
};

function all(type) {
    return datastore.retrieveAll(type);
}

function get(type, id) {
    return datastore.retrieve(type, id);
}

function save(props, entity, txn) {
    if (!txn) {
        txn = new Transaction();
    }
    if (txn.hasKey(entity._key)) {
        return;
    } else {
        txn.registerKey(entity._key);
    }
    for (var i in props) {
        var value = props[i];
        if (isStorable(value)) {
            value.save(txn);
            value = value._key;
        } else if (value instanceof Array) {
            value = value.map(function(obj) {
                if (obj instanceof Storable) {
                    obj.save(txn);
                    return obj._key;
                } else {
                    return obj;
                }
            });
        }
        entity[i] = value;
    }

    datastore.store(entity, txn);
};

function remove(key, txn) {
    datastore.remove(key, txn);
};

function equalKeys(key1, key2) {
    return key1 && key2
            && key1[0] == key2[0]
            && key1[1] == key2[1];
}

function getEntity(type, arg) {
    if (isKey(arg)) {
        return datastore.load(arg[0], arg[1]);
    } else if (isEntity(arg)) {
        return arg;
    } else if (arg instanceof Object) {
        var entity = arg.clone();
        Object.defineProperty(entity, "_key", {
            value: [type, datastore.generateId(type)]
        });
        return entity;
    }
    return null;
}

function getProps(type, arg) {
    if (isEntity(arg)) {
        var props = {};
        for (var i in arg) {
            var value = arg[i];
            if (isKey(value)) {
                props[i] = new Storable(value[0], value);
            } else if (value instanceof Array) {
                props[i] = value.map(function(obj) {
                    return isKey(obj) ?
                           new Storable(obj[0], obj) : obj;
                });
            } else {
                props[i] = value;
            }
        }
        return props;
    } else if (!isKey(arg) && arg instanceof Object) {
        return arg;
    }
    return null;
}

function getKey(type, arg) {
    if (isEntity(arg)) {
        return arg._key;
    } else if (isKey(arg)) {
        return arg;
    }
    return null;
}

function getId(key) {
    return key[1];
}

/**
 * File Store class
 * @param path the database directory
 */
function MemStore() {

    // map of type to current id tip
    var idMap = {};

    var data = {};

    this.dump = function() {
        print(data.toSource());
    }

    this.store = function(entity, txn) {
        var [type, id] = entity._key;
        var dir = data[type];
        if (!dir) {
            data[type] = dir = {};
        }
        dir[id] = entity.toJSON();
    };

    this.load = function(type, id) {
        var dir = data[type];
        if (!dir || !dir[id]) {
            return null;
        }
        var entity = dir[id].parseJSON();
        Object.defineProperty(entity, "_key", {
            value: [type, id]
        });
        return entity;
    };

    this.retrieve = function(type, id) {
        var entity = this.load(type, id);
        if (entity) {
            return new Storable(type, entity);
        }
        return null;
    };

    this.retrieveAll = function(type) {
        var dir = data[type];
        var list = []
        for (var id in dir) {
            list.push(new Storable(type, [type, id]));
        }
        return list;
    };

    this.remove = function(key, txn) {
        if (!isKey(key)) {
            throw new Error("Invalid key object: " + key);
        }
        var [type, id] = key;
        var dir = data[type];
        if (dir && dir[id]) {
            delete(dir[id]);
        }
    };

    this.generateId = function(type) {
        var id = idMap[type] || 1;
        idMap[type] = id + 1;
        return String(id);
    };
};

function isEntity(value) {
    return value instanceof Object
            && !isStorable(value)
            && value._key instanceof Object;
}

function isKey(value) {
    return value instanceof Array
            && value.length == 2
            && typeof value[0] == 'string'
            && typeof value[1] == 'string';
}

function isStorable(value) {
    return value instanceof Storable;
}

function Transaction() {

    var keys = [];

    this.registerKey = function(key) {
        keys.push(key.join('/'));
    }

    this.hasKey = function(key) {
        return keys.contains(key.join('/'));
    }
}

function dump() {
    datastore.dump();
}
