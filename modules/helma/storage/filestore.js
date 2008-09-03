importModule('helma.storage', 'storage');
importFromModule('helma.functional', 'partial');
importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

/**
 * Factory method for File Store implementation class, invoked by
 * helma.store.setStoreImpl().
 * @param args the arguments to pass to the Store constructor
 */
function createStore(args) {
    if (!(args instanceof Array) || args.length != 1) {
        throw Error("FileStore constructor requires single storage path argument");
    }
    return new Store(args[0]);
}

/**
 * File Store class
 * @param path the database directory
 */
function Store(path) {

    // the class registry
    var typeRegistry = {};

    this.registerType = function(ctor) {
        // add class to registry
        typeRegistry[ctor.name] = ctor;
        // install filter, all, and get methods on constructor
        ctor.filter = partial(this.filter, ctor.name);
        ctor.all = partial(this.getAll, ctor.name);
        ctor.get = partial(this.get, ctor.name);
        ctor.save = partial(this.save);
        ctor.remove = partial(this.remove);
        ctor.store = this;
    };

    this.filter = function(type, term) {
        throw new Error("not implemented");
    };

    this.getAll = function(type) {
        return base.getAll(type);
    }

    this.get = function(type, id) {
        return base.get(type, id);
    }

    this.save = function(txn, obj, properties) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = base.beginTransaction();
        }
        for (var i in properties) {
            var v = properties[i];
            if (storage.isStorable(v)) {
                if (storage.isTransientStorable(v)) {
                    v.save(txn);
                }
                properties[i] = v.getKey();
            }
        }
        var type = obj._type, id = obj._id;
        if (id == undefined) {
            id = base.insert(txn, type, properties);
            obj._id = id;
        } else {
            base.update(txn, type, id, properties);
        }
        if (wrapTransaction) {
            base.commitTransaction(txn);
        }
    };

    this.remove = function(txn, obj) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = base.beginTransaction();
        }
        for (var i in obj) {
            var v = obj[i];
            if (storage.isPersistentStorable(v)) {
                // cascading delete (just to show it works)
                v.remove(txn);
            }
        }
        var type = obj._type, id = obj._id;
        if (!type) {
            throw new Error("type not defined in object " + obj);
        }
        if (!id) {
            throw new Error("id not defined in object " + obj);
        }
        base.remove(txn, type, id);
        if (wrapTransaction) {
            base.commitTransaction(txn);
        }
    };

    this.begin = function() {
        return base.beginTransaction();
    }

    this.commit = function(txn) {
        base.commitTransaction(txn);
    }

    this.abort = function(txn) {
        base.abortTransaction(txn);
    }

    // the persister
    var persister = new org.helma.storage.Storage({

        store: function(object, outputStream) {
            log.debug("Storing object: " + object.toSource());
            var writer = new java.io.OutputStreamWriter(outputStream);
            for (var i in object) {}
            writer.write(object.toJSON());
            writer.close();
        },

        retrieve: function(type, id, inputStream) {
            var content = this.readInputStream(inputStream);
            var properties = content.parseJSON();
            var ctor = typeRegistry[type];
            if (!ctor) {
                throw new Error("constructor not registered for type " + type);
            }
            var obj = new ctor(properties);
            obj._id = id;
            return obj;
        },

        readInputStream: function(inputStream) {
            var reader = new java.io.BufferedReader(java.io.InputStreamReader(inputStream));
            var content = new java.lang.StringBuffer(), line;
            while ((line = reader.readLine()) != null) {
                content.append(line);
            }
            return content.toString()
        }

    });

    var file = new java.io.File(path);
    var base = new org.helma.storage.file.FileStorage(file, persister);
    log.debug("Set up new store: " + base);

};
