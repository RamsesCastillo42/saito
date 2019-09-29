const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
var util = require('util');
const markdown = require( "markdown" ).markdown;
const linkifyHtml = require('linkifyjs/html');


//////////////////
// CONSTRUCTOR  //
//////////////////
function TimeClock(app) {

  if (!(this instanceof TimeClock)) { return new TimeClock(app); }
  TimeClock.super_.call(this);

  this.app = app;
  this.name = "TimeClock";


  this.db = null;
  this.admin = "";
  this.address = this.app.wallet.returnPublicKey();

  return this;

}
module.exports = TimeClock;
util.inherits(TimeClock, ModTemplate);






TimeClock.prototype.installModule = async function installModule() {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  var timeclock_self = this;

  try {
    var sqlite = require('sqlite');
    this.db = await sqlite.open('./data/timeclock.sq3');
    var sql = "";
    var params = {};



    sql = 'CREATE TABLE IF NOT EXISTS users (\
                  id INTEGER, \
                  address TEXT, \
                  identifier TEXT, \
                  active INTEGER, \
                  PRIMARY KEY(id ASC) \
          )';
    params = {};
    await this.db.run(sql, params);

    sql = 'CREATE TABLE IF NOT EXISTS announcements (\
                  id INTEGER, \
                  address TEXT, \
                  announcement TEXT, \
                  created_at INTEGER, \
                  PRIMARY KEY(id ASC) \
          )';
    params = {};
    await this.db.run(sql, params);


    sql = 'CREATE TABLE IF NOT EXISTS sessions (\
                  id INTEGER, \
                  address TEXT, \
                  login INTEGER, \
                  logout INTEGER, \
                  force_logout INTEGER, \
                  active INTEGER, \
                  report TEXT, \
                  PRIMARY KEY(id ASC) \
          )';
    params = {};
    await this.db.run(sql, params);

    //res = await this.db.run("CREATE INDEX mod_timeclock_idx ON mod_timeblock(depositor_publickey, rebroadcast, longest_chain)", {});
    //res = await this.db.run("CREATE INDEX mod_timeclock_idx2 ON mod_timeclock(rebroadcast, longest_chain)", {});

  } catch (err) {}

}
TimeClock.prototype.initialize = async function initialize() {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) {

    ///////////////////
    // ANNOUNCEMENTS //
    ///////////////////
    var rdloadtimer = setTimeout(() => {
          message                 = {};
          message.request         = "timeclock load announcements";
          message.data            = {};
          message.data.request    = "timeclock load announcements";
          this.app.network.sendRequest(message.request, message.data);
    }, 500);


    ///////////
    // STAFF //
    ///////////
    var rdloadtimer = setTimeout(() => {
          message                 = {};
          message.request         = "timeclock load staff";
          message.data            = {};
          message.data.request    = "timeclock load staff";
          this.app.network.sendRequest(message.request, message.data);
    }, 500);


    //////////////
    // CALENDAR //
    //////////////
    var rdloadtimer = setTimeout(() => {
          message                 = {};
          message.request         = "timeclock load calendar";
          message.data            = {};
          message.data.request    = "timeclock load calendar";
          this.app.network.sendRequest(message.request, message.data);
    }, 500);


    return; 
  }



  if (this.db == null) {
    try {
      var sqlite = require('sqlite');
      this.db = await sqlite.open('./data/timeclock.sq3');
    } catch (err) {}
  }

}





