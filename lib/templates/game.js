/**********************************************************************************

 GAME MODULE v.2

 This is a general parent class for modules that wish to implement Game logic. It
 introduces underlying methods for creating games via email invitations, and sending
 and receiving game messages over the Saito network. The module also includes random
 number routines for dice and deck management.

 This module attempts to use peer-to-peer connections with fellow gamers where
 possible in order to avoid the delays associated with on-chain transactions. All
 games should be able to fallback to using on-chain communications however. Peer-
 to-peer connections will only be used if both players have a proxymod connection
 established.a

 Developers please note that every interaction with a random dice and or processing
 of the deck requires an exchange between machines, so games that do not have more
 than one random dice roll per move and/or do not require constant dealing of cards
 from a deck are easier to implement on a blockchain than those which require
 multiple random moves per turn.

 HOW IT WORKS

 We recommend new developers check out the WORDBLOCKS game for a quick introduction 
 to how to build complex games atop the Saito Game Engine. Essentially, games require
 developers to manage a "stack" of instructions which are removed one-by-one from 
 the main stack, updating the state of all players in the process. 
 
**********************************************************************************/

var saito = require('../saito/saito');
var ModTemplate = require('./template');
var util = require('util');
const Big      = require('big.js');

//////////////////
// CONSTRUCTOR  //
//////////////////
function Game(app) {

  if (!(this instanceof Game)) { return new Game(app); }

  Game.super_.call(this);

  this.app = app;

  this.name = "Game";
  this.browser_active = 0;
  this.emailAppName = "Game";

  //
  // sanity check
  //
  this.not_so_secret = "WE_HAVE_TO_GO_DEEPER";

  this.connection_monitor_timer = null;
  this.connection_monitor_speed = 2000;

  this.offchain = 1;

  this.gameboardWidth = 5100;
  this.screenRatio = 1;

  this.low_balance_alert_sent = 0;
  this.initialize_game_run = 0;

  this.game = {};

  this.old_deck = {};
  this.old_cards = [];
  this.old_keys = [];

  return this;

}
module.exports = Game;
util.inherits(Game, ModTemplate);



