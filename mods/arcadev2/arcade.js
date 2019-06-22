const fs = require('fs');
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
const sqlite = require('sqlite');
var numeral = require('numeral');

class Arcade extends ModTemplate {

  constructor(app) {

    super();

    this.app             = app;

    this.name            = "Arcade";
    this.browser_active  = 0;
    this.emailAppName    = "Arcade";

    this.active_game     = "";

    this.viewing_game_creator = 0;
    this.viewing_game_initializer = 0;

    this.db              = null;
    this.games           = {}
    this.games.open      = [];
    this.games.completed = [];

    this.games.nav       = { selected: 'open' };

  }







  ////////////////////
  // Install Module //
  ////////////////////
  async installModule() {

    if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

    try {
      this.db = await sqlite.open('./data/arcade.sq3');
      var sql = "CREATE TABLE IF NOT EXISTS mod_arcade (id INTEGER, player TEXT, player2 TEXT, game_bid INTEGER, gameid TEXT, game TEXT, state TEXT, options TEXT, sig TEXT, created_at INTEGER, expires_at INTEGER, PRIMARY KEY (id ASC))";
      await this.db.run(sql, {});
    } catch (err) {
    }

  }





  ////////////////
  // Initialize //
  ////////////////
  async initialize() {

    if (this.app.BROWSER == 1 && this.browser_active == 1) {

/**** PROFILE ***
      let saito_email   = this.app.wallet.returnIdentifier();
      let saito_address = this.app.wallet.returnPublicKey();
      let saito_balance = this.app.wallet.returnBalance();

      if (saito_email == "") {
        saito_email = saito_address.substring(0,13) + "..."; 
        //saito_email = `<a href="/registry"><div class="register_address" id="register_address">[register address]</div></a>`;
      }

      $('.saito_email').html(saito_email);
      //$('#saito_address').html(saito_address);
      $('.saito_balance').html(numeral(saito_balance).format('0,0.[00000000]'));
***/

      for (let i = 0; i < open_games.length; i++) {
        this.games.open.push(open_games[i]);
      }

      this.populateGamesTable();
      renderGamesTable(this.games[this.games.nav.selected]);
      this.attachEvents();

    }

    if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

    if (this.db == null) {
      try {
        this.db = await sqlite.open('./data/arcade.sq3');
        this.refreshOpenGames();
      } catch (err) {
      }
    }



  }




  /////////////////////////////////
  // ShouldAffixCallbacktoModule //
  /////////////////////////////////
  shouldAffixCallbackToModule(modname) {
    if (modname === "Arcade") { return 1; }
    if (modname === "Twilight") { return 1; }
    if (modname === "Chess") { return 1; }
    if (modname === "Wordblocks") { return 1; }
    return 0;
  }




  ////////////////
  // onNewBlock //
  ////////////////
  async onNewBlock(blk, lc) {
    let arcade_self = blk.app.modules.returnModule("Arcade");
    arcade_self.refreshOpenGames();
  }