TimeClock.prototype.attachEvents = function attachEvents() {

  let timeclock_self = this;

  //
  // login
  //
  $('#login').off();
  $('#login').on('click', function() {
    let newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "login";
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock/dashboard';
      });
    }
  });


  //
  // post announcement
  //
  $('#post_announcement').off();
  $('#post_announcement').on('click', function() {
    let newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "post announcement";
      newtx.transaction.msg.data.text    = $('.announcement_textarea').val();
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock/dashboard';
      });
    }
  });


  //
  // registration
  //
  $('#register').off();
  $('#register').on('click', function() {
    let newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "register";
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock/waiting';
      });
    }
  });



  //
  // submit logout
  //
  $('#submit_logout').off();
  $('#submit_logout').on('click', function() {

    let organics = $('#organics').val();
    let nonorganics = $('#nonorganics').val();
    let marketing = $('#submit_marketing').val();
    let problems = $('#submit_text').val();

    let report = {};
        report.organics = organics;
        report.nonorganics = nonorganics;
        report.marketing = marketing;
        report.problems = problems;

    let newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "logout";
      newtx.transaction.msg.data.report  = report;
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock';
      });
    }
  });
  //
  // logout
  //
  $('#logout').off();
  $('#logout').on('click', function() {
    timeclock_self.showLogoutForm();
  });


  //
  // force logout
  //
  $('.force_logout').off();
  $('.force_logout').on('click', function() {
    let address_to_logout = $(this).attr("id");
alert("logging out: " + address_to_logout);
    newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "force logout";
      newtx.transaction.msg.data.address = address_to_logout;
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock/dashboard';
      });
    }
  });



}



//////////////////
// Confirmation //
//////////////////
TimeClock.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  var timeclock_self = app.modules.returnModule("TimeClock");

  if (app.BROWSER == 1) { return; }


  if (conf == 0) {

    let txmsg = tx.returnMessage();

    //
    // login
    //
    if (txmsg.data.request === "login") {

      let sql = "UPDATE users SET active = 1 WHERE active = $active AND address = $address";
      let params = {
        $active : 0 ,
	$address : tx.transaction.from[0].add
      }
      await timeclock_self.db.run(sql, params);


      sql = "SELECT count(*) AS count FROM users WHERE address = $address";
      params = {
	$address : tx.transaction.from[0].add
      }

      let results = await timeclock_self.db.all(sql, params);
      let authorized = 0;
      if (results != null) {
	if (results.length > 0) {
          authorized = results[0].count;
	}
      }

      if (authorized == 1) {
        sql = "INSERT INTO sessions (address, login, active) VALUES ($address, $login, $active)";
        params = {
	  $address : tx.transaction.from[0].add ,
	  $login : blk.block.ts ,
	  $active : 1
	}
	timeclock_self.db.run(sql, params);
      }

    }


    //
    // post announcement
    //
    if (txmsg.data.request === "post announcement") {

      sql = "INSERT INTO announcements (address, announcement) VALUES ($address, $text)";
      params = {
        $address : tx.transaction.from[0].add ,
        $text : txmsg.data.text
      }
      timeclock_self.db.run(sql, params);

    }



    //
    // register
    //
    if (txmsg.data.request === "register") {

      let sql = "SELECT count(*) AS count FROM users WHERE address = $address";
      let params = {
	$address : tx.transaction.from[0].add
      }

      let results = await timeclock_self.db.all(sql, params);
      let authorized = 0;
      if (results != null) {
	if (results.length > 0) {
          authorized = results[0].count;
	}
      }

      if (authorized == 0) {
        sql = "INSERT INTO users (address, active) VALUES ($address, $active)";
        params = {
	  $address : tx.transaction.from[0].add ,
	  $active : 0
	}
	timeclock_self.db.run(sql, params);
      }
    }



    //
    // logout
    //
    if (txmsg.data.request === "logout") {

      let sql = "SELECT max(id) AS id FROM sessions WHERE address = $address AND active = 1";
      let params = {
	$address : tx.transaction.from[0].add
      }
      let report = "";

      if (txmsg.data.report != undefined) { report = txmsg.data.report; }

      let results = await timeclock_self.db.all(sql, params);
      let session_id = -1;
      if (results != null) {
	if (results.length > 0) {
          session_id = results[0].id;
	}
      }

      if (session_id >= 0) {
        sql = "UPDATE sessions SET force_logout = 0 , logout = $logout , report = $report , active = 0 WHERE id = $id";
        params = {
	  $logout : blk.block.ts ,
	  $report : JSON.stringify(report) ,
	  $id : session_id
	}
	await timeclock_self.db.run(sql, params);
      }
    }


    //
    // force logout
    //
    if (txmsg.data.request === "force logout") {

      let sql = "SELECT max(id) AS id FROM sessions WHERE address = $address AND active = 1";
      let params = {
	$address : tx.transaction.from[0].add
      }

      let results = await timeclock_self.db.all(sql, params);
      let session_id = -1;
      if (results != null) {
	if (results.length > 0) {
          session_id = results[0].id;
	}
      }

      if (session_id >= 0) {
        sql = "UPDATE sessions SET force_logout = 1, logout = $logout , active = 0 WHERE id = $id";
        params = {
	  $logout : blk.block.ts ,
	  $id : session_id
	}
	await timeclock_self.db.run(sql, params);

        sql = "UPDATE sessions SET force_logout = 1 , logout = $logout , active = 0 WHERE active = 1 AND address = $address";
        params = {
	  $logout : blk.block.ts ,
	  $address : txmsg.data.address
	}
	await timeclock_self.db.run(sql, params);

      }
    }

  }
}



