/** @module */
import base = require("./sparql_provider_base");
import result = require("../result");
import { ILogger } from "../logger";

declare var process;

export class SparqlProvider implements base.ISparqlProvider {
  constructor(private store, private graphName: string, private logger?: ILogger) { }

  public query(queryString: string, cb: (result: result.AnyResult) => void): void {
    const timeBeforeExecution = process.hrtime();
    this.store.executeWithEnvironment(queryString, [this.graphName], [], (err, results) => {
      this.logDebug(`SPARQL query took ${process.hrtime(timeBeforeExecution)[1] / 1000000000} seconds.`);
      if (!err) {
        cb(result.Result.success(results));
      }
      else {
        cb(result.Result.error(err));
      }
    });
  }

  private logDebug(message: string) {
    if (this.logger !== undefined)
      this.logger.debug(message);
  }
}
