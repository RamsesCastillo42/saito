const fs = require('fs');
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
const sqlite = require('sqlite');
var numeral = require('numeral');
const path = require("path");

class Arcade extends ModTemplate {

  constructor(app) {

    super();

    var dir = path.join(__dirname, '../../data');

    this.app             = app;

    this.dir             = dir;

    this.name            = "Arcade";
    this.browser_active  = 0;
    this.emailAppName    = "Arcade";

    this.active_game     = "";

    this.viewing_game_creator = 0;
    this.viewing_game_initializer = 0;

    this.initialization_check_active = true;
    this.initialization_check_timer  = null;
    this.initialization_check_timer_interval = 2000;
    this.initialization_check_timer_ellapsed = 0;

    this.db              = null;
    this.games           = {}
    this.games.open      = [];
    this.games.nav       = { selected: 'open' };

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
        this.db = await sqlite.open(`${this.dir}/arcade.sq3`);
        var sql = `CREATE TABLE IF NOT EXISTS mod_arcade (
          id INTEGER,
          player TEXT,
          player2 TEXT,
          game_bid INTEGER,
          gameid TEXT,
          game TEXT,
          state TEXT,
          status TEXT,
          options TEXT,
          sig TEXT,
          created_at INTEGER,
          expires_at INTEGER,
          PRIMARY KEY (id ASC))`;
        await this.db.run(sql, {});
        this.refreshOpenGames();
      } catch (err) {
      }
    }

  }

  initializeHTML(app) {
    const arcade_self = this;

    if (invite_page == 1) {

      //
      // check that we do not have an existing game with this inviter
      //
      let game_exists = 0;
      let game_exists_idx = 0;
      if (app.options.games != undefined) {
        for (let i = 0; i < app.options.games.length; i++) {
          if (app.options.games[i].opponents.length > 0) {
            if (app.options.games[i].opponents[0] === invite_data.pubkey) {
              if (app.options.games[i].over == 0) {
                game_exists = 1;
                game_exists_idx = i;
              }
            }
          }
        }
      }

      if (game_exists == 1) {
        app.options.games[i].ts = new Date().getTime();
        this.saveGame(app.options.games[game_exists_idx].id);
        $('.invite_main').html('You already have a game with this opponent.<p></p><a href="/twilight">Join this Game</a>');
        $('.invite_main').css('font-size','1.7em');
        return;
      }

      $('.inviting_address').html(invite_data.pubkey.substring(0,8));
      $('.invite_title').html(invite_data.module);

      if (parseFloat(this.app.wallet.returnBalance()) <= 0) {
        $('.get_tokens_button').off();
        $('.get_tokens_button').on('click', () => {
          $('#token_spinner').show();
          let {host, port, protocol} = this.app.network.peers[0].peer
          $.get(`${protocol}://${host}:${port}/faucet/tokens?address=${this.app.wallet.returnPublicKey()}`, (response, error) => {
            $('#token_spinner').hide();
            if (response.payload.status) {
              $('#token-success').show();
            } else {
              alert("We're sorry, we were unable to retrieve your tokens. If you're having difficulties, regenerate the link and try again");
            }
          });
          $('.get_tokens_button').hide();
        });
        // $('#token_spinner').hide();
      } else {
        $('.get_tokens_button').hide();
        $('.invite_play_button').show();
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', function() {
          arcade_self.acceptGameInvitation();
          arcade_self.invitePlayButtonClicked();
          $('.status').show();
        });
      }

      return;
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


      if (txmsg.request == "opengame") {
        let game_exists = arcade_self.games.open.some((game) => game.sig === txmsg.sig);
        if (!game_exists) {
          let game = {
            player: tx.transaction.from[0].add,
            state: txmsg.state,
            bid: blk.block.id,
            game: txmsg.game,
            options: txmsg.options,
            status: "Waiting for opponent",
            created_at: txmsg.ts,
            sig: txmsg.sig
          }

          arcade_self.games.open.push(game);
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
    let arcade_self = this;

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
                // MANUALLY ACCEPT INVITE
                //
                let text = `You have been invited to a game of ${this.active_game} by ${tx.transaction.from[0].add}`;

                var modal = document.getElementById("game_modal");
                modal.style.display = "block";

                $('#game_creation_form').hide();

                $('#modal_header_text').html('Game Invitation');
                $('#modal_body_text').html(text);
                $('#game_start_options').html(`<button class="accept_game_button" id="${game_id}_${tmpmod}"> ACCEPT</button>`);

                $('.accept_game_button').off();
                $('.accept_game_button').on('click', function() {

                  let tmpid = $(this).attr('id');
                  let tmpar = tmpid.split("_");
                  let game_id = tmpar[0];
                  let game_module = tmpar[1];

                  let game_self = arcade_self.app.modules.returnModule(txmsg.module);
                  let opponents = [];

                  for (let z = 0; z < tx.transaction.to.length; z++) {
                    if (! opponents.includes(tx.transaction.to[z].add)) {
                      opponents.push(tx.transaction.to[z].add);
                    }
                  }

                  game_self.loadGame(game_id);
                  game_self.saveGame(game_id);
                  game_self.game.options = txmsg.options;
                  game_self.game.invitation = 0;
                  game_self.game.accept = 1;
                  game_self.game.player = 2;
                  game_self.game.module = game_module;
                  game_self.saveGame(game_id);

                  //
                  // send official message accepting
                  //
                  var newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(opponents[0], 0.0);
                  if (newtx == null) {
                    alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
                    return;
                  }
                  for (let i = 1; i < opponents.length; i++) {
                    newtx.transaction.to.push(new saito.slip(opponents[i], 0.0));
                  }

                  newtx.transaction.msg.options  = game_self.game.options;
                  newtx.transaction.msg.module   = game_module;
                  newtx.transaction.msg.game_id  = game_id;
                  newtx.transaction.msg.request  = "accept";

                  newtx = arcade_self.app.wallet.signTransaction(newtx);
                  arcade_self.app.network.propagateTransaction(newtx);

                  arcade_self.showGameInitializer();
                  alert("We are going to initialize your game");
                  arcade_self.startInitializationTimer(game_id, txmsg.module);
                });
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
          // if (game_self.game.accept === 1) {
          //   return;
          // }

          if (game_self.game.initializing == 1) {

            if (game_self.game.accept == 0) {
              return;
            } else {
              this.hideGameCreator();
              this.showGameInitializer();
              this.startInitializationTimer(txmsg.game_id, txmsg.module);
            }
          } else {
            // alert("This game is ready to be played");
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
          if (arcade_self.games.open[i].player == arcade_self.app.wallet.returnPublicKey()) { alert('You cannot accept a game with yourself'); return; }
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

          arcade_self.hideArcadeHome();
          // arcade_self.showGameInitializer();

          } else {
            alert("Your account does not have SAITO tokens. Please get some for free from the Faucet...");
          }
          return;
        }
      }
    });


    $('.accept_game_button').off();
    $('.accept_game_button').on('click', function() {

      //
      // clone of code in game.js
      //
      let tmpid = $(this).attr('id');
      let tmpar = tmpid.split("_");

      let game_id = tmpar[0];
      let game_module = tmpar[1];

      arcade_self.startInitializationTimer(game_id, game_module);

      if ($('.lightbox_message_from_address').length > 0) {
        let remote_address = $('.lightbox_message_from_address').text();
        if ($(this).parent().parent().find('.acceptgameopponents').length > 0) {
          remote_address = $(this).parent().parent().find('.acceptgameopponents').attr("id");
        }
        tmpar = remote_address.split("_");
      }


      for (let z = 0; z < tmpar.length; z++) { tmpar[z] = tmpar[z].trim(); }

      game_self = arcade_self.app.modules.returnModule(game_module);
      game_self.loadGame(game_id);

  // console.log("GAME SELF: " + JSON.stringify(game_self.game.options));

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

      // newtx.transaction.msg.options  = game_self.game.options;
      newtx.transaction.msg.module   = game_module;
      newtx.transaction.msg.game_id  = game_id;
      newtx.transaction.msg.request  = "accept";

      newtx = arcade_self.app.wallet.signTransaction(newtx);
      arcade_self.app.network.propagateTransaction(newtx);

      // let html = 'You have accepted the invitation. Please keep your browser open while both players exchange the cryptographic information necessary to have a provably fair game. This may take up to five minutes, but only needs to happen once before the game. When your game is ready we will notify you here.<p></p><div id="status" class="status"></div>';
      // $('.manage_invitations').html(html);
      // $('.status').show();
    });


    //
    // delete games
    //
    $('.delete_game').off();
    $('.delete_game').on('click', function() {

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
        game_self = arcade_self.app.modules.returnModule(game_module);
        game_self.loadGame(gameid);
        if (game_self.game.over == 0) {
console.log("RESIGNING THE GAME!");
          game_self.resignGame();
          game_self.game.over = 1;
          game_self.game.last_block = arcade_self.app.blockchain.returnLatestBlockId();
        } else {
          game_self.game.over = 1;
          game_self.game.last_block = arcade_self.app.blockchain.returnLatestBlockId();
        }
        game_self.saveGame(gameid);
// alert("last block set to: " + game_self.game.over + " -- " + game_self.game.last_block + " -- GID: " + gameid);
      } catch (err) {
        console.log("ERROR DELETING GAME: " + err);
      }

      for (let i = 0; i < arcade_self.app.options.games.length; i++) {
        if (i < 0) { i = 0; }
        if (arcade_self.app.options.games.length == 0) {
        } else {

          if (arcade_self.app.options.games[i].id == undefined) {
// alert("DELETEING 0");
            arcade_self.app.options.games.splice(i, 1);
            i--;
          } else {
            if (arcade_self.app.options.games[i].id == gameid) {
// alert( arcade_self.app.options.games[i].last_block + " -- " + arcade_self.app.blockchain.returnLatestBlockId() );
              if (arcade_self.app.options.games[i].last_block > 0 && (arcade_self.app.options.games[i].last_block+10) < arcade_self.app.blockchain.returnLatestBlockId()) {
// alert("DELETEING 1");
                arcade_self.app.options.games.splice(i, 1);
                i--;
              }
            }
          }
          try {
            if (arcade_self.app.options.games[i].over == 1 && ((parseInt(arcade_self.app.options.games[i].last_block)+10) < arcade_self.app.blockchain.returnLatestBlockId())) {
// alert("DELETEING 2");
              arcade_self.app.options.games.splice(i, 1);
              i--;
            }
            if (arcade_self.app.options.games[i].opponents.length == 0) {
// alert("DELETEING 3");
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
    // #create_open_game

    $('#create_game_button').off();
    $('#create_game_button').on('click', () => {

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

      if (this.app.wallet.returnBalance() > this.app.wallet.returnDefaultFee()) {

        var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.app.wallet.returnPublicKey(), 0.0);
          if (newtx == null) {
            alert("ERROR: bug? unable to accept invitation. Do you have enough SAITO tokens?");
            return;
          }

          newtx.transaction.to.push(new saito.slip(this.app.wallet.returnPublicKey(), 0.0));
          newtx.transaction.msg.module  = "Arcade";
          newtx.transaction.msg.request = "opengame";
          newtx.transaction.msg.game    = this.active_game;
          newtx.transaction.msg.state   = "open";
          newtx.transaction.msg.options = options;
          newtx.transaction.msg.ts      = new Date().getTime();
          newtx.transaction.msg.sig     = this.app.wallet.signMessage(newtx.transaction.msg.ts.toString(), this.app.wallet.returnPrivateKey());

          newtx = this.app.wallet.signTransaction(newtx);
          this.app.network.propagateTransaction(newtx);

        // var modal = document.getElementById("game_modal");
        // modal.style.display = "block";

        // var modalTitle = document.getElementById("modal_header_text");
        // modalTitle.innerHTML = "";
        // modalTitle.appendChild(document.createTextNode("Your Game Has Been Created"));

        // //var gameCreationForm = document.getElementById("modal_header_text");
        // $("#game_creation_form").hide();

        // var modalBody = document.getElementById("modal_body_text");
        // modalBody.innerHTML = "";
        // modalBody.appendChild(document.createTextNode("Send us your phone number so we can notify you when you have an opponent"));

        // //let gameSelectHTML = this.renderModalOptions("link");
        // $('#game_start_options').innerHTML = '';
        // $('#game_start_options').html(`
        //   <div style="display: flex; align-items: center; width: 67%; margin-top:1em; margin-bottom:1em">
        //     <span style="margin-right: 15px">SMS:</span>
        //     <input class="opponent_address" id="player_sms"></input>
        //   </div>
        // `);

        this.createOpenGameSuccess()

        renderGamesTable(this.games[this.games.nav.selected]);
        this.hideGameCreator();
        this.showArcadeHome();

        this.attachEvents();

      } else {
        alert("Your account does not have SAITO tokens. Please get some for free from the Faucet...");
      }
    });

    $('#find_opponent_modal_button').off();
    $('#find_opponent_modal_button').on('click', () => {
      this.findOpponentModal();
      this.attachEvents();
    });

    $('#invite_by_publickey').off()
    $('#invite_by_publickey').on('click', () => {
      this.inviteByPublickeyModal();
      this.attachEvents();
    });

    $('#invite_by_link').off()
    $('#invite_by_link').on('click', () => {
      this.inviteByLinkModal()
      this.attachEvents();
    });

    //
    // CREATE GAME - Step #1
    //
    $('.game').off();
    $('.game').on('click', function() {

      arcade_self.active_game = $(this).attr("id");
      arcade_self.hideArcadeHome();
      arcade_self.showGameCreator();

      if (arcade_self.active_game == "Twilight") {
        $('.publisher_message').html("Twilight Struggle is <a href=\"https://github.com/trevelyan/ts-blockchain/blob/master/license/GMT_Vassal_Modules.pdf\" style=\"border-bottom: 1px dashed;cursor:pointer;\">released for use</a> in open source gaming engines provided that at least one player has purchased the game. By clicking to start a game you confirm that either you or your opponent has purchased a copy. Please support <a href=\"https://gmtgames.com\" style=\"border-bottom: 1px dashed; cursor:pointer\">GMT Games</a> and encourage further development of Twilight Struggle by <a style=\"border-bottom: 1px dashed;cursor:pointer\" href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>");
        $('.publisher_message').show();
      }
    });




    //
    // CREATE GAME -- STEP #2
    // invite_friend
    // game_button
    $('#invite_friend').off();
    $('#invite_friend').on('click', () => {
      this.inviteByLinkModal();
      this.attachEvents();
    });

    //
    // additional modal event listeners
    //
    $('.close').off();
    $('.close').on('click', () => {
      var modal = document.getElementById("game_modal");
      modal.style.display = "none";
    });

    $(window).off();
    $(window).on('click', () => {
      var modal = document.getElementById("game_modal");
      if (event.target == modal) {
        $('.close').off();
        modal.style.display = "none";
      }
    });

    $('#game_creation_form').off();
    $('#game_creation_form').on("change", (event) => {
      let gameSelectHTML = this.renderModalOptions(event.target.id);
      $('#game_start_options').innerHTML = '';
      $('#game_start_options').html(gameSelectHTML);

      this.attachEvents();
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


    //
    // Copy invite link functionality
    //
    $('#copy_quick_link_button').off();
    $('#copy_quick_link_button').on('click', () => {
      let url_input = document.getElementsByClassName("quick_link_input");
      url_input[0].select();
      document.execCommand("copy");
    });


    $('#invite_button').off();
    $('#invite_button').on('click', async function() {

      // $('.invite_button_switch').hide();

      var newtx;
      let options         = {};

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

      let opponent_inputs = $('.opponent_address');

      for (let i = 0; i < opponent_inputs.length; i++){
        let address = opponent_inputs[i];
        address = $(address).val().trim();

        if (address == arcade_self.app.wallet.returnPublicKey()) {
          alert("You cannot invite yourself to play a game -- if you really want to try, use two browsers!");
          return;
        }

        if (arcade_self.app.crypto.isPublicKey(address) == 0) {
          if (address.indexOf("@saito") == -1 && address.length > 0) {
            alert("All invited players must be identified by publickey or Saito email address");
            return;
          }

          address = await arcade_self.app.dns.fetchPublicKeyPromise(address);
        }

        if (i == 0) {
          newtx = arcade_self.app.wallet.createUnsignedTransactionWithDefaultFee(address, 0.0);
          if (newtx == null) {
            alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
            return;
          }
        } else {
          if (arcade_self.app.crypto.isPublicKey(address) == 1) {
            newtx.transaction.to.push(new saito.slip(address[1], 0.0));
          }
        }

        newtx.transaction.msg.module  = arcade_self.active_game;
        newtx.transaction.msg.request = "invite";
        newtx.transaction.msg.options = options;
        newtx.transaction.msg.sig     = newtx.transaction.sig;
        newtx.transaction.msg.pubkey  = arcade_self.app.wallet.returnPublicKey();
        newtx = arcade_self.app.wallet.signTransaction(newtx);
        arcade_self.app.network.propagateTransaction(newtx);

        $('#modal_header_text').html('Game Sent');
        $('#modal_body_text').html('Game invitation has been sent. Please keep your browser open. This will update when the game is accepted.');
        $('#game_creation_form').html('');
        $('#game_start_options').html('');

        let game_id = newtx.transaction.from[0].add + "&" + newtx.transaction.ts;
        let active_module = newtx.transaction.msg.module;
        arcade_self.startInitializationTimer(game_id, active_module);
      }
    });

  }

  startInitializationTimer(game_id, game_module) {
    let arcade_self = this;

    try {

      if (arcade_self.is_initializing == false) { this.initialization_check_timer_ellapsed = 0; }

      arcade_self.is_initializing = true;
      arcade_self.initialization_check_timer = setInterval(() => {

        arcade_self.initialization_check_timer_ellapsed++;

        if (invite_page == 1) {
          if ($('.status').html() === "") {
            if (arcade_self.initialization_check_timer_ellapsed == 3) { $('.invite_description').html(`<center>Checking to Confirm that Opponent is Online....</center>`); }
            if (arcade_self.initialization_check_timer_ellapsed == 8) { $('.invite_description').html(`<center>Still Checking to Confirm that Opponent is Online....</center>`); }
            if (arcade_self.initialization_check_timer_ellapsed == 12) { $('.invite_description').html(`<center>Waiting for Response from Opponent....</center>`); }
            if (arcade_self.initialization_check_timer_ellapsed == 20) { $('.invite_description').html(`<center>Still Waiting for Response from Opponent....</center>`); }
            if (arcade_self.initialization_check_timer_ellapsed == 32) { $('.invite_description').html(`<center>Still, Still Waiting for Response from Opponent....</center>`); }
            if (arcade_self.initialization_check_timer_ellapsed == 45) { $('.invite_description').html(`<center>One More Minute. Have you checked they are still online...?</center>`); }
          } else {
            $('.invite_description').html(`<center>Initializing Game with Opponent. Please stay on this page....</center>`);
          }
        }

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
          let html = `
          <center id="start_game_container">
            <div id="join_game_invite_description">Your game is ready:</div>
            <a href="/${game_module.toLowerCase()}">
              <button class="link linkbutton join_game start_game" id="invite_join_button">
                START
              </button>
            </a>
          </center>
          `;
          //<div id="return_to_arcade" class="return_to_arcade"><i class="fa fa-arrow-circle-left"></i> Return to Arcade</div>
          $('.initialize_game_container').html(html);
          // $('.manage_invitations').css('display:flex;');
          $('.initialize_game_container').show();
          if (this.browser_active == 1) { $('#status').hide(); $('#game_spinner').hide()}
          arcade_self.is_initializing = false;
          clearInterval(arcade_self.initialization_check_timer);
          arcade_self.attachEvents(this.app);
        }

      }, arcade_self.initialization_check_timer_interval);

    } catch (err) {
      alert("ERROR checking if game is initialized!");
    }

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

  acceptGameInvitation() {

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

    arcade_self.app.network.propagateTransaction(newtx);

    let game_id = newtx.transaction.from[0].add + "&" + newtx.transaction.ts;
    let game_module = newtx.transaction.msg.module;

    arcade_self.startInitializationTimer(game_id, game_module);

    this.active_game = invite_data.module;
    let game_self = this.app.modules.returnModule(invite_data.module);
    //
    // another game might be loaded already, so we make sure
    // we are dealing with something fresh
    //
    game_self.loadGame(game_id);
    //
    // save for good measure
    //
    game_self.saveGame(game_id);

    //
    // fast redirects seem to break stuff as old blocks re-run
    //
    //window.location = '/arcade';
    //window.location = '/' + invite_data.module;

  }

  findOpponentModal() {
    var modal = document.getElementById("game_modal");
    modal.style.display = "block";

    var modalTitle = document.getElementById("modal_header_text");
    modalTitle.innerHTML = "";
    modalTitle.appendChild(document.createTextNode("Game Creation"));

    //var gameCreationForm = document.getElementById("modal_header_text");
    $("#game_creation_form").hide();

    var modalBody = document.getElementById("modal_body_text");
    modalBody.innerHTML = "";
    modalBody.appendChild(document.createTextNode(
      `After posting, your game will be hosted here for others to accept. It might take a couple of minutes to find an opponent`
    ));

    //let gameSelectHTML = this.renderModalOptions("link");
    $('#game_start_options').innerHTML = '';
    $('#game_start_options').html(this.renderModalOptions("open"));
  }

  createOpenGameSuccess() {
    var modal = document.getElementById("game_modal");
    modal.style.display = "block";

    var modalTitle = document.getElementById("modal_header_text");
    modalTitle.innerHTML = "";
    modalTitle.appendChild(document.createTextNode("Your Game Has Been Created"));

    //var gameCreationForm = document.getElementById("modal_header_text");
    $("#game_creation_form").hide();

    var modalBody = document.getElementById("modal_body_text");
    modalBody.innerHTML = "";
    modalBody.appendChild(document.createTextNode("Send us your phone number so we can notify you when you have an opponent"));

    //let gameSelectHTML = this.renderModalOptions("link");
    $('#game_start_options').innerHTML = '';
    $('#game_start_options').html(`
      <div style="display: grid; width: 100%; row-gap: 1em">
        <div style="display: flex; align-items: center; width: 67%;">
          <span style="margin-right: 15px">SMS:</span>
          <input class="opponent_address" id="player_sms"></input>
        </div>
        <button id="send_sms_notification" style="margin: 0" class="quick_invite">SEND</button>
      </div>
    `);
  }

  inviteByLinkModal() {
    var modal = document.getElementById("game_modal");
    modal.style.display = "block";

    $('#modal_header_text').html('Game Invitation');
    $('#modal_body_text').html(
      `<p>Send this link to your opponent to start the game. </p>\n\n
      <a id="invite_by_publickey" style="text-decoration: underline; cursor: pointer">Or invite them with their publickey</a>`
    );

    $("#game_creation_form").show();

    let gameSelectHTML = this.renderModalOptions("link");
    $('#game_start_options').innerHTML = '';
    $('#game_start_options').html(gameSelectHTML);
  }

  inviteByPublickeyModal() {
    var modal = document.getElementById("game_modal");
    modal.style.display = "block";

    $('#modal_header_text').html('Game Invitation');
    $('#modal_body_text').html(
      `<p>Enter your opponent(s) publickey(s) to invite them directly</p>\n\n
      <a id="invite_by_link" style="text-decoration: underline; cursor: pointer">Or send them a link</a>`
    );

    $("#game_creation_form").show();

    let gameSelectHTML = this.renderModalOptions("key");
    $('#game_start_options').innerHTML = '';
    $('#game_start_options').html(gameSelectHTML);
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


  showArcadeHome() {
    $('.gamelist').show();
    $('#arcade_container').show();
    $('#games').show();
    $('.game_options').show();
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

    $('.find_player_button').show();
    $('.create_game_container').show();

    if (this.browser_active == 1) { this.attachEvents(this.app); }

    this.attachEvents();
  }

  showGameInitializer() {

    this.viewing_game_initializer = 1;

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();

    $('.modal').hide();

    $('.initialize_game_container').show();
    $('#game_spinner').show();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }

  hideGameInitializer() {
    this.viewing_game_initializer = 0;
    $('.create_game_initializer').hide();
    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();
  }

  hideArcadeHome() {
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();
  }


  hideGameCreator() {
    this.viewing_game_creator = 0;
    $('.create_game_container').hide();
    $('.find_player_button').hide();
    // $('.gamelist').show();
    // $('.game_options').show();
    $('.game_monitor').hide();
  }

  invitePlayButtonClicked() {
    $('#token-success').hide();
    $('#token_spinner').hide();
    $('.invite_play_button').hide();
    $('.get_tokens_button').hide();
    $('.ads').hide();
    $('.manage_invitations').css('font-size','1.4em');
    $('.status').css('font-size','1.25em');
    $('.invite_description').html(`Your game is initializing with your opponent. Please do not leave this page`);
    $('#game_spinner').show();
  }



  renderModalOptions(option) {
    switch(option) {
      case 'open':
        return `<button id="create_game_button" style="margin: 0" class="quick_invite">CREATE GAME</button>`
      case 'link':
        let game_module = this.app.modules.returnModule(this.active_game);
        let options = {};

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

        options = game_module.returnQuickLinkGameOptions(options);

        let txmsg = {};
        txmsg.module = this.active_game;
        txmsg.pubkey = this.app.wallet.returnPublicKey();
        txmsg.options = options;
        txmsg.ts = new Date().getTime();
        txmsg.sig = this.app.wallet.signMessage(txmsg.ts.toString(), this.app.wallet.returnPrivateKey());

        let base64str = this.app.crypto.stringToBase64(JSON.stringify(txmsg));

        return `<input class="quick_link_input" value="${window.location.href}/invite/${base64str}" />
        <button class="quick_invite" id="copy_quick_link_button" style="margin: 0"> COPY</button>`
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
        html += `<button style="margin: 0" class="quick_invite" id="invite_button"> INVITE</button>`;
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
// alert("X LAST BLOCK: " + x.last_block);
          if (x.over == 1) {
            state = "over";
            if (x.last_block > 0) {
// alert("X LAST BLOCK SET TO DELETED");
              state = "deleted";
            }
          }


          if (this.app.keys.returnIdentifierByPublicKey(opponent) !== "") { opponent = this.app.keys.returnIdentifierByPublicKey(opponent); }
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


