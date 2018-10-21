var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {

  var connection = dbConnection.connectToDB();

  connection.connect(function(err) {
    if (err) throw err;
    console.log("load-results.js has connected to database!");
  });

  // Organisation and survey details: ****TODO
  // var organisation = req.body.organisation;
  // var surveyID = req.body.surveyID;

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

  var queries = "";

  // Query 0: Total response count:
  queries += "SELECT COUNT(*) AS totalResponse FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.survey_id = 1 AND R.question_num = '" + questionNum + "' AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 1: Number of completed responses for this question:
  queries += "SELECT COUNT(*) AS completed FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '" + employStatus + "' AND R.survey_id = 1 AND R.question_num = '"+ questionNum +"' AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 2: Average character count:
  queries +="SELECT AVG(char_count) AS AverageCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 3: Max character count
  queries += " SELECT MAX(char_count) AS maxCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 4: National average overall sentiment score for the question
  queries += "SELECT AVG(overall_sentiment) AS overallAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 5: Organisation's average overall sentiment score for the question
  queries += "SELECT AVG(overall_sentiment) AS organizationAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 6: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  queries += "SELECT overall_sentiment, count(*) as frequency FROM Response R, Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY overall_sentiment;";

  // Query 7: Get overall sentiment time-series data:
  queries += "SELECT date_submitted as ds, AVG(overall_sentiment) as avgOs FROM Submission S, Response R WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'  Group BY date_submitted order by date_submitted;";  

  // Query 8: Get list of entities for entity search function
  queries += "SELECT DISTINCT E.entity as ent FROM Submission S NATURAL JOIN Response R NATURAL JOIN Entity E WHERE E.entity IS NOT NULL AND question_num = " + questionNum + " AND S.gender = '" + gender + "' AND S.employment_status = '" + employStatus + "' AND S.date_submitted BETWEEN '" + startDate + "' AND '" + endDate + "' AND S.year_of_birth BETWEEN '" + birthStart + "' AND '" + birthEnd + "' ORDER BY E.entity;";

  // Remove filters set to 'all' if applicable:
  if (gender == 'all') {
    queries = queries.replace(/S.gender = 'all' AND/g, '');
  }
  if (employStatus == 'all') {
    queries = queries.replace(/S.employment_status = 'all' AND/g, '');
  }

  // Run the SQL queries:
  connection.query(queries, function (err, rows, fields) {
    if (err) throw err;

    // NB using underscores to distinguish from variables of same name sent to pug file
    var num_responses;
    var num_completed;
    var percent_completed;
    var ave_char_count;
    var max_char_count;
    var national_ave;
    var organisation_ave;
    var score_freq_array = [];
    var time_series;
    var entities = [];

    if (rows[1][0].completed == 0) { // this prevents errors from query results being null      
      num_responses = 0;
      num_completed = 0;
      percent_completed = 0;
      ave_char_count = 0;
      max_char_count = 0;
      national_ave = 0;
      organisation_ave = 0;
      for (i = 0; i < 21; i++) {
        score_freq_array[i] = 0;
      }
      time_series = [];
    } 
    else {
      num_responses = rows[0][0].totalResponse;
      num_completed = rows[1][0].completed;
      percent_completed = parseInt((num_completed / num_responses) * 100);
      ave_char_count = parseInt(rows[2][0].AverageCount);
      max_char_count = rows[3][0].maxCount;
      national_ave = rows[4][0].overallAverage;
      organisation_ave = rows[5][0].organizationAverage;
      var index = 0;
      var arrayIndex = 0;
      var responses = rows[6];
      for (i = -10; i < 11; i++) {
        if (i != responses[index].overall_sentiment) {
          score_freq_array[arrayIndex] = 0;
          arrayIndex++;
        } else {
          score_freq_array[arrayIndex] = responses[index].frequency;

          index++;
          if (index == responses.length) {
            index--;
          }
          arrayIndex++;
        }
      }
      time_series = rows[7];
      for (i = 0; i < rows[8].length; i++) {
        entities.push(rows[8][i].ent);
      }
    }

    var results = {
      numResponses: num_responses,
      percentCompleted: percent_completed,
      aveCharCount: ave_char_count,
      maxCharCount: max_char_count,
      orgAveSentiment: organisation_ave,
      nationalAveSentiment: national_ave,
      scoreFreqArray: score_freq_array,
      timeSeries: time_series,
      entityList: entities
    };

    connection.end();

    return res.send(results);
  });

};