  ////////////////////
  // onConfirmation //
  ////////////////////
  async onConfirmation(blk, tx, conf, app) {

    let arcade_self = app.modules.returnModule("Arcade");

    if (app.BROWSER == 0) {
      if (conf == 0) {
	let txmsg = tx.returnMessage();


	//
	// update database to remove game from list
	//
	if (txmsg.request == "invite") {
	  let sql = "UPDATE mod_arcade SET state = 'active', player2 = $player2 WHERE sig = $sig";
	  let params = {
	    $player2 : tx.transaction.from[0].add ,
	    $sig : txmsg.sig
	  }
	  try {
            let res = await arcade_self.db.run(sql, params);
	  } catch (err) {
	    console.log("error updating database in arcade...");
	    return;
	  }
	}




	if (txmsg.module == "Arcade" && txmsg.request == "opengame") {

	  let game    = "";
	  let state   = "";
	  let pkey    = "";
	  let options = "";
	  let created_at = "";
	  let sig     = "";

	  if (txmsg.game != "") { game = txmsg.game; }
	  if (txmsg.state != "") { state = txmsg.state; }
	  pkey = tx.transaction.from[0].add;
	  if (txmsg.options != "") { options = txmsg.options; }
	  if (txmsg.ts != "") { created_at = txmsg.ts; }
	  if (txmsg.sig != "") { sig = txmsg.sig; }

          var sql = "INSERT INTO mod_arcade (player, state, game_bid, game, options, created_at, sig) VALUES ($player, $state, $bid, $game, $options, $created_at, $sig)";
          var params = {
            $player : pkey ,
            $state : state ,
	    $bid : blk.block.id ,
	    $game : game , 
	    $options : JSON.stringify(options) ,
	    $created_at : created_at , 
	    $sig : sig 
          }

	  try {
            let res = await arcade_self.db.run(sql, params);
	  } catch (err) {
	    console.log("There is an error here: " + err);
	  }
          return;
	}
      }
    } else {

      //
      // browsers remove listed games on accept (technically invited)
      //
      let txmsg = tx.returnMessage();

      if (txmsg.request == "invite" && arcade_self.browser_active == 1) {

	let removed_any_games = 0;
        for (let i = 0; i < arcade_self.games.open.length; i++) {
	  if (arcade_self.games.open[i].sig == txmsg.sig) {
	    arcade_self.games.open.splice(i, 1); 
	    i--;
	    removed_any_games = 1;
          }
        }
	if (removed_any_games == 1) {
          renderGamesTable(arcade_self.games[arcade_self.games.nav.selected]);
	}
      }

    }



    //
    // pass controls into games
    //
    try {
      if (tx.isTo(app.wallet.returnPublicKey()) == 1) {
        arcade_self.handleOnConfirmation(blk, tx, conf, app);
      }
    } catch (err) {
      console.log("Error in Arcade: " + JSON.stringify(err));
      return;
    }
  }





