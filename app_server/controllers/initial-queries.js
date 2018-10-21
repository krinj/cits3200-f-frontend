var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResults = function (req, res) {

  var connection = dbConnection.connectToDB();

  connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database!");
  });

  var orgABN = req.body.orgABN; // organisation ABN

  var query = "";

  //TODO: *** Convert to BigQuery queries and add filter on orgABN ***

  // Query 0: First date of responses for the survey
  query += "SELECT date_submitted AS firstDate FROM Submission S NATURAL JOIN Response R WHERE R.survey_id = 1 ORDER BY date_submitted ASC LIMIT 1;";

  // Query 1: Last date of responses for the survey
  query += "SELECT date_submitted AS lastDate FROM Submission S NATURAL JOIN Response R WHERE R.survey_id = 1 ORDER BY date_submitted DESC LIMIT 1;";

  // Query 2: List of Questions for the Survey
  query += "SELECT question FROM Question WHERE survey_id = 1;";

  // Run the SQL queries:
  connection.query(query, function (err, rows, fields) {
    if (err) throw err;

    // NB using underscores to distinguish from variables of same name sent back to AJAX    
    var first_date = rows[0][0].firstDate;
    var last_date = rows[1][0].lastDate;
    var question_array = [];
    for (i = 0; i < rows[2].length; i++) {
      question_array.push(rows[2][i].question);
    }

    var results = {
      firstDate: first_date,
      lastDate: last_date,
      questionArray: question_array,
    };

    connection.end();

    return res.send(results);
  });

};
