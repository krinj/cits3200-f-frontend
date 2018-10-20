var dbConnection = require('./db-connection');

// Load/update the histogram response details based on user interaction:
module.exports.getResponse = function (req, res) {

  var connection = dbConnection.connectToDB();

  connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database time-series!");
  });

  // Filter variables, set to values sent to this controller from client:
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

  var query = "";
  query += "SELECT date_submitted as ds, AVG(overall_sentiment) as avgOs FROM Submission S, Response R WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'  Group BY date_submitted order by date_submitted;";


  if (gender == 'all') {
    query = query.replace(/S.gender = 'all' AND/g, '');
  }

  if (employStatus == 'all') {
    query = query.replace(/S.employment_status = 'all' AND/g, '');
  }

  connection.query(query, function (err, rows, fields) {
    if (err) throw err;
    //timeSeries
    var time_series = rows;
    //console.log(time_series);

    var results = {
      timeSeries: time_series,
    };
    connection.end();

    return res.send(results);
  });

};