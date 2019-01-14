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
      res.sendFile(__dirname + '/web/splash.html');
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

    expressapp.get('/chat/:publickey', async (req, res) => {
      // for security, pass TX signature as a header???
      // need a way to stop people from requesting other people's chat logs

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
    console.log(this.chat.rooms);
    let url = `${this._getChatURL()}/chat/${this.app.wallet.returnPublicKey()}`
    try {
      axios.get(url).then((response) => {
        this.chat = response.data;

        if (this.app.BROWSER == 1) {
          for (let i = this.chat.rooms.length - 1; i >= 0; i--) {
            this._addChatRoomToSelector(i);
          }
          this._renderMessagesToDOM(this.public_room_id);
          this._scrollToBottom();
        }
      });

    } catch(err) {
      console.log(err);
    }
  }

  _addChatRoomToSelector(i) {
    let { room_id, name, addresses } = this.chat.rooms[i];
    if (name === "") { name = addresses[0] === this.app.wallet.returnPublicKey() ? addresses[1] : addresses[0] }
    $('.chat_chat-room-selector').append(
      `<option class="chat_chat-room-option" value="${room_id}">${name}</option>`
    );
  }

  _addMessage(room_id, newmsg) {
    for (let i = 0; i < this.chat.rooms.length; i++) {
      if (this.chat.rooms[i].room_id == room_id) {
        this.chat.rooms[i].messages.push(newmsg);
      }
    }
  }

  // receiveChatAddUser(tx, app, counter=0, set_counter=1, to_address) {
  //   if (tx != null) {
  //     var new_room = this._addNweRoom(tx);
  //     this._addChatRoomToSelector(this.chat.rooms.length-1);
  //   }
  //   this._sendResponseChatAddUser(app, counter, set_counter, to_address);
  // }

  _handleResponseAddUser(app, tx) {
    var new_room = this._addNewRoom(app, tx);

    if (new_room) {
      this._addChatRoomToSelector(this.chat.rooms.length-1);
      this._renderMessagesToDOM(new_room.room_id);
    }
  }

  _addIdentifierFromAddress(room_idx, address_idx) {
    this.app.dns.fetchIdentifier(this.chat.rooms[room_idx], function (answer) {
      if (this.app.dns.isRecordValid(answer) == 0) { return; }
      dns_response = JSON.parse(answer);

      // update the information we just inserted
      if (dns_response.identifier != "") {
        this.chat.rooms[room_idx].addresses[address_idx] = dns_response.identifier;
      }
    });
  }

  // should change this from "friend" to "room"
  _addFriendToUI() {

    // this.app.dns.fetchIdentifier(newfriend.publickey, function (answer) {

    //   console.log("\n\n\nUpdating Chat App with NAME");
    //   if (this.app.dns.isRecordValid(answer) == 0) { return; }

    //   dns_response = JSON.parse(answer);

    //   // update the information we just inserted
    //   if (dns_response.identifier != "") {
    //     this.chat.rooms[inserted_chatroom_idx].name = dns_response.identifier;

    //     // change to room_id
    //     this._renderMessagesToDOM(newfriend.publickey);
    //     this.saveChat();
    //   }

    //   // update selector
    //   $('.chat_chat-room-option').each(function() {
    //     if ($(this).val() == newfriend.publickey) {
    //       console.log("\n\n\nMATCH ON: " + $(this).val() + " -- " + $(this).html());
    //       $(this).html(dns_response.identifier);
    //     }
    //   });

    //   $('.chat_chat-room-selector').val(newfriend.publickey);
    //   $('.chat_chat-room-selector').change();

    // });
  }

  receiveChatSendMessage(tx, room_idx, app) {
    console.log("TRANSACTION RECEIVED: " + JSON.stringify(tx));
    tx.decryptMessage();
    var txmsg = tx.returnMessage();

    let {room_id, publickey, message, sig} = txmsg

    var newmsg = { id: sig, author: publickey.substring(0,8), message };
    this.chat.rooms[room_idx].messages.push(newmsg);
    this.attachMessage(tx, room_id, app);
  }

  _addHelpEvent(room_id) {
    this._addMessage(room_id, {
      author: "",
      message: "<div style=\"line-height:26px\">This is a decentralized chat application. Users exchange connection information over the blockchain, and then exchange messages off-blockchain as fee-free transactions.<p style=\"margin-top:8px\"></p>To add a user, use the \"add\" keyword followed by either their publickey or Saito email address. A private channel will be opened using a single onchain transaction. Once a channel is created you MUST post messages for this user in the channel to guarantee deliverability.<p style=\"margin-top:8px\"></p>Please note: if you have exchanged secret keys with someone using the Saito email client, this application will use that shared secret to encrypt your communications with that user.</div>"
    });
    this._renderMessagesToDOM(room_id);
  }

  _addCreateRoomEvent(msg) {
    //
    // add users
    //
    // "add 21959827AE41923837D498234CE4719238123"
    // "add chrome@saito"
    //
    var pubkey_to_add = msg.substring(4);
    if (this.app.crypto.isPublicKey(pubkey_to_add)) {
      this._requestChatAddUser(this.app, [this.app.wallet.returnPublicKey(), pubkey_to_add]);
    } else {
      // need to fix this
      this.app.dns.fetchPublicKey(pubkey_to_add, (answer) => {
        if (this.app.dns.isRecordValid(answer) == 0) {
          alert("We cannot find the public key of that address");
          return;
        }
        dns_response = JSON.parse(answer);
        this._requestChatAddUser(this.app, [this.app.wallet.returnPublicKey(), dns_response.publickey]);
      });
      $('.chat_new-message-input').val('');
    }
  }

  _addSendEvent(message, room_id) {
    //
    // if we reach this part of the function, we are NOT adding
    // a new user to our chat application, which means we want
    // to send a message to whatever Room we are in through an
    // off-chain peer-to-peer message
    //
    // note the inclusion of the "chat send message" request within
    // the transaction as well as outside in the request. This is a
    // convenience so we can use the same function to handle off-chain
    // and onchain messages.
    //
    // TODO
    //
    // we need to get the public key of the person we are sending stuff to
    //
    var author = this._returnAuthor();
    var newtx = this.sendChatMessage(room_id, message);

    var newmsg = {
      id: newtx.transaction.sig,
      author,
      message
    };

    // render and scroll
    this._addMessage(room_id, newmsg);
    this._renderMessagesToDOM(room_id);
    this._scrollToBottom();
    this.saveChat();

    $('.chat_new-message-input').val('');
  }

  attachEvents(app) {
    $('.chat_new-message-input').off();
    $('.chat_new-message-input').on('keypress', (e) => {
      if (e.which == 13 || e.keyCode == 13) {

        var msg = $('.chat_new-message-input').val();
        var room_id = $('.chat_chat-room-selector').val();
        var chat_room = this._returnRoomByID(room_id);

        $('.chat_new-message-input').val("");

        if (msg == '') { return }

        switch(msg.substr(0, msg.indexOf(' '))) {
          case 'help':
            this._addHelpEvent(room_id);
            break;

          case 'add':
            if (msg.length > 4) { this._addCreateRoomEvent(msg); }
            break;

          default:
            this._addSendEvent(msg, room_id);
            break;
        }
      }
    });

    var chat_self = this;
    $('.chat_chat-room-selector').off();
    $('.chat_chat-room-selector').change(function () {
      console.log($(this).val());
      chat_self._renderMessagesToDOM($(this).val());
      chat_self._scrollToBottom();
    });


    $('.chat_message').off();
    $('.chat_message').on('click', function() {
      let thisid = $(this).attr('id');
      let spl = thisid.split("_");
      let au  = spl[3];

      for (let p = 0; p < chat_self.chat.rooms.length; p++) {
        var cf = chat_self.chat.rooms[p];
        if (cf.publickey == au) {
          $('.chat_chat-room-selector').val(cf.publickey);
          chat_self._renderMessagesToDOM(cf.publickey);
          return;
        }
      }
    });
  }

  formatMessage({id, author, message}){
    if (author == "") {
      return `
      <p id="#message_id_${id}" class="chat_message">
        ${message}
      </p>
    `;
    }
    return `
    <p id="#message_id_${id}" class="chat_message">
      <i>${author.substring(0,8)}</i>: ${message}
    </p>
    `;
  }

  attachMessage(tx, room_id, app) {
    // browsers only
    if (app.BROWSER == 0) { return; }

    if (room_id == $('.chat_chat-room-selector').val()) {
      this._renderMessagesToDOM(room_id);
    }

    // add notice to ALL
    // let notification = { id: `notification_${room_id}`, author: publickey, message: message }
    // this.chat.rooms[0].messages.push(notification)

    this._scrollToBottom();
    this.saveChat();

    this.attachEvents(app);
  }

  _scrollToBottom() { $("#chat_main").animate({ scrollTop: $('#chat_main').prop("scrollHeight")}, 100); }

  _renderMessagesToDOM(room_id){
    var messageListParent = $('.chat_messages-list').parent();
    $('.chat_messages-list').remove()
    var messageList = $(`<ul class="chat_messages-list" id=${room_id}></ul>`);

    let room = this._returnRoomByID(room_id);

    room.messages.forEach((message) => {
      messageList.append(this.formatMessage(message));
    });

    messageListParent.append(messageList);
  }

  saveChat() {
    this.app.options.chat.server = this.server;
    this.app.storage.saveOptions();
  }

}

module.exports = Chat;

