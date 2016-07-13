import gpatterns = require("./sparql_graphpatterns");
import filters = require("./filters");

export class QueryStringBuilder {
  private prefixes: { [id: string]: string } = { };

  public insertPrefix(prefix: string, uri: string) {
    this.prefixes[prefix] = uri;
  }

  public fromGraphPattern(graphPattern: gpatterns.TreeGraphPattern,
                          options?: QueryStringBuilderOptions): string {
    let filterExpression = options.filterExpression || undefined;
    return this.buildPrefixString() +
      " SELECT * WHERE " + this.buildGraphPatternStringWithFilters(graphPattern, filterExpression);
  }

  public buildGraphPatternStringWithFilters(graphPattern, filter?: filters.FilterExpression): string {
    let ret = "{ " + this.buildGraphPatternContentString(graphPattern);
    if (filter !== undefined) {
      ret += " . FILTER(" + filter.toSparql() + ")";
    }
    ret += " }";
    return ret;
  }

  public buildGraphPatternString(graphPattern: gpatterns.TreeGraphPattern): string {
    return "{ " + this.buildGraphPatternContentString(graphPattern) + " }";
  }

  public buildGraphPatternContentString(graphPattern: gpatterns.TreeGraphPattern): string {
    let triplesString = graphPattern.getDirectTriples().map(t => t.join(" ")).join(" . ");
    let subPatternsString = graphPattern.getBranchPatterns()
      .map(p => this.buildGraphPatternContentString(p))
      .filter(str => str !== "")
      .join(" . ");
    let optionalPatternsString = graphPattern.getOptionalPatterns()
      .map(p => "OPTIONAL " + this.buildGraphPatternString(p))
      .filter(str => str !== "")
      .join(" . ");
    let unionsString = graphPattern.getUnionPatterns()
      .map(p => this.buildGraphPatternString(p))
      .join(" UNION ");
    let parts = [];

    if (triplesString !== "") parts.push(triplesString);
    if (subPatternsString !== "") parts.push(subPatternsString);
    if (optionalPatternsString !== "") parts.push(optionalPatternsString);
    if (unionsString !== "") parts.push(unionsString);

    return parts.join(" . ");
  }

  public buildPrefixString() {
    let parts: string[] = [ ];
    for (let prefix in this.prefixes) {
      parts.push("PREFIX " + prefix + ": <" + this.prefixes[prefix] + ">");
    }
    return parts.join(" ");
  }
}

export interface QueryStringBuilderOptions {
  filterExpression?: filters.FilterExpression;
}
