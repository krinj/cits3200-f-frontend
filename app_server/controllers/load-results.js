var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {
  
  var connection = dbConnection.connectToDB();
  console.log("getting in the load-reslut");
  const projectid = 'cits-3200';
  // Filter variables, set to values sent to this controller from client:
  //var questionNum = req.body.questionValue;
  var questionId = 'all';
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
  

  

  // Query 2: select all the responses
  query[0]= "SELECT count(*) as totalResponse FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '" + employStatus + "' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +"; ";
  

  // Query 3: National average overall sentiment score for the question
  query[1]= "SELECT AVG(overall_sentiment) AS nationalAverage FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  // Query 4: Organisation's average overall sentiment score for the question
  query[2]= "SELECT AVG(overall_sentiment) AS organizationAverage FROM `cits-3200.analytics.responses_dev` R WHERE R.employment_status = '"+ employStatus +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  

  
  // Query 6: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query[3] = "SELECT overall_sentiment, count(*) as frequency FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" GROUP BY overall_sentiment ORDER BY overall_sentiment ASC;";

  // Query 4: Get overall sentiment time-series data:
  query[4] = "SELECT timestamp as ds, AVG(overall_sentiment) as avgOs FROM `cits-3200.analytics.responses_dev` R WHERE R.employment_status = '"+ employStatus +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"'  AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +"  Group BY ds order by ds;";  

  // Query 5: Get list of entities for entity search function
  query[5] = "SELECT entity as ent FROM `cits-3200.analytics.responses_dev` R WHERE R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '" + questionId + "' AND R.gender = '" + gender + "' AND R.employment_status = '" + employStatus + "' AND R.timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND R.year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " ;";


 
  /* Query 8: Get list of entities for entity search function
  queries2 += "SELECT DISTINCT E.entity as ent FROM Submission S NATURAL JOIN Response R NATURAL JOIN Entity E WHERE E.entity IS NOT NULL AND question_num = " + questionNum + " AND S.gender = '" + gender + "' AND S.employment_status = '" + employStatus + "' AND S.date_submitted BETWEEN '" + startDate + "' AND '" + endDate + "' AND S.year_of_birth BETWEEN '" + birthStart + "' AND '" + birthEnd + "' ORDER BY E.entity;";*/

  
















  var queryCopy = [];
  for (var i= 0;i<query.length;i++){
    queryCopy[i] = query[i];
    if (gender == 'all') {
      queryCopy[i] = queryCopy[i].replace(/R.gender = 'all' AND/, '');
    }
    if (employStatus == 'all') {
      queryCopy[i] = queryCopy[i].replace(/R.employment_status = 'all' AND/, '');
    }
    if(questionId == 'all'){
      queryCopy[i] =queryCopy[i].replace(/AND R.question_id = 'all'/,'');
    }
  }
  
  

  // Run the SQL queries:
  
    // NB using underscores to distinguish from variables of same name sent to pug file
  var num_responses;
  var time_series;
  var percent_completed ;
  var ave_char_count ;
  var max_char_count;
  var national_ave;
  var organization_ave;
  var entities;
  var score_freq_array = [];

 
  for (var i = 0; i<queryCopy.length;i++){
    asyncQuery(queryCopy[i], projectid,i);
    
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
      
      if(queryIndex==0){
        num_responses = rows[0].totalResponse;
      }

      else if (queryIndex ==1){
       
        national_ave = rows[0].nationalAverage;
      }
      else if(queryIndex ==2){
        organization_ave = rows[0].organizationAverage;
      }
      else if(queryIndex==3){
        var index = 0;
        var arrayIndex = 0;
        var responses = rows;
       for (i = -10; i < 11; i++) {
        if (i != Math.round(responses[index].overall_sentiment*10)) {
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
       else if(queryIndex == 4){
        time_series = rows;
       }
      
      else if (queryIndex == 5){
        entities = ['job','company','salary','food'];
      }
    
      
    }

    percent_completed = 100;
    ave_char_count = 100;
    max_char_count = 100;
    var results;
    var interval = setInterval(function() {
      if((num_responses && percent_completed && ave_char_count&&max_char_count&& organization_ave && national_ave && score_freq_array && time_series && entities) ){
        
          
          results = {
          numResponses: num_responses, 
          
          percentCompleted: percent_completed,
          aveCharCount: ave_char_count,
          maxCharCount: max_char_count,
          orgAveSentiment: organization_ave,
          nationalAveSentiment: national_ave,
          scoreFreqArray: score_freq_array,
          timeSeries: time_series,
          entityList: entities
        };
        
        clearInterval(interval);
        return res.send(results);
      }
    }, 1000);

    



  
  
  
  
  
};


