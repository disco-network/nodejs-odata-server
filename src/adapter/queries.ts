import mappings = require("./mappings");
import gpatterns = require("../sparql/graphpatterns");
import filterPatterns = require("./filterpatterns");
import expandTreePatterns = require("./expandtree");
import filters = require("./filters");
import psBuilder = require("../sparql/querystringbuilder");
import odataQueries = require("../odata/queries");
import Schema = require("../odata/schema");
import result = require("../result");

/**
 * Used to generate query objects which can be run to modify and/or retrieve data.
 */
/* @todo open/closed principle: use factory candidates (see FilterExpressionIoCContainer)? */
export class QueryFactory {
  constructor(private model: IQueryAdapterModel,
              private createEntitySetQuery: (model: IQueryAdapterModel) => odataQueries.IQuery) { }
  public create(): odataQueries.IQuery {
    return this.createEntitySetQuery(this.model);
  }
}

/**
 * Handles read-only OData queries.
 */
export class EntitySetQuery implements odataQueries.IQuery {

  constructor(private model: IQueryAdapterModel, private queryStringBuilder: IEntitySetQueryStringBuilder) {
  }

  public run(sparqlProvider, cb: (result: result.AnyResult) => void): void {
    sparqlProvider.querySelect(this.generateQueryString(), response => {
      cb(this.translateResponseToOData(response));
    });
  }

  private generateQueryString(): string {
    return this.queryStringBuilder.fromQueryAdapterModel(this.model);
  }

  private translateResponseToOData(response: result.AnyResult): result.AnyResult {
    if (response.success()) {
      return result.Result.success(this.translateSuccessfulResponseToOData(response.result()));
    }
    else {
      return result.Result.error(response.error());
    }
  }

  private translateSuccessfulResponseToOData(response: any) {
    let queryContext = new SparqlQueryContext(this.model.getMapping().variables,
      this.model.getEntitySetType(), this.model.getExpandTree());
    let resultBuilder = new odataQueries.JsonResultBuilder();
    return resultBuilder.run(response, queryContext);
  }
}

export interface IEntitySetQueryStringBuilder {
  fromQueryAdapterModel(model: IQueryAdapterModel);
}

export class EntitySetQueryStringBuilder {

  constructor(private filterExpressionFactory: filters.IExpressionTranslatorFactory,
              private filterPatternStrategy: filterPatterns.FilterGraphPatternStrategy,
              private expandTreePatternStrategy: expandTreePatterns.ExpandTreeGraphPatternStrategy,
              private sparqlSelectBuilder: psBuilder.ISelectQueryStringBuilder) {
  }

  public fromQueryAdapterModel(model: IQueryAdapterModel) {
    let expandGraphPattern = this.createExpandGraphPattern(model);

    let filterExpression = this.createFilterExpression(model);
    let filterGraphPattern = this.createFilterGraphPattern(model, filterExpression);

    let graphPattern = new gpatterns.TreeGraphPattern(model.getMapping().variables.getVariable());
    graphPattern.newConjunctivePattern(expandGraphPattern);
    graphPattern.newConjunctivePattern(filterGraphPattern);

    let prefixes = [
      { prefix: "rdf", uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
      { prefix: "disco", uri: "http://disco-network.org/resource/" },
    ];

    return this.sparqlSelectBuilder.fromGraphPatternAndFilterExpression(prefixes, graphPattern, filterExpression);
  }

  private createExpandGraphPattern(model: IQueryAdapterModel): gpatterns.TreeGraphPattern {
    return this.expandTreePatternStrategy.create(model.getEntitySetType(),
      model.getExpandTree(), model.getMapping().variables);
  }

  private createFilterGraphPattern(model: IQueryAdapterModel,
                                   filterExpression?: filters.IExpressionTranslator): gpatterns.TreeGraphPattern {
    if (filterExpression) {

      let filterGraphPattern = this.filterPatternStrategy.createPattern(model.getFilterContext(),
        filterExpression.getPropertyTree());
      return filterGraphPattern;
    }
  }

  private createFilterExpression(model: IQueryAdapterModel): filters.IExpressionTranslator {
    if (model.getRawFilter() !== undefined) {
      return this.filterExpressionFactory.fromRaw(model.getRawFilter(), model.getFilterContext());
    }
  }
}

export interface IQueryAdapterModel {
  getFilterContext(): filters.IFilterContext;
  getMapping(): mappings.Mapping;
  getEntitySetType(): Schema.EntityType;
  getExpandTree(): any;
  getRawFilter(): any;
}

export class QueryAdapterModel implements IQueryAdapterModel {

