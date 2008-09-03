importModule('core.JSON');
importModule('helma.logging', 'logging');
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
        if (isKey(value)) {
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
        if (isPersistentStorable(value)) {
            value = value.getKey();
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

    this.save = function(txn) {
        ctor.save(txn, this, properties);
    };

    this.remove = function(txn) {
        ctor.remove(txn, this);
    };

    this.getKey = function() {
        if (!(typeof id == "string")) {
            throw new Error("getKey() called on non-persistent object");
        }
        return {_id: id, _type: type};
    }

    this.toString = function() {
        return "Storable " + type + "/" + id;
    };

    // make object our prototype and wrap self into JSAdapter
    this.__proto__ = object;
    return new JSAdapter(this);
    
}

/**
 * Set the storage implementation.
 *
 * @param moduleName the module name of the store implementation.
 *   the module must provide a factory method called "createStore"
 *   taking an array argument containing the store constructor arguments.
 * @param args an array containing the arguments for the store constructor
 */
function setStoreImpl(moduleName, args) {
    var impl = importModule(moduleName);
    this.store = this.store || impl.createStore(args);
}

var isKey = function(value) {
    return value instanceof Object
            && typeof value._id == 'string'
            && typeof value._type == 'string';
}

var isStorable = function(value) {
    return value instanceof JSAdapter
            && typeof value._type == 'string';
}

var isPersistentStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'string';
}

var isTransientStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'undefined';
}
