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
        txn = base.beginTransaction();
        var list = base.getAll(txn, type);
        base.commitTransaction(txn);
        return list;
    }

    this.get = function(type, id) {
        txn = base.beginTransaction();
        var obj = base.get(txn, type, id);
        base.commitTransaction(txn);
        return obj;
    }

    this.save = function(obj) {
        txn = base.beginTransaction();
        var type = obj._type, id = obj._id;
        if (id == undefined) {
            id = base.insert(txn, type, obj);
            obj._id = id;
        } else {
            base.update(txn, type, id, obj);
        }
        base.commitTransaction(txn);
    };

    this.remove = function(obj) {
        txn = base.beginTransaction();
        var type = obj._type, id = obj._id;
        if (!type) {
            throw new Error("type not defined in object " + obj);
        }
        if (!id) {
            throw new Error("id not defined in object " + obj);
        }
        base.remove(txn, type, id);
        base.commitTransaction(txn);
    };

    // the persister
    var storage = new org.helma.storage.Storage({

        store: function(object, outputStream) {
            log.debug("Storing object: " + object.toSource());
            var writer = new java.io.OutputStreamWriter(outputStream);
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
    var base = new org.helma.storage.file.FileStorage(file, storage);
    log.debug("Set up new store: " + base);

};
