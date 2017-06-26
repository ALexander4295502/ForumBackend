/**
 * Created by zhengyuan on 2017/5/16.
 */
var router = require('express').Router();
var mongoose = require('mongoose');
var PageViewCount = mongoose.model('PageViewCount');

router.get('/', function(req, res, next) {

  PageViewCount.find( {}, function (err, results) {
    if(!results.length){
      var page = new PageViewCount()
      page.viewCount = 1;
      page.save().then(function () {
        return res.json({pageViewCount: page.toJSON()});
      })
    } else {
      return res.json({pageViewCount: results[0].toJSON()})
    }
  });

});

router.put('/', function (req, res, next) {

  PageViewCount.find( {}, function (err, results) {
    if(!results.length){
      var page = new PageViewCount()
      page.viewCount = 1;
      page.save().then(function () {
        return res.json({pageViewCount: page.toJSON()});
      })
    } else {
      results[0].addCount();
      return res.json({pageViewCount: results[0].toJSON()})
    }
  });
});

module.exports = router;