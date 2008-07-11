importModule('core.JSON');
importFromModule('helma.functional', 'partial');
importModule('helma.logging', 'logging');
logging.enableResponseLog();
var log = logging.getLogger(__name__);


var __shared__ = true;

/**
 * The base/wrapper prototype for persistent minibase objects
 *
 * @param object the raw javascript object to wrap
 * @param properties the persistent object properties (optional)
 */
function Storable(object, properties) {

    if (!(object instanceof Object) || !(object.constructor instanceof Function))
        throw new Error("object must be an object, was: " + properties);
    if (!(object.constructor instanceof Function))
        throw new Error("object must have a constructor property, has: "  + object.constructor);
    if (properties === undefined)
        properties = {};
    if (!(properties instanceof Object))
        throw new Error("properties must be an object, was: " + properties);

    var ctor = object.constructor;
    var type = ctor.name;
    var id;

    if (typeof type != "string")
        throw new Error("couldn't get type: " + type);


    this.__get__ = function(name) {
        if (name == "_id") {
            return id;
        } else if (name == "_type") {
            return type;
        }
        if (this[name]) return this[name];
        var value = properties[name];
        if (typeof value == 'object' && typeof value._id == 'string' && typeof value._type == 'string') {
            value = ctor.store.get(value._type, value._id);
        }
        return value;
    };

    this.__put__ = function(name, value) {
        if (name == "_id") {
            if (id != undefined) {
                throw new Error("Cannot change _id on storable object");
            }
            id = value;
            return;
        }
        properties[name] = value;
    };

    this.__delete__ = function(name) {
        delete properties[name];
    };

    this.__has__ = function(name) {
        return properties[name] !== undefined ||
               this[name] !== undefined;
    };

    this.__getIds__ = function() {
        var ids = [];
        for (var id in properties) {
            ids[ids.length] = id
        }
        return ids;
    };

    this.save = function() {
        ctor.save(this);
    };

    this.remove = function() {
        ctor.remove(this);
    };

    this.toString = function() {
        return "Storable " + type + "/" + id;
    };

    // make object our prototype and wrap self into JSAdapter
    this.__proto__ = object;
    return new JSAdapter(this);
    
}

/**
 * Minibase Store class
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

