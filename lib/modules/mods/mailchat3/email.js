var ModTemplate = require('../../template');
var util = require('util');

//////////////////
// CONSTRUCTOR  //
//////////////////
function MailChat(app) {

  if (!(this instanceof MailChat)) { return new MailChat(app); }

  MailChat.super_.call(this);

  this.app             = app;

  this.name            = "MailChat";
  this.browser_active  = 0;

  return this;

}
module.exports = MailChat;
util.inherits(MailChat, ModTemplate);


MailChat.prototype.webServer = function webServer(app, expressapp) {

  expressapp.get('/mailchat/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/mailchat/chat_popup.html', function (req, res) {
    res.sendFile(__dirname + '/web/chat_popup.html');
    return;
  });
  expressapp.get('/mailchat/include_html.js', function (req, res) {
    res.sendFile(__dirname + '/web/include_html.js');
    return;
  });
  expressapp.get('/mailchat/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/mailchat/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;
  });

}
