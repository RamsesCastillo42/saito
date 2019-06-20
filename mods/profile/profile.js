const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
var util = require('util');

/*
 * Profile
 *
 * This module keeps a transaction looping around the chain on 
 * which users can store information such as their publickeys
 * for various purposes, archival servers, and other info.
 *
 * One UTXO is removed from the wallet and managed manually
 * to ensure that this data stays looping around the chain
 * and available for all users. If this UTXO falls off the
 * chain or is spent, a new one is issued.
 *
*/

//////////////////
// CONSTRUCTOR  //
//////////////////
function Profile(app) {

  if (!(this instanceof Profile)) { return new Profile(app); }

  Profile.super_.call(this);

  this.app             = app;

  this.profile_bid     = 0; // block_id of profile tx
  this.profile         = null;
  this.slip            = null;
  this.handlesEmail    = 1;
  this.emailAppName    = "Profile";

  return this;

}
module.exports = Profile;
util.inherits(Profile, ModTemplate);



////////////////
// Initialize //
////////////////
Profile.prototype.initialize = function initialize() {

  //
  // add profile information to options file
  //
  if (this.app.options.profile == undefined) {

    this.app.options.profile = this.newProfile();

    this.app.options.profile.name = "Michael Caine";
    this.app.options.profile.email = "narrator@saito.tech";

    this.app.storage.saveOptions();
  }

}




/////////////////////////
// Handle Web Requests //
/////////////////////////
Profile.prototype.webServer = function webServer(app, expressapp) {

  expressapp.get('/profile/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/profile/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });

}










//////////////////
// Confirmation //
//////////////////
Profile.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {

  if (conf == 0) {

    //
    // do we need to rebroadcast our profile
    //
    if (tx.isTo(app.wallet.returnPublicKey())) {

      let txmsg = tx.returnMessage();

      if (txmsg.module == "Profile") {


      }

    }
  }

}


Profile.prototype.onNewBlock = function onNewBlock(blk, lc=1) {

  if (this.slip == null) { return; }

  //
  //
  //
  if (this.profile_bid == 0) {

    //
    // create profile tx
    //
    let newtx = blk.app.wallet.createUnsignedTransactionWithDefaultFee(blk.app.wallet.returnPublicKey());
    if (newtx == null) { return; }

    newtx.transaction.msg.module = this.name;
    newtx.transaction.msg.profile = this.profile;
    newtx = blk.app.wallet.signTransaction(newtx);
    blk.app.network.propagateTransactionWithCallback(newtx, function() {});

  }

}






Profile.prototype.newProfile = function newProfile() {

  let profile = {};

  profile.name  = "";
  profile.email = "";
  profile.phone = "";

  profile.archive = {};
  profile.archive.port = "";
  profile.archive.host = "";
  profile.archive.host = "";

  return profile;

}
Profile.prototype.saveProfile = function saveProfile() {

  this.app.options.profile = this.profile;
  this.app.storage.saveOptions();

}