  private mapping: mappings.Mapping;
  private filterContext: filters.IFilterContext;

  constructor(private odata: odataQueries.IQueryModel) {}

  public getFilterContext(): filters.IFilterContext {
    if (this.filterContext === undefined) {
      this.filterContext = {
        scope: {
          entityType: this.getEntitySetType(),
          unscopedEntityType: this.getEntitySetType(),
          lambdaVariableScope: new filters.LambdaVariableScope(),
        },
        mapping: {
          mapping: this.getMapping(),
          scopedMapping: new mappings.ScopedMapping(this.getMapping()),
        },
      };
    }
    return this.filterContext;
  }

  public getMapping(): mappings.Mapping {
    if (this.mapping === undefined) {
      this.initializeVariableMapping();
    }
    return this.mapping;
  }

  public getEntitySetType(): Schema.EntityType {
    return this.odata.entitySetType;
  }

  public getExpandTree() {
    return this.odata.expandTree;
  }

  public getRawFilter() {
    return this.odata.filterOption;
  }

  private initializeVariableMapping() {
    let vargen = new mappings.SparqlVariableGenerator();
    let varMapping = new mappings.StructuredSparqlVariableMapping(vargen.next(), vargen);
    let propMapping = new mappings.PropertyMapping(this.getEntitySetType());
    this.mapping = new mappings.Mapping(propMapping, varMapping);
  }
}

/**
 * This class provides methods to interpret a SPARQL query result as OData.
 */
export class SparqlQueryContext implements odataQueries.IQueryContext {
  private mapping: mappings.IStructuredSparqlVariableMapping;
  private rootTypeSchema: Schema.EntityType;
  private remainingExpandBranch: Object;

  constructor(mapping: mappings.IStructuredSparqlVariableMapping, rootTypeSchema: Schema.EntityType,
              remainingExpandBranch) {
    this.mapping = mapping;
    this.rootTypeSchema = rootTypeSchema;
    this.remainingExpandBranch = remainingExpandBranch;
  }

  public getUniqueIdOfResult(result): string {
    let variableName = this.mapping.getElementaryPropertyVariable("Id");
    let obj = result && result[variableName.substr(1)];
    if (obj) return obj.value;
  }

  public forEachPropertyOfResult(result, fn: (value, property: Schema.Property,
          hasValue: boolean) => void): void {
    this.forEachElementaryPropertyOfResult(result, fn);
    this.forEachComplexPropertyOfResult(result, fn);
  }

  public forEachElementaryPropertyOfResult(result, fn: (value, variable: Schema.Property,
          hasValue: boolean) => void): void {
    this.rootTypeSchema.getPropertyNames().forEach(propertyName => {
      let property = this.rootTypeSchema.getProperty(propertyName);
      if (property.isNavigationProperty()) return;

      let obj = result[this.mapping.getElementaryPropertyVariable(propertyName).substr(1)];
      let hasValue = obj !== undefined && obj !== null;
      fn(hasValue ? obj.value : undefined, property, hasValue);
    });
  }

  public forEachComplexPropertyOfResult(result, fn: (subResult, property: Schema.Property,
          hasValue: boolean) => void): void {
    for (let propertyName of Object.keys(this.remainingExpandBranch)) {
      let propertyIdVar = this.mapping.getComplexProperty(propertyName).getElementaryPropertyVariable("Id");
      let hasValue = result[propertyIdVar.substr(1)] !== undefined;
      fn(result, this.rootTypeSchema.getProperty(propertyName), hasValue);
    }
  }

  public forEachPropertySchema(fn: (property: Schema.Property) => void): void {
    this.forEachElementaryPropertySchema(fn);
    this.forEachComplexPropertySchema(fn);
  }

  public forEachElementaryPropertySchema(fn: (property) => void): void {
    this.rootTypeSchema.getPropertyNames().forEach(propertyName => {
      let property = this.rootTypeSchema.getProperty(propertyName);
      if (!property.isNavigationProperty()) fn(property);
    });
  }

  public forEachComplexPropertySchema(fn: (property) => void): void {
    for (let propertyName of Object.keys(this.remainingExpandBranch)) {
      fn(this.rootTypeSchema.getProperty(propertyName));
    }
  }

  /** Return another context associated with a complex property. */
  public getSubContext(propertyName: string): SparqlQueryContext {
    /** @todo is it a good idea to create so many instances? */
    return new SparqlQueryContext(
      this.mapping.getComplexProperty(propertyName),
      this.rootTypeSchema.getProperty(propertyName).getEntityType(),
      this.remainingExpandBranch[propertyName]);
  }
}