////////////////////
// onConfirmation //
////////////////////
Game.prototype.onConfirmation = async function onConfirmation(blk, tx, conf, app) {

  if (conf == 0) {

    let txmsg      = tx.returnMessage();
    let game_self  = app.modules.returnModule(txmsg.module);

console.log("GAME ONCONF: " + txmsg.module); 

    //
    // sanity check -- only game modules will have inherited our not_so_secret field
    //
    if (game_self.not_so_secret != "WE_HAVE_TO_GO_DEEPER") { return; }

    //
    //
    //
    clearInterval(game_self.connection_monitor_timer);
    game_self.flagConnectionStable();


    try {

      if (tx.isTo(app.wallet.returnPublicKey()) == 1) {

	/////////////////////////
	// check SAITO balance //
	/////////////////////////
	if (game_self.low_balance_alert_sent == 0 && Big(app.wallet.returnBalance()).lt(80)) {
	  if (game_self.browser_active == 1) { alert("Your SAITO balance ("+app.wallet.returnBalance()+") is running low. Your game may act unpredictably if you run out of tokens"); }
	  game_self.updateLog("Your SAITO balance ("+app.wallet.returnBalance()+") is running low. Please visit the <a href='/faucet' target='_faucet'>token faucet</a> to refill your account. Remember not to leave your game mid-turn.</a>'");
	  game_self.low_balance_alert_sent = 1;
	}

        ////////////
        // INVITE //
        ////////////
        if (txmsg.request == "invite") {

	  if (tx.transaction.from[0] == app.wallet.returnPublicKey()) { return; }

          let game_id    = tx.transaction.from[0].add + "&" + tx.transaction.ts;
	  if (game_self.app.options.games != undefined) {
	    for (let i = 0; i < game_self.app.options.games.length; i++) {
	      if (game_self.app.options.games[i].id == game_id) {
		return;
	      }
	    }
	  }


          if (tx.isTo(app.wallet.returnPublicKey()) == 1) {
            let email_self = app.modules.returnModule("Email");
            let title      = game_self.emailAppName + " Invitation";
            let opponentshtml = "";
            for (let z = 0; z < tx.transaction.to.length; z++) {
	      if (z > 0) { opponentshtml += ", "; }
	      opponentshtml += tx.transaction.to[z].add;
            }
            let data       = 'You have been invited to a game of '+game_self.emailAppName+'. <div class="accept_invite link" id="'+game_id+'_'+txmsg.module+'">click here to accept</div>.';
            if (opponentshtml.length > tx.transaction.to[0].add.length) {
	      opponentshtml += ", ";
	      opponentshtml += tx.transaction.from[0].add;
	      data       = 'You have been invited to a group game of '+game_self.emailAppName+' ('+opponentshtml+'). <div class="accept_invite link" id="'+game_id+'_'+txmsg.module+'">click here to accept</div>.';
	    }
            email_self.receiveMail(title, data, tx);
          } else {
            let email_self = app.modules.returnModule("Email");
            let title      = game_self.emailAppName + " Invitation Sent";
            let opponentshtml = "";
            for (let z = 0; z < tx.transaction.to.length; z++) {
	      if (z > 0) { opponentshtml += ", "; }
	      opponentshtml += tx.transaction.to[z].add;
            }
            let data       = 'You have invited ' + opponentshtml + ' to a game of ' + game_self.emailAppName + '. Please wait for them to initiate the game.';
            email_self.receiveMail(title, data, tx);
          }


          app.storage.saveOptions();
          return;
        }


        ////////////
        // ACCEPT //
        ////////////
        if (txmsg.request == "accept") {

          game_id = txmsg.game_id;
          game_self.game = game_self.loadGame(game_id);
          game_self.game.module = txmsg.module;
          game_self.saveGame(game_id);

	  if (game_self.game.step.game == 0) {

            if (tx.transaction.from[0].add == app.wallet.returnPublicKey()) {
              game_self.game.accept = 1;
              if (game_self.app.network.isConnected() == 1) {
                game_self.saveGame(game_id);
              }
            }

            for (let i = 0; i < tx.transaction.to.length; i++) { game_self.addOpponent(tx.transaction.to[i].add); }
            game_self.game.module = txmsg.module;
            game_self.saveGame(game_id);

	  }

	  //
	  // the inviter automatically approves
	  //
	  // TODO minro security issue here with fake accepts forcing users to start games
	  // and spend network fees in initializing them. this is not a huge deal at this 
	  // point although it should be fixed later.
	  //
      	  let tmpar = game_id.split("&");
	  let originator = tmpar[0];    

	  if (originator === game_self.app.wallet.returnPublicKey()) {
	    game_self.game.accept = 1;
	    game_self.saveGame(game_id);
	  }


console.log("\n\n\nACCEPTING: " );
console.log(JSON.stringify(game_self.game.opponents));
console.log(JSON.stringify(game_self.game.accepted));

	  //
	  // do not return if everyone has accepted -- then we can go 
	  // immediately into queue processing
	  //
	  let has_everyone_accepted = 1;
	  for (let b = 0; b < game_self.game.accepted.length; b++) {
	    if (tx.transaction.from[0].add === game_self.game.opponents[b]) { 
	      game_self.game.accepted[b] = 1;
	      game_self.saveGame(game_id);
	    }
	    if (game_self.game.opponents[b] === originator) { 
	      game_self.game.accepted[b] = 1;
	      game_self.saveGame(game_id);
	    }
	    if (game_self.game.accepted[b] == 0) { 
	      has_everyone_accepted = 0;
	    }
	  }
console.log("AAA 2");

	  if (has_everyone_accepted == 0) {
	    return;
	  }

	  //
	  // return if I have not accepted
	  //
	  if (game_self.game.accept == 0) { 
	    console.log("READY -- except I have not accepted!");
	    return; 
	  }

console.log("AAA 3");

	  //
	  // set our player numbers alphabetically
	  //
	  let players = [];
	  players.push(game_self.app.wallet.returnPublicKey());
	  for (let z = 0; z < game_self.game.opponents.length; z++) {
	    players.push(game_self.game.opponents[z]);
	  }
	  players.sort();

          for (let i = 0; i < players.length; i++) {
	    if (players[i] === game_self.app.wallet.returnPublicKey()) {
	      game_self.game.player = i+1;
	      game_self.saveGame(game_id);
	    }
	  }


console.log("AAA 4");

	  //
	  // if we hit this point, everyone has accepted the game
	  // so we can move into handleGame
	  //
          if ( game_self.initializeGameFeeder(game_id) == 1 ) {	  

console.log("AAA 5");

            let title = game_self.emailAppName + " Accepted";
            let data = 'Your game of ' + game_self.emailAppName + ' is initializing. During this time -- until you have been notified that the game is ready to play -- please do not close your browser.';
            let email_self = app.modules.returnModule("Email");
            email_self.receiveMail(title, data, tx);

	  } else {

console.log("CANNOT INITIALIZE GAME FEEDER");

	  }
        }





        ////////////
        // INVITE //
        ////////////
        if (txmsg.request == "gameover") {

          let game_id    = txmsg.game_id;

          let email_self = app.modules.returnModule("Email");
          let title      = "Game Over";
          let data       = "Your game has finished.";

          email_self.receiveMail(title, data, tx);

	  let mygames = app.options.games;

          for (let i = 0; i < mygames.length; i++) {
	    if (mygames[i].id === txmsg.game_id) {
	      if (app.options.games[i].over == 0) {
                app.options.games[i].over = 1;
                app.options.games[i].last_block = app.blockchain.returnLatestBlockId();
	        game_self.updateStatus("Opponent Resigned");
	        game_self.updateLog("Opponent Resigned");
                game_self.app.storage.saveOptions();
	      }
            }
	  }

          return;

        }



	//
	// at this point, we check to make sure
	// that this is not a game move that we 
	// have already dealt with
	//
	if (txmsg.step == undefined) { txmsg.step = {}; }
        if (txmsg.step.game != undefined) {
          if (txmsg.step.game <= game_self.game.step.game) {
            return;
          }
        } else {
	  txmsg.step.game = 0;
          if (game_self.game.step.game > 0) {
            return;
          }
	}
        if (txmsg.extra != undefined) {
          if (txmsg.extra.target != undefined) {
            game_self.game.target = txmsg.extra.target;
          }
        } else { txmsg.extra = {}; }
	if (txmsg.turn == undefined) { txmsg.turn = []; }
        game_self.game.step.game = txmsg.step.game;


        ///////////
        // QUEUE //
        ///////////
        if (game_self.game.queue != undefined) {

          for (let i = 0; i < txmsg.turn.length; i++) { game_self.game.queue.push(txmsg.turn[i]); }
	  game_self.saveGame(game_self.game.id);

          let cont = 1;

          if (game_self.game.queue.length > 0) {
          while (game_self.game.queue.length > 0 && cont == 1) {

            let gqe = game_self.game.queue.length-1;
            let gmv = game_self.game.queue[gqe].split("\t");
	
	    //
	    // core game engine
	    //
	    // DEAL player cards
	    // REQUESTKEYS sender recipient keys
	    // ISSUEKEYS sender recipient keys
	    // RESOLVEDEAL recipient cards
	    // RESOLVE
	    //
	    if (gmv[0] === "RESOLVE") {
              if (gqe == 0) {
                game_self.game.queue = [];
              } else {
                let gle = gqe-1;
                if (gle <= 0) {
                  game_self.game.queue = [];
                } else {
                  game_self.game.queue.splice(gle, 2);
                }
              }
	      game_self.saveGame(game_self.game.id);
            }



	    if (gmv[0] === "EMAIL") {
	      if (gmv[1] == "ready") {

		game_self.game.initializing = 0;

	        let title = game_self.emailAppName + " Game Ready";
	        let data  = 'Your game of ' + game_self.emailAppName + ' is ready to begin.<p></p><div id="'+game_self.game.id+'_'+game_self.game.module+'" class="open_game link">Click here to open or continue this game.</div>';
	        let email_self = game_self.app.modules.returnModule("Email");

	        let newtx = new saito.transaction();
	        newtx.transaction.ts = new Date().getTime();
	        newtx.transaction.from = [];
	        newtx.transaction.to = [];
	        newtx.transaction.from.push(new saito.slip(game_self.app.wallet.returnPublicKey()));
	        newtx.transaction.to.push(new saito.slip(game_self.app.wallet.returnPublicKey()));
	        email_self.receiveMail(title, data, newtx, function() {});
		game_self.saveGame(game_self.game.id);

	      }
              game_self.game.queue.splice(gqe, 1);
	    }




	    if (gmv[0] === "SHUFFLE") {
	      game_self.shuffleDeck();
              game_self.game.queue.splice(gqe, 1);
	    }




	    if (gmv[0] === "RESOLVEDEAL") {

	      let recipient = gmv[1];
	      let cards = gmv[2];

	      if (game_self.game.player == recipient) {
                for (let i = 0; i < cards; i++) {
        	  let newcard = game_self.game.deck.cards[i];
        	  newcard = game_self.app.crypto.decodeXOR(newcard, game_self.game.deck.keys[i]);
        	  newcard = game_self.app.crypto.hexToString(newcard);
        	  console.log("PLAYER: " + game_self.game.player + " finally decoded: " + newcard);
        	  game_self.game.hand.push(newcard);
	        }
	      }

	      //
	      // everyone purges their spent keys
	      //
              game_self.game.deck.keys = game_self.game.deck.keys.splice(cards, game_self.game.deck.keys.length - cards);
              game_self.game.deck.cards = game_self.game.deck.cards.splice(cards, game_self.game.deck.cards.length - cards);

              if (gqe == 0) {
                game_self.game.queue = [];
              } else {
                let gle = gqe-1;
                if (gle <= 0) {
                  game_self.game.queue = [];
                } else {
                  game_self.game.queue.splice(gle, 2);
                }
              }
	      game_self.saveGame(game_self.game.id);
            }



	    if (gmv[0] === "DEAL") {
	      let recipient = gmv[1];
	      let cards = gmv[2];
	      let total_players = game_self.game.opponents.length+1;
	      game_self.game.queue.push("RESOLVEDEAL\t"+recipient+"\t"+cards);
	      for (let i = 1; i < total_players+1; i++) {
	        if (i != recipient) {
		  game_self.game.queue.push("REQUESTKEYS\t"+i+"\t"+recipient+"\t"+cards);
	        }
	      }
	    }



	    if (gmv[0] === "REQUESTKEYS") {

	      let sender = gmv[1];
	      let recipient = gmv[2];
	      let cards = gmv[3];

	      //
	      // sender then sends keys
	      //
  	      if (game_self.game.player == sender) {
                game_self.game.turn = [];
		game_self.game.turn.push("RESOLVE");
        	for (let i = 0; i < cards; i++) { game_self.game.turn.push(game_self.game.deck.keys[i]); }
	        game_self.game.turn.push("ISSUEKEYS\t"+sender+"\t"+recipient+"\t"+cards);
                game_self.sendMessage("game", {});
	      }

	      //
	      // execution stops
	      //
	      game_self.saveGame(game_self.game.id);
	      return 0;

	    }



	    if (gmv[0] === "ISSUEKEYS") {

	      let sender = gmv[1];
	      let recipient = gmv[2];
	      let cards = gmv[3];
	      let keyidx = gqe-cards; 

	      game_self.game.queue.splice(gqe, 1);

  	      if (game_self.game.player == recipient) {
      	        for (let i = 0; i < cards; i++) {
        	  game_self.game.deck.cards[i] = game_self.app.crypto.decodeXOR(game_self.game.deck.cards[i], game_self.game.queue[keyidx+i]);
	        }
	      }

              game_self.game.queue.splice(keyidx, cards);
	      game_self.saveGame(game_self.game.id);

	    }





	    //
	    // DECKBACKUP
	    // DECKRESTORE
	    // DECKENCRYPT [player]
	    // DECKXOR [player]
	    // DECK [array of cards]
	    //
	    if (gmv[0] === "DECKBACKUP") {

	      game_self.old_deck = {};
	      game_self.old_cards = [];
	      game_self.old_keys = [];

	      for (let i = 0; i < game_self.game.deck.cards.length; i++) {
	        game_self.old_cards[i] = game_self.game.deck.cards[i];
	        game_self.old_keys[i] = game_self.game.deck.keys[i];
	      }
	      for (var i in game_self.game.cards) {
	        game_self.old_deck[i] = game_self.game.cards[i];
	      }

              game_self.game.queue.splice(gqe, 1);
	    }



	    if (gmv[0] === "DECKRESTORE") {

	      for (let i = game_self.old_cards.length - 1; i >= 0; i--) {
	        game_self.game.deck.cards.unshift(game_self.old_cards[i]);
	        game_self.game.deck.keys.unshift(game_self.old_keys[i]);
	      }
	      for (var b in game_self.old_deck) {
	        game_self.game.cards[b] = game_self.old_deck[b];
	      }
	      game_self.old_deck = {};
	      game_self.old_cards = [];
	      game_self.old_keys = [];

              game_self.game.queue.splice(gqe, 1);
	    }

	    



	    if (gmv[0] === "CARDS") {
              game_self.game.queue.splice(gqe, 1);
	      for (let i = 0; i < gmv[1]; i++) {
	        game_self.game.deck.cards[(gmv[1]-1-i)] = game_self.game.queue[gqe-1-i];
                game_self.game.queue.splice(gqe-1-i, 1);
	      }
	    }


	    
	    if (gmv[0] === "DECK") {
	      let cards = JSON.parse(gmv[1]);
              game_self.updateStatus("creating deck by importing specified cards...");
    	      game_self.game.cards = cards;
    	      let a = 0; for (var i in game_self.game.cards) { game_self.game.deck.cards[a] = game_self.app.crypto.stringToHex(i); a++; }
              game_self.game.queue.splice(gqe, 1);
	    }

	    

	    if (gmv[0] === "DECKXOR") {

    	      if (game_self.game.player == gmv[1]) {

	        game_self.updateStatus("encrypting deck for blind card shuffle");

 	        if (game_self.game.deck.xor == "") { game_self.game.deck.xor = game_self.app.crypto.hash(Math.random()); }

	        for (let i = 0; i < game_self.game.deck.cards.length; i++) {
	          game_self.game.deck.cards[i] = game_self.app.crypto.encodeXOR(game_self.game.deck.cards[i], game_self.game.deck.xor);
	          game_self.game.deck.keys[i] = game_self.app.crypto.generateKeys();
	        }
	        
	        //
	        // shuffle the encrypted deck
	        //
	        game_self.game.deck.cards = game_self.shuffleArray(game_self.game.deck.cards);

	        game_self.game.turn = [];
		game_self.game.turn.push("RESOLVE");
	        for (let i = 0; i < game_self.game.deck.cards.length; i++) { game_self.game.turn.push(game_self.game.deck.cards[i]); }
		game_self.game.turn.push("CARDS\t"+game_self.game.deck.cards.length);

	        let extra = {};

	        game_self.sendMessage("game", extra);

	      } else {
	        game_self.updateStatus("opponent encrypting deck for blind card shuffle");
	      }

	      cont = 0;

	    }





	    if (gmv[0] === "DECKENCRYPT") {

    	      if (game_self.game.player == gmv[1]) {

      		game_self.updateStatus("encrypting shuffled deck for dealing to players...");

      		for (let i = 0; i < game_self.game.deck.cards.length; i++) {
      		  game_self.game.deck.cards[i] = game_self.app.crypto.decodeXOR(game_self.game.deck.cards[i], game_self.game.deck.xor);
      		  game_self.game.deck.cards[i] = game_self.app.crypto.encodeXOR(game_self.game.deck.cards[i], game_self.game.deck.keys[i]);
      		}

                game_self.game.turn = [];
                game_self.game.turn.push("RESOLVE");
                for (let i = 0; i < game_self.game.deck.cards.length; i++) { game_self.game.turn.push(game_self.game.deck.cards[i]); }
                game_self.game.turn.push("CARDS\t"+game_self.game.deck.cards.length);

      		let extra = {};
      		game_self.sendMessage("game", extra);

	      } else {

      		game_self.updateStatus("opponent encrypting shuffled deck for dealing to players...");

	      }

	      cont = 0;
	    }

	    

	    //
	    // if we hit this point, kick our
	    // commands into the module and 
	    // let it tell us whether we 
	    // continue.
	    //
	    if (cont == 1) {
console.log("SENDING MESSAGE TO GAME 1: " + JSON.stringify(txmsg));
	      cont = game_self.handleGame(txmsg);
	    }

	    //
	    // break if requested
 	    //
	    if (cont == 0) {
	      game_self.saveGame(game_self.game.id);
	      return;
	    }
          }
          } else {
console.log("SENDING MESSAGE TO GAME 2: " + JSON.stringify(txmsg));
	    return game_self.handleGame(txmsg);
	  }
        }
      }
    } catch (err) {
      console.log("\n\nCAUGHT AN ERROR: "+ JSON.stringify(err) + "\n\n");
      return; 
    }
  }
}





