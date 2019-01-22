const saito = require('../../../saito');
const ChatCore = require('./chat_core.js');

const axios = require('axios');

//////////////////
// CONSTRUCTOR  //
//////////////////
// function Chat(app) {
class Chat extends ChatCore {

  constructor(app) {
    super(app);
  }

  async webServer(app, expressapp) {
    expressapp.get('/chat/', function (req, res) {
      res.sendFile(__dirname + '/web/index.html');
      return;
    });
    expressapp.get('/chat/img/mailchat.jpg', function (req, res) {
      res.sendFile(__dirname + '/web/img/mailchat.jpg');
      return;
    });
    expressapp.get('/chat/index.html', function (req, res) {
      res.sendFile(__dirname + '/web/index.html');
      return;
    });
    expressapp.get('/chat/script.js', function (req, res) {
      res.sendFile(__dirname + '/web/script.js');
      return;
    });
    expressapp.get('/chat/style.css', function (req, res) {
      res.sendFile(__dirname + '/web/style.css');
      return;
    });

    // chat integration with other modules
    expressapp.get('/mailchat/style.css', function (req, res) {
      res.sendFile(__dirname + '/web/mailchat/style.css');
      return;
    });
    expressapp.get('/mailchat/script.js', function (req, res) {
      res.sendFile(__dirname + '/web/mailchat/script.js');
      return;
    });
    expressapp.get('/mailchat/chat_popup.html', function (req, res) {
      res.sendFile(__dirname + '/web/mailchat/chat_popup.html');
      return;
    });

    expressapp.get('/chat/:publickey', async (req, res) => {
      // for security, pass TX signature as a header???
      // need a way to stop people from spoofing and retrieving other people's chat logs

      var payload = { "rooms": [] };

      var publickey = req.params.publickey;
      var sql_chat_rooms = "SELECT * FROM mod_chat_rooms WHERE publickey = $publickey";

      try {
        var rooms = await this.app.storage.db.all(sql_chat_rooms, {$publickey: publickey});

        // remove to get rid of public chat
        rooms.push({uuid: this.public_room_id, name: "ALL"});

        for (let i = 0; i < rooms.length; i++) {
          let addresses = await this.app.storage.db.all("SELECT publickey from mod_chat_rooms WHERE uuid = $uuid", {$uuid: rooms[i].uuid});
          let messages = await this.app.storage.db.all("SELECT * FROM mod_chat_records WHERE room_id = $room_id", {$room_id: rooms[i].uuid});
          payload["rooms"].push({ room_id: rooms[i].uuid, name: rooms[i].name, addresses: addresses.map(address => address.publickey), messages });
        }
        res.set({"Content-Type": "application/json"})
        res.send(payload);
      } catch(err) {
        console.log(err);
      }
    });
  }

  initialize() {
    // this shouldn't exist, but it does. welcome to our networking stack
    this.server_processing = setInterval(() => {
      if (this.app.network.peers[0]){
        this.server = this.app.network.peers[0];
        this._initializeChat();
        clearInterval(this.server_processing);
      }
    }, 250);
  }

  _initializeChat() {
    try {
      axios.get(`${this._getChatURL()}/chat/${this.app.wallet.returnPublicKey()}`).then(async (response) => {
        this.chat = response.data;

        if (this.app.BROWSER == 1) {
          for (let i = this.chat.rooms.length - 1; i >= 0; i--) {
            var messages = this.chat.rooms[i].messages.map(async (message) => {
              message.author = await this._getIdentifier(message.author);
              return message;
            });
            this.chat.rooms[i].messages = await Promise.all(messages);
            this._addChatRoomToSelector(i);
          }
          this.chat.rooms[this.chat.rooms.length - 1].messages.unshift(this._welcomeMessage());
          this._renderMessagesToDOM(this.public_room_id);
          this._scrollToBottom();
        }

        this._saveChat();
      });

    } catch(err) {
      console.log(err);
    }
  }

  _welcomeMessage() {
    return {
      id : 0,
      author: 'BearGuy',
      message:
      `Welcome to Saito Chat! Please note that this is an \n
unencrypted platform (for the time being) \n
and we can't guarantee that your message \n
will be delivered unless you provide a fee. \n\n
Here are some commands to get you started \n
"add 21959827AE41923837D498234CE4719238123" \n
-- start private chat with someone's public key \n
"add david@saito" \n
-- start private chat with someone's identifier \n
"add david@saito richard@saito 'Saito Squad'" \n
-- start group chat and name it (make sure to use single quotes) \n\n
Happy Chatting!`
    }
  }

