var dbConnection = require('./db-connection');

// Load/update the Entity Table and Entity Linkage Diagram based on user interaction:
module.exports.getResults = function (req, res) {
  
  var connection = dbConnection.connectToDB();

  connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database!");
  });

  // Filter variables, set to values sent to this controller from client:

  var organisation = 'Honeywell' // req.body.organisation;
  var surveyID = 1; // req.body.surveyID;
  var questionNum = req.body.questionNum;
  var gender = req.body.gender;
  var ageRange = req.body.ageRange;
  var employStatus = req.body.employStatus;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var displayMode = req.body.displayMode;
  var numEntities = req.body.numEntities;
  var focusEntity = req.body.focusEntity;

  // Determine the start and end years of birth for different age ranges:
  var birthStart;
  var birthEnd; 
  var currentYear = (new Date()).getFullYear(); 
  if (ageRange == 'all') {
    birthStart = 1900;   // No-one on Earth was born before then!
    birthEnd = currentYear;
  } else if (ageRange == 'ageunder18') {
    birthStart = currentYear - 18;
    birthEnd = currentYear;
  } else if (ageRange == 'age65plus') {
    birthStart = 1900;  
    birthEnd = currentYear - 65;
  } else {
    var ageRangeSlice = ageRange.slice(3, 8);
    var ageRangeArray = ageRangeSlice.split('_');
    birthStart = currentYear - parseInt(ageRangeArray[1]);
    birthEnd = currentYear - parseInt(ageRangeArray[0]);
  }
  
  var queries = "";

  if (displayMode == "focus") {

  } 
  else {
    var query1Start = "SELECT entity, COUNT(*) AS freq, AVG(sentiment) AS aveSentiment FROM Submission S NATURAL JOIN Response R NATURAL JOIN Entity E WHERE entity IS NOT NULL AND organisation = '" + organisation + "' AND S.survey_id = " + surveyID + " AND question_num = " + questionNum + " AND S.gender = '" + gender + "' AND S.employment_status = '" + employStatus + "' AND S.date_submitted BETWEEN '" + startDate + "' AND '" + endDate + "' AND S.year_of_birth BETWEEN '" + birthStart + "' AND '" + birthEnd + "' GROUP BY entity ";
    var query1End = "";
    var query2Start = "SELECT E1.response_id AS responseID, E1.entity AS entity FROM Entity E1 INNER JOIN (";
    var query2End = ") AS E2 ON E1.entity = E2.entity;";
  
    if (displayMode == "topFreq") {
      query1End = "ORDER BY COUNT(*) DESC, entity ASC LIMIT " + numEntities;
    }
    else if (displayMode == "mostPos") {
      query1End = "ORDER BY AVG(sentiment) DESC, COUNT(*) DESC, entity ASC LIMIT " + numEntities;
    }
    else if (displayMode == "mostNeg") {
      query1End = "ORDER BY AVG(sentiment) ASC, COUNT(*) DESC, entity ASC LIMIT  " + numEntities;
    }
    queries = query1Start + query1End + ";\n" + query2Start + query1Start + query1End + query2End;
  }
  
  if (gender == 'all') {
    queries = queries.replace(/S.gender = 'all' AND/g, '');
  }

  if (employStatus == 'all') {
    queries = queries.replace(/S.employment_status = 'all' AND/g, '');
  }

  console.log("Queries:\n" + queries);

  connection.query(queries, function (err, rows, fields) {
    if (err) throw err;
    
    // Arrays to store columns of query 1:
    var entities_1 = [];
    var freqs = [];
    var ave_sentiments = [];

    // Arrays to store columns of query 2:
    var response_ids = [];
    var entities_2 = [];

    for (i = 0; i < rows[0].length; i++) {
      entities_1.push(rows[0][i].entity);
      freqs.push(rows[0][i].freq);
      ave_sentiments.push(rows[0][i].aveSentiment);
    }

    for (i = 0; i < rows[1].length; i++) {
      response_ids.push(rows[1][i].responseID);
      entities_2.push(rows[1][i].entity);
    }

    var results = {
      entities1: entities_1,
      frequencies: freqs,
      aveSentiments: ave_sentiments,
      responseIDs: response_ids,
      entities2: entities_2
    };

    // console.log(results);

    connection.end();

    return res.send(results);
  });

};