/////////////////////
// Dice Management //
/////////////////////
//
// use callback temporarily until better async / await integration
//
Game.prototype.rollDice = function rollDice(sides = 6, mycallback = null) {
  this.game.dice = this.app.crypto.hash(this.game.dice);
  let a = parseInt(this.game.dice.slice(0, 12), 16) % sides;
  if (mycallback != null) { 
    mycallback((a + 1)); 
  } else { 
    return (a + 1); 
  }
}
Game.prototype.initializeDice = function initializeDice() {
  if (this.game.dice == "") { this.game.dice = this.app.crypto.hash(this.game.id); }
}




//////////////////
// Shuffle Deck //
//////////////////
Game.prototype.shuffleDeck = function shuffleDeck() {

  //
  // shuffling the deck
  //
  this.updateLog("shuffling deck");
  this.updateStatus("Shuffling the Deck");

  let new_cards = [];
  let new_keys = [];

  let old_cards = this.game.deck.cards;
  let old_keys = this.game.deck.keys;

  let total_cards = this.game.deck.cards.length;
  let total_cards_remaining = total_cards;

  for (let i = 0; i < total_cards; i++) {

    // will never have zero die roll, so we subtract by 1
    let random_card = this.rollDice(total_cards_remaining) - 1;  

    new_cards.push(old_cards[random_card]);
    new_keys.push(old_keys[random_card]);

    old_cards.splice(random_card, 1);
    old_keys.splice(random_card, 1);

    total_cards_remaining--;

  }

  this.game.deck.cards = new_cards;
  this.game.deck.keys = new_keys;

}



