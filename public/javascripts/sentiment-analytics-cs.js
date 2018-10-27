/*
 * Client-Side (cs) script for the Sentiment Analytics webpage.
 */

// JQUERY FUNCTIONS
(function($) {

  /*** GLOBAL VARIABLES / 'MODEL' VARIABLES 
   * (Use capital first letter for globals, all caps for constants): ***/

  // Sentiment colour scale end a middle points:
  var RED_COLOUR = [204, 69, 40];
  var GREY_COLOUR = [188, 191, 191];
  var GREEN_COLOUR = [52, 143, 104];

  var DEFAULT_FONT = "'Roboto Condensed', sans-serif";
  var DEFAULT_FONT_COLOUR = 'rgb(109, 109, 109)';
  var CHART_FONT_SIZE = 14; // NB: this gets reduced slightly in the canvas

  var NUM_ENTITIES = 30; // (Max) number of entities to display in Entity Table & Diagram

  // *** TODO: Server should POST the logged in user's organisation name ***
  // var OrgABNhash; 

  // *** TESTING: High level filters
  var OrgNames = []; 
  // var OrgABNs = [];
  var OrgABNhashes = [];
  var SurveyNames = [];
  var SurveyIDs = [];  
  var OrgABNhash; // selected organisation's ABN hash
  var SurveyID; // selected survey's ID
  
  // Filter option sets:
  var QuestionWordings = [];
  var QuestionIDs = [];
  var EmployStatuses = [];
  var GenderOptions = [];
  
  // Active filter variables:
  var QuestionID;
  var Gender;
  var AgeRange;
  var EmployStatus;
  var StartDate;
  var EndDate;
  var FirstDate;
  var LastDate;

  // Filter result variables:
  var NumResponses;
  // var NationalAveSentiment;
  var OrgAveSentiment;
  var HistogramScoreFreqs = [];  
  
  // Time Series variables:
  var WeekAveX = [];  // weekly dates
  var WeekAveY = [];  // weekly average sentiment scores

  // Histogram selected response variables:
  var ResponseScore;
  var IndexOfResponse = 0;
  var ResponseInfo;
  var NoHistColSelected = true;

  // Entity Listing/Diagram variables:
  var EntityDisplayMode = "topFreq";
  var NumDisplayedEnts; // can be less than NUM_ENTITIES in focus display mode
  var DisplayedEntities = [];
  var ConcurrencyMatrix = [];
  var LinkedEntities = [];  // set of entities linked to the focus entity
  var FocusEntity = new Entity(null, null, null, null, null);

  // Constructor for Entity objects
  function Entity(rank, name, freq, aveSentiment, linkFreq) {
    this.rank = rank;
    this.name = name;
    this.freq = freq;
    this.aveSentiment = aveSentiment;
    this.linkFreq = linkFreq;
  }

  window.onload = function() {

    // Get logged in user's organisation's ABN hash
    // OrgABNhash = document.getElementById("orgABNhash").innerText;

    getOrgsAndSurveys();

    /************************** ESTABLISH EVENT LISTENERS ****************************/

    // TESTING ONLY ***
    document.getElementById("orgList").addEventListener('change', function () {
      OrgABNhash = document.getElementById("orgList").value;      
      runInitialQueries();      
    });
    document.getElementById("surveyList").addEventListener('change', function () {
      SurveyID = document.getElementById("surveyList").value;      
      runInitialQueries();      
    });

    document.getElementById("questionList").addEventListener('change', function () {
      QuestionID = document.getElementById("questionList").value;      
      loadResults();      
    });

    document.getElementById("gender").addEventListener('change', function () {
      Gender = document.getElementById("gender").value;      
      loadResults();      
    });

    document.getElementById("ageRange").addEventListener('change', function () {
      AgeRange = document.getElementById("ageRange").value;      
      loadResults();      
    });

    document.getElementById("employStatus").addEventListener('change', function () {
      EmployStatus = document.getElementById("employStatus").value;      
      loadResults();      
    });

    document.getElementById("startDateBox").addEventListener('change', function () {
      StartDate = new Date(document.getElementById("startDateBox").valueAsDate);  
      // Don't need to re-fetch data, only re-render it based on new date range  
      loadResults(); 
    });

    document.getElementById("endDateBox").addEventListener('change', function () {
      EndDate = new Date(document.getElementById("endDateBox").valueAsDate);
      // Don't need to re-fetch data, only re-render it based on new date range  
      loadResults(); 
    });

    // When resetting filters, reset start date and end date to overall range start and range end:
    document.getElementById('resetFilters').addEventListener('click', function() {
      document.getElementById("gender").value = 'all';
      document.getElementById("ageRange").value = 'all';
      document.getElementById("employStatus").value = 'all';
      document.getElementById('startDateBox').valueAsDate = FirstDate;
      document.getElementById('endDateBox').valueAsDate = LastDate;

      Gender = 'all';
      AgeRange = 'all';
      EmployStatus = 'all';
      StartDate = FirstDate;
      EndDate = LastDate;
      
      // Reset the handles on the date slider:
      var startDateObj = FirstDate;
      var endDateObj = LastDate;
      var slider = document.getElementById('dateSlider');
      slider.noUiSlider.set([startDateObj.getTime(), endDateObj.getTime()]);
      loadResults();
    });

    // Sets the entity display mode by clicking on the relevant radio button
    $(document).on('click', '[name="dispModeRadio"]', function () {
      if($(this).val() == "topFreq") EntityDisplayMode = "topFreq";
      else if($(this).val() == "mostPos") EntityDisplayMode = "mostPos";
      else if($(this).val() == "mostNeg") EntityDisplayMode = "mostNeg";
      else EntityDisplayMode = "focus";
      getEntityTableDiagData();
    });

    // Add event listener to searched entity box:
    document.getElementById('searchedEntity').addEventListener('change', function() {  
      FocusEntity.name = document.getElementById("searchedEntity").value;
      EntityDisplayMode = "focus";
      document.getElementById('focusRadio').checked = true;
      getEntityTableDiagData();
    });

  };

  // *** FOR TESTING ONLY ***
  // jQuery AJAX function to get organisation and survey data from the database
  function getOrgsAndSurveys() {
    $.ajax({
      url: "/get-orgs-and-surveys",   
      // i.e. [Nodejs app]/app_server/controllers/get-orgs-and-surveys.js
      data: {}, // data to send to controller
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from controller
        SurveyNames = data.surveyNames,
        SurveyIDs = data.surveyIDs,
        OrgNames = data.orgNames,
        OrgABNs = data.orgABNs, 
        OrgABNhashes = data.orgABNhashes,

        fillDropDown(OrgABNhashes, OrgNames, "orgList", true);
        fillDropDown(SurveyIDs, SurveyNames, "surveyList", false);

        OrgABNhash = 'all'; // all organisations for the survey
        SurveyID = SurveyIDs[0]; // choose first in list

        document.getElementById("orgList").value = OrgABNhash;
        document.getElementById("surveyList").value = SurveyID;

        runInitialQueries();
      },
      error: function (data) {
        console.log("Could not fetch organisation and survey id data.");
      }
    });
  }

  function fillDropDown(valueArray, textArray, selectDOM, inclAll) {
    var html = "";
    if (inclAll) {
      html += "<option value='all'>ALL</option>";
    }
    for (var i = 0; i < textArray.length; i++) {
      html += "<option value='" + valueArray[i] + "'>" + textArray[i] + "</option>";
    }
    document.getElementById(selectDOM).innerHTML = html;
  }

  // jQuery AJAX function to fetch and load results from the database
  function runInitialQueries() {
    $.ajax({
      url: "/initial-queries",   
      // i.e. [Nodejs app]/app_server/controllers/initial-queries.js
      data: { // data to send to controller
        "orgABNhash" : OrgABNhash,
        "surveyID" : SurveyID,
      },
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from SQL via controller
        QuestionWordings = data.questionWordings;
        QuestionIDs = data.questionIDs;
        GenderOptions = data.genderOptions;
        EmployStatuses = data.employmentStatuses;
        FirstDate = new Date(data.firstDate.slice(0,10));
        LastDate = new Date(data.lastDate.slice(0,10));
        StartDate = FirstDate;
        EndDate = LastDate;

        fillDropDowns();
        setOverallDates();
        renderDateSlider();
        loadResults();
      },
      error: function (data) {
        console.log("Could not fetch results of initial queries.");
      }
    });
  }

  // Populate the filter drop downs:
  function fillDropDowns() {

    fillDropDown(QuestionIDs, QuestionWordings, "questionList", false);
    fillDropDown(EmployStatuses, EmployStatuses, "employStatus", true);
    fillDropDown(GenderOptions, GenderOptions, "gender", true);
    
    // Set initial filter values:    
    QuestionID = QuestionIDs[0];
    Gender = 'all';
    AgeRange = 'all';
    EmployStatus = 'all';

    // Initialise the elements in the DOM accordingly:    
    document.getElementById("questionList").value = QuestionID;
    document.getElementById("gender").value = Gender;
    document.getElementById("ageRange").value = AgeRange;
    document.getElementById("employStatus").value = EmployStatus;    
  }

  // Set full survey history date range limits 
  function setOverallDates() {    
    document.getElementById("startDateBox").valueAsDate = StartDate;
    document.getElementById("endDateBox").valueAsDate = EndDate;
    var firstDay = FirstDate.getDate();
    var firstMonth = FirstDate.getMonth();
    var firstYear = FirstDate.getFullYear();
    document.getElementById('firstDateSpan').innerHTML = padZero(firstDay) + '/' + padZero(firstMonth + 1) + "/" + firstYear;
    var lastDay = LastDate.getDate();
    var lastMonth = LastDate.getMonth();
    var lastYear = LastDate.getFullYear();
    document.getElementById('lastDateSpan').innerHTML = padZero(lastDay) + '/' + padZero(lastMonth + 1) + "/" + lastYear;
  }

  function renderDateSlider() {

    // Overall date range for slider
    // (remains fixed even if filter range sliders/boxes is changed by the user)
    var rangeStart = FirstDate;
    var rangeEnd = LastDate;

    document.getElementById('startDateBox').valueAsDate = StartDate;
    document.getElementById('endDateBox').valueAsDate = EndDate;

    var rangeStart_ms = rangeStart.getTime();
    var rangeEnd_ms = rangeEnd.getTime();
    var startDate_ms = StartDate.getTime();
    var endDate_ms = EndDate.getTime();

    var sliderContDOM = document.getElementById('dateSliderContainer');
    sliderContDOM.innerHTML = "<div id='dateSlider'></div>"; 
    var sliderDOM = document.getElementById('dateSlider');

    noUiSlider.create(sliderDOM, {
      connect: [false, true, false], // shades regions between handles
      range: {
          min: rangeStart_ms,
          max: rangeEnd_ms
      },

      // Steps of one day
      step: 1 * 24 * 60 * 60 * 1000,

      // Two more timestamps indicate the handle starting positions.
      start: [startDate_ms, endDate_ms]
    });

    var dateValues = [
      document.getElementById('startDateBox'),
      document.getElementById('endDateBox')
    ];

    sliderDOM.noUiSlider.on('change', function (values, handle) {
      dateValues[handle].valueAsDate = new Date(+values[handle]);
      StartDate = new Date(document.getElementById("startDateBox").valueAsDate);
      EndDate = new Date(document.getElementById("endDateBox").valueAsDate);  
      loadResults();
    });
  }

  // jQuery AJAX function to fetch and load results from the database
  function loadResults() {
    $.ajax({
      url: "/load-results",   // i.e. [Nodejs app]/app_server/controllers/load-results.js
      data: { // data to send to load-results.js controller
        "orgABNhash" : OrgABNhash,
        "surveyID" : SurveyID,
        "questionID" : QuestionID,
        "gender" : Gender,
        "ageRange" : AgeRange,
        "employStatus" : EmployStatus,
        "startDate" : toYYYY_MM_DD(StartDate),
        "endDate" : toYYYY_MM_DD(EndDate)
      },
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from SQL via controller
        NumResponses = data.numResponses;
        document.getElementById("tooFewResponsesP").style.display = "none";
        document.getElementById("tooFewResponses").style.display = "none";
        document.getElementById("tooFewResponses").innerText = "";
        if (NumResponses < 5) {
          console.log("showing too few error message")
          document.getElementById("tooFewResponsesP").style.display = "block";
          document.getElementById("tooFewResponses").style.display = "inline";
          document.getElementById("tooFewResponses").innerText = "The selected filter configuration would return less than 5 responses, which may affect the privacy of the respondents. Please select another filter configuration.";
        } 
        else {
          OrgAveSentiment = data.orgAveSentiment;
          // NationalAveSentiment = data.nationalAveSentiment;
          HistogramScoreFreqs = data.scoreFreqArray;
  
          // Initialise/clear data for time-series:
          var timeSeriesX = [];
          var timeSeriesY = [];
          WeekAveX = [];
          WeekAveY = [];
  
          var timeSeries = data.timeSeries;
          for (i = 0; i < timeSeries.length; i++) {
            timeSeriesX.push(timeSeries[i].ds.value.slice(0, 10));
            timeSeriesY.push(timeSeries[i].avgOs*10);
          }
          for (i = 0; i < timeSeries.length; i += 4) {
            WeekAveY.push(Math.round(((timeSeriesY[i] + timeSeriesY[i + 1] + timeSeriesY[i + 2] + timeSeriesY[i + 3]) / 4)*10)/10);
            WeekAveX.push(timeSeriesX[i]);
          }
  
          // Populate the entity list for search:
          var entities = data.entityList;
          var html = "";
          for (i = 0; i < entities.length; i++) {
            html += "<option value='" + entities[i].ent + "'>";
          }
          document.getElementById("fullEntityList").innerHTML = html;
  
          document.getElementById("numResponses").innerText = "" + NumResponses + " responses";
  
          renderFocusTimeSeries();
          renderFullTimeSeries();
          renderAveSentimentDial();
          renderHistogramByScore();
          fillResponseDetails();
          getEntityTableDiagData();
        }
      },
      error: function (data) {
        console.log("Could not load results data.");
      }
    });
  }

  // Convert a JavaScript Date object to a string of form YYYY-MM-DD e.g. 2018-01-27
  function toYYYY_MM_DD(dateObj) {
    return "" +  dateObj.getFullYear() + "-" + padZero((dateObj.getMonth() + 1)) + "-" + padZero(dateObj.getDate());
  }

  // Add a padding zero to the string if the number contained is less than 10
  // (used for to ensure day and month date values have two digits, e.g. 2018-01-07)
  function padZero(integer) {
    var paddedString = "";
    if(integer < 10) {
      paddedString += "0" + integer;
    } else {
      paddedString += integer;
    }
    return paddedString;
  }

  function renderFocusTimeSeries() {

    var yourOrgData = [];
    for (i = 0; i < WeekAveX.length; i++) {
      var thisTime = new Date(WeekAveX[i]).getTime();  
      if (thisTime > StartDate.getTime() && thisTime < EndDate.getTime()) {
        yourOrgData.push({
          x: WeekAveX[i],
          y: WeekAveY[i],
        });
      }
    }
    
    var yourOrgSeries = {
      label: 'Your Organisation',
      borderColor: 'gold',
      borderWidth: 2,
      pointRadius: 2,
      pointBorderColor: 'gold',
      pointBackgroundColor: 'gold',
      fill: false,
      data: yourOrgData
    };
    
    // (Re-)create canvas DOM element
    // (otherwise duplicate canvases will form on fetching new results)
    var canvasContDOM = document.getElementById("focusTimeSeriesCont");
    var html = "<canvas id='focusTimeSeriesCanvas'>";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("focusTimeSeriesCanvas");

    var context = canvasDOM.getContext('2d');
    var chart = new Chart(context, {
      type: 'line',
      data: { datasets: [yourOrgSeries] },
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            type: 'time',
            time: {
              displayFormats: {
                quarter: 'MMM YYYY'
              },
              min: StartDate,
              max: EndDate,              
            },
            ticks: { 
              fontSize: CHART_FONT_SIZE,
              fontColor: DEFAULT_FONT_COLOUR,
              fontFamily: DEFAULT_FONT,
            },
          }],
          yAxes: [{
            ticks: {
              min: -10,
              max: 10,
              stepSize: 5,
              fontSize: CHART_FONT_SIZE,
              fontColor: DEFAULT_FONT_COLOUR,
              fontFamily: DEFAULT_FONT,
            },
          }],
        },
        title: { display: false },
        legend: { display: false },
        layout: {
          padding: {
            left: 0,
            right: 0,
            bottom: 0,
            top: 0
          }
        },
        tooltips: { enabled: true }
      }
    });
  }

  function renderFullTimeSeries() {

    var yourOrgData = [];
    for (i = 0; i < WeekAveX.length; i++) {
      yourOrgData.push({
        x: WeekAveX[i],
        y: WeekAveY[i],
      });
    }
    
    var yourOrgSeries = {
      label: 'Your Organisation',
      borderColor: 'gold',
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      data: yourOrgData
    };

    var leftTopExclusionData = [];
    var leftBotExclusionData = [];
    var rightTopExclusionData = [];
    var rightBotExclusionData = [];
    for (i = 0; i < WeekAveX.length; i++) {
      var thisTime = new Date(WeekAveX[i]).getTime();  
      if (thisTime < StartDate.getTime()) {
        leftTopExclusionData.push({
          x: WeekAveX[i],
          y: 10,
        });
        leftBotExclusionData.push({
          x: WeekAveX[i],
          y: -10,
        });
      }
      else if (thisTime > EndDate.getTime()) {
        rightTopExclusionData.push({
          x: WeekAveX[i],
          y: 10,
        });
        rightBotExclusionData.push({
          x: WeekAveX[i],
          y: -10,
        });
      }
    }    

    var leftTopExclusionSeries = {
      borderColor: "gray",
      borderWidth: 1,
      pointRadius: 0,
      data: leftTopExclusionData
    };
    var leftBotExclusionSeries = {
      borderColor: "gray",
      borderWidth: 1,
      pointRadius: 0,
      data: leftBotExclusionData
    };
    var rightTopExclusionSeries = {
      borderColor: "gray",
      borderWidth: 1,
      pointRadius: 0,
      data: rightTopExclusionData
    };
    var rightBotExclusionSeries = {
      borderColor: "gray",
      borderWidth: 1,
      pointRadius: 0,
      data: rightBotExclusionData
    };
   
    // (Re-)create canvas DOM element
    // (otherwise duplicate canvases will form on fetching new results)
    var canvasContDOM = document.getElementById("fullTimeSeriesCont");
    var html = "<canvas id='fullTimeSeriesCanvas'>";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("fullTimeSeriesCanvas");

    var context = canvasDOM.getContext('2d');
    var chart = new Chart(context, {
      type: 'line',
      data: { datasets: [yourOrgSeries, leftTopExclusionSeries, leftBotExclusionSeries, rightTopExclusionSeries, rightBotExclusionSeries] },
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            type: 'time',
            time: {
              displayFormats: {
                quarter: 'MMM YYYY'
              },
              min: FirstDate,
              max: LastDate,              
            },
            ticks: { 
              fontSize: CHART_FONT_SIZE,
              fontColor: DEFAULT_FONT_COLOUR,
              fontFamily: DEFAULT_FONT,
            },
          }],
          yAxes: [{
            ticks: {
              min: -10,
              max: 10,
              stepSize: 10,
              fontSize: CHART_FONT_SIZE,
              fontColor: DEFAULT_FONT_COLOUR,
              fontFamily: DEFAULT_FONT,
            },
          }],
        },
        title: {
          display: false
        },
        legend: {
          display: false,
        },
        layout: {
          padding: {
            left: 0,
            right: 0,
            bottom: 0,
            top: 5
          }
        },
        tooltips: { enabled: false},
        animation: { duration: 0 },
        hover: { animationDuration: 0 },
        responsiveAnimationDuration: 0, 
      }
    });
  }

  function renderAveSentimentDial() {

    var canvasWidth = 300;   
    var canvasHeight = 158;   
    var needleRadius = 108;

    var canvasContainerDOM = document.getElementById("dialCanvasContainer");
    var html = "<canvas id='dialCanvas' width='" + canvasWidth + "' height='" + canvasHeight + "' >";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContainerDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("dialCanvas");
    var ctx = canvasDOM.getContext("2d");
    var img = document.getElementById("dialImg");

    var angle = ((10 - OrgAveSentiment) * Math.PI) / 20;
    var needleBaseX = canvasWidth / 2 - 5;
    var needleBaseY = canvasHeight - 3;
    var needleTipX = needleBaseX + needleRadius * Math.cos(angle);
    var needleTipY = needleBaseY - needleRadius * Math.sin(angle);

    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(needleBaseX, needleBaseY);
    ctx.lineTo(needleTipX, needleTipY);
    ctx.scale(5, 5);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    var scoreRounded = Math.round(OrgAveSentiment * 10) / 10;
    var scoreString = "";
    if (scoreRounded > 0) {
      scoreString = "+ " + scoreRounded; 
    } else if (scoreRounded == 0) {
      scoreString = scoreRounded;
    } else {
      scoreString = "- " + scoreRounded *-1;
    }
    document.getElementById('aveSentimentSpan').innerHTML = scoreString;
  }

  function renderHistogramByScore () {

    // (Re-)create canvas DOM element:
    // (otherwise duplicate overlaying canvases will form on fetching new results)
    var canvasContainerDOM = document.getElementById("histogramByScoreContainer");
    var html = "<canvas id='histogramByScoreCanvas'>";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContainerDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("histogramByScoreCanvas");

    var ctx = canvasDOM.getContext('2d');
    var xData = [];
    var yData = [];
    var fillColor = [];
    var tiers = 20;

    // Populate data and bar colours
    for (var i = 0; i < tiers + 1; i++) {
      xData.push(i - tiers/2);
      yData.push(HistogramScoreFreqs[i]);
      fillColor.push(getColor(i/tiers));
    }

    var data = {
      labels: xData,
      datasets: [{
        fill: true,
        backgroundColor: fillColor,
        data: yData,          
      }]
    };

    var histogramChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        defaultFontFamily: Chart.defaults.global.defaultFontFamily = DEFAULT_FONT,
        defaultFontColor: Chart.defaults.global.defaultFontColor = DEFAULT_FONT_COLOUR,
        defaultFontSize: Chart.defaults.global.defaultFontSize = CHART_FONT_SIZE,
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Response Frequency"
            },
            ticks: {
              beginAtZero: true
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Sentiment Score"
            },
            barPercentage: 0.9,
            categoryPercentage: 1.0
          }]
        },
        tooltips: {
          enabled: false,
          custom: function (tooltipModel) {
            // Tooltip Element
            var tooltipEl = document.getElementById('chartjs-tooltip');

            // Create element on first render
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              tooltipEl.innerHTML = "<table></table>";
              document.body.appendChild(tooltipEl);
            }

            // Hide if no tooltip
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = 0;
              return;
            }

            // Set caret Position
            tooltipEl.classList.remove('above', 'below', 'no-transform');
            if (tooltipModel.yAlign) {
              tooltipEl.classList.add(tooltipModel.yAlign);
            } else {
              tooltipEl.classList.add('no-transform');
            }

            function getBody(bodyItem) {
              return bodyItem.lines;
            }

            // Set Text
            if (tooltipModel.body) {
              var titleLines = tooltipModel.title || [];
              var bodyLines = tooltipModel.body.map(getBody);
              var innerHtml = '<thead>';
              innerHtml += 'Click me';
              var tableRoot = tooltipEl.querySelector('table');
              tableRoot.innerHTML = innerHtml;
            }

            // 'this' will be the overall tooltip
            var position = this._chart.canvas.getBoundingClientRect();

            // Display, position, and set styles for font
            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
            tooltipEl.style.fontFamily = tooltipModel._bodyFontFamily;
            tooltipEl.style.fontSize = tooltipModel.bodyFontSize + 'px';
            tooltipEl.style.fontStyle = tooltipModel._bodyFontStyle;
            tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.backgroundColor = '#F9EAC7';
          }
        }
      }
    });

    // this was canvasDOM.onclick , Jc changed to
    var previousClickedBar = -1;

    canvasDOM.onclick = function (event) {
      NoHistColSelected = false;
      var activeElement = histogramChart.getElementAtEvent(event)[0];
      ResponseScore = histogramChart.data.labels[activeElement._index];
      if (ResponseScore != previousClickedBar) {
        IndexOfResponse = 0;
        previousClickedBar = ResponseScore;
        $.ajax({
          url: "/response-details",
          // i.e. [Nodejs app]/app_server/controllers/response-details.js
          data: { // data to send to controller
            "orgABNhash" : OrgABNhash,
            "surveyID" : SurveyID,
            "questionID" : QuestionID,
            "gender": Gender,
            "ageRange": AgeRange,
            "employStatus": EmployStatus,
            "startDate": toYYYY_MM_DD(StartDate),
            "endDate": toYYYY_MM_DD(EndDate),
            "score": previousClickedBar
          },
          method: "POST",
          dataType: 'JSON',
          success: function (data) {
            ResponseInfo = data.responseResult;
            fillResponseDetails();
          },
          error: function (data) {
            console.log("Could not fetch response details for histogram.");
          }
        });
      } else {
        //histogramChart.data.datasets[0].backgroundColor = fillColor;
        nextResponse();
      }
    };    
  }
  
  function nextResponse() {  
    if (IndexOfResponse == ResponseInfo.length - 1) {
      return;
    }
    IndexOfResponse++;
    fillResponseDetails();
  }

  function fillResponseDetails() {
    if (NoHistColSelected) {
      document.getElementById('responseMetadata').style.visibility = "hidden";
      document.getElementById('responseText').innerText = "<-- Click on the bars to explore responses.";
      return;
    } else {
      document.getElementById('responseMetadata').style.visibility = "visible";
      var text = "Response: " + (IndexOfResponse + 1) + " of " + ResponseInfo.length
      document.getElementById('responseIndex').innerText = text;
      var date = ResponseInfo[IndexOfResponse].submitDate.value.slice(0, 10);
      document.getElementById('responseDate').innerText = "Date: " + date;
      document.getElementById('responseText').innerText = '"' + ResponseInfo[IndexOfResponse].responseDetail + '"';

    }

  }

  // Render the Entity Table and Linkage Diagram for a given set of filters, display mode 
  // and/or selected entity
  function getEntityTableDiagData() {

    $.ajax({
      url: "/entity-table-diagram",   
      // i.e. [Nodejs app]/app_server/controllers/entity-table-diagram.js
      data: { // data to send to controller
        "orgABNhash" : OrgABNhash,
        "surveyID" : SurveyID,
        "questionID" : QuestionID,
        "gender" : Gender,
        "ageRange" : AgeRange,
        "employStatus" : EmployStatus,
        "startDate" : toYYYY_MM_DD(StartDate),
        "endDate" : toYYYY_MM_DD(EndDate),
        "displayMode" : EntityDisplayMode,
        "numEntities" : NUM_ENTITIES,
      },
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from SQL via controller

        DisplayedEntities = []; // reset 
        
        if(EntityDisplayMode == "focus") {

          // Get attributes of focus entity:
          for (i = 0; i < data.entities1.length; i++) {
            if (data.entities1[i] == FocusEntity.name) {
              FocusEntity.freq = data.frequencies[i];
              FocusEntity.aveSentiment = Math.round(data.aveSentiments[i] * 10) / 10;
            }
          }

          // Build the LinkedEntities array of Entity objects:
          LinkedEntities = []; // reset
          var prevID;
          var groupedEntNames = []; // names of group of entities with the same response id
          var hasFocusEntity = false; // boolean for if group includes the focus entity
          for (i = 0; i < data.responseIDs.length; i++) { // iterate down response-entity table
            var thisID = data.responseIDs[i];
            var thisName = data.entities2[i];

            // If have come to the end of rows with the same id:
            if (thisID != prevID) {
              if (hasFocusEntity) {
                for (j = 0; j < groupedEntNames.length; j++) {
                  
                  // Update the link count of the entity in the group, 
                  // if already in LinkedEntities:
                  var entityInLinkedSet = false;
                  if(LinkedEntities) { // if there is at least 1 entity in Linked set
                    for (k = 0; k < LinkedEntities.length; k++) {
                      if(groupedEntNames[j] == LinkedEntities[k].name) {
                        LinkedEntities[k].linkFreq++;
                        entityInLinkedSet = true;
                      }
                    }
                  }

                  // If not in LinkedEntities, and not the focus entity, 
                  // add this entity to LinkedEntities:
                  if(!entityInLinkedSet && groupedEntNames[j] != FocusEntity.name) {
                    var thisFreq;
                    var thisAveSentiment;
                    for (k = 0; k < data.entities1.length; k++) {
                      if (data.entities1[k] == groupedEntNames[j]) {
                        thisFreq = data.frequencies[k];                  
                        if (isNaN(data.aveSentiments[k])) {
                          thisAveSentiment = 0;
                        } else {
                          thisAveSentiment = Math.round(data.aveSentiments[k] * 10) / 10;
                        }
                      }
                    }
                    LinkedEntities.push(new Entity(null, groupedEntNames[j], thisFreq, thisAveSentiment, 1));
                  }       
                }
              }
              groupedEntNames = []; // clear the array 
              hasFocusEntity = false;
            } 

            if (thisName == FocusEntity.name) {
              hasFocusEntity = true; 
            } else {
              var alreadyInGroup = false;
              for (j = 0; j < groupedEntNames.length; j++) {
                if (groupedEntNames[j] == thisName) alreadyInGroup = true;
              }
              if (!alreadyInGroup) groupedEntNames.push(thisName);
            }

            prevID = thisID; // prepare for next row / iteration of table     
          }  
          
          // Sort the linked entities by link frequency:
          var tuples = []; // a set of [entityName, linkFreq] tuples for sorting
          for(i = 0; i < LinkedEntities.length; i++) {
            tuples.push([LinkedEntities[i].name, LinkedEntities[i].linkFreq]);
          }
          tuples.sort(compareLinkFreqs);
          
          // Only display the linked entities with the highest link frequencies: 
          NumDisplayedEnts = Math.min(NUM_ENTITIES, LinkedEntities.length);
          for (i = 0; i < NumDisplayedEnts; i++) {
            var name = tuples[i][0];
            var linkFreq = tuples[i][1];
            var freq;
            var aveSentiment;
            for (j = 0; j < LinkedEntities.length; j++) {
              if (LinkedEntities[j].name == name) {
                freq = LinkedEntities[j].freq;
                aveSentiment = LinkedEntities[j].aveSentiment;
              }
            }
            DisplayedEntities.push(new Entity(i, name, freq, aveSentiment, linkFreq));
          }
        }

        else {  // i.e. for all other entity display modes

          // Populate array of Entity objects
          for (i = 0; i < data.entities1.length; i++) {
            var aveSent = (isNaN(data.aveSentiments[i])) ? 0 : data.aveSentiments[i];
            DisplayedEntities.push(new Entity(i, data.entities1[i], data.frequencies[i], Math.round(aveSent * 10) / 10, null)); 
          }

          NumDisplayedEnts = Math.min(NUM_ENTITIES, DisplayedEntities.length);

          // (Re-)Initialise the concurrency matrix:
          ConcurrencyMatrix = [];
          for (i = 0; i < NumDisplayedEnts; i++) {
            ConcurrencyMatrix.push(new Array());
            for (j = 0; j < NumDisplayedEnts; j++) {
              ConcurrencyMatrix[i][j] = 0;
            }
          }        
          
          // Build the concurrency matrix:
          var prevID = -1;
          var groupedEntRanks = []; // ranks of group of entities with the same response id
          for (i = 0; i < data.responseIDs.length; i++) {  
            var thisID = data.responseIDs[i];
            var thisName = data.entities2[i];
            var thisRank = -1;
            for (j = 0; j < DisplayedEntities.length; j++) {
              if (DisplayedEntities[j].name == thisName) {
                thisRank = DisplayedEntities[j].rank;
              }
            }
            
            // If have come to the end of rows with the same id:
            if (thisID != prevID) {
              if (groupedEntRanks.length > 0) {
                // Examine each entity against each other entity in the group 
                for (j = 0; j < groupedEntRanks.length; j++) {
                  for (k = 0; k < groupedEntRanks.length; k++) {
                    if (groupedEntRanks[j] < groupedEntRanks[k]) {
                      ConcurrencyMatrix[groupedEntRanks[j]][groupedEntRanks[k]]++;
                    }
                  }
                }
              }
              groupedEntRanks = []; // clear the array            
            }    

            // Check whether entity is already in group 
            // (i.e. same word appearing twice in a particular response)
            // if not, add its rank to the group
            var alreadyInGroup = false;
            for (j = 0; j < groupedEntRanks.length; j++) {
              if (groupedEntRanks[j] == thisRank) alreadyInGroup = true;
            }
            if (!alreadyInGroup && thisRank >= 0) groupedEntRanks.push(thisRank);

            prevID = thisID;        
          }
        }

        // console.log("Concurrency matrix:")
        // var thisRow;
        // for (i = 0; i < NumDisplayedEnts; i++) {
        //   thisRow = "";
        //   for (j = 0; j < NumDisplayedEnts; j++) {
        //     thisRow += ConcurrencyMatrix[i][j] + " ";
        //   }
        //   console.log(thisRow);
        // }        

        fillEntityTable();
        drawEntityDiagram();        
      },
      error: function (data) {
        console.log("Could not get data for entity table and diagram.");
      }
    });
  }

  /* Comparator for sorting [entityName, linkFreq] tuples by linkFreq 
   * (i.e. link frequency with focus entity) in descending order
   * param a - [entityName, linkFreq] tuple
   * param b - [entityName, linkFreq] tuple
   * Returns - the difference D = (b's linkFreq) - (a's linkFreq):
   *           if D > 0, sort b above a
   *           if D = 0, no action
   *           if D < 0, sort a above b
   */
  function compareLinkFreqs(a, b) {
    return b[1] - a[1];
  }   

  function fillEntityTable() {
    var html = "";
    for(i = 0; i < NumDisplayedEnts; i++) {
      html += "<tr>";
      html += "<td class='keywords'>" + DisplayedEntities[i].name + "</td>";
      html += "<td>" + DisplayedEntities[i].freq + "</td>";
      html += "<td>" + padPointZero(DisplayedEntities[i].aveSentiment) + "</td>";
      html += "</tr>";
    }
    document.getElementById('entityTableBody').innerHTML = html;
  }

  function drawEntityDiagram() {

    var svgDOM = document.getElementById('entitySvg'); 
    svgDOM.innerHTML = "";

    // find the heighest frequency of the displayed entities:
    var maxFreq = 0;
    for (i = 0; i < NumDisplayedEnts; i++) {
      if (DisplayedEntities[i].freq > maxFreq) {
        maxFreq = DisplayedEntities[i].freq;
      }
    }

    var SVG_WIDTH = 800; 
    var SVG_HEIGHT = 800; 
    var centre_x = SVG_WIDTH / 2;
    var centre_y = SVG_HEIGHT / 2;
    var orbitRadius = SVG_HEIGHT / 2 - 160;
    var maxEntRadius = 0.45 * Math.PI * orbitRadius * 2 / NUM_ENTITIES;
    var MIN_ENT_RADIUS = 5;
    var ENT_LABEL_FONTSIZE = 11; // font size in pixels/points of entity label text
    var HOVER_BOX_WIDTH = 90;
    var HOVER_BOX_HEIGHT = 35;
    var html = "";
    
    var startTheta, startEntCentre_x, startEntCentre_y;
    var endTheta, endEntCentre_x, endEntCentre_y;

    // Plot entity links:
    if (EntityDisplayMode == 'focus') {

      // find the highest link frequency of the displayed entities:
      var maxLinkFreq = 0;
      for (i = 0; i < NumDisplayedEnts; i++) {
        if (DisplayedEntities[i].linkFreq > maxLinkFreq) {
          maxLinkFreq = LinkedEntities[i].linkFreq;
        }
      }

      startEntCentre_x = centre_x;
      startEntCentre_y = centre_y;
      for(i = 0; i < DisplayedEntities.length; i++) {
        endTheta = 90 - (i * 360 / DisplayedEntities.length); 
        endEntCentre_x = centre_x + orbitRadius * Math.cos(endTheta * Math.PI / 180);
        endEntCentre_y = centre_y - orbitRadius * Math.sin(endTheta * Math.PI / 180);
        var lineWeight;
        if (maxLinkFreq <= 6) {
          lineWeight = DisplayedEntities[i].linkFreq; 
        } else {
          lineWeight = 6 * (DisplayedEntities[i].linkFreq / maxLinkFreq);
        }
        html += "<line x1='" + startEntCentre_x + "' y1='" + startEntCentre_y + "' x2='";
        html += "" + endEntCentre_x + "' y2='" + endEntCentre_y;
        html += "' style='stroke:rgb(50,50,50);stroke-width:" + lineWeight + "' />"; 
      }
    } 
    else { // for all other display modes

      // find the highest link frequency of the displayed entities:
      var maxLinkFreq = 0;
      for (i = 0; i < NumDisplayedEnts; i++) {
        for (j = 0; j < NumDisplayedEnts; j++) {
          if (ConcurrencyMatrix[i][j] > maxLinkFreq) {
            maxLinkFreq = ConcurrencyMatrix[i][j];
          }
        }
      }

      // Plot links:
      for(i = 0; i < NumDisplayedEnts; i++) {
        startTheta = 90 - (i * 360 / NumDisplayedEnts); 
        startEntCentre_x = centre_x + orbitRadius * Math.cos(startTheta * Math.PI / 180);
        startEntCentre_y = centre_y - orbitRadius * Math.sin(startTheta * Math.PI / 180);
        for(j = 0; j < NumDisplayedEnts; j++) {
          if (ConcurrencyMatrix[i][j] > 0) {
            endTheta = 90 - (j * 360 / NumDisplayedEnts); 
            endEntCentre_x = centre_x + orbitRadius * Math.cos(endTheta * Math.PI / 180);
            endEntCentre_y = centre_y - orbitRadius * Math.sin(endTheta * Math.PI / 180);
            var lineWeight = 6 * (ConcurrencyMatrix[i][j] / maxLinkFreq);
            html += "<line x1='" + startEntCentre_x + "' y1='" + startEntCentre_y + "' x2='";
            html += "" + endEntCentre_x + "' y2='" + endEntCentre_y;
            html += "' style='stroke:rgb(50,50,50);stroke-width:" + lineWeight + "' />"; 
          }
        }
      }
    }

    // Plot entity circles
    for(i = 0; i < NumDisplayedEnts; i++) {
      // polar angle coordinate of centre of entity from X axis at centre of orbit (deg):
      var theta = 90 - (i * 360 / NumDisplayedEnts); 
      var entCentre_x = centre_x + orbitRadius * Math.cos(theta * Math.PI / 180);
      var entCentre_y = centre_y - orbitRadius * Math.sin(theta * Math.PI / 180);
      var entRadius = MIN_ENT_RADIUS + (maxEntRadius - MIN_ENT_RADIUS) * (DisplayedEntities[i].freq / maxFreq);
      var fillColorFactor = (DisplayedEntities[i].aveSentiment + 10) / 20;
      var textAnchor_x;
      var textAnchor_y;
      var textRotation;
      if (theta >= -90) { // for 12 to 6 o'clock entities,
        textAnchor_x = centre_x + (orbitRadius + entRadius + 7) * Math.cos((theta - 1) * Math.PI / 180);
        textAnchor_y = centre_y - (orbitRadius + entRadius + 7) * Math.sin((theta - 1) * Math.PI / 180);
        textRotation = theta *-1;
      } else { // for 6 to 12 o'clock entities, rotate text around
        var textWidth = DisplayedEntities[i].name.length * ENT_LABEL_FONTSIZE / 1.4; 
        // (Ubuntu Mono has a 1.4:1 height:width per character)
        textAnchor_x = centre_x + (orbitRadius + entRadius + 7 + textWidth) * Math.cos((theta + 1) * Math.PI / 180);
        textAnchor_y = centre_y - (orbitRadius + entRadius + 7 + textWidth) * Math.sin((theta + 1) * Math.PI / 180);
        textRotation = 180 - theta;
      }
      var hoverBoxCentre_x = centre_x + (orbitRadius - 2.7*maxEntRadius) * Math.cos(theta * Math.PI / 180);
      var hoverBoxCentre_y = centre_y - (orbitRadius - 2.7*maxEntRadius) * Math.sin(theta * Math.PI / 180);
      var paddedAveSentiment = padPointZero(DisplayedEntities[i].aveSentiment);
      
      // Entity circle:
      html += "<circle class='entCircles' id='ec" + i + "' cx='" + entCentre_x + "' cy='" + entCentre_y + "' r='" + entRadius + "' + stroke='black' stroke-width='1' fill='" + getColor(fillColorFactor) + "' />";

      // Entity label:
      html += "<text class='entLabel' x='" + textAnchor_x + "' y='" + textAnchor_y + "' transform='rotate(" + textRotation + "," + textAnchor_x + "," + textAnchor_y + ")'>" + DisplayedEntities[i].name + "</text>"; 
      
      // Tool-tip box:
      html += "<rect id='' x='" + (hoverBoxCentre_x - HOVER_BOX_WIDTH/2)  + "' y='" + (hoverBoxCentre_y - HOVER_BOX_HEIGHT/2) + "' width='" + HOVER_BOX_WIDTH + "' height='" + HOVER_BOX_HEIGHT  + "' fill='rgb(255,255,204)' visibility='hidden'>"; 
      html += "<set attributeName='visibility' from='hidden' to='visible' begin='ec" + i + ".mouseover' end='ec" + i + ".mouseout'/>";
      html += "</rect>";

      // Tooltip text:
      html += "<text class='hoverText' x='" + (hoverBoxCentre_x - HOVER_BOX_WIDTH/2 + 5) + "' y='" + (hoverBoxCentre_y - HOVER_BOX_HEIGHT/2 + 15) + "' font-size='12' fill='black' visibility='hidden'>";
      if (EntityDisplayMode == "focus") {
        html += "<tspan x='" + (hoverBoxCentre_x - HOVER_BOX_WIDTH/2 + 5) + "' dy='0'>Connections: " +  DisplayedEntities[i].linkFreq + "</tspan>";
      } else {
        html += "<tspan x='" + (hoverBoxCentre_x - HOVER_BOX_WIDTH/2 + 5) + "' dy='0'>Frequency: " +  DisplayedEntities[i].freq + "</tspan>";
      }
      html += "<tspan x='" + (hoverBoxCentre_x - HOVER_BOX_WIDTH/2 + 5) + "' dy='12'>Sent. Score: " +  paddedAveSentiment + "</tspan>";
      html += "<set attributeName='visibility' from='hidden' to='visible' begin='ec" + i + ".mouseover' end='ec" + i + ".mouseout'/>";
      html += "</text>";
    }

    if (EntityDisplayMode == "focus") {
      // Draw focus entity circle and label:
      var fillColorCoef = (FocusEntity.aveSentiment + 10) / 20;
      var textWidth = FocusEntity.name.length * ENT_LABEL_FONTSIZE / 1.4;
      var focusEntDiam = textWidth + 20;
      html += "<circle cx='" + centre_x + "' cy='" + centre_y + "' r='" + focusEntDiam/2 + "' stroke='black' stroke-width='1' fill='" + getColor(fillColorCoef) + "' />";
      html += "<text class='entLabel' x='" + (centre_x - textWidth/2) + "' y='" + (centre_y + ENT_LABEL_FONTSIZE/2 - 3) + "'>" + FocusEntity.name + "</text>"; 
    }

    // Add all of the above svg elements within the parent svg element:
    svgDOM.innerHTML = html;

    // On clicking an entity circle, switch to the focus diagram for that entity:
    $(".entCircles").each(function () {
      var entCircle = this;
      entCircle.addEventListener("click", function() {
        var rank = entCircle.id.slice(2);
        for(i = 0; i < NumDisplayedEnts; i++) {
          if (DisplayedEntities[i].rank == rank) {
            FocusEntity.name = DisplayedEntities[i].name;
            EntityDisplayMode = "focus";
            document.getElementById('focusRadio').checked = true;
            document.getElementById('searchedEntity').value = FocusEntity.name;
            getEntityTableDiagData();
          }
        }
      });
    });
  }

  // Helper function to pad a floating point number with ".0" if it is has no 
  // fractional part:
  function padPointZero(fpNumber) {
    var numAsString = "" + fpNumber;
    if (!(/\./.test(numAsString))) { // if number has a decimal point
      numAsString += ".0";
    }
    return numAsString;
  }

  /* Returns an rgb(x,y,z) string based on factor from 0 to 1 of how far along the
   * specified colour spectrum the output colour should be.
   */

  function getColor(factor) {
    var rgbStart = RED_COLOUR;
    var rgbMiddle = GREY_COLOUR;
    var rgbEnd = GREEN_COLOUR;
    var r, g, b;
    if (factor <= 0.5) {
      r = lerp(rgbStart[0], rgbMiddle[0], factor * 2);
      g = lerp(rgbStart[1], rgbMiddle[1], factor * 2);
      b = lerp(rgbStart[2], rgbMiddle[2], factor * 2);
    } else {
      r = lerp(rgbMiddle[0], rgbEnd[0], (factor - 0.5) * 2);
      g = lerp(rgbMiddle[1], rgbEnd[1], (factor - 0.5) * 2);
      b = lerp(rgbMiddle[2], rgbEnd[2], (factor - 0.5) * 2);
    }
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  // Helper function for getColor()
  function lerp(a, b, factor) {
    var delta = b - a;
    return a + delta * factor;
  }

})(jQuery);
