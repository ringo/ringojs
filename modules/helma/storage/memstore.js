require('core/object');
require('core/array');
include('core/json');
include('helma/functional');
include('./storeutils');

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
}

function all(type) {
    return datastore.retrieveAll(type);
}

function get(type, id) {
    return datastore.retrieve(type, id);
}

function save(props, entity, txn) {
    if (!txn) {
        txn = new BaseTransaction();
    }
    if (updateEntity(props, entity, txn)) {
        datastore.store(entity, txn);
    }
}

function query() {
    // TODO
}

function remove(key, txn) {
    datastore.remove(key, txn);
}

function getEntity(type, arg) {
    if (isKey(arg)) {
        var [type, id] = arg.$ref.split(":");
        return datastore.load(type, id);
    } else if (isEntity(arg)) {
        return arg;
    } else if (arg instanceof Object) {
        var entity = arg.clone();
        Object.defineProperty(entity, "_key", {
            value: createKey(type, datastore.generateId(type))
        });
        return entity;
    }
    return null;
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
        var [type, id] = entity._key.$ref.split(":");
        var dir = data[type];
        if (!dir) {
            data[type] = dir = {};
        }
        dir[id] = JSON.stringify(entity);
    };

    this.load = function(type, id) {
        var dir = data[type];
        if (!dir || !dir[id]) {
            return null;
        }
        var entity = JSON.parse(dir[id]);
        Object.defineProperty(entity, "_key", {
            value: createKey(type, id)
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
            list.push(new Storable(type, createKey(type, id)));
        }
        return list;
    };

    this.remove = function(key, txn) {
        if (!isKey(key)) {
            throw new Error("Invalid key object: " + key);
        }
        var [type, id] = key.$ref.split(":");
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

function dump() {
    datastore.dump();
}
