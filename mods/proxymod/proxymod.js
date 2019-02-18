//
// This module provides zero-conf message 
// forwarding so that lite-clients can 
// handle onPeerRequest messages through
// intermediaries
//
var saito = require('../../../saito');
var ModTemplate = require('../../template');
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
                  publickey INTEGER, \
                  PRIMARY KEY(id ASC) \
          )';
    let userstable = this.db.run(sql, {});

    sql = 'CREATE TABLE IF NOT EXISTS transactions (\
                  id INTEGER, \
                  tx TEXT, \
                  received INTEGER, \
                  UNIQUE (publickey, docid), \
                  PRIMARY KEY(id ASC) \
          )';
    let txtable = this.db.run(sql, {});

    await Promise.all([usertable, txtable));

  } catch (err) {
    console.log(err);
  }

}



ProxyMod.prototype.initialize = async function initialize() {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  if (this.db == null) {
    try {
      var sqlite = require('sqlite');
      this.db = await sqlite.open('./data/proxymod.sq3');
    } catch (err) {}
  }

  //
  // connect to our proxy servers
  //


  //
  // send message to receive queued transactions
  //

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
ModTemplate.prototype.handlePeerRequest = function handlePeerRequest(app, message, peer, mycallback=null) {}

  //
  // is this for someone whose connections i handle
  //


  //
  // if so, save it in my database
  //

  //
  // now start queueing all database content for them if they are online and connected
  //

}




