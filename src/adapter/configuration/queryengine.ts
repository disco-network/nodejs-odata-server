import base = require("../../odata/query_engine");
import { Schema } from "../../odata/schema";
import { GetRequestParser } from "../../odata/configuration/parser";
import { ISparqlProvider } from "../../sparql/sparql_provider_base";
import { ODataRepository } from "../configuration/odatarepository";

export class GetHandler extends base.GetHandler {
  constructor(schema: Schema, sparqlProvider: ISparqlProvider) {
    super(schema, new GetRequestParser(), new ODataRepository(sparqlProvider));
  }
}
