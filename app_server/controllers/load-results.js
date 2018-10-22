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
  query[1]= "SELECT AVG(overall_sentiment) AS nationalAverage FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  // Query 4: Organisation's average overall sentiment score for the question
  query[2]= "SELECT AVG(overall_sentiment) AS organizationAverage FROM `cits-3200.analytics.responses_dev` R WHERE R.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  

  
  // Query 6: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query[3] = "SELECT overall_sentiment, count(*) as frequency FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" GROUP BY overall_sentiment ORDER BY overall_sentiment ASC;";

  // Query 4: Get overall sentiment time-series data:
  query[4] = "SELECT timestamp as ds, AVG(overall_sentiment) as avgOs FROM `cits-3200.analytics.responses_dev` R WHERE R.employment_status = '"+ employStatus +"' AND R.abn_hash = 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' AND R.question_id = '"+ questionId +"'  AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +"  Group BY ds order by ds;";  

  // Query 5: Get list of entities for entity search function
  query[5] = "SELECT DISTINCT entity.name as ent FROM `cits-3200.analytics.responses_dev` R WHERE R.entity.name IS NOT NULL AND R.question_id = '" + questionId + "' AND R.gender = '" + gender + "' AND R.employment_status = '" + employStatus + "' AND R.timestamp BETWEEN '" + startDate + "' AND '" + endDate + "' AND R.year_of_birth BETWEEN " + birthStart + " AND " + birthEnd + " ORDER BY ent;";


  // Remove filters set to 'all' if applicable:
  /*var queries2 = "";
  // Query 0: Total response count:
  queries2 += "SELECT COUNT(*) AS totalResponse FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.survey_id = 1 AND R.question_num = '" + questionNum + "' AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 1: Number of completed responses for this question:
  queries2 += "SELECT COUNT(*) AS completed FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '" + employStatus + "' AND R.survey_id = 1 AND R.question_num = '"+ questionNum +"' AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'; ";

  // Query 2: Average character count:
  queries2 +="SELECT AVG(char_count) AS AverageCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 3: Max character count
  queries2 += " SELECT MAX(char_count) AS maxCount FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 4: National average overall sentiment score for the question
  queries2 += "SELECT AVG(overall_sentiment) AS overallAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 5: Organisation's average overall sentiment score for the question
  queries2 += "SELECT AVG(overall_sentiment) AS organizationAverage FROM Response R NATURAL JOIN Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY question_num;";

  // Query 6: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  queries2 += "SELECT overall_sentiment, count(*) as frequency FROM Response R, Submission S WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"' GROUP BY overall_sentiment;";

  // Query 7: Get overall sentiment time-series data:
  queries2 += "SELECT date_submitted as ds, AVG(overall_sentiment) as avgOs FROM Submission S, Response R WHERE S.employment_status = '"+ employStatus +"' AND R.submission_id = S.submission_id AND R.question_num = '"+ questionNum +"' AND R.survey_id = 1 AND S.gender = '" + gender + "' AND R.char_count != 0 AND S.date_submitted BETWEEN '"+ startDate + "' AND '" + endDate +"' AND S.year_of_birth BETWEEN '"+ birthStart + "' AND '"+ birthEnd +"'  Group BY date_submitted order by date_submitted;";  

  // Query 8: Get list of entities for entity search function
  queries2 += "SELECT DISTINCT E.entity as ent FROM Submission S NATURAL JOIN Response R NATURAL JOIN Entity E WHERE E.entity IS NOT NULL AND question_num = " + questionNum + " AND S.gender = '" + gender + "' AND S.employment_status = '" + employStatus + "' AND S.date_submitted BETWEEN '" + startDate + "' AND '" + endDate + "' AND S.year_of_birth BETWEEN '" + birthStart + "' AND '" + birthEnd + "' ORDER BY E.entity;";

  */
















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
  var percent_completed = 0;
  var ave_char_count = 0;
  var max_char_count= 0;
  var national_ave;
  var organization_ave;
  var first_date;
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
      
      if(queryIndex == 5){
        console.log(sqlquery);
      }
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
        num_responses = rows[0].totalResponse;
        console.log("response num is :" + rows[0].totalResponse);
      }

      else if (queryIndex ==1){
       
        national_ave = rows[0].nationalAverage;
        console.log("average national score is " + national_ave);
      
      }
      
      else if(queryIndex ==2){
        organization_ave = rows[0].organizationAverage;
        console.log("organization average score is sdklfjlkdsjflkdsj " + organization_ave);
        
        
      
        
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
        console.log(rows);
       }
      
      else if (queryIndex == 5){
        first_date =rows[0].first_Date.value;
        console.log(first_date);
      }
      else if (queryIndex == 6){
        console.log(rows);
        
        var index = 0;
        var arrayIndex = 0;
         
        for (i = -10; i < 11; i++) {
         if (i != parseInt(rows[index].overall_sentiment*10)) {
           score_freq_array[arrayIndex] = 0;
           arrayIndex++;
          } else {
            score_freq_array[arrayIndex] = parseInt(rows[index].overall_sentiment*10)
  
           index++;
           if (index == rows.length) {
              index--;
            }
           arrayIndex++;
         }
       }
       
      }
    
      
    }

    
    var results;
    var interval = setInterval(function() {
      if((num_responses && percent_completed && ave_char_count&&max_char_count&& organization_ave && national_ave && score_freq_array && time_series && entities) ){
        
       
          results = {
          numResponses: num_responses,
          
          percentCompleted: percent_completed,
          aveCharCount: ave_char_count,
          maxCharCount: max_char_count,
          orgAveSentiment: organisation_ave,
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


