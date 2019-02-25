var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var markdown = require("markdown").markdown;




//////////////////
// CONSTRUCTOR  //
//////////////////
function Arcade(app) {

  if (!(this instanceof Arcade)) { return new Arcade(app); }

  Arcade.super_.call(this);

  this.app             = app;

  this.name            = "Arcade";
  this.browser_active  = 0;
  this.emailAppName    = "Arcade";


  this.initialization_check_active = true;
  this.initializetion_check_speed  = 2000;
  this.initialization_check_timer  = null;

  this.active_game     = "";
  this.active_game_id  = "";

  this.currently_playing = 0;

  return this;

}
module.exports = Arcade;
util.inherits(Arcade, ModTemplate);




Arcade.prototype.initializeHTML = function initializeHTML(app) {

  //
  // add chat
  //
  const chat = app.modules.returnModule("Chat");
  chat.addPopUpChat();

  //
  // add games to table
  //
  if (app.options.games != undefined) {
    if (app.options.games.length > 0) {

      for (let i = 0; i < app.options.games.length; i++) {
        let opponent   = app.options.games[i].opponents[0];
        let gameid     = app.options.games[i].id;
        let player     = app.options.games[i].player;
        let gamename   = app.options.games[i].module;
        let status     = app.options.games[i].status;
        let joingame   = '<div class="link gamelink join" id="'+gameid+'_'+gamename+'">join game</div>';
        let deletegame = '<div class="link delete_game" id="'+gameid+'">delete game</div>';

	if (app.options.games[i].over == 1) {
	  status = "Game Over";
	}

	if (opponent.length > 14) { opponent = opponent.substring(0, 13) + "..."; }
	if (status.length > 50) { status = status.substring(0, 50) + "..."; }

        this.updateBalance(this.app);

        //
        // add to table
        //
        let html  = '<tr>';
	    html += '<td id="'+gameid+'_game">'+gamename+'</td>';
	    html += '<td id="'+gameid+'_opponent">'+opponent+'</td>';
	    html += '<td id="'+gameid+'_status">'+status+'</td>';
	    html += '<td id="">'+joingame+'</td>';
	    html += '<td id="">'+deletegame+'</td>';
	    html += '</tr>';

        $('#gametable tbody').append(html);

      }


      $('#gametable').show();

    }
  }

  //
  // update balance
  //
  $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));


  //
  // attach events
  //
  this.attachEvents(app);

}








