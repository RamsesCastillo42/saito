const fs          = require('fs');
const util        = require('util');
const path        = require('path');
const sqlite      = require('sqlite');
// const saito     = require('../../../saito');
const request     = require("request");
const ModTemplate = require('../../template');



//////////////////
// CONSTRUCTOR  //
//////////////////
function Registry(app) {

  if (!(this instanceof Registry)) { return new Registry(app); }

  Registry.super_.call(this);

  this.app             = app;

  // separate database
  this.db              = null;
  this.dir             = path.join(__dirname, "../../../data/registry.sq3");

  this.name            = "Registry";
  this.browser_active  = 0;
  this.handlesEmail    = 1;
  this.handlesDNS      = 1;
  this.emailAppName    = "Register Address";

  this.longest_chain_hash = "";
  this.longest_chain_bid  = 0;

  this.domain          = "saito";
  this.host            = "localhost"; // hardcoded
  this.port            = "12101";     // hardcoded

  // This is the master DNS key
  this.publickey = '23ykRYbjvAzHLRaTYPcqjkQ2LnFYeMkg9cJgXPbrWcHmr'
  if (app.BROWSER == 1) {
    if (this.app.options.registry){
      this.publickey = this.app.options.registry.publickey;
    }
  }

  //This is the dev pubkey
  // this.publickey = "226GV8Bz5rwNV7aNhrDybKhntsVFCtPrhd3pZ3Ayr9x33";

  return this;

}
module.exports = Registry;
util.inherits(Registry, ModTemplate);


////////////////////
// Install Module //
////////////////////
Registry.prototype.installModule = async function installModule() {

  try {

  var registry_self = this;

  if (registry_self.app.BROWSER == 1 || registry_self.app.SPVMODE == 1) { return; }

  this.savePublicKey();

  // we want to watch mailings FROM our key
  registry_self.app.keys.addKey(registry_self.publickey, "", true, "");
  registry_self.db = await sqlite.open(this.dir);

  sql = "\
    CREATE TABLE IF NOT EXISTS mod_registry_addresses (\
        id INTEGER, \
        identifier TEXT, \
        publickey TEXT, \
        unixtime INTEGER, \
        block_id INTEGER, \
        lock_block INTEGER DEFAULT 0, \
        block_hash TEXT, \
        signature TEXT, \
        signer TEXT, \
        longest_chain INTEGER, \
        UNIQUE (identifier), \
        PRIMARY KEY(id ASC) \
    )";


  await registry_self.db.run(sql, {});

  this.insertSavedHandles();
    //
    // if we are not the main server but we are running
    // the registry module, we want to be able to track
    // DNS requests, which means running our own copy
    // of the database.
    //
  if (registry_self.app.wallet.returnPublicKey() != registry_self.publickey) {

      console.log("//\n FETCHING DNS INFORMATION \n//");

      var dns_master = "https://dns.saito.network";
      try {
    request.get(`${dns_master}/registry/addresses`, (error, response, body) => {
      if (body != null && response.headers['content-type'] == 'application/json') {
        data = JSON.parse(body);
        for (var i = 0; i < data.length; i++) {
          this.addRecords(data[i]);
        }
      }
    });
      } catch (err) {
    console.log(err);
      }
  } else {
  }
  } catch (err) {
    console.log(err);
  }
}





////////////////
// Initialize //
////////////////
Registry.prototype.initialize = async function initialize() {

  if (this.app.BROWSER == 1) { return; }

  this.savePublicKey();

  try {

  if (this.db == null) {
    this.db = await sqlite.open(this.dir);
  }

  } catch (err) {
    console.log(err);
  }
}

////////////////////////
// savePublicKey      //
////////////////////////
Registry.prototype.savePublicKey = function savePublicKey() {
  let registry_publickey = process.env.NODE_ENV == "dev" ? "226GV8Bz5rwNV7aNhrDybKhntsVFCtPrhd3pZ3Ayr9x33" : this.publickey
  this.app.options.registry  = Object.assign({}, {publickey: registry_publickey});
  this.publickey = registry_publickey;

  this.app.storage.saveOptions();
}


/////////////////////
// Initialize HTML //
/////////////////////
Registry.prototype.initializeHTML = async function initializeHTML() {

  if (this.app.BROWSER == 0) { return; }

  if (this.app.wallet.returnBalance() < 5) {

    let html = `<h1 style="margin-bottom:0px">HOLD ON, PARTNER...</h1>It takes 5 SAITO to register an email address. (You have ${this.app.wallet.returnBalance()})
    <a href="/faucet" style="text-decoration:none;" class="submit">Visit Faucet</a>`;
    $('.main').html(html);

  }

}


