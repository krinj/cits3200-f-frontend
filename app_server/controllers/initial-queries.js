var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResults = function (req, res) {

  const projectid = 'cits-3200';  

  var orgABNhash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1'; // hash of organisation ABN
  // var orgABNhash = req.body.orgABNhash; // *** TO IMPLEMENT 
  // var surveyID = req.body.surveyID; // *** TO IMPLEMENT 

  var queries = [];

  // Query 0: First date of responses for the survey
  queries[0] = "SELECT timestamp As firstDate from `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ORDER BY firstDate ASC LIMIT 1;";

  // Query 1: Last date of responses for the survey
  queries[1] = "SELECT timestamp AS lastDate FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ORDER BY lastDate DESC LIMIT 1;";

  // Query 2: List of Questions for the Survey
  queries[2] = "SELECT distinct question_name,question_id FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ;";

  // Query 3: List of surveys for the organization
  queries[3] = "SELECT distinct survey_name,survey_id FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ;"

  // Query 4: List of employment status options
  queries[4] = "SELECT distinct employment_status FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ;"

  // Query 5: List of gender options
  queries[5] = "SELECT distinct gender FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = '" + orgABNhash + "' ;"

  for (var i = 0; i < queries.length; i++) {
    asyncQuery(queries[i], projectid, i);
  }

  var first_date;
  var last_date;
  var question_array = [];
  var question_id = [];
  var survey_id = [];
  var survey_array = [];
  var employment_status = [];
  var gender_array = [];

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

    if (queryIndex == 0) {
      if (rows.length == 0) {
        return;
      }
      first_date = rows[0].firstDate.value;
    }
    else if (queryIndex == 1) {
      if (rows.length == 0) {
        return;
      }
      last_date = rows[0].lastDate.value;
    }
    else if (queryIndex == 2) {
      if (rows.length == 0) {
        return;
      }
      for (var i = 0; i < rows.length; i++) {
        question_array.push(rows[i].question_name);
        question_id.push(rows[i].question_id);
      }
    }
    else if (queryIndex == 3) {
      for (var i = 0; i < rows.length; i++) {
        survey_array.push(rows[i].survey_name);
        survey_id.push(rows[i].survey_id);
      }
    }
    else if (queryIndex == 4) {
      for (var i = 0; i < rows.length; i++) {
        employment_status.push(rows[i].employment_status);
      }
    }
    else if (queryIndex == 5) {
      for (var i = 0; i < rows.length; i++) {
        gender_array.push(rows[i].gender);
      }
    }
  }

  var results;
  var interval = setInterval(function () {
    if ((question_array != null && first_date && last_date && survey_array != null && survey_id != null && employment_status != null && gender_array != null)) {

      results = {
        firstDate: first_date,
        lastDate: last_date,
        questionArray: question_array,
        questionId: question_id,
        surveyArray: survey_array,
        surveyId: survey_id,
        employmentStatus: employment_status,
        genderArray: gender_array
      };

      clearInterval(interval);
      return res.send(results);
    }
  }, 1000);

};
