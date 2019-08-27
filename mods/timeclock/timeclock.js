const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
var util = require('util');


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


    sql = 'CREATE TABLE IF NOT EXISTS links (\
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

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

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
  // logout
  //
  $('#logout').off();
  $('#logout').on('click', function() {
    let newtx = timeclock_self.app.wallet.createUnsignedTransactionWithDefaultFee(timeclock_self.address, 0.0);
    if (newtx == null) {
      alert("Error Logging-in! Does this browser have Saito tokens?");
    } else {
      newtx.transaction.msg.module       = "TimeClock";
      newtx.transaction.msg.data         = {};
      newtx.transaction.msg.data.request = "logout";
      newtx = timeclock_self.app.wallet.signTransaction(newtx);
      timeclock_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {
        window.location = '/timeclock';
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
    if (txmsg.data.request == "login") {

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
    // register
    //
    if (txmsg.data.request == "register") {

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
    if (txmsg.data.request == "logout") {

      let sql = "SELECT max(id) FROM sessions WHERE address = $address AND active = 1";
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
        sql = "UPDATE sessions SET logout = $logout WHERE id = $id";
        params = {
	  $logout : blk.block.id ,
	  $id : session_id
	}
	timeclock_self.db.run(sql, params);
      }
    }

  }
}



/////////////////////////
// Handle Web Requests //
/////////////////////////
TimeClock.prototype.webServer = function webServer(app, expressapp) {

  var reddit_self = this;

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

 



