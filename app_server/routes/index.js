var express = require('express');
var router = express.Router();

// Links to controller files:
var ctrlInitialRender  = require('../controllers/initial-render');
var ctrlLoadResults  = require('../controllers/load-results');
var ctrlResponseDetails = require('../controllers/response-details');
var ctrlEntityTableDiagram = require('../controllers/entity-table-diagram');
var ctrlFullEntityList = require('../controllers/full-entity-list');
var ctrlTimeSeries = require('../controllers/time-series');


// GET & POST HTTP requests for the page:
router.get('/', ctrlInitialRender.initialRender); // initial HTML load
router.post('/load-results', ctrlLoadResults.loadResults); // load non-interactive results
router.post('/time-series',ctrlTimeSeries.getResponse); // load time-series data
// Fetch response details (in the histogram section):
router.post('/response-details', ctrlResponseDetails.getResponse);  
// Get full entity list for entity search function:
router.post('/full-entity-list', ctrlFullEntityList.getList);  
// Fetch results for Entity Table and Entity Linkage Diagram:
router.post('/entity-table-diagram', ctrlEntityTableDiagram.getResults);  

module.exports = router;
