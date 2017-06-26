/**
 * Created by zhengyuan on 2017/6/21.
 */

var mongoose = require('mongoose');

var PageViewCountSchema = new mongoose.Schema({
  viewCount: Number
}, {timestamps: true});

// Requires population of author

PageViewCountSchema.methods.addCount = function () {
  this.viewCount += 1;
  this.save();
};

mongoose.model('PageViewCount', PageViewCountSchema);