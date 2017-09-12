/**
 * Created by zhengyuan on 2017/9/12.
 */
var router = require('express').Router();
var Mailgun = require('mailgun-js');

var mailgun_api_key = 'key-41e1018166391483ab62350f08ece833';
var mailgun_domain = 'mail.rourouzhuzhu.com';
var mailgun_from_who = 'Do Not Reply <email@zheng.town>';

router.post('/', function(req, res, next) {
  var contactInfo = {
    name: req.body.name,
    email: req.body.email,
    message: req.body.message
  };

  var mailgun = new Mailgun({apiKey: mailgun_api_key, domain: mailgun_domain});

  mailgun.validate(req.body.email, function (err, body) {
    if(err) {
      return res.status(422).json({
        errors: Object.keys(err.errors).reduce(function (errors, key) {
          errors[key] = err.errors[key].message;
          return errors;
        }, {})
      });
    }
    console.log(body);
    return res.json({
      msg: "Email validation result",
      info: body
    });
  });

  // var data = {
  //   //Specify email data
  //   from: mailgun_from_who,
  //   //The email to contact
  //   to: user.email,
  //   //Subject and text data
  //   subject: 'Message from portfolio contact page',
  //   html: `This is my contact email:</p><p>${contactInfo.email}</p>`,
  //   text: `Hi, my name is ${contactInfo.name} \n
  //          Here is the content of my message: \n
  //          ${contactInfo.message}`
  // };
  //
  // mailgun.messages().send(data, function (err, body) {
  //   if(err){
  //     console.log(err);
  //     if(err.name === 'ValidationError'){
  //       console.log("validationError!");
  //       return res.status(422).json({
  //         errors: Object.keys(err.errors).reduce(function (errors, key) {
  //           errors[key] = err.errors[key].message;
  //           return errors;
  //         }, {})
  //       });
  //     }
  //   }
  //   else {
  //     return res.json({
  //       msg: 'An email has been sent to you. Please check it to verify your account.',
  //       info: body
  //     });
  //   }
  // });


});

module.exports = router;