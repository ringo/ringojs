require('core/string');
require('core/object');
var engine = require('ringo/engine');

export('render', 'createSkin', 'Skin');

var log = require('ringo/logging').getLogger(module.id);
var skincache = false; // {}

engine.addHostObject(org.ringojs.template.MacroTag);

/**
 * Parse a skin from a resource and render it using the given context.
 * @param skinOrResource a skin object, ringojs resource, or file name
 * @param context the skin render context
 */
function render(skinOrResource, context) {
    var skin;
    if (typeof(skinOrResource.render) == "function") {
        skin = skinOrResource;
    } else if (skinOrResource instanceof org.ringojs.repository.Resource) {
        skin = createSkin(skinOrResource);
    } else if (typeof(skinOrResource) == "string") {
        var subskin;
        if (skinOrResource.indexOf('#') > -1) {
            [skinOrResource, subskin] = skinOrResource.split('#');
        }
        var resource = this.getResource(skinOrResource);
        skin = createSkin(resource);
        if (subskin) {
            skin = skin.getSubskin(subskin);
        }
    } else {
        throw Error("Unknown skin object: " + skinOrResource);
    }
    return skin.render(context);
}

/**
 * Resolve a skin path (given as string) against a base (which can be either a
 * resource or a name as string).
 */
function resolveSkin(base, skinPath) {
    var skinResource;
    var parentRepo = base.parentRepository;
    if (parentRepo && skinPath.startsWith(".")) {
        skinResource = parentRepo.getResource(skinPath);
    }
    if (!skinResource || !skinResource.exists()) {
        skinResource = getResource(skinPath);
    }
    return skinResource;
}

/**
 * Parse a skin from a resource.
 * @param resourceOrString the skin resource or string
 */
function createSkin(resourceOrString) {
    if (this.skincache && resourceOrString in skincache) {
        return skincache[resourceOrString];
    }
    if (log.isDebugEnabled())
        log.debug("creating skin: " + resourceOrString);
    var mainSkin = [];
    var subSkins = {};
    var currentSkin = mainSkin;
    var parentSkin = null;
    var eng = engine.getRhinoEngine();
    var parser = new org.ringojs.template.SkinParser({
        renderText: function(text) {
            currentSkin[currentSkin.length] = text;
        },
        renderMacro: function(macro) {
            eng.wrapArgument(macro, global);
            if (macro.name === 'extends') {
                var skinPath = macro.getParameter(0);
                var skinResource = resolveSkin(resourceOrString, skinPath);
                parentSkin = createSkin(skinResource);
            } else if (macro.name === 'subskin')  {
                var skinName = macro.getParameter('name', 0);
                currentSkin = [];
                currentSkin.subskinFilter = macro.filter;
                subSkins[skinName] = currentSkin;
            } else {
                currentSkin[currentSkin.length] = macro;
            }
        }
    });
    parser.parse(resourceOrString);
    // normalization: cut trailing whitespace so it's
    // easier to tell if main skin should be inherited
    var lastPart = mainSkin[mainSkin.length - 1];
    if (typeof(lastPart) === 'string' && lastPart.trim() === '') {
        mainSkin.pop();
    }
    var skin = new Skin(mainSkin, subSkins, parentSkin, resourceOrString);
    if (skincache)
        skincache[resourceOrString] = skin;
    return skin;
}

/**
 * The Skin object. This takes an array of skin parts (literal strings and MacroTags)
 * and a dictionary of subskins.
 * @param mainSkin an array of skin parts: string literals and macro tags
 * @param subSkins a dictionary of named skin components
 */
