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

    var arcade_self = this;

    try {
      this.db = await sqlite.open('./data/arcade.sq3');
      var sql = "CREATE TABLE IF NOT EXISTS mod_arcade (id INTEGER, player TEXT, state TEXT, game_bid INTEGER, gameid TEXT, game TEXT, created_at INTEGER, expires_at INTEGER, PRIMARY KEY(id ASC))";
      let res = await this.db.run(sql, {});
console.log("DATABASE CREATED");
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






  async onNewBlock(blk, lc) {
    let arcade_self = blk.app.modules.returnModule("Arcade");
    arcade_self.refreshOpenGames();
  }

  async onConfirmation(blk, tx, conf, app) {

    let arcade_self = app.modules.returnModule("Arcade");

    if (tx.transaction.msg.module != "Arcade") { return; }

    if (app.BROWSER == 0) {

      if (conf == 0) {

	let txmsg = tx.returnMessage();

	let game  = txmsg.game;
	let state = txmsg.state;
	let pkey  = tx.transaction.from[0].add;

        var sql    = "INSERT INTO mod_arcade (player, state, game_bid, game) VALUES ($player, $state, $bid, $game)";
        var params = {
          $player : pkey ,
          $state : state ,
	  $bid : blk.block.id ,
	  $game : game 
        }

	try {
          let res = await arcade_self.db.run(sql, params);
	} catch (err) {
	  console.log("There is an error here: " + err);
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
    // Quick Invite
    //
    $('.quick_invite').off();
    $('.quick_invite').on('click', function() {

      if (arcade_self.app.wallet.returnBalance() > arcade_self.app.wallet.returnDefaultFee()) {

alert("I can send a transaction onchain!");

	//
	// on-chain
	//
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

  	newtx = arcade_self.app.wallet.signTransaction(newtx);

  	arcade_self.app.network.propagateTransaction(newtx);

	alert("WE HAVE BROADCAST A MESSAGE TO THE NETWORK");

      } else {

	//
	// off-chain peer-to-peer TX
	//
alert("I can't send a transaction onchain!");



      }

    });


    //
    // Modal
    //



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



    //
    // Start a Game Graphics
    //
    $('.game').off();
    $('.game').on('click', function() {

      arcade_self.active_game = $(this).attr("id");
      arcade_self.showMonitor();

      $('.find_player_button').toggle();
      $('.create_game_container').toggle();

      if (arcade_self.active_game == "Twilight") {
        $('.publisher_message').html("Twilight Struggle is <a href=\"https://github.com/trevelyan/ts-blockchain/blob/master/license/GMT_Vassal_Modules.pdf\" style=\"border-bottom: 1px dashed;cursor:pointer;\">released for use</a> in open source gaming engines provided that at least one player has purchased the game. By clicking to start a game you confirm that either you or your opponent has purchased a copy. Please support <a href=\"https://gmtgames.com\" style=\"border-bottom: 1px dashed; cursor:pointer\">GMT Games</a> and encourage further development of Twilight Struggle by <a style=\"border-bottom: 1px dashed;cursor:pointer\" href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>");
        $('.publisher_message').show();
      }

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

	if (x.gameid != undefined && x.gameid != "") { gameid = x.gameid; adminid    = `${x.gameid}_${x.game}`; }
	if (x.winner != undefined && x.winner != "") { winner = x.winner; }


        html += `open_games.push({ 
	  player: "${x.player}" , 
	  winner : "${winner}",
	  game: "${x.game}", 
	  state : "${x.state}" , 
	  status : "" ,
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
console.log("RUN ON DB: " + JSON.stringify(rows));
        var rows = await this.db.all(sql, params);
console.log("AWAIT: " + JSON.stringify(rows));
      } catch(err) {
        console.log(err);
console.log("ERROR REFRESHING: " + err);
	return;
      }

      this.games.open = [];

      if (rows != null) {
        if (rows.length != 0) {
          for (var fat = 0; fat < rows.length; fat++) {
console.log("HERE WE IS" + JSON.stringify(rows[fat]));
            this.games.open[fat] = {};
            this.games.open[fat].gameid     = rows[fat].gameid;
            this.games.open[fat].player     = rows[fat].player;
            this.games.open[fat].state      = rows[fat].state;
            this.games.open[fat].game_bid   = rows[fat].game_bid;
            this.games.open[fat].game       = rows[fat].game;
            this.games.open[fat].created_at = new Date().getTime();
            this.games.open[fat].expires_at = new Date().getTime() + 600000;
          }
        }
      }
    }
  }




  populateGameMonitor(app) {

    let game_options = "";
    let game_self = app.modules.returnModule(this.active_game);

    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }

    $('.game_details').html(game_options);
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



  showMonitor() {

    this.populateGameMonitor(this.app);
    this.updateBalance(this.app);

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();

    this.addModalEvents();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }

  addModalEvents() {
    // Modal Functionality
    // Get the modal
    var modal = document.getElementById("game_modal");
    var btn = document.getElementById("game_button");
    var modalSelector = document.getElementById("game_modal_selector");
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal
    btn.addEventListener('click', () => {
      modal.style.display = "block";
    });

    // When the user clicks on <span> (x), close the modal
    span.addEventListener('click', () => {
      modal.style.display = "none";
    });

    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener('click', () => {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    });

    // game_modal_selector
    modalSelector.addEventListener("change", (event) => {
      let gameSelectHTML = this.renderModalOptions(event.target.value)
      $('#game_start_options').innerHTML = '';
      $('#game_start_options').html(gameSelectHTML);
    });
  }


  renderModalOptions(option) {
    switch(option) {
      case 'open':
        return `<button class="quick_invite">CREATE GAME</button>`
      case 'link':
        return `<input class="quick_link_input" />`
      case 'key':
        let selectedGameModule = this.app.modules.returnModule(this.active_game);
        let html = `<div class="oponent_key_container">`
        for (let i = 0; i < selectedGameModule.maxPlayers - 1; i++) {
          html += `<div style="display: flex; align-items: center;"><span style="margin-right: 15px;">OPPONENT ${i + 1}:</span> <input class="opponent_address" id=${i}></input></div>`
        }
        html += `<button class="quick_invite"> INVITE</button>`;
        html += "</div>";
        return html;
      default:
        break;
    }
  }

  hideMonitor() {
    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();
  }




  populateGamesTable() {

    //
    // add games to table
    //
    if (this.app.options.games != undefined) {
      if (this.app.options.games.length > 0) {

        for (let i = 0; i < this.app.options.games.length; i++) {

	  let x = this.app.options.games[i];

     	  let opponent   = "unknown";
  	  let gameid     = x.id;
  	  let player     = x.player;
  	  let winner     = x.winner;
  	  let gamename   = x.module;
  	  let state      = "initializing";
  	  let status     = x.status;
          let adminid    = `${gameid}_${gamename}`;

	  if (x.id == undefined || x.id == "") {
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

          open_games.push({ 
	    player: opponent ,
	    winner : winner ,
	    game: gamename , 
	    state : state , 
	    status : status ,
	    gameid : gameid ,
	    adminid : adminid
	  });

        }
      }
    }
  }








}

module.exports = Arcade;

