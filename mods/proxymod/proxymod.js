//
// This module provides zero-conf message 
// forwarding so that lite-clients can 
// handle onPeerRequest messages through
// intermediaries
//
var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');


//////////////////
// CONSTRUCTOR  //
//////////////////
function ProxyMod(app) {

  if (!(this instanceof ProxyMod)) { return new ProxyMod(app); }

  ProxyMod.super_.call(this);

  this.app             = app;
  this.name            = "ProxyMod";
  this.browser_active  = 0;

  this.handlesEmail    = 1;
  this.emailAppName    = "ProxyMod";

  this.db 		 = null;

  return this;

}
module.exports = ProxyMod;
util.inherits(ProxyMod, ModTemplate);




/////////////////////
// Email Functions //
/////////////////////
ProxyMod.prototype.displayEmailForm = function displayEmailForm(app) {

  element_to_edit = $('#module_editable_space');
  element_to_edit.html('<div class="module_instructions">Click send to inform the recipient that you have a Proxy Module installed.</div>');
  $('.lightbox_compose_payment').val(app.wallet.returnDefaultFee());

}
ProxyMod.prototype.formatEmailTransaction = function formatEmailTransaction(tx, app) {

  link_id    = "encrypt_authorize_link_"+this.email_view_txsig;

  tx.transaction.msg.module    = this.name;
  tx.transaction.msg.request   = "proxy exchange request";

  if (this.app.options.proxymod != undefined) {
    tx.transaction.msg.host      = this.app.options.proxymod.host;
    tx.transaction.msg.port      = this.app.oprions.proxymod.port;
    tx.transaction.msg.publickey = this.app.options.proxymod.publickey;
  }

  return tx;

}







/////////////////////////
// Handle Web Requests //
/////////////////////////
ProxyMod.prototype.webServer = function webServer(app, expressapp) {

  expressapp.get('/proxymod/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/proxymod/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/proxymod/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;
  });

}




ProxyMod.prototype.installModule = async function installModule() {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  try {

    var sqlite = require('sqlite');
    var sql = "";

    this.db = await sqlite.open('./data/proxymod.sq3');

    sql = 'CREATE TABLE IF NOT EXISTS users (\
                  id INTEGER, \
                  publickey TEXT, \
                  PRIMARY KEY(id ASC) \
          )';
    let usertable = this.db.run(sql, {});

    sql = 'CREATE TABLE IF NOT EXISTS transactions (\
                  id INTEGER, \
                  user_id INTEGER, \
                  tx TEXT, \
                  PRIMARY KEY(id ASC) \
          )';
    let txtable = this.db.run(sql, {});

    await Promise.all([usertable, txtable]);

  } catch (err) {
    console.log(err);
  }

}



ProxyMod.prototype.initialize = async function initialize() {

  /////////////
  // connect //
  /////////////
  if (this.app.options.proxymod != undefined) {
    for (let i = 0; i < this.app.options.proxymod.length; i++) {
      this.app.network.addPeer(JSON.stringify(this.app.options.proxymod[i], 0, 1, 0));
    }
  }


  ////////////////////
  // fetch messages //
  ////////////////////
  setTimeout(() => {
    if (this.app.options.proxymod != undefined) {
      for (let i = 0; i < this.app.options.proxymod.length; i++) {
        for (let j = 0; j < this.app.network.peers.length; j++) {
	  if (this.app.options.proxymod[i].host == this.app.network.peers[j].peer.host) {
	    if (this.app.options.proxymod[i].port == this.app.network.peers[j].peer.port) {

              message                 = {};
              message.request         = "proxymod load request";
              message.data            = {};
              message.data.request    = "proxymod load request";
              message.data.publickey  = this.app.wallet.returnPublicKey();

              this.app.network.peers[j].sendRequest(message.request, message.data, function () {});

	    }
	  }
        }
      }
    }
  }, 2000);


  //////////////////
  // servers only //
  //////////////////
  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }
  if (this.db == null) {
    try {
      var sqlite = require('sqlite');
      this.db = await sqlite.open('./data/proxymod.sq3');
    } catch (err) {}
  }

}

















