var dbConnection = require('./db-connection');

// LOAD/UPDATE THE PAGE WITH FILTERS SPECIFIED:
module.exports.loadResults = function (req, res) {
  
  var connection = dbConnection.connectToDB();
  console.log("getting in the load-reslut");
  const projectid = 'cits-3200';
  // Filter variables, set to values sent to this controller from client:
  //var questionNum = req.body.questionValue;
  var questionId = 'NLP_CONS';
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
  query[0]= "SELECT response FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '" + employStatus + "' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +"; ";


  // Query 3: National average overall sentiment score for the question
  query[1]= "SELECT AVG(overall_sentiment) AS overallAverage FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  // Query 4: Organisation's average overall sentiment score for the question
  query[2]= "SELECT AVG(overall_sentiment) AS organizationAverage FROM `cits-3200.analytics.responses_dev` R WHERE R.employment_status = '"+ employStatus +"' AND R.question_id = '"+ questionId +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" ;";

  // Query 5: First Date of responses for this question
  query[3]= "SELECT timestamp AS firstDate FROM `cits-3200.analytics.responses_dev` R  WHERE R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '" + questionId + "' ORDER BY firstDate ASC LIMIT 1;";

  
  // Query 6: Frequency count array of sentiment scores -10 to 10 (for Histogram by Score)
  query[4] = "SELECT overall_sentiment, count(*) as frequency FROM `cits-3200.analytics.responses_dev` R  WHERE R.employment_status = '"+ employStatus +"' AND R.survey_id ='d34f3eae8e9a48b6bc8c930bc5084b87' AND R.question_id = '"+ questionId +"' AND R.gender = '" + gender + "' AND R.timestamp BETWEEN '"+ startDate + "' AND '" + endDate +"' AND R.year_of_birth BETWEEN "+ birthStart + " AND "+ birthEnd +" GROUP BY overall_sentiment;";

  
  // Remove filters set to 'all' if applicable:
  
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
  var num_completed=0;
  var percent_completed;
  var ave_char_count;
  var max_char_count;
  var national_ave;
  var organization_ave;
  var first_date;
  var question_array = [];
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
      console.log('Rows:');
      
      if(queryIndex==0){
        for (i = 0; i < rows.length; i++) {
          question_array.push(rows[i]);
        }
        console.log(question_array);
      }

      else if (queryIndex ==1){
        num_responses = rows[0].totalResponse;
        console.log(num_responses);
      }
      
      else if(queryIndex ==2){
        var totalchar = 0;
        max_char_count=0;
        if(num_responses!=0){
        for(var i = 0;i < num_responses;i++){
          if(rows[i].response.length!=0){
            num_completed++;
          }
          totalchar += rows[i].response.length;
          
          if(rows[i].response.length > max_char_count){
            max_char_count = rows[i].response.length;
          }
        }
        console.log(num_completed);
        percent_completed = parseInt((num_completed / num_responses) * 100);
        ave_char_count = parseInt(totalchar/num_responses);
        console.log("Percent_completed"+percent_completed);
        console.log("average char count"+ ave_char_count);
      }else{
        max_char_count = 0;
        ave_char_count = 0;
      }
        
      }
      
      else if (queryIndex ==3){
        if(rows==[]){
          national_ave =0;
        }else{
        national_ave = rows[0].overallAverage*10;
        console.log("national ave" + national_ave);
        }
      }
      
      else if(queryIndex==4){
        if(rows==[]){
          organization_ave =0;
        }else{
        organization_ave = parseInt(rows[0].organizationAverage*10);
        }
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
       /*for(var j = 0;j<score_freq_array.length;j++){
         console.log(score_freq_array[j]);
       }*/
      }
    
      // [END bigquery_query]
    }

    setInterval(function(){
      if((question_array && first_date && num_responses && percent_completed && ave_char_count && max_char_count && organization_ave && national_ave && score_freq_array) ){
        var results = { 
          questionArray: question_array,
          
         
          firstDate: first_date.slice(0,10),
          numResponses: num_responses,
          percentCompleted: percent_completed,
          aveCharCount: ave_char_count,
          maxCharCount: max_char_count,
          orgAveSentiment: organization_ave,
          nationalAveSentiment: national_ave,
          scoreFreqArray: score_freq_array,
          // responseDetail: response_detail,
          //responseDate: response_date,
          //responseScore: response_score,
          //responseText: response_text,
        };
        for(attrib in results) {
          console.log("Attrib: " + attrib + " value: " + results[attrib]);
        }
        connection.end();
        return res.send(results);
      }
    }, 1000);

    



  
  
  
  
  
};


