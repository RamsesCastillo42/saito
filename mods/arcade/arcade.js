var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/template');
var util = require('util');
var markdown = require("markdown").markdown;
var fs = require('fs');



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
  this.initialization_check_timer  = null;

  this.active_game     = "";
  this.active_game_id  = "";

  this.currently_playing = 0;
  this.currently_viewing_monitor = 0;
  this.monitor_shown_already = 0;

  return this;

}
module.exports = Arcade;
util.inherits(Arcade, ModTemplate);



Arcade.prototype.returnGameMonitor = function returnGameMonitor(app) {

  let game_options = "";
  let game_self = app.modules.returnModule(this.active_game);

  if (this.active_game != "") {
    if (game_self != null) {
      game_options = game_self.returnGameOptionsHTML();
    }
  }

  let quick_invite =
  `<div class="quick_invite" id="quick_invite" style="width:94%">
    <i class="fa fa-magic"></i>Generate Invite Link
  </div>`

  let multi_invite = `
    <div class="invitation_player1" id="invitation_player1">
    <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address" class="opponent_address" />
    <div class="opponent_address2">
      <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address2" />
      <p></p>
    </div>
    <div class="opponent_address3">
      <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address3" />
      <p></p>
    </div>

    <div class="invite_button" id="invite_button">
      <i class="fa fa-envelope"></i> Send Invite
    </div>
  </div>
  `

  let invite_html = game_self.maxPlayers > 2 ? multi_invite : quick_invite;

  return `

    <!-- <div class="address_box">

      Send this address to your opponent for invitation:

      <p></p>

      <span style="font-family: Courier">ADDRESS: </span><span class="saito_address" id="saito_address">${app.wallet.returnPublicKey()}</span>
      <br />
      <span style="font-family: Courier">BALANCE: </span><span class="saito_balance" id="saito_balance">0.0</span> SAITO

    </div> -->

    <div class="funding_alert">
      Transfer tokens to this address or <a href="https://apps.saito.network/faucet?saito_address=${app.wallet.returnPublicKey()}&source_app=arcade" target="_new">fund this address from the main faucet</a>.
    </div>

    <div class="manage_invitations" style="display:none">

      <div class="game_details">${game_options}</div>

      Provide address(es) of player(s) to invite:

      <p></p>

      ${invite_html}

      <p></p>

      <div class="return_to_arcade" id="return_to_arcade">
      <i class="fa fa-arrow-circle-left"></i> Return to Arcade
      </div>

      <p></p>

      <div id="publisher_message" class="publisher_message"></div>

      <p></p>

      <div class="invitation_player2" id="invitation_player2" style="display:none">
        Invitation received from <span class="player2_address"></span> [ <span class="player2_accept link gamelink" id="player2_accept"><i class="fa fa-check-circle"></i> ACCEPT INVITATION</span> ]
      </div>

    </div>

  `;

}
Arcade.prototype.showMonitor = function showMonitor(html) {

  this.monitor_shown_already = 1;
  this.currently_viewing_monitor = 1;

  $('.game_monitor').html(this.returnGameMonitor(this.app));
  this.updateBalance(this.app);
  $('.game_monitor').slideDown(500, function() {});
  $('.gamelist').hide();
  $('.game_options').hide();

  //
  // game module specific, like max players
  //
  let game_mod = this.app.modules.returnModule(this.active_game);
  if (game_mod != null) {
    if (game_mod.maxPlayers > 2) { $('.opponent_address2').show(); }
    if (game_mod.maxPlayers > 3) { $('.opponent_address3').show(); }
  }

  if (this.browser_active == 1) { this.attachEvents(this.app); }


}
Arcade.prototype.hideMonitor = function hideMonitor() {

  $('.gamelist').show();
  $('.game_options').show();
  $('.game_monitor').hide();

}