//
// HANDLE PEER REQUEST
//
// proxy-mod connections are made on initialization through this
// handlePeerRequest function. We also forward through our peer-
// request function.
//
// This function should handle the reception of messages for the
// user as well as the proxy mod that is receiving the elements.
//
ProxyMod.prototype.handlePeerRequest = async function handlePeerRequest(app, message, peer, mycallback=null) {

  /////////////////////
  // clients receive //
  /////////////////////
  if (message.request === "proxymod load") {

    //
    // real TX will be inside SHELL tx
    //
    let recipient = message.data.recipient;
    let tx   = new saito.transaction(JSON.parse(message.data.tx));
        tx.decryptMessage(this.app);
    let txmsg = tx.returnMessage();

    //
    // is this for me?
    //
    if (recipient == this.app.wallet.returnPublicKey()) {

      //
      // get actual tx
      //
      let actual_tx = new saito.transaction(JSON.stringify(txmsg));
          actual_tx.decryptMessage(this.app);
      let actual_txmsg = actual_tx.returnMessage();

      for (let i = 0; i < app.modules.mods.length; i++) {
        if (actual_txmsg.module != undefined) {
          if (app.modules.mods[i].shouldAffixCallbackToModule(actual_txmsg.module) == 1) {
            app.modules.mods[i].onConfirmation(null, actual_tx, 0, this.app);
          }
        }
      }
      return;
    }
  }


  /////////////////////
  // server requests //
  /////////////////////
  if (message.request === "proxymod load request") {
    this.loadRequest(peer, message.data.publickey);
  }


  ///////////////////
  // servers relay //
  ///////////////////
  if (message.request === "proxymod relay request") {

    let tx = new saito.transaction(message.data.tx);
        tx.decryptMessage(this.app);
    let txmsg = tx.returnMessage();
    let recipient = message.data.recipient;

    if (recipient == this.app.wallet.returnPublicKey()) {
      let message = tx.transaction.msg;
      for (let i = 0; i < this.app.modules.mods.length; i++) {
        if (txmsg.module != undefined) {
          if (this.app.modules.mods[i].shouldAffixCallbackToModule(txmsg.module) == 1) {
            this.app.modules.mods[i].onConfirmation(null, tx, 0, this.app);
          }
        }
      }
      return;
    }

    let user_id = await this.returnUserId(recipient);
    if (user_id == null) {
      if (this.app.crypto.isPublicKey(recipient) == 1) {
        this.insertNewUser(recipient);
	user_id = await this.returnUserId(recipient);
      } else {
	return;
      }
    }

    if (user_id == null) { return; }

    await this.addUserTransaction(recipient, JSON.stringify(tx.transaction));
    for (let i = 0; i < this.app.network.peers.length; i++) {
      if (this.app.network.peers[i].peer.publickey == recipient) {
        this.loadRequest(this.app.network.peers[i], recipient);
      }
    }
  }
}