  handleOnConfirmation(blk, tx, conf, app) {

    //
    // only browsers deal with this mess of code
    //
    if (this.app.BROWSER == 0) { return; }

    let txmsg = tx.returnMessage();
    let remote_address = tx.transaction.from[0].add;


    if (conf == 0) {

console.log("TXMSG: " + JSON.stringify(txmsg));

/*****
      //
      // DECLINE
      //
      if (txmsg.request == "decline") {
        if (tx.isTo(app.wallet.returnPublicKey()) == 1 && tx.isFrom(app.wallet.returnPublicKey()) == 0) {
          if (this.monitor_shown_already == 1 || invite_page == 1) {
            $('.manage_invitations').html(`
              <center>Your opponent has declined the game as they have already started one!</center>
            `);
            $('.status').show();
            $('#game_spinner').hide();
            this.attachEvents(this.app);
          }
        }
        if (tx.isTo(app.wallet.returnPublicKey()) == 1 && tx.isFrom(app.wallet.returnPublicKey()) == 1) {
          if (this.monitor_shown_already == 1 || invite_page == 1) {
            $('.manage_invitations').html(`
              <center>You have received multiple acceptances to your game. Refusing all but the first acceptance.</center>
            `);
            $('.status').show();
            this.attachEvents(this.app);
          }
        }
       return;
      }
*****/

      //
      // INVITE
      //
      if (txmsg.request == "invite") {

console.log("TXMSG 2: " + JSON.stringify(txmsg));

        if (tx.isTo(app.wallet.returnPublicKey()) == 1 && tx.isFrom(app.wallet.returnPublicKey()) == 0) {

          try {

            let game_id = tx.transaction.from[0].add + "&" + tx.transaction.ts;
            let game_module = tx.transaction.msg.module;

	    //
	    // do nothing if already watching this game initialize
	    //
            if (app.options.games != undefined) {
              for (let i = 0; i < app.options.games.length; i++) {
                if (app.options.games[i].id == game_id) {
                  if (app.options.games[i].invitation == 0) {
		    if (this.viewing_game_initializer == 1) {
                      if (txmsg.ts != "" && txmsg.sig != "") {
                        if (this.app.crypto.verifyMessage(txmsg.ts.toString(), txmsg.sig.toString(), this.app.wallet.returnPublicKey())) {
                          try {
                            if (invite_page == 1) {
                              return;
                            }
                          } catch (err) {
                          }
                        } else {
                          return;
                        }
                      }
                    } else {
                    }
                  }
                }
              }
            }

            let tmpmod = txmsg.module;
            this.active_game = tmpmod.charAt(0).toUpperCase();
            this.active_game += tmpmod.slice(1);

            //
            // ADD GAME TO TABLE
            //
            //this.listActiveGames();


	    //
	    //
	    //
            if (this.browser_active == 1) {

              if (txmsg.ts != "" && txmsg.sig != "") {
                if (this.app.crypto.verifyMessage(txmsg.ts.toString(), txmsg.sig.toString(), this.app.wallet.returnPublicKey())) {
                  this.showGameInitializer();
                  this.startInitializationTimer(game_id, txmsg.module);
                }
              } else {

		//
		// MANUAL ACCEPT IN 
		//
                let html = 'You have been invited to a game of ' + this.active_game + ' by ' + tx.transaction.from[0].add + ' <p></p>';

		this.showGameInitializer();
		alert(html);
/***
                let tmpadd = "";
                for (let b = 0; b < tx.transaction.to.length; b++) {
                  if (b > 0) { tmpadd += "_"; }
                  tmpadd += tx.transaction.to[b].add;
                }
                $('.lightbox_message_from_address').html(tmpadd);
***/

              }
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
            return;
          }

          if (game_self.game.initializing == 1) {

            if (game_self.game.accept == 0) {
              return;
            } else {
alert("I have accepted, so show game init screen...");
	      this.showGameInitializer();
              this.startInitializationTimer(txmsg.game_id, txmsg.module);
            }
          } else {
alert("This game is ready to be played");
          }
        } catch (err) {
console.log("ERROR");
        }
      }
    }
  }










  ////////////////////
  // Attach Events //
  ///////////////////
  attachEvents() {

    let arcade_self = this;


    //
    // BUTTONS IN TABLE WITH AVAILABLE GAMES
    //


    //
    // join an existing game
    //
    $('.join_game').off();
    $('.join_game').on('click', function () {
      let tmpid = $(this).attr('id');
      let tmpar = tmpid.split("_");
      let game_id = tmpar[0];
      let game_module = tmpar[1];
      let game_self = arcade_self.app.modules.returnModule(game_module);
      game_self.game = game_self.loadGame(game_id);
      game_self.game.ts = new Date().getTime();
      //
      // ensure init happens appropriately
      //
      game_self.game.initialize_game_run = 0;
      game_self.game.module = game_module;
      game_self.saveGame(game_id);
      window.location = '/' + game_module.toLowerCase();
    });



    //
    // accept invites
    //
    $('.accept_game').off();
    $('.accept_game').on('click', function() {

      let id = $(this).attr("id");

      // if accepting a game, the id is our sig
      for (let i = 0; i < arcade_self.games.open.length; i++) {
	if (arcade_self.games.open[i].sig == id) {

          if (arcade_self.app.wallet.returnBalance() > arcade_self.app.wallet.returnDefaultFee()) {

            var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(arcade_self.app.wallet.returnPublicKey(), 0.0);
  	    if (newtx == null) {
  	      alert("ERROR: bug? unable to accept invitation. Do you have enough SAITO tokens?");
  	      return;
  	    }

     	    newtx.transaction.to.push(new saito.slip(arcade_self.games.open[i].player, 0.0));
  	    newtx.transaction.msg.module  = arcade_self.games.open[i].game;
  	    newtx.transaction.msg.request = "invite";
  	    newtx.transaction.msg.options = JSON.parse(arcade_self.games.open[i].options);
  	    newtx.transaction.msg.ts      = arcade_self.games.open[i].created_at;
  	    newtx.transaction.msg.sig     = arcade_self.games.open[i].sig;

  	    newtx = arcade_self.app.wallet.signTransaction(newtx);
  	    arcade_self.app.network.propagateTransaction(newtx);

	    alert("Please be patient while the network starts to initialize the game!");

          } else {
	    alert("Your account does not have SAITO tokens. Please get some for free from the Faucet...");
          }
	  return;
	}
      }
    });


    //
    // delete games
    //
    $('.delete_game').off();
    $('.delete_game').on('click', function() {

console.log("DELETE GAME 1");

      let tmpid = $(this).attr('id');
      let tmpar = tmpid.split("_");
      let gameid = tmpar[0];
      let game_module = tmpar[1];
      let game_self = null;

console.log("DELETE GAME 2");

      //
      // if game_moduleis undefined
      //
      if (game_module == undefined) {
        return;
      }

console.log("DELETE GAME 2");

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






    //
    // GAME CREATION PAGE
    //

    //
    // add game to list of open games
    //
    $('.quick_invite').off();
    $('.quick_invite').on('click', function() {

      let options    = {};

      $('form input, form select').each(
        function(index) {
          var input = $(this);
          if (input.is(":checkbox")) {
            if (input.prop("checked")) {
              options[input.attr('name')] = 1;
            }
          } else {
            options[input.attr('name')] = input.val();
          }
        }
      );

      if (arcade_self.app.wallet.returnBalance() > arcade_self.app.wallet.returnDefaultFee()) {

        var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(arcade_self.app.wallet.returnPublicKey(), 0.0);
  	if (newtx == null) {
  	  alert("ERROR: bug? unable to accept invitation. Do you have enough SAITO tokens?");
  	  return;
  	}

  	newtx.transaction.to.push(new saito.slip(arcade_self.app.wallet.returnPublicKey(), 0.0));
  	newtx.transaction.msg.module  = "Arcade";
  	newtx.transaction.msg.request = "opengame";
  	newtx.transaction.msg.game    = arcade_self.active_game;
  	newtx.transaction.msg.state   = "open";
  	newtx.transaction.msg.options = options;
  	newtx.transaction.msg.ts      = new Date().getTime();
  	newtx.transaction.msg.sig     = arcade_self.app.wallet.signMessage(newtx.transaction.msg.ts.toString(), arcade_self.app.wallet.returnPrivateKey());

  	newtx = arcade_self.app.wallet.signTransaction(newtx);
  	arcade_self.app.network.propagateTransaction(newtx);

	arcade_self.hideGameCreator();

      } else {
	alert("Your account does not have SAITO tokens. Please get some for free from the Faucet...");
      }
    });





    //
    // CREATE GAME - Step #1
    //
    $('.game').off();
    $('.game').on('click', function() {

      arcade_self.active_game = $(this).attr("id");
      arcade_self.showGameCreator();

      if (arcade_self.active_game == "Twilight") {
        $('.publisher_message').html("Twilight Struggle is <a href=\"https://github.com/trevelyan/ts-blockchain/blob/master/license/GMT_Vassal_Modules.pdf\" style=\"border-bottom: 1px dashed;cursor:pointer;\">released for use</a> in open source gaming engines provided that at least one player has purchased the game. By clicking to start a game you confirm that either you or your opponent has purchased a copy. Please support <a href=\"https://gmtgames.com\" style=\"border-bottom: 1px dashed; cursor:pointer\">GMT Games</a> and encourage further development of Twilight Struggle by <a style=\"border-bottom: 1px dashed;cursor:pointer\" href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>");
        $('.publisher_message').show();
      }
    });




    //
    // CREATE GAME -- STEP #2
    //
    $('#game_button').off();
    $('#game_button').on('click', () => {

      var modal = document.getElementById("game_modal");
      modal.style.display = "block";


      $('.close').off();
      $('.close').on('click', function() {
        modal.style.display = "none";
        window.removeEventListener('click');
      });

      window.addEventListener('click', () => {
        if (event.target == modal) {
	  $('.close').off();
          modal.style.display = "none";
          window.removeEventListener('click');
        }
      });

      $('#game_creation_form').off();
      $('#game_creation_form').on("change", (event) => {
        let gameSelectHTML = this.renderModalOptions(event.target.id);
        $('#game_start_options').innerHTML = '';
        $('#game_start_options').html(gameSelectHTML);
      });

    });





    //
    // Games Table
    //
    $('.games-nav-menu-item').off();
    $('.games-nav-menu-item').on('click', (event) => {

      document.getElementById(this.games.nav.selected).className = "";

      let id = $(this).attr("id");
      this.games.nav.selected = id;
      document.getElementById(this.games.nav.selected).className = "highlighted";

      showGamesTable(this.games[id]);

    });



  }





  ////////////////////
  // Update Balance //
  ////////////////////
  updateBalance(app) {

    if (app.BROWSER == 0) { return; }

    //
    // invite page stuff here
    //
    try {
      if (invite_page == 1 && !this.is_initializing) {
        $('.invite_play_button').css('background-color','darkorange');
        $('.invite_play_button').css('border', '1px solid darkorange');
        $('.invite_play_button').show();
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', () => {
          this.acceptGameInvitation();
          this.invitePlayButtonClicked();
        });
        return;
      }
    } catch (err) {}


    $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

    if (app.wallet.returnBalance() >= 2) {
      $('.funding_alert').hide();
      $('.create-game-container').show();
    }
  }







  ////////////////
  // Web Server //
  ////////////////
  webServer(app, expressapp) {

    let arcade_self = this;

    expressapp.get('/arcade/',  (req, res) => {
      res.sendFile(__dirname + '/web/index.html');
      return;
    });

    expressapp.get('/arcade/email',  (req, res) => {
      res.sendFile(__dirname + '/web/email.html');
      return;
    });

    expressapp.get('/arcade/invite/:gameinvite',  (req, res) => {

      let gameinvite = req.params.gameinvite;
      let txmsgstr = "";

      if (gameinvite != null) {
        txmsgstr = app.crypto.base64ToString(gameinvite);
      }

      let data = fs.readFileSync(__dirname + '/web/invite.html', 'utf8', (err, data) => {});
      data = data.replace('GAME_INVITATION', txmsgstr);
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write(data);
      res.end();
      return;
    });

    expressapp.get('/arcade/invite.css',  (req, res) => {
      res.sendFile(__dirname + '/web/invite.css');
      return;
    });

    expressapp.get('/arcade/style.css',  (req, res) => {
      res.sendFile(__dirname + '/web/style.css');
      return;
    });

    expressapp.get('/arcade/script.js',  (req, res) => {

      let html = "\n";

      for (let i = 0; i < arcade_self.games.open.length; i++) {

        let x = arcade_self.games.open[i];

	let gameid     = "";
	let adminid    = "";
	let winner     = "";
	let options    = "";
	let sig        = "";
	let created_at = 0;

	if (x.gameid != undefined && x.gameid != "")   { gameid = x.gameid; adminid    = `${x.gameid}_${x.game}`; }
	if (x.winner != undefined && x.winner != "")   { winner = x.winner; }
	if (x.options != undefined && x.options != "") { options = x.options; }
	if (x.sig != undefined && x.sig != "") { sig = x.sig; }
	if (x.created_at > 0) { created_at = x.created_at; }

        html += `open_games.push({ 
	  player: "${x.player}" , 
	  winner : "${winner}",
	  game: "${x.game}", 
	  state : "${x.state}" , 
	  status : "" ,
	  options : ${x.options} ,
	  sig : "${sig}",
	  created_at : ${created_at},
	  gameid : "${gameid}",
	  adminid : "${adminid}" 
	});`;
      }

      let data = fs.readFileSync(__dirname + '/web/script.js', 'utf8', (err, data) => {});
      data = data.replace('OPEN GAMES', html);
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write(data);
      res.end();
      return;

    });

    expressapp.get('/arcade/img/:imagefile',  (req, res) => {
      var imgf = '/web/img/'+req.params.imagefile;
      if (imgf.indexOf("\/") != false) { return; }
      res.sendFile(__dirname + imgf);
      return;
    });
  }







  async refreshOpenGames() {

console.log("REFRESHING OPEN GAMES");

    if (this.app.BROWSER == 0) {

      var sql    = "SELECT * FROM mod_arcade WHERE state = 'open'";
      var params = {};
      try {
        var rows = await this.db.all(sql, params);
      } catch(err) {
        console.log(err);
console.log("ERROR REFRESHING: " + err);
	return;
      }

      this.games.open = [];

      if (rows != null) {
        if (rows.length != 0) {
          for (var fat = 0; fat < rows.length; fat++) {
            this.games.open[fat] = {};
            this.games.open[fat].gameid     = rows[fat].gameid;
            this.games.open[fat].player     = rows[fat].player;
            this.games.open[fat].state      = rows[fat].state;
            this.games.open[fat].game_bid   = rows[fat].game_bid;
            this.games.open[fat].game       = rows[fat].game;
            this.games.open[fat].created_at = rows[fat].created_at;
            this.games.open[fat].expires_at = rows[fat].created_at + 6000000;
            this.games.open[fat].options    = `${JSON.stringify(rows[fat].options)}`;
            this.games.open[fat].sig        = rows[fat].sig;
          }
        }
      }
    }
  }







  updateBalance(app) {
    if (app.BROWSER == 0) { return; }

    //
    // invite page
    //
    try {
      if (invite_page == 1 && !this.is_initializing) {
        $('.invite_play_button').css('background-color','darkorange');
        $('.invite_play_button').css('border', '1px solid darkorange');
        $('.invite_play_button').show();
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', () => {
          this.acceptGameInvitation();
          this.invitePlayButtonClicked();
        });
        return;
      }
    } catch (err) { console.error(err) }


