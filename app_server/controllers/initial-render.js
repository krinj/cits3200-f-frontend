
// Initial Page Render (Pug to HTML)
module.exports.initialRender = function (req, res) { 

  res.render('sentiment-analytics', { 
    title: 'Sentiment Analytics'
  });  
};