////////////////////
// onConfirmation //
////////////////////
Arcade.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  let arcade_self = app.modules.returnModule("Arcade");

  try {
    if (tx.isTo(app.wallet.returnPublicKey()) == 1) {
      arcade_self.handleOnConfirmation(blk, tx, conf, app);
    }
  } catch (err) { 
    console.log("Error in Arcade: " + JSON.stringify(err));
    return; 
  }

}
Arcade.prototype.handleOnConfirmation = function handleOnConfirmation(blk, tx, conf, app) {

  //
  // only browsers deal with this mess of code
  //
  if (this.app.BROWSER == 0) { return; }

  let txmsg = tx.returnMessage();
  let remote_address = tx.transaction.from[0].add;

  if (conf == 0) {

    //
    // GAME OVER
    //
    if (txmsg.request == "gameover") {

      try {
	let html = 'Your opponent has resigned. You win!<p></p><div class="link delete_game" id="delete_game">Return to Arcade</div>.';
        if (this.browser_active == 1) {
	  $('.lightbox_message_from_address').html(tx.transaction.from[0].add);
	  $('.manage_invitations').html(html);
	  $('.manage_invitations').show();
          this.attachEvents(this.app);
	}
      } catch (err) {
      }
    }



    //
    // INVITE
    //
    if (txmsg.request == "invite") {
      if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {

	try {

          let game_id = tx.transaction.from[0].add + tx.transaction.ts + tx.transaction.to[0].add;
          if (app.options.games != undefined) {
            for (let i = 0; i < app.options.games.length; i++) {
	      if (app.options.games[i].id == game_id) {
	        return;
	      }
            }
          }

          let tmpmod = txmsg.module;
          this.active_game = tmpmod.charAt(0).toUpperCase();
          this.active_game += tmpmod.slice(1);
          let mhtml = this.returnGameMonitor(this.app);
	  $('.status').show();
          $('.game_options').slideUp();
          $('.game_monitor').html(mhtml);
          this.updateBalance(this.app);
          $('.game_monitor').show();
          if (this.browser_active == 1) {
            this.attachEvents(this.app);
	  }

          game_id = tx.transaction.from[0].add + tx.transaction.ts + tx.transaction.to[0].add;

	  let html = 'You have been invited to a game of ' + this.active_game + ' by ' + tx.transaction.from[0].add + ' <p></p><div class="accept_game link" id="' + game_id + '_' + txmsg.module + '">Click here to accept this game!</div>';

          if (this.browser_active == 1) {
	    $('.lightbox_message_from_address').html(tx.transaction.from[0].add);
	    $('.manage_invitations').html(html);
	    $('.manage_invitations').show();
            this.attachEvents(this.app);
	  }
	} catch (err) {
	  alert("Not in Arcade: " + JSON.stringify(err));
	}
      }
    }




    //
    // ACCEPT
    //
    if (txmsg.request == "accept") {

      try {

        //
        // NOTIFY ARCADE
        //
        let game_self = app.modules.returnModule(txmsg.module);
        game_self.game = game_self.loadGame(txmsg.game_id);

        if (game_self.game.initializing == 1) {
          let mhtml = this.returnGameMonitor(app);
          $('.status').show();
          $('.game_options').slideUp();
          $('.game_monitor').html(mhtml);
          $('.manage_invitations').html("Initializing your game...");
          this.updateBalance(app);
          $('.game_monitor').show();

          //
          // game exists now
          //
          this.startInitializationTimer(txmsg.game_id);

          let html = 'Your game is initializing. This can take up to about five minutes depending on the complexity of the game. Please keep your browser open. We will notify you when the game is ready to start.';
          $('.manage_invitations').html(html);
          $('.manage_invitations').show();
          this.attachEvents(this.app);
        }

      } catch (err) {
      }
    }
  }
}




/////////////////////////
// Handle Web Requests //
/////////////////////////
Arcade.prototype.webServer = function webServer(app, expressapp) {

  expressapp.get('/arcade/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/arcade/email', function (req, res) {
    res.sendFile(__dirname + '/web/email.html');
    return;
  });
  expressapp.get('/arcade/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/arcade/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;
  });
  expressapp.get('/arcade/img/:imagefile', function (req, res) {
    var imgf = '/web/img/'+req.params.imagefile;
    if (imgf.indexOf("\/") != false) { return; }
    res.sendFile(__dirname + imgf);
    return;
  });



}


