
importModule('helma.skin');
importModule('core.object');

function createHopObject(name) {
    var proto = importModule(name + ".*");
    var path = name.split(".");
    var ctor = proto[path[path.length - 1]] || function() {};
    proto.renderSkin = renderSkin;
    proto.addMacroHandler = addMacroHandler;
    ctor.prototype = proto;
    return ctor;
}

var handlers = {};

function renderSkin(name, param) {
    var context = {'this': this, 'param': param};
    if (this.macroHandlers) {
        this.macroHandlers.clone(context);
    }
    var subskin;
    if (name.indexOf('#') > -1) {
        [name, subskin] = name.split('#');
    }
    var resource = this.getResource(name + '.skin');
    var skin = helma.skin.createSkin(resource, this);
    if (subskin) {
        skin = skin.getSubskin(subskin);
    }
    helma.skin.renderSkin(skin, context, this);
}

function addMacroHandler(name, handler) {
    if (!this.macroHandlers) {
        this.macroHandlers = {};
    }
    this.macroHandlers[name] = handler;
}