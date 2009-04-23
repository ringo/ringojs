/*global getResource importModule parseSkin */

require('core/string');
require('core/object');
import('helma/filters', 'filters');
import('helma/logging', 'logging');
import('helma/system', 'system');

export('render', 'createSkin', 'Skin');

var __shared__ = true;
var log = logging.getLogger(__name__);
var skincache = false; // {}

system.addHostObject(org.helma.template.MacroTag);

/**
 * Parse a skin from a resource and render it using the given context.
 * @param skinOrPath a skin object or a file name
 * @param context the skin render context
 * @param scope optional scope object for relative resource lookup
 */
function render(skinOrPath, context, scope) {
    scope = scope || this;
    var skin;
    if (typeof(skinOrPath.render) == "function") {
        skin = skinOrPath;
    } else if (typeof(skinOrPath) == "string") {
        var subskin;
        if (skinOrPath.indexOf('#') > -1) {
            [skinOrPath, subskin] = skinOrPath.split('#');
        }
        var resource = scope.getResource(skinOrPath);
        skin = createSkin(resource, scope);
        if (subskin) {
            skin = skin.getSubskin(subskin);
        }
    } else {
        throw Error("Unknown skin object: " + skinOrPath);
    }
    return skin.render(context);
}

/**
 * Parse a skin from a resource.
 * @param resource
 */
function createSkin(resourceOrString, scope) {
    if (this.skincache && resourceOrString in skincache) {
        return skincache[resourceOrString];
    }
    if (log.isDebugEnabled())
        log.debug("creating skin: " + resourceOrString);
    var mainSkin = [];
    var subSkins = {};
    var currentSkin = mainSkin;
    var parentSkin = null;
    parseSkin(resourceOrString, function(part) {
        if (part.name === 'extends') {
            var skinPath = part.getParameter(0);
            var skinResource;
            if (resourceOrString.parentRepository) {
                skinResource = resourceOrString.parentRepository.getResource(skinPath);
            }
            if (!skinResource || !skinResource.exists()) {
                skinResource = scope.getResource(skinPath);
            }
            parentSkin = createSkin(skinResource);
        } else if (part.name === 'subskin')  {
            var skinName = part.getParameter('name', 0);
            currentSkin = [];
            subSkins[skinName] = currentSkin;
        } else {
            currentSkin[currentSkin.length] = part;
        }
    });
    // normalization: cut trailing whitespace so it's
    // easier to tell if main skin shoule be inherited
    var lastPart = mainSkin[mainSkin.length - 1];
    if (typeof(lastPart) === 'string' && lastPart.trim() === '') {
        mainSkin.pop();
    }
    var skin = new Skin(mainSkin, subSkins, parentSkin);
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
function Skin(mainSkin, subSkins, parentSkin) {

    var self = this;

    this.render = function render(context) {
        if (mainSkin.length === 0 && parentSkin) {
            return renderInternal(parentSkin.getSkinParts(), context);
        } else {
            return renderInternal(mainSkin, context);
        }
    };

    this.renderSubskin = function renderSubskin(skinName, context) {
        if (!subSkins[skinName] && parentSkin) {
            return renderInternal(parentSkin.getSkinParts(skinName), context);
        } else {
            return renderInternal(subSkins[skinName], context);
        }
    };

    this.getSubskin = function getSubskin(skinName) {
        if (subSkins[skinName]) {
            return new Skin(subSkins[skinName], subSkins, parentSkin);
        } else {
            return null;
        }
    };

    this.getSkinParts = function getSkinParts(skinName) {
        var parts = skinName ? subSkins[skinName] : mainSkin;
        if (!parts || (!skinName && parts.length === 0)) {
            return parentSkin ? parentSkin.getSkinParts(skinName) : null;
        }
        return parts;
    };

    function renderInternal(parts, context) {
        // extend context by globally provided filters. user-provided filters
        // override globally defined ones
        context = Object.merge(context, filters);
        return [renderPart(part, context) for each (part in parts)].join('');
    }

    function renderPart(part, context) {
        return part instanceof MacroTag && part.name ?
                evaluateMacro(part, context) : part;
    }

    function evaluateMacro(macro, context) {
        // evaluate the macro itself
        var value = evaluateExpression(macro, context, '_macro');
        if (value instanceof Array) {
            value = value.join('');
        }
        // traverse the linked list of filters
        for (var filter = macro.filter; filter; filter = filter.filter) {
            // make sure value is not undefined, otherwise evaluateExpression()
            // might become confused
            if (!isVisible(value)) {
                value = "";
            }
            value = evaluateExpression(filter, context, '_filter', value);
        }
        return value
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
                       elem[last + suffix].call(elem, macro, self, context) :
                       elem[last + suffix].call(elem, value, macro, self, context);
            } else if (value === undefined && isDefined(elem[last])) {
                if (elem[last] instanceof Function) {
                    return elem[last].call(elem, macro, self, context);
                } else {
                    return elem[last];
                }
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
            var skin = getEvaluatedParameter(macro.getParameter(0), context, 'render:skin');
            return self.renderSubskin(skin, context);
        },

        "for": function(macro, context) {
            if (macro.parameters.length < 4)
                throw Error("not enough parameters in for-in macro");
            if (macro.parameters[1] != "in")
                throw Error("syntax error in for-in macro: expected in")
            var name = getEvaluatedParameter(macro.parameters[0], context, 'for:name');
            var list = getEvaluatedParameter(macro.parameters[2], context, 'for:list');
            var subContext = context.clone();
            var subMacro = macro.getSubMacro(3);
            result = [];
            for (var [index, value] in list) {
                subContext['index'] = index
                subContext[name] = getEvaluatedParameter(value, context, 'for:value');
                result.push(evaluateMacro(subMacro, subContext));
            }
            var separator = getEvaluatedParameter(macro.getParameter("separator"),
                    context, 'for:separator');
            if (separator != null) {
                return result.join(separator);
            }
            return result;
        },

        "if": function(macro, context) {
            if (macro.parameters.length < 2)
                throw Error("not enough parameters in if macro");
            var negated = (macro.parameters[0] == "not");
            var condition;
            if (negated) {
                if (macro.parameters.length < 3)
                    throw Error("not enough parameters in if macro");
                condition = getEvaluatedParameter(macro.parameters[1], context, 'if:condition');
            } else {
                condition = getEvaluatedParameter(macro.parameters[0], context, 'if:condition');
            }
            if (negated ? !!condition : !condition) {
                return "";
            }
            var subMacro = macro.getSubMacro(negated ? 2 : 1);
            return evaluateMacro(subMacro, context);
        },

        "set": function(macro, context) {
            if (macro.parameters.length < 2)
                throw Error("not enough parameters in with macro");
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
