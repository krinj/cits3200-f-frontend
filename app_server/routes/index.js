var express = require('express');
var router = express.Router();

// Link to controller file for rendering Sentiment Analytics page:
var ctrlSentimentAnalytics  = require('../controllers/sentiment-analytics');
var ctrlLoadResults  = require('../controllers/load-results');

// GET & POST HTTP request for the page:
router.get('/', ctrlSentimentAnalytics.initialPageRender);   // initial load
router.post('/load-results', ctrlLoadResults.loadResults);    // load results

// router.post('/', ctrlSentimentAnalytics.loadPage);  // submitting filter values

module.exports = router;