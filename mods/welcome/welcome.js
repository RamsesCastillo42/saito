var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');


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
  $('#reset').on('click', function() {
    let reset_confirm = confirm("Are you sure you want to reset your wallet? You cannot retrieve your keys once you delete them")
    if (reset_confirm ){
      app.archives.resetArchives();
      app.storage.resetOptions();
      app.storage.saveOptions();
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
  let saito_difficulty   = "";
  let saito_paysplit     = "";
  let saito_latest_block = "";

  let saito_email        = "";
  let saito_address      = "";
  let saito_balance      = "";
  let saito_fee          = "";

  if (blk == null) { 

    saito_blocktime = "updating...";
    saito_difficulty = 0.0;
    saito_paysplit = 0.0;
    saito_latest_block = app.blockchain.last_bid;

  } else {

    let bts = new Date(blk.block.ts);
    saito_blocktime = bts.getHours() + ":" + ("0" + bts.getMinutes()).substr(-2) + ":" + ("0" + bts.getSeconds()).substr(-2);
    saito_difficulty = blk.block.difficulty;
    saito_paysplit = blk.block.paysplit;
    saito_latest_block = blk.block.id;

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
  $('#saito_difficulty').html(saito_difficulty);
  $('#saito_paysplit').html(saito_paysplit);
  $('#saito_latest_block').html(saito_latest_block);

  $('#saito_email').html(saito_email);
  $('#saito_address').html(saito_address);
  $('#saito_balance').html(saito_balance);
  //$('#saito_fee').html(saito_fee);

}


