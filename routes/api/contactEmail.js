/**
 * Created by zhengyuan on 2017/9/12.
 */
var router = require('express').Router();
var Mailgun = require('mailgun-js');

const mailgun_api_key = 'key-41e1018166391483ab62350f08ece833';
const mailgun_domain = 'mail.rourouzhuzhu.com';
const mailgun_from_who = 'Do Not Reply <email@zheng.town>';
const Admin_email = 'yuanzhengstl@gmail.com';

router.post('/', function(req, res, next) {
  var contactInfo = {
    name: req.body.name,
    email: req.body.email,
    message: req.body.message
  };
  console.log(req.body.name);
  var mailgun = new Mailgun({apiKey: mailgun_api_key, domain: mailgun_domain});

  const data = {
    //Specify email data
    from: mailgun_from_who,
    //The email to contact
    to: Admin_email,
    //Subject and text data
    subject: 'Message from portfolio contact page',
    html: `Hi, my name is ${contactInfo.name}. <br/><br/>
           Here is the content of my message: <br/>
           ${contactInfo.message} <br/><br/>`+
    `This is my contact email:</p><p>${contactInfo.email}</p>`,
    text: `Hi, my name is ${contactInfo.name}. \n\n
           Here is the content of my message: \n
           ${contactInfo.message} \n\n`+
           `This is my contact email: ${contactInfo.email} `
  };

  mailgun.messages().send(data, function (err, body) {
    if(err){
      console.log(err);
      return res.status(422).json({
        errors: Object.keys(err).reduce(function (errors, key) {
          errors[key] = err[key];
          return errors;
        }, {})
      });
    }
    else {
      console.log(body);
      return res.json({
        msg: 'Your message has been sent to Zheng.',
        info: body
      });
    }
  });


});

module.exports = router;