/////////////////////////
// Handle Web Requests //
/////////////////////////
Registry.prototype.webServer = function webServer(app, expressapp) {

  var registry_self = this;

  expressapp.get('/registry/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/registry/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/registry/addresses', async (req, res) => {
    let sql = "SELECT * from mod_registry_addresses WHERE longest_chain = 1";
    try {
      var rows = await registry_self.db.all(sql, {});
    } catch(err) {
      console.log(err);
    }

    if (rows != null) {
      res.setHeader('Content-Type', 'application/json');
      res.charset = 'UTF-8';
      res.write(JSON.stringify(rows));
      res.end();
    } else {
      res.status(404).send("Something went wrong");
    }
    return;
  });
  expressapp.get('/registry/confirm/:username', async function (req, res) {

    let username = req.params.username;

    let sql = "SELECT count(*) FROM mod_registry_addresses WHERE longest_chain = 1 AND identifier = $identifier";
    let params = { $identifier : username };
    let row = await registry_self.db.get(sql, params);
    if (row != null) {
      let rowcount = row.count;
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      if (row.count == 1) {
    res.write("1");
      } else {
    res.write("0");
      }
      res.end();
      return;
    } else {
      let rowcount = row.count;
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write("0");
      res.end();
      return;
    }

  });

}






////////////////////////////////
// Email Client Interactivity //
////////////////////////////////
Registry.prototype.displayEmailForm = function displayEmailForm(app) {

  element_to_edit = $('#module_editable_space');

  var to_key = this.app.dns.returnPublicKey() || this.publickey

  $('#lightbox_compose_to_address').val(to_key);
  $('#lightbox_compose_payment').val(3);
  $('#lightbox_compose_fee').val(app.wallet.returnDefaultFee());
  $('.lightbox_compose_address_area').hide();
  $('.lightbox_compose_module').hide();
  $('#module_textinput').focus();

  element_to_edit_html = '<div id="module_instructions" class="module_instructions">Register a human-readable email address:<p></p><input type="text" class="module_textinput" id="module_textinput" value="" /><div class="module_textinput_details">@'+this.domain+'</div><p style="clear:both;margin-top:0px;"> </p>ASCII characters only, e.g.: yourname@'+this.domain+', etc. <p></p><div id="module_textinput_button" class="module_textinput_button" style="margin-left:0px;margin-right:0px;">register</div></div>';
  element_to_edit.html(element_to_edit_html);

  $('#module_textinput').off();
  $('#module_textinput').on('keypress', function(e) {
    if (e.which == 13 || e.keyCode == 13) {
      $('#module_textinput_button').click();
    }
  });

  $('#module_textinput_button').off();
  $('#module_textinput_button').on('click', function() {
    var identifier_to_check = $('.module_textinput').val();
    var regex=/^[0-9A-Za-z]+$/;
    if (regex.test(identifier_to_check)) {
      $('#send').click();
    } else {
      alert("Only Alphanumeric Characters Permitted");
    }
  });


}
/////////////////////
// Display Message //
/////////////////////
Registry.prototype.displayEmailMessage = function displayEmailMessage(app, message_id) {

  if (app.BROWSER == 1) {

    message_text_selector = "#" + message_id + " > .data";
    $('#lightbox_message_text').html( $(message_text_selector).html() );
    $('#lightbox_compose_to_address').val(registry_self.publickey);
    $('#lightbox_compose_payment').val(3);
    $('#lightbox_compose_fee').val(app.wallet.returnDefaultFee());

  }

}
////////////////////////
// Format Transaction //
////////////////////////
Registry.prototype.formatEmailTransaction = function formatEmailTransaction(tx, app) {
  tx.transaction.msg.module = this.name;
  tx.transaction.msg.requested_identifier  = $('#module_textinput').val().toLowerCase();
  return tx;
}