////////////
// Resign //
////////////
Game.prototype.resignGame = function resignGame(reason="") {

  //
  // send game over message
  //
  var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.app.wallet.returnPublicKey(), 0.0);
  for (let i = 0; i < this.game.opponents.length; i++) { newtx.transaction.to.push(new saito.slip(this.game.opponents[i], 0.0)); }
  if (newtx == null) { alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?"); return; }

  newtx.transaction.msg.module  = this.game.module;
  newtx.transaction.msg.request = "gameover";
  newtx.transaction.msg.game_id = this.game.id;
  newtx.transaction.msg.module  = this.game.module;
  newtx.transaction.msg.reason  = reason;
  newtx = this.app.wallet.signTransaction(newtx);
  this.app.network.propagateTransaction(newtx);

}




/////////////////////
// Game Management //
/////////////////////
Game.prototype.handleGame = function handleGame(msg) {
  console.log("GAME HANDLE GAME FUNCTION - this should be overridden by your game");
}






Game.prototype.initializeDeck = function initializeDeck(cards = null) {

  this.updateStatus("shuffling our deck of cards...");

  let msg = {};
  msg.extra = {};
  msg.extra.target = 1;
  msg.turn = [];

  if (cards != null) { msg.turn = cards; }

  this.handleDeck(msg);

}






