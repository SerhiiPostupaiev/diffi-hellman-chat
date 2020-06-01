const socket = io();
const message = document.getElementById('message');
const username = document.getElementById('username');
const sendMessage = document.getElementById('sendMessage');
const sendUsername = document.getElementById('sendUsername');
const chatroom = document.getElementById('chatroom');
const feedback = document.getElementById('feedback');
const encKey = document.getElementById('encKey');

// user's private key
let userPrivateKey = 0;
//modulus
let P = 0;
// key to encrypt with
let key = '';

sendMessage.addEventListener('click', sendMessageOnClick);
message.addEventListener('keypress', showTyping);
sendUsername.addEventListener('click', changServerUserName);

function changServerUserName() {
  socket.emit('changeUsername', { username: username.value });
}

// display who is typing
function showTyping() {
  socket.emit('typing', username.value);
}

function sendMessageOnClick() {
  // encrypt msg with AES and send
  const encrypted = CryptoJS.AES.encrypt(message.value, key).toString();

  socket.emit('newMessage', { message: encrypted });
}

socket.on('definePublicKeys', (data) => {
  // get  modulus
  P = data.P;
  // get base
  let base = data.base;

  let id = data.id;
  let sockId = data.sockId;

  // get private key
  userPrivateKey = Math.floor(Math.random() * P);

  // part to share
  let userPublicKey = Math.pow(base, userPrivateKey) % P;

  // update user's share part (as new user was connected)
  socket.emit('updateKeyValues', {
    keyValue: userPublicKey,
    id,
    sockId: sockId,
  });
});

socket.on('newMessage', (data) => {
  feedback.innerHTML = '';
  message.value = '';
  let msg = data.message;
  msg = msg.toString();
  // decrypt with key and display
  const decrypted = CryptoJS.AES.decrypt(msg, key);
  const dec = decrypted.toString(CryptoJS.enc.Utf8);

  const messageBlock = `<p class = 'message'>${data.username}: ${dec}</p>`;

  chatroom.insertAdjacentHTML('beforeend', messageBlock);
});

socket.on('typing', (data) => {
  const typingMsg = `<p><i> ${data.username} is typing a message...</i></p>`;

  feedback.insertAdjacentHTML('beforeend', typingMsg);
});

socket.on('calcNextKeyValue', (data) => {
  let keyValue = parseInt(data.keyValue);
  // next value computation
  let newKeyValue = Math.pow(keyValue, userPrivateKey) % P;
  let chainCounter = parseInt(data.chainCounter) + 1;

  setTimeout(function () {
    socket.emit('sendToNextUser', {
      newKeyValue,
      chainCounter,
      userId: data.destUserId,
    });
  }, 2000);
});

// getting computed key after finishing the exchange
socket.on('GetEncryptionKey', (data) => {
  key = parseInt(data.keyValue).toString();
  console.log(key);
});
