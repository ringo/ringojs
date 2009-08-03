
include('helma/functional');
require('core/string');

export('Storable', 'setStore');

importPackage(org.mozilla.javascript);

var typeRegistry = {};
var __shared__ = true;

// must be set to a store implementation using Storable.setStoreImplementation()
var store;

// TODO make store a Storable argument instead of a module variable
function Storable(type, arg) {

    if (!store) {
        throw new Error("Store implementation not set. Use one of the helma/storage/* submodules!");
    }

    // if called with one argument, return a constructor for a concrete type.
    if (arguments.length == 1) {
        if (type in typeRegistry) {
            return typeRegistry[type];
        }
        var ctor = bindArguments(Storable, type);
        ctor.all = bindArguments(store.all, type);
        ctor.get = bindArguments(store.get, type);
        ctor.query = bindArguments(store.query, type);
        ctor.prototype = Object.create(Storable.prototype);
        typeRegistry[type] = ctor;
        return ctor;
    }

    // if a constructor is registered make sure we use it to get the
    // right prototype chain on the instance object
    if (type in typeRegistry && !(this instanceof typeRegistry[type])) {
        return new typeRegistry[type](arg);
    }

    // arg must be one of these, and we have methods to convert from one to the other:
    var key, entity, props;

    function ensureEntity() {
        if (!entity) {
            entity = store.getEntity(type, arg);
        }
        return entity;
    }

    function ensureKey() {
        if (!key) {
            key = store.getKey(type, arg) || store.getKey(type, ensureEntity());
        }
        return key;
    }

    function ensureProps() {
        if (!props) {
            props = store.getProps(type, arg) || store.getProps(type, ensureEntity());
        }
        return props;
    }

    var storable = new JavaAdapter(NativeObject, {
        get: function(id, start) {
            if (this.super$get(id, start) != Scriptable.NOT_FOUND) {
                return this.super$get(id, start);
            } else if (ensureProps()) {
                var value = props[id];
                if (value === undefined) {
                    return Scriptable.NOT_FOUND;
                } else {
                    return value;
                }
            }
            return Scriptable.NOT_FOUND;
        },

        put: function(id, start, value) {
            if (typeof value == "function") {
                return this.super$put(id, start, value);
            } else if (ensureProps()) {
                props[id] = value;
            }
        },

        has: function(id, start) {
            return this.super$has(id, start) ||
                   (ensureProps() && id in props);
        },

        "delete": function(id) {
            if (ensureProps() && id in props) {
                delete(props[id]);
            } else {
                this.super$delete(id);
            }
        },

        getIds: function() {
            var ids = this.super$getIds().concat();
            if (ensureProps()) {
                for (var id in props) {
                    ids.push(id);
                }
            }
            return ids;
        },

        equivalentValues: function(other) {
            if (other == this) {
                return true;
            }
            if (other instanceof Storable && ensureKey() && store.equalKeys(key, other._key)) {
                return true;
            }
            return Scriptable.NOT_FOUND;
        },

        getPrototype: function() {
            return typeRegistry[type].prototype;
        }
    });

    Object.defineProperty(storable, "save", {
        value: function(transaction) {
            if (ensureProps() && ensureEntity()) {
                store.save(props, entity, transaction);
            } else {
                throw Error("Error creating properties or entity " + props + " // " + entity);
            }
        }
    });

    Object.defineProperty(storable, "remove", {
        value: function(transaction) {
            if (ensureKey()) {
                store.remove(key, transaction);
            }
        }
    });

    Object.defineProperty(storable, "_key", {
        get: function() {
            if (ensureKey()) {
                return key;
            }
            throw Error("Can't get key from " + arg);
        }
    });

    Object.defineProperty(storable, "_id", {
        get: function() {
            if (ensureKey()) {
                return store.getId(key);
            }
            throw Error("Can't get id from " + arg);
        }
    });

    return storable;
}

Storable.setStoreImplementation = function(storeImpl) {
    store = storeImpl;
}