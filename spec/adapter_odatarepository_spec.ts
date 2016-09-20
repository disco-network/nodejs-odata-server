import { assert, assertEx, match } from "../src/assert";
import results = require("../src/result");
import schema = require("../src/odata/schema");
import postQueries = require("../src/adapter/postquery");
import {
  ODataRepository, IGetQueryStringBuilder, IQueryAdapterModel, IMinimalVisitor,
} from "../src/adapter/odatarepository";
import sparqlProviderBase = require("../src/sparql/sparql_provider_base");
import { IInsertQueryStringBuilder, IPrefix, ISparqlLiteral } from "../src/sparql/querystringbuilder";

describe("Adapter.ODataRepository (insertion):", () => {
  it("Insert an entity called 'post1' with Id = '1'", (done) => {
    const sparql = "INSERT {SOMETHING}";

    let myPostQueryStringBuilder = new PostQueryStringBuilder();

    let mySparqlProvider = new SparqlProvider();
    let sparqlQueryCount = 0;
    mySparqlProvider.query = (query, cb) => {
      ++sparqlQueryCount; /* @construction */
      assert.strictEqual(query, sparql);
      cb(results.Result.success("ok"));
    };

    let insertQueryStringBuilder = new InsertQueryStringBuilder();
    insertQueryStringBuilder.insertAsSparql = (prefixes, uri, properties) => {
      assert.strictEqual(uri, "post1");
      assertEx.deepEqual(properties, [
        { rdfProperty: "disco:id", value: match.is(val => val.representAsSparql() === "'1'") },
      ]);
      return "INSERT {SOMETHING}";
    };

    let odataRepository = create(mySparqlProvider, new GetQueryStringBuilder(), myPostQueryStringBuilder,
                                  insertQueryStringBuilder);
    odataRepository.batch([{
      type: "insert",
      entityType: "Post",
      identifier: "post1",
      value: {
        Id: "1",
      },
    }], new schema.Schema(), results => {
      assert.strictEqual(results.success(), true);
      assert.strictEqual(results.result(), "@todo dunno");
      assert.strictEqual(sparqlQueryCount, 1);
      done();
    });
  });
});

function create<T extends IMinimalVisitor>(sparqlProvider: sparqlProviderBase.ISparqlProvider,
                                           getQueryStringBuilder: IGetQueryStringBuilder<T>,
                                           postQueryStringBuilder: postQueries.IQueryStringBuilder,
                                           insertQueryStringBuilder: IInsertQueryStringBuilder) {
  return new ODataRepository<T>(sparqlProvider, getQueryStringBuilder, postQueryStringBuilder,
                                insertQueryStringBuilder);
}

class PostQueryStringBuilder /*implements postQueries.IQueryStringBuilder*/ {
  public build(entity, type: schema.EntityType): any {
    //
  }
}

class GetQueryStringBuilder<T> implements IGetQueryStringBuilder<T> {
  public fromQueryAdapterModel(model: IQueryAdapterModel<T>) {
    //
  }
}

class InsertQueryStringBuilder implements IInsertQueryStringBuilder {
  public insertAsSparql(prefixes: IPrefix[], uri: string,
                        properties: { rdfProperty: string, value: ISparqlLiteral }[]): any {
    //
  }
}

class SparqlProvider implements sparqlProviderBase.ISparqlProvider {

  public query(query: string, cb: (result: results.AnyResult) => void) {
    //
  }
}
