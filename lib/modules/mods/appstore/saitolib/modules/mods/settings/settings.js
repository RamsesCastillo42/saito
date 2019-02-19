var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Settings(app) {

  if (!(this instanceof Settings)) { return new Settings(app); }

  Settings.super_.call(this);

  this.app             = app;

  this.name            = "Settings";
  this.browser_active  = 0;
  this.handlesEmail    = 1;
  this.emailAppName    = "Settings";

  return this;

}
module.exports = Settings;
util.inherits(Settings, ModTemplate);






////////////////////////////////
// Email Client Interactivity //
////////////////////////////////
Settings.prototype.displayEmailForm = function displayEmailForm(app) {

  element_to_edit = $('#module_editable_space');

  element_to_edit_html = `
    <div id="module_instructions" class="module_instructions">
      <b>Network Keys:</b>
      <div class="courier">
public:&nbsp; ${app.wallet.returnPublicKey()}
<br />
private: <input id="privatekey" type="password" value="${app.wallet.returnPrivateKey()}" class="password" />
<br />
address: ${app.wallet.returnIdentifier() || "no address registered"}
      </div>
      <p></p>
      <b>Advanced Options:</b>
      <br/>
      <input type="button" id="save_wallet" class="settings_button save_wallet" value="Backup Wallet" />
      <input type="button" id="save_messages" class="settings_button save_messages" value="Backup Inbox" />
      <input type="button" id="import_wallet" class="settings_button import_wallet" value="Import Wallet" />
      <input type="button" id="reset_button" class="settings_button reset_button" value="Reset Account" />
      <input type="button" id="restore_privatekey" class="settings_button restore_privatekey" value="Restore Wallet from Private Key" />
      <input type="button" id="change_default_fee" class="settings_button change_default_fee" value="Change Default Fee" />
      <input id="file-input" class="file-input" type="file" name="name" style="display:none;" />
      <p></p>
      <div style="display:none" id="change_default_fee_div" class="change_default_fee_div">
        <b>Change Default Fee:</b>
        <p></p>
        <input type="range" id="feerange" class="feerange" min="0.001" value="${app.wallet.returnDefaultFee()}" max="2" step="0.001" style="width:120px" oninput="updateFeeDisplay(value)" />
        <output for="feerange" id="feedisplay" style="margin-left:20px;font-size:0.9em;padding-bottom:3px;">${app.wallet.returnDefaultFee()} SAITO</output>
      </div>
      <div style="display:none" id="restore_privatekey_div" class="restore_privatekey_div">
        <label for="restore_privatekey_input">Your Private Key:</label>
        <br />
        <input style="font-size:1.2em;min-width:200px" type="text" name="restore_privatekey_input" id="restore_privatekey_input" class="restore_privatekey_input" />
        <input type="button" id="restore_privatekey_submit" value="Import Private Key" class="restore_privatekey_submit settings_button" />
        <p style="clear:both;margin-top:30px;"></p>
      </div>
     <div class="dns_info" id="dns_info">
     <b>DNS Information</b>
     <p></p>
     You are trusting the following DNS servers.
     <div class="dns_servers" id="dns_servers">
       <table id="dns_servers_table" class="dns_servers_table" style="margin-left: 25px">
         <tr>
           <th style="padding-right:25px;" align="left">Domain</th>
           <th style="padding-right:25px;" align="left">Server</th>
           <th style="padding-right:25px;" align="left">Public Key</th>
         </tr>
       </table>
     </div>
     <p></p>
     </div>
   </div>
   <style type="text/css">
     .courier {
       font-family: "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace;
       line-height: 1.6em;
     }
     .module_instructions {
       padding: 12px;
       font-size:0.9em;
       word-wrap: break-word;
     }
     .settings_button {
       padding-left: 15px;
       padding-right: 15px;
       padding-top: 12px;
       padding-bottom: 12px;
       font-size: 1.4em;
       margin-bottom: 10px;
     }
     input.password {
      border: none;
      width: 80%;
      background: none;
      cursor: pointer;
     }
     input.password:focus {
      outline: none;
    }
   </style>
   <script type="text/javascript">
      function updateFeeDisplay(vol) {
        document.querySelector("#feedisplay").value = vol;
      }
  </script>`;
  element_to_edit.html(element_to_edit_html);

  $('#module_textinput_button').off();
  $('#module_textinput_button').on('click', function() {
    var identifier_to_check = $('module_textinput').val();
    var regex=/^[0-9A-Za-z]+$/;
    if (regex.test(identifier_to_check)) {
      $('#send').click();
    } else {
      alert("Only Alphanumeric Characters Permitted");
    }
  });
  
  $('#privatekey').on('click', function() {
    console.log("------------surely-------------");
    if ($('#privatekey')[0].type=="password") {
      $('#privatekey')[0].type="text";
    }else {
      $('#privatekey')[0].type="password";
    }
  });


  // auto-input correct address and payment amount
  $('#lightbox_compose_to_address').val(app.wallet.returnPublicKey());
  $('#lightbox_compose_payment').val(0.0);
  $('#lightbox_compose_fee').val(app.wallet.returnDefaultFee());
  $('.lightbox_compose_address_area').hide();
  $('.lightbox_compose_module').hide();
  $('#module_textinput').focus();
  $('#module_instructions').css('padding-top','4px');

  this.attachSettingsEvents(app);
}


