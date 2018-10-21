var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();

// Links to controller files:
var ctrlInitialRender  = require('../controllers/initial-render');
var ctrlInitialQueries  = require('../controllers/initial-queries');
var ctrlLoadResults  = require('../controllers/load-results');
var ctrlResponseDetails = require('../controllers/response-details');
var ctrlEntityTableDiagram = require('../controllers/entity-table-diagram');

// ===============================================================================
// ACCESS ROUTES
// ===============================================================================


let loadMasterPage = function (req, res) {
	return loadAccessPost(req, res);
};

let loadAccessPost = function (req, res) {
	let orgABN = req.body.orgABN;
	if (orgABN == null)
		orgABN = "master";
	return ctrlInitialRender.initialRender(req, res, orgABN);
};

let loadAccessGet = function (req, res) {
	let orgABN = req.query.orgABN;
	if (orgABN == null)
		orgABN = "master";
	return ctrlInitialRender.initialRender(req, res, orgABN);
};


// ===============================================================================
// ACCESS ROUTES
// ===============================================================================

// Support JSON Encoded Post Requests.

router.use(bodyParser.json());
router.use(express.json());

// The post request access point.
router.post('/load_access', loadAccessPost);
router.get('/load_access', loadAccessGet);

// GET & POST HTTP requests for the page:
router.get('/', loadMasterPage); // initial HTML load
router.post('/initial-queries', ctrlInitialQueries.getResults); // initial queries on page load
router.post('/load-results', ctrlLoadResults.loadResults); // load non-interactive results

// Fetch response details (in the histogram section):
router.post('/response-details', ctrlResponseDetails.getResponse);

// Fetch results for Entity Table and Entity Linkage Diagram:
router.post('/entity-table-diagram', ctrlEntityTableDiagram.getResults);

module.exports = router;
