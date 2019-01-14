var saito = require('../../../saito');
var ModTemplate = require('../../template');

const axios = require('axios');

const uuidv5 = require('uuid/v5');

class ChatCore extends ModTemplate {
  constructor(app) {
    // console.log("APP PASSED TO CORE", app);
    super(app);

    this.app             = app;

    this.name            = "Chat";
    this.browser_active  = 0;

    this.chat            =  {};
    this.chat.rooms      =  [];

    this.public_room_id = '984cb2da-13c1-11e9-ab14-d663bd873d93';

    this.server = {
      host: "localhost",
      port: 12101,
      protocol: "http"
    }
  }

  installModule() {
    var chat_rooms_table =
     `CREATE TABLE IF NOT EXISTS mod_chat_rooms (\
      id INTEGER, \
      uuid TEXT, \
      publickey TEXT, \
      name TEXT, \
      tx TEXT, \
      UNIQUE(uuid, publickey), \
      PRIMARY KEY(id ASC) \
    )`;

    var chat_records_table =
     `CREATE TABLE IF NOT EXISTS mod_chat_records (\
      id INTEGER, \
      tx TEXT, \
      message TEXT, \
      author TEXT, \
      room_id TEXT, \
      sig TEXT, \
      UNIQUE (tx), \
      PRIMARY KEY(id ASC) \
    )`;

    this.app.storage.execDatabase(chat_rooms_table, {});
    this.app.storage.execDatabase(chat_records_table, {});

    let public_chatroom_params = {
      $uuid: this.public_room_id,
      $name: "ALL"
    };

    var insert_public_chatroom = `INSERT or IGNORE INTO mod_chat_rooms (uuid, name) VALUES ($uuid, $name)`;
    this.app.storage.execDatabase(insert_public_chatroom, public_chatroom_params);
  }

  initialize() {
    let url = `${this._getChatURL()}/chat/${this.app.wallet.returnPublicKey()}`
    try {
      axios.get(url).then((response) => {
        this.chat = response.data;
        console.log(this.chat);
      });
    } catch(err) {
      console.log(err);
    }
  }

  _getChatURL() {
    return `${this.server.protocol}://${this.server.host}:${this.server.port}`
  }

  ///////////////////////
  // handlePeerRequest //
  ///////////////////////
  //
  // zero-fee transactions sent directly to us by chat-peers end up
  // here. we handle them just like paid transactions sent over the
  // blockchain. paid & free are interchangeable.
  //
  handlePeerRequest(app, req, peer, mycallback) {
    if (req.request == null) { return; }
    if (req.data == null) { return; }

    switch(req.request) {
      case "chat load posts":
        this.loadPosts(app, req, peer);
        break;
      case "chat send message":
        var tx = new saito.transaction(req.data.tx);
        if (tx == null) { return;}
        this._receiveMessage(app, tx, req, peer);
        break;
      case "chat request add user":
        var tx = new saito.transaction(req.data.tx);
        if (tx == null) { return; }
        this._responseChatAddUser(app, tx, peer);
        break;
      case "chat response add user":
        var tx = new saito.transaction(req.data.tx);
        if (tx == null) { return; }
        if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {
          this._handleResponseAddUser(app, tx);
        }
        break;
      default:
        break;
    }
  }

  // to complete ADD USER functionality,
  // requestChatAddUser --> requests a new session with a publickey
  // responseChatAddUser --> receives request, finds the information, then returns newfriend info
  // receiveNewFriend --> receives information on newfriend and renders the UI

  ////////////////////
  // onConfirmation //
  ////////////////////
  //
  // paid transactions sent over the blockchain end up here. we
  // handle them just like zero-fee transactions sent peer-to-peer
  //
  // zero-fee transactions are sent in here with BLK=null and conf==0
  // so do not edit this to require the chat functionality to require
  // anything else.
  //
  onConfirmation(blk, tx, conf, app) {
    var chat_self = app.modules.returnModule("Chat");

    if (conf == 0) {
      var txmsg = tx.returnMessage();
      if (txmsg.request == "chat send message") {
        let room_idx = this._returnRoomIDX(txmsg.room_id);
        if (room_idx === parseInt(room_idx, 10)) {
          // pure view logic, everything else is handled in "receiveMessage"
          chat_self.receiveChatSendMessage(tx, room_idx, app);
          return;
        }
      } else if (app.network.hasPeer(tx.transaction.to[0].add)) {
        if (txmsg.request == "chat add user") {
          chat_self.receiveChatAddUser(tx, app, txmsg.counter, 1, tx.transaction.from[0].add);
          return;
        }
      }
    }
  }

