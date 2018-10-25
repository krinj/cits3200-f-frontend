
// Initial Page Render (Pug to HTML)
module.exports.initialRender = function (req, res, orgABNhash) {

  res.render('sentiment-analytics', {
    title: 'Sentiment Analytics',
    // orgABNhash: orgABNhash
    orgABNhash: 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1'
    /* testing OrgABNhash values: 
     * Apple : '8535d7b88bb3496f7f4bc3ed817a46df8d320b43a15d00f2fd4b144960792e8e'
     * IBM : 'a11e075a60a41650aa6b8dad77fdd347aacb5e3ee850708c68de607f454f07d1' 
     * Honeywell: '327b4c980e9ca700e1e02890cbfe72860832af01dc6add6abcc38ba6e7aa68de '
     */
  });  
};

