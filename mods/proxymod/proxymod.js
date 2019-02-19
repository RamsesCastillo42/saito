//
// This module provides zero-conf message 
// forwarding so that lite-clients can 
// handle onPeerRequest messages through
// intermediaries
//
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
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

  this.db 		 = null;

  return this;

}
module.exports = ProxyMod;
util.inherits(ProxyMod, ModTemplate);



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

  //
  // connect to our proxy servers
  //
  if (this.app.options.proxymod != undefined) {
    for (let i = 0; i < this.app.options.proxymod.length; i++) {
      this.app.network.addPeer(JSON.stringify(this.app.options.proxymod[i], 0, 1, 0));
    }
  }

  //
  // send message to receive queued transactions after two seconds
  //
  setTimeout(() => {
    if (this.app.options.proxymod != undefined) {
      for (let i = 0; i < this.app.options.proxymod.length; i++) {
        for (let j = 0; j < this.app.network.peers.length; j++) {

	  if (this.app.options.proxymod[i].host == this.app.network.peers[j].peer.host) {
	    if (this.app.options.proxymod[i].port == this.app.network.peers[j].peer.port) {

	      //////////////////////////////
	      // load queued transactions //
	      //////////////////////////////
              var rdloadtimer = setTimeout(() => {
                message                 = {};
                message.request         = "proxymod load request";
                message.data            = {};
                message.data.request    = "proxymod load request";
                message.data.publickey  = this.app.wallet.returnPublicKey();

                this.app.network.peers[j].sendRequest(message.request, message.data, function () {});
              }, 500);

	    }
	  }
        }
      }
    }
  }, 2000);


  //
  // send message to receive queued transactions after two seconds
  //
  setTimeout(() => {
    if (this.app.options.proxymod != undefined) {
      for (let i = 0; i < this.app.options.proxymod.length; i++) {
        for (let j = 0; j < this.app.network.peers.length; j++) {

	  if (this.app.options.proxymod[i].host == this.app.network.peers[j].peer.host) {
	    if (this.app.options.proxymod[i].port == this.app.network.peers[j].peer.port) {

	      //////////////////////////////////
	      // send relay message to myself //
	      //////////////////////////////////
              var rdloadtimer = setTimeout(() => {
                message                 = {};
                message.request         = "proxymod relay request";
                message.data            = {};
                message.data.request    = "proxymod relay request";
                message.data.recipient  = this.app.wallet.returnPublicKey();
                message.data.tx         = "this is the data we are sending!";

                this.app.network.peers[j].sendRequest(message.request, message.data, function () {});
              }, 500);

	    }
	  }
        }
      }
    }
  }, 3000);


  //
  // and servers initialize their database
  //
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


console.log("HERE: " + JSON.stringify(message));

  //
  // is this for someone whose connections i handle
  //


  //
  // if so, save it in my database
  //


  //
  // now start queueing all database content for them if they are online and connected
  //




  ////////////////////
  // relay requests //
  ////////////////////
  if (message.request === "proxymod relay request") {

    let data = message.data.tx;
    let recipient = message.data.recipient;

console.log("\n\n\nDATA: " + data + "\nRECIPIENT: " + recipient);

    //
    // is this for me?
    //
    if (recipient == this.app.wallet.returnPublicKey()) {
alert("I AM THE RECIPIENT OF THIS: " + JSON.stringify(data));
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


console.log("INSERT INTO DATABASE");

    //
    // insert into database
    //
    await this.addUserTransaction(recipient, data);

console.log("AND SEND TO PEER");

    //
    // send to peers if connected
    //
    for (let i = 0; i < this.app.network.peers.length; i++) {
      if (this.app.network.peers[i].peer.publickey == recipient) {
        this.loadRequest(this.app.network.peers[i], recipient);
      }
    }
  }





  ///////////////////
  // load requests //
  ///////////////////
  if (message.request === "proxymod load request") {
    this.loadRequest(peer, message.data.publickey);
  }

}





ProxyMod.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  //
  // if this transaction is for me
  //


  //
  // if it is a proxymod transaction
  //


  //
  // add it to my database for queuing
  //

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

  //
  // insert new user
  //
  if (user_id == null) {
    this.insertNewUser(publickey);
    return;
  }

  //
  // or stream transactions
  //
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
        message.data.id         = rows[fat].id;
        message.data.tx         = rows[fat].tx;

console.log("SENDING DATA!");


        peer.sendRequestWithCallback(message.request, message.data, (err) => {
console.log("DELETING USER TRANSACTIONS: " + JSON.stringify(message));
          this.deleteUserTransaction(message.data.id);
        });

      }
    }
  }
}