/////////////////////
// Deal Management //
/////////////////////
Game.prototype.handleDeal = function handleDeal(msg) {

  let target = msg.extra.target;    // whose turn
  let receiver = msg.extra.receiver;  // who gets cards
  let num = msg.extra.cards;     // how many cards
  let keys = msg.turn;
  let lower_limit = 0;
  let upper_limit = 0;

  //
  // no keys? I'm either originating this or getting a request for my keys
  //
  if (this.game.player != receiver) {
    if (msg.extra.target == this.game.player) {

      //
      // they want my keys
      //
      if (keys.length == 0) {

        this.game.turn = [];
        for (let i = 0; i < num; i++) {
          this.game.turn[i] = this.game.deck.keys[i];
        }

        this.game.deck.keys = this.game.deck.keys.splice(num, this.game.deck.keys.length - num);
        this.game.deck.cards = this.game.deck.cards.splice(num, this.game.deck.cards.length - num);

        msg.extra.target = this.returnNextPlayer(this.game.player);
        this.sendMessage("deal", msg.extra);

      }
    }
  } else {

    //
    // someone sent me their keys
    //
    if (msg.extra.target != this.game.player) {
      for (let i = 0; i < keys.length; i++) {
        this.game.deck.cards[i] = this.app.crypto.decodeXOR(newcard, this.game.deck.keys[i]);
      }
    } else {

      //
      // send back into main loop
      //
      for (let i = 0; i < keys.length; i++) {
        let newcard = this.game.deck.cards[i];
        newcard = this.app.crypto.decodeXOR(newcard, this.game.deck.keys[i]);
        newcard = this.app.crypto.decodeXOR(newcard, keys[i]);
        newcard = this.app.crypto.hexToString(newcard);
        console.log("PUSHING: " + newcard);
        this.game.hand.push(newcard);
      }

      this.game.deck.keys = this.game.deck.keys.splice(num, this.game.deck.keys.length - num);
      this.game.deck.cards = this.game.deck.cards.splice(num, this.game.deck.cards.length - num);

      msg.turn = [];
      let extra = {};
      extra.target = this.game.player;
      extra.receiver = 1;
      this.game.turn = [];

      //
      // if everyone is done, go back to player 1
      //
      if (this.game.player == this.game.opponents.length + 1) {
        extra.target = this.returnNextPlayer(this.game.player);
      }

      this.sendMessage("game", extra);

    }
  }
}











