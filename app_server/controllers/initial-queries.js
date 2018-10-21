var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.getResults = function (req, res) {

  var connection = dbConnection.connectToDB();
  const projectid = 'cits-3200';
  

  var orgABN = req.body.orgABN; // organisation ABN

  var query = [];

  //TODO: *** Convert to BigQuery queries and add filter on orgABN ***

  // Query 0: First date of responses for the survey
  query[0] =  "SELECT timestamp As firstDate from `cits-3200.analytics.responses_dev` R WHERE R.survey_id = '0e3c8b046672428d95d3212970814b2c' ORDER BY firstDate ASC LIMIT 1;";

  // Query 1: Last date of responses for the survey
  query[1] = "SELECT timestamp AS lastDate FROM `cits-3200.analytics.responses_dev` R WHERE R.survey_id = '0e3c8b046672428d95d3212970814b2c' ORDER BY lastDate DESC LIMIT 1;";

  // Query 2: List of Questions for the Survey
  query[2] = "SELECT distinct question_name FROM `cits-3200.analytics.responses_dev` R WHERE R.survey_id = '0e3c8b046672428d95d3212970814b2c';";
  
  for(var i = 0;i<query.length;i++){
    asyncQuery(query[i],projectid,i);
  }
async function asyncQuery(sqlquery, projectid,queryIndex) {
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
      console.log('Rows:');
      console.log(rows);
    }
  // Run the SQL queries:
  connection.query(query, function (err, rows, fields) {
    if (err) throw err;
    
    // NB using underscores to distinguish from variables of same name sent back to AJAX    
    var first_date = rows[0][0].firstDate;
    var last_date = rows[1][0].lastDate;
    var question_array = [];
    for (i = 0; i < rows[2].length; i++) {
      question_array.push(rows[2][i].question);
    }

    var results = {
      firstDate: first_date,
      lastDate: last_date,
      questionArray: question_array,
    };

    connection.end();

    return res.send(results);
  });

};