ProxyMod.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  var proxymod_self = app.modules.returnModule("ProxyMod");

  if (conf == 0) {
  
    var sender           = tx.transaction.from[0].add;
    var receiver         = tx.transaction.to[0].add;
    var txmsg            = tx.returnMessage();
    var request          = txmsg.request;  // "request"

    if (txmsg.module == "ProxyMod") {

      if (receiver == app.wallet.returnPublicKey()) {


        /////////////////////////
        // exchange proxy info //
        /////////////////////////
        if (request == "proxy exchange request") {

	  //
	  // prevent infinite loops
	  //
	  let proxy = proxymod_self.app.keys.returnProxyByPublicKey(sender);
          if (proxy != null) {
	    if (proxy.host == txmsg.host && proxy.port == txmsg.port) {
	      return;
	    }
	  }

	  if (txmsg.host == undefined && txmsg.port == undefined) { return; }
	  if (txmsg.host == "" && txmsg.port == "") { return; }

  	  proxymod_self.app.keys.addKey(sender)
	  proxymod_self.app.keys.updateProxyByPublicKey(sender, txmsg.host, txmsg.port, txmsg.publickey);
	  proxymod_self.app.keys.saveKeys();

          msg                 = {};
          msg.id              = tx.transaction.id + "_1";
          msg.from            = sender;
          msg.to              = receiver;
          msg.time            = tx.transaction.ts;
          msg.module          = "Email";
          msg.title           = "ProxyMod Update - "+receiver;
          msg.data            = "Your wallet has been updated to include the latest proxy information sent by " + receiver;
          msg.markdown = 0;

          app.modules.returnModule("Email").attachMessage(msg, app);
          app.archives.saveTransaction(tx);

	  if (app.options.proxymod != undefined) {

	    let mymsg = {};
	        mymsg.module    = "ProxyMod";
	        mymsg.request   = "proxy exchange request";
	        mymsg.host      = app.options.proxymod.host;
	        mymsg.port      = app.options.proxymod.port;
	        mymsg.publickey = app.options.proxymod.publickey;
	        mymsg           = app.keys.encryptMessage(sender, mymsg);
 
	    if (app.network.canSendOffChainMessage(sender) == 1) {
	      app.network.sendOffChainMessage(sender, mymsg);
	    } else {
              if (Big(tx.transaction.to[0].amt).gt(0)) {
	        let fee = tx.transaction.to[0].amt;
	        let newtx = app.wallet.createUnsignedTransaction(sender, 0, fee);
	        if (newtx == null) { return; }
	        newtx.transaction.msg = mymsg;
      	        newtx = app.wallet.signTransaction(newtx);
      	        app.network.propagateTransaction(newtx);
	      }
	    }
	  }
        }
      }



    }
  }
}













ProxyMod.prototype.deleteUserTransaction = function deleteUserTransaction(txid) {

  let sql    = "DELETE FROM transactions WHERE id = $id";
  let params = { $id : txid }

  try {
    this.db.run(sql, params);
  } catch(err) {
    console.log(err);
  }

}



ProxyMod.prototype.addUserTransaction = async function addUserTransaction(publickey, tx) {

  let user_id = await this.returnUserId(publickey);
  if (user_id == null) {
    this.insertNewUser(publickey);
    user_id = await this.returnUserId(publickey);
  }
  if (user_id == null) { return; }


  let sql    = "INSERT INTO transactions (user_id, tx) VALUES ($uid, $txjson)";
  let params = { $uid : user_id , $txjson : JSON.stringify(tx) };

  try {
    await this.db.run(sql, params);
  } catch(err) {
    console.log(err);
  }

}



ProxyMod.prototype.insertNewUser = async function insertNewUser(publickey) {

  let sql = "INSERT OR IGNORE INTO users (publickey) VALUES ($pkey)";
  let params = { $pkey : publickey }

  try {
    await this.db.run(sql, params);
  } catch(err) {
    console.log(err);
  }

  return;

}
ProxyMod.prototype.returnUserId = async function returnUserId(publickey) {

  let sql    = "SELECT * FROM users WHERE publickey = $pkey";
  let params = { $pkey : publickey }
  let rows   = null;
  let user_id = null;

  try {
    rows = await this.db.all(sql, params);
  } catch(err) {
    console.log(err);
    return;
  }

  if (rows != null) {
    if (rows.length != 0) {
      user_id = rows[0].id;
    }
  }

  return user_id;

}

ProxyMod.prototype.loadRequest = async function loadRequest(peer, publickey) {

  let user_id = await this.returnUserId(publickey);

  if (user_id == null) {
    this.insertNewUser(publickey);
    return;
  }

  let sql    = "SELECT * FROM transactions WHERE user_id = $uid";
  let params = { $uid : user_id }
  let rows   = null;

  try {
    rows = await this.db.all(sql, params);
  } catch(err) {
    console.log(err);
    return;
  }

  if (rows != null) {
    if (rows.length != 0) {
      for (var fat = 0; fat < rows.length; fat++) {

        let message                 = {};
        message.request         = "proxymod load";
        message.data            = {};
        message.data.recipient  = publickey;
        message.data.id         = rows[fat].id;
        message.data.tx         = rows[fat].tx;

console.log("SENDING REQUEST TO PEER !");

        peer.sendRequestWithCallback(message.request, message.data, (err) => {
          this.deleteUserTransaction(message.data.id);
        });
      }
    }
  }
}


