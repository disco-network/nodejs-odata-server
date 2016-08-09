import { } from "../src/odata/repository";
import base = require("../src/adapter/odatarepository");
import results = require("../src/result");
import schema = require("../src/odata/schema");
import postQueries = require("../src/adapter/postquery");
import sparqlProviderBase = require("../src/sparql/sparql_provider_base");

import queryTestCases = require("./helpers/querytestcases");

describe("Adapter.ODataRepository (generated insertion tests):", () => {
  queryTestCases.odataRepositoryQueryTests.forEach(
    (args, i) => spec(`#${i}`, args)
  );

  function spec(name: string, args: queryTestCases.IODataRepositoryTestCase) {
    it(name, (done) => {
      let myPostQueryStringBuilder = new PostQueryStringBuilder();
      myPostQueryStringBuilder.build = (entity, type) => {
        expect(entity).toEqual(args.entity);
        expect(type.getName()).toBe("Post");
        return args.sparql;
      };
      let mySparqlProvider = new SparqlProvider();
      let sparqlQueryCount = 0;
      mySparqlProvider.query = (query, cb) => {
        ++sparqlQueryCount;
        expect(query).toBe(args.sparql);
        cb(results.Result.success("ok"));
      };

      let myODataProvider = create(mySparqlProvider, myPostQueryStringBuilder);
      myODataProvider.insertEntity(args.entity, args.entityType, result => {
        expect(result.success());
        expect(sparqlQueryCount).toBe(1);
        done();
      });
    });
  }
});

function create(sparqlProvider: sparqlProviderBase.ISparqlProvider,
                postQueryStringBuilder: postQueries.IQueryStringBuilder) {
  return new base.ODataRepository(sparqlProvider, postQueryStringBuilder);
}

class PostQueryStringBuilder /*implements postQueries.IQueryStringBuilder*/ {
  public build(entity, type: schema.EntityType): any {
    //
  }
}

class SparqlProvider implements sparqlProviderBase.ISparqlProvider {
  public querySelect() {
    //
  }

  public query(query: string, cb: (result: results.AnyResult) => void) {
    //
  }
}