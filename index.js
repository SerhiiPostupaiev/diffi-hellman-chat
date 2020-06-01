const express = require('express');
const app = express();

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = 3000;

server = app.listen(PORT, () => `Server started on port ${PORT}`);

const io = require('socket.io')(server);

const users = {};
let userAmount = 0;
let userToDisconnect = null;
let disconnectedUserNum = 0;
let updateCount = 0;
const ID_POS = 4;

function removeUser(sockId) {
  for (let userItem in users) {
    if (users[userItem]['sockId'] == sockId) {
      userToDisconnect = userItem;
      disconnectedUserNum = userItem.charAt(ID_POS);
    }
  }
  console.log('Disconnected user: ' + userToDisconnect);
  delete users[userToDisconnect];
  let toReplaceNum = disconnectedUserNum;
  for (let userItem in users) {
    if (parseInt(userItem.charAt(ID_POS)) >= disconnectedUserNum) {
      let currNum = userItem.charAt(ID_POS);
      users['User' + toReplaceNum] = users['User' + currNum];
      delete users['User' + currNum];
      toReplaceNum++;
    }
  }
  console.log(users);
}

io.on('connection', (socket) => {
  console.log('A user connected');
  userAmount++;
  let id = 'User' + (userAmount - 1);

  // send modulus and base to user
  socket.emit('definePublicKeys', { P: 23, base: 5, id, sockId: socket.id });

  socket.on('disconnect', function () {
    console.log('A user disconnected');
    userAmount--;
    console.log(socket.id + ' is disconnecting');
    removeUser(socket.id);
  });

  // default username
  socket.username = 'Guest';

  // change username event
  socket.on('changeUsername', (data) => {
    socket.username = data.username;
  });

  // get message from user and send it back to display
  socket.on('newMessage', (data) => {
    console.log('Username: ' + socket.username + ' Enc: ' + data.message);
    io.sockets.emit('newMessage', {
      message: data.message,
      username: socket.username,
    });
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', { username: socket.username });
  });

  socket.on('updateKeyValues', (data) => {
    updateCount++;
    let user = {
      sockId: data.sockId,
      keyValue: data.keyValue,
    };
    // add new user
    users[data.id] = user;
    console.log(users);

    socket.join(data.id);
    let tmp = updateCount;
    setTimeout(function () {
      while (tmp == userAmount) {
        for (let userItem in users) {
          let nextId = 0;
          let currId = parseInt(userItem.charAt(ID_POS));
          // define the next user
          nextId = (currId + 1) % userAmount;

          // notify concrete user to compute next value
          io.sockets.in('User' + nextId).emit('calcNextKeyValue', {
            keyValue: users[userItem]['keyValue'],
            chainCounter: 0,
            sourceUserId: 'User' + currId,
            destUserId: 'User' + nextId,
          });
        }
        tmp = 0;
      }
    }, 5000);
  });

  socket.on('sendToNextUser', (data) => {
    let newKeyValue = data.newKeyValue;
    let chainCounter = data.chainCounter;
    let userId = data.userId;
    let userNumber = parseInt(userId.charAt(ID_POS));

    // if chain is ended send encrypt key to the user
    if (chainCounter == userAmount - 1) {
      io.sockets
        .in('User' + userNumber)
        .emit('GetEncryptionKey', { keyValue: newKeyValue, userId: userId });
    } else {
      // else emit next value computation
      let nextId = (userNumber + 1) % userAmount;

      io.sockets.in('User' + nextId).emit('calcNextKeyValue', {
        keyValue: newKeyValue,
        chainCounter,
        sourceUserId: userId,
        destUserId: 'User' + nextId,
      });
    }
  });
});