  _receiveMessage(app, tx, req, peer) {
    tx.decryptMessage(this.app);
    var txmsg = tx.returnMessage();

    console.log("\n\n\nCHAT SEND MESSAGE 1: " + JSON.stringify(txmsg));

    if (txmsg.publickey == this.app.wallet.returnPublicKey()) { return; }
    if (this.app.server.server.host !== "") {
      var newtx = this._createChatTX(app, tx, txmsg);
      if (newtx == null) { return; }
      this._checkAndSendMessageToPeers(newtx);
      return;
    }

    this.onConfirmation(null, tx, 0, app);
  }

  _createChatTX(app, tx, txmsg) {
    // room_publickey??
    let { room_id, room_publickey, publickey, message, sig } = txmsg;

    var newtx = app.wallet.createUnsignedTransaction(room_publickey, 0.0, 0.0);
    if (newtx == null) { return null; }

    newtx.transaction.msg = {
      module: "Chat",
      request: "chat send message",
      room_id: room_id,
      publickey: publickey,
      message: message,
      sig: sig,
      tx: JSON.stringify(tx.transaction)
    }

    // best way to encrypt this???
    newtx.transaction.msg = app.keys.encryptMessage(app.wallet.returnPublicKey(), newtx.transaction.msg);
    newtx = app.wallet.signTransaction(newtx);

    return newtx
  }

  _checkAndSendMessageToPeers(newtx) {
    let req = { request: "chat send message", data: { tx: JSON.stringify(newtx.transaction ) } };
    this.app.network.sendRequest(req.request, req.data);
    this._addToConversation(newtx);
  }

  _addToConversation(newtx) {
    var { room_id, publickey, message, sig } = newtx.returnMessage();

    if (this.app.BROWSER == 0) {
      var sql = "INSERT OR IGNORE INTO mod_chat_records (room_id, author, message, sig, tx) VALUES ($room_id, $author, $message, $sig, $tx)";
      var params = {
        $room_id: room_id,
        $author: publickey,
        $message: message,
        $sig: sig,
        $tx: JSON.stringify(newtx.transaction)
      }
      this.app.storage.execDatabase(sql, params, function() {});
    }
  }

  _addUser(app, tx) {
    var email_self = app.modules.returnModule("Email");
    email_self.onConfirmation(null, tx, 0, app);
  }

  _addNewRoom(app, tx) {
    let txmsg = tx.returnMessage();
    let { room_id, addresses } = txmsg;

    if (this.chat.rooms.find(room => room.room_id == room_id)) { return; }

    for (let i = 0; i < addresses.length; i++) {
      if (addresses.length == 2) {
        var name = addresses[0] === this.app.wallet.returnPublicKey() ? addresses[1] : addresses[0]
      }
    }

    var new_room = {
      room_id,
      name,
      addresses,
      messages: []
    }

    this.chat.rooms.push(new_room);

    return new_room
  }

  _requestChatAddUser(app, addresses) {
    let to_address = this.app.network.peers[0].peer.publickey;

    var newtx = this.app.wallet.createUnsignedTransaction(to_address, 0.0, 0.0);
    if (newtx == null) { return; }

    newtx.transaction.msg = {
      module: "Chat",
      request: "chat request add user",
      addresses
    }

    newtx.transaction.msg 	      = this.app.keys.encryptMessage(this.app.wallet.returnPublicKey(), newtx.transaction.msg);
    newtx.transaction.msg.sig     = this.app.wallet.signMessage(JSON.stringify(newtx.transaction.msg));

    newtx = this.app.wallet.signTransaction(newtx);

    var data = {};
    data.tx = JSON.stringify(newtx.transaction); // send only tx part

    this.app.network.sendRequest("chat request add user", data);
  }

