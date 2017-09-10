/**
 * Created by zhengyuan on 2017/5/16.
 */
var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');
var async = require('async');
var nodemailer = require('nodemailer');
var nev = require('email-verification')(mongoose);
var crypto = require('crypto');
var Mailgun = require('mailgun-js');

var mailgun_api_key = 'key-41e1018166391483ab62350f08ece833';
var mailgun_domain = 'sandbox0b45de7707c64ded8552042a6da18f95.mailgun.org';
var mailgun_from_who = 'Do Not Reply <email@zheng.town>';

const verificationHost = process.env.NODE_ENV === 'production'?
  'https://forum.zheng.town/#/email-verification/' :
  'http://127.0.0.1:4200/#/email-verification/';

nev.configure({
  persistentUserModel: User,
  tempUserCollection: 'tempusers',
  shouldSendConfirmation: false,
}, function (error, options) {
});

nev.generateTempUserModel(User, function (err, tempUserModel) {
  if(err){
    console.log("Generate Temp User Model Error  "+err.toString());
  }
  console.log('Generated Temp User Model: ' + (typeof tempUserModel === 'function'));
});

router.post('/users/login', function(req, res, next){
    if(!req.body.user.email){
        return res.status(422).json({errors: {email: "can't be blank"}});
    }

    if(!req.body.user.password){
        return res.status(422).json({errors: {password: "can't be blank"}});
    }

    passport.authenticate('local', {session: false}, function(err, user, info){
        if(err){ return next(err); }

        if(user){
            user.token = user.generateJWT();
            return res.json({user: user.toAuthJSON()});
        } else {
            return res.status(422).json(info);
        }
    })(req, res, next);
});

router.post('/users', function(req, res, next){
    var user = new User();
    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);
    user.image = 'https://static.productionready.io/images/smiley-cyrus.jpg';
    user.bio = 'Left nothing';
    nev.createTempUser(user, function (err, existingPersistentUser, newTempUser) {
      if(err){
        if(err.name === 'ValidationError'){
          console.log("validationError!");
          return res.status(422).json({
            errors: Object.keys(err.errors).reduce(function (errors, key) {
              errors[key] = err.errors[key].message;
              return errors;
            }, {})
          });
        }
      }
      if(existingPersistentUser){
        return res.status(422).json({errors: {email: "is used by others"}});
      }

      console.log(newTempUser);

      if(newTempUser) {
        var URL = newTempUser[nev.options.URLFieldName];
        var mailgun = new Mailgun({apiKey: mailgun_api_key, domain: mailgun_domain});
        var data = {
          //Specify email data
          from: mailgun_from_who,
          //The email to contact
          to: user.email,
          //Subject and text data
          subject: 'Please confirm account',
          html: `Click the following link to confirm your account:</p><p>${verificationHost+URL}</p>`,
          text: `Please confirm your account by clicking the following link: ${verificationHost+URL}`
        };

        mailgun.messages().send(data, function (err, body) {
          if(err){
            if(err.name === 'ValidationError'){
              console.log("validationError!");
              return res.status(422).json({
                errors: Object.keys(err.errors).reduce(function (errors, key) {
                  errors[key] = err.errors[key].message;
                  return errors;
                }, {})
              });
            }
          }
          else {
            return res.json({
                  msg: 'An email has been sent to you. Please check it to verify your account.',
                  info: body
            });
          }
        });
      } else {
        res.json({
          msg: 'You have already signed up. Please check your email to verify your account.'
        });
      }
    });

});

router.get('/user', auth.required, function(req, res, next){
    User.findById(req.payload.id).then(function(user){
        if(!user){ return res.sendStatus(401); }
        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

router.put('/user', auth.required, function(req, res, next){
    console.log("i am in put /user");
    User.findById(req.payload.id).then(function(user){
        if(!user){ return res.sendStatus(401); }

        // only update fields that were actually passed...
        if(typeof req.body.user.username !== 'undefined'){
            user.username = req.body.user.username;
        }
        if(typeof req.body.user.email !== 'undefined'){
            user.email = req.body.user.email;
        }
        if(typeof req.body.user.bio !== 'undefined'){
            user.bio = req.body.user.bio;
        }
        if(typeof req.body.user.image !== 'undefined'){
            user.image = req.body.user.image;
        }
        if(typeof req.body.user.password !== 'undefined'){
            user.setPassword(req.body.user.password);
        }

        return user.save().then(function(){
            return res.json({user: user.toAuthJSON()});
        });
    }).catch(next);
});

router.get('/users/email-verification/:url', function(req, res, next) {
  var url = req.params.URL;
  console.log("URL = "+url.toString());
  nev.confirmTempUser(url, function (err, user) {
    if(user){
      return res.json({
        msg: 'Confirmed!',
        user: user
      });
    } else {
      if(err.name === 'ValidationError'){
        console.log("validationError!");
        return res.status(422).json({
          errors: Object.keys(err.errors).reduce(function (errors, key) {
            errors[key] = err.errors[key].message;
            return errors;
          }, {})
        });
      }
      return res.json({err: "this confirmation url is expired"});
    }
  })
});

router.post('/users/forgot', function (req, res, next) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if(!user){
          return res.status(422).json({errors: {Account: " with that email address cannot be found"}});
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      var mailgun = new Mailgun({apiKey: mailgun_api_key, domain: mailgun_domain});
      var data = {
        to: user.email,
        from: mailgun_from_who,
        subject: 'Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        req.headers.origin + '/#/reset/' + token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };

      mailgun.messages().send(data, function (err, body) {
        if(err){
          console.log("send email error!!: ", err);
          if(err.name === 'ValidationError'){
            console.log("validationError!");
            return res.status(422).json({
              errors: Object.keys(err.errors).reduce(function (errors, key) {
                errors[key] = err.errors[key].message;
                return errors;
              }, {})
            });
          }
        }
        else {
          return res.json({
            info: 'An e-mail has been sent to ' + user.email + ' with further instructions.'
          });
        }
      });
    }
  ], function (err) {
    if(err) return res.status(422).json({
      errors : err
    });
  });
});

router.get('/users/reset/:token', function (req, res) {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }},
    function (err, user) {
      if(!user){
        return res.status(422).json({errors: {Password_reset_token : " is invalid or has expired. "}});
      }
      if(err){
        return res.status(422).json({errors: err.toString()});
      }
      return res.json({user: user});
  })
});

router.post('/users/reset/:token', function (req, res) {
  async.waterfall([
    function (done) {
      console.log(req.body);
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function (err, user) {
        if(!user) {
          console.log("1");
          return res.json({errors: {Password_reset_token : " is invalid or has expired. "}});
        }
        if(typeof req.body.password === 'undefined'){
          console.log("2");
          return res.json({errors: {newPassword : " cannot be empty. "}});
        } else {
          user.setPassword(req.body.password);
          user.resetPasswordExpires = undefined;
          user.resetPasswordToken = undefined;
          user.save(function (err) {
            if(err) {
              return res.json({errors: {savePassword : " error. "}});
            }
            return res.json({info: {NewPassword : " set successfully. "}});
          });
        }
      });
    }
  ], function (err) {
    if(err) {
      console.log("4");
      return res.status(422).json({errors : err});
    };
  })
});

router.param('url', function(req, res, next, url){
  req.params.URL = url;
  return next();
});

router.param('token', function (req, res, next, token) {
  req.params.token = token;
  return next();
})


module.exports = router;