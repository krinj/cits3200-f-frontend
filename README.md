# Sentiment Analytics: Front End
[![Build Status](https://travis-ci.org/krinj/nodejs-app.svg?branch=master)](https://travis-ci.org/krinj/nodejs-app)

## Overview of the Repository

This single page web application is Node.js web application. [Node.js](https://nodejs.org/en/) is a free, open-source, cross-platform JavaScript run-time environment built on Google Chrome's V8 JS engine. Node.js is commonly used to create web servers developed using JavaScript.

In particular, our application was initially built and structured using the Node.js package called Express. Express is primarily a server-side framework that takes a Model-View-Controller (MVC) form. In our case, we used Express but altered it by effectively placing the model on the client side and using jQuery AJAX functions to asynchronously send requests with data to the server-side controllers and get returned data that updates the client-side model.

The repository structure is outlined as follows:

```
|- app_server/
	|- controllers/
		|- db-connection.js  // contains the code to establish the connection with BigQuery.
		|					 // there are also other connection options for development and
		|					 // testing such as connecting to a Google Cloud SQL database or a
		|					 // local MySQL database. (can be ignored unless SQL is revisited)
		|- initial-render.js // initial rendering of static html content in
		|					 // sentiment-analytics.pug (see below)
		|- initial-queries.js	// runs the initial queries to retrieve the list of questions
		|						// for the survey, and the first and last dates of submissions
		|						// for that survey.
		|- load-results.js	// load results for the time-series, count of responses, dial, 
							// histogram and the entity search list. receives filter data from
							// client-side sentiment-analytics.cs.js, submits queries to
							// database, returns results back to the client-side.js
		|- entity-table-diagram.js	// fetches new data for the entity table and linkage
									// diagram based on user's interaction with the radio
									// buttons, search and clicking on the entity circles.
		|- response-details.js	// fetches response details (text, date) when a user clicks
								// on the columns of the histogram.
	|- routes/
		|- index.js	// provides routing to HTTP GET and POST requests to the above
					// controller files
	|- views/
		|- error.pug	// provides a client-side info. page in the event of server errors
		|- layout.pug	// provides the <head> of the HTML for the webpage. A layout.pug is
						// usually used as the common template for common header bars, footers,
						// navigation etc. across multiple pages on a node.js site; although
						// there is only one webpage in this app, layout.pug is still required
						// by Express.
		|- sentiment-analytics.pug	// generates the initial HTML content of the page
	|- bin/
		|- www	// sets up the web-server for this application, and its ports
	|- node-modules/	// all of the node modules this app depends on (git-ignored)
```

## Guide to Local Testing

1. To install Node.js on your local computer, go to https://nodejs.org/en/. Node.js comes bundled with npm, the Node.js Package Manager.

2. Once installed open the Node.js environment:

   - **Windows**: Open the Node.js Command Prompt application (should be available in Start > Programs > Node.js).
   - **Linux**: you can find Node.js in the developer menu.

3. Navigate to the folder in which you cloned/downloaded this repository (henceforth this folder will be
   represented by ~/) on your computer.

4. You will need to first install the dependencies of the application. These are "gitignored" because of their
   size and because they can be easily installed on the machine running the application. To install them, use
   the following command for after the command prompt ($):

   ```bash
   $ npm install
   ```

   This actually installs the packages listed in ` package.json` at the root of the application (~/). The packages
   will be installed in ~/node_modules.
   To start running the application (i.e. effectively you are starting to run a webserver on your machine), type:

   ```bash
   $ npm start
   ```

   The limitation of this command is that if you change any of your source code, you'll have to stop the
   webserver (Ctrl + C, then 'Y' at prompt) and restart it. Much more convenient is using a package called
   nodemon (i.e. node monitor) instead, which automatically restarts the application on code changes. To
   install the package 'globally' on your system (i.e. not just tied to this application) type

   ```bash
   # (the -g is for global)
   $ npm install -g nodemon
   ```

   Then run the webserver using `nodemon`:

   ```bash
   $ nodemon start
   ```

   To view/test the webpage, in your browser, go to http://localhost:3000/ which will take you to the 'homepage' of our website.

   See below section *About Node.js Express Applications* for more info about the folder structure within
   the application.

