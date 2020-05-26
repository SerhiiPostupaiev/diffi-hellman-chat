$(function () {
  var socket = io();
  var message = $('#message');
  var username = $('#username');
  var sendMessage = $('#sendMessage');
  var sendUsername = $('#sendUsername');
  var chatroom = $('#chatroom');
  var feedback = $('#feedback');
  var encKey = $('#encKey');

  // user's private key
  var X = 0;
  //modulus
  var q = 0;
  // key to encrypt with
  var key = '';

  sendMessage.click(function () {
    // encrypt msg with AES and send
    var encrypted = CryptoJS.AES.encrypt(message.val(), key);
    //alert("Encrypted Value is :" + encrypted);
    encrypted = encrypted.toString();
    socket.emit('newMessage', { message: encrypted });
  });

  socket.on('initPublicKeys', (data) => {
    // get  modulus
    q = data.q;
    // get base
    var alpha = data.alpha;

    var id = data.id;
    var sockId = data.sockId;

    // get private key
    X = Math.floor(Math.random() * q);

    // part to share
    var Y = Math.pow(alpha, X) % q;

    // update user's share part (as new user was connected)
    socket.emit('updateYvals', { Yval: Y, id: id, sockId: sockId });
  });

  socket.on('newMessage', (data) => {
    feedback.html('');
    message.val('');
    var msg = data.message;
    msg = msg.toString();
    // decrypt with key and display
    var decrypted = CryptoJS.AES.decrypt(msg, key);
    var dec = decrypted.toString(CryptoJS.enc.Utf8);
    chatroom.append(
      "<p class = 'message'>" + data.username + ': ' + dec + '</p'
    );
  });

  sendUsername.click(function () {
    socket.emit('changeUsername', { username: username.val() });
  });

  // display who is typing
  message.keypress(() => {
    socket.emit('typing', username.val());
  });

  socket.on('typing', (data) => {
    feedback.html(
      '<p><i>' + data.username + ' is typing a message...' + '</i></p>'
    );
  });

  socket.on('ComputeNextYval', (data) => {
    var Yval = parseInt(data.Yval);
    //alert('Received from ' + data.sourceClientId)
    // next value computation
    var newYval = Math.pow(Yval, X) % q;
    var ret = parseInt(data.ret) + 1;

    setTimeout(function () {
      socket.emit('sendToNextClient', {
        newYval: newYval,
        ret: ret,
        clientId: data.destClientId,
      });
    }, 2000);
  });

  // getting computed key after finishing the exchange
  socket.on('AESEncrypt', (data) => {
    key = parseInt(data.Yval);
    key = key.toString();
    // encKey.html('<p><i>' + 'Encryption Key: ' + key + '</i></p>');
  });
});
