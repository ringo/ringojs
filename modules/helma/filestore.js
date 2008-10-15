require('core.object');
require('core.JSON');
var File = require('helma.file').File;
var partial = require('helma.functional').partial;
var log = require('helma.logging').getLogger(__name__);

var __shared__ = true;

var __export__ = [
    "Store",
    "Transaction",
    "Reference",
    "Collection",
    "Text"
]

var TEXT = 0;
var REFERENCE = 10;
var COLLECTION = 20;
var LIST = 21;

function Text() {
    return {id: TEXT};
}

function Reference(type) {
    if (!type) {
        throw new Error("Missing type argument in Reference()");
    }
    return {id: REFERENCE, type: type};
}

function Collection(type, options) {
    if (!type) {
        throw new Error("Missing type argument in Collection()");
    }
    return {id: COLLECTION, type: type, options: options};
}

function List(type, options) {
    if (!type) {
        throw new Error("Missing type argument in List()");
    }
    return {id: LIST, type: type, options: options};
}

/**
 * File Store class
 * @param path the database directory
 */
function Store(path) {

    // the class registry
    var typeRegistry = {};

    // map of type to current id tip
    var idMap = {};

    /**
     * @param constructor a plain JavaScript constructor
     * @param fields container of fields defined for this object type
     */
    this.registerType = function(constructor, fields) {
        if (typeof constructor != "function") {
           throw new Error("registerType() called with non-function argument: " + constructor);
        }
        if (typeof constructor.name != "string") {
           throw new Error("constructor must not be an anonymous function");
        }

        var typeName = constructor.name;

        // install filter, all, and get methods on constructor
        constructor.list = partial(list, typeName);
        constructor.all = partial(getAll, typeName);
        constructor.get = partial(get, typeName);
        constructor.store = this;
        // add class to registry
        typeRegistry[typeName] = constructor;

        function getter(name, def) {
            if (def.id == REFERENCE) {
                var key = this.properties[name];
                if (isKey(key)) {
                    return get(key._type, key._id);
                }
            } else if (def.id == LIST) {
                if (def.options) {
                    return def.type.list(def.options, this);
                } else {
                    return def.type.all();
                }
            }
            return this.properties[name];
        }

        function setter(name, definition, value) {
            if (value == null) {
                delete this.properties[name];
            } else {
                this.properties[name] = value;
            }
        }

        var proto = constructor.prototype;

        for (var [key, field] in fields) {
            proto.__defineSetter__(key, partial(setter, key, field));
            proto.__defineGetter__(key, partial(getter, key, field));
        }

        proto.__defineGetter__("_type", function() {
            return typeName;
        });

        proto.getKey = function() {
            if (!(typeof this._id == "string")) {
                throw new Error("getKey() called on non-persistent object");
            }
            return {_id: this._id, _type: this._type};
        }

        proto.save = function(txn) {
            save(txn, this);
        };

        proto.remove = function(txn) {
            remove(txn, this);
        };

        proto.toString = function() {
            return typeName + this.properties.toSource();
        };

        proto.equals = function(obj) {
            return this === obj || obj &&
                                   this._type === obj._type &&
                                   this._id == obj._id;
        }

        proto.__iterator__ = function(namesOnly) {
            for (var i in this.properties) {
                yield namesOnly ? i : [i, this[i]];
            }
            throw StopIteration;
        }
    }

    this.getRegisteredType = function(name) {
        return typeRegistry[name];
    }

    var list = function(type, options, thisObj) {
        var array = getAll(type);
        if (options) {
            // first filter out the the items we're not interested in
            var filter = options.filter;
            if (typeof filter == "function") {
                array = array.filter(filter, thisObj);
            }
            // then put them into order
            var [orderBy, ascDesc] = [options.orderBy, options.order == "desc" ? -1 : 1];
            if (options.orderBy) {
                array = array.sort(function(o1, o2) {
                    var [p1, p2] = [o1[orderBy], o2[orderBy]];
                    if (p1 < p2) return -1 * ascDesc;
                    if (p1 > p2) return  1 * ascDesc;
                    return 0;
                })
            }
            // finally apply pagination/slicing
            var [start, max] = [parseInt(options.start, 10), parseInt(options.max, 10)];
            if (isFinite(start) || isFinite(max)) {
                var start = start || 0;
                array = array.slice(start, start + max || array.length);
            }
        }
        return array;
    };

    var getAll = function(type) {
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
           list.push(persister.retrieve(type, new File(file)));
       }
       return list;
    }

    var get = this.get = function(type, id) {
       var dir = new File(base, type);
       var file = new File(dir, id);

       if (!file.exists()) {
           return null;
       } else if (!file.isFile()) {
           throw new Error("Is not a regular file: " + file);
       }
       return persister.retrieve(type, file);
    }

    var save = function(txn, obj) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = new Transaction();
        }
        for (var i in obj.properties) {
            var v = obj.properties[i];
            if (isStorable(v)) {
                if (isTransientStorable(v)) {
                    v.save(txn);
                }
                obj.properties[i] = v.getKey();
            }
        }
        var [type, id] = [obj._type, obj._id];
        var dir = new File(base, type);
        if (!dir.exists()) {
            if (!dir.makeDirectory()) {
                throw new Error("Can't create directory for type " + type);
            }
        }
        if (id == undefined) {
            obj._id = id = persister.generateId(type, dir);
        }

        var file = new File(dir, id);
        var tempFileName = type + id + ".";
        var tempfile = base.createTempFile(tempFileName, ".tmp");

        persister.store(obj.properties, tempfile);

        if (file.exists() && !file.canWrite()) {
            throw new Error("No write permission for " + file);
        }

        txn.updateResource({ file: file, tempfile: tempfile });

        if (wrapTransaction) {
            txn.commit();
        }
    };

    var remove = function(txn, obj) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = new Transaction();
        }
        for (var i in obj) {
            var v = obj[i];
            if (isPersistentStorable(v)) {
                // cascading delete (just to show it works)
                v.remove(txn);
            }
        }
        var [type, id] = [obj._type, obj._id];
        if (!type) {
            throw new Error("type not defined in object " + obj);
        }
        if (!id) {
            throw new Error("id not defined in object " + obj);
        }

        var file = new File(new File(base, type), id);
        txn.deleteResource({ file: file });

        if (wrapTransaction) {
            txn.commit();
        }
    };

    // the persister
    var persister = {

        store: function(object, file) {
            log.debug("Storing object: " + object.toSource());
            file.open({ append: true });
            file.write(object.toJSON());
            file.close();
        },

        retrieve: function(type, file) {
            var content = file.readAll();
            var properties = content.parseJSON();
            var ctor = typeRegistry[type];
            if (!ctor) {
                throw new Error("constructor not registered for type " + type);
            }
            var obj = new ctor(properties);
            obj._id = file.getName();
            return obj;
        },

        generateId: function(type, dir) {
            var id = idMap[type] || 1;
            var file = new File(dir, id.toString(36));
            while(file.exists()) {
                id += 1;
                file = new File(dir, id.toString(36));
            }

            idMap[type] = id + 1;
            return file.getName();
        }

    };

    var base = new File(path);
    log.debug("Set up new store: " + base);

};

var isKey = function(value) {
    return value
            && !value.getKey
            && typeof value._id == 'string';
}

var isStorable = function(value) {
    return value && typeof value.getKey == 'function';
}

var isPersistentStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'string';
}

var isTransientStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'undefined';
}

function Transaction() {

   var updateList = [];
   var deleteList = [];

   this.deleteResource = function(res) {
      deleteList.push(res);
   }

   this.updateResource = function(res) {
      updateList.push(res);
   }

   this.commit = function() {
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

   this.abort = function() {
      for each (var res in updateList) {
         res.tempfile.remove();
      }
   }
}