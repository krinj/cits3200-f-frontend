
// Initial Page Render (Pug to HTML)
module.exports.initialRender = function (req, res, orgABN) {

  res.render('sentiment-analytics', {
    title: 'Sentiment Analytics',
    orgABN: orgABN
  });  
};

