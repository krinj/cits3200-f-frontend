/*
 * Client-Side (cs) script for the Sentiment Analytics webpage. 
 */

// JQUERY FUNCTIONS
(function($) {

  /*** GLOBAL VARIABLES / 'MODEL' VARIABLES (Use capital first letter for globals): ***/

  // Sentiment colour scale end a middle points:
  const RedColor = [204, 69, 40];
  const GreyColor = [188, 191, 191];
  const GreenColor = [52, 143, 104];

  const NUM_ENTITIES = 30; // Number of entities to display in Entity Table & Diagram

  // *** TODO: Server should POST the logged in user's organisation name ***
  var Organisation = "Honeywell"; 

  // Filter variables:
  var SurveyName;
  var QuestionNum;
  var Gender;
  var AgeRange;
  var EmployStatus;
  var StartDate;
  var EndDate;

  // Filter result variables:
  var NumResponses;
  var PercentCompleted;
  var AveCharCount;
  var MaxCharCount;
  var NationalAveSentiment;
  var OrgAveSentiment;
  var FirstDate;
  var QuestionArray = [];
  var ScoreFreqArray = [];  

  // Histogram selected response variables:
  var ResponseScore;
  var IndexOfResponse = 0;
  var ResponseSelected = false;
  var ResponseInfo;

  // Entity Listing/Diagram variables:
  var EntityDisplayMode = "topFreq";
  var DisplayedEntities = [];
  var ConcurrencyMatrix = [];
  var FocusEntity;

  // Constructor for Entity objects
  function Entity(rank, name, freq, aveSentiment) {
    this.rank = rank;
    this.name = name;
    this.freq = freq;
    this.aveSentiment = aveSentiment;
  }

  window.onload = function() {

    // Set initial filter values:
    QuestionNum = 1;
    Gender = 'all';
    AgeRange = 'all';
    EmployStatus = 'all';
    StartDate = new Date(2016,0,17); // first date for Glassdoor Honeywell data
    // TODO: run a separate query when page loads
    EndDate = new Date(); // i.e. today

    loadResults();
    getEntityTableDiagData();

    // Event Listener for Fetch Results button:
    document.getElementById('fetchResults').addEventListener('click', function() {          
      QuestionNum = document.getElementById("questionList").value;
      Gender = document.getElementById("gender").value;
      AgeRange = document.getElementById("ageRange").value;
      EmployStatus = document.getElementById("employStatus").value;
      StartDate = new Date(document.getElementById("startDateBox").valueAsDate);
      EndDate = new Date(document.getElementById("endDateBox").valueAsDate);
      loadResults();   
    });

    // When resetting filters, reset start date and end date to overall range start and range end: 
    document.getElementById('resetFilters').addEventListener('click', function() {
      document.getElementById("gender").value = 'all';
      document.getElementById("ageRange").value = 'all';
      document.getElementById("employStatus").value = 'all';
      document.getElementById('startDateBox').valueAsDate = FirstDate;
      document.getElementById('endDateBox').valueAsDate = new Date();

      // Reset the handles on the date slider: 
      var startDateObj = FirstDate;
      var endDateObj = new Date();
      var slider = document.getElementById('dateSlider');
      slider.noUiSlider.set([startDateObj.getTime(), endDateObj.getTime()]);
    });
  };

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

  // jQuery AJAX function to fetch and load results from the database
  function loadResults() {
    $.ajax({
      url: "/load-results",   // i.e. [Nodejs app]/app_server/controllers/load-results.js
      data: { // data to send to load-results.js controller
        "questionNum" : QuestionNum,
        "gender" : Gender,
        "ageRange" : AgeRange,
        "employStatus" : EmployStatus,
        "startDate" : toYYYY_MM_DD(StartDate),
        "endDate" : toYYYY_MM_DD(EndDate)
      },
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from SQL via controller
        // for(property in data) {
        //   console.log("" + property + ": " + data[property]);
        // }
        NumResponses = data.numResponses;
        PercentCompleted = data.percentCompleted;
        AveCharCount = data.aveCharCount;
        MaxCharCount = data.maxCharCount;
        NationalAveSentiment = data.nationalAveSentiment;
        OrgAveSentiment = data.orgAveSentiment;
        FirstDate = new Date(data.firstDate.slice(0,10));
        QuestionArray = data.questionArray;
        ScoreFreqArray = data.scoreFreqArray;
        ResponseDate = data.responseDate;
        ResponseScore = data.responseScore;
        ResponseText = data.responseText;

        // If loading the page for the first time:
        if(document.getElementById("questionList").innerHTML == "") {
          setFilterInputs();
          renderDateSlider();
        }

        renderAveSentimentDial();
        renderCompareSentimentChart();
        renderHistogramByScore();
        fillSummaryTable();
        fillResponseDetails();
      },
      error: function (data) {
        console.log("Could not load results.");
      }
    });
  }    

  // Set the filter DOM inputs to the values returned from the loadResults method
  // (which have been saved to global variables)
  function setFilterInputs() {   
    var html = "";
    for(var i = 0; i < QuestionArray.length; i++) {
      html += "<option value='" + (i+1) + "'>" + QuestionArray[i] + "</option>";
    }
    document.getElementById("questionList").innerHTML = html;
    document.getElementById("questionList").value = QuestionNum;
    document.getElementById("gender").value = Gender;
    document.getElementById("ageRange").value = AgeRange;
    document.getElementById("employStatus").value = EmployStatus;
  }

  function renderDateSlider() {

    var firstDay = FirstDate.getDate();
    var firstMonth = FirstDate.getMonth();
    var firstYear = FirstDate.getFullYear();
    document.getElementById('firstDateSpan').innerHTML = padZero(firstDay) + '/' + padZero(firstMonth + 1) + "/" + firstYear;
    
    var today = new Date();
    document.getElementById("todaysDate").innerHTML = padZero(today.getDate()) + "/" + padZero((today.getMonth() + 1)) + "/" + today.getFullYear();

    // Overall date range for slider 
    // (remains fixed even if filter range sliders/boxes is changed by the user)
    var rangeStart = FirstDate;
    var rangeEnd = today;

    document.getElementById('startDateBox').valueAsDate = StartDate;
    document.getElementById('endDateBox').valueAsDate = EndDate;

    var rangeStart_ms = rangeStart.getTime();
    var rangeEnd_ms = rangeEnd.getTime();
    var startDate_ms = StartDate.getTime();
    var endDate_ms = EndDate.getTime();

    var slider = document.getElementById('dateSlider');
    noUiSlider.create(slider, {
      // Create two timestamps to define a range.
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

    slider.noUiSlider.on('update', function (values, handle) {
        dateValues[handle].valueAsDate = new Date(+values[handle]);
    });
  }

  function fillSummaryTable() {
    document.getElementById("numResponses").innerHTML = NumResponses;
    document.getElementById("percentCompleted").innerHTML = PercentCompleted;
    document.getElementById("aveCharCount").innerHTML = AveCharCount;
    document.getElementById("maxCharCount").innerHTML = MaxCharCount;
  }

  function renderAveSentimentDial() {

    var canvasWidth = 500;   
    var canvasHeight = 280;   
    var needleRadius = 180;

    var canvasContainerDOM = document.getElementById("dialCanvasContainer");
    var html = "<canvas id='dialCanvas' width='" + canvasWidth + "' height='" + canvasHeight + "' >";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContainerDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("dialCanvas");
    var ctx = canvasDOM.getContext("2d");
    var img = document.getElementById("dialImg");   
    
    var angle = ((10 - OrgAveSentiment) * Math.PI) / 20;
    var needleBaseX = canvasWidth / 2 - 8;
    var needleBaseY = canvasHeight - 30;
    var needleTipX = needleBaseX + needleRadius * Math.cos(angle);
    var needleTipY = needleBaseY - needleRadius * Math.sin(angle);

    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight - 20);
    ctx.beginPath();
    ctx.moveTo(needleBaseX, needleBaseY);
    ctx.lineTo(needleTipX, needleTipY);      
    ctx.scale(5,5);
    ctx.strokeStyle='red';
    ctx.stroke();

    document.getElementById('aveSentimentSpan').innerHTML = Math.round(OrgAveSentiment * 10) / 10;
  }

  function renderCompareSentimentChart() {
    
    // (Re-)create canvas DOM element 
    // (otherwise duplicate canvases will form on fetching new results)
    var canvasContainerDOM = document.getElementById("compareAveSentContainer");
    var html = "<canvas id='compareAveSentCanvas'>";
    html += "Your browser does not support the HTML5 canvas tag. </canvas>";
    canvasContainerDOM.innerHTML = html; // (re-) insert the canvas into the DOM
    var canvasDOM = document.getElementById("compareAveSentCanvas");
    
    var industryAve = OrgAveSentiment * 0.8; // use until industry field added to DB
    
    var myChart = canvasDOM.getContext('2d');
    var compareSentChart = new Chart(myChart, {
      type: 'bar', 
      data: {
        labels: ['Your Organization', 'Industry Average', 'National Average'],
        datasets: [{
          data: [OrgAveSentiment, industryAve, NationalAveSentiment],
          backgroundColor: [
            getColor((OrgAveSentiment + 10) / 20),
            getColor((industryAve + 10) / 20),
            getColor((NationalAveSentiment + 10) / 20),
          ],
          borderWidth: 1,
          borderColor: '#777',
          hoverBorderWidth: 3,
          hoverBorderColor: '#000'
        }]
      },
      options: {
        scales: {
          yAxes: [{
            ticks: {
              min: -10,
              max: 10
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
            left: 50,
            right: 0,
            bottom: 0,
            top: 0
          }
        },
        tooltips: {
          enabled: true
        }
      }
    });
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
    for (var i = 0; i < tiers + 1; i++)
    {
      xData.push(i - tiers/2);
      yData.push(ScoreFreqArray[i]);
      fillColor.push(getColor(i/tiers));
    }

    var data = {
      labels: xData,
      datasets: [
        {
          fill: true,
          backgroundColor: fillColor,
          data: yData, 
        }
      ]
    };

    var histogramChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        defaultFontFamily: Chart.defaults.global.defaultFontFamily = "'Roboto Condensed'",
        defaultFontSize:  Chart.defaults.global.defaultFontSize = 16,
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Frequency"
            },
            ticks : {
              beginAtZero : true
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Overall Sentiment Score"
            },
            barPercentage: 0.9,
            categoryPercentage: 1.0
          }]
        }
      }
    });

    canvasDOM.onclick = function(event) {
      ResponseSelected = true;
      IndexOfResponse = 0;
      var activeElement = histogramChart.getElementAtEvent(event)[0];
      ResponseScore = histogramChart.data.labels[activeElement._index];
      $.ajax({
        url: "/response-details", 
        // i.e. [Nodejs app]/app_server/controllers/response-details.js
        data: { // data to send to controller
          score: ResponseScore,
          "questionNum": QuestionNum,
          "gender": Gender,
          "ageRange": AgeRange,
          "employStatus": EmployStatus,
          "startDate": toYYYY_MM_DD(StartDate),
          "endDate": toYYYY_MM_DD(EndDate)
        },
        method: "POST",
        dataType: 'JSON',
        success: function (data) { // data is the JSON object returned from SQL via controller
          // for(property in data) {
          //   console.log("" + property + ": " + data[property]);
          // }
          ResponseInfo = data.responseResult;

          fillResponseDetails();
        },
        error: function (data) {
          console.log("Could not fetch data.");
        }

      });
    };

    var previous = document.getElementById("previousButton");
    previous.onclick = function () {
      if (ResponseSelected == false) {
        alert("Please select a bar of responses first.");
        return;
      }
      if (IndexOfResponse == 0) {
        alert("This is already the first response.");
        return;
      }
      IndexOfResponse--;
      fillResponseDetails();
    };

    var next = document.getElementById("nextButton");
    next.onclick = function () {
      if (ResponseSelected == false) {
        alert("Please select a bar of responses first.");
        return;
      }
      if (IndexOfResponse == ResponseInfo.length - 1) {
        alert("This is already the last response.");
        return;
      }
      IndexOfResponse++;
      fillResponseDetails();
    };

    var first = document.getElementById("firstButton");
    first.onclick = function () {
      if (ResponseSelected == false) {
        alert("Please select a bar of responses first.");
        return;
      }
      IndexOfResponse = 0;
      fillResponseDetails();
    };

    var last = document.getElementById("lastButton");
    last.onclick = function () {
      if (ResponseSelected == false) {
        alert("Please select a bar of responses first.");
        return;
      }
      IndexOfResponse = ResponseInfo.length - 1;
      fillResponseDetails();
    };
  }

  function fillResponseDetails() {
    if(ResponseSelected == false) {
      document.getElementById('responseIndex').innerHTML = "No response selected";
    } else {
      var date = ResponseInfo[IndexOfResponse].submitDate.slice(0,10);
      document.getElementById('responseDateSpan').innerHTML = date;
      document.getElementById('responseScoreSpan').innerHTML = ResponseScore;
      document.getElementById('responseText').innerHTML = ResponseInfo[IndexOfResponse].responseDetail;
      var responseIndex = IndexOfResponse + 1;
      document.getElementById('responseIndex').innerHTML ="Response: " + responseIndex + " of " + ResponseInfo.length;
    }
  }

  // Render the Entity Table and Entity Linkage Diagram for a given set of filters,
  // display mode and/or selected entity
  function getEntityTableDiagData() {
    $.ajax({
      url: "/entity-table-diagram",   
      // i.e. [Nodejs app]/app_server/controllers/entity-table-diagram.js
      data: { // data to send to controller
        "questionNum" : QuestionNum,
        "gender" : Gender,
        "ageRange" : AgeRange,
        "employStatus" : EmployStatus,
        "startDate" : toYYYY_MM_DD(StartDate),
        "endDate" : toYYYY_MM_DD(EndDate),
        "displayMode" : EntityDisplayMode,
        "numEntities" : NUM_ENTITIES,
        "focusEntity" : FocusEntity
      },
      method: "POST",
      dataType: 'JSON',
      success: function (data) { // data is the JSON object returned from SQL via controller
        // console.log("Entity data successfully received");

        // Populate array of Entity objects
        for (i = 0; i < data.entities1.length; i++) {
          DisplayedEntities.push(new Entity(i, data.entities1[i], data.frequencies[i], data.aveSentiments[i]));
        }

        // Initialise the concurrency matrix:
        for (i = 0; i < NUM_ENTITIES; i++) {
          ConcurrencyMatrix.push(new Array());
          for (j = 0; j < NUM_ENTITIES; j++) {
            ConcurrencyMatrix[i][j] = 0;
          }
        }      

        // Build the concurrency matrix:
        var prevID = 1;
        var thisID;
        var thisRank;
        var groupedEntRanks = []; // ranks of group of entities with the same response id
        for (i = 0; i < data.responseIDs.length; i++) {
          thisID = data.responseIDs[i];
          for (j = 0; j < DisplayedEntities.length; j++) {
            if (DisplayedEntities[j].name == data.entities2[i]) {
              thisRank = DisplayedEntities[j].rank;
            }
          }

          if (thisID == prevID) {
            groupedEntRanks.push(thisRank);
          } 
          else {
            for (j = 0; j < groupedEntRanks.length; j++) {
              for (k = 0; k < groupedEntRanks.length; k++) {
                if (groupedEntRanks[j] < groupedEntRanks[k]) {
                  ConcurrencyMatrix[groupedEntRanks[j]][groupedEntRanks[k]]++;
                }
              }
            }
            groupedEntRanks = []; // clear the array 
            groupedEntRanks.push(thisRank); // add current entity's rank
          }

          prevID = thisID;        
        }

        console.log("Concurrency matrix:");
        for (i = 0; i < NUM_ENTITIES; i++) {
          var row = "";
          for (j = 0; j < NUM_ENTITIES; j++) {
            row += ConcurrencyMatrix[i][j] + ", ";
          }
          console.log(row);
        }

        fillEntityTable();
        drawEntityDiagram();        
      },
      error: function (data) {
        console.log("Could not get data for entity table and diagram.");
      }
    });
  }

  function fillEntityTable() {

    var html = "";
    for(i = 0; i < NUM_ENTITIES; i++) {
      html += "<tr>";
      html += "<td>" + (DisplayedEntities[i].rank + 1) + "</td>";
      html += "<td>" + DisplayedEntities[i].name + "</td>";
      html += "<td>" + DisplayedEntities[i].freq + "</td>";
      html += "<td>" + DisplayedEntities[i].aveSentiment + "</td>";
      html += "</tr>";
    }
    document.getElementById('entityTableBody').innerHTML = html;
  }

  function drawEntityDiagram() {

    // find the heighest frequency of the displayed entities:
    var maxFreq = 0;
    for (i = 0; i < NUM_ENTITIES; i++) {
      if (DisplayedEntities[i].freq > maxFreq) {
        maxFreq = DisplayedEntities[i].freq;
      }
    }

    // find the heighest link frequency of the displayed entities:
    var maxLinkFreq = 0;
    for (i = 0; i < NUM_ENTITIES; i++) {
      for (j = 0; j < NUM_ENTITIES; j++) {
        if (ConcurrencyMatrix[i][j] > maxLinkFreq) {
          maxLinkFreq = ConcurrencyMatrix[i][j];
        }
      }
    }

    var svgDOM = document.getElementById('entitySvg'); 
    var SVG_WIDTH = 750; 
    var SVG_HEIGHT = 750; 
    var centre_x = SVG_WIDTH / 2;
    var centre_y = SVG_HEIGHT / 2;
    var orbitRadius = SVG_HEIGHT / 2 - 100;
    var maxEntRadius = 0.5 * Math.PI * orbitRadius * 2 / NUM_ENTITIES;
    var html = "";
    
    // Plot entity links:
    for(i = 0; i < NUM_ENTITIES; i++) {
      var startTheta = 90 - (i * 360 / NUM_ENTITIES); 
      var startEntCentre_x = centre_x + orbitRadius * Math.cos(startTheta * Math.PI / 180);
      var startEntCentre_y = centre_y - orbitRadius * Math.sin(startTheta * Math.PI / 180);
      for(j = 0; j < NUM_ENTITIES; j++) {
        if (ConcurrencyMatrix[i][j] > 0) {
          var endTheta = 90 - (j * 360 / NUM_ENTITIES); 
          var endEntCentre_x = centre_x + orbitRadius * Math.cos(endTheta * Math.PI / 180);
          var endEntCentre_y = centre_y - orbitRadius * Math.sin(endTheta * Math.PI / 180);
          var lineWeight = 6 * (ConcurrencyMatrix[i][j] / maxLinkFreq);
          html += "<line x1='" + startEntCentre_x + "' y1='" + startEntCentre_y + "' x2='" + endEntCentre_x + "' y2='" + endEntCentre_y + "' style='stroke:rgb(50,50,50);stroke-width:" + lineWeight + "' />"; 
        }
      }
    }

    // Plot entity circles
    for(i = 0; i < NUM_ENTITIES; i++) {
      // polar angle coordinate of centre of entity from X axis at centre of orbit (deg):
      var theta = 90 - (i * 360 / NUM_ENTITIES); 
      var entCentre_x = centre_x + orbitRadius * Math.cos(theta * Math.PI / 180);
      var entCentre_y = centre_y - orbitRadius * Math.sin(theta * Math.PI / 180);
      var entRadius = maxEntRadius * (DisplayedEntities[i].freq / maxFreq);
      var textAnchor_x = centre_x + (orbitRadius + entRadius + 7) * Math.cos(theta * Math.PI / 180);
      var textAnchor_y = centre_y - (orbitRadius + entRadius + 7) * Math.sin(theta * Math.PI / 180);
      var fillColourFactor = (DisplayedEntities[i].aveSentiment + 10) / 20;
      
      html += "<circle cx='" + entCentre_x + "' cy='" + entCentre_y + "' r='" + entRadius + "' + stroke='black' stroke-width='1' fill='" + getColor(fillColourFactor) + "' />";
      html += "<text class='entLabel' x='" + textAnchor_x + "' y='" + textAnchor_y + "' transform='rotate(" + theta*-1 + "," + textAnchor_x + "," + textAnchor_y + ")' fill='black'>" + DisplayedEntities[i].name + "</text>"; 
    }
    svgDOM.innerHTML = html;




  }

  /* Returns an rgb(x,y,z) string based on factor from 0 to 1 of how far along the 
   * specified colour spectrum the output colour should be.
   */ 
  function getColor(factor) {
    var rgbStart = RedColor;
    var rgbMiddle = GreyColor;
    var rgbEnd = GreenColor;
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
