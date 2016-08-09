import { assert } from "chai";

import odataParser = require("../src/odata/parser");
import queryTestCases = require("./helpers/querytestcases");

describe("ODataParser", function() {
  it("should parse an OData filter expression", function() {
    let parser = initODataParser();
    let evaluated = parser.parse("Posts?$filter=a/b/c eq 1");

    assert.isDefined(evaluated.queryOptions);
    assert.isDefined(evaluated.queryOptions.filter);
    assert.strictEqual(evaluated.queryOptions.filter.type, "operator");
    assert.strictEqual(evaluated.queryOptions.filter.lhs.type, "member-expression");
    assert.strictEqual(evaluated.queryOptions.filter.rhs.type, "decimalValue");
  });

  it("should parse an OData expand expression", function() {
    let parser = initODataParser();
    let result = parser.parse("Posts?$expand=Children/ReferredFrom");

    assert.strictEqual(result.queryOptions.expand.length, 1);
    assert.strictEqual(result.queryOptions.expand[0].path[0], "Children");
    assert.strictEqual(result.queryOptions.expand[0].path[1], "ReferredFrom");
  });

  it("should parse a simple filter expression", () => {
    let parser = initODataParser();
    let result = parser.parse("Posts?$filter='2' eq '1'");

    let filterOption = result.queryOptions.filter;
    assert.strictEqual(filterOption.type, "operator");
    assert.strictEqual(filterOption.op, "eq");
    assert.strictEqual(filterOption.rhs.type, "string");
    assert.strictEqual(filterOption.rhs.value, "1");
  });

  it("should parse a simple member expression", () => {
    let parser = initODataParser();
    let result = parser.parse("Posts?$filter=Id eq '1'");

    let filterOption = result.queryOptions.filter;
    assert.strictEqual(filterOption.lhs.type, "member-expression");
    assert.strictEqual(filterOption.lhs.path.length, 1);
    assert.strictEqual(filterOption.lhs.path[0], "Id");
    assert.strictEqual(filterOption.lhs.operation, "property-value");
  });

  it("should parse a simple any expression", () => {
    let parser = initODataParser();
    let result = parser.parse("Posts?$filter=Children/any(it: it/Id eq 2)");

    let filterOption = result.queryOptions.filter;
    assert.strictEqual(filterOption.type, "member-expression");
    assert.strictEqual(filterOption.operation, "any");
    assert.deepEqual(filterOption.path, ["Children"]);
    assert.strictEqual(filterOption.lambdaExpression.variable, "it");
    assert.strictEqual(filterOption.lambdaExpression.predicateExpression.type, "operator");
  });

  it("should accept parentheses in a filter expression", () => {
    let parser = initODataParser();
    let result = parser.parse("Posts?$filter=(Id eq '1')");

    let filterOption = result.queryOptions.filter;
    assert.strictEqual(filterOption.type, "parentheses-expression");
    assert.strictEqual(filterOption.inner.type, "operator");
  });
});

describe("ODataParser (generated tests)", () => {
  queryTestCases.odataParserTests.forEach(
    (args, i) => spec(`#${i}`, args)
  );

  function spec(name: string, args: queryTestCases.IODataParserTestCase) {
    it(name, () => {
      let parser = initODataParser();

      let ast = parser.parse(args.query);

      assert.deepEqual(ast, args.ast);
    });
  }
});

function initODataParser(): odataParser.IODataParser {
  return new odataParser.ODataParser();
}
