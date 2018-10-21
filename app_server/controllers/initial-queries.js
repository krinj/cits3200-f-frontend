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
  query[2] = "SELECT distinct question_name,question_id FROM `cits-3200.analytics.responses_dev` R WHERE R.survey_id = '0e3c8b046672428d95d3212970814b2c' ;";
  
  for(var i = 0;i<query.length;i++){
    asyncQuery(query[i],projectid,i);
  }
  var first_date;
  var last_date;
  var question_array = [];
  var question_id = [];
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
      if(queryIndex==0){
        first_date = rows[0].firstDate.value;
        console.log(first_date);
      }
      else if(queryIndex ==1){
        last_date = rows[0].lastDate.value;
        console.log(last_date);
      }
      else if(queryIndex==2){
        for(var i = 0;i<rows.length;i++){
          question_array.push(rows[i].question_name);
          question_id.push(rows[i].question_id);
        }
          console.log(question_array);
          console.log(question_id);
        
      }
    }
    

    
    setInterval(function(){
      if((question_array && first_date && last_date) ){
        var results = {
          firstDate: first_date,
          lastDate: last_date,
          questionArray: question_array,
        }; 
        
        return res.send(results);
      }
    }, 1000);

    return res.send(results);
  

};
