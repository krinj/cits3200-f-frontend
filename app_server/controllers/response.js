var mysql = require('mysql');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResponse = function (req, res) {
  var test ;
  let config = {
    user: process.env.SQL_USER,
    database: process.env.SQL_DATABASE,
    password: process.env.SQL_PASSWORD,
    multipleStatements: true
  };

  if (process.env.INSTANCE_CONNECTION_NAME) {
	config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
  }

  //let connection = mysql.createConnection(config);

  // Google Cloud SQL Connection:
  // var connection = mysql.createConnection({
  //   host     : '127.0.0.1',
  //   user     : 'root',
  //   password : 'M2jquKgPuDsbM7kN',
  //   database : 'survey_data',
  //   multipleStatements: true
  // });
  
  // Terence's localhost MySQL Connection:
   var connection = mysql.createConnection({
     host     : 'localhost',
     user     : 'root',
     password : 'Cyr331705',
     database : 'survey_data',
     multipleStatements: true
   });

  connection.connect(function(err) {
    if (err) throw err;
    console.log(" You are fetching response.");
  });

  // Filter variables, set to values sent to this controller from client:
  var questionNum = req.body.questionNum;
  var gender = req.body.gender;
  var ageRange = req.body.ageRange;
  var employStatus = req.body.employStatus;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var score = req.body.score;
  var responseResult;
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
  query += "SELECT response as responseDetail,date_submitted as submitDate from Response R NATURAL JOIN Submission S WHERE R.overall_sentiment = '" + score +"' AND S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' ;";
  var queryCopy = query;
  if (gender == 'all') {
    queryCopy = queryCopy.replace(/S.gender = 'all' AND/g, '');
  }
  if (employStatus == 'all') {
    queryCopy = queryCopy.replace(/S.employment_status = 'all' AND/g, '');
  }
  connection.query(queryCopy, function (err, rows, fields) {
    if (err) throw err;
    var result = rows;
    
    var results = { 
        
        responseResult:result
      };
  
      connection.end();
      
      return res.send(results);
  });
}
