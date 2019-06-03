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
  this.emailAppName    = "DHB Clinic Report";
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
console.log(JSON.stringify(this.app.options.dhb));

  this.updateClinicTable();

}



DHB.prototype.updateClinicTable = function updateClinicTable() {

  if (this.app.options.dhb == undefined) { this.app.options.dhb = []; }
  if (this.browser_active == 1) {

    $('#clinic_table').empty();
    for (let i = 0; i < this.app.options.dhb.length; i++) {

      let html  = '<tr>';
	  html += '<td>' + i + '</td>';
	  html += '<td>' + JSON.stringify(this.app.options.dhb[i]) + '</td>';
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
          newtx.transaction.msg.title   = "DHB Clinic Report Submitted";
          newtx.transaction.msg.data    = "You have submitted a report into the DHB Network.\n\n"+JSON.stringify(tx.transaction.msg);
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

      let clinic_report = {};
      clinic_report.publisher = tx.transaction.from[0].add;
      clinic_report.content = JSON.stringify(txmsg);

      if (dhb_self.app.options.dhb == undefined) { dhb_self.app.options.dhb = []; }

      let new_clinic = 1;
      let clinic_idx = 0;

      for (let i = 0; i < dhb_self.app.options.dhb.length; i++) {
	if (dhb_self.app.options.dhb[i].publisher === clinic_report.publisher) {
	  new_clinic = 0;
	  clinic_idx = i;
	}
      }

      if (new_clinic == 1) {
	dhb_self.app.options.dhb.push(clinic_report);
      } else {
	dhb_self.app.options.dhb[clinic_idx] = clinic_report;
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

  element_to_edit_html =  `

    <b>Add New Patient Data:</b>

    <p></p>

    <label for="patient_name">Patient Name</label>
    <br />
    <input type="text" id="patient_name" name="patient_name">

    <p></p>

    <label for="patient_birthdate">Birthday</label>
    <br />
    <input type="text" id="patient_birthdate" name="patient_birthdate">

    <p></p>

    <label for="patient_gender">Gender</label>
    <br />
    <select id="patient_gender" name="patient_gender">
      <option value="male">Male</option>
      <option value="female">Female</option>
    </select>

    <p></p>

    <label for="patient_height">Height</label>
    <br />
    <input type="text" id="patient_height" name="patient_height">

    <p></p>

    <label for="patient_weight">Weight</label>
    <br />
    <input type="text" id="patient_weight" name="patient_weight">

    <p></p>

    <label for="patient_condition">Condition</label>
    <br />
    <select id="patient_condition" name="patient_condition">
      <option value="type-1-diabetes">Type 1 Diabetes</option>
      <option value="type-2-diabetes">Type 2 Diabetes</option>
      <option value="high-cholesterol">High Cholesterol</option>
      <option value="high-blood-pressure">High Blood Pressure</option>
      <option value="other">Other</option>
    </select>

    <p></p>

    <label for="patient_history">Medical History</label>
    <br />
    <textarea id="patient_history"></textarea>

    <p></p>

  `;

  element_to_edit_html += '<input type="hidden" name="app_attachments" id="app_attachments">';
  element_to_edit_html += '<div id="app-file-wrap">';
  element_to_edit_html += '<div id="app-file-upload-shim" class="app-addfile">Attach Clinic Report</div></div>';
  //element_to_edit_html += '<style type="text/css"> .app-addfile { clear: both;  max-width: 140px;   color: #ffffff;   background-color: #d14836; text-align: center;  line-height: 29px;  font-weight: bold;  background-image: linear-gradient(to bottom, #dd4b39, #d14836); border: 1px solid #b0281a; cursor: pointer; } .add-addfile:hover {  background-image: linear-gradient(to bottom, #dd4b39, #c53727);  border: 1px solid #b0281a; } #app-file-wrap {  position: relative;  overflow: hidden;   display: inline-block;  min-width: 150px;  margin-top: 5px;  height: 30px;}</style>';

  $('#lightbox_compose_payment').val(0);
  $('#lightbox_compose_fee').val(app.wallet.returnDefaultFee());
  $('#lightbox_compose_to_address').val(app.wallet.returnPublicKey());

  element_to_edit.html(element_to_edit_html);
  $('#app_attachments').val("unset");
  //$('.app_id').val(dhb_self.app.crypto.hash(Math.random().toString().substring(2, 15)));

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
  tx.transaction.msg.patient_name          = $('#patient_name').val();
  tx.transaction.msg.patient_birthdate     = $('#patient_birthdate').val();
  tx.transaction.msg.patient_gender        = $('#patient_gender').val();
  tx.transaction.msg.patient_height        = $('#patient_height').val();
  tx.transaction.msg.patient_weight        = $('#patient_weight').val();
  tx.transaction.msg.patient_history       = $('#patient_history').val();
  tx.transaction.msg.patient_condition     = $('#patient_condition').val();
  tx.transaction.msg.attachments           = $('#app_attachments').val();

  return tx;

}








