
// Initial Page Render
module.exports.initialPageRender = function (req, res) { 

  res.render('sentiment-analytics', { 
    title: 'Sentiment Analytics'
  });  
};

