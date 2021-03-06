import mappings = require("../../lib/adapter/mappings");
import schema = require("../../lib/odata/schema");

export function createUnstructuredMapping() {
  let mapping = new mappings.SparqlVariableMapping(new mappings.SparqlVariableGenerator());
  return mapping;
}

export function createStructuredMapping(rootVariableName?: string) {
  let vargen = new mappings.SparqlVariableGenerator();
  let mapping = new mappings.StructuredSparqlVariableMapping(rootVariableName || vargen.next(), vargen);
  return mapping;
}

export function createMapping(entityType: schema.EntityType, rootVariableName?: string) {
  return new mappings.Mapping(
    new mappings.PropertyMapping(entityType),
    createStructuredMapping(rootVariableName)
  );
}

export function createScopedMapping(entityType: schema.EntityType, rootVariableName?: string) {
  return new mappings.ScopedMapping(createMapping(entityType, rootVariableName));
}