//////////////////
// Confirmation //
//////////////////
Registry.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  var registry_self = app.modules.returnModule("Registry");

  //////////////
  // BROWSERS //
  //////////////
  //
  // check if name registered
  //
  if (conf == 0 && app.BROWSER == 1) {

    let txmsg = tx.returnMessage();

    if (txmsg.module == "Email") {

      if (txmsg.sig === undefined) { return; }
      if (txmsg.sig == "") { return; }

      var sig = txmsg.sig;

      //
      // browser can update itself
      //
      if (tx.transaction.to[0].add == registry_self.app.wallet.returnPublicKey()) {

        let sigsplit = sig.replace(/\n/g, '').split("\t");
        if (sigsplit.length > 6) {

          let registry_id    = sigsplit[1];
          let registry_bid   = sigsplit[2];
          let registry_bhash = sigsplit[3];
          let registry_add   = sigsplit[4];
          let registry_sig   = sigsplit[6];
          let registry_key   = sigsplit[7];

          let msgtosign   = registry_id + registry_add + registry_bid + registry_bhash;
          let msgverifies = registry_self.app.crypto.verifyMessage(msgtosign, registry_sig, registry_self.publickey);

          if (msgverifies) {
            registry_self.app.keys.addKey(registry_add, registry_id, 0, "Email");
            registry_self.app.keys.saveKeys();
            registry_self.app.wallet.updateIdentifier(registry_id);
            try {
              $('#saitoname').text(registry_self.app.wallet.returnIdentifier());
            } catch (err) {}
            registry_self.app.wallet.saveWallet();
          }
        }
      }
    }
  }
  if (app.BROWSER == 1) { return; }



  /////////////
  // SERVERS //
  /////////////
  //
  // register identifiers
  //
  if (conf == 0) {

    if (tx.transaction.msg != null) {

      var txmsg = tx.returnMessage();

      //
      // monitor confirmation from master server
      //
      if (txmsg.module == "Email") {

        if (txmsg.sig != "") { return; }

        var sig = txmsg.sig;

        // browser can update itself
        if (tx.transaction.to[0].add == registry_self.app.wallet.returnPublicKey()) {
          let sigsplit = sig.split("\t");

          if (sigsplit.length > 6) {

            let registry_id    = sigsplit[1];
            let registry_bid   = sigsplit[2];
            let registry_bhash = sigsplit[3];
            let registry_add   = sigsplit[4];
            let registry_sig   = sigsplit[6];
            let registry_key   = sigsplit[7];

            let msgtosign   = identifier + address + block_id + block_hash;
            let msgverifies = registry_self.app.crypto.verifyMessage(msgtosign, registry_sig, registry_self.publickey);

            if (msgverifies) {
              registry_self.app.keys.addKey(dns_response.publickey, dns_response.identifier, 0, "Email");
              registry_self.app.keys.saveKeys();
              registry_self.app.wallet.updateIdentifier(registry_id);
              try {
                $('#saitoname').text(email_self.app.wallet.returnIdentifier());
              } catch (err) {}
              registry_self.app.wallet.saveWallet();
            }
          }
        }

        // servers update database
        registry_self.addDomainRecord(txmsg.sig);
        return;

      }

      //
      // monitor registration requests
      //
      if (txmsg.module == "Registry") {

        registry_self.app.logger.logInfo(`Logging outcome of onConfirmation`)
        registry_self.app.logger.logInfo(`TRANSACTION TO ADD: ${tx.transaction.to[0].add}`)
        registry_self.app.logger.logInfo(`REGISTRY PUBKEY: ${registry_self.publickey}`)
        if (tx.transaction.to[0].add != registry_self.publickey) { return; }
        if (txmsg.requested_identifier === "") { return; }

        let full_identifier = tx.transaction.msg.requested_identifier.toLowerCase() + "@" + app.modules.returnModule("Registry").domain;
        if (full_identifier.indexOf("'") > 0) { return; }
        full_identifier = full_identifier.replace(/\s/g, '');
        await registry_self.addDatabaseRecord(tx, blk, full_identifier);

      }
    }
  }
}


