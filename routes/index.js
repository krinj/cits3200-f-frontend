require('dotenv').config();
var express = require('express');
var router = express.Router();
const mysql = require('mysql');

// Database Connection for Production

// let config = {
// 	user: process.env.SQL_USER,
// 	database: process.env.SQL_DATABASE,
// 	password: process.env.SQL_PASSWORD,
// };
//
// if (process.env.INSTANCE_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
// 	config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
// }
//
// let connection = mysql.createConnection(config);




/* GET home page. */
router.get('/', function(req, res, next) {

	// Database Connection for Development

	let connection = mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		database: process.env.DB_DATABASE,
		password: process.env.DB_PASS
	});

	connection.connect(function(err) {
		if (err) {
			console.error('Error connecting: ' + err.stack);
			return;
		}
		console.log('Connected as thread id: ' + connection.threadId);
	});

	connection.query("SELECT * FROM Entity LIMIT 5;",
		null,
		function (error, results, fields) {
			if (error) {
				console.log(error);
				throw error;
			}
			res.json(results);
		}
	);

	// res.render('index', { title: 'Express2', data: "data" });
});

module.exports = router;
