var schema = new (require('../schema').Schema)();
var queries = require('../queries');
var squeries = require('../queries_sparql');
var mhelper = require('./helpers/sparql_mappings');
var gphelper = require('./helpers/sparql_graphpatterns');

describe('general sparql graph patterns', function() {
  it('should give me its triples', function() {
    var gp = new squeries.GraphPattern();

    expect(gp.getTriples()).toEqual([]);
  })
  it('should integrate other patterns', function() {
    var gp = new squeries.GraphPattern();
    var innerGp = new squeries.GraphPattern();

    innerGp.triples = [['a','b','c']];
    gp.integratePatterns([innerGp]);

    expect(gp.getTriples()).toEqual(innerGp.getTriples());
  })
  it('should integrate optional subpatterns of other patterns', function() {
    var gp = new squeries.GraphPattern();
    var innerGp = new squeries.GraphPattern();

    innerGp.optionalPatterns = [ new squeries.GraphPattern([ 'a','b','c' ]) ];
    gp.integratePatterns([innerGp]);

    expect(gp.getOptionalPatterns()).toEqual(innerGp.getOptionalPatterns());
  })
  it('should integrate patterns as optional', function() {
    var gp = new squeries.GraphPattern();
    var innerGp = new squeries.GraphPattern();

    innerGp.triples = [['a','b','c']];
    gp.integratePatternsAsOptional([innerGp]);

    expect(gp.getOptionalPatterns()[0]).toEqual(innerGp);
  })
})

describe('tree graph patterns', function() {
  it('should build a consistent tree', function() {
    var gp = new squeries.TreeGraphPattern('?root');

    gp.branch('disco:id', '?id');

    expect(gp.branchExists('disco:id')).toEqual(true);
    expect(gp.branchExists('disco:content')).toEqual(false);
    expect(gp.branch('disco:id')[0].name()).toEqual('?id');
  })
  it('should generate triples', function() {
    var gp = new squeries.TreeGraphPattern('?root');

    gp.branch('disco:id', '?id');
    gp.branch('disco:content', '?cnt').branch('disco:id', '?cntid');

    expect(gp.getTriples()).toContain([ '?root', 'disco:id', '?id' ]);
    expect(gp.getTriples()).toContain([ '?root', 'disco:content', '?cnt' ]);
    expect(gp.getTriples()).toContain([ '?cnt', 'disco:id', '?cntid' ]);
  })
  it('should allow optional branches', function() {
    var gp = new squeries.TreeGraphPattern('?root');

    gp.optionalBranch('disco:id', '?id');

    expect(gp.getOptionalPatterns()[0].getTriples()).toContain([ '?root', 'disco:id', '?id' ]);
  })
  it('should allow me to integrate other trees as branches', function() {
    var gp = new squeries.TreeGraphPattern('?root');
    var inner = new squeries.TreeGraphPattern('?inner');

    inner.branch('disco:id', '?id');
    gp.branch('disco:inner', inner);

    expect(gp.getTriples()).toContain([ '?inner', 'disco:id', '?id' ]);
  })
  it('should allow me to integrate other trees as optional branches', function() {
    var gp = new squeries.TreeGraphPattern('?root');
    var inner = new squeries.TreeGraphPattern('?inner');

    inner.branch('disco:id', '?id');
    gp.optionalBranch('disco:inner', inner);

    expect(gp.getOptionalPatterns()[0].getTriples()).toContain([ '?inner', 'disco:id', '?id' ]);
  })
  it('should allow me to merge with other trees', function() {
    var gp = new squeries.TreeGraphPattern('?root');
    var other = new squeries.TreeGraphPattern('?root');

    other.branch('disco:id', '?id');
    gp.merge(other);

    expect(gp.getTriples()).toContain([ '?root', 'disco:id', '?id' ]);
  })
  it('should not allow me to merge with trees with different roots', function() {
    var gp = new squeries.TreeGraphPattern('?root');
    var other = new squeries.TreeGraphPattern('?other');

    other.branch('disco:id', '?id');
    expect(function() { gp.merge(other) }).toThrow();
  })
  it('should detect and handle collisions when merging', function() {
    var gp = new squeries.TreeGraphPattern('?root');
    var gp2 = new squeries.TreeGraphPattern('?root');

    gp.branch('id', '?id');
    gp2.branch('id', '?id2');
    gp.merge(gp2);

    expect(gp.branch('id').length).toEqual(2);
  });
})