Arcade.prototype.updateBalance = function updateBalance(app) {

  if (app.BROWSER == 0) { return; }

  let arcade_self = this;

  try {
  if (invite_page == 1) {
    $('.invite_play_button').css('background-color','darkorange');
    $('.invite_play_button').css('border', '1px solid darkorange');
    $('.invite_play_button').off();
    $('.invite_play_button').on('click', function() {
      arcade_self.acceptGameInvitation();
    });
  }
  } catch (err) {}

}
Arcade.prototype.acceptGameInvitation = function acceptGameInvitation() {

  let arcade_self = this;

  var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(arcade_self.app.wallet.returnPublicKey(), 0.0);
  if (newtx == null) {
    alert("ERROR: bug? unable to accept invitation. Do you have enough SAITO tokens?");
    return;
  }

  newtx.transaction.to.push(new saito.slip(invite_data.pubkey, 0.0));
  newtx.transaction.msg.module  = invite_data.module;
  newtx.transaction.msg.request = "invite";
  newtx.transaction.msg.options = invite_data.options;
  newtx.transaction.msg.ts      = invite_data.ts;
  newtx.transaction.msg.sig     = invite_data.sig;

  newtx = arcade_self.app.wallet.signTransaction(newtx);

console.log("PROPAGATING TX: " + JSON.stringify(newtx.transaction));

  arcade_self.app.network.propagateTransaction(newtx);
  alert("You have accepted this game. Your browser will be redirected to the Arcade in a few seconds. Once there you can click on this game to open it.");

  //window.location = '/' + invite_data.module;
  window.location = '/arcade' + invite_data.module;


/**
  let game_id = newtx.transaction.from[0].add + "&" + newtx.transaction.ts;
  arcade_self.startInitializationTimer(game_id);
**/

}
Arcade.prototype.initializeHTML = function initializeHTML(app) {

  let arcade_self = this;

  //
  // invite_page is set inside the javascript as a global variable
  // on invite.html.
  //
  try {
    if (invite_page == 1) {

      $('.inviting_address').html(invite_data.pubkey);

      if (parseFloat(this.app.wallet.returnBalance()) <= 0) {
        $('.invite_play_button').css('border', '1px solid grey');
        $('.invite_play_button').css('background-color','grey');
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', function() {
  	  alert("Your browser requires Saito tokens to accept this invitation. Please wait while our server sends you some!");
        });
      } else {
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', function() {
          arcade_self.acceptGameInvitation();
        });
      }
    }

    return;
  } catch (err) {}


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

        let opponent   = "unknown";
        let gameid     = app.options.games[i].id;
        let player     = app.options.games[i].player;
        let winner     = app.options.games[i].winner;
        let gamename   = app.options.games[i].module;
        let status     = app.options.games[i].status;
        let acceptgame = '<div class="link accept_game" id="'+gameid+'_'+gamename+'"><i class="fa fa-check-circle"></i> ACCEPT</div>';
        let joingame   = '<div class="link gamelink join" id="'+gameid+'_'+gamename+'"><i class="fa fa-play-circle"></i> JOIN</div>';
        let deletegame = '<div class="link delete_game" id="'+gameid+'_'+gamename+'"><i class="fa fa-minus-circle"></i> DELETE</div>';

        let tmpid = app.keys.returnIdentifierByPublicKey(opponent);
        if (tmpid != "") { opponent = tmpid; }

        if (app.options.games[i].opponents != undefined) {
          if (app.options.games[i].opponents.length > 0) {
            opponent = app.options.games[i].opponents[0];
          }
        }
        if (gamename === "") {
          gamename = "Unknown";
        }

        if (app.options.games[i].over == 1) {
          status = "Game Over";
        }
        if (status == "" || status == undefined) {
          status = "Game Underway";
        }

        if (opponent.length > 14) { opponent = opponent.substring(0, 13) + "..."; }
        if (status.length > 50) { status = status.substring(0, 50) + "..."; }

        this.updateBalance(this.app);

        let html = "";

        if (app.options.games[i].over == 0) {

          if (app.options.games[i].invitation == 1) {

            let remote_address = "";
            for (let z = 0; z < app.options.games[i].opponents.length; z++) {;
              if (z > 0) { remote_address += "_"; }
              remote_address += app.options.games[i].opponents[z];
            }

            html  = '<div class="single_activegame">';
            html += '<div id="'+gameid+'_game">';
            html += '<b>' + gamename + '</b></br>';
            html += opponent + '</div>';
            html += '<p></p>Game Invitation!<p></p>';
            html += '<div class="acceptgamelink">'+acceptgame+'</div>';
            html += '<div class="acceptgameopponents" id="'+remote_address+'" style="display:none"></div>';
            html += '</div>';

          } else {

            html  = '<div class="single_activegame">';
            html += '<div id="'+gameid+'_game">';
            html += '<b>' + gamename + '</b></br>';
            html += opponent + '</div>';
            html += '<div class="joingamelink">'+joingame+'</div>';
            html += '<div class="deletegamelink">'+deletegame+'</div>';
            html += '</div>';
          }

        } else {

          html  = '<div class="single_activegame">';
          html += '<div id="'+gameid+'_game">';
          html += '<b>' + gamename + '</b></br>';
          html += opponent + '</div>';
          if (winner == player) {
            html += '<p></p>You Won!<p></p>';
          } else {
            if (winner == 0) {
              html += '<p></p>Opponent Resigned!<p></p>';
            } else {
              html += '<p></p>Lost Game!<p></p>';
            }
          }
          html += '<div class="deletegamelink">'+deletegame+'</div>';
          html += '</div>';

        }

        if (parseInt(app.options.games[i].last_block) == 0) {
          $('.active_games').show();
          $('#gametable').append(html);
        }

      }


    }
  }

  //
  // update balance
  //
  this.updateBalance(app);

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
    // INVITE
    //
    if (txmsg.request == "invite") {
      if (tx.isTo(app.wallet.returnPublicKey()) == 1 && tx.isFrom(app.wallet.returnPublicKey()) == 0) {

        try {

          let game_id = tx.transaction.from[0].add + "&" + tx.transaction.ts;

          if (app.options.games != undefined) {
            for (let i = 0; i < app.options.games.length; i++) {
              if (app.options.games[i].id == game_id) {
                if (app.options.games[i].invitation == 0) {
                  if (this.monitor_shown_already == 1) {
                    return;
                  }
                }
              }
            }
          }

          let tmpmod = txmsg.module;
          this.active_game = tmpmod.charAt(0).toUpperCase();
          this.active_game += tmpmod.slice(1);


          //
          // add it to our table too
          //
          let acceptgame = '<div class="link accept_game" id="'+game_id+'_'+tmpmod+'"><i class="fa fa-check-circle"></i> ACCEPT</div>';

          let remote_address = "";
          for (let i = 0; i < tx.transaction.to.length; i++) {
            if (i > 0) { remote_address += "_"; }
            remote_address += tx.transaction.to[i].add;
          }


          let html = "";
          html  = '<div class="single_activegame">';
          html += '<div id="'+game_id+'_game">';
          html += '<b>' + this.active_game + '</b></br>';
          html += remote_address.substring(0,15) + '</div>';
          html += '<p></p>Game Invitation!<p></p>';
          html += '<div class="acceptgamelink">'+acceptgame+'</div>';
          html += '<div class="acceptgameopponents" id="'+remote_address+'" style="display:none"></div>';
          html += '</div>';
          $('.active_games').show();


          var thisdivname = game_id + "_game";
          try {
            if (document.getElementById(thisdivname) !== null) {
              //
              // old invitation
              // 
              return;
            } else {
              this.showMonitor();
              $('#gametable').prepend(html);
            }
          } catch (err) {
            this.showMonitor();
            $('#gametable').prepend(html);
          }

          if (this.browser_active == 1) {

	    let html = 'You have been invited to a game of ' + this.active_game + ' by ' + tx.transaction.from[0].add + ' <p></p>';

            if (txmsg.options != undefined) { html += `<div id="game_details" class="game_details">OPTIONS: ${JSON.stringify(txmsg.options)}</div><p></p>`; }
	    html += '<div class="accept_game link" id="' + game_id + '_' + txmsg.module + '"><i class="fa fa-check-circle"></i> ACCEPT</div><p></p><div class="return_to_arcade" id="return_to_arcade"><i class="fa fa-arrow-circle-left"></i> Return to Arcade</div>';
	    let tmpadd = "";
            for (let b = 0; b < tx.transaction.to.length; b++) {
              if (b > 0) { tmpadd += "_"; }
              tmpadd += tx.transaction.to[b].add;
            }


            $('.lightbox_message_from_address').html(tmpadd);
            $('.manage_invitations').html(html);
            $('.manage_invitations').show();
            this.attachEvents(this.app);
          }
        } catch (err) {
        }
      }
    }


    //
    // ACCEPT
    //
    if (txmsg.request == "accept") {

      try {

        let game_self = app.modules.returnModule(txmsg.module);
        game_self.loadGame(txmsg.game_id);

        //
        // don't get triggered by closed games
        //
        if (game_self.game.over == 1) { return; }

        //
        // if I have accepted...
        //
        if (game_self.game.accept === 1) { 
          //$('.status').html("other players are accepting the game...");
          $('.status').show();
          return; 
        }

        if (game_self.game.initializing == 1) {

          //
          // if i have not accepted, do not show init screen
          //
          if (game_self.game.accept == 0) {

            return;

          //
          // otherwise move in
          //
          } else {

            this.startInitializationTimer(txmsg.game_id);
            this.showMonitor();
            $('.manage_invitations').html('Your game is initializing. This can take up to about five minutes depending on the complexity of the game. Please keep your browser open. We will notify you when the game is ready to start.<p></p><div id="status" class="status"></div>');
            $('.status').show();

          }

        } else {

          if (this.currently_viewing_monitor == 1) {

            let active_module = txmsg.module;
            let html = `Your game is ready: <p></p><a href="/${active_module.toLowerCase()}"><div class="link linkbutton joinlink"><i class="fa fa-play-circle"></i> Join the Game</div></a><p></p><div id="return_to_arcade" class="return_to_arcade"><i class="fa fa-arrow-circle-left"></i> Return to Arcade</div>.`;
            this.showMonitor();
            $('.manage_invitations').html(html);
            if (this.browser_active == 1) { $('#status').hide(); }
            this.attachEvents(this.app);

          }

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
  expressapp.get('/arcade/invite/:gameinvite', function (req, res) {

    let gameinvite = req.params.gameinvite;
    let txmsgstr = "";

    if (gameinvite != null) {
      txmsgstr = app.crypto.base64ToString(gameinvite);
    }

console.log("\n\n\n\n"+txmsgstr);

    let data = fs.readFileSync(__dirname + '/web/invite.html', 'utf8', (err, data) => {});
    data = data.replace('GAME_INVITATION', txmsgstr);
    res.setHeader('Content-type', 'text/html');
    res.charset = 'UTF-8';
    res.write(data);
    res.end();
    return;
  });
  expressapp.get('/arcade/invite.css', function (req, res) {
    res.sendFile(__dirname + '/web/invite.css');
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






Arcade.prototype.startInitializationTimer = function startInitializationTimer(game_id) {

  let arcade_self = this;

  try {

    arcade_self.initialization_check_timer = setInterval(() => {

      let pos = -1;
      if (arcade_self.app.options.games != undefined) {
        for (let i = 0; i < arcade_self.app.options.games.length; i++) {
          if (arcade_self.app.options.games[i].id == game_id) {
              pos = i;
          }
        }
      }

      if (pos == -1) { 
        return; 
      }

      if (arcade_self.app.options.games[pos].initializing == 0) {
        let html = `Your game is ready: <p></p><a href="/${arcade_self.active_game.toLowerCase()}"><div class="link linkbutton joinlink"><i class="fa fa-play-circle"></i> Join the Game</div></a><p></p><div id="return_to_arcade" class="return_to_arcade"><i class="fa fa-arrow-circle-left"></i> Return to Arcade</div>.`;
        $('.manage_invitations').html(html);
        $('.manage_invitations').show();
        if (this.browser_active == 1) { $('#status').hide(); }
        clearInterval(arcade_self.initialization_check_timer);
        arcade_self.attachEvents(this.app);
      }

    }, 2000);

  } catch (err) {
    alert("ERROR checking if game is initialized!");
  }

}


Arcade.prototype.updateBalance = function updateBalance(app) {

  if (app.BROWSER == 0) { return; }


  //
  // invite page stuff here
  //
  try {
    if (invite_page == 1) {
      return;
    }
  } catch (err) {}


  $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

  if (app.wallet.returnBalance() >= 2) {
    $('.funding_alert').hide();
    $('.manage_invitations').show();
  }

}



///////////////////
// Attach Events //
///////////////////
Arcade.prototype.attachEvents = async function attachEvents(app) {

  if (app.BROWSER == 0) { return; }


  //
  // invite page
  //
  try {
  if (invite_page == 1) {

    setTimeout(function() {
      $('#saito_advert').off();
      $('#saito_advert').on('click',function() {
	alert("Your account will receive tokens shortly. Once you receive these tokens, you will be able to accept this game invite!");
        return false;
      });
    }, 1500);
    setTimeout(function() {
      $('#saito_advert').off();
      $('#saito_advert').on('click',function() {
	alert("Your account will receive tokens shortly. Once you receive these tokens, you will be able to accept this game invite!");
        return false;
      });
    }, 3000);

    return;
  }
  } catch (err) {}




  $('#wechat>span').on('click', function () {
    $('#wechat-qr').css("height", $('#wechat').outerWidth() + 25);
    $('#wechat-qr-img').css("width", $('#wechat').outerWidth() - 25);
  })

  $('#wechat-qr').on('click', function () {
    $('#wechat-qr').css("height", "0");
    $('#wechat-qr-img').css("width", "0");
  })

  var arcade_self = this;

  $('.quick_invite').off();
  $('.quick_invite').on('click',  function() {

    let options    = {};

    $('form input, form select').each(
      function(index) {
        var input = $(this);
        options[input.attr('name')] = input.val();
      }
    );

    let txmsg = {};
    txmsg.module = arcade_self.active_game;
    txmsg.pubkey = arcade_self.app.wallet.returnPublicKey();
    txmsg.options = options;
    txmsg.ts = new Date().getTime();
    txmsg.sig = arcade_self.app.wallet.signMessage(txmsg.ts.toString(), arcade_self.app.wallet.returnPrivateKey());

    let base64str = arcade_self.app.crypto.stringToBase64(JSON.stringify(txmsg));

console.log("HERE: " + base64str);

    $('div').remove('.invite_link_container');

    $(this).after(
      `<div class="invite_link_container">
        <input class="invite_link_input" id="invite_link_input" value="${window.location.href}/invite/${base64str}" />
        <i class="fa fa-clipboard" id="invite_link_clipboard" aria-hidden="true"></i>
      </div>`
    )

    arcade_self.attachEvents(arcade_self.app);
  });

  $('#invite_link_clipboard').off();
  $('#invite_link_clipboard').on('click', () => {
    let url_input = document.getElementById("invite_link_input");
    url_input.select();
    document.execCommand("copy");
  });

  $('.game').off();
  $('.game').on('click', function() {

    arcade_self.active_game = $(this).attr("id");
    arcade_self.showMonitor();

    if (arcade_self.active_game == "Twilight") {
      $('.publisher_message').html("Twilight Struggle is licensed for use in open source gaming engines provided that at least one player has purchased the game. By clicking to start a game you confirm that either you or your opponent has purchased a copy. Please support <a href=\"https://gmtgames.com\" style=\"border-bottom: 1px dashed; cursor:pointer\">GMT Games</a> and encourage further development of Twilight Struggle by <a style=\"border-bottom: 1px dashed;cursor:pointer\" href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>.");
    }

  });


  //
  // return to arcade
  //
  $('#return_to_arcade').off();
  $('#return_to_arcade').on('click', function() {
    arcade_self.currently_viewing_monitor = 0;
    arcade_self.hideMonitor();
  });


  $('.find_player_button').off();
  $('.find_player_button').on('click', () => {
    $('.arcade-description').show();
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
    game_self.game = game_self.loadGame(game_id);
    game_self.game.ts = new Date().getTime();
    game_self.game.module = game_module;
    game_self.saveGame(game_id);
    window.location = '/' + game_module.toLowerCase();
  });



  //
  // delete game
  //
  $('.delete_game').off();
  $('.delete_game').on('click', function () {

    let tmpid = $(this).attr('id');
    let tmpar = tmpid.split("_");
    let gameid = tmpar[0];
    let game_module = tmpar[1];
    let game_self = null;

    //
    // if game_moduleis undefined
    //
    if (game_module == undefined) {

      return;
    }

    try {
      game_self = app.modules.returnModule(game_module);
      game_self.loadGame(gameid);
      if (game_self.game.over == 0) {
        game_self.resignGame();
      } else {
        game_self.game.over = 1;
        game_self.game.last_block = arcade_self.app.blockchain.returnLatestBlockId();
      }
      game_self.saveGame(gameid);
    } catch (err) {
console.log("ERROR DELETING GAME!");
    }


    for (let i = 0; i < arcade_self.app.options.games.length; i++) {
      if (i < 0) { i = 0; }
        if (arcade_self.app.options.games.length == 0) {
        } else {
        if (arcade_self.app.options.games[i].id == undefined) {
          arcade_self.app.options.games.splice(i, 1);
          i--;
        } else {
          if (arcade_self.app.options.games[i].id == gameid) {
            //
            // delete it if it is too old (i.e. don't need to resync)
            //
            if ((arcade_self.app.options.games[i].last_block+10) < arcade_self.app.blockchain.returnLatestBlockId()) {
                  arcade_self.app.options.games.splice(i, 1);
              i--;
            }
          }
        }
        try {
          if (arcade_self.app.options.games[i].over == 1 && ((parseInt(arcade_self.app.options.games[i].last_block)+10) < arcade_self.app.blockchain.returnLatestBlockId())) {
            arcade_self.app.options.games.splice(i, 1);
            i--;
          }
          if (arcade_self.app.options.games[i].opponents.length == 0) {
                arcade_self.app.options.games.splice(i, 1);
            i--;
          }
        } catch(err) {
          console.log(err)
        }
      }
    }
    arcade_self.app.storage.saveOptions();


    //
    // acknowledge
    //
    window.location = "/arcade";


  });




  $('.invite_button').off();
  $('.invite_button').on('click', async function() {

    let address    = [];
        address[0] = $('#opponent_address').val();
        address[1] = $('#opponent_address2').val();
        address[2] = $('#opponent_address3').val();

    let options    = {};

    $('form input, form select').each(
      function(index) {  
        var input = $(this);
        options[input.attr('name')] = input.val();
      }
    );

    address[0] = address[0].trim();
    address[1] = address[1].trim();
    address[2] = address[2].trim();

    if (address[0] == app.wallet.returnPublicKey()) {
      alert("You cannot invite yourself to play a game -- if you really want to try, use two browsers!");
      return;
    }
    if (address[1] == app.wallet.returnPublicKey()) {
      alert("You cannot invite yourself to play a game -- if you really want to try, use two browsers!");
      return;
    }
    if (address[2] == app.wallet.returnPublicKey()) {
      alert("You cannot invite yourself to play a game -- if you really want to try, use two browsers!");
      return;
    }
    if (address[1] != "" && address[2] != "") {
      if (address[1] === address[2] || address[0] === address[1] || address[0] === address[2]) {
        alert("You cannot invite the same player twice");
        return;
      }
    }

    if (arcade_self.app.crypto.isPublicKey(address[0]) == 0) {
      if (address[0].indexOf("@saito") == -1 && address[0].length > 0) {
        alert("All invited players must be identified by publickey or Saito email address");
        return;
      }
      address[0] = await arcade_self.app.dns.fetchPublicKeyPromise(address[0]);
    }
    if (arcade_self.app.crypto.isPublicKey(address[1]) == 0) {
      if (address[1].indexOf("@saito") == -1 && address[1].length > 0) {
        alert("All invited players must be identified by publickey or Saito email address");
        return;
      }
      address[1] = await arcade_self.app.dns.fetchPublicKeyPromise(address[1]);
    }
    if (arcade_self.app.crypto.isPublicKey(address[2]) == 0) {
      if (address[2].indexOf("@saito") == -1 && address[2].length > 0) {
        alert("All invited players must be identified by publickey or Saito email address");
        return;
      }
      address[2] = await arcade_self.app.dns.fetchPublicKeyPromise(address[2]);
    }

    var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(address[0], 0.0);
    if (newtx == null) {
      alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
      return;
    }

    if (arcade_self.app.crypto.isPublicKey(address[1]) == 1) {
      newtx.transaction.to.push(new saito.slip(address[1], 0.0));
    }
    if (arcade_self.app.crypto.isPublicKey(address[2]) == 1) {
      newtx.transaction.to.push(new saito.slip(address[2], 0.0));
    }

    newtx.transaction.msg.module  = arcade_self.active_game;
    newtx.transaction.msg.request = "invite";
    newtx.transaction.msg.options = options;
    newtx.transaction.msg.secret  = arcade_self.app.wallet.returnPublicKey();
    newtx = arcade_self.app.wallet.signTransaction(newtx);
    arcade_self.app.network.propagateTransaction(newtx);
    $('.manage_invitations').html('Game invitation has been sent. Please keep your browser open. This will update when the game is accepted.<p></p><div class="status" id="status"></div>');

    let game_id = newtx.transaction.from[0].add + "&" + newtx.transaction.ts;
    arcade_self.startInitializationTimer(game_id);

  });




  $('.accept_game').off();
  $('.accept_game').on('click', function() {

    //
    // if this is the main screen
    //
    arcade_self.showMonitor();
   
    //
    // clone of code in game.js
    //
    let tmpid = $(this).attr('id');
    let tmpar = tmpid.split("_");

    let game_id = tmpar[0];
    let game_module = tmpar[1];

    arcade_self.startInitializationTimer(game_id);

console.log("TMPAR: " + JSON.stringify(tmpar));

    if ($('.lightbox_message_from_address').length > 0) {
      let remote_address = $('.lightbox_message_from_address').text();
console.log("RA: " + remote_address);
      if ($(this).parent().parent().find('.acceptgameopponents').length > 0) {
        remote_address = $(this).parent().parent().find('.acceptgameopponents').attr("id");
      }
      console.log("RA2: " + remote_address);
      tmpar = remote_address.split("_");
    }


    for (let z = 0; z < tmpar.length; z++) { tmpar[z] = tmpar[z].trim(); }
console.log("TMPAR2: " + JSON.stringify(tmpar));

    game_self = arcade_self.app.modules.returnModule(game_module);
    game_self.loadGame(game_id);

console.log("GAME SELF: " + JSON.stringify(game_self.game.options));

    game_self.saveGame(game_id);
    for (let i = 0; i < tmpar.length; i++) {
      game_self.addOpponent(tmpar[i]);
    }
    game_self.game.invitation = 0;
    game_self.game.accept = 1;
    game_self.game.player = 2;
    game_self.game.module = game_module;
    game_self.saveGame(game_id);

    //
    // send official message accepting
    //
    var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(tmpar[0], 0.0);
    for (let i = 1; i < tmpar.length; i++) {
      newtx.transaction.to.push(new saito.slip(tmpar[i], 0.0));
    }
    if (newtx == null) {
      alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
      return;
    }

    newtx.transaction.msg.options  = game_self.game.options;
    newtx.transaction.msg.module   = game_module;
    newtx.transaction.msg.game_id  = game_id;
    newtx.transaction.msg.request  = "accept";

    newtx = arcade_self.app.wallet.signTransaction(newtx);
    arcade_self.app.network.propagateTransaction(newtx);

    let html = 'You have accepted the invitation. Please keep your browser open while both players exchange the cryptographic information necessary to have a provably fair game. This may take up to five minutes, but only needs to happen once before the game. When your game is ready we will notify you here.<p></p><div id="status" class="status"></div>';
    $('.manage_invitations').html(html);
    $('.status').show();

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





