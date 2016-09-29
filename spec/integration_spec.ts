import { assert, assertEx, match } from "../src/assert";

import * as rdfstore from "rdfstore";
import { SparqlProvider } from "../src/sparql/sparql_provider";
import { GetHandler, PostHandler } from "../src/bootstrap/adapter/queryengine";
import { IHttpResponseSender } from "../src/odata/http";
import { Schema } from "../src/odata/schema";
import { schemaWithMandatoryProperty } from "./helpers/schemata";

const graph = "http://test.disco-network.org/";
const schema = new Schema();

describe("integration tests", () => {
  it("POST and GET an entity", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Content", body: "{ \"Title\": \"Lorem\" }" }, new HttpResponseSender(() => {
        get.query({ relativeUrl: "/Content", body: "" }, new HttpResponseSender(() => null,
        {
          sendBody: body => {
            assertEx.deepEqual(JSON.parse(body), {
              "odata.metadata": match.any,
              "value": [{
                "Id": match.any,
                "Title": "Lorem",
              }],
            });
            done();
          },
        }));
      }));
    });
  });

  it("POST and GET an entity with foreign key property", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Content", body: "{ \"Title\": \"Lorem\" }" }, new HttpResponseSender(() => {
        get.query({ relativeUrl: "/Content", body: "" }, new HttpResponseSender(() => null,
        {
          sendBody: body => {
            const cntId = JSON.parse(body).value[0].Id;
            insertPost(post, get, cntId);
          },
        }));
      }));
    });

    function insertPost(post: PostHandler, get: GetHandler, cntId: string) {
      post.query({ relativeUrl: "/Posts", body: `{ "ContentId": "${cntId}" }` }, new HttpResponseSender(() => {
        get.query({ relativeUrl: "/Posts", body: "" }, new HttpResponseSender(() => null,
        {
          sendBody: body => {
            assertEx.deepEqual(JSON.parse(body), {
              "odata.metadata": match.any,
              "value": [{
                "Id": match.any,
                "ContentId": cntId,
                "ParentId": null,
              }],
            });
            done();
          },
        }));
      }));
    }
  });

  it("POST an entity, retrieve it directly from the response body", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Content", body: "{ \"Title\": \"Lorem\" }" }, new HttpResponseSender(() => null,
      {
        sendBody: body => {
          assertEx.deepEqual(JSON.parse(body), {
            "odata.metadata": match.any,
            "value": {
              "Id": match.any,
              "Title": "Lorem",
            },
          });
          done();
        },
      }));
    });
  });

  /* @todo add unit test for EntityInitializer */
  it("POST an entity with Title: null", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Content", body: "{ \"Title\": null }" }, new HttpResponseSender(() => null,
      {
        sendBody: body => {
          assertEx.deepEqual(JSON.parse(body), {
            "odata.metadata": match.any,
            "value": {
              "Id": match.any,
              "Title": null,
            },
          });
          done();
        },
      }));
    });
  });

  it("POST an entity with a mandatory property = null => FAIL", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Entities", body: `{ "Value": null }` }, new HttpResponseSender(() => null,
      {
        sendStatusCode: code => {
          assert.strictEqual(code, 400);
          done();
        },
      }));
    }, schemaWithMandatoryProperty);
  });

  it("POST an entity with an unknown property => FAIL", done => {
    initOdataServer((get, post) => {
      post.query({ relativeUrl: "/Entities", body: `{}` }, new HttpResponseSender(() => null,
      {
        sendStatusCode: code => {
          assert.strictEqual(code, 400);
          done();
        },
      }));
    }, schemaWithMandatoryProperty);
  });

  xit("POST and entity with implicit Title: null");
});

function initOdataServer(cb: (get: GetHandler, post: PostHandler) => void, schm = schema) {
  initSparqlProvider(provider => {
    cb(new GetHandler(schm, provider, graph), new PostHandler(schm, provider, graph));
  });
}

function initSparqlProvider(cb: (provider: SparqlProvider) => void) {
  rdfstore.create((err, store) => {
    cb(new SparqlProvider(store, graph));
  });
}

class HttpResponseSender implements IHttpResponseSender {

  constructor(then: () => void, props?: any) {
    this.finishResponse = then;
    if (props !== undefined) {
      for (const prop of Object.keys(props)) {
        this[prop] = props[prop];
      }
    }
  }

  public sendStatusCode(): any {
    //
  }

  public sendHeader(): any {
    //
  }

  public sendBody(body: string): any {
    //
  }

  public finishResponse(): any {
    //
  }
}