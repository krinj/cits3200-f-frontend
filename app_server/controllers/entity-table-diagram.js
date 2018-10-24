var dbConnection = require('./db-connection');

// Load/update the Entity Table and Entity Linkage Diagram based on user interaction:
module.exports.getResults = function (req, res) {
  
  
  const projectid = 'cits-3200';
  
  
  // Filter variables, set to values sent to this controller from client:

  var orgABNhash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1'; // req.body.organisation;
 // var surveyID = 1; // req.body.surveyID;
  //var questionNum = req.body.questionNum;
  var questionId = req.body.questionNum;
  var gender = req.body.gender;
  var ageRange = req.body.ageRange;
  var employStatus = req.body.employStatus;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var displayMode = req.body.displayMode;
  
  var numEntities = req.body.numEntities;
  
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

  var query1Start = "SELECT DISTINCT Lower(e.name) as entity, COUNT(*) AS freq, AVG(e.score) AS aveSentiment ";
  var query1Middle = "FROM `cits-3200.analytics.responses_dev` R,UNNEST(entity) AS e WHERE R.abn_hash = '"+ orgABNhash + "' AND R.question_id = '" + questionId + "' AND R.gender = '" + gender + "' AND R.employment_status = '" + employStatus + "' AND R.timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND R.year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + "";
  var query1End;
  if (displayMode == "focus") {
    query1End = " GROUP BY entity ORDER BY entity";
  } 
  else if (displayMode == "topFreq") {
    query1End = " GROUP BY entity ORDER BY freq DESC, entity ASC LIMIT " + numEntities;
  }
  else if (displayMode == "mostPos") {
    query1End = " GROUP BY entity ORDER BY aveSentiment DESC, freq DESC, entity ASC LIMIT " + numEntities;
  }
  else if (displayMode == "mostNeg") {
    query1End = " GROUP BY entity ORDER BY aveSentiment ASC, freq DESC, entity ASC LIMIT " + numEntities;
  }

  var query1 = query1Start + query1Middle + query1End + ";\n";
  var query2 = "SELECT DISTINCT Lower(e.name) as entity , submission_id AS responseID " + query1Middle + ";"
  
  var queries = [];
  queries[0] = query1;
  queries[1] = query2;
  for(var i = 0;i<queries.length;i++){
  if (gender == 'all') {
    queries[i] = queries[i].replace(/R.gender = 'all' AND/g, '');
  }

  if (employStatus == 'all') {
    queries[i] = queries[i].replace(/R.employment_status = 'all' AND/g, '');
  }
  if(questionId == 'all'){
    queries[i] =queries[i].replace(/AND R.question_id = 'all'/,'');
  }
  } 
    // Arrays to store columns of query 1:
    var entities_1 = [];
    var freqs = [];
    var ave_sentiments = [];

    // Arrays to store columns of query 2:
    var response_ids = [];
    var entities_2 = [];   
    var stop1 = false;
    var stop2 = false;
    
    for (var i = 0; i<queries.length;i++){
     asyncQuery(queries[i], projectid,i);
    
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

      //console.log(sqlquery);
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
     
      if(queryIndex==0){
        if(rows.length==0){
          return;
        }
    for (i = 0; i < rows.length; i++) {
      entities_1.push(rows[i].entity);
      freqs.push(rows[i].freq);
      ave_sentiments.push(Math.round(rows[i].aveSentiment*10));
      if(i==rows.length-1){
        stop1 = true;
      }
    }
    } 
    else if(queryIndex==1){
      if(rows.length==0){
        return;
      }
    for (i = 0; i < rows.length; i++) {
      response_ids.push(rows[i].responseID);
      entities_2.push(rows[i].entity);
      if(i==rows.length-1){
        stop2 = true;
      }
    }
    }
    }
    
    var results;
    var interval = setInterval(function() {
      if((stop1 ==true && stop2 == true) ){
        
          
        results = {
          entities1: entities_1,
          frequencies: freqs,
          aveSentiments: ave_sentiments,
          responseIDs: response_ids,
          entities2: entities_2,
        };
        
        clearInterval(interval);
        
        return res.send(results);
      }
    }, 1000);
    
   

    
  

};
