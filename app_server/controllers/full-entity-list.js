var dbConnection = require('./db-connection');

// Load/update the Entity Table and Entity Linkage Diagram based on user interaction:
module.exports.getList= function (req, res) {
  
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
  
  var query = "SELECT DISTINCT E.entity as ent FROM Submission S NATURAL JOIN Response R NATURAL JOIN Entity E WHERE E.entity IS NOT NULL AND organisation = '" + organisation + "' AND S.survey_id = " + surveyID + " AND question_num = " + questionNum + " AND S.gender = '" + gender + "' AND S.employment_status = '" + employStatus + "' AND S.date_submitted BETWEEN '" + startDate + "' AND '" + endDate + "' AND S.year_of_birth BETWEEN '" + birthStart + "' AND '" + birthEnd + "' ORDER BY E.entity;";

  // Remove filters set to 'all' if applicable:
  if (gender == 'all') {
    query = query.replace(/S.gender = 'all' AND/g, '');
  }
  if (employStatus == 'all') {
    query = query.replace(/S.employment_status = 'all' AND/g, '');
  }

  connection.query(query, function (err, rows, fields) {
    if (err) throw err;

    var entities = [];
    for (i = 0; i < rows.length; i++) {
      entities.push(rows[i].ent);
    }

    connection.end();
    return res.send(entities);
  });

};