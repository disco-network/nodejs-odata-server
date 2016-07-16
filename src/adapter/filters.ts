import mappings = require("./sparql_mappings");

export interface FilterExpression {
  getSubExpressions(): FilterExpression[];
  getPropertyTree(): PropertyTree;
  toSparql(): string;
}

export interface FilterExpressionClass {
  create(raw, mapping: mappings.StructuredSparqlVariableMapping, factory: FilterExpressionFactory): FilterExpression;
  doesApplyToRaw(raw): boolean;
}

export class FilterExpressionFactory {
  private registeredFilterExpressions: FilterExpressionClass[] = [];
  private mapping: mappings.StructuredSparqlVariableMapping;

  public fromRaw(raw: any): FilterExpression {
    for (let i = 0; i < this.registeredFilterExpressions.length; ++i) {
      let SelectedFilterExpression = this.registeredFilterExpressions[i];
      if (SelectedFilterExpression.doesApplyToRaw(raw)) return SelectedFilterExpression.create(raw, this.mapping, this);
    }
    throw new Error("filter expression is not supported: " + JSON.stringify(raw));
  }

  public setSparqlVariableMapping(mapping: mappings.StructuredSparqlVariableMapping) {
    this.mapping = mapping;
    return this;
  }

  public registerDefaultFilterExpressions() {
    this.registerFilterExpressions([
      StringLiteralExpression, NumberLiteralExpression,
      ParenthesesExpressionFactory,
      AndExpression, OrExpression,
      EqExpression,
      PropertyExpression,
    ]);
    return this;
  }

  public registerFilterExpressions(types: FilterExpressionClass[]) {
    for (let i = 0; i < types.length; ++i) {
      this.registerFilterExpression(types[i]);
    }
  }

  public registerFilterExpression(Type: FilterExpressionClass) {
    if (this.registeredFilterExpressions.indexOf(Type) === -1)
      this.registeredFilterExpressions.push(Type);
  }
}

export let StringLiteralExpression = literalExpression<string>({
  typeName: "string",
  parse: raw => raw.value,
  toSparql: value => "'" + value + "'",
});
export type StringLiteralExpression = FilterExpression;

export let NumberLiteralExpression = literalExpression<number>({
  typeName: "decimalValue",
  parse: raw => {
    let ret = parseInt(raw.value, 10);
    if (isNaN(ret)) throw new Error("error parsing number literal " + raw.value);
    else return ret;
  },
  toSparql: value => "'" + value + "'",
});
export type NumberLiteralExpression = FilterExpression;

export let OrExpression = binaryOperator({ opName: "or", sparql: "||" });
export type OrExpression = FilterExpression;

export let AndExpression = binaryOperator({ opName: "and", sparql: "&&" });
export type AndExpression = FilterExpression;

export let EqExpression = binaryOperator({ opName: "eq", sparql: "=" });
export type EqExpression = FilterExpression;

export class PropertyExpression implements FilterExpression {

  public static doesApplyToRaw(raw) {
    return raw.type === "member-expression";
  }

  public static create(raw, mapping: mappings.StructuredSparqlVariableMapping,
                       factory: FilterExpressionFactory): PropertyExpression {
    let ret = new PropertyExpression();
    ret.propertyName = raw.path.propertyName;
    ret.mapping = mapping;
    return ret;
  }

  // ===

  private propertyName: string;
  private mapping: mappings.StructuredSparqlVariableMapping;

  public getSubExpressions(): FilterExpression[] {
    return [];
  }

  public getPropertyTree(): PropertyTree {
    let tree: PropertyTree = {};
    tree[this.propertyName] = {};
    return tree;
  }

  public toSparql(): string {
    return this.mapping.getElementaryPropertyVariable(this.propertyName);
  }
}

export class ParenthesesExpressionFactory {

  public static doesApplyToRaw(raw) {
    return raw.type === "parentheses-expression";
  }

  public static create(raw, mapping: mappings.StructuredSparqlVariableMapping, factory: FilterExpressionFactory) {
    // We don't have to return a ParenthesesExpression, let's choose the simpler way
    return factory.fromRaw(raw.inner);
  }
}

function literalExpression<ValueType>(
args: {
  typeName: string;
  parse: (raw) => ValueType;
  toSparql: (value: ValueType) => string }
) {

  let GeneratedClass = class {

    public static doesApplyToRaw(raw): boolean {
      return raw.type === args.typeName;
    }

    public static create(raw, mapping: mappings.StructuredSparqlVariableMapping,
                         factory: FilterExpressionFactory) {
      let ret = new GeneratedClass();
      ret.value = args.parse(raw);
      return ret;
    }

    // ===

    private value: ValueType;

    public getSubExpressions(): FilterExpression[] {
      return [];
    }

    public getPropertyTree(): PropertyTree {
      return {};
    }

    public toSparql(): string {
      return args.toSparql(this.value);
    }
  };
  return GeneratedClass;
}

function binaryOperator(args: { opName: string; sparql: string }) {

  let GeneratedClass = class {

    public static doesApplyToRaw(raw): boolean {
      return raw.type === "operator" && raw.op === args.opName;
    }

    public static create(raw, mapping: mappings.StructuredSparqlVariableMapping,
                         factory: FilterExpressionFactory) {
      let ret = new GeneratedClass();
      ret.lhs = factory.fromRaw(raw.lhs);
      ret.rhs = factory.fromRaw(raw.rhs);
      return ret;
    }

    // ===

    private lhs: FilterExpression;
    private rhs: FilterExpression;

    public getSubExpressions(): FilterExpression[] {
      return [ this.lhs, this.rhs ];
    }

    public getPropertyTree(): PropertyTree {
      return FilterExpressionHelper.getPropertyTree(this.getSubExpressions());
    }

    public toSparql(): string {
      return "(" + this.lhs.toSparql() + " " + args.sparql + " " + this.rhs.toSparql() + ")";
    }
  };
  return GeneratedClass;
}

export interface PropertyTree {
  [id: string]: PropertyTree;
}

export class PropertyTreeBuilder {
  public tree: PropertyTree = {};

  public merge(other: PropertyTree) {
    this.mergeRecursive(this.tree, other);
  }

  private mergeRecursive(baseBranch: PropertyTree, mergeBranch: PropertyTree) {
    Object.keys(mergeBranch).forEach(propertyName => {
      if (baseBranch[propertyName] === undefined) {
        baseBranch[propertyName] = {};
      }
      this.mergeRecursive(baseBranch[propertyName], mergeBranch[propertyName]);
    });
  }
}

export class FilterExpressionHelper {
  public static getPropertyTree(subExpressions: FilterExpression[]): PropertyTree {
    let propertyTrees = subExpressions.map(se => se.getPropertyTree());
    let returnTreeBuilder = new PropertyTreeBuilder();
    propertyTrees.forEach(tree => {
      returnTreeBuilder.merge(tree);
    });
    return returnTreeBuilder.tree;
  }
}
