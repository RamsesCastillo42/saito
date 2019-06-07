var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Debug(app) {

  if (!(this instanceof Debug)) { return new Debug(app); }

  Debug.super_.call(this);

  this.app             = app;

  this.name            = "Debug";
  this.handlesEmail    = 1;
  this.emailAppName    = "Debug";

  return this;

}
module.exports = Debug;
util.inherits(Debug, ModTemplate);




/////////////////////
// Email Functions //
/////////////////////
Debug.prototype.displayEmailForm = function displayEmailForm(app) {

  $('.lightbox_compose_address_area').hide();
  $('.lightbox_compose_module').hide();

  element_to_edit = $('#module_editable_space');
  element_to_edit.html(
    `<div style="height:83vh;font-size:1.15em;line-height:1.2em;">
      <pre>
        <code>${JSON.stringify(app.options, null, 4)}</code>
        <p></p>
        <code>${JSON.stringify(app.blockchain.index, null, 4)}</code>
        <p></p>
        <code>${JSON.stringify(app.archives.messages)}</code>
      </pre>
    </div>`
  );
}





////////////////////
// initializeHTML //
////////////////////
Debug.prototype.attachEvents = function attachEvents(app) {

  $('.form_submit').off();
  $('.form_submit').on('click', () => {

    let module      = $('#form_module').val();
    let environment = navigator.userAgent;
    let details     = $('#form_details').val();

    //
    // make a copy of my options file
    //
    let options_copy = JSON.parse(JSON.stringify(app.options));

    //
    // remove sensitive information
    //
    options_copy.wallet.privatekey = "";
    for (let i = 0; i < app.options.keys.length; i++) {
      app.options.keys[i].aes_privatekey = "";
      app.options.keys[i].aes_secret = "";
    }

    let email  = "MODULE: "+module;
        email += "\n";
        email += "ENV: "+environment;
        email += "\n";
        email += "ISSUE: "+details;
        email += "\n";
	email += JSON.stringify(options_copy, null, 4);

    //
    // send email using local publickey
    //
    let newtx = app.wallet.createUnsignedTransaction("rHUwfphEg6drtGjmJzm5qUFDKbMLLoPEy1Kx7LdNqWR3", 0.0, 0.001);
    if (newtx == null) { alert("Your browser does not seem to have any Saito tokens, perhaps your problems are being caused by lack of tokens? If so please visit the Saito faucet and get more!");}
    newtx.transaction.msg.module   = "Email";
    newtx.transaction.msg.title    = "Saito Bug Report";
    newtx.transaction.msg.data     = email;
    newtx.transaction.msg.markdown = 0;
    newtx = this.app.wallet.signTransaction(newtx);
    app.network.propagateTransactionWithCallback(newtx, function() {
      alert("Thank you! Your bug report has been submitted!");
      $('.main').html("Thank you. Your bug report has been submitted!");
    });

  });

}












///////////////
// webServer //
///////////////
Debug.prototype.webServer = function webServer(app, expressapp) {

  expressapp.get('/debug/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/debug/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/debug/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;

  });

}