/////////////////////////
// Game Initialization //
/////////////////////////
Game.prototype.initialize = function initialize(app) {

  if (app.BROWSER == 0) { return; }
  if (this.browser_active == 0) { return; }

  //
  // screen ratio
  //
  let gameheight = $('.gameboard').height();
  let gamewidth = $('.gameboard').width();
  this.screenRatio = gamewidth / this.gameboardWidth;

  this.loadGame();

  //
  // dice initialization
  //
  if (this.game.dice == "") {
    this.game.dice = app.crypto.hash(this.game.id);
  }

  this.initializeGameFeeder(this.game.id);


  //
  // requires game moves to be decrypted, but... yeah
  //
  for (let i = 0; i < this.app.wallet.wallet.pending.length; i++) {
    let tmptx = new saito.transaction(this.app.wallet.wallet.pending[i]);
    let txmsg = tmptx.returnMessage();
    let game_self  = app.modules.returnModule(txmsg.module);
    if (game_self == this) {
      this.updateStatus("Rebroadcasting our last move to be sure opponent receives it. Please wait for your opponent to move.");
      this.updateLog("we just rebroadcast our last move to be sure opponent receives it. please wait for your opponent to move.");
    }
  }
}


Game.prototype.scale = function scale(x) {
  let y = Math.floor(this.screenRatio * x);
  return y;
}









///////////////////////////
// Sending and Receiving //
///////////////////////////
Game.prototype.sendMessage = function sendMessage(type = "game", extra = {}, mycallback = null) {

console.log("\n\nIN SEND MESSAGE IN GAME FUNCTION!");

  var game_self = this;

  if (this.game.opponents == undefined) {
    //alert("ERROR: bug? no opponents found for this game.");
    return;
  }
  if (this.game.opponents.length < 1) {
    //alert("ERROR: bug? no opponents found for this game.");
    return;
  }


  let mymsg = {};

  var ns = {};
  ns.game = this.game.step.game;
  ns.deck = this.game.step.deck;
  ns.deal = this.game.step.deal;

  if (type == "game") {
    ns.game++;
    mymsg.request = "game";
  }
  if (type == "deck") {
    ns.deck++;
    mymsg.request = "deck";
  }
  if (type == "deal") {
    ns.deal++;
    mymsg.request = "deal";
  }

  mymsg.turn = this.game.turn;
  mymsg.module = this.name;
  mymsg.game_id = this.game.id;
  mymsg.player = this.game.player;
  mymsg.step = ns;
  mymsg.step2 = this.game.step;
  mymsg.extra = extra;

  //
  // two player games can go off-chain by default
  // if there are private proxy channels with mod-proxy
  //
  let use_offchain = 0;
  if (this.game.opponents.length == 1) {
    if (this.app.network.canSendOffChainMessage(this.game.opponents[0]) == 1) {
console.log("\n\n\nWE CAN SEND AN OFFCHAIN MESSAGE\n\n");
      use_offchain = 1;
    }
  }


  //
  // start the timer that will monitor disconnection
  //
  clearInterval(game_self.connection_monitor_timer);
  game_self.connection_monitor_timer = setInterval( () => {

      // clear timer to avoid disconnection message
      game_self.flagConnectionUnstable();      
      clearInterval(game_self.connection_monitor_timer);

  }, game_self.connection_monitor_speed);



  if (use_offchain == 1 && this.offchain == 1) {

    setTimeout(() => {
      game_self.app.network.sendOffChainMessageWithCallback(game_self.game.opponents[0], mymsg, function() {

	// clear timer to avoid disconnection message
	game_self.flagConnectionStable();
        clearInterval(game_self.connection_monitor_timer);

      });

      var newtx = game_self.app.wallet.createUnsignedTransaction(game_self.app.wallet.returnPublicKey(), 0.0, 0.0);
      for (let i = 0; i < game_self.game.opponents.length; i++) { newtx.transaction.to.push(new saito.slip(game_self.game.opponents[i], 0.0)); }
      if (newtx == null) { alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?"); return; }
      newtx.transaction.msg = mymsg;
      newtx = game_self.app.wallet.signTransaction(newtx);

      //
      // run callback before we process this next message
      //
      game_self.saveGame(game_self.game.id);
      if (mycallback != null) { 
	mycallback();
      }
      game_self.onConfirmation(null, newtx, 0, game_self.app);

    }, 3000);


  } else {

    //var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.game.opponents[0], 0.0);
    var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.app.wallet.returnPublicKey(), 0.0);
    for (let i = 0; i < this.game.opponents.length; i++) {
      newtx.transaction.to.push(new saito.slip(this.game.opponents[i], 0.0));
    }
    if (newtx == null) {
      alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
      return;
    }
    newtx.transaction.msg = mymsg;
    newtx = this.app.wallet.signTransaction(newtx);

    //
    // add to pending queue in wallet
    //
    game_self.app.wallet.wallet.pending.push(JSON.stringify(newtx.transaction));
    game_self.saveGame(game_self.game.id);

    game_self.app.network.propagateTransactionWithCallback(newtx, function (errobj) {

      if (errobj != undefined) {
        console.log("ERROBJ: " + JSON.stringify(errobj));
        if (errobj.length > 2) {
          if (errobj.length > 2) {
  	    let obj = JSON.parse(errobj);
	    if (obj.err != "") {
	      console.log("Broadcasting Status Uncertain!");
	      return;
	    }
          }
        }
      }

      // clear timer to avoid disconnection message
      game_self.flagConnectionStable();
      clearInterval(game_self.connection_monitor_timer);

      if (mycallback != null) { mycallback(); }
    });

  }
}









