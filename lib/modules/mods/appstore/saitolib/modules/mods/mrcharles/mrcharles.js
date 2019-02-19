var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');


//////////////////
// CONSTRUCTOR  //
//////////////////
function MrCharles(app) {

  if (!(this instanceof MrCharles)) { return new MrCharles(app); }
  MrCharles.super_.call(this);

  this.app = app;
  this.name = "MrCharles";

  return this;

}

module.exports = MrCharles;
util.inherits(MrCharles, ModTemplate);


MrCharles.prototype.initialize = async function initialize() {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

}

//
// listen to EMAIL from our public server
//
MrCharles.prototype.shouldAffixCallbackToModule = function shouldAffixCallbackToModule(modname) {
  if (modname == this.name) { return 1; }
  if (modname == "Registry") { return 1; }
  return 0;
}

//////////////////
// Confirmation //
//////////////////
MrCharles.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {

  var mrcharles_himself = app.modules.returnModule("MrCharles");

  if (app.BROWSER == 1) { return; }

  console.log("#####################################################################");
  console.log("######################### Mr Charles ################################");
  console.log("#####################################################################");

  if (tx.transaction.msg.module != "Registry") { return; }
  if (conf == 0) {
    var requestor = tx.returnSender();
    if (tx.returnMessage().requested_identifier) {
      var requested = tx.returnMessage().requested_identifier;
    } else {
      return;
    }
    var to = ["ykc9ibUx8f7QVGE3koAiutFQRHfX4PKKkub72Qcp7o3o"];

    for (var i = 0; i < to.length; i++) {
      mrcharles_himself.notify(to[i], requested, requestor);
    }
  }
}

MrCharles.prototype.notify = function notify(tonotify, requested, requestor) {

  var domain = this.app.modules.returnModule("Registry").domain;

  //var from = this.app.wallet.returnPublicKey();
  var amount = 0.0;
  var fee = 0.5;

  email_html = 'Someone at Address: ' + requestor + ' requested identifier: ' + requested + '@' + domain;

  newtx = this.app.wallet.createUnsignedTransaction(tonotify, amount, fee);

  if (newtx == null) { return; }

  newtx.transaction.msg.module = "Email";
  newtx.transaction.msg.data = email_html;
  newtx.transaction.msg.title = 'Address Registration for ' + requested + '@' + domain;
  newtx.transaction.msg.markdown = 0;
  newtx = this.app.wallet.signTransaction(newtx);
  this.app.mempool.addTransaction(newtx);

}