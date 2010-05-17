require('core/object');
require('core/array');
var {Path} = require('fs');
var futils = require('ringo/fileutils');
include('ringo/engine');
include('ringo/functional');
include('./storeutils');
include('./querysupport');

export("Store", "Transaction");

var log = require('ringo/logging').getLogger(module.id);
addHostObject(org.ringojs.wrappers.Storable);

/**
 * File Store class
 * @param path the database directory
 */
function Store(path) {

    // map of type to current id tip
    var idMap = {};
    var self = this;
    var registry = {};

    var proxy = {
        all: all,
        get: get,
        query: query,
        create: create,
        save: save,
        remove: remove,
        getEntity: getEntity,
        getKey: getKey,
        getProperties: getProperties,
        getId: getId,
        equalKeys: equalKeys
    };

    this.defineEntity = function(type) {
        var ctor = registry[type];
        if (!ctor) {
            ctor = registry[type] = Storable.defineEntity(proxy, type);
            ctor.all = bindArguments(all, type);
            ctor.get = bindArguments(get, type);
            ctor.query = bindArguments(query, type);
        }
        return ctor;
    };

    function create(type, key, entity) {
        var ctor = registry[type];
        return ctor.createInstance(key, entity);
    }

    function all(type) {
        return retrieveAll(type);
    }

    function get(type, id) {
        return retrieve(type, id);
    }

    function save(props, entity, txn) {
        var wrapTransaction = false;
        if (!txn) {
            txn = new Transaction();
            wrapTransaction = true;
        }

        if (updateEntity(props, entity, txn)) {
            store(entity, txn);
            if (wrapTransaction) {
                txn.commit();
            }
        }
    }

    function remove(key, txn) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = new Transaction();
        }

        removeImpl(key, txn);

        if (wrapTransaction) {
            txn.commit();
        }
    }

    function query(type) {
        return new BaseQuery(bindArguments(all, type));
    }

    function getEntity(type, arg) {
        if (isKey(arg)) {
            var [type, id] = arg.$ref.split(":");
            return load(type, id);
        } else if (isEntity(arg)) {
            return arg;
        } else if (arg instanceof Object) {
            var entity = arg.clone({});
            Object.defineProperty(entity, "_key", {
                value: createKey(type, generateId(type))
            });
            return entity;
        }
        return null;
    }


    function store(entity, txn) {
        var [type, id] = entity._key.$ref.split(":");

        var dir = new Path(base, type);
        if (!dir.exists()) {
            dir.makeTree();
        }

        var file = new Path(dir, id);
        if (file.exists() && !file.isWritable()) {
            throw new Error("No write permission for " + file);
        }

        var tempFileName = type + id + ".";
        var tempfile = new Path(futils.createTempFile(tempFileName, ".tmp", base));

        if(log.isDebugEnabled())
            log.debug("Storing object: " + entity.toSource());

        tempfile.write(JSON.stringify(entity));
        txn.updateResource({ file: file, tempfile: tempfile });
    }

    function load(type, id) {
        var file = new Path(base, type, id);

        if (!file.exists()) {
            return null;
        } else if (!file.isFile()) {
            throw new Error("Is not a regular file: " + file);
        }

        var content = file.read();
        var entity = JSON.parse(content);
        Object.defineProperty(entity, "_key", {
            value: createKey(type, id)
        });
        return entity;
    }

    function retrieve(type, id) {
        var entity = load(type, id);
        if (entity) {
            return create(type, createKey(type, id), entity);
        }
        return null;
    }

    function retrieveAll(type) {
        var dir = new Path(base, type);
        if (!dir.exists() || !dir.isDirectory()) {
            return [];
        }
        var files = dir.listPaths();
        var list = [];

        for each (var file in files) {
            if (!file.isFile() || futils.isHidden(file)) {
                continue;
            }
            list.push(create(type, createKey(type, file.base())));
        }
        return list;
    }

    function removeImpl(key, txn) {
        if (!isKey(key)) {
            throw new Error("Invalid key object: " + key);
        }
        var [type, id] = key.$ref.split(":");
        var file = new Path(base, type, id);
        txn.deleteResource({ file: file });        
    }

    function generateId(type) {
        var dir = new Path(base, type);
        var id = idMap[type] || 1;
        var file = new Path(dir, id.toString(36));
        while(file.exists()) {
            id += 1;
            file = new Path(dir, id.toString(36));
        }

        idMap[type] = id + 1;
        return file.base();
    }

    var base = new Path(path);
    log.debug("Set up new store: " + base);

}

function Transaction() {

    var updateList = [];
    var deleteList = [];

    var tx = new BaseTransaction();

    tx.deleteResource = function(res) {
        deleteList.push(res);
    };

    tx.updateResource = function(res) {
        updateList.push(res);
    };

    tx.commit = function() {
        for each (var res in updateList) {
            // because of a Java/Windows quirk, we have to delete
            // the existing file before trying to overwrite it
            if (res.file.exists()) {
                res.file.remove();
            }
            // move temporary file to permanent name
            res.tempfile.move(res.file);
        }

        for each (var res in deleteList) {
            res.file.remove();
        }

        updateList = [];
        deleteList = [];
    };

    tx.abort = function() {
        for each (var res in updateList) {
            res.tempfile.remove();
        }
    };

    return tx;
}