/////////////////////////
// Handle Web Requests //
/////////////////////////
TimeClock.prototype.webServer = function webServer(app, expressapp) {

  var timeclock_self = this;

  expressapp.get('/timeclock/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/timeclock/waiting/', function (req, res) {
    res.sendFile(__dirname + '/web/waiting.html');
    return;
  });
  expressapp.get('/timeclock/dashboard/', function (req, res) {
    res.sendFile(__dirname + '/web/dashboard.html');
    return;
  });
  expressapp.get('/timeclock/calendar/', function (req, res) {
    res.sendFile(__dirname + '/web/calendar.html');
    return;
  });
  expressapp.get('/timeclock/admin/', function (req, res) {
    res.sendFile(__dirname + '/web/admin.html');
    return;
  });
  expressapp.get('/timeclock/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/timeclock/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;
  });
  expressapp.get('/timeclock/img/:imagefile',  (req, res) => {
    var imgf = '/web/img/'+req.params.imagefile;
    if (imgf.indexOf("\/") != false) { return; }
    res.sendFile(__dirname + imgf);
    return;
  });

}

 






//////////////////////////
// Handle Peer Requests //
//////////////////////////
TimeClock.prototype.handlePeerRequest = async function handlePeerRequest(app, msg, peer, mycallback) {

  var timeclock_self = this;


  ////////////////////////
  // server -- calendar //
  ////////////////////////
  if (msg.request === "timeclock load calendar") {

    let datenow = new Date().getTime();
    let weekago = datenow - (604800000);  // 60 x 60 x 24 x 7

    //
    // fetch data from server and send it back
    //
    let sql    = "SELECT * FROM sessions WHERE login > $weekago ORDER BY login DESC";
    let params = { $weekago : weekago };
    let sessions = [];

    try {
      var rows = await timeclock_self.db.all(sql, params);
    } catch(err) {
      console.log(err);
    }

console.log("returning timeclock info...");
console.log(JSON.stringify(rows));

    if (rows != null) {
      if (rows.length != 0) {
        for (var fat = 0; fat < rows.length; fat++) {
          sessions[fat] = {};
          sessions[fat].session = JSON.stringify(rows[fat]);
        }
        peer.sendRequest("timeclock calendar", sessions);
      }
      return;
    }

    return;
  }





  ////////////////////////
  // server -- calendar //
  ////////////////////////
  if (msg.request === "timeclock calendar") {
console.log("received calendar info: ");
    for (let i = 0; i < msg.data.length; i++) {
      console.log(msg.data[i]);
    }
    return;
  }




  /////////////////////////////
  // server -- announcements //
  /////////////////////////////
  if (msg.request === "timeclock load announcements") {

    let sql    = "SELECT * FROM announcements ORDER BY id DESC";
    let params = {};
    let announcements = [];

    try {
      var rows = await timeclock_self.db.all(sql, params);
    } catch(err) {
      console.log(err);
    }

    if (rows != null) {
      if (rows.length != 0) {
        for (var fat = 0; fat < rows.length; fat++) {
          announcements[fat] = {};
          announcements[fat].announcement = rows[fat].announcement;
        }
        peer.sendRequest("timeclock announcements", announcements);
      }
      return;
    }

    announcements[0] = {};
    announcements[0].text = "No announcements";
    peer.sendRequest("timeclock announcements", announcements);

    return;
  }

  /////////////////////////////
  // client -- announcements //
  /////////////////////////////
  if (msg.request == "timeclock announcements") {
    for (let i = 0; i < msg.data.length; i++) {
      this.addAnnouncement(msg.data[i]);
    }
    return;
  }




  /////////////////////
  // server -- staff //
  /////////////////////
  if (msg.request === "timeclock load staff") {

    let sql    = "SELECT * FROM sessions WHERE active = 1";
    let params = {};
    let staff  = [];

    try {
      var rows = await timeclock_self.db.all(sql, params);
    } catch(err) {
      console.log(err);
    }

    if (rows != null) {
      if (rows.length != 0) {
        for (var fat = 0; fat < rows.length; fat++) {
          staff[fat] = {};
          staff[fat].address = rows[fat].address;
          staff[fat].login = rows[fat].login;
        }
        peer.sendRequest("timeclock staff", staff);
      }
      return;
    }

    staff[0] = {};
    announcements[0].address = "none online";
    announcements[0].login = new Date().getTime();
    peer.sendRequest("timeclock staff", staff);

    return;
  }

  /////////////////////
  // client -- staff //
  /////////////////////
  if (msg.request == "timeclock staff") {
    for (let i = 0; i < msg.data.length; i++) {
      this.addStaff(msg.data[i]);
    }
    return;
  }

}






