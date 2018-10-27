
// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {
  
  const projectid = 'cits-3200';
  
  // Filter variables, set to values sent to this controller from client:
  var orgABNhash = req.body.orgABNhash; 
  var surveyID = req.body.surveyID; 
  var questionID = req.body.questionID;
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
  
  // Query 0: Find number of responses for set of filters
  query[0] = "SELECT COUNT(*) as totalResponse FROM `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND abn_hash = '"+ orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID +"' AND gender = '" + gender + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND year_of_birth BETWEEN "+ birthStart + " AND " + birthEnd + "; ";  

  // Query 1: Organisation's average overall sentiment score for the question
  query[1] = "SELECT AVG(overall_sentiment) AS organizationAverage FROM `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID + "' AND gender = '" + gender + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " ;";
  
  // Query 2: Get overall sentiment time-series data:
  query[2] = "SELECT timestamp as ds, AVG(overall_sentiment) as avgOs FROM `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID + "'  AND gender = '" + gender + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + "  GROUP BY ds ORDER BY ds;";

  // Query 3: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query[3] = "SELECT overall_sentiment, COUNT(*) as frequency FROM `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID + "' AND gender = '" + gender + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " GROUP BY overall_sentiment ORDER BY overall_sentiment ASC;";

  // Query 4: Get list of entities for entity search function
  query[4] = "SELECT DISTINCT LOWER(e.name) as ent FROM `cits-3200.analytics.responses_dev` R,UNNEST(entity) AS e WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID + "' AND gender = '" + gender + "' AND employment_status = '" + employStatus + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + ";";

  // Query 6: National average overall sentiment score for the question
  // query[1] = "SELECT AVG(overall_sentiment) AS nationalAverage FROM `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND question_id = '" + questionID + "' AND gender = '" + gender + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " ;";

  var queryCopy = [];
  for (var i = 0; i < query.length; i++) {
    queryCopy[i] = query[i];
    if (gender == 'all') {
      queryCopy[i] = queryCopy[i].replace(/gender = 'all' AND/, '');
    }
    if (employStatus == 'all') {
      queryCopy[i] = queryCopy[i].replace(/employment_status = 'all' AND/, '');
    }
  }
  
  // NB using underscores to distinguish from variables of same name sent to pug file
  var num_responses;
  var organization_ave;
  var time_series;
  var score_freq_array = [];
  var entities; 
  // var national_ave;
  
  // Run the SQL queries:
  for (var i = 0; i < queryCopy.length; i++) {
    asyncQuery(queryCopy[i], projectid, i);
  }

  async function asyncQuery(sqlquery, projectid, queryIndex) {
    // Imports the Google Cloud client library
    const BigQuery = require('@google-cloud/bigquery');
    const bigquery = new BigQuery({
      projectId: projectid,
    });
    projectId = projectid;
    sqlQuery = sqlquery;
    const options = {
      query: sqlQuery,
      useLegacySql: false, // Use standard SQL syntax for queries.
    };

    // Runs the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log("Job ${job.id} started.");

    // Get the job's status
    const metadata = await job.getMetadata();

    // Check the job's status for errors
    const errors = metadata[0].status.errors;
    if (errors && errors.length > 0) {
      throw errors;
    }
    console.log('Job ${job.id} completed.')

    const [rows] = await job.getQueryResults();

    if (queryIndex == 0) {
      if (rows.length == 0) {
        num_responses = 0;
        return;
      } else {
        num_responses = rows[0].totalResponse;
      }
    }
    else if (queryIndex == 1) {
      if (rows.length == 0) {
        organization_ave = 0;
        return;
      } else {
        organization_ave = rows[0].organizationAverage;
      }
    }
    else if (queryIndex == 2) {
      if (rows.length == 0) {
        return;
      } else {
        time_series = rows;
      }
    }
    else if (queryIndex == 3) {
      if (rows.length == 0) {
        for (var i = -10; i < 11; i++) {
          score_freq_array[i] = 0;
        }
        return;
      } 
      else {
        var index = 0;
        var arrayIndex = 0;
        var responses = rows;  
        for (var i = -10; i < 11; i++) {
          if (i != Math.round(responses[index].overall_sentiment * 10)) {
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
    }
    else if (queryIndex == 4) {
      if (rows.length == 0) {
        return;
      }
      entities = rows;
    }
  }

  var results;
  var interval = setInterval(function () {
    if ((num_responses && organization_ave && score_freq_array.length > 0 && time_series && entities)) {

      results = {
        numResponses: num_responses,
        orgAveSentiment: organization_ave * 10,
        // nationalAveSentiment: national_ave * 10,
        scoreFreqArray: score_freq_array,
        timeSeries: time_series,
        entityList: entities
      };

      clearInterval(interval);
      return res.send(results);
    }
  }, 100);
};