/////////////////////
// Display Message //
/////////////////////
Settings.prototype.displayEmailMessage = function displayEmailMessage(app, message_id) {

  if (app.BROWSER == 1) {

    message_text_selector = "#" + message_id + " > .data";
    $('#lightbox_message_text').html( $(message_text_selector).html() );
    $('#lightbox_compose_to_address').val(registry_self.publickey);
    $('#lightbox_compose_payment').val(3);
    $('#lightbox_compose_fee').val(2);

  }

}





Settings.prototype.attachSettingsEvents = function attachSettingsEvents(app) {

  module_self = app.modules.returnModule("Settings");

  $('.lightbox_viewkeys_publickey').html(app.wallet.returnPublicKey());
  $('.lightbox_viewkeys_privatekey').html(app.wallet.returnPrivateKey());
  $('.lightbox_viewkeys_identifier').html(app.wallet.returnIdentifier());

  $('.restore_privatekey').off();
  $('.restore_privatekey').on('click', function() {
    $('.restore_privatekey_div').toggle();
    module_self.attachSettingsEvents(module_self.app);
  });

  $('.change_default_fee').off();
  $('.change_default_fee').on('click', function() {
    $('.change_default_fee_div').toggle();
  });


  $('.feerange').off();
  $('.feerange').on('change', function() {
    let newfee = $('.feerange').val();
    alert("\n\n\nCHANGING THE FEE: "+newfee+" \n\n\n");
    module_self.app.wallet.setDefaultFee(newfee);
  });

  $('.save_wallet').off();
  $('.save_wallet').on('click', function() {
    content    = JSON.stringify(module_self.app.options);
    var pom = document.createElement('a');
    pom.setAttribute('type', "hidden");
    pom.setAttribute('href', 'data:application/json;utf-8,' + encodeURIComponent(content));
    pom.setAttribute('download', "saito.wallet.json");
    document.body.appendChild(pom);
    pom.click();
    pom.remove();
  });


  $('.import_wallet').off();
  $('.import_wallet').on('click', function() {
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
	        let shddelete = confirm("The slips in this imported wallet are spent. Should we delete?");
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

  $('.save_messages').off();
  $('.save_messages').on('click', function() {
    content    = JSON.stringify(module_self.app.archives.messages);
    var pom = document.createElement('a');
        pom.setAttribute('href', 'data:application/json;utf-8,' + encodeURIComponent(content));
        pom.setAttribute('download', "saito.messages.json");
        document.body.appendChild(pom);
        pom.click();
        pom.remove();
  });

  $('.reset_button').off();
  $('.reset_button').on('click', function() {
    let reset_confirm = confirm("Are you sure you want to reset your wallet? You cannot retrieve your keys once you delete them")
    if (reset_confirm) {
      module_self.app.archives.resetArchives();
      module_self.app.storage.resetOptions();
      module_self.app.storage.saveOptions();
      alert("Your account has been reset");
      location.reload();
    }
  });

  if (module_self.app.dns.dns.domains.length == 0) {
    $('.dns_info').hide();
  } else {

    // customize dns settings display
    $('.dns_servers_table tr').empty();
    for (let c = 0; c < module_self.app.dns.dns.domains.length; c++) {
      var tmphtml = '<tr><th align="left" style="padding-right:25px;">Domain</th><th align="left" style="padding-right:25px">Host</th><th align="left">Public Key</th></tr>';
      $('.dns_servers_table').append(tmphtml);
      var dnsurl = "unknown";
      for (let cvs = 0; cvs < module_self.app.network.peers.length; cvs++) {
        if (module_self.app.dns.dns.domains[c].publickey == module_self.app.network.peers[cvs].peer.publickey) {
          dnsurl = module_self.app.network.peers[cvs].peer.host;
          tmphtml = '<tr><td>'+module_self.app.dns.dns.domains[c].domain+'</td><td>'+dnsurl+'</td><td>'+module_self.app.dns.dns.domains[c].publickey+'</td></tr>';
          $('#dns_servers_table tr:last').after(tmphtml);
        }
      }
      if (dnsurl == "unknown") {
        tmphtml = '<tr><td style="padding-right:14px;">'+module_self.app.dns.dns.domains[c].domain+'</td><td style="padding-right:14px;">UNKNOWN</td><td style="padding-right:14px;">PUBLIC KEY OUT-OF-DATE</td></tr>';
        $('.dns_servers_table tr:last').after(tmphtml);
      }
    };

  }


  $('#restore_privatekey_submit').off();
  $('#restore_privatekey_submit').on('click', function() {

    var privkey = $('#restore_privatekey_input').val();
    privkey.trim();
    var pubkey = module_self.app.crypto.returnPublicKey(privkey);

    if (pubkey != "") {

      // regardless of whether we got an identifier, save
      module_self.app.wallet.wallet.inputs = [];
      module_self.app.wallet.wallet.outputs = [];
      module_self.app.wallet.wallet.privatekey = privkey;
      module_self.app.wallet.wallet.publickey  = pubkey;

      module_self.app.dns.fetchIdentifier(pubkey, function (answer) {
        if (module_self.app.dns.isRecordValid(answer) != 0) {
          dns_response = JSON.parse(answer);
          module_self.app.wallet.wallet.identifier = dns_response.identifier;
        }
        module_self.app.options.blockchain.lastblock = 0;
        module_self.app.storage.saveOptions();
        module_self.app.wallet.saveWallet();

        alert("Your Wallet and Email Address Restored!");
        location.reload();
      });
    }

  });

}






