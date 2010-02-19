/**
 * Simple and brute force query implementation for databases that do not support querying or indexing.
 */

export('BaseQuery');

var EQUAL = function(a, b) a === b || a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
var GREATER_THAN = function(a, b) a > b;
var GREATER_THAN_OR_EQUAL = function(a, b) a >= b;
var LESS_THAN = function(a, b) a < b;
var LESS_THAN_OR_EQUAL = function(a, b) a <= b;

/**
 * <p>The BaseQuery constructor provides the base for all queries implemented by this module.
 * It requires a function argument to retrieve all instances of the type we want to query.</p>
 *
 * <p>BaseQuery objects provide the following chainable subqueries:</p>
 *
 * <ul>
 * <li> equals()</li>
 * <li> less()</li>
 * <li> lessEquals()</li>
 * <li> greater()</li>
 * <li> greaterEquals</li>
 * </ul>
 */
function BaseQuery(all) {
    this.select = function(property) {
        return mapProperty(all(), property);
    };
}

function OperatorQuery(parentQuery, operator, property, value) {
    this.select = function(selectProperty) {
        var base = parentQuery.select();
        var list = base.filter(function(e) {
            return operator(e[property], value);
        });
        return mapProperty(list, selectProperty);
    };
}

function mapProperty(list, property) {
    if (property) {
        return list.map(function(e) {
            return e[property];
        });
    }
    return list;
};

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