////////////////////////
// Load from Archives //
////////////////////////
Arcade.prototype.loadFromArchives = function loadFromArchives(app, tx) { this.addMessageToInbox(tx, app); }
Arcade.prototype.loadAllFromArchives = function loadAllFromArchives(app) {

  var arcade_self = this;
  app.archives.processTransactions(100, function (err, txarray) {
    for (var bv = 0; bv < txarray.length; bv++) {
      try {
        if (txarray[bv].transaction.msg.module == "Arcade" || txarray[bv].transaction.msg.module == "Encrypt") {
          if (txarray[bv].transaction.to[0].add == app.wallet.returnPublicKey()) {
            arcade_self.addMessageToInbox(txarray[bv], app);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  });
}





Arcade.prototype.returnGameMonitor = function returnGameMonitor(app) {

  return `

    <div class="address_box">

      Your address for this game:

      <p></p>

      <span style="font-family: Courier">ADDRESS: </span><span class="saito_address" id="saito_address">${app.wallet.returnPublicKey()}</span>
      <br />
      <span style="font-family: Courier">BALANCE: </span><span class="saito_balance" id="saito_balance">0.0</span> SAITO

    </div>

    <div class="funding_alert">
      Transfer tokens to this address or <a href="https://games.saito.network/faucet?saito_address=${app.wallet.returnPublicKey()}&source_app=arcade" target="_new">fund this address from the main faucet</a>.
    </div>

    <div class="manage_invitations" style="display:none">

      Provide the address of the player you are inviting. Otherwise wait to confirm an inbound invitation:

      <p></p>

      <div class="invitation_player1" id="invitation_player1">
        <input type="text" style="float:left;width:700px;padding:4px;font-size:1.15em" id="opponent_address" class="opponent_address" />
<br />
        <input type="submit" style="font-size:1.1em;display:inline;cursor:pointer;float:left;" id="invite_button" class="invite_button" >
      </div>

      <p></p>

      <div id="publisher_message" class="publisher_message"></div>

      <p></p>

      <div class="invitation_player2" id="invitation_player2" style="display:none">
        Invitation received from <span class="player2_address"></span> [ <span class="player2_accept" id="player2_accept">ACCEPT INVITATION</span> ]
      </div>

    </div>

  `;

}

Arcade.prototype.startInitializationTimer = function startInitializationTimer(game_id) {

  let arcade_self = this;
  let pos = -1;

  this.active_game_id = game_id;

  try {

    if (this.app.options.games != undefined) {
      for (let i = 0; i < this.app.options.games.length; i++) {
        if (this.app.options.games[i].id == game_id) {
	  pos = i;
        }
      }
    }

    if (pos == -1) { return; }

    arcade_self.initialization_check_timer = setInterval(() => {

      if (arcade_self.app.options.games[pos].initializing == 0) {
        let html = `Your game is ready: <a href="/${arcade_self.active_game.toLowerCase()}">click here to open</a>.`;
        $('.manage_invitations').html(html);
        $('.manage_invitations').show();
        if (this.browser_active == 1) { $('#status').hide(); }
	clearInterval(arcade_self.initialization_check_timer);
        arcade_self.attachEvents(this.app);
      }

    }, arcade_self.initialization_check_speed);

  } catch (err) {
    alert("ERROR checking if game is initialized!");
  }

}


Arcade.prototype.updateBalance = function updateBalance(app) {

  if (app.BROWSER == 0) { return; }
  $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

  if (app.wallet.returnBalance() >= 2) {
    $('.funding_alert').hide();
    $('.manage_invitations').show();    
  }

}



///////////////////
// Attach Events //
///////////////////
Arcade.prototype.attachEvents = function attachEvents(app) {

  if (app.BROWSER == 0) { return; }

  var arcade_self = this;

  //
  //
  //
  $('.gameimage').off();
  $('.gameimage').on('click', function() {

    arcade_self.active_game = $(this).attr("id");
    let html = arcade_self.returnGameMonitor(arcade_self.app);
    $('.status').show();
    $('.game_options').slideUp();
    $('.game_monitor').html(html);

    if (arcade_self.active_game == "Twilight") {
      $('.publisher_message').html("Twilight Struggle is licensed for use in open source gaming engines provided that at least one player has purchased the game. Please support GMT Games and encourage further development of Twilight Struggle by <a href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>.");
    }

    $('.game_monitor').show();
    arcade_self.updateBalance(arcade_self.app);
    arcade_self.attachEvents(arcade_self.app);

  });



  //
  // open game
  //
  $('.gamelink').off();
  $('.gamelink').on('click', function () {

    let tmpid = $(this).attr('id');
    let tmpar = tmpid.split("_");
    let game_id = tmpar[0];
    let game_module = tmpar[1];
    let game_self = app.modules.returnModule(game_module);
    this.game = game_self.loadGame(game_id);
    this.game.ts = new Date().getTime();
    this.game.module = game_module;
    game_self.saveGame(game_id);
    window.location = '/' + game_module.toLowerCase();
  });



  //
  // delete game
  //
  $('.delete_game').off();
  $('.delete_game').on('click', function () {

    let gameid = $(this).attr('id');

    for (let i = 0; arcade_self.app.options.games.length; i++) {
      if (arcade_self.app.options.games[i].id == gameid) {
	arcade_self.app.options.games.splice(i, 1);
      }
    }
    arcade_self.app.storage.saveOptions();
    window.location = '/arcade';
  });




  $('.invite_button').off();
  $('.invite_button').on('click', function() {

    let address = $('.opponent_address').val();

    if (address == app.wallet.returnPublicKey()) {
      alert("You cannot invite yourself to play a game -- if you really want to try, use two browsers!");
      return;
    }

    if (arcade_self.app.crypto.isPublicKey(address) == 0) {

      arcade_self.app.dns.fetchPublicKey(address, function(answer) {
        if (arcade_self.app.dns.isRecordValid(answer) == 0) {
	  alert("Cannot find publickey of specified user. Are you connected to a DNS server?");
          return;
        }

        dns_response = JSON.parse(answer);

        arcade_self.app.keys.addKey(dns_response.publickey, dns_response.identifier, 0, "Arcade");
        arcade_self.app.keys.saveKeys();

	address = dns_response.publickey;

        var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(address, 0.0);
        if (newtx == null) {
          alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
          return;
        }
        newtx.transaction.msg.module  = arcade_self.active_game;
        newtx.transaction.msg.request = "invite";
        newtx.transaction.msg.secret  = arcade_self.app.wallet.returnPublicKey();
        newtx = arcade_self.app.wallet.signTransaction(newtx);
        arcade_self.app.network.propagateTransaction(newtx);
        $('.manage_invitations').html('Game invitation has been sent. Please keep your browser open. This will update when the game is accepted.');
	return;

      });
    } else {

      var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(address, 0.0);
      if (newtx == null) {
        alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
        return;
      }
      newtx.transaction.msg.module  = arcade_self.active_game;
      newtx.transaction.msg.request = "invite";
      newtx.transaction.msg.secret  = arcade_self.app.wallet.returnPublicKey();
      newtx = arcade_self.app.wallet.signTransaction(newtx);
      arcade_self.app.network.propagateTransaction(newtx);
      $('.manage_invitations').html('Game invitation has been sent. Please keep your browser open. This will update when the game is accepted.');

    }

  });



  $('.accept_game').off();
  $('.accept_game').on('click', function() {
   
    //
    // clone of code in game.js
    //
    let tmpid = $(this).attr('id');
    let tmpar = tmpid.split("_");

    let game_id = tmpar[0];
    let game_module = tmpar[1];

    arcade_self.startInitializationTimer(game_id);

    let remote_address  = $('.lightbox_message_from_address').text();

    game_self = arcade_self.app.modules.returnModule(game_module);

    game_self.saveGame(game_id);
    game_self.addOpponent(remote_address);
    game_self.game.player = 2;
    game_self.game.module = game_module;
    game_self.saveGame(game_id);

    //
    // send official message accepting
    //
    var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(game_self.game.opponents[0], 0.0);
    for (let i = 1; i < game_self.game.opponents.length; i++) {
       newtx.transaction.to.push(new saito.slip(game_self.game.opponents[0], 0.0));
    }
    if (newtx == null) {
      alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
      return;
    }

    newtx.transaction.msg.module   = game_self.game.module;
    newtx.transaction.msg.game_id  = game_self.game.id;
    newtx.transaction.msg.secret   = game_self.game.secret;
    newtx.transaction.msg.request  = "accept";
    newtx = arcade_self.app.wallet.signTransaction(newtx);
    arcade_self.app.network.propagateTransaction(newtx);

    let html = 'You have accepted the invitation. Please keep your browser open while both players exchange the cryptographic information necessary to have a provably fair game. This may take up to five minutes, but only needs to happen once before the game. When your game is ready we will notify you here.';
    $('.manage_invitations').html(html);

  });


}







Arcade.prototype.addGameToInbox = function addGameToInbox(tx, app) {

  let txmsg = tx.returnMessage();

  if (app.BROWSER == 0) { return; }

  // fetch data from app
  msg = {};
  msg.id       = tx.transaction.sig;
  msg.time     = tx.transaction.ts;
  msg.from     = tx.transaction.from[0].add;
  msg.to       = tx.transaction.to[0].add;
  msg.module   = txmsg.module;
  msg.title    = txmsg.title;
  msg.data     = txmsg.data;
  msg.markdown = txmsg.markdown;
  msg.attachments = txmsg.attachments;
  tocheck = "#message_"+msg.id;
  if ($(tocheck).length > 0) { return; }

  this.attachMessage(msg, app);

}



Arcade.prototype.updateBlockchainSync = function updateBlockchainSync(app, percent_downloaded) {
  if (app.BROWSER == 0) { return; }
  let widthvar = percent_downloaded + "%";
  $('#blockchain_syncbar').css('width',widthvar);
  if (percent_downloaded == 100) {
    $('#blockchain_syncbox').fadeOut(2000);
    $('#blockchain_synclabel').fadeOut(2000);
  }
}









Arcade.prototype.formatDate = function formateDate(unixtime) {

  // not unixtime? return as may be human-readable date
  if (unixtime.toString().length < 13) { return unixtime; }

  let x = new Date(unixtime);
  nowx  = new Date();

  y = "";

  if (x.getMonth()+1 == 1) { y += "Jan "; }
  if (x.getMonth()+1 == 2) { y += "Feb "; }
  if (x.getMonth()+1 == 3) { y += "Mar "; }
  if (x.getMonth()+1 == 4) { y += "Apr "; }
  if (x.getMonth()+1 == 5) { y += "May "; }
  if (x.getMonth()+1 == 6) { y += "Jun "; }
  if (x.getMonth()+1 == 7) { y += "Jul "; }
  if (x.getMonth()+1 == 8) { y += "Aug "; }
  if (x.getMonth()+1 == 9) { y += "Sep "; }
  if (x.getMonth()+1 == 10) { y += "Oct "; }
  if (x.getMonth()+1 == 11) { y += "Nov "; }
  if (x.getMonth()+1 == 12) { y += "Dec "; }

  y += x.getDate();

  if (x.getFullYear() != nowx.getFullYear()) {
    y += " ";
    y += x.getFullYear();
  } else {
    if (x.getMonth() == nowx.getMonth() && x.getDate() == nowx.getDate()) {

      am_or_pm = "am";

      tmphour = x.getHours();
      tmpmins = x.getMinutes();

      if (tmphour >= 12) {
        if (tmphour > 12) {
          tmphour -= 12;
        };
        am_or_pm = "pm";
      }
      if (tmphour == 0) {
        tmphour = 12;
      };
      if (tmpmins < 10) {
        y = tmphour + ":0" + tmpmins + " " + am_or_pm;
      } else {
        y = tmphour + ":" + tmpmins + " " + am_or_pm;
      }

    }
  }

  return y;

}

Arcade.prototype.formatAuthor = function formatAuthor(author, app) {

  x = app.keys.findByPublicKey(author);
  if (x != null) { if (x.identifiers.length > 0) { return x.identifiers[0]; } }

  if (x == app.wallet.returnPublicKey()) {
    if (app.wallet.returnIdentifier() == "") { return "me"; }
  }

  var arcade_self = this;

  if (this.isPublicKey(author) == 1) {

    if (app.dns.isActive() == false) { return author; }

    app.dns.fetchIdentifier(author, function(answer) {

      if (app.dns.isRecordValid(answer) == 0) {
	      return author;
      }

      dns_response = JSON.parse(answer);

      // add to keylist
      arcade_self.app.keys.addKey(dns_response.publickey, dns_response.identifier, 0, "Arcade");
      arcade_self.app.keys.saveKeys();

      $('.from').each(function() {
        pkey = $(this).text();
        if (pkey == dns_response.publickey) { $(this).text(dns_response.identifier); }
      });

    });
  }

  return author;

}






Arcade.prototype.shouldAffixCallbackToModule = function shouldAffixCallbackToModule(modname) {
  if (modname === "Twilight") { return 1; }
  if (modname === "Chess") { return 1; }
  if (modname === "Wordblocks") { return 1; }
  return 0;
}





