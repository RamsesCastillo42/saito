var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var fs = require('fs');
const Big = require('big.js');
var request = require('request')


//////////////////
// CONSTRUCTOR  //
//////////////////
function Faucet(app) {

  if (!(this instanceof Faucet)) { return new Faucet(app); }

  Faucet.super_.call(this);

  this.app             = app;

  this.name            = "Faucet";
  this.browser_active  = 0;
  this.handlesEmail    = 0;

  return this;

}
module.exports = Faucet;
util.inherits(Faucet, ModTemplate);


////////////////////
// Install Module //
////////////////////
Faucet.prototype.installModule = function installModule() {

  if (this.app.BROWSER == 1) { return; }

  sql = "\
        CREATE TABLE IF NOT EXISTS mod_faucet (\
                id INTEGER, \
                publickey TEXT, \
                unixtime INTEGER, \
                PRIMARY KEY(id ASC) \
        )";
  this.app.storage.execDatabase(sql, {}, function() {});

}



/////////////////////////
// Handle Web Requests //
/////////////////////////
//
// This is a bit more complicated than it needs to be, because
// we want to be able to send users to the main Saito faucet if
// the application is not called with a Saito address.
//
// This design allows us to have links WITHIN our javascript bundle
// that point to off-server faucets but return people to the local
// URL (i.e. their URL-specific wallet).
//
// This is designed for countries like China and other networks where
// firewalls can degrade large javascript downloads but otherwise
// do not prevent connectivity.
Faucet.prototype.webServer = function webServer(app, expressapp) {

  var faucet_self = this;

  expressapp.get('/faucet/', function (req, res) {

    if (req.query.saito_address == null) {
      let data = fs.readFileSync(__dirname + '/web/index.html', 'utf8', (err, data) => {});
      if (req.query.saito_app != null) {
        data = data.replace('email', req.query.saito_app);
      }
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write(data);
      res.end();
      return;
    }

    var source_protocol=""
    var source_domain=""
    var source_port=""
    var source_app=""

    source_protocol = req.protocol
    source_domain = req.get('host')

    if (req.query.source_port != null) {
      source_port = req.query.source_port;
    }

    if (req.query.source_app != null) {
      source_app = req.query.source_app;
    }

    res.setHeader('Content-type', 'text/html');
    res.charset = 'UTF-8';
    res.write(faucet_self.returnFaucetHTML(req.query.saito_address, source_domain, source_port, source_protocol, source_app, ""));
    res.end();
    return;

  });
  expressapp.get('/faucet/success', function (req, res) {

    var source_domain = "";
    var source_port = "";
    var source_protocol = "";
    var source_app = "";

    source_protocol = req.protocol
    source_domain = req.get('host')

    if (req.query.app != null) {
      source_app = req.query.app;
    }

    if (req.query.eml) {
      let email = req.query.eml
      request.get(`http://saito.tech/success.php?email=${email}`, (error, response, body) => {
        console.log(response)
      })
    }

    if (Big(faucet_self.app.wallet.returnBalance()).lt(50)) {
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write("Our server does not have enough Saito to complete this sale. Please check back later.");
      res.end();
      return;
    }

    if (req.query.saito_address == null) {
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write("NO SAITO ADDRESS PROVIDED - FORM IMPROPERLY SUBMITTED");
      res.end();
      return;
    }

    if (!faucet_self.app.crypto.isPublicKey(req.query.saito_address)) {
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write("INVALID SAITO ADDRESS - FORM IMPROPERLY SUBMITTED");
      res.end();
      return;
    }

    var saito_address              = req.query.saito_address;

    // insert into database
    var unixtime = new Date().getTime();
    var unixtime_check = unixtime - 86400000;

    var sql = "SELECT count(*) AS count FROM mod_faucet WHERE publickey = $publickey AND unixtime > $unixtime";
    var params = { $publickey : saito_address , $unixtime : unixtime_check }
    faucet_self.app.storage.queryDatabase(sql, params, function(err, rows) {

      var can_send = 0;

      if (rows != null) {
        if (rows.count == 0) {
          can_send = 1;
        }
      }

      if (can_send == 0) {
        res.sendFile(__dirname + '/web/failure.html');
        return;
      } else {

        // update database
        var sql2 = "INSERT INTO mod_faucet (publickey, unixtime) VALUES ($publickey, $unixtime)";
        var params2 = { $publickey : saito_address , $unixtime : unixtime }
        faucet_self.app.storage.queryDatabase(sql2, params2, function(err, rows) {});

        var wallet_avail = Big(faucet_self.app.wallet.returnBalance());
        if (wallet_avail.lt(1000.0)) {

          res.charset = 'UTF-8';
          res.write("Sorry, the faucet is currently out of money. Please let us know!");
          res.end();
          return;

        }

        // send an email
        let newtx = new saito.transaction();
        newtx.transaction.from = faucet_self.app.wallet.returnAdequateInputs(Big(1002.0));
        newtx.transaction.ts   = new Date().getTime();

        for (let i = 0; i < 8; i++) {
          newtx.transaction.to.push(new saito.slip(saito_address, Big(125.0)));
          newtx.transaction.to[newtx.transaction.to.length-1].type = 0;
        }

        newtx.transaction.msg.module = "Email";
        newtx.transaction.msg.title  = "Saito Faucet - Transaction Receipt";
        newtx.transaction.msg.data   = 'You have received 1000 tokens from our Saito faucet.';
        newtx = faucet_self.app.wallet.signTransaction(newtx);

        faucet_self.app.network.propagateTransaction(newtx);

        res.setHeader('Content-type', 'text/html');
        res.charset = 'UTF-8';
        var returnSuccessHTML = faucet_self.returnFaucetSuccessHTML(source_domain, source_port, source_protocol, source_app)
        res.write(returnSuccessHTML);
        res.end();
        return;
      }

    });
  });
  expressapp.get('/faucet/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });

  expressapp.get('/faucet/tokens', async (req, res) => {
    const response = {
      payload: {},
      error: {}
    }

    var publickey = req.query.address;

    if (publickey == null) {
      res.setHeader('Content-type', 'json/application');
      response.error.message =  "NO SAITO ADDRESS PROVIDED - FORM IMPROPERLY SUBMITTED"
      res.send(JSON.stringify(response))
      return;
    }

    if (Big(faucet_self.app.wallet.returnBalance()).lt(50)) {
      res.setHeader('Content-type', 'json/application');
      response.error.message = "Our server does not have enough Saito to complete this sale. Please check back later."
      res.send(JSON.stringify(response))
      return;
    }

    var unixtime = new Date().getTime();
    var unixtime_check = unixtime - 86400000;

    var sql = "SELECT count(*) AS count FROM mod_faucet WHERE publickey = $publickey AND unixtime > $unixtime";
    var params = { $publickey : publickey , $unixtime : unixtime_check }

    try {
      var row = await this.app.storage.db.get(sql, params)

      if (row.count != 0) {
        res.setHeader('Content-type', 'json/application');
        response.error.message = "You have already received your tokens. Wait 24 hours for the next drop"
        res.send(JSON.stringify(response))
        return;
      }

      sql = "INSERT INTO mod_faucet (publickey, unixtime) VALUES ($publickey, $unixtime)";
      params = { $publickey : publickey , $unixtime : unixtime }
      this.app.storage.db.all(sql, params)

      newtx = faucet_self.app.wallet.createUnsignedTransactionWithDefaultFee(publickey, 1000.0);

      if (newtx == null) {
        res.setHeader('Content-type', 'json/application');
        response.error.message = "Sorry, the faucet is out of money. Alert bearguy@saito"
        res.send(JSON.stringify(response))
        return;
      }

      newtx.transaction.msg.module = "Email";
      newtx.transaction.msg.title  = "Saito Faucet - Transaction Receipt";
      newtx.transaction.msg.data   = 'You have received 1000 tokens from our Saito faucet.';
      newtx = faucet_self.app.wallet.signTransaction(newtx);

      faucet_self.app.network.propagateTransaction(newtx);

      res.setHeader('Content-type', 'json/application');
      res.charset = 'UTF-8';
      response.payload.status = true
      response.payload.message = "Success! Your tokens should arrive soon"
      res.send(JSON.stringify(response))
      return;

    } catch(err) {
      res.setHeader('Content-type', 'json/application');
      response.error.message = err.message
      res.send(JSON.stringify(response))
      return;
    }
  });

}


/////////////
// On Load //
/////////////
Faucet.prototype.initializeHTML = function initializeHTML(app) {
  $('#saito_address').val(app.wallet.returnPublicKey());
}


Faucet.prototype.returnFaucetHTML = function returnFaucetHTML(saito_address, source_domain="apps.saito.network", source_port="", source_protocol="http", source_app="email", user_email="") {

  let {host, port, protocol} = this.app.network.peers[0].peer;
  let advert_url = `${protocol}://${host}:${port}/faucet/success`

  let fhtml = `<html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="">
      <meta name="author" content="">
      <title>Saito Token Faucet</title>
      <script type="text/javascript" src="/lib/jquery/jquery-3.2.1.min.js">
      </script>
      <link rel="stylesheet" href="/lib/jquery/jquery-ui.min.css" type="text/css" media="screen" />
      <script type="text/javascript" src="/lib/jquery/jquery-ui.min.js"></script>
    <link rel="stylesheet" type="text/css" href="/faucet/style.css" />
    </head>
    <body>
      <div class="header">
        <a href="/" class="logo_link"><img src="/img/saito_logo_black.png" class="logo" />
          <div class="logo_text">saito</div>
        </a>
      </div>
      <div class="main" id="main" style="">
        Click the button below to receive 1000 Saito tokens:
        <p></p>(auto-filled with your browser\'s address)<p></p>
        <form method="get" action="${advert_url}">
          <input type="text" style="padding:2px;width:640px" name="saito_address" id="saito_address" value="${saito_address}" />
          <p>If you want to stay up-to-date, subscribe to the Saito Newsletter </p>
          <div style="display: flex">
            <div style="margin-right: 10px">Email:</div>
	  </div>
          <input type="text" style="padding:2px;width:640px" name="eml" id="eml" value="you@domain.com" />
          <input type="hidden" name="domain" id="source_domain" value="${source_domain}" />
          <input type="hidden" name="port" value="${source_port}" />
          <input type="hidden" name="protocol" value="${source_protocol}" />
          <input type="hidden" name="app" value="${source_app}" />
          <p></p>
          <input type="submit" id="faucet_button" class="faucet_button" />
        </form>
        <p></p><div id="protip" style="padding-left:5px;padding-right:6px;float:left;background-color:yellow;font-size:0.9em;margin-right:auto">TIP: lower your default fee in "Email &gt; Settings" to save tokens</div><p></p>
        </div>
      <script>$("#source_domain").val(location.host);</script>
    </body>
  </html>
  `;

  return fhtml;

}
Faucet.prototype.returnFaucetSuccessHTML = function returnFaucetSuccessHTML(source_domain="saito.tech", source_port="", source_protocol="http", source_app="email") {
  var emailUrl;
  source_port = ":" + source_port;

  if (source_domain.indexOf(source_port) > 0) { source_port = ""; };

  if (source_port == ":" && source_domain.indexOf('://') > 0) {
    emailUrl = source_domain;
  } else {
    emailUrl = `${source_protocol}://${source_domain}/${source_app}`;
  }

  return `<html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="">
      <meta name="author" content="">
      <title>Saito Token Faucet</title>
      <script type="text/javascript" src="/lib/jquery/jquery-3.2.1.min.js"></script>
      <script type="text/javascript" src="/lib/jquery/jquery-ui.min.js"></script>
      <link rel="stylesheet" href="/lib/jquery/jquery-ui.min.css" type="text/css" media="screen" />
      <link rel="stylesheet" type="text/css" href="/faucet/style.css" />
    </head>
    <body>
      <div class="header">
        <a href="/" class="logo_link">
          <img src="/img/saito_logo_black.png" class="logo" />
          <div class="logo_text">saito</div>
        </a>
      </div>
      <div class="main" id="main" style="">
        <h2>Success:</h2>
        <p></p>
        Our server has sent tokens to your Saito address.
        <p></p>
        It may take a few minutes for these tokens to arrive.
        <p></p>
        <a href="${emailUrl}">Click here to return to our Saito Mail client</a>.
      </div>
    </body>
  </html>
  `

}