describe('direct property graph patterns', function() {
  it('should store the direct properties in the mapping', function() {
    var mapping = mhelper.createStructuredMapping();
    var gp = new squeries.DirectPropertiesGraphPattern(schema.getEntityType('Post'), mapping);

    expect(mapping.elementaryPropertyExists('Id')).toEqual(true);
    expect(mapping.elementaryPropertyExists('ParentId')).toEqual(true);
    expect(mapping.elementaryPropertyExists('ContentId')).toEqual(true);
    expect(mapping.elementaryPropertyExists('Parent')).toEqual(false);
    expect(mapping.elementaryPropertyExists('Content')).toEqual(false);
  })
  it('should create the triples corresponding to the direct properties', function() {
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.DirectPropertiesGraphPattern(schema.getEntityType('Post'), mapping);

    expect(gp.getTriples()).toContain([ '?post', 'disco:id', mapping.getElementaryPropertyVariable('Id') ]);
  })
  it('should create the triples corresponding to the mirrored direct properties', function() {
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.DirectPropertiesGraphPattern(schema.getEntityType('Post'), mapping);

    expect(gp.getTriples()).toContain([ '?post', 'disco:content', mapping.getComplexProperty('Content').getVariable() ]);
    expect(gp.getTriples()).toContain([ mapping.getComplexProperty('Content').getVariable(), 'disco:id', mapping.getElementaryPropertyVariable('ContentId') ]);
  })
  it('should create optional triples', function() {
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.DirectPropertiesGraphPattern(schema.getEntityType('Post'), mapping);

    expect(gp.getOptionalPatterns()[0].getTriples()).toContain([ '?post', 'disco:parent', mapping.getComplexProperty('Parent').getVariable() ]);
  })
})

describe('expanded property graph patterns', function() {
  it('should create the triples corresponding to the property and its direct subproperties', function() {
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.ExpandedPropertyGraphPattern(schema.getEntityType('Post'), 'Content', mapping);

    expect(gp.getTriples()).toContain([ '?post', 'disco:content', mapping.getComplexProperty('Content').getVariable() ]);
    expect(gp.getTriples()).toContain([ mapping.getComplexProperty('Content').getVariable(), 'disco:id', mapping.getComplexProperty('Content').getElementaryPropertyVariable('Id') ]);
  })
  it('should create optional triples', function() {
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.ExpandedPropertyGraphPattern(schema.getEntityType('Post'), 'Parent', mapping);

    expect(gp.getOptionalPatterns()[0].getTriples()).toContain([ '?post', 'disco:parent', mapping.getComplexProperty('Parent').getVariable() ]);
  })
})

describe('expand tree graph patterns', function() {
  it('should expand the first depth level', function() {
    var expandTree = { Content: {} };
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.ExpandTreeGraphPattern(schema.getEntityType('Post'), expandTree, mapping);
    console.log(1)

    expect(mapping.getComplexProperty('Content').elementaryPropertyExists('Id')).toEqual(true);
    expect(gp.getTriples()).toContain([ '?post', 'disco:content', mapping.getComplexProperty('Content').getVariable() ]);
    expect(gp.getTriples()).toContain([ mapping.getComplexProperty('Content').getVariable(), 'disco:id', mapping.getComplexProperty('Content').getElementaryPropertyVariable('Id') ]);
  })
  it('should expand the second depth level', function() {
    var expandTree = { Content: { Content: {} } };
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.ExpandTreeGraphPattern(schema.getEntityType('Post'), expandTree, mapping);

    expect(mapping.getComplexProperty('Content').getComplexProperty('Content').elementaryPropertyExists('Id')).toEqual(true);
  })
  it('should expand the optional properties of the first depth level', function() {
    var expandTree = { Parent: {} };
    var mapping = mhelper.createStructuredMapping('?post');
    var gp = new squeries.ExpandTreeGraphPattern(schema.getEntityType('Post'), expandTree, mapping);

    expect(mapping.getComplexProperty('Parent').elementaryPropertyExists('Id')).toEqual(true);
    expect(gp.getOptionalPatterns()[0].getTriples()).toContain(
      [ mapping.getComplexProperty('Parent').getVariable(), 'disco:id', mapping.getComplexProperty('Parent').getElementaryPropertyVariable('Id') ])
  })
})
