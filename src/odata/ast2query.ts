/** @module */
import queryComposer = require("./querycomposer");
import schema = require("./schema");

export function getQueryModelFromEvaluatedAst(/*evaluated*/ast, schema: schema.Schema) {
  if (ast.type === "resourceQuery") {
    if (ast.resourcePath.type !== "entitySet")
      throw new Error("unsupported resource path type: " + ast.resourcePath.type);
    if (ast.resourcePath.navigation && ast.resourcePath.navigation.qualifiedEntityTypeName)
      throw new Error("qualified entity type name not supported");

    let comp = new queryComposer.QueryComposer(ast.resourcePath.entitySetName, schema);
    comp.filter(ast.queryOptions.filter);
    comp.expand(ast.queryOptions.expand);
    switch (ast.resourcePath.navigation.type) {
      case "none":
        return comp;
      case "collection-navigation":
        let navPath = ast.resourcePath.navigation.path;
        let key = parseInt(navPath.keyPredicate.simpleKey.value, 10); // TODO: check type
        comp.selectById(key);
        if (navPath.singleNavigation) {
          comp.selectProperty(navPath.singleNavigation.propertyPath.propertyName);
        }
        return comp;
      default:
        throw new Error("this resourcePath navigation type is not supported");
    }
  }
  else throw new Error("unsupported query type: " + ast.type);
}
