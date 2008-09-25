
importModule('helma.skin');
importModule('core.object');

function createHopObject(name) {
    var proto = importModule(name + ".*");
    var path = name.split(".");
    var ctor = proto[path[path.length - 1]] || function() {};
    proto.renderSkin = renderSkin;
    proto.addMacroHandler = addMacroHandler;
    // proto.encode = function(str) { return str; };
    ctor.prototype = proto;
    return ctor;
}

var handlers = {};

function renderSkin(obj, param) {
    res.write(this.renderSkinAsString(obj, param));
}

function renderSkinAsString(obj, param) {
    var context = {'this': this, 'param': param};
    if (this.macroHandlers) {
        this.macroHandlers.clone(context);
    }
    var skin;
    if (typeof(obj.render) == "function") {
        skin = obj;
    } else if (typeof(obj) == "string") {
        var subskin;
        if (obj.indexOf('#') > -1) {
            [obj, subskin] = obj.split('#');
        }
        var resource = this.getResource(obj + '.skin');
        var skin = helma.skin.createSkin(resource, this);
        if (subskin) {
            skin = skin.getSubskin(subskin);
        }
    } else {
        throw Error("Invalid skin object: " + obj);
    }
    return helma.skin.render(skin, context, this);
}

function addMacroHandler(name, handler) {
    if (!this.macroHandlers) {
        this.macroHandlers = {};
    }
    this.macroHandlers[name] = handler;
}