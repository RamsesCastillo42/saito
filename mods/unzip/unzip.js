var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var crypto = require('crypto');

var admzip = require('adm-zip');
//var request = require('request');
var http = require('http');






//////////////////
// CONSTRUCTOR  //
//////////////////
function Unzip(app) {

  if (!(this instanceof Unzip)) { return new Unzip(app); }

  Unzip.super_.call(this);

  this.app             = app;
  this.name            = "Unzip";
  this.browser_active  = 1;		// enables initializeHTML function
  return this;

}
module.exports = Unzip;
util.inherits(Unzip, ModTemplate);








////////////////
// Initialize //
////////////////
Unzip.prototype.initialize = function initialize() {


}






/////////////////////
// Initialize HTML //
/////////////////////
Unzip.prototype.initializeHTML = function initializeHTML() {

var file_url = 'http://saito.tech/tmpzip.zip';

  alert("Downloading: " + file_url);


http.get(file_url, function(res) {

  var data = [];
  var dataLen = 0;

  res.on('data', function(chunk) {
    data.push(chunk);
    dataLen += chunk.length;

  }).on('end', function() {

console.log("ENTIRE FILE DOWNLOADED: ");

    var buf = Buffer.alloc(dataLen);

    for (var i = 0, len = data.length, pos = 0; i < len; i++) {
      data[i].copy(buf, pos);
      pos += data[i].length;
    }

    var zip = new admzip(buf);
    var zipEntries = zip.getEntries();
    console.log("FILES: " + zipEntries.length)

    for (var i = 0; i < zipEntries.length; i++) {
      console.log(zipEntries[i].entryName);
      if (zipEntries[i].entryName.match(/readme/))
        console.log(zip.readAsText(zipEntries[i]));
    }
  });
});

/*

request.get({url: file_url, encoding: null}, (err, res, body) => {

  alert("WE HAVE THE FILE: " + file_url);

  var zip = new admzip(body);
  var zipEntries = zip.getEntries();
  console.log(zipEntries.length);
  console.log("FILES: " + zipEntries.length)

  zipEntries.forEach((entry) => {
    console.log(zipEntries[i].entryName);
    if (entry.entryName.match(/readme/i))
      console.log(zip.readAsText(entry));
  });
});

*/


}








/////////////////////////
// Handle Web Requests //
/////////////////////////
Unzip.prototype.webServer = function webServer(app, expressapp) {

  var unzip_self = this;

  expressapp.get('/unzip', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/unzip/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });

}