  _addChatRoomToSelector(i) {
    let { room_id, name, addresses } = this.chat.rooms[i];
    if (addresses.length == 2) {
      if (name === "") { name = addresses[0] === this.app.wallet.returnPublicKey() ? addresses[1] : addresses[0] }
      this.app.dns.fetchIdentifier(name, (answer) => {
        name = this.app.dns.isRecordValid(answer) ?  JSON.parse(answer).identifier : name.substring(0,8);
        $('.chat_chat-room-selector').append(
          `<option class="chat_chat-room-option" value="${room_id}">${name}</option>`
        );
      });
    } else {
      name = name === "" ? i : name;
      $('.chat_chat-room-selector').append(
        `<option class="chat_chat-room-option" value="${room_id}">${name}</option>`
      );
    }
  }

  _addMessage(room_id, newmsg) {
    for (let i = 0; i < this.chat.rooms.length; i++) {
      if (this.chat.rooms[i].room_id == room_id) {
        this.chat.rooms[i].messages.push(newmsg);
      }
    }
  }

  _handleCreateRoomResponse(app, tx) {
    var new_room = this._addNewRoom(tx);

    if (new_room) {
      this._addChatRoomToSelector(this.chat.rooms.length-1);
      this._renderMessagesToDOM(new_room.room_id);
      $('.chat_chat-room-selector').val(new_room.room_id);
    }
  }

  _addIdentifierFromAddress(room_idx, address) {
    var room = this.chat.rooms[room_idx];
    this.app.dns.fetchIdentifier(room, function (answer) {
      if (this.app.dns.isRecordValid(answer) == 0) { return; }
      dns_response = JSON.parse(answer);

      // update the information we just inserted
      if (dns_response.identifier != "") {
        room.identifiers = Object.assign({}, room.identifiers);
        room.identifiers[address] = dns_response.identifier;
      }

      this.chat.rooms[room_idx] = Object.assign(this.chat.rooms[room_idx], room);
    });
  }

  // _addMessageToRoom
  async _addMessageToRoom(tx, room_idx) {
    tx.decryptMessage();
    var txmsg = tx.returnMessage();
    let { room_id, publickey, message, sig } = txmsg

    for (let i = this.chat.rooms[room_idx].messages.length - 1; i >= 0; i--) {
      if (this.chat.rooms[room_idx].messages[i].id == sig ) { return }
    }

    this.chat.rooms[room_idx].messages.push({id: sig, author: publickey, message});
    this.chat.rooms[room_idx].messages[this.chat.rooms[room_idx].messages.length-1].author = await this._getIdentifier(publickey);
    this._attachMessage(tx, room_id);
  }

  _addHelpEvent(room_id) {
    this._addMessage(room_id, {
      author: "",
      message: "<div style=\"line-height:26px\">This is a decentralized chat application. Users exchange connection information over the blockchain, and then exchange messages off-blockchain as fee-free transactions.<p style=\"margin-top:8px\"></p>To add a user, use the \"add\" keyword followed by either their publickey or Saito email address. A private channel will be opened using a single onchain transaction. Once a channel is created you MUST post messages for this user in the channel to guarantee deliverability.<p style=\"margin-top:8px\"></p>Please note: if you have exchanged secret keys with someone using the Saito email client, this application will use that shared secret to encrypt your communications with that user.</div>"
    });
    this._renderMessagesToDOM(room_id);
  }

  async _addCreateRoomEvent(msg, room_id) {
    //
    // create room and add users
    //
    // "add 21959827AE41923837D498234CE4719238123"
    // "add chrome@saito"
    // "add chrom@saito firefox@saito 'Secret Room'"
    //
    let room_data = this._getRoomDataFromMessage(msg);
    let { addresses, name } = room_data;

    let publickeys = addresses.map(async (address) => {
      if (this.app.crypto.isPublicKey(address)) { return address }
      else {
        try {
          if (address.match(/[@|<>]/)) {
            return await this._getPublicKey(address);
          } else {
            // this is just someone trying to send a message with 'add' at the beginning
            this._addSendEvent(msg, room_id);
          }
        } catch(err) {
          alert(err);
          return;
        }
      }
    });

    publickeys = await Promise.all(publickeys);
    publickeys.push(this.app.wallet.returnPublicKey());

    this._sendCreateRoomRequest(publickeys, name);
  }

  _getRoomDataFromMessage(msg) {
    let split = msg.match(/'([^']+)'/);
    let name = split ? split[1] : "";

