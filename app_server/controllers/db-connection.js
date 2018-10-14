var mysql = require('mysql');
var functions = {};

functions.connectToDB = function() {

  /* Set the connection mode
   * 1 : Google Cloud VM --> Google Cloud SQL (Production mode) 
   * 2 : Local Node.js --> Google Cloud SQL
   * 3 : Local Node.js --> Local MySQL
   */
  var CONNECTION_MODE = 3;
  
  var connection; // MySQL Connection object

  if (CONNECTION_MODE == 1) {
    var config = {
      user: process.env.SQL_USER,
      database: process.env.SQL_DATABASE,
      password: process.env.SQL_PASSWORD,
      multipleStatements: true
    };  
    if (process.env.INSTANCE_CONNECTION_NAME) {
      config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    }  
    connection = mysql.createConnection(config);
  } 
  else if (CONNECTION_MODE == 2) {
    connection = mysql.createConnection({
      host     : '127.0.0.1',
      user     : 'root',
      password : 'M2jquKgPuDsbM7kN',
      database : 'survey_data',
      multipleStatements: true
    });
  }
  else {
    connection = mysql.createConnection({
      host     : 'localhost',
      user     : 'root',
      password : 'Cyr331705',   
      database : 'survey_data',
      multipleStatements: true
    });
  }

  return connection;
};

module.exports = functions;