    $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

    if (app.wallet.returnBalance() >= 2) {
      $('.funding_alert').hide();
      $('.create-game-container').show();
    }
  }



  showGameCreator() {

    this.viewing_game_creator = 1;

    let game_options = "";
    let game_self = this.app.modules.returnModule(this.active_game);
    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }
    $('.game_details').html(game_options);

    this.updateBalance(this.app);

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();

    $('.find_player_button').show();
    $('.create_game_container').show();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }



  showGameInitializer() {

    this.viewing_game_initializer = 1;

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();

    $('.initialize_game_container').show();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }

  hideGameInitializer() {
    this.viewing_game_initializer = 0;
    $('.create_game_initializer').hide();
    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();
  }


  hideGameCreator() {
    this.viewing_game_creator = 0;
    $('.create_game_creator').hide();
    $('.find_player_button').hide();
    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();
  }



  renderModalOptions(option) {
    switch(option) {
      case 'open':
        return `<button id="create_game_button" class="quick_invite">CREATE GAME</button>`
      case 'link':
        return `<input class="quick_link_input" /> <button class="quick_invite"> COPY</button>`
      case 'key':
        let selectedGameModule = this.app.modules.returnModule(this.active_game);
        let html = `<div class="opponent_key_container">`
        for (let i = 0; i < selectedGameModule.maxPlayers - 1; i++) {
          html += `
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 15px;width: 25%">OPPONENT ${i + 1}:</span>
            <input class="opponent_address" id=${i}></input>
          </div>`
        }
        html += `<button style="margin-top: 0" class="quick_invite"> INVITE</button>`;
        html += "</div>";
        return html;
      default:
        break;
    }
  }





  populateGamesTable() {

    //
    // add games to table
    //
    if (this.app.options.games != undefined) {
      if (this.app.options.games.length > 0) {

        for (let i = 0; i < this.app.options.games.length; i++) {

          let x = this.app.options.games[i];
console.log("\n\n\nProcessing a Game: " );
console.log(JSON.stringify(x));

          let opponent   = "unknown";
          let gameid     = x.id;
          let player     = x.player;
          let winner     = x.winner;
          let gamename   = x.module;
          let options    = x.options;
          let state      = 'active';
          let status     = x.status;
          let adminid    = `${gameid}_${gamename}`;
	  let created_at = x.ts;
	  let sig        = x.sig;

	  if (x.id == undefined || x.id === "") {
	    gameid = "";
	    adminid = "";
	  }

  	  if (x.opponents != undefined) {
    	    if (x.opponents.length > 0) {
   	      opponent = x.opponents[0];
    	    }
  	  }

          if (x.initializing != 1) { state = "active"; }


          if (this.app.keys.returnIdentifierByPublicKey(opponent) !== "") { opponent = this.app.keys.returnIdentifierByPublicKey(opponent); }
          if (x.over == 1) { state = "over"; }
          if (opponent.length > 14 && this.app.crypto.isPublicKey(opponent) == 1) { opponent = opponent.substring(0, 13) + "..."; }
          if (status.length > 50) { status = status.substring(0, 50) + "..."; }

          let remote_address = "";
          for (let z = 0; z < x.opponents.length; z++) {;
            if (z > 0) { remote_address += "_"; }
            remote_address += x.opponents[z];
          }

console.log("ADDING TO OPEN GAMES");
console.log(gameid + " -- " + adminid);

          this.games.open.push({ 
	    player: opponent ,
	    winner : winner ,
	    game: gamename , 
	    state : state , 
	    status : status ,
	    options : options ,
	    created_at : created_at ,
	    sig : sig ,
	    gameid : gameid ,
	    adminid : adminid
	  });
        }
      }
    }
  }

}

module.exports = Arcade;

