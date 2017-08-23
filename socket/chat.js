var mongoose = require('mongoose');
var User = mongoose.model('User');
const secret = require('../config/index').secret;

var socketioJwt = require('socketio-jwt');
var currentClients = [];

module.exports = function(io) {

  io.use(socketioJwt.authorize({
    secret: secret,
    handshake: true
  }));

  io.on('connection', function (socket) {

    console.log(socket.decoded_token.username);

    User.findOne({username: socket.decoded_token.username}).then(function (user) {
      if(!user){
        throw new Error("SocketIo Error: User not found");
      }

      if (currentClients.indexOf(user.username) !== -1) {
        return;
      }

      socket.join(user.username);

      currentClients.forEach(_username => {
        io.to(_username).emit('addUserToUserList', user.username);
      });

      io.to(user.username).emit(
        "updateUserList",
        currentClients
      );

      currentClients.push(user.username);

      // console.log(
      //   `\n User:  "${user.username}" login!\n `
      // );
      // console.log(
      //   "current users: ",
      //   currentClients
      // );

      socket.on('sendMessage', function (_message) {
        if (currentClients.indexOf(_message.to) !== -1) {
          io.to(_message.to).emit('receiveMessage', _message);
        }
      });


      socket.on('disconnect', function(){
        // console.log(
        //   `\n User "${user.username}" disconnect \n`
        // );
        socket.leave(user.username);
        let userIndex = currentClients.indexOf(user.username);
        if (userIndex !== -1) {
          console.log("remove user from list!!");
          currentClients.splice(userIndex, 1);
          currentClients.forEach(_username => {
            io.to(_username).emit('removeUserFromSocketList', user.username);
          })
        }
      });


    }).catch(err => {
      throw new Error(err);
    });

  });

};