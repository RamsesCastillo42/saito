var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var numeral = require('numeral');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Welcome(app) {

  if (!(this instanceof Welcome)) { return new Welcome(app); }

  Welcome.super_.call(this);

  this.app               = app;
  this.name              = "Welcome";

  return this;

}
module.exports = Welcome;
util.inherits(Welcome, ModTemplate);









/////////////////////////
// Handle Web Requests //
/////////////////////////
Welcome.prototype.webServer = function webServer(app, expressapp) {

  var reddit_self = this;

  expressapp.get('/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  // expressapp.get('/welcome', function (req, res) {
  //   res.sendFile(__dirname + '/web/index.html');
  //   return;
  // });
  // expressapp.get('/welcome/:application', function (req, res) {
  //   res.sendFile(__dirname + '/web/index.html');
  //   return;
  // });

}



Welcome.prototype.initialize = async function initialize() {

  //
  // test option file length
  //
  let options_file_length = JSON.stringify(this.app.options).length;

  console.log("WALLET SIZE: " + options_file_length + " bytes");
  //if (options_file_length > 100000) {
  if (options_file_length > 3000000) {

    let c = confirm("Your wallet is getting dangerously large... purge bloated data?");
    if (c) {

      let privatekey = "";
      let publickey = "";
      let identifier = "";

      //
      // clean up keychain
      //
      this.app.keys.clean();
      let keychain = this.app.keys;

      //
      // remove finished games
      //
      for (let i = 0; i < this.app.options.games; i++) {
 	if (this.app.options.games[i].over == 1) {
	  this.app.options.games[i].last_txmsg = "";
	  this.app.options.games.splice(i, 1);
	  i--;
        }
      }
      let games = this.app.options.games;
      let inputs = this.app.wallet.wallet.inputs;

      privatekey = this.app.wallet.returnPrivateKey();
      publickey  = this.app.wallet.returnPublicKey();
      identifier = this.app.options.wallet.identifier;
      
      this.app.archives.resetArchives();
      await this.app.storage.resetOptions();

      this.app.wallet.wallet.privatekey = privatekey;
      this.app.wallet.wallet.publickey = publickey;
      this.app.wallet.wallet.identifier = identifier;
      this.app.wallet.wallet.inputs = inputs;
      this.app.keys = keychain;
      this.app.wallet.saveWallet();

      alert("Your browser wallet has been cleaned up");
      location.reload();

    }
  }
}


/////////////////////
// Initialize HTML //
/////////////////////
Welcome.prototype.initializeHTML = function initializeHTML(app) {

  let module_self = this;

  if (app.BROWSER == 0) { return; }

  const chat = app.modules.returnModule("Chat");
  chat.addPopUpChat();

  if (app.options.display_adverts == 1 || app.options.display_adverts == undefined) {
    $('#disable_ads').html("Disable Ads");
    $('.advert-300-250').show();
  } else {
    $('#disable_ads').html("Enable Ads");
    $('.advert-300-250').hide();
  }

  this.updateControlPanel(app, app.blockchain.returnLatestBlock());
  this.updateModList(app);

  $('#reset').off();
  $('#reset').on('click', async () => {
    let reset_confirm = confirm("Are you sure you want to reset your wallet?");
    if (reset_confirm ){

      let preserve_keys = confirm("Do you want to purge your existing private keys too? If you are having difficulty click OK to get a completely new address too.");

      let privatekey = "";
      let publickey = "";
      let identifier = "";

      if (preserve_keys != 1) {
        privatekey = app.wallet.returnPrivateKey();
        publickey  = app.wallet.returnPublicKey();
        identifier = app.options.wallet.identifier;
      }

      app.archives.resetArchives();
      await app.storage.resetOptions();

      if (preserve_keys != 1) {
        app.wallet.wallet.privatekey = privatekey;
        app.wallet.wallet.publickey = publickey;
        app.wallet.wallet.identifier = identifier;
        app.wallet.wallet.balance = "0";
        app.wallet.saveWallet();
      } else {
        app.wallet.wallet.balance = "0";
      }

      alert("Your account has been reset");
      location.reload();
    }
  });

  $('#restore_wallet').off();
  $('#restore_wallet').on('click', function() {
    document.getElementById('file-input').addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) { return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        var contents = e.target.result;
        tmpoptions = JSON.parse(contents);
        if (tmpoptions.wallet.publickey != null) {
          app.options = JSON.parse(contents);
          app.storage.saveOptions();
          alert("Wallet Import Successful");
          //
          // now check if the slips are still valid
          //
          for (let z = 0; z < 1; z++) {
          //for (let z = 0; z < app.options.wallet.inputs.length; z++) {

            // find out initial state of peer and blockchain
            var userMessage = {};
              userMessage.request         = "slip check";
              userMessage.data            = {};
              userMessage.data.slip       = app.options.wallet.inputs[z];

console.log("CHECKING VALIDITY OF SLIP: " + z + " -- " + JSON.stringify(userMessage));

              app.network.peers[0].sendRequestWithCallback(userMessage.request, userMessage.data, function(resjson) {

              console.log("RESPONSE IS: " + JSON.stringify(resjson));
              let resobj = JSON.parse(resjson);
              if (resobj.valid == 1) {
                alert("The slips in this imported wallet are valid.");
              } else {
                let shddelete = confirm("The slips in this imported wallet may not be valid. Should we delete them?");
                if (shddelete) {

                  //
                  // delete wallet slips
                  //
                  module_self.app.options.wallet.version = module_self.app.wallet.wallet.version;

                  module_self.app.wallet.wallet.inputs = [];
                  module_self.app.wallet.wallet.outputs = [];
                  module_self.app.wallet.wallet.spends = [];
                  module_self.app.wallet.wallet.inputs_hmap = [];
                  module_self.app.wallet.wallet.outputs_hmap = [];

                  module_self.app.wallet.saveWallet();

                  alert("payment slips deleted, data preserved!");
                  location.reload();

                }
              }
            });
          }

        } else {
          alert("This does not seem to be a valid wallet file");
        }
      };
      reader.readAsText(file);
    }, false);
    $('#file-input').trigger('click');
  });

  $('#backup_wallet').off();
  $('#backup_wallet').on('click', function() {
    var content = JSON.stringify(app.options);
    var pom = document.createElement('a');
    pom.setAttribute('type', "hidden");
    pom.setAttribute('href', 'data:application/json;utf-8,' + encodeURIComponent(content));
    pom.setAttribute('download', "saito.wallet.json");
    document.body.appendChild(pom);
    pom.click();
    pom.remove();
  });

  $('#disable_ads').off();
  $('#disable_ads').on('click', function() {
    if (app.options.display_adverts == 1) {
      $('.advert-300-250').hide();
      $(this).html("Enable Ads");
      app.options.display_adverts = 0;
      app.storage.saveOptions();
    } else {
      $('.advert-300-250').show();
      $(this).html("Disable Ads");
      app.options.display_adverts = 1;
      app.storage.saveOptions();
    }
  });

  $('#register_address').off();
  $('#register_address').on('click', function() {
    location.href = "/register"; 
  });

};



