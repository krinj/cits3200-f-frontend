
// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResults = function (req, res) {

  const projectid = 'cits-3200';  

  var orgABNhash = req.body.orgABNhash; // hash of organisation ABN 
  var surveyID = req.body.surveyID; 

  var queries = [];

  // Query 0: First date of responses for the survey
  queries[0] = "SELECT timestamp As firstDate from `cits-3200.analytics.responses_dev` WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' ORDER BY firstDate ASC LIMIT 1;";

  // Query 1: Last date of responses for the survey
  queries[1] = "SELECT timestamp AS lastDate FROM `cits-3200.analytics.responses_dev` WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' ORDER BY lastDate DESC LIMIT 1;";

  // Query 2: List of Questions for the Survey
  queries[2] = "SELECT DISTINCT question_name, question_id FROM `cits-3200.analytics.responses_dev` WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "';";

  // Query 3: List of employment status options
  queries[3] = "SELECT DISTINCT employment_status FROM `cits-3200.analytics.responses_dev` WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "';"

  // Query 4: List of gender options
  queries[4] = "SELECT DISTINCT gender FROM `cits-3200.analytics.responses_dev` WHERE abn_hash = '" + orgABNhash + "' AND survey_id = '" + surveyID + "' ORDER BY gender;"
    
  for (var i = 0; i < queries.length; i++) {
    if (orgABNhash == 'all') {
      queries[i] = queries[i].replace(/abn_hash = 'all' AND/, '');
    }
    asyncQuery(queries[i], projectid, i);
  }

  var first_date;
  var last_date;
  var question_wordings = [];
  var question_ids = [];
  var employment_statuses = [];
  var gender_options = [];

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
        question_wordings.push(rows[i].question_name);
        question_ids.push(rows[i].question_id);
      }
    }
    else if (queryIndex == 3) {
      for (var i = 0; i < rows.length; i++) {
        employment_statuses.push(rows[i].employment_status);
      }
    }
    else if (queryIndex == 4) {
      for (var i = 0; i < rows.length; i++) {
        gender_options.push(rows[i].gender);
      }
    }
  }

  var results;
  var interval = setInterval(function () {
    if ((question_wordings.length != 0 && first_date && last_date && employment_statuses.length != 0 && gender_options.length != 0)) {

      results = {
        firstDate: first_date,
        lastDate: last_date,
        questionWordings: question_wordings,
        questionIDs: question_ids,
        employmentStatuses: employment_statuses,
        genderOptions: gender_options
      };

      clearInterval(interval);
      return res.send(results);
    }
  }, 100);

};
