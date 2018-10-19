var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {

  var connection = dbConnection.connectToDB();

  connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database!");
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

  // Query 0: Total response count:
  query += "SELECT COUNT(*) AS totalResponse FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.survey_id = 1 AND R.question_num = '" + questionNum + "' AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 1: Number of completed responses for this question:
  query += "SELECT COUNT(*) AS completed FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '" + employStatus + "' AND R.survey_id = 1 AND R.question_num = '"+ questionNum +"' AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 2: Average character count:
  query +="SELECT AVG(char_count) AS AverageCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 3: Max character count
  query += " SELECT MAX(char_count) AS maxCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 4: National average overall sentiment score for the question
  query += "SELECT AVG(overall_sentiment) AS overallAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 5: Organisation's average overall sentiment score for the question
  query += "SELECT AVG(overall_sentiment) AS organizationAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 6: First Date of responses for this question
  query += "SELECT date_submitted AS firstDate FROM Submission S NATURAL JOIN Response R WHERE R.survey_id = 1 AND R.question_num = '" + questionNum + "' AND R.char_count != 0 AND S.date_submitted ORDER BY date_submitted ASC LIMIT 1;";

  // Query 7: List of Questions for the Survey
  query += "SELECT question FROM Question WHERE survey_id = 1;";

  // Query 8: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query += "SELECT overall_sentiment, count(*) as frequency FROM Response R, Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY overall_sentiment;";

  /*query += "SELECT date_submitted as ds, AVG(overall_sentiment) as avgOs FROM Submission S, Response R WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'  Group BY date_submitted order by date_submitted;";*

/*  query += "SELECT date_submitted as ds, AVG(overall_sentiment) as avgOs FROM Submission S, Response R WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'  Group BY date_submitted order by date_submitted;"; */
  // Query 9: Response Details table
  // query += "SELECT date_submitted, response, overall_sentiment FROM Response R, Submission S WHERE R.submission_id=S.submission_id AND R.question_num = 1 AND R.survey_id=1 AND S.gender = 'male' AND R.char_count != 0 AND S.date_submitted BETWEEN '2016-01-20' AND '2018-04-21' order by overall_sentiment;";

  // Remove filters set to 'all' if applicable:
  var queryCopy = query;
  if (gender == 'all') {
    queryCopy = queryCopy.replace(/S.gender = 'all' AND/g, '');
  }
  if (employStatus == 'all') {
    queryCopy = queryCopy.replace(/S.employment_status = 'all' AND/g, '');
  }

  // Run the SQL queries:
  connection.query(queryCopy, function (err, rows, fields) {
    if (err) throw err;

    // NB using underscores to distinguish from variables of same name sent to pug file
    var num_responses;
    var num_completed;
    var percent_completed;
    var ave_char_count;
    var max_char_count;
    var national_ave;
    var organisation_ave;
    var first_date;
    var question_array = [];
    var score_freq_array = [];

    if (rows[1][0].completed == 0) { // this prevents errors from query results being null
      num_responses = 0;
      num_completed = 0;
      percent_completed = 0;
      ave_char_count = 0;
      max_char_count = 0;
      national_ave = 0;
      organisation_ave = 0;
      first_date = rows[6][0].firstDate;
      for (i = 0; i < rows[7].length; i++) {
        question_array.push(rows[7][i].question);
      }
      for (var i = 0; i < 21; i++) {
        score_freq_array[i] = 0;
      }
    } else {
      num_responses = rows[0][0].totalResponse;
      num_completed = rows[1][0].completed;
      percent_completed = parseInt((num_completed / num_responses) * 100);
      ave_char_count = parseInt(rows[2][0].AverageCount);
      max_char_count = rows[3][0].maxCount;
      national_ave = rows[4][0].overallAverage;
      organisation_ave = rows[5][0].organizationAverage;
      first_date = rows[6][0].firstDate;
      for (i = 0; i < rows[7].length; i++) {
        question_array.push(rows[7][i].question);
      }
      var index = 0;
      var arrayIndex = 0;
      var responses = rows[8];
      //console.log(responses);
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
    }
    //var time_series = rows[9];

    //console.log(rows[8]);
    //console.log(time_series[0].ds.slice(0,10));
    //console.log(rows[9]);
    // Hard-coded values for response details display next to Histogram by Score
    // TODO: Update with actual dynamic data
    var response_date = "06/07/2018";
    var response_score = 9;
    var response_text =  "Honeywell is perfectly positioned to enter the Industrial IoT space and transition from creating physical products to analytics, digital products and AI.";

    var results = {
      questionArray: question_array,
      questionValue: questionNum,
      genderValue: gender,
      ageRangeValue: ageRange,
      employStatusValue: employStatus,
      startDateValue: startDate,
      endDateValue: endDate,
      firstDate: first_date,
      numResponses: num_responses,
      percentCompleted: percent_completed,
      aveCharCount: ave_char_count,
      maxCharCount: max_char_count,
      orgAveSentiment: organisation_ave,
      nationalAveSentiment: national_ave,
      scoreFreqArray: score_freq_array,
      // responseDetail: response_detail,
		  responseDate: response_date,
		  responseScore: response_score,
      responseText: response_text,
      //timeSeries: time_series,

    };

    connection.end();

    return res.send(results);
  });

};