Welcome.prototype.onNewBlock  = function onNewBlock(blk) {
  if (blk.app.BROWSER == 0) { return; }
  this.updateControlPanel(blk.app, blk);
}

Welcome.prototype.updateModList = function updateModList(app) {
  var module_names = app.modules.mods.map(module =>  module.name);

  var listItems = $('.mod-list li')
  for (let li of listItems) {
    if (!module_names.some(name => name == li.id)) {
      li.remove();
    }
  }
}




Welcome.prototype.updateControlPanel = function updateControlPanel(app, blk=null) {

  let saito_blocktime    = "";
  let saito_burnfee   = "";
  let saito_difficulty   = "";
  let saito_paysplit     = "";
  let saito_latest_block = "";

  let saito_email        = "";
  let saito_address      = "";
  let saito_balance      = "";
  let saito_fee          = "";

  if (blk == null) { 

    saito_blocktime = "updating...";
    saito_burnfee = 0.0;
    saito_difficulty = 0.0;
    saito_paysplit = 0.0;
    saito_latest_block = app.blockchain.last_bid;

  } else {

    let bts = new Date(blk.block.ts);
    saito_blocktime = bts.getHours() + ":" + ("0" + bts.getMinutes()).substr(-2) + ":" + ("0" + bts.getSeconds()).substr(-2);
    saito_burnfee = numeral(blk.block.bf.start).format('0,0.[00000]');
    saito_difficulty = numeral(blk.block.difficulty).format('0.[00000]'); 
    saito_paysplit = numeral(blk.block.paysplit).format('0.[00000]');
    saito_latest_block = numeral(blk.block.id).format('0,0');

  }

  saito_email   = app.wallet.returnIdentifier();
  saito_address = app.wallet.returnPublicKey();
  saito_balance = app.wallet.returnBalance();
  saito_fee     = app.wallet.returnDefaultFee();;

  if (saito_email == "") {
    saito_email = `
    <a href="/registry">
      <div class="register_address" id="register_address">[register address]</div>
    </a>
    `;
  }

  $('#saito_blocktime').html(saito_blocktime);
  $('#saito_burnfee').html(saito_burnfee);
  $('#saito_difficulty').html(saito_difficulty);
  $('#saito_paysplit').html(saito_paysplit);
  $('#saito_latest_block').html(saito_latest_block);

  $('#saito_email').html(saito_email);
  $('#saito_address').html(saito_address);
  $('#saito_balance').html(numeral(saito_balance).format('0,0.[00000000]'));
  //$('#saito_fee').html(saito_fee);

}




