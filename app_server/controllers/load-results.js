var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {
  
  var connection = dbConnection.connectToDB();
  var sqlquery = [];
   sqlquery[0] = "SELECT * FROM `cits-3200.analytics.responses_dev` where timestamp = '2019-08-23' LIMIT 1;";
  // where timestamp = '2019-08-23'
  const projectid = 'cits-3200';
  asyncQuery(sqlquery,projectid);
  async function asyncQuery(sqlquery, projectid) {
    // [START bigquery_query]
    // Imports the Google Cloud client library
    const BigQuery = require('@google-cloud/bigquery');
    const bigquery = new BigQuery({
      projectId: projectid,
    });
    /**
     * TODO(developer): Uncomment the following lines before running the sample.
     */
    projectId = projectid;
      sqlQuery = sqlquery;
    
    // Creates a client
    
  
    // Query options list: https://cloud.google.com/bigquery/docs/reference/v2/jobs/query
    const options = {
      query: sqlQuery,
      useLegacySql: false, // Use standard SQL syntax for queries.
      
    };
    
    // Runs the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);
  
    // Get the job's status
    const metadata = await job.getMetadata();
  
    // Check the job's status for errors
    const errors = metadata[0].status.errors;
    if (errors && errors.length > 0) {
      throw errors;
    }
    console.log('Job ${job.id} completed.')
  
    const [rows] = await job.getQueryResults();
    console.log('Rows:');
    console.log(rows);
    // [END bigquery_query]
  }


 

  // Filter variables, set to values sent to this controller from client:
  var questionId = req.body.questionNum;
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
  
  var query = [];

  // Query 0: Total response count:
  query[0]= "SELECT COUNT(*) AS totalResponse FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '" + questionId + "' AND S.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 1: Number of completed responses for this question:
  query[1]= "SELECT COUNT(*) AS completed FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '" + employStatus + "' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.char_count != 0 AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 2: Average character count:
  query[2]="SELECT AVG(char_count) AS AverageCount FROM `cits-3200.analytics.responses_dev` R  WHERE S.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND S.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 3: Max character count
  query[3] = " SELECT MAX(char_count) AS maxCount FROM `cits-3200.analytics.responses_dev` R  WHERE S.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND S.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 4: National average overall sentiment score for the question
  query[4]= "SELECT AVG(overall_sentiment) AS overallAverage FROM `cits-3200.analytics.responses_dev` R  WHERE S.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND S.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 5: Organisation's average overall sentiment score for the question
  query[5]= "SELECT AVG(overall_sentiment) AS organizationAverage FROM `cits-3200.analytics.responses_dev` R WHERE S.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 6: First Date of responses for this question
  query[6]= "SELECT timestamp AS firstDate FROM `cits-3200.analytics.responses_dev` R  WHERE R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '" + questionId + "' AND R.char_count != 0 AND R.timestamp ORDER BY timestamp ASC LIMIT 1;";

  // Query 7: List of Questions for the Survey
  query[7] = "SELECT distinct question_name,question_id FROM `cits-3200.analytics.responses_dev` R WHERE R.survey_id = 'd34f3eae8e9a48b6bc8c930bc5084b87';";

  // Query 8: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query[8] = "SELECT overall_sentiment, count(*) as frequency FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"'  AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.gender = '" + gender + "' AND R.char_count != 0 AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY overall_sentiment;";

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

    // Hard-coded values for response details display next to Histogram by Score
    // TODO: Update with actual dynamic data
    

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
    };

   
    
    return res.send(results);
  });  
  
  
};