////////////////////////
// Saving and Loading //
////////////////////////
Game.prototype.loadGame = function loadGame(game_id = null) {

  if (this.app.options.games == undefined) { this.app.options.games = []; }

  //
  // load most recent game
  //
  // when we click on a link in our email client, we update the TS
  // of the game we wish to open, so that when the client loads we
  // can load that particular game. This permits multiple games to
  // exist simultaneously.
  //
  if (game_id == null) {

    let game_to_open = 0;

    for (let i = 0; i < this.app.options.games.length; i++) {
      if (this.app.options.games[i].ts > this.app.options.games[game_to_open].ts) {
        game_to_open = i;
      }
    }

    if (this.app.options.games == undefined) {
      game_id = null;
    } else {
      if (this.app.options.games.length == 0) {
        game_id = null;
      } else {
        game_id = this.app.options.games[game_to_open].id;
      }
    }
  }

  if (game_id != null) {
    for (let i = 0; i < this.app.options.games.length; i++) {
      if (this.app.options.games[i].id == game_id) {
        this.game = JSON.parse(JSON.stringify(this.app.options.games[i]));
        return this.game;
      }
    }
  }

  this.game = this.newGame(game_id);
  return this.game;

}
Game.prototype.newGame = function newGame(game_id = null) {

  if (game_id == null) { game_id = Math.random().toString(); }

  let game = {};
      game.id           = game_id;
      game.player       = 1;
      game.target       = 1;
      game.initializing = 1;
      game.accept       = 0;
      game.over         = 0;
      game.winner       = 0;
      game.module       = "";
      game.ts           = new Date().getTime();

      game.step         = {};
      game.step.game    = 0;
      game.step.deck    = 0;
      game.step.deal    = 0;

      game.queue        = [];
      game.turn         = [];
      game.opponents    = [];
      game.hand         = [];

      game.status       = ""; // status message
      game.log          = [];

      game.dice         = "";
      game.cards        = {};

      game.deck         = {};
      game.deck.cards   = [];
      game.deck.keys    = [];
      game.deck.xor     = "";

      game.bk_cards     = {};
      game.bk_deck      = {};

  return game;

}
Game.prototype.saveGame = function saveGame(game_id = null) {

  if (this.app.options.games == undefined) { this.app.options.games = []; }

  if (game_id != null) {
    for (let i = 0; i < this.app.options.games.length; i++) {
      if (this.app.options.games[i].id == game_id) {
        this.app.options.games[i] = JSON.parse(JSON.stringify(this.game));
        this.app.storage.saveOptions();
        return;
      }
    }
  }

  this.game = this.newGame(game_id);
  this.app.options.games.push(this.game);
  this.app.storage.saveOptions();
  return;

}










///////////////
// Callbacks //
///////////////
//
// These function should be extended by the game module. They are essentially
// dummy functions to which control is passed at various points in order to
// ensure that the upper-level game modules can execute their own mechanisms.
//
Game.prototype.isValidTurn = function isValidTurn(msg) {
  return 1;
}
Game.prototype.initializeGame = function initializeGame(game_id) {
  this.loadGame(game_id);
}
//
// returns 1 if initialization is run
//
Game.prototype.initializeGameFeeder = function initializeGameFeeder(game_id) {
  if (this.initialize_game_run == 1) { return 0; } else { this.initialize_game_run = 1; }
  this.initializeGame(game_id);
  return 1;
}
Game.prototype.updateBoard = function updateBoard(move) {
  console.log("MOVE: " + move.move);
  console.log("RAND: " + move.rand);
}
