Registry.prototype.attachEvents = function attachEvents(app) {

  $('#submit').off()
  $('#submit').on('click', () => {
    var msg = {}
    msg.module = "Registry"
    msg.requested_identifier = $('#requested_identifier').val();

    var amount = 3.0;
    var fee    = 2.0;

    var regex=/^[0-9A-Za-z]+$/;

    //
    // check OK
    //
    if (regex.test(msg.requested_identifier)) {} else {
      if (msg.requested_identifier != "") {
    alert("Only alphanumeric characters permitted in registered name");
    return;
      } else {
    alert("Can't submit blank form")
      }
    }


    //
    // check that this entry is valid
    //
    var c;

    if (app.dns.isActive() == 0) {
      c = confirm("You are not connected to a DNS server, so we cannot confirm this address is available. Click OK to try and register it. You will receive a success or failure email from the registration server once the network has processed your request.");
      if (!c) { return; }

      // send request across network
      var newtx = app.wallet.createUnsignedTransaction(this.publickey, amount, fee);

      if (newtx == null) { alert("Unable to send TX"); return; }
      newtx.transaction.msg = msg;
      newtx = app.wallet.signTransaction(newtx);
      app.network.propagateTransactionWithCallback(newtx, (err) => {
    if (!err) {
      alert("Your registration request has been submitted. Please wait several minutes for network confirmation");
      window.location.replace("/email")
    } else {
      alert("There was an error submitting your request to the network. This is an issue with your network connection or wallet");
      $("#requested_identifier").val("")
    }
      });

      return;
    }

    app.dns.fetchPublicKey(msg.requested_identifier + "@saito", (answer) => {
      answer = JSON.parse(answer)
      if (answer) {
    if (answer.publickey != "") {
      c = confirm("This address appears to be registered. If you still want to try registering it, click OK.");
    } else {
      c = true;
    };
      }

      if (c) {

    // send request across network
    var newtx = app.wallet.createUnsignedTransaction(this.publickey, amount, fee);

    if (newtx == null) { alert("Unable to send TX 2"); return; }
    newtx.transaction.msg = msg;
    newtx = app.wallet.signTransaction(newtx);
    app.network.propagateTransactionWithCallback(newtx, (err) => {
      if (!err) {
        alert("Your registration request has been submitted. Please wait several minutes for network confirmation");
        window.location.replace("/email")
      } else {
        alert("There was an error submitting your request to the network. This is an issue with your network connection or wallet");
        $("#requested_identifier").val("")
      }
    });
      }
    });

  });

}







/////////////////////////
// Handle DNS Requests //
/////////////////////////
//
// this handles zero-free requests sent peer-to-peer across the Saito network
// from hosts to DNS providers.
//
Registry.prototype.handleDomainRequest = async function handleDomainRequest(app, message, peer, mycallback) {

  try {
    var registry_self = this;

    let identifier = message.data.identifier.toLowerCase();
    let publickey  = message.data.publickey;

    var sql;
    var params;
    let dns_response            = {};
    dns_response.err            = "";
    dns_response.publickey      = "";
    dns_response.identifier     = "";

    var sql = identifier != null
      ? "SELECT * FROM mod_registry_addresses WHERE longest_chain = 1 AND identifier = $identifier"
      : "SELECT * FROM mod_registry_addresses WHERE publickey = $publickey";

    var params = identifier != null
      ? { $identifier : identifier }
      : { $publickey : publickey }

    let row = await registry_self.db.get(sql, params);
    if (row != null) {
      if (row.publickey != null) {
    dns_response.err        = "";
    dns_response.identifier = row.identifier;
    dns_response.publickey  = row.publickey;
    dns_response.unixtime   = row.unixtime;
    dns_response.block_id   = row.block_id;
    dns_response.block_hash = row.block_hash;
    dns_response.signer     = row.signer;
    dns_response.signature  = row.signature;
    mycallback(JSON.stringify(dns_response));
      }
    } else {
      dns_response.err = "identifier not found";
      mycallback(JSON.stringify(dns_response));
    }
  } catch (err) {}
}



Registry.prototype.onChainReorganization  = async function onChainReorganization(block_id, block_hash, lc) {

  try {

    var registry_self = this;

    //
    // browsers don't have a database tracking this stuff
    //
    if (registry_self.app.BROWSER == 1) { return; }

    if (lc == 0) {
      var sql    = "UPDATE mod_registry_addresses SET longest_chain = 0 WHERE block_id = $block_id AND block_hash = $block_hash";
      var params = { $block_id : block_id , $block_hash : block_hash }
      await registry_self.db.run(sql, params);
    }

    if (lc == 1) {
      var sql    = "UPDATE mod_registry_addresses SET longest_chain = 1 WHERE block_id = $block_id AND block_hash = $block_hash";
      var params = { $block_id : block_id , $block_hash : block_hash }
      await registry_self.db.run(sql, params);
    }

    if (lc == 1 && block_id == this.longest_chain_bid+1) {
      this.longest_chain_bid  = block_id;
      this.longest_chain_hash = block_hash;
    } else {
      var msg = "UPDATE" + "\t" + block_id + "\t" + block_hash + "\t" + lc + "\n";
      fs.appendFileSync((__dirname + "/web/addresses.txt"), msg, function(err) { if (err) { }; });
      if (lc == 1) {
    this.longest_chain_bid  = block_id;
    this.longest_chain_hash = block_hash;
      }
    }

  } catch (err) {}
}




