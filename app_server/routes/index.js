var express = require('express');
var router = express.Router();

// Links to controller files:
var ctrlInitialRender  = require('../controllers/initial-render');
var ctrlLoadResults  = require('../controllers/load-results');
var ctrlResponseDetails = require('../controllers/response-details');
var ctrlTimeSeries = require('../controllers/time-series');

// GET & POST HTTP request for the page:
router.get('/', ctrlInitialRender.initialRender); // initial HTML load
router.post('/load-results', ctrlLoadResults.loadResults); // load results
// Fetch response details (in the histogram section):
router.post('/response-details', ctrlResponseDetails.getResponse);
router.post('/time-series',ctrlTimeSeries.getResponse); 

module.exports = router;
