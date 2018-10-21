var express = require('express');
var router = express.Router();

// Links to controller files:
var ctrlInitialRender  = require('../controllers/initial-render');
var ctrlInitialQueries  = require('../controllers/initial-queries');
var ctrlLoadResults  = require('../controllers/load-results');
var ctrlResponseDetails = require('../controllers/response-details');
var ctrlEntityTableDiagram = require('../controllers/entity-table-diagram');

// GET & POST HTTP requests for the page:
router.get('/', ctrlInitialRender.initialRender); // initial HTML load
router.post('/initial-queries', ctrlInitialQueries.getResults); // initial queries on page load
router.post('/load-results', ctrlLoadResults.loadResults); // load non-interactive results
// Fetch response details (in the histogram section):
router.post('/response-details', ctrlResponseDetails.getResponse);   
// Fetch results for Entity Table and Entity Linkage Diagram:
router.post('/entity-table-diagram', ctrlEntityTableDiagram.getResults);  

module.exports = router;