//
// listen to EMAIL from our public server
//
Registry.prototype.shouldAffixCallbackToModule = function shouldAffixCallbackToModule(modname) {
  if (modname == this.name) { return 1; }
  if (modname == "Email") { return 1; }
  return 0;
}

/////////////////////
// addDomainRecord //
/////////////////////
//
// the master server does not run this, but child servers do
//
Registry.prototype.addRecords = async function addRecords(reg_addr) {
  try {
    var sql = "INSERT OR IGNORE INTO mod_registry_addresses (identifier, publickey, unixtime, block_id, lock_block, block_hash, signature, signer, longest_chain) VALUES ($identifier, $publickey, $unixtime, $block_id, $lock_block, $block_hash, $sig, $signer, $longest_chain)";
    var params = {
      $identifier : reg_addr.identifier,
      $publickey : reg_addr.address,
      $unixtime : reg_addr.unixtime,
      $block_id : reg_addr.block_id,
      $lock_block : reg_addr.lock_block,
      $block_hash : reg_addr.block_hash,
      $sig : reg_addr.sig,
      $signer : reg_addr.signer,
      $longest_chain : 1
    }
    let row = this.db.run(sql, params);
    if (row != undefined) {
    }
  } catch(err) {
    console.log(err)
  }
}

/////////////////////
// addDomainRecord //
/////////////////////
//
// the master server does not run this, but child servers do
//
Registry.prototype.addDomainRecord = async function addDomainRecord(sigline) {

  try {

  if (this.app.BROWSER == 1) { return; }

  var registry_self = this;
  var write_to_file = sigline + "\n";
  var line = sigline.split("\t");

  if (line.length != 7) {

    if (line.length != 4) { return; }

    ////////////
    // UPDATE //
    ////////////
    var action     = line[0];
    var block_id   = line[1];
    var block_hash = line[2];
    var lc         = line[3];

    if (action == "UPDATE") {

      var sql    = "UPDATE mod_registry_addresses SET longest_chain = $lc WHERE block_id = $block_id AND block_hash = $block_hash";
      var params = { 
    $block_id : block_id,
    $block_hash : block_hash,
    $lc : lc
      }

      await registry_self.db.run(sql, params);
    }

  } else {

    ////////////
    // INSERT //
    ////////////
    var action     = line[0];
    var identifier = line[1];
    var block_id   = line[2];
    var block_hash = line[3];
    var address    = line[4];
    var unixtime   = line[5];
    var sig        = line[6];
    var signer     = line[7];

    if (signer != registry_self.publickey) {} else {

      if (action == "INSERT") {

    var msgtosign   = identifier + address + block_id + block_hash;
    var msgverifies = registry_self.app.crypto.verifyMessage(msgtosign, sig, signer);

    if (msgverifies == true) {
      var lock_block = block_id+(registry_self.app.blockchain.genesis_period + registry_self.app.blockchain.fork_guard);
      var sql = "INSERT OR IGNORE INTO mod_registry_addresses (identifier, publickey, unixtime, block_id, lock_block, block_hash, signature, signer, longest_chain) VALUES ($identifier, $publickey, $unixtime, $block_id, $lock_block, $block_hash, $sig, $signer, $longest_chain)";
      var params = {
        $identifier : identifier,
        $publickey : address,
        $unixtime : unixtime,
        $block_id : block_id,
        $lock_block : lock_block,
        $block_hash : block_hash,
        $sig : sig,
        $signer : signer,
        $longest_chain : 1
      }
      fs.appendFileSync((__dirname + "/web/addresses.txt"), write_to_file, function(err) { if (err) { }; });

      await registry_self.db.run(sql, params);
    }
      }
    }
  }

  } catch (err) {}

}

