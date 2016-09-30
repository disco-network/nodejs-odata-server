import { Schema } from "../../src/odata/schema";

export const uuidKeySchema = new Schema({
  entityTypes: {
    Entity: {
      properties: {
        Id: { type: "Edm.Guid", rdfName: "id", generated: "uuid" },
      },
    },
  },
  entitySets: {
    Entities: { type: "Entity" },
  },
});

export const autoIncrementSchema = new Schema({
  entityTypes: {
    Entity: {
      properties: {
        Id: { type: "Edm.Int32", rdfName: "id", generated: "auto-increment", autoIncrement_nextValue: 1 },
      },
    },
  },
  entitySets: {
    Entities: { type: "Entity" },
  },
});

export const diverselyTypedSchema = new Schema({
  entityTypes: {
    Entity: {
      properties: {
        String: { type: "Edm.String", optional: true },
        Int32: { type: "Edm.Int32", optional: true },
        Uuid: { type: "Edm.Uuid", optional: true },
      },
    },
  },
  entitySets: {
    Entities: { type: "Entity" },
  },
});

export const schemaWithMandatoryProperty = new Schema({
  entityTypes: {
    Entity: {
      properties: {
        Id: { type: "Edm.Guid", generated: "uuid", rdfName: "id" },
        Value: { type: "Edm.String", rdfName: "value" },
      },
      rdfName: "entity",
    },
  },
  entitySets: {
    Entities: { type: "Entity" },
  },
  defaultNamespace: {
    prefix: "disco",
    uri: "http://disco-network.org/resource/",
  },
});

export const schemaWithInverseProperty = new Schema({
  entityTypes: {
    Integer: {
      properties: {
        Id: { type: "Edm.Int32", rdfName: "value" },
        NextInteger: { type: "Integer", rdfName: "next", optional: true, cardinality: "one-to-one" },
        PrevInteger: {
          type: "Integer", foreignSet: "Integers", inverseProperty: "NextInteger", optional: true,
          cardinality: "one-to-one" },
        Prev: { type: "Edm.Int32", foreignProperty: "PrevInteger" },
        Next: { type: "Edm.Int32", foreignProperty: "NextInteger" },
      },
      rdfName: "integer",
    },
  },
  entitySets: {
    Integers: { type: "Integer" },
  },
  defaultNamespace: {
    prefix: "disco",
    uri: "http://disco-network.org/resource/",
  },
});
