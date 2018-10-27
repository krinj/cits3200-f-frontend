
// Load/update the histogram response details based on user interaction:
module.exports.getResponse = function (req, res) {  
 
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
  var score = req.body.score;
  
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

  var query = "SELECT response AS responseDetail, timestamp AS submitDate, overall_sentiment from `cits-3200.analytics.responses_dev` WHERE employment_status = '" + employStatus + "' AND abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' AND question_id = '" + questionID + "' AND gender = '" + gender + "' AND timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " ;";

  if (orgABNhash == 'all') {
    query = query.replace(/abn_hash = 'all' AND/, '');
  }
  if (gender == 'all') {
    query = query.replace(/gender = 'all' AND/g, '');
  }
  if (employStatus == 'all') {
    query = query.replace(/employment_status = 'all' AND/g, '');
  }

  var response = [];
  var finished = false;
  asyncQuery(query, projectid);

  async function asyncQuery(sqlquery, projectid) {
    
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
    console.log('Job ${job.id} started.');

    // Get the job's status
    const metadata = await job.getMetadata();

    // Check the job's status for errors
    const errors = metadata[0].status.errors;
    if (errors && errors.length > 0) {
      throw errors;
    }
    console.log('Job ${job.id} completed.')

    const [rows] = await job.getQueryResults();
    if (rows.length == 0) {
      return;
    }
    for (var i = 0; i < rows.length; i++) {
      if (Math.round(rows[i].overall_sentiment * 10) == score) {
        response.push(rows[i]);
      }
      if (i == rows.length - 1) {
        finished = true;
      }
    }
  }

  var results;
  var interval = setInterval(function () {
    if (finished) {
      results = {
        responseResult: response
      };
      clearInterval(interval);
      return res.send(results);
    }
  }, 100);
};