    msg = msg.replace(/'([^']+)'/, "");
    let addresses = msg.substring(4).split(" ");
    if (addresses[addresses.length - 1] == "") { addresses.pop(); }

    return { addresses, name };
  }

  async _addSendEvent(message, room_id) {
    //
    // if we reach this part of the function, we are NOT adding
    // a new user to our chat application, which means we want
    // to send a message to whatever room we are in through an
    // off-chain peer-to-peer message
    //
    // note the inclusion of the "chat send message" request within
    // the transaction as well as outside in the request. This is a
    // convenience so we can use the same function to handle off-chain
    // and onchain messages.
    //
    //
    if (message.length > 2000) message = message.substring(0,2000);
    var newtx = this._createMessage(room_id, message);

    var newmsg = {
      id: newtx.transaction.sig,
      author: this._returnAuthor(),
      message
    };

    // render and scroll
    this._addMessage(room_id, newmsg);
    this._renderMessagesToDOM(room_id);
    this._scrollToBottom();

    $('.chat_new-message-input').val('');

    this._sendMessage(newtx);

    return false;
  }

  attachEvents(app) {
    $('.chat_new-message-input').off();
    $('.chat_new-message-input').on('keypress', (e) => {
      if ((e.which == 13 || e.keyCode == 13) && !e.shiftKey) {
        e.preventDefault();

        var msg = $('.chat_new-message-input').val();
        var room_id = $('.chat_chat-room-selector').val();

        $('.chat_new-message-input').val("");

        if (msg == '') { return }

        switch(msg.substr(0, msg.indexOf(' '))) {
          case 'help':
            this._addHelpEvent(room_id);
            break;

          case 'add':
            if (msg.length > 4) { this._addCreateRoomEvent(msg, room_id); }
            break;

          default:
            this._addSendEvent(msg, room_id);
            break;
        }
        return false;
      }
    });

    var chat_self = this;
    $('.chat_chat-room-selector').off();
    $('.chat_chat-room-selector').change(function () {
      chat_self._renderMessagesToDOM($(this).val());
      chat_self._scrollToBottom();
    });


    $('.orange_button').off();
    $('.orange_button').on('click', function(e) {
        let p = prompt('Provide email address or publickey of user to add:');
        if (p != null) {
          let cmd = "add "+p;
          $('.chat_new-message-input').val(cmd);
          var e = jQuery.Event("keypress");
          e.which = 13;
          $('.chat_new-message-input').trigger(e);
        }
    });
  }

  _formatMessage({id, author, message}){
    if (author == "") {
      return `
      <p id="#message_id_${id}" class="chat_message">
        ${message}
      </p>
    `;
    }
    if (this.app.crypto.isPublicKey(author)) { author = author.substring(0,8); }
    if (id == 0) {
      return `
    <pre id="#message_id_${id}" class="intro_message">
<i class="message_author">${author}</i>: ${message}
    </pre>
    `;
    }
    return `
    <pre id="#message_id_${id}" class="chat_message">
<i class="message_author">${author}</i>: ${message}
    </pre>
    `;
  }

  _attachMessage(tx, room_id) {
    // browsers only
    if (this.app.BROWSER == 0) { return; }

    if (room_id == $('.chat_chat-room-selector').val()) {
      this._renderMessagesToDOM(room_id);
    }

    // Need to include notifications eventually
    // let notification = { id: `notification_${room_id}`, author: publickey, message: message }
    // this.chat.rooms[0].messages.push(notification)

    this._scrollToBottom();
    this.attachEvents(this.app);
  }

  _scrollToBottom() { $("#chat_main").animate({ scrollTop: $('#chat_main').prop("scrollHeight")}, 100); }

  _renderMessagesToDOM(room_id) {
    var messageListParent = $('.chat_messages-list').parent();
    $('.chat_messages-list').remove()
    var messageList = $(`<ul class="chat_messages-list" id=${room_id}></ul>`);

    let room = this._returnRoomByID(room_id);
    room.messages.forEach((message) =>  {
      messageList.append(this._formatMessage(message));
    });

    messageListParent.append(messageList);
  }

  _getIdentifier(author) {
    // use of reject? getAuthor?
    return new Promise((resolve, reject) => {
      this.app.dns.fetchIdentifier(author, (answer) => {
        author = this.app.dns.isRecordValid(answer) ?  JSON.parse(answer).identifier : author.substring(0,8);
        resolve (author);
      });
    });
  }

  _getPublicKey(identifier) {
    return new Promise((resolve, reject) => {
      this.app.dns.fetchPublicKey(identifier, (answer) => {
        if (this.app.dns.isRecordValid(answer) == 0) {
          reject("We cannot find the public key of that address");
        }
        resolve(JSON.parse(answer).publickey);
      });
    });
  }

}

module.exports = Chat;

