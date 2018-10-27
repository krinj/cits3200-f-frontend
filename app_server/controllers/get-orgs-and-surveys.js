
// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResults = function (req, res) {

  const projectid = 'cits-3200';  

  var queries = [];

  // Query 0: List of surveys for the organization
  queries[0] = "SELECT DISTINCT survey_name, survey_id FROM `cits-3200.analytics.responses_dev`;"

  // Query 1: List of organisations in the database, their ABNs & ABN hashes
  queries[1] = "SELECT DISTINCT organization, abn, abn_hash FROM `cits-3200.analytics.responses_dev`"

  for (var i = 0; i < queries.length; i++) {
    asyncQuery(queries[i], projectid, i);
  }

  var survey_ids = [];
  var survey_names = [];
  var org_names = [];
  var org_ABNs = [];
  var org_ABN_hashes = [];

  async function asyncQuery(sqlquery, projectid, queryIndex) {

    // Imports the Google Cloud client library:
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

    if (queryIndex == 0) {
      for (var i = 0; i < rows.length; i++) {
        survey_names.push(rows[i].survey_name);
        survey_ids.push(rows[i].survey_id);
      }
    }
    else if (queryIndex == 1) {
      for (var i = 0; i < rows.length; i++) {
        org_names.push(rows[i].organization);
        org_ABNs.push(rows[i].abn);
        org_ABN_hashes.push(rows[i].abn_hash);
      }
    }
  }

  var results;
  var interval = setInterval(function () {
    if ((survey_ids.length != 0 && org_ABN_hashes.length != 0)) {

      results = {
        surveyNames: survey_names,
        surveyIDs: survey_ids,
        orgNames: org_names,
        orgABNs: org_ABNs,
        orgABNhashes: org_ABN_hashes,
      };
      clearInterval(interval);
      return res.send(results);
    }
  }, 100);

};
