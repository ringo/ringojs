module.singleton("m1");
module.singleton("m2");

exports.set = function(obj, fun) {
    module.singleton("m1", obj);
    module.singleton("m2", fun);
};

exports.get = function(m) {
    return module.singleton(m);
};