///////////
// Email //
///////////
//
// These functions handle integration with the default Saito email client.
// They provide a generic way for users to send invitations to other users
// over the email network, as well as to accept games and begin them.
//
Game.prototype.displayEmailForm = function displayEmailForm(app) {
  element_to_edit = $('#module_editable_space');
  element_to_edit_html = '<div id="module_instructions" class="module_instructions">Invite the recipient to play a game of ' + this.emailAppName + '.</div>';
  element_to_edit.html(element_to_edit_html);
}
Game.prototype.formatEmailTransaction = function formatEmailTransaction(tx, app) {
  tx.transaction.msg.module = this.name;
  tx.transaction.msg.request = "invite";
  tx.transaction.msg.secret = app.wallet.returnPublicKey();
  return tx;
};
Game.prototype.attachEmailEvents = function attachEmailEvents(app) {

  var game_self = this;
  var email_self = app.modules.returnModule("Email");

  if (app.BROWSER == 1) {

    $('.accept_invite').off();
    $('.accept_invite').on('click', function () {

      let tmpid = $(this).attr('id');
      let tmpar = tmpid.split("_");

      let game_id = tmpar[0];
      let game_module = tmpar[1];

      let remote_address  = $('.lightbox_message_from_address').text();
      tmpar = remote_address.split("_");
      for (let z = 0; z < tmpar.length; z++) { tmpar[z] = tmpar[z].trim(); }

      game_self = app.modules.returnModule(game_module);

      game_self.saveGame(game_id);
      for (let i = 0; i < tmpar.length; i++) {
        game_self.addOpponent(tmpar[i]);
      }
      game_self.game.player = 2;
      game_self.game.module = game_module;
      game_self.saveGame(game_id);

      //
      // send official message accepting
      //
      var newtx = app.wallet.createUnsignedTransactionWithDefaultFee(tmpar[0], 0.0);
      for (let i = 1; i < tmpar.length; i++) {
        newtx.transaction.to.push(new saito.slip(tmpar[i], 0.0));
      }
      if (newtx == null) {
        alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
        return;
      }

      newtx.transaction.msg.module   = game_self.game.module;
      newtx.transaction.msg.game_id  = game_self.game.id;
      newtx.transaction.msg.secret   = game_self.game.secret;
      newtx.transaction.msg.request  = "accept";
      newtx = app.wallet.signTransaction(newtx);
      app.network.propagateTransaction(newtx);

      email_self.showBrowserAlert("You have accepted the game invitation");
      email_self.closeMessage();

    });

    $('.open_game').off();
    $('.open_game').on('click', function () {

      let tmpid = $(this).attr('id');
      let tmpar = tmpid.split("_");
      let game_id = tmpar[0];
      let game_module = tmpar[1];
      this.game = game_self.loadGame(game_id);
      this.game.ts = new Date().getTime();
      this.game.module = game_module;
      game_self.saveGame(game_id);
      window.location = '/' + game_module.toLowerCase();

    });
  }
}
Game.prototype.addOpponent = function addOpponent(address) {
console.log("ADDING " + address);
  if (address == this.app.wallet.returnPublicKey()) { return; }
  if (this.game.opponents == undefined) { this.game.opponents = []; }
  if (this.game.accepted == undefined) { this.game.accepted = []; }
  for (let i = 0; i < this.game.opponents.length; i++) {
    if (this.game.opponents[i] == address) { return; }
  }
  this.game.opponents.push(address);
  this.game.accepted.push(0);
console.log("ADDIN2 " + JSON.stringify(this.game.opponents));
}
Game.prototype.acceptGame = function acceptGame(address) {
  if (this.game.opponents == undefined) { this.game.opponents = []; }
  if (this.game.accepted == undefined) { this.game.accepted = []; }
  for (let i = 0; i < this.game.opponents.length; i++) {
    if (this.game.opponents[i] == address) { this.game.accepted[i] = 1; }
  }
  return;
}




///////////////////////
// Utility Functions //
///////////////////////
/**
 * Fisher–Yates shuffle algorithm:
 *
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 *
 */
Game.prototype.shuffleArray = function shuffleArray(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
Game.prototype.returnNextPlayer = function returnNextPlayer(num) {
  let p = parseInt(num) + 1;
console.log("SELECTION: " + this.game.opponents.length + " is length and p is " + p);
  if (p > (this.game.opponents.length + 1)) { return 1; }
console.log("SELECTION 2: " + this.game.opponents.length + " is length and p is " + p);
  return p;
}
Game.prototype.updateStatus = function updateStatus(str) {

  this.game.status = str;
  console.log("STATUS: " + str);
  if (this.app.BROWSER == 1) { $('#status').html(str) }

}
Game.prototype.updateLog = function updateLog(str, length = 10) {

   if (str) {
    this.game.log.unshift(str);
    if (this.game.log.length > length) { this.game.log.splice(length); }
  }

  let html = '';

  for (let i = 0; i < this.game.log.length; i++) {
    if (i > 0) { html += '<br/>'; }
    html += "> " + this.game.log[i];
  }

  console.log("LOG: " + html);
  if (this.app.BROWSER == 1) { $('#log').html(html) }

}



Game.prototype.flagConnectionUnstable = function flagConnectionUnstable() {
  try {
    console.log("Connection Unstable...");
    this.updateLog("connection unstable... if the error message persists, reloading your browser will force a reconnect and rebroadcast of your last move.");
    $('.connection_monitor').show();
  } catch (err) {}
}
Game.prototype.flagConnectionStable = function flagConnectionStable() {
  try {
    $('.connection_monitor').hide();
  } catch (err) {}
}