function Skin(mainSkin, subSkins, parentSkin, resourceOrString) {

    var self = this;

    this.render = function render(context) {
        // extend context by globally provided macros and filters.
        // user-provided context overrides globally defined stuff
        var webenv = require('ringo/webapp/env');
        context = webenv.loadMacros(context);
        if (mainSkin.length === 0 && parentSkin) {
            return renderInternal(parentSkin.getSkinParts(), context);
        }
        return renderInternal(mainSkin, context);
    };

    this.renderSubskin = function renderSubskin(skinName, context) {
        var subSkin = subSkins[skinName];
        if (!subSkin) {
            // First, try to find subskin in parent skins.
            var parts = parentSkin && parentSkin.getSkinParts(skinName);
            if (parts) {
                return renderInternal(parts, context);
            }
            // If that fails, try to load the subskin as external skin.
            var skinResource = resolveSkin(resourceOrString, skinName);
            if (skinResource && skinResource.exists()) {
                subSkin = subSkins[skinName] = createSkin(skinResource);
            }
            // We still might have no subskin here. That's fine, as
            // renderInternal can cope.
        }
        if (subSkin instanceof Skin) {
            return subSkin.render(context);
        }
        return renderInternal(subSkin, context);
    };

    this.getSubskin = function getSubskin(skinName) {
        if (subSkins[skinName]) {
            return new Skin(subSkins[skinName], subSkins, parentSkin);
        }
        return null;
    };

    this.getSkinParts = function getSkinParts(skinName) {
        var parts = skinName ? subSkins[skinName] : mainSkin;
        if (!parts || (!skinName && parts.length === 0)) {
            return parentSkin ? parentSkin.getSkinParts(skinName) : null;
        }
        return parts;
    };

    function renderInternal(parts, context) {
        var value = [renderPart(part, context) for each (part in parts)].join('');
        if (parts && parts.subskinFilter) {
            return evaluateFilter(value, parts.subskinFilter, context);
        }
        return value;
    }

    function renderPart(part, context) {
        return part instanceof MacroTag && part.name
                ? evaluateMacro(part, context)
                : part;
    }

    function evaluateMacro(macro, context) {
        // evaluate the macro itself
        var value = evaluateExpression(macro, context, '_macro');
        return evaluateFilter(value, macro.filter, context);
    }

    function evaluateFilter(value, filter, context) {
        // traverse the linked list of filters
        while (filter) {
            // make sure value is not undefined, otherwise evaluateExpression()
            // might become confused
            if (!isVisible(value)) {
                value = "";
            }
            value = evaluateExpression(filter, context, '_filter', value);
            filter = filter.filter;
        }
        if (value instanceof Array) {
            value = value.join('');
        }
        return value;
    }

    function evaluateExpression(macro, context, suffix, value) {
        if (log.isDebugEnabled())
            log.debug('evaluating expression: ' + macro);
        if (builtin[macro.name]) {
            return builtin[macro.name](macro, context);
        }
        var path = macro.name.split('.');
        var elem = context;
        var length = path.length;
        var last = path[length-1];
        for (var i = 0; i < length - 1; i++) {
            elem = elem[path[i]];
            if (!isDefined(elem)) {
                break;
            }
        }
        if (isDefined(elem)) {
            if (elem[last + suffix] instanceof Function) {
                return value === undefined ?
                       elem[last + suffix].call(elem, macro, context, self) :
                       elem[last + suffix].call(elem, value, macro, context, self);
            } else if (value === undefined && isDefined(elem[last])) {
                if (elem[last] instanceof Function) {
                    return elem[last].call(elem, macro, context, self);
                }
                return elem[last];
            }
        }
        // TODO: if filter is not found just return value as is
        return value;
    }

    function isDefined(elem) {
        return elem !== undefined && elem !== null;
    }

    function isVisible(elem) {
        return elem !== undefined && elem !== null && elem !== '';
    }

    // builtin macro handlers
    var builtin = {
        "render": function(macro, context) {
            var skinName = macro.getParameter(0);
            var skin = getEvaluatedParameter(skinName, context, 'render:skin');
            return skin == null ? "" : self.renderSubskin(skin, context);
        },

        "echo": function(macro, context) {
            var result = macro.parameters.map(function(elem) {
                return getEvaluatedParameter(elem, context, 'echo');
            });
            var wrapper = macro.getParameter("wrap") || macro.getParameter("echo-wrap");
            if (wrapper != null) {
                wrapper = getEvaluatedParameter(wrapper, context);
                result = result.map(function(part) {return wrapper[0] + part + wrapper[1]});
            }
            var separator = macro.getParameter("separator");
            if (separator != null) {
                return result.join(getEvaluatedParameter(separator), context, 'for:separator');
            }
            return result.join(' ');
        },

        "for": function(macro, context) {
            if (macro.parameters.length < 4)
                return "[Error in for-in macro: not enough parameters]";
            if (macro.parameters[1] != "in")
                return "[Error in for-in macro: expected in]";
            var name = getEvaluatedParameter(macro.parameters[0], context, 'for:name');
            var list = getEvaluatedParameter(macro.parameters[2], context, 'for:list');
            var subContext = context.clone();
            var subMacro = macro.getSubMacro(3);
            if (subMacro.name == "and") {
                subMacro.name = "for";
            }
            var result = [];
            for (var [index, value] in list) {
                subContext['index'] = index
                subContext[name] = getEvaluatedParameter(value, context, 'for:value');
                result.push(evaluateMacro(subMacro, subContext));
            }
            var wrapper = macro.getParameter("wrap") || macro.getParameter(name + "-wrap");
            if (wrapper != null) {
                wrapper = getEvaluatedParameter(wrapper, context);
                result = result.map(function(part) {return wrapper[0] + part + wrapper[1]});
            }
            var separator = macro.getParameter("separator");
            if (separator != null) {
                return result.join(getEvaluatedParameter(separator), context, 'for:separator');
            }
            return result.join('');
        },

        "if": function(macro, context, bypass) {
            if (macro.parameters.length < 2)
                return "[Error in if macro: not enough parameters]";
            var negated = (macro.parameters[0] == "not");
            if (negated && macro.parameters.length < 3)
                return "[Error in if macro: not enough parameters]";
            var index = negated ? 1 : 0;
            var result = true;
            if (bypass) {
                index++;
            } else {
                var condition = getEvaluatedParameter(macro.parameters[index++], context, 'if:condition');
                result = negated ? !condition : !!condition;
            }
            var subName = macro.parameters[index];
            if (!result && macro.parameters[index] != "or") {
                return "";
            }
            var subMacro = macro.getSubMacro(index);
            if (subName == "or" && result)
                return builtin["if"](subMacro, context, true);
            else if (subName == "and" || subName == "or")
                return builtin["if"](subMacro, context);
            return evaluateMacro(subMacro, context);
        },

        "set": function(macro, context) {
            if (macro.parameters.length < 2)
                return "[Error in set macro: not enough parameters]";
            var map = getEvaluatedParameter(macro.parameters[0], context, 'with:map');
            var subContext = context.clone();
            var subMacro = macro.getSubMacro(1);
            for (var [key, value] in map) {
                subContext[key] = getEvaluatedParameter(value, context, 'with:value');;
            }
            return evaluateMacro(subMacro, subContext);
        }

    };

    function getEvaluatedParameter(value, context, logprefix) {
        if (log.isDebugEnabled())
            log.debug(logprefix + ': macro called with value: ' + value);
        if (value instanceof MacroTag) {
            value = evaluateExpression(value, context, '_macro');
            if (log.isDebugEnabled())
                log.debug(logprefix + ': evaluated value macro, got ' + value);
        }
        return value;
    }

    this.toString = function toString() {
        return "[Skin Object]";
    };

}