TimeClock.prototype.addAnnouncement = function addAnnouncement(announcement) {
  $('.announcements').append('<li class="announcement">'+linkifyHtml(markdown.toHTML(announcement.announcement))+'</li>');}

TimeClock.prototype.addStaff = async function addStaff(staff) {
  let current_time = new Date().getTime();
  let time_engaged = current_time - staff.login;
  let identifier = await this.app.dns.fetchIdentifierPromise(staff.address);
  if (identifier == staff.address) { identifier = "unknown"; }
  let short_address = staff.address.substring(0,14) + "...";
  $('.staff').append('<tr><td>'+short_address+'</td><td>'+identifier+'</td><td>'+staff.login+'</td><td class="force_logout" id="'+staff.address+'">'+this.returnElapsedTime(time_engaged)+'</td></tr>');
  this.attachEvents();
}




TimeClock.prototype.returnElapsedTime = function returnElapsedTime(duration) {

  var milliseconds = parseInt((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;

}

TimeClock.prototype.showLogoutForm = function showLogoutForm() {

  var modal = document.getElementById("logout_modal");
  modal.style.display = "block";

  $('#modal_header_text').html('Session Information');
  $('#modal_body_text').html(
      `
      <div id="submit_post" class="submit_post">
        <select name="organics" class="modal_select organics" id="organics">
	  <option value="0" selected>0 games</option>
	  <option value="1"         >1 games</option>
	  <option value="2"         >2 games</option>
	  <option value="3"         >3 games</option>
	  <option value="4"         >4 games</option>
	  <option value="5"         >5 games</option>
	  <option value="6"         >6+ games</option>
	</select>
        <select name="nonorganics" class="modal_select nonorganics" id="nonorganics">
	  <option value="0" selected>0 organic</option>
	  <option value="1"         >1 organic</option>
	  <option value="2"         >2 organic</option>
	  <option value="3"         >3 organic</option>
	  <option value="4"         >4 organic</option>
	  <option value="5"         >5 organic</option>
	  <option value="6"         >6+ organic</option>
	</select>
	<p></p>
        <div for="submit_marketing" class="submit_marketing_label modal_label" id="submit_marketing_label">marketing work?</div>
        <textarea class="submit_marketing modal_textarea" id="submit_marketing" name="submit_marketing"></textarea>
	<p></p>
        <div for="submit_text" class="submit_text_label modal_label" id="submit_text_label">any problems?</div>
        <textarea class="submit_text modal_textarea" id="submit_text" name="submit_text"></textarea>
	<p></p>
        <div class="orange_button" id="submit_logout">submit</div>
      </div>
      `
  );

  this.attachEvents();

}


