/**********************************************************************************

 GAME MODULE v.2

 This is a general parent class for modules that wish to implement Game logic. It
 introduces underlying methods for creating games via email invitations, and sending
 and receiving game messages over the Saito network. The module also includes random
 number routines for dice and deck management.

 This module attempts to use peer-to-peer connections with fellow gamers where
 possible in order to avoid the delays associated with on-chain transactions. All
 games should be able to fallback to using on-chain communications however.

 Developers please note that every interaction with a random dice and or processing
 of the deck requires an exchange between machines, so games that do not have more
 than one random dice roll per move and/or do not require constant dealing of cards
 from a deck are easier to implement on a blockchain than those which require
 multiple random moves per turn.

**********************************************************************************/

var saito = require('./../saito');
var ModTemplate = require('./template');
var util = require('util');


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

  this.gameboardWidth = 5100;
  this.screenRatio = 1;

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

    try {

      if (tx.isTo(app.wallet.returnPublicKey()) == 1) {

        let txmsg      = tx.returnMessage();
        let game_self  = app.modules.returnModule(txmsg.module);

        ////////////
        // INVITE //
        ////////////
        if (txmsg.request == "invite") {
          if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {
            let email_self = app.modules.returnModule("Email");
            let game_id    = tx.transaction.from[0].add + tx.transaction.ts + tx.transaction.to[0].add;
            let title      = game_self.emailAppName + " Invitation";
            let data       = 'You have been invited to a game of '+game_self.emailAppName+'. <div class="accept_invite link" id="'+game_id+'_'+txmsg.module+'">click here to accept</div>.';
            email_self.receiveMail(title, data, tx);
          } else {
            let email_self = app.modules.returnModule("Email");
            let title      = game_self.emailAppName + " Invitation Sent";
            let data       = 'You have invited ' + tx.transaction.to[0].add + ' to a game of ' + game_self.emailAppName + '. Please wait for them to initiate the game.';
            email_self.receiveMail(title, data, tx);
          }
          app.storage.saveOptions();
          return;
        }


        ////////////
        // ACCEPT //
        ////////////
        if (txmsg.request == "accept") {
          let title = game_self.emailAppName + " Accepted";
          game_id = txmsg.game_id;
          game_self.game = game_self.loadGame(game_id);
          if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {
            game_self.game.player = 1;
            if (game_self.app.network.isConnected() == 1) {
              game_self.saveGame(game_id);
            }
          }
          for (let i = 0; i < tx.transaction.to.length; i++) { game_self.addOpponent(tx.transaction.to[i].add); }
          game_self.game.module = txmsg.module;
          game_self.saveGame(game_id);
          game_self.initializeGame(game_id);
          let data = 'Your game of ' + game_self.emailAppName + ' is initializing. During this time -- until you have been notified that the game is ready to play -- please do not close your browser.';
          let email_self = app.modules.returnModule("Email");
          email_self.receiveMail(title, data, tx);

console.log("NOT RETURNING!");
	  //
	  // do not return, go immediately into queue processing
	  //
          //return;
        }


console.log("\n\n\n\nGAME PORTION: ");

	//
	// at this point, we check to make sure
	// that this is not a game move that we 
	// have already dealt with
	//
	if (txmsg.step == undefined) { txmsg.step = {}; }
        if (txmsg.step.game != undefined) {
          if (txmsg.step.game <= game_self.game.step.game) {
console.log("already processed: " + txmsg.step.game + " -- " +game_self.game.step.game);
            return;
          }
        } else {
	  txmsg.step.game = 0;
	}
        if (txmsg.extra != undefined) {
          if (txmsg.extra.target != undefined) {
            game_self.game.target = txmsg.extra.target;
          }
        } else { txmsg.extra = {}; }
	if (txmsg.turn == undefined) { txmsg.turn = []; }
        game_self.game.step.game = txmsg.step.game;

console.log("\n\n\n\nNEW MOVE: " + txmsg.step.game);


        ///////////
        // QUEUE //
        ///////////
        if (game_self.game.queue != undefined) {

console.log("HERE WE ARE WITH A DEFINED QUEUE!");
console.log("QUEUE: " + JSON.stringify(game_self.game.queue));

          for (let i = 0; i < txmsg.turn.length; i++) { game_self.game.queue.push(txmsg.turn[i]); }

          let cont = 1;

          if (game_self.game.queue.length > 0) {
          while (game_self.game.queue.length > 0 && cont == 1) {

console.log("GAME2: " + JSON.stringify(game_self.game.queue));

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
	    if (gmv[0] == "RESOLVE") {
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



	    if (gmv[0] == "RESOLVEDEAL") {

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



	    if (gmv[0] == "DEAL") {
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



	    if (gmv[0] == "REQUESTKEYS") {

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



	    if (gmv[0] == "ISSUEKEYS") {

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
	    // DECKCREATE [array of cards]
	    //
	    if (gmv[0] == "DECKBACKUP") {

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



	    if (gmv[0] == "DECKRESTORE") {

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

	    



	    if (gmv[0] == "CARDS") {

console.log(" ... entered CARDS");

              game_self.game.queue.splice(gqe, 1);

	      for (let i = 0; i < gmv[1]; i++) {
console.log("IMPORTING CARDS FROM STACK: " + game_self.game.queue[gqe-1-i] + " copied into deck cards array element " + (gmv[1]-1-i));
	        game_self.game.deck.cards[(gmv[1]-1-i)] = game_self.game.queue[gqe-1-i];
                game_self.game.queue.splice(gqe-1-i, 1);
	      }

console.log("STACK WHEN DONE UPDATING DECK CARDS: " + JSON.stringify(game_self.game.queue));

	    }


	    
	    if (gmv[0] == "DECKCREATE") {

console.log(" ... entered DECKCREATE");

	      let cards = JSON.parse(gmv[1]);
              game_self.updateStatus("creating deck by importing specified cards...");
    	      game_self.game.cards = cards;
console.log("game deck cards 1 --> " + JSON.stringify(game_self.game.deck.cards));
    	      let a = 0; for (var i in game_self.game.cards) { game_self.game.deck.cards[a] = game_self.app.crypto.stringToHex(i); a++; }

console.log("game deck cards 2 --> " + JSON.stringify(game_self.game.deck.cards));

	    }

	    

	    if (gmv[0] == "DECKXOR") {

console.log(" ... entered DECKXOR");

    	      if (game_self.game.player == gmv[1]) {

		//
		// cards should be contained in the message object
		// if they are not we are the first to run and should
		// recreate our associative array
		//
                cards = [];
                for (let i = 0; i < game_self.game.deck.cards.length; i++) { cards[i] = game_self.game.deck.cards[i]; };
		if (msg.extra != undefined) { 
		  if (msg.extra.cards != undefined) { 
		    console.log("DECKXOR Card import from MSG EXTRA");
		    cards = msg.cards; 
		  }
		}

	        game_self.updateStatus("Encrypting deck for blind card shuffle");

 	        if (game_self.game.deck.xor == "") { game_self.game.deck.xor = game_self.app.crypto.hash(Math.random()); }

	        for (let i = 0; i < cards.length; i++) {
	          game_self.game.deck.cards[i] = game_self.app.crypto.encodeXOR(cards[i], game_self.game.deck.xor);
	          game_self.game.deck.keys[i] = game_self.app.crypto.generateKeys();
	        }
	        
	        //
	        // shuffle the encrypted deck
	        //
	        game_self.game.deck.cards = game_self.shuffleArray(game_self.game.deck.cards);

	        game_self.game.turn = [];
		game_self.game.turn.push("RESOLVE");
	        for (let i = 0; i < game_self.game.deck.cards.length; i++) {
	          game_self.game.turn.push(game_self.game.deck.cards[i]);
	        }
		game_self.game.turn.push("CARDS\t"+game_self.game.deck.cards.length);

	        let extra = {};
	        extra.cards = JSON.stringify(game_self.game.deck.cards);
	        game_self.sendMessage("game", extra);

	      }

	      cont = 0;

	    }

	    









	    //
	    // if we hit this point, kick our
	    // commands into the module and 
	    // let it tell us whether we 
	    // continue.
	    //
console.log("cont1: " + cont);
	    cont = game_self.handleGame(msg);
console.log("cont2: " + cont);

	    //
	    // break if requested
 	    //
	    if (cont == 0) {
	      game_self.saveGame(game_self.game.id);
	      return;
	    }
          }
          } else {
	    return game_self.handleGame(msg);
	  }
        }
      }
    } catch (err) {
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
  if (mycallback != null) { mycallback(a + 1); } else { return a + 1; }
}
Game.prototype.initializeDice = function initializeDice() {
  if (this.game.dice == "") { this.game.dice = this.app.crypto.hash(this.game.id); }
}



/////////////////////
// Game Management //
/////////////////////
Game.prototype.handleGame = function handleGame(msg) {
  console.log("GAME HANDLE GAME FUNCTION - this should be overridden by your game");
}





Game.prototype.handleDeck = function handleDeck(msg, mycallback = null) {

  let cards = msg.turn;
  let target = msg.extra.target;
  let lower_limit = 0;
  let upper_limit = 0;

  //
  // everyone starts with the same deck
  //
  if (this.game.step.deck == 0) {

    console.log("initializing as DECK is at step 0");

    ////////////
    // backup //
    ////////////
    this.old_deck = {};
    this.old_cards = [];
    this.old_keys = [];

    for (let i = 0; i < this.game.deck.cards.length; i++) {
      this.old_cards[i] = this.game.deck.cards[i];
      this.old_keys[i] = this.game.deck.keys[i];
    }
    for (var i in this.game.cards) {
      this.old_deck[i] = this.game.cards[i];
    }

    /////////////////////////
    // generating new deck //
    /////////////////////////
    this.updateStatus("initializing encryption keys for generating deck...");

    this.game.cards = cards;
    let a = 0; for (var i in this.game.cards) { this.game.deck.cards[a] = this.app.crypto.stringToHex(i); a++; }

    //
    // copy back so associative array is proper array for part II
    //
    cards = [];
    for (let i = 0; i < this.game.deck.cards.length; i++) { cards[i] = this.game.deck.cards[i]; };
    this.game.step.deck = 1;

  }

  //
  //
  // initial XOR
  //
  // every player needs to process the initial deck XOR and encryption process
  //
  lower_limit = 1;
  upper_limit = 1 + (this.game.opponents.length + 1) * 1;
  if (this.game.step.deck >= lower_limit && this.game.step.deck < upper_limit) {
    if (this.game.player == msg.extra.target) {

      console.log("DECK is at STEP " + this.game.step.deck + " ---- " + msg.extra.target + " (initial XOR)");

      this.updateStatus("encrypting deck and sending to peers");

      if (this.game.deck.xor == "") { this.game.deck.xor = this.app.crypto.hash(Math.random()); }

      for (let i = 0; i < cards.length; i++) {
        this.game.deck.cards[i] = this.app.crypto.encodeXOR(cards[i], this.game.deck.xor);
        this.game.deck.keys[i] = this.app.crypto.generateKeys();
      }

      //
      // shuffle the encrypted deck
      //
      this.game.deck.cards = this.shuffleArray(this.game.deck.cards);

      this.game.turn = [];
      for (let i = 0; i < this.game.deck.cards.length; i++) {
        this.game.turn[i] = this.game.deck.cards[i];
      }

      let extra = {};
      extra.target = this.returnNextPlayer(this.game.player);
      extra.description = "sending card in initial XOR by player " + this.game.player;
      this.sendMessage("deck", extra);

    }
    return;
  }


  //
  // remove XOR and encrypt with private keys
  //
  lower_limit = 1 + (this.game.opponents.length + 1);
  upper_limit = 1 + (this.game.opponents.length + 1) * 2;
  if (this.game.step.deck >= lower_limit && this.game.step.deck < upper_limit) {
    if (this.game.player == msg.extra.target) {

      console.log("DECK is at STEP " + this.game.step.deck + " ---- " + msg.extra.target + " (remove XOR and encrypt)");

      this.updateStatus("finishing deck encryption and setup....");

      for (let i = 0; i < cards.length; i++) {
        this.game.deck.cards[i] = this.app.crypto.decodeXOR(cards[i], this.game.deck.xor);
        this.game.deck.cards[i] = this.app.crypto.encodeXOR(this.game.deck.cards[i], this.game.deck.keys[i]);
      }

      this.game.turn = [];
      for (let i = 0; i < this.game.deck.cards.length; i++) {
        this.game.turn[i] = this.game.deck.cards[i];
      }
      let extra = {};
      extra.target = this.returnNextPlayer(this.game.player);
      extra.description = "Player " + this.game.player + " is sending their encrypted cards in remove XOR!";
      this.sendMessage("deck", extra);


      if (msg.extra.target == this.game.opponents.length + 1 && this.game.player == this.game.opponents.length + 1) {

        /////////////
        // restore //
        /////////////
        for (let i = this.old_cards.length - 1; i >= 0; i--) {
          this.game.deck.cards.unshift(this.old_cards[i]);
          this.game.deck.keys.unshift(this.old_keys[i]);
        }
        for (var b in this.old_deck) {
          this.game.cards[b] = this.old_deck[b];
        }
        this.old_deck = {};
        this.old_cards = [];
        this.old_keys = [];

      }
    }
    return;
  }


  //
  // player1 signs first, so if we reach here, we need to
  // update player1's deck to include the cards sent from
  // player2.
  //
  // only do this when we have been set as the target, to
  // avoid our sending this message while other players are
  // still responding.
  //
  lower_limit = 1 + (this.game.opponents.length + 1) * 2;
  upper_limit = 1 + (this.game.opponents.length + 1) * 3;
  if (this.game.step.deck >= lower_limit && this.game.step.deck < upper_limit) {

    if (this.game.player != this.game.opponents.length + 1 && msg.extra.target == 1) {

      for (let i = 0; i < cards.length; i++) {
        this.game.deck.cards[i] = cards[i];
      }


      /////////////
      // restore //
      /////////////
      for (let i = this.old_cards.length - 1; i >= 0; i--) {
        this.game.deck.cards.unshift(this.old_cards[i]);
        this.game.deck.keys.unshift(this.old_keys[i]);
      }
      for (var b in this.old_deck) {
        this.game.cards[b] = this.old_deck[b];
      }
      this.old_deck = {};
      this.old_cards = [];
      this.old_keys = [];

      //
      // let all players run player1 continues the game after every shuffle
      //
      msg.turn = [];
      let extra = {};
      extra.target = 1;
      extra.receiver = 1;
      this.game.turn = [];

      this.sendMessage("game", extra);

    }
  }
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

      console.log("Player " + this.game.player + " is sending keys to " + receiver);

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

      console.log("Player " + this.game.player + " received cards and decrypting");

      for (let i = 0; i < keys.length; i++) {
        this.game.deck.cards[i] = this.app.crypto.decodeXOR(newcard, this.game.deck.keys[i]);
      }

    } else {

      console.log("Player " + this.game.player + " received ALL cards and decrypting himself");

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

  this.initializeGame(this.game.id);

}
Game.prototype.scale = function scale(x) {
  let y = Math.floor(this.screenRatio * x);
  return y + 'px';
}









///////////////////////////
// Sending and Receiving //
///////////////////////////
Game.prototype.sendMessage = function sendMessage(type = "game", extra = {}, mycallback = null) {

  var twilight_self = this;

  if (this.game.opponents == undefined) {
    //alert("ERROR: bug? no opponents found for this game.");
    return;
  }
  if (this.game.opponents.length < 1) {
    //alert("ERROR: bug? no opponents found for this game.");
    return;
  }


  var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.game.opponents[0], 0.0);
  for (let i = 0; i < this.game.opponents.length; i++) {
    newtx.transaction.to.push(new saito.slip(this.game.opponents[i], 0.0));
  }
  if (newtx == null) {
    alert("ERROR: bug? unable to make move. Do you have enough SAITO tokens?");
    return;
  }


  var ns = {};
  ns.game = this.game.step.game;
  ns.deck = this.game.step.deck;
  ns.deal = this.game.step.deal;

  if (type == "game") {
    ns.game++;
    newtx.transaction.msg.request = "game";
  }
  if (type == "deck") {
    ns.deck++;
    newtx.transaction.msg.request = "deck";
  }
  if (type == "deal") {
    ns.deal++;
    newtx.transaction.msg.request = "deal";
  }

  newtx.transaction.msg.turn = this.game.turn;
  newtx.transaction.msg.module = this.name;
  newtx.transaction.msg.game_id = this.game.id;
  newtx.transaction.msg.player = this.game.player;
  newtx.transaction.msg.step = ns;
  newtx.transaction.msg.step2 = this.game.step;
  newtx.transaction.msg.extra = extra;

  newtx = this.app.wallet.signTransaction(newtx);

  this.app.network.propagateTransactionWithCallback(newtx, function () {

    // callback might be an error if not broadcast
    // but for now save anyway
    //

    //
    // save game
    //
    if (twilight_self.app.network.isConnected() == 1) {
      twilight_self.saveGame(twilight_self.game.id);
    }

    if (mycallback != null) { mycallback(); }
  });

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
console.log("\nIN THE WRONG INITIALIZE GAME!");
  this.loadGame(game_id);
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

      game_self = app.modules.returnModule(game_module);

      game_self.saveGame(game_id);
      game_self.addOpponent(remote_address);
      game_self.game.player = 2;
      game_self.game.module = game_module;
      game_self.saveGame(game_id);

      //
      // send official message accepting
      //
      var newtx = app.wallet.createUnsignedTransactionWithDefaultFee(game_self.game.opponents[0], 0.0);

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
  if (address == this.app.wallet.returnPublicKey()) { return; }
  if (this.game.opponents == undefined) { this.game.opponents = []; }
  for (let i = 0; i < this.game.opponents.length; i++) {
    if (this.game.opponents[i] == address) { return; }
  }
  this.game.opponents.push(address);
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
  let p = num + 1;
  if (p > this.game.opponents.length + 1) { return 1; }
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







