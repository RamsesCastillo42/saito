/**********************************************************************************

 GAME MODULE
 
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

  this.app             = app;

  this.name            = "Game";
  this.browser_active  = 0;
  this.emailAppName    = "Game";

  this.gameboardWidth  = 5100;
  this.screenRatio     = 1;

  this.game            = {};

  this.old_deck        = {};
  this.old_cards       = [];
  this.old_keys        = [];

  return this;

}
module.exports = Game;
util.inherits(Game, ModTemplate);



////////////////////
// onConfirmation //
////////////////////
Game.prototype.handleOnConfirmation = function handleOnConfirmation(blk, tx, conf, app) {

  //
  // only browsers deal with this mess of code
  //
  if (this.app.BROWSER == 0) { return; }

console.log("\n\nHANDLE ON CONFIRMATION");

  let txmsg = tx.returnMessage();
  let email_self = app.modules.returnModule("Email");
  let remote_address = tx.transaction.from[0].add;;
  let game_id = tx.transaction.from[0].add + tx.transaction.ts + tx.transaction.to[0].add;

  if (conf == 0) {

    if (txmsg.request == "invite") {
      if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {
        let title = this.emailAppName + " Invitation";
        let data  = 'You have been invited to a game of '+this.emailAppName+'. <div class="accept_invite link" id="'+game_id+'">click here to accept</div>.';
        email_self.receiveMail(title, data, tx);    
      } else {
        let title = this.emailAppName + " Invitation Sent";
        let data  = 'You have invited ' + tx.transaction.to[0].add + ' to a game of '+this.emailAppName+'. Please wait for them to initiate the game.';
        email_self.receiveMail(title, data, tx);    
      }
      app.storage.saveOptions();
      return;
    }

    if (txmsg.request == "accept") {
      let title = this.emailAppName + " Accepted";
      game_id = txmsg.game_id;
      this.game = this.loadGame(game_id);
      if (tx.transaction.to[0].add == app.wallet.returnPublicKey()) {
        this.game.player = 1;
	if (this.app.network.isConnected() == 1) {
          this.saveGame(game_id);
	}
      }
      for (let i = 0; i < tx.transaction.to.length; i++) { this.addOpponent(tx.transaction.to[i].add); }
      if (this.app.network.isConnected() == 1) {
        this.saveGame(game_id);
      }
      this.initializeGame(game_id);
      let data  = 'Your game of ' + this.emailAppName + ' is ready to begin.<p></p><div id="'+game_id+'" class="open_game link">Click here to open or continue this game.</div>';
      email_self.receiveMail(title, data, tx);
      app.storage.saveOptions();
      return;
    }

    //
    // all of the following actions are stepwise
    //
    if (txmsg.step == undefined) { return; }
    if (this.game == undefined) { this.loadGame(game_id); }
    if (this.game.step == undefined) { this.loadGame(game_id); }


    if (txmsg.request == "game") { if (txmsg.step.game != undefined) { if (txmsg.step.game <= this.game.step.game) { 
console.log("\n\nRECEIVED: " + txmsg.step.game + " -- " + this.game.step.game);
return;
     } }
      if (txmsg.extra != undefined) {
	if (txmsg.extra.target != undefined) {
	  this.game.target = txmsg.extra.target;
	}
      }
      this.game.step.game = txmsg.step.game;
console.log("MOVING INTO HANDLE GAME");
      this.handleGame(txmsg);
      return;
    }

    if (txmsg.request == "deck") {
      if (txmsg.step.deck != undefined) { if (txmsg.step.deck <= this.game.step.deck) { return; } }
      if (txmsg.extra != undefined) {
	if (txmsg.extra.target != undefined) {
	  this.game.target = txmsg.extra.target;
	}
      }
      this.game.step.deck = txmsg.step.deck;
console.log("MOVING INTO HANDLE DECK");
      this.handleDeck(txmsg);
      return;
    }

    if (txmsg.request == "deal") {
      if (txmsg.step.deal != undefined) { if (txmsg.step.deal <= this.game.step.deal) { return; } }
      if (txmsg.extra != undefined) {
	if (txmsg.extra.target != undefined) {
	  this.game.target = txmsg.extra.target;
	}
      }
      this.game.step.deal = txmsg.step.deal;
      this.handleDeal(txmsg);
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
Game.prototype.rollDice = function rollDice(sides=6, mycallback=null) {
  this.game.dice = this.app.crypto.hash(this.game.dice);
  let a = parseInt(this.game.dice.slice(0,12), 16)%sides;
  if (mycallback != null) { mycallback(a + 1); } else { return a+1; }
}
Game.prototype.initializeDice = function initializeDice() {
  if (this.game.dice == "") { this.game.dice = this.app.crypto.hash(this.game.id); }
}



/////////////////////
// Game Management //
/////////////////////
Game.prototype.handleGame = function handleGame(msg, mycallback=null) {

  this.loadGame(msg.game_id);

  if (this.game.dice == "") { this.initializeDice(); }

}









Game.prototype.handleDeck = function handleDeck(msg, mycallback=null) {

  let cards  = msg.turn;
  let target = msg.extra.target;

  //
  // add cards to deck
  //
  if (this.game.step.deck_generated == 0) {

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
    for (let i = 0; i < this.game.deck.cards.length; i++) {
      cards[i] = this.game.deck.cards[i];
    };
    this.game.step.deck_generated = 1;
  }


  //
  // initial XOR
  //
  // TODO - replace with a more secure commutative algorithm
  //
  if (this.game.step.deck_passone == 0) {
    if (this.game.player == msg.extra.target) {

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

      this.game.step.deck_passone = 1;

      this.sendMessage("deck", extra);

    }
    return;
  }


  //
  // remove XOR and encrypt with private keys
  //
  if (this.game.step.deck_passtwo == 0) {
    if (this.game.player == msg.extra.target) {

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

      this.game.step.deck_passtwo = 1;

      this.sendMessage("deck", extra);


      if (msg.extra.target == 2 && this.game.player == 2) {

        /////////////
        // restore //
        /////////////
        for (let i = this.old_cards.length-1; i >= 0; i--) {
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
  if (this.game.step.deck_passtwo == 1) {

    if (this.game.player == 1 && target == 1) {

      for (let i = 0; i < cards.length; i++) {
        this.game.deck.cards[i] = cards[i];
      }


      /////////////
      // restore //
      /////////////
      for (let i = this.old_cards.length-1; i >= 0; i--) {
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

Game.prototype.initializeDeck = function initializeDeck(cards=null) {

  this.updateStatus("shuffling our deck of cards...");

  let msg              = {};
      msg.extra        = {};
      msg.extra.target = 1;
      msg.turn         = [];

  if (cards != null) { msg.turn = cards; }

  this.handleDeck(msg);

}






/////////////////////
// Deal Management //
/////////////////////
Game.prototype.handleDeal = function handleDeal(msg) {

  let target   = msg.extra.target;    // whose turn
  let receiver = msg.extra.receiver;  // who gets cards
  let num      = msg.extra.cards;     // how many cards
  let keys     = msg.turn;

  //
  // no keys? I'm either originating this or getting a request for my keys
  //
  if (this.game.player != receiver) {

console.log("SENDING KEYS TO " + receiver);

    //
    // they want my keys
    //
    if (keys.length == 0) {

      this.game.turn = [];
      for (let i = 0; i < num; i++) {
        this.game.turn[i] = this.game.deck.keys[i];
      }

      this.game.deck.keys = this.game.deck.keys.splice(num, this.game.deck.keys.length-num);
      this.game.deck.cards = this.game.deck.cards.splice(num, this.game.deck.cards.length-num);

      this.sendMessage("deal", msg.extra);

    } else {

      //
      // send back to deal
      //
      // go back to game logic, whoever was specified as
      // the card receiver should continue on from here
      //
      // this only works with a two player game, as otherwise
      // we will trigger this request after every key is sent
      // whereas we only want them when ALL keys are sent.
      //
      msg.extra.target = receiver;
      this.game.turn = [];
      msg.turn = [];

      //this.saveGame(this.game.id);
      this.handleGame(msg);

    }
  } else {

    //
    // they sent me their keys
    //
    if (keys.length > 0) {

      for (let i = 0; i < keys.length; i++) {
        let newcard = this.game.deck.cards[i];
        newcard = this.app.crypto.decodeXOR(newcard, this.game.deck.keys[i]);
        newcard = this.app.crypto.decodeXOR(newcard, keys[i]);
        newcard = this.app.crypto.hexToString(newcard);
        this.game.hand.push(newcard);
      }

      this.game.deck.keys = this.game.deck.keys.splice(num, this.game.deck.keys.length-num);
      this.game.deck.cards = this.game.deck.cards.splice(num, this.game.deck.cards.length-num);

      //
      // go back to game logic, whoever was specified as
      // the card receiver should continue on from here
      //
      // this only works with a two player game, as otherwise
      // we will trigger this request after every key is sent
      // whereas we only want them when ALL keys are sent.
      //
      msg.extra.target = receiver;
      msg.turn = [];

      this.game.step.deal = msg.step.deal;

      //this.saveGame(this.game.id);
      this.handleGame(msg);

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
  let gamewidth  = $('.gameboard').width();
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
  return y+'px';
}
Game.prototype.start = function start(app) {}








///////////////////////////
// Sending and Receiving //
///////////////////////////
Game.prototype.sendMessage = function sendMessage(type="game", extra={}, mycallback=null) {

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
    newtx.transaction.msg.request  = "game";
  }
  if (type == "deck") { 
    ns.deck++; 
    newtx.transaction.msg.request  = "deck";
  }
  if (type == "deal") { 
    ns.deal++; 
    newtx.transaction.msg.request  = "deal";
  }

  newtx.transaction.msg.turn     = this.game.turn;
  newtx.transaction.msg.module   = this.name;
  newtx.transaction.msg.game_id  = this.game.id;
  newtx.transaction.msg.player   = this.game.player;
  newtx.transaction.msg.step     = ns;
  newtx.transaction.msg.step2    = this.game.step;
  newtx.transaction.msg.extra    = extra;

  newtx = this.app.wallet.signTransaction(newtx);

  this.app.network.propagateTransactionWithCallback(newtx, function() {

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
        this.game = this.app.options.games[i];
        return this.game;
      }
    }
  }

  this.game = this.newGame(game_id);
  return this.game;

}
Game.prototype.newGame = function newGame(game_id=null) {

  if (game_id == null) { game_id = Math.random().toString(); }

  let game = {};
      game.id         = game_id;
      game.player     = 1;
      game.target     = 1;

      game.step       = {};
      game.step.game  = 1;
      game.step.deck  = 1;
      game.step.deck_generated = 0;
      game.step.deck_passone   = 0;
      game.step.deck_passtwo   = 0;
      game.step.deal  = 1;


      game.turn       = [];
      game.opponents  = [];
      game.hand       = [];
      game.dice       = "";
      game.cards      = {};
      game.deck       = {};
      game.deck.cards = [];
      game.deck.keys  = [];
      game.deck.xor   = "";

      game.bk_cards   = {};
      game.bk_deck    = {};

      game.status     = ""; // status message

  return game;

}
Game.prototype.saveGame = function saveGame(game_id = null) {

  if (this.app.options.games == undefined) { this.app.options.games = []; }

  if (game_id != null) {
    for (let i = 0; i < this.app.options.games.length; i++) {
      if (this.app.options.games[i].id == game_id) {
        this.app.options.games[i] = this.game;
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

  alert("Initialize Game... in the Game Module -- you want to redefine this function.");
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
  element_to_edit_html = '<div id="module_instructions" class="module_instructions">Invite the recipient to play a game of '+this.emailAppName+'.</div>';
  element_to_edit.html(element_to_edit_html);
}
Game.prototype.formatEmailTransaction = function formatEmailTransaction(tx, app) {
  tx.transaction.msg.module  = this.name;
  tx.transaction.msg.request = "invite";
  tx.transaction.msg.secret  = app.wallet.returnPublicKey();
  return tx;
};
Game.prototype.attachEmailEvents = function attachEmailEvents(app) {

  var game_self = this;
  var email_self = app.modules.returnModule("Email");

  if (app.BROWSER == 1) {

    $('.accept_invite').off();
    $('.accept_invite').on('click', function() {

      let game_id = $(this).attr('id');
      let remote_address  = $('.lightbox_message_from_address').text();

      game_self.saveGame(game_id);
      game_self.addOpponent(remote_address);
      game_self.game.player = 2;
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

      newtx.transaction.msg.module   = game_self.name;
      newtx.transaction.msg.game_id  = game_self.game.id;
      newtx.transaction.msg.secret   = game_self.game.secret;
      newtx.transaction.msg.request  = "accept";
      newtx = app.wallet.signTransaction(newtx);

      newtx = app.wallet.signTransaction(newtx);
      app.network.propagateTransaction(newtx);

      email_self.showBrowserAlert("You have accepted the game invitation");
      email_self.closeMessage();

    });

    $('.open_game').off();
    $('.open_game').on('click', function() {

      let game_id = $(this).attr('id');
      this.game = game_self.loadGame(game_id);
      this.game.ts = new Date().getTime();
      game_self.saveGame(game_id);
      window.location = '/twilight';

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
  let p = num+1;
  if (p > this.game.opponents.length+1) { return 1; }
  return p;
}
Game.prototype.updateStatus = function updateStatus(str) {

  this.game.status = str;
  console.log("STATUS: " + str);
  if (this.app.BROWSER == 1) { $('#status').html(str) }

}







