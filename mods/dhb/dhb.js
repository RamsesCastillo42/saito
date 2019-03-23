var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var fs = require('fs');
var shell = require('shelljs');


//////////////////
// CONSTRUCTOR  //
//////////////////
function DHB(app) {

  if (!(this instanceof DHB)) { return new DHB(app); }

  DHB.super_.call(this);

  this.app             = app;

  this.name            = "DHB";
  this.emailAppName    = "BloodBank Clinic";
  this.browser_active  = 0;
  this.handlesEmail    = 1;

  return this;

}
module.exports = DHB;
util.inherits(DHB, ModTemplate);








//////////////////
// Web Requests //
//////////////////
DHB.prototype.webServer = function webServer(app, expressapp) {

  var dhb_self = this;

  expressapp.get('/dhb/', function (req, res) {
    if (req.query.saito_address == null) {
      res.sendFile(__dirname + '/web/index.html');
      return;
    }
  });
  expressapp.get('/dhb/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
}










DHB.prototype.initializeHTML = function initializeHTML(app) {

console.log("\n\n\n");
console.log("____________________");
console.log("_______LOADING______");
console.log("____________________");
console.log("____________________");
console.log(JSON.stringify(this.app.options.bloodbank));

  this.updateClinicTable();

}



DHB.prototype.updateClinicTable = function updateClinicTable() {

  if (this.app.options.bloodbank == undefined) { this.app.options.bloodbank = []; }
  if (this.browser_active == 1) {

    $('#clinic_table').empty();
    for (let i = 0; i < this.app.options.bloodbank.length; i++) {

      let html  = '<tr>';
	  html += '<td>' + i + '</td>';
	  html += '<td>' + JSON.stringify(this.app.options.bloodbank[i]) + '</td>';
	  html += '</tr>';

      $('#clinic_table').append(html);

    }

  }

}


///////////////////
// Attach Events //
///////////////////
DHB.prototype.attachEvents = function attachEvents(app) {

  var dhb_self = this;

  if (app.BROWSER == 0) { return; }

}














DHB.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {

  var dhb_self = app.modules.returnModule("DHB");
  let txmsg = tx.returnMessage();

  if (app.BROWSER == 1) {

    if (conf == 0) {

      //
      // users can see their submission
      //
      if (tx.transaction.from[0].add == app.wallet.returnPublicKey()) {
        if (app.modules.returnModule("Email") != null) {
          var newtx = app.wallet.createUnsignedTransaction(app.wallet.returnPublicKey(), 0.0, 0.0);
          if (newtx == null) { return; }
          newtx.transaction.msg.module  = "Email";
          newtx.transaction.msg.title   = "Bloodbank Clinic Report Submitted";
          newtx.transaction.msg.data    = "You have submitted a bloodbank report into the Bloodbank Clini Network.\n\n"+tx.transaction.msg.title+"\n\n"+tx.transaction.msg.description+"\n\n"+tx.transaction.msg.version+"\n\n"+tx.transaction.msg.app_id;
          newtx = app.wallet.signTransaction(newtx);
          app.archives.saveTransaction(newtx);
          if (app.modules.returnModule("Email") != null) {
            app.modules.returnModule("Email").addMessageToInbox(newtx, app);
          }
        }
      }
    }

    //
    // clinic page updates
    //
    // app submission
    if (txmsg.request === "upload clinic") {

      var publisher   = tx.transaction.from[0].add;
      var title       = txmsg.title;
      var description = txmsg.description;
      var version     = txmsg.version;
      var app_id      = txmsg.app_id;

      if (dhb_self.app.options.bloodbank == undefined) {
        dhb_self.app.options.bloodbank = [];
      }

      let clinic_report = {};
      clinic_report.publisher = publisher;
      clinic_report.title = title;
      clinic_report.description = description;
      clinic_report.version = version;
      clinic_report.app_id = app_id;

      let new_clinic = 1;
      let clinic_idx = 0;

      for (let i = 0; i < dhb_self.app.options.bloodbank.length; i++) {
	if (dhb_self.app.options.bloodbank[i].publisher === clinic_report.publisher) {
	  new_clinic = 0;
	  clinic_idx = i;
	}
      }

      if (new_clinic == 1) {
	dhb_self.app.options.bloodbank.push(clinic_report);
      } else {
	dhb_self.app.options.bloodbank[clinic_idx] = clinic_report;
      }

      dhb_self.app.storage.saveOptions();

    }

    return;

  }
}








/////////////////////
// Email Functions //
/////////////////////
DHB.prototype.displayEmailForm = function displayEmailForm(app) {

  var dhb_self = this;

  $('.lightbox_compose_address_area').hide();

  element_to_edit = $('#module_editable_space');

  element_to_edit_html =  '';
  element_to_edit_html += '<p></p>';
  element_to_edit_html += '<div style="font-size:0.8em">Submit a DBH Clinic Transaction to the blockchain.</div>';
  element_to_edit_html += '<p></p>';
  element_to_edit_html +=  'Clinic: <br /><input type="text" class="app_title email_title" style="width:300px" id="app_title" value="" />';
  element_to_edit_html += '<p></p>';
  element_to_edit_html += 'Clinic ID: <br /><input type="text" class="app_id email_title" style="width:300px" id="app_id" value="" />';
  element_to_edit_html += '<p></p>';
  element_to_edit_html += 'Administrator: <br /><input type="text" class="app_version email_title" style="width:300px" id="app_version" value="" />';
  element_to_edit_html += '<p></p>';
  element_to_edit_html += 'Additional Comments: <br /><textarea class="app_description email_description" style="width:300px; height:150px" id="app_description" name="app_description"></textarea>';
  element_to_edit_html += '<p></p>';
  element_to_edit_html += '<input type="hidden" name="app_attachments" id="app_attachments">';
  element_to_edit_html += '<div id="app-file-wrap">';
  element_to_edit_html += '<div id="app-file-upload-shim" class="app-addfile">Attach Clinic Report</div></div>';
  //element_to_edit_html += '<style type="text/css"> .app-addfile { clear: both;  max-width: 140px;   color: #ffffff;   background-color: #d14836; text-align: center;  line-height: 29px;  font-weight: bold;  background-image: linear-gradient(to bottom, #dd4b39, #d14836); border: 1px solid #b0281a; cursor: pointer; } .add-addfile:hover {  background-image: linear-gradient(to bottom, #dd4b39, #c53727);  border: 1px solid #b0281a; } #app-file-wrap {  position: relative;  overflow: hidden;   display: inline-block;  min-width: 150px;  margin-top: 5px;  height: 30px;}</style>';

  $('#lightbox_compose_payment').val(0);
  $('#lightbox_compose_fee').val(app.wallet.returnDefaultFee());
  $('#lightbox_compose_to_address').val(app.wallet.returnPublicKey());

  element_to_edit.html(element_to_edit_html);
  $('#app_attachments').val("unset");
  $('.app_id').val(dhb_self.app.crypto.hash(Math.random().toString().substring(2, 15)));

  var files = {};
  var filecount = 0;
  var pfile = document.createElement('input');
  pfile.type = 'file';
  pfile.setAttribute('id', 'app_attachment');
  pfile.setAttribute('name', 'app_attachment');
  $('#app-file-wrap').append(pfile);

  $('#app_attachment').on('change', function() {
    var file_details = {};
    var upload = this.files[0];
    var file_name = document.createElement('div');
    file_name.setAttribute('class', 'file-upload');
    file_name.setAttribute('accessKey', filecount);
    $('.fancybox-inner').height($('.fancybox-inner').height() + 30);
    file_name.innerHTML = upload.name;
    file_name.addEventListener('click', function() {
      this.remove(this);
      delete files[this.accessKey];
      $('.fancybox-inner').height($('.fancybox-inner').height() - 30);
      $('#app_attachments').val(JSON.stringify(files));
    });
    element_to_edit.append(file_name);
    file_details.name = upload.name;
    file_details.size = upload.size;
    var code = "no content"
    var p = new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function() {
        code = reader.result;
        resolve(file_details.data = code);
        files[filecount] = file_details;
        $('#app_attachments').val(JSON.stringify(files));
        filecount += 1;
      };
      reader.readAsDataURL(upload);
    });
    this.value = "";
  });


}
DHB.prototype.formatEmailTransaction = function formatEmailTransaction(tx, app) {

  // always set the message.module to the name of the app
  tx.transaction.msg.module                = this.name;
  tx.transaction.msg.request               = "upload clinic";
  tx.transaction.msg.title                 = $('#app_title').val();
  tx.transaction.msg.description           = $('#app_description').val();
  tx.transaction.msg.version               = $('#app_version').val();
  tx.transaction.msg.app_id                = $('#app_id').val();
  tx.transaction.msg.attachments           = $('#app_attachments').val();

  return tx;

}