  _responseChatAddUser(app, tx, peer) {
    let txmsg = tx.returnMessage()
    for (let i = 0; i < txmsg.addresses.length; i++) {
      if (app.network.hasPeer(txmsg.addresses[i])) {
        this._createResponseChatAddUser(app, tx, peer);
      } else {
        console.log("We need to make an on chain broadcast to see where it is. THis should be handled by the proxy module");
        // proxy module should request the user to pay for the cost of broadcasting if they're feeling greedy
      }
    }

  }

  _createResponseChatAddUser(app, tx, peer) {
    if (this.app.server == null) { return; }
    if (this.app.server.server.host == "") { return; }
    // just use app.BROWSER, tool

    // new function
    // create new chat room and deliver info on that

    var txmsg = tx.returnMessage();
    var { addresses } = txmsg;

    addresses.sort((a,b) => a.localeCompare(b));

    if (addresses.length == 2) {
      // create new room id
      var new_room_uuid  = uuidv5(addresses.join(), this.public_room_id);
    } else {

    }
    for (let i = 0; i < addresses.length; i++) {
      var to_address = addresses[i];

      var room_sql = "INSERT OR IGNORE into mod_chat_rooms (uuid, name, publickey, tx) VALUES ($uuid, $name, $publickey, $tx)"
      var params = {
        $uuid: new_room_uuid,
        $name: "",
        $publickey: to_address,
        $tx: JSON.stringify(tx)
      }

      this.app.storage.db.run(room_sql, params);

      var newtx = app.wallet.createUnsignedTransaction(to_address, 0.0, 0.0)
      newtx.transaction.msg = {
        module: "Chat",
        request: "chat response add user",
        room_id: new_room_uuid,
        name: "",
        addresses
      }
      newtx.transaction.msg = app.keys.encryptMessage(to_address, newtx.transaction.msg);
      newtx = app.wallet.signTransaction(newtx);

      var data = {};
      data.tx = JSON.stringify(newtx.transaction); // send only tx part

      app.network.sendRequest("chat response add user", data);
    }
  }

  _handleResponseAddUser(app, tx) {
    var newfriend = this._addNewRoom(app, tx);
    this._addFriendToUI(app, newfriend);
  }

  sendChatMessage(chat_room_id, msg) {
    var newtx = this.app.wallet.createUnsignedTransaction(this.app.network.peers[0].peer.publickey, 0.0, 0.0);
    if (newtx == null) { return; }

    newtx.transaction.msg = {
      module:"Chat",
      request: "chat send message",
      publickey: this.app.wallet.returnPublicKey(),
      room_id: chat_room_id,
      message: this.app.keys.encryptMessage(this.app.wallet.returnPublicKey(), msg)
    };

    newtx.transaction.msg 	      = this.app.keys.encryptMessage(this.app.wallet.returnPublicKey(), newtx.transaction.msg);
    newtx.transaction.msg.sig     = this.app.wallet.signMessage(msg);
    newtx = this.app.wallet.signTransaction(newtx);

    var data = {};
    data.tx = JSON.stringify(newtx.transaction); // send only tx part

    this.app.network.sendRequest("chat send message", data);

    return newtx
  }

  _returnAuthor() {
    var author = this.app.wallet.returnPublicKey().substring(0,8);
    if (this.app.wallet.returnIdentifier() != "") { author = this.app.wallet.returnIdentifier(); }
    return author
  }

  _returnRoomByID(room_id) {
    return this.chat.rooms.find(room => room.room_id == room_id);
  }

  _returnRoomIDX(room_id) {
    for (let i = 0; i < this.chat.rooms.length; i++) {
      if (this.chat.rooms[i].room_id == room_id) { return i; }
    }
    return null;
  }

  saveChat() {
    for (var obj in this.chat.records) {
      if (this.chat.records[obj].length >= 8) {
        this.chat.records[obj].reverse();
        this.chat.records[obj] = this.chat.records[obj].splice(0, 8);
        this.chat.records[obj].reverse();
      }
    }

    this.app.options.chat = this.chat;
    this.app.storage.saveOptions();
  }
}

module.exports = ChatCore