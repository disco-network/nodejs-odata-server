"use strict";
var FilterExpressionFactory = (function () {
    function FilterExpressionFactory() {
        this.registeredFilterExpressions = [];
    }
    FilterExpressionFactory.prototype.fromRaw = function (raw) {
        for (var i = 0; i < this.registeredFilterExpressions.length; ++i) {
            var SelectedFilterExpression = this.registeredFilterExpressions[i];
            if (SelectedFilterExpression.doesApplyToRaw(raw))
                return SelectedFilterExpression.create(raw, this);
        }
    };
    FilterExpressionFactory.prototype.registerDefaultFilterExpressions = function () {
        this.registerFilterExpressions([
            StringLiteralExpression, EqExpression,
        ]);
    };
    FilterExpressionFactory.prototype.registerFilterExpressions = function (types) {
        for (var i = 0; i < types.length; ++i) {
            this.registerFilterExpression(types[i]);
        }
    };
    FilterExpressionFactory.prototype.registerFilterExpression = function (Type) {
        if (this.registeredFilterExpressions.indexOf(Type) === -1)
            this.registeredFilterExpressions.push(Type);
    };
    return FilterExpressionFactory;
}());
exports.FilterExpressionFactory = FilterExpressionFactory;
var StringLiteralExpression = (function () {
    function StringLiteralExpression() {
    }
    StringLiteralExpression.doesApplyToRaw = function (raw) {
        return raw.type === "string";
    };
    StringLiteralExpression.create = function (raw, factory) {
        var ret = new StringLiteralExpression();
        ret.value = raw.value;
        return ret;
    };
    StringLiteralExpression.prototype.getSubExpressions = function () {
        return [];
    };
    StringLiteralExpression.prototype.getPropertyTree = function () {
        return {};
    };
    StringLiteralExpression.prototype.toSparql = function () {
        return "'" + this.value + "'";
    };
    return StringLiteralExpression;
}());
exports.StringLiteralExpression = StringLiteralExpression;
var EqExpression = (function () {
    function EqExpression() {
    }
    EqExpression.doesApplyToRaw = function (raw) {
        return raw.type === "operator" && raw.op === "eq";
    };
    EqExpression.create = function (raw, factory) {
        var ret = new EqExpression();
        ret.lhs = factory.fromRaw(raw.lhs);
        ret.rhs = factory.fromRaw(raw.rhs);
        return ret;
    };
    EqExpression.prototype.getSubExpressions = function () {
        return [this.lhs, this.rhs];
    };
    EqExpression.prototype.getPropertyTree = function () {
        return FilterExpressionHelper.getPropertyTree(this.getSubExpressions());
    };
    EqExpression.prototype.toSparql = function () {
        return this.lhs.toSparql() + " = " + this.rhs.toSparql();
    };
    return EqExpression;
}());
exports.EqExpression = EqExpression;
var PropertyTreeBuilder = (function () {
    function PropertyTreeBuilder() {
        this.tree = {};
    }
    PropertyTreeBuilder.prototype.merge = function (other) {
        this.mergeRecursive(this.tree, other);
    };
    PropertyTreeBuilder.prototype.mergeRecursive = function (baseBranch, mergeBranch) {
        var _this = this;
        Object.keys(mergeBranch).forEach(function (propertyName) {
            if (baseBranch[propertyName] === undefined) {
                baseBranch[propertyName] = {};
            }
            _this.mergeRecursive(baseBranch[propertyName], mergeBranch[propertyName]);
        });
    };
    return PropertyTreeBuilder;
}());
exports.PropertyTreeBuilder = PropertyTreeBuilder;
var FilterExpressionHelper = (function () {
    function FilterExpressionHelper() {
    }
    FilterExpressionHelper.getPropertyTree = function (subExpressions) {
        var propertyTrees = subExpressions.map(function (se) { return se.getPropertyTree(); });
        var returnTreeBuilder = new PropertyTreeBuilder();
        propertyTrees.forEach(function (tree) {
            returnTreeBuilder.merge(tree);
        });
        return returnTreeBuilder.tree;
    };
    return FilterExpressionHelper;
}());
exports.FilterExpressionHelper = FilterExpressionHelper;

//# sourceMappingURL=../../../maps/src/adapter/filters.js.map
