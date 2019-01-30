const saito = require('../../../saito');
const ChatCore = require('./chat_core.js');
var ColorHash = require('color-hash');
const axios = require('axios');
const linkifyHtml = require('linkifyjs/html');

//////////////////
// CONSTRUCTOR  //
//////////////////
// function Chat(app) {
class Chat extends ChatCore {

  constructor(app) {
    super(app);

    this.handlesEmail    = 1;
    this.emailAppName    = "Settings";

    this.settings = {};
    this.settings.popup = true;
    this.settings.notifications = true;

    if (this.app.options.chat) {
      this.settings = Object.assign(this.settings, this.app.options.chat.settings);
    }
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
      if (this.app.network.peers[0]) {
        this.server = this.app.network.peers[0];

        axios.get(`${this._getChatURL()}/chat/${this.app.wallet.returnPublicKey()}`)
          .then(async (response) => {
            this.chat = response.data;
            this._initializeChat();
          })
          .catch((err) => {
            console.log(err.message);
          });

        clearInterval(this.server_processing);
      }
    }, 250);
  }

  async _initializeChat() {
    if (this.app.BROWSER == 1) {
      for (let i = this.chat.rooms.length - 1; i >= 0; i--) {
        var messages = this.chat.rooms[i].messages.map(async (message) => {
          let local_id = Object.assign({ identifiers: [] },
            this.app.keys.findByPublicKey(message.author));
          if (local_id.identifiers.length > 0) {
            message.author = local_id.identifiers[0];
          } else {
            let publickey = message.author;

            try {
              message.author = await this._getIdentifier(message.author);
            } catch(err) {
              console.log(err);
            }

            this.app.keys.addKey(publickey, message.author);
          }
          message.timestamp = JSON.parse(message.tx).ts;
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
  }

  _welcomeMessage() {
    let ts = new Date()
    return {
      id : 0,
      timestamp: `${ts.getHours()}:${("0"+ts.getMinutes()).substr(-2)}`,
      author: 'BearGuy',
      message:
      `Welcome to Saito Chat! \n\n
Here are some commands to get you started \n\n
<b>add 21959827AE41923837D498234CE4719</b>\n
-- start private chat with someone's public key \n\n
<b>add david@saito</b> \n
-- start private chat with someone's identifier \n\n
<b>add david@saito richard@saito 'Saito Squad'</b> \n
-- start group chat and name it (make sure to use single quotes) \n\n
Happy Chatting!`
    }
  }

  async _setRoomName(i) {
    let { room_id, name, addresses } = this.chat.rooms[i];
    if (addresses.length == 2) {
      if (name === "") { name = addresses[0] === this.app.wallet.returnPublicKey() ? addresses[1] : addresses[0] }
    }
    if (this.app.crypto.isPublicKey(name)) {
      this.chat.rooms[i].name = await this._getIdentifier(name);
    }
  }

  async _addChatRoomToSelector(i) {
    await this._setRoomName(i);
    let { room_id, name } = this.chat.rooms[i];
    name = name === "" ? i : name;
    $('.chat_chat-room-selector').append(
      `<option class="chat_chat-room-option" value="${room_id}">${name}</option>`
    );
  }

  _updateChatRoomSelector(room) {
    if (!room.unread_messages) { return; }
    let room_option = $('.chat_chat-room-option').filter(function() { return this.value == room.room_id });
    let chat_room_text = room.unread_messages.length == 0 ? `${room.name}` : `(${room.unread_messages.length}) ${room.name}`;
    let color = room.unread_messages.length == 0 ? 'grey' : '#ff8844';
    $('.chat_chat-room-selector').css(`border`, `1px solid ${color}`)
    room_option.text(chat_room_text);
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
      this._createChatNotification(
        `New Room created: ${new_room.name}`,
        "",
        () => this._onclickChatNotification(new_room.room_id)
      );
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

    this.chat.rooms[room_idx].messages.push({id: sig, timestamp: tx.transaction.ts, author: publickey, message});
    this.chat.rooms[room_idx].messages[this.chat.rooms[room_idx].messages.length-1].author = await this._getIdentifier(publickey);

    let lastMessage = Object.assign({}, this.chat.rooms[room_idx].messages[this.chat.rooms[room_idx].messages.length-1]);

    this._sendNewMessageNotification(room_idx, lastMessage);
    this._attachMessage(tx, room_id);
  }

  _createChatNotification(title, message, onClickFunction) {
    if (this.settings.notifications) {
      let notify = this.app.browser.notification(title, message);
      notify.onclick = onClickFunction;
    }
  }

  _sendNewMessageNotification(room_idx, lastMessage) {
    let room = this.chat.rooms[room_idx];

    // pull these from DOM
    let current_room = $('.chat_messages-list')[0];
    let isPopupHidden = $('.mail_chat_popup').css("bottom") == "40px";

    if ((current_room.id != room.room_id || isPopupHidden || !document.hasFocus()) && room.room_id != this.public_room_id)  {
      let notification_title = lastMessage.author == room.name ? `${lastMessage.author}` :
        `${lastMessage.author} in ${room.name}`


      this._createChatNotification(
        notification_title,
        lastMessage.message,
        () => this._onclickChatNotification(room.room_id)
      );

      // add to unread messages
      if (!this.chat.rooms[room_idx].unread_messages) {
        this.chat.rooms[room_idx].unread_messages = [];
      }
      this.chat.rooms[room_idx].unread_messages.push({lastMessage});
      this._updateChatRoomSelector(this.chat.rooms[room_idx]);
    }

  }

  _onclickChatNotification(room_id) {
    window.focus();
    let isPopupHidden = $('.mail_chat_popup').css("bottom") == "40px";
    this._renderMessagesToDOM(room_id);
    if (isPopupHidden) { this._showMailchat(); }
    this._scrollToBottom();
    $('.chat_new-message-input').select();
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
      timestamp: newtx.transaction.ts,
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
    Notification.requestPermission();

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


    $('.chat_orange_button').off();
    $('.chat_orange_button').on('click', function(e) {
        let p = prompt('Provide email address or publickey of user to add:');
        if (p != null) {
          let cmd = "add "+p;
          $('.chat_new-message-input').val(cmd);
          var e = jQuery.Event("keypress");
          e.which = 13;
          $('.chat_new-message-input').trigger(e);
        }
    });

    $('#chat_header').off();
    $('#chat_header').on('click', function(e) {
      if ($('#chat_container').width() == 400) {
        // check we are not chat-selector
        if ($(e.target).is(".chat_chat-room-selector") ||
            $(e.target).is(".chat_chat-room-option") ||
            $(e.target).is(".chat_orange_button")) {
              return;
            }

        chat_self._toggleMailchat();
      }
    });
  }

  _formatMessage({id, timestamp, author, message}){
    message = linkifyHtml(message);

    let d = new Date(timestamp);
    if (author == "") {
      return `
      <p id="#message_id_${id}" class="chat_message">
        ${message}
      </p>
    `;
    }
    var colorHash = new ColorHash({lightness: 0.35});
    var color = colorHash.hex(author);
    if (this.app.crypto.isPublicKey(author)) { author = author.substring(0,8); }
    if (id == 0) {
      return `
      <div class="chat_message_container">
    <pre id="#message_id_${id}" class="intro_message">
<i class="message_author" style="color: ${color};">${author}</i>: ${message}
    </pre>
    <p class="chat_timestamp">${timestamp}</p>
      </div>
    `;
    }
    return `
      <div class="chat_message_container">
    <pre id="#message_id_${id}" class="chat_message">
<i class="message_author" style="color: ${color};">${author}</i>: ${message}
    </pre>
    <p class="chat_timestamp">${d.getHours()}:${("0" + d.getMinutes()).substr(-2)}</p>
      </div>
    `;
  }

  _attachMessage(tx, room_id) {
    // browsers only
    if (this.app.BROWSER == 0) { return; }

    if (room_id == $('.chat_chat-room-selector').val()) {
      this._renderMessagesToDOM(room_id);
    }

    this._scrollToBottom();
    this.attachEvents(this.app);
  }

  _scrollToBottom() { $("#chat_main").animate({ scrollTop: $('#chat_main').prop("scrollHeight")}, 100); }

  _toggleMailchat() {
    // otherwise toggle divs
    if ($('.mail_chat_popup').css('bottom') == '500px') {
      this._hideMailchat();
    } else {
      this._showMailchat();
    }
  }

  _showMailchat() {
    $('.mail_chat_popup').css('bottom','500px');
    setTimeout(() => {
      $('.chat_chat_main').show();
      $('#chat_new-message').show();
      $('.chat_chat-room-selector').show();
      $('.chat_orange_button').show();
      $('#chat_header').css('background-color','#fff');
      $('#chat_saitoText').css('color','#444');
    }, 0);
  }

  _hideMailchat() {
    $('.mail_chat_popup').css('bottom','40px');
    setTimeout(() => {
      $('.chat_chat_main').hide();
      $('#chat_new-message').hide();
      $('.chat_chat-room-selector').hide();
      $('.chat_orange_button').hide();
      $('#chat_header').css('background-color','#fff');
      $('#chat_saitoText').css('color','#a5a5a5');
    }, 0);
  }

  _disableMailchat() {
    $('.mail_chat_popup').hide();
    $('.sidechat').hide()
    $('.sidechat_controls').hide()
  }

  _enableMailchat() {
    this._showMailchat();
    $('.mail_chat_popup').show();
    $('.sidechat').show();
    $('.sidechat_controls').show();
    this._scrollToBottom();
  }

  _renderMessagesToDOM(room_id) {
    var messageListParent = $('.chat_messages-list').parent();
    $('.chat_messages-list').remove()
    var messageList = $(`<ul class="chat_messages-list" id=${room_id}></ul>`);

    let room = this._returnRoomByID(room_id);
    room.messages.forEach((message) =>  {
      messageList.append(this._formatMessage(message));
    });
    if (room.unread_messages){
      room.unread_messages = [];
    }

    this._updateChatRoomSelector(room);
    $('.chat_chat-room-selector').val(room_id);

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




  /**
   * EMAIL FUNCTIONALITY
   */

   displayEmailForm() {
    let element_to_edit = $('#module_editable_space');
    let {notifications, popup} = this.settings;

    let notifications_check = notifications ? `checked="${notifications}"` : '';
    let popup_check = popup ? `checked="${popup}"` : '';

    let html =  `
      <div id="module_instructions" class="module_instructions">
        <div>
          <input class="chat_checkbox_settings" type="checkbox" ${notifications_check} name="notifications"> Notifications<br>
          <input class="chat_checkbox_settings" type="checkbox" ${popup_check} name="popup"> Chat popup<br>
        </div>
      </div>
    `

    element_to_edit.html(html);
    $('.lightbox_compose_address_area').hide();
    $('.lightbox_compose_module').hide();
    $('#module_textinput').focus();
    $('#module_instructions').css('padding-top','4px');

    let chat_self = this;

    $('.chat_checkbox_settings').on('click', function (event) {
      let {name} = this;
      chat_self.settings[name] = !chat_self.settings[name];
      $(this).prop('checked', chat_self.settings[name]);
      // : this.prop('checked', false);
      switch (name) {
        case 'popup':
          chat_self.settings[name] ? chat_self._enableMailchat() : chat_self._disableMailchat();
          break;
        case 'notifications':
          if (chat_self.settings[name]) {
            if (Notification.permission === "denied") {
              alert("Notifications blocked. Please enable them in your browser.");
            } else {
              alert('Notifications will show for new chat rooms and messages');
              Notification.requestPermission();
            }
          }
        default:
          break;
      }
      chat_self._saveChat();
    });
   }


  /**
  * MAILCHAT INTEGRATION
  */

  addPopUpChat() {
    if ($(window).width() < 600){
      return;
    }

    $('body').append(`
    <div class="mail_chat_popup" style="display:none">

      <div id="Chat_browser_active"></div>
      <div id="chat_container">

        <section id="chat_header">
          <div style="display:flex; flex-direction: row;width: 207px;">
            <img id="chat_saitoLogo" src="/img/saito_logo_black.png" />
            <div id="chat_saitoText" style="font-family:Georgia;padding-top:5px;color:#444;">chat</div>
          </div>
          <button class="chat_orange_button">add</button>
          <select class="chat_chat-room-selector">
          </select>
        </section>

        <div id="chat_main" class="chat_chat_main">
          <section id="chat_messages-list">Messages:</section>
          <section id="chat_messages-list">
            <ul class="chat_messages-list" id="All">
              <p id="chat_message_id_0" class="chat_message"><i>BearGuy</i>: Welcome to Saito!</p>
            </ul>
          </section>
        </div>

        <section id="chat_new-message">
          <textarea class="chat_new-message-input" id="chat_new-message-input"></textarea>
        </section>

      </div>
    </div>
    `);
    this.attachEvents(this.app);
    this.settings.popup ? this._enableMailchat() : this._disableMailchat();
  }

  addSideChat() {
    $('.sidebar').append(
      `
      <div class="sidechat" id="sidechat"></div>
      <div class="sidechat_controls" id="sidechat_controls">
        <div class="sidechat_controls_add" id="sidechat_controls_add">add</div>
        <div class="sidechat_controls_info" id="sidechat_controls_info">info</div>
      </div>
      `
    );
    this.attachEvents(this.app);
    if (!this.settings.popup) { this._disableMailchat() }
  }

}

module.exports = Chat;

