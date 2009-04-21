var Hash = require("hash").Hash;

// HashP : Case Preserving hash, used for headers

var HashP = exports.HashP = {};

HashP.get = function(hash, key) {
    var ikey = _findKey(hash, key);
    if (ikey !== null)
        return hash[ikey];
    // not found
    return undefined;
}

HashP.set = function(hash, key, value) {
    // do case insensitive search, and delete if present
    var ikey = _findKey(hash, key);
    if (ikey && ikey !== key)
        delete hash[ikey];
    // set it, preserving key case
    hash[key] = value;
}

HashP.unset = function(hash, key) {
    // do case insensitive search, and delete if present
    var ikey = _findKey(hash, key),
        value;
    if (ikey) {
        value = hash[ikey];
        delete hash[ikey];
    }
    return value;
}

HashP.includes = function(hash, key) {
    return HashP.get(hash, key) !== undefined
}

HashP.merge = function(hash, other) {
    var merged = {};
    if (hash) HashP.update(merged, hash);
    if (other) HashP.update(merged, other);
    return merged;
}

HashP.update = function(hash, other) {
    for (var key in other)
        HashP.set(hash, key, other[key]);
    return hash;
}

HashP.forEach = Hash.forEach;
HashP.map = Hash.map;

var _findKey = function(hash, key) {
    // optimization
    if (hash[key] !== undefined)
        return key;
    // case insensitive search
    var key = key.toLowerCase();
    for (var i in hash)
        if (i.toLowerCase() === key)
            return i;
    return null;
}
