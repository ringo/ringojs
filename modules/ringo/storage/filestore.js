require('core/object');
require('core/array');
include('ringo/engine');
include('ringo/file');
include('ringo/functional');
include('./storeutils');
include('./querysupport');

export("Store", "Transaction");

module.shared = true;
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
        getProps: getProps,
        getId: getId,
        equalKeys: equalKeys
    };

    this.defineClass = function(type) {
        var ctor = registry[type];
        if (!ctor) {
            ctor = registry[type] = Storable.defineClass(proxy, type);
            ctor.all = bindArguments(all, type);
            ctor.get = bindArguments(get, type);
            ctor.query = bindArguments(query, type);
        }
        return ctor;
    }

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

        var dir = new File(base, type);
        if (!dir.exists()) {
            if (!dir.makeDirectory()) {
                throw new Error("Can't create directory for type " + type);
            }
        }

        var file = new File(dir, id);
        if (file.exists() && !file.canWrite()) {
            throw new Error("No write permission for " + file);
        }

        var tempFileName = type + id + ".";
        var tempfile = base.createTempFile(tempFileName, ".tmp");

        if(log.isDebugEnabled())
            log.debug("Storing object: " + entity.toSource());

        tempfile.open({ append: true });
        tempfile.write(JSON.stringify(entity));
        tempfile.close();
        txn.updateResource({ file: file, tempfile: tempfile });
    };

    function load(type, id) {
        var file = new File(new File(base, type), id);

        if (!file.exists()) {
            return null;
        } else if (!file.isFile()) {
            throw new Error("Is not a regular file: " + file);
        }

        var content = file.readAll();
        var entity = JSON.parse(content);
        Object.defineProperty(entity, "_key", {
            value: createKey(type, id)
        });
        return entity;
    };

    function retrieve(type, id) {
        var entity = load(type, id);
        if (entity) {
            return create(type, createKey(type, id), entity);
        }
        return null;
    };

    function retrieveAll(type) {
        var dir = new File(base, type);
        if (!dir.exists() || !dir.isDirectory()) {
            return [];
        }
        var files = dir.listFiles();
        var list = [];

        for each (var file in files) {
            if (!file.isFile() || file.isHidden()) {
                continue;
            }
            list.push(create(type, createKey(type, file.getName())));
        }
        return list;
    };

    function removeImpl(key, txn) {
        if (!isKey(key)) {
            throw new Error("Invalid key object: " + key);
        }
        var [type, id] = key.$ref.split(":");
        var file = new File(new File(base, type), id);
        txn.deleteResource({ file: file });        
    };

    function generateId(type) {
        var dir = new File(base, type);
        var id = idMap[type] || 1;
        var file = new File(dir, id.toString(36));
        while(file.exists()) {
            id += 1;
            file = new File(dir, id.toString(36));
        }

        idMap[type] = id + 1;
        return file.getName();
    };

    var base = new File(path);
    log.debug("Set up new store: " + base);

};

function Transaction() {

    var updateList = [];
    var deleteList = [];

    var tx = new BaseTransaction();

    tx.deleteResource = function(res) {
        deleteList.push(res);
    }

    tx.updateResource = function(res) {
        updateList.push(res);
    }

    tx.commit = function() {
        for each (var res in updateList) {
            // because of a Java/Windows quirk, we have to delete
            // the existing file before trying to overwrite it
            if (res.file.exists()) {
                res.file.remove();
            }
            // move temporary file to permanent name
            if (res.tempfile.renameTo(res.file)) {
                // success - delete tmp file
                res.tempfile.remove();
            } else {
                // error - leave tmp file and print a message
                log.error("Couldn't move file, committed version is in " + res.tempfile);
            }
        }

        for each (var res in deleteList) {
            res.file.remove();
        }

        updateList = [];
        deleteList = [];
    }

    tx.abort = function() {
        for each (var res in updateList) {
            res.tempfile.remove();
        }
    }

    return tx;
}
