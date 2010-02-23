
require('core/string');
include('ringo/engine');
include('ringo/functional');

export('defineClass', 'beginTransaction', 'getTransaction', 'commitTransaction', 'abortTransaction');

importPackage(com.google.appengine.api.datastore);
addHostObject(org.ringojs.wrappers.Storable);

var __shared__ = true;
var datastore = DatastoreServiceFactory.getDatastoreService();
var registry = {};
var self = this;

// HACK: google datastore only allows entities in the same entity group
// to be modified in the same transaction, so we put all our app's data
// into one big entity group
var rootKey = KeyFactory.createKey("Root", "root");

var EQUAL =                 Query.FilterOperator.EQUAL;
var GREATER_THAN =          Query.FilterOperator.GREATER_THAN;
var GREATER_THAN_OR_EQUAL = Query.FilterOperator.GREATER_THAN_OR_EQUAL;
var LESS_THAN =             Query.FilterOperator.LESS_THAN;
var LESS_THAN_OR_EQUAL =    Query.FilterOperator.LESS_THAN_OR_EQUAL;

function defineClass(type) {
    var ctor = registry[type];
    if (!ctor) {
        ctor = registry[type] = Storable.defineClass(self, type);
        ctor.all = bindArguments(all, type);
        ctor.get = bindArguments(get, type);
        ctor.query = bindArguments(query, type);
    }
    return ctor;
}

function beginTransaction() {
    return datastore.beginTransaction();
}

function getTransaction() {
    return datastore.getCurrentTransaction(null);
}

function commitTransaction() {
    var tx = getTransaction();
    if (tx) {
        tx.commit();
    }
}

function abortTransaction() {
    var tx = getTransaction();
    if (tx) {
        tx.rollback();
    }
}

function create(type, key, entity) {
    var ctor = registry[type];
    return ctor.createInstance(key, entity);
}

function evaluateQuery(query, property) {
    var result = [];
    var type = query.getKind();
    var i = datastore.prepare(query).asIterator();
    while (i.hasNext()) {
        var entity = i.next();
        var s = create(type, entity.getKey(), entity);
        result.push(property ? s[property] : s);
    }
    return result;
}

function BaseQuery(type) {
    this.select = function(property) {
        return evaluateQuery(this.getQuery(), property);
    };
    this.getQuery = function() {
        return new Query(type);
    };
}

function OperatorQuery(parentQuery, operator, property, value) {
    this.select = function(selectProperty) {
        return evaluateQuery(this.getQuery(), selectProperty);
    };
    this.getQuery = function() {
        var query = parentQuery.getQuery();
        return query.addFilter(property, operator, value);
    };
}

BaseQuery.prototype.equals = function(property, value) {
    return new OperatorQuery(this, EQUAL, property, value);
};

BaseQuery.prototype.greater = function(property, value) {
    return new OperatorQuery(this, GREATER_THAN, property, value);
};

BaseQuery.prototype.greaterEquals = function(property, value) {
    return new OperatorQuery(this, GREATER_THAN_OR_EQUAL, property, value);
};

BaseQuery.prototype.less = function(property, value) {
    return new OperatorQuery(this, LESS_THAN, property, value);
};

BaseQuery.prototype.lessEquals = function(property, value) {
    return new OperatorQuery(this, LESS_THAN_OR_EQUAL, property, value);
};

BaseQuery.prototype.clone(OperatorQuery.prototype);


function all(type) {
    return evaluateQuery(new Query(type));
}

function query(type) {
    return new BaseQuery(type);
}

function get(type, id) {
	var key = KeyFactory.createKey(rootKey, type, id);
	if (!isKey(key)) {
		throw Error("Storable.get() called with non-key argument");
	}
	return create(key.getKind(), key, datastore.get(getTransaction(), key));
}

function save(props, entity, entities) {
    if (entities && entities.contains(entity)) {
        return;
    }
    var isRoot = false;
    if (!entities) {
        isRoot = true;
        entities = new java.util.HashSet();
    }
    entities.add(entity);
    for (var id in props) {
        var value = props[id];
        if (isStorable(value)) {
            value.save(entities);
            value = value._key;
        } else if (value instanceof Array) {
            var list = new java.util.ArrayList();
            value.forEach(function(obj) {
                if (obj instanceof Storable) {
                    obj.save(entities);
                    list.add(obj._key);
                } else {
                    list.add(obj);
                }
            });
            value = list;
        } else if (typeof value === 'string' && value.length > 500) {
            // maximal length for ordinary strings is 500 chars in datastore
            value = new Text(value); 
        } else if (value instanceof Date) {
            value = new java.util.Date(value.getTime());
        }
        entity.setProperty(id, value);
    }
    if (isRoot) {
        datastore.put(getTransaction(), entities);
    }
}

function remove(key) {
    datastore['delete(com.google.appengine.api.datastore.Transaction,com.google.appengine.api.datastore.Key[])'](getTransaction(), [key]);
}

function equalKeys(key1, key2) {
    return key1 && key1.equals(key2);
}

function getEntity(type, arg) {
    if (isKey(arg)) {
        return datastore.get(getTransaction(), arg);
    } else if (isEntity(arg)) {
        return arg;
    } else if (arg instanceof Object) {
        // HACK: we generate our own ids as google autogenerated ids
        // are only created when entities are actually stored, but we
        // need them before to resolve references in pre-store
        var id, idlength = 10;
        do {
            id = "k" + String.random(idlength++);
            var entity = new Entity(type, id, rootKey);
            try {
                datastore.get(getTransaction(), entity.getKey()) != null
            } catch (notfound) {
                break;
            }
        } while(true);
        return entity;
    }
    return null;
}

function getKey(type, arg) {
    if (isKey(arg)) {
        return arg;
    } else if (arg instanceof Entity) {
        return arg.getKey();
    }
    return null;
}

function getProps(store, entity) {
    var props = {};
    var map = new ScriptableMap(entity.getProperties());
    for (var i in map) {
        var value = map[i];
        if (isKey(value)) {
            value = create(value.getKind(), value);
        } else if (value instanceof java.util.List) {
            var array = [];
            for (var it = value.iterator(); it.hasNext(); ) {
                var obj = it.next();
                array.push(isKey(obj) ?
                           create(obj.getKind(), obj) : obj);
            }
            value = array;
        } else if (value instanceof Text) {
            value = value.getValue();
        } else if (value instanceof java.util.Date) {
            value = new Date(value.getTime());
        } else {
            value = Context.javaToJS(value, global);
        }
        props[i] = value;
    }
    return props;
}

function getId(key) {
    return key ? key.getName() : null;
}

function isEntity(value) {
    return value instanceof Entity;
}

function isKey(value) {
    return value instanceof Key;
}

function isStorable(value) {
    return value instanceof Storable;
}

