// Hash object

var Hash = exports.Hash = {};

Hash.merge = function(hash, other) {
    var merged = {};
    if (hash) Hash.update(merged, hash);
    if (other) Hash.update(merged, other);
    return merged;
}

Hash.update = function(hash, other) {
    for (var key in other)
        hash[key] = other[key];
    return hash;
}

Hash.forEach = function(hash, block) {
    for (var key in hash)
        block(key, hash[key]);
}

Hash.map = function(hash, block) {
    var result = [];
    for (var key in hash)
        result.push(block(key, hash[key]));
    return result;
}