Registry.prototype.insertSavedHandles = async function insertSavedHandles() {
  const keys = [
    {
      identifier: "dns@saito",
      publickey: "23ykRYbjvAzHLRaTYPcqjkQ2LnFYeMkg9cJgXPbrWcHmr",
    },
    {
      identifier: "apps@saito",
      publickey: "npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv",
    }
  ];

  for (let i = 0; i < keys.length; i++) {
    var sql = "INSERT OR IGNORE INTO mod_registry_addresses (identifier, publickey, unixtime, block_id, block_hash, signature, signer, longest_chain) VALUES ($identifier, $publickey, $unixtime, $block_id, $block_hash, $sig, $signer, $longest_chain)";
    var params = {
      $identifier:    keys[i].identifier,
      $publickey:     keys[i].publickey,
      $unixtime:      new Date().getTime(),
      $block_id:      0,
      $block_hash:    "",
      $sig:           this.app.crypto.signMessage(keys[i].identifier + keys[i].publickey + 0 + "", this.app.wallet.returnPrivateKey()),
      $signer:        this.app.wallet.returnPublicKey(),
      $longest_chain: 1
    };
    try {
      this.db.run(sql, params);
    } catch (err) {
      console.log(err);
    }
  }
}



///////////////////////
// addDatabaseRecord //
///////////////////////
//
// the master record does this ...
//
Registry.prototype.addDatabaseRecord = async function addDatabaseRecord(tx, blk, identifier) {

  var registry_self = this;

  try {

  var tmsql = "SELECT count(*) AS count FROM mod_registry_addresses WHERE identifier = $identifier";
  var params = { $identifier : identifier }

  let row = await registry_self.db.get(tmsql, params);

  if (row != null) {

    if (row.count == 0) {

      var msgtosign   = identifier + tx.transaction.from[0].add + blk.block.id + blk.returnHash();
      var registrysig = registry_self.app.crypto.signMessage(msgtosign, registry_self.app.wallet.returnPrivateKey());
      var sql = "INSERT OR IGNORE INTO mod_registry_addresses (identifier, publickey, unixtime, block_id, block_hash, signature, signer, longest_chain) VALUES ($identifier, $publickey, $unixtime, $block_id, $block_hash, $sig, $signer, $longest_chain)";
      var params = { $identifier : identifier, $publickey : tx.transaction.from[0].add, $unixtime : tx.transaction.ts , $block_id : blk.returnId(), $block_hash : blk.returnHash(), $sig : registrysig , $signer : registry_self.app.wallet.returnPublicKey(), $longest_chain : 1 };

      var sqlwrite = "INSERT" + "\t" + identifier + "\t" + blk.block.id + "\t" + blk.returnHash() + "\t" + tx.transaction.from[0].add + "\t" + tx.transaction.ts + "\t" + registrysig + "\t" + registry_self.app.wallet.returnPublicKey() + "\n";
      fs.appendFileSync((__dirname + "/web/addresses.txt"), sqlwrite, function(err) { if (err) { return console.log(err); } });

      registry_self.db.run(sql, params);

      if (tx.transaction.to[0].add == registry_self.publickey && registry_self.publickey == registry_self.app.wallet.returnPublicKey()) {

        var to = tx.transaction.from[0].add;
        var from = registry_self.app.wallet.returnPublicKey();
        var amount = 0.0;
        var fee = 2;

        server_email_html = 'You can now receive emails (and more!) at this address:<p></p>'+tx.transaction.msg.requested_identifier+'@'+registry_self.domain+'<p></p>Your Saito client should have automatically updated to recognize this address.';

        newtx = registry_self.app.wallet.createUnsignedTransaction(to, amount, fee);
        if (newtx == null) { return; }
        newtx.transaction.msg.module   = "Email";
        newtx.transaction.msg.data     = server_email_html;
        newtx.transaction.msg.title    = "Address Registration Success!";
        newtx.transaction.msg.sig      = sqlwrite;
        newtx.transaction.msg.markdown = 0;
        newtx = registry_self.app.wallet.signTransaction(newtx);
        registry_self.app.mempool.addTransaction(newtx);
      }
    } else {

      if (registry_self.publickey == registry_self.app.wallet.returnPublicKey()) {
        // identifier already registered

        to = tx.transaction.from[0].add;
        from = registry_self.app.wallet.returnPublicKey();
        amount = 0;

        server_email_html = identifier + ' is already registered';

        newtx = registry_self.app.wallet.createUnsignedTransactionWithDefaultFee(to, amount);
        if (newtx == null) { return; }
        newtx.transaction.msg.module = "Email";
        newtx.transaction.msg.data   = server_email_html;
        newtx.transaction.msg.title  = "Address Registration Failure!";
        newtx = registry_self.app.wallet.signTransaction(newtx);
        registry_self.app.mempool.addTransaction(newtx);

      }
    }
  };


  } catch (err) {
    console.log(err);
  }
}


