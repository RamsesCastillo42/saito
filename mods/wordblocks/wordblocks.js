var saito = require('../../lib/saito/saito');
var Game = require('../../lib/templates/game');
var util = require('util');

//////////////////
// CONSTRUCTOR  //
//////////////////

function Wordblocks(app) {
  if (!(this instanceof Wordblocks)) {
    return new Wordblocks(app);
  }

  Wordblocks.super_.call(this);
  this.app = app;
  this.name = "Wordblocks";
  this.description = `Scrabble is a word game in which two to four players score points by placing tiles bearing a single letter onto a board divided into a 15×15 grid of squares. The tiles must form words that, in crossword fashion, read left to right in rows or downward in columns, and be included in a standard dictionary or lexicon.`;
  this.browser_active = 0;
  this.handlesEmail = 1;
  this.emailAppName = "Wordblocks";
  this.maxPlayers = 4;

  //
  // this sets the ratio used for determining
  // the size of the original pieces
  //

  this.gameboardWidth = 2677;
  this.tileHeight = 163;
  this.tileWidth = 148;
  this.letters = {};
  this.moves = [];
  this.firstmove = 1;
  this_wordblocks = this;
  return this;
}

module.exports = Wordblocks;
util.inherits(Wordblocks, Game);

////////////////
// show tiles //
////////////////

Wordblocks.prototype.showTiles = function showTiles() {
  if (this.game.deck.length == 0) {
    return;
  }

  let html = "";

  for (let i = 0; i < this.game.deck[0].hand.length; i++) {
    html += this.returnTileHTML(this.game.deck[0].cards[this.game.deck[0].hand[i]].name);
  }

  $('.tiles').html(html);
  $('#remainder').html("Tiles left: " + this.game.deck[0].crypt.length);
};

////////////////
// initialize //
////////////////


Wordblocks.prototype.initializeGame = async function initializeGame(game_id) {
  const chat = this.app.modules.returnModule("Chat");
  chat.addPopUpChat();
  this.updateStatus("loading game...");
  this.loadGame(game_id);

  if (this.game.status != "") {
    this.updateStatus(this.game.status);
  }

  //
  // deal cards 
  //

  if (this.game.deck.length == 0 && this.game.step.game == 0) {
    this.updateStatus("Generating the Game");

    if (this.game.opponents.length == 1) {
      this.game.queue.push("EMAIL\tready");
      this.game.queue.push("DEAL\t1\t2\t7");
      this.game.queue.push("DEAL\t1\t1\t7");
      this.game.queue.push("DECKENCRYPT\t1\t2");
      this.game.queue.push("DECKENCRYPT\t1\t1");
      this.game.queue.push("DECKXOR\t1\t2");
      this.game.queue.push("DECKXOR\t1\t1");
    }

    if (this.game.opponents.length == 2) {
      this.game.queue.push("EMAIL\tready");
      this.game.queue.push("DEAL\t1\t3\t7");
      this.game.queue.push("DEAL\t1\t2\t7");
      this.game.queue.push("DEAL\t1\t1\t7");
      this.game.queue.push("DECKENCRYPT\t1\t3");
      this.game.queue.push("DECKENCRYPT\t1\t2");
      this.game.queue.push("DECKENCRYPT\t1\t1");
      this.game.queue.push("DECKXOR\t1\t3");
      this.game.queue.push("DECKXOR\t1\t2");
      this.game.queue.push("DECKXOR\t1\t1");
    }

    if (this.game.opponents.length == 3) {
      this.game.queue.push("EMAIL\tready");
      this.game.queue.push("DEAL\t1\t4\t7");
      this.game.queue.push("DEAL\t1\t3\t7");
      this.game.queue.push("DEAL\t1\t2\t7");
      this.game.queue.push("DEAL\t1\t1\t7");
      this.game.queue.push("DECKENCRYPT\t1\t4");
      this.game.queue.push("DECKENCRYPT\t1\t3");
      this.game.queue.push("DECKENCRYPT\t1\t2");
      this.game.queue.push("DECKENCRYPT\t1\t1");
      this.game.queue.push("DECKXOR\t1\t4");
      this.game.queue.push("DECKXOR\t1\t3");
      this.game.queue.push("DECKXOR\t1\t2");
      this.game.queue.push("DECKXOR\t1\t1");
    }

    this.game.queue.push("DECK\t1\t" + JSON.stringify(this.returnDeck()));
  }

  Wordblocks.prototype.resizeBoard = function resizeBoard() {
    //    $('.gameboard').outerWidth($('.main').outerWidth() - 2);
    //    $('.gameboard').outerHeight($('.main').outerWidth() - 2);
    $('.gameboard').outerWidth("100%");
    $('.gameboard').outerWidth($('.gameboard').outerWidth() - 2);
    $('.gameboard').outerHeight($('.gameboard').outerWidth() - 2);
    $('#controls').outerWidth($('.main').outerWidth() + 6);
    responsive();
  };

  $(window).resize(function () {
    responsive();
  });

  //
  // show tiles
  //

  this.showTiles();

  //
  // initialize scoreboard
  //

  let html = "";
  let am_i_done = 0;
  let players = 1;

  if (this.game.opponents != undefined) {
    players = this.game.opponents.length + 1;
  }

  let score = [];

  if (this.game.score == undefined) {
    this.game.score = [];

    for (let i = 0; i < players; i++) {
      this.game.score[i] = 0;
    }
  }

  for (let i = 0; i < players; i++) {
    let this_player = i + 1;

    if (this.game.player == this_player) {
      html += '<div class="player">Your Score: <span id="score_' + this_player + '">' + this.game.score[i] + '</span></div>';
    } else {
      html += '<div class="player">Player ' + this_player + ': <span id="score_' + this_player + '">' + this.game.score[i] + '</span></div>';
    }
  }

  if (this.browser_active == 1) {
    $('.score').html(html);
  }

  //
  // who can go?
  //


  if (this.game.target == this.game.player) {
    this.updateStatus("YOUR TURN: click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.");
    this.enableEvents();
  } else {
    this.updateStatus("Waiting for Player " + this.game.target + " to move.");
    this.disableEvents();
  }

  //
  // return letters
  //


  this.letters = this.returnLetters();

  //
  // initialize interface
  //

  this.resizeBoard();

  //
  // load any existing tiles
  //

  if (this.game.board == undefined) {
    //
    // new board
    //
    this.game.board = this.returnBoard();
  } else {
    //
    // load board
    //
    for (var i in this.game.board) {
      let divname = "#" + i;
      let letter = this.game.board[i].letter; // $(divname).html(this.returnTile(letter));

      this.addTile($(divname), letter);

      if (!(letter == "_") && !(letter == "")) {
        $(divname).addClass("set");
      }
    }
  }

  //
  // has a move been made
  //


  for (let i = 1; i < 16; i++) {
    for (let k = 1; k < 16; k++) {
      let boardslot = i + "_" + k;

      if (this.game.board[boardslot].letter != "_") {
        this.firstmove = 0;
      }
    }
  } 
  
  //
  // attach events
  //


  if (this.game.target == this.game.player) {
    this.addEventsToBoard();
  }

  $('#shuffle').on('click', function () {
    for (var i = $('#tiles').children.length; i >= 0; i--) {
      $('#tiles')[0].appendChild($('#tiles')[0].childNodes[Math.random() * i | 0]);
    }
  });
  $('#tiles').sortable();
  $(window).resize(function () {
    this_wordblocks.resizeBoard();
  });
};

responsive = function responsive() {
  if (this.window.innerHeight <= $('.gameboard').outerHeight() + $('#controls').outerHeight()) {
    $('#controls').addClass('fixedbottom');
    $('.main').addClass('mainfixedbottom');
  } else {
    $('#controls').removeClass('fixedbottom');
    $('.main').removeClass('mainfixedbottom');
  }
};

/////////////////
// Return Tile //
/////////////////


Wordblocks.prototype.returnTileHTML = function returnTileHTML(letter) {
  let html = "";
  let letterScore = this.returnLetters();

  if (letter == "A") {
    html = '<div class="tile A sc' + letterScore["A"].score + '">A</div>';
  }

  if (letter == "B") {
    html = '<div class="tile B sc' + letterScore["B"].score + '">B</div>';
  }

  if (letter == "C") {
    html = '<div class="tile C sc' + letterScore["C"].score + '">C</div>';
  }

  if (letter == "D") {
    html = '<div class="tile D sc' + letterScore["D"].score + '">D</div>';
  }

  if (letter == "E") {
    html = '<div class="tile E sc' + letterScore["E"].score + '">E</div>';
  }

  if (letter == "F") {
    html = '<div class="tile F sc' + letterScore["F"].score + '">F</div>';
  }

  if (letter == "G") {
    html = '<div class="tile G sc' + letterScore["G"].score + '">G</div>';
  }

  if (letter == "H") {
    html = '<div class="tile H sc' + letterScore["H"].score + '">H</div>';
  }

  if (letter == "I") {
    html = '<div class="tile I sc' + letterScore["I"].score + '">I</div>';
  }

  if (letter == "J") {
    html = '<div class="tile J sc' + letterScore["J"].score + '">J</div>';
  }

  if (letter == "K") {
    html = '<div class="tile K sc' + letterScore["K"].score + '">K</div>';
  }

  if (letter == "L") {
    html = '<div class="tile L sc' + letterScore["L"].score + '">L</div>';
  }

  if (letter == "M") {
    html = '<div class="tile M sc' + letterScore["M"].score + '">M</div>';
  }

  if (letter == "N") {
    html = '<div class="tile N sc' + letterScore["N"].score + '">N</div>';
  }

  if (letter == "O") {
    html = '<div class="tile O sc' + letterScore["O"].score + '">O</div>';
  }

  if (letter == "P") {
    html = '<div class="tile P sc' + letterScore["P"].score + '">P</div>';
  }

  if (letter == "Q") {
    html = '<div class="tile Q sc' + letterScore["Q"].score + '">Q</div>';
  }

  if (letter == "R") {
    html = '<div class="tile R sc' + letterScore["R"].score + '">R</div>';
  }

  if (letter == "S") {
    html = '<div class="tile S sc' + letterScore["S"].score + '">S</div>';
  }

  if (letter == "T") {
    html = '<div class="tile T sc' + letterScore["T"].score + '">T</div>';
  }

  if (letter == "U") {
    html = '<div class="tile U sc' + letterScore["U"].score + '">U</div>';
  }

  if (letter == "V") {
    html = '<div class="tile V sc' + letterScore["V"].score + '">V</div>';
  }

  if (letter == "W") {
    html = '<div class="tile W sc' + letterScore["W"].score + '">W</div>';
  }

  if (letter == "X") {
    html = '<div class="tile X sc' + letterScore["X"].score + '">X</div>';
  }

  if (letter == "Y") {
    html = '<div class="tile Y sc' + letterScore["Y"].score + '">Y</div>';
  }

  if (letter == "Z") {
    html = '<div class="tile Z sc' + letterScore["Z"].score + '">Z</div>';
  }

  return html;
};

Wordblocks.prototype.addTile = function (obj, letter) {
  if (letter !== "_") {
    //obj.css("background-image", "url(wordblocks/img/" + letter.toUpperCase() + ".jpg)");
    obj.addClass("nobefore");
    obj.html(this.returnTileHTML(letter));
  }
};

/////////////////////////
// Add Events to Board //
/////////////////////////


Wordblocks.prototype.disableEvents = function disableEvents() {
  if (this.browser_active == 1) {
    $('.slot').off();
  }
};

Wordblocks.prototype.enableEvents = function enableEvents() {
  if (this.browser_active == 1) {
    this.addEventsToBoard();
  }
};

Wordblocks.prototype.addEventsToBoard = function addEventsToBoard() {
  let wordblocks_self = this;
  $('.tosstiles').off();
  $('.tosstiles').on('click', function () {
    tiles = prompt("Which tiles do you want to discard? Tossed tiles count against your score:");

    if (tiles) {
      alert("Tossed: " + tiles);
      wordblocks_self.removeTilesFromHand(tiles);
      wordblocks_self.addMove("turn\t" + wordblocks_self.game.player);
      let cards_needed = 7;
      cards_needed = cards_needed - wordblocks_self.game.deck[0].hand.length;

      if (cards_needed > wordblocks_self.game.deck[0].crypt.length) {
        cards_needed = wordblocks_self.game.deck[0].crypt.length;
      }

      if (cards_needed > 0) {
        wordblocks_self.addMove("DEAL\t1\t" + wordblocks_self.game.player + "\t" + cards_needed);
      }

      wordblocks_self.showTiles();
      wordblocks_self.endTurn();
    }
  });
  $('.slot').off();
  $('.slot').on('click', function () {
    let divname = $(this).attr("id");
    let html = 'Add a Word:<p></p><ul><li class="card" id="horizontally">horizontally</li><li class="card" id="vertically">vertically</li><li class="card" id="cancel">cancel</li></ul>';
    let tmpx = divname.split("_");
    let y = tmpx[0];
    let x = tmpx[1];
    let orientation = "";
    let word = "";
    $('.status').html(html); //$('.status').show();

    $('.card').off();
    $('.card').on('click', function () {
      let action2 = $(this).attr("id");

      if (action2 == "horizontally") {
        orientation = "horizontal";
      }

      if (action2 == "vertically") {
        orientation = "vertical";
      }

      if (action2 == "cancel") {
        $('.card').off();
        $('.status').html("Your  turn!<p></p><div style=\"font-size:1.0em\">Click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.</div>");
        wordblocks_self.addEventsToBoard();
        return;
      }

      word = prompt("Provide your word:");

      if (word) {
        //
        // reset board
        //
        $('.status').html("Processing your turn."); 
        
        //
        // if entry is valid
        //

        if (wordblocks_self.isEntryValid(word, orientation, x, y) == 1) {
          let myscore = 0;
          wordblocks_self.addWordToBoard(word, orientation, x, y);
          myscore = wordblocks_self.scoreWord(word, wordblocks_self.game.player, orientation, x, y);

          if (myscore <= 1) {
            wordblocks_self.removeWordFromBoard(word, orientation, x, y);
            wordblocks_self.updateStatus("Try again!<p></p><div style=\"font-size:0.9em\">Click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.</div>");
          } else {
            wordblocks_self.setBoard(word, orientation, x, y); //
            // place word on board
            //

            wordblocks_self.addMove("place\t" + word + "\t" + wordblocks_self.game.player + "\t" + x + "\t" + y + "\t" + orientation); //
            // discard tiles
            //

            wordblocks_self.discardTiles(word, orientation, x, y); //
            // get new cards
            //

            let cards_needed = 7;
            cards_needed = cards_needed - wordblocks_self.game.deck[0].hand.length;

            if (cards_needed > wordblocks_self.game.deck[0].crypt.length) {
              cards_needed = wordblocks_self.game.deck[0].crypt.length;
            }

            if (cards_needed > 0) {
              wordblocks_self.addMove("DEAL\t1\t" + wordblocks_self.game.player + "\t" + cards_needed);
            } //myscore = wordblocks_self.scoreWord(word, wordblocks_self.game.player, orientation, x, y);


            wordblocks_self.exhaustWord(word, orientation, x, y);
            wordblocks_self.addScoreToPlayer(wordblocks_self.game.player, myscore);

            if (wordblocks_self.checkForEndGame() == 1) {
              return;
            }

            $('#remainder').html("Tiles left: " + wordblocks_self.game.deck[0].crypt.length);
            wordblocks_self.endTurn();
          }

          ;
        }
      }
    });
  });
};

Wordblocks.prototype.removeTilesFromHand = function removeTilesFromHand(word) {
  while (word.length > 0) {
    let tmpx = word[0];
    tmpx = tmpx.toUpperCase();

    for (let i = 0; i < this.game.deck[0].hand.length; i++) {
      if (this.game.deck[0].cards[this.game.deck[0].hand[i]].name == tmpx) {
        this.game.deck[0].hand.splice(i, 1);
        i = this.game.deck[0].hand.length;
      }
    }

    if (word.length > 1) {
      word = word.substring(1);
    } else {
      word = "";
    }
  }
}; 

//
// is Entry Valid
//


Wordblocks.prototype.isEntryValid = function isEntryValid(word, orientation, x, y) {
  let valid_placement = 1;
  let tmphand = JSON.parse(JSON.stringify(this.game.deck[0].hand));
  x = parseInt(x);
  y = parseInt(y); 
  
  //
  // if this is the first word, it has to cross a critical star
  //

  if (this.firstmove == 1) {
    if (orientation == "vertical") {
      if (x != 6 && x != 10) {
        alert("First Word must be placed to cross a Star");
        return 0;
      }

      let starting_point = y;
      let ending_point = y + word.length - 1;

      if (starting_point <= 6 && ending_point >= 6 || starting_point <= 10 && ending_point >= 6) { } else {
        alert("First Word must be long enough to cross a Star");
        return 0;
      }
    }

    if (orientation == "horizontal") {
      if (y != 6 && y != 10) {
        alert("First Word must be placed to cross a Star");
        return 0;
      }

      let starting_point = x;
      let ending_point = x + word.length - 1;

      if (starting_point <= 6 && ending_point >= 6 || starting_point <= 10 && ending_point >= 6) { } else {
        alert("First Word must be long enough to cross a Star");
        return 0;
      }
    } //this.firstmove = 0;

  }

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    if (this.game.board[boardslot].letter != "_") {
      if (this.game.board[boardslot].letter != letter) {
        valid_placement = 0;
      }
    } else {
      let letter_found = 0;

      for (let k = 0; k < tmphand.length; k++) {
        if (this.game.deck[0].cards[tmphand[k]].name == letter) {
          tmphand.splice(k, 1);
          letter_found = 1;
          k = tmphand.length + 1; 
          //or we could use break. this was above the splice command. Endless letters.
        }
      }

      if (letter_found == 0) {
        alert("INVALID: letter not in hand: " + letter);
        return 0;
      }
    }
  }

  if (valid_placement == 0) {
    alert("This is an invalid placement!");
  }

  return valid_placement;
}; 

//
// exhaustWord
//


Wordblocks.prototype.exhaustWord = function exhaustWord(word, orientation, x, y) {
  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let divname = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    this.game.board[boardslot].fresh = 0;
  } 
  
  //this.saveGame(this.game.id);

}; 

//
// discard tile
//


Wordblocks.prototype.discardTiles = function discardTiles(word, orientation, x, y) {
  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let divname = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    if (this.game.board[boardslot].fresh == 1) {
      this.removeTilesFromHand(word[i]);
    }
  } 
  
  //this.saveGame(this.game.id);

};

 //
// addWordToBoard
//


Wordblocks.prototype.addWordToBoard = function addWordToBoard(word, orientation, x, y) {
  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let divname = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    divname = "#" + boardslot;

    if (this.game.board[boardslot].letter != "_") {
      if (this.game.board[boardslot].letter != letter) {
        this.game.board[boardslot].letter = letter;
        //$(divname).html(this.returnTile(letter));

        this.addTile($(divname), letter);
      }
    } else {
      this.game.board[boardslot].letter = letter;
       //      $(divname).html(this.returnTile(letter));

      this.addTile($(divname), letter);
    }
  }
};

Wordblocks.prototype.removeWordFromBoard = function removeWordFromBoard(word, orientation, x, y) {
  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let divname = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    divname = "#" + boardslot;

    if ($(divname).hasClass("set") != true) {
      this.game.board[boardslot].letter = "_";
      $(divname).css("background-image", "");
    }
  }
};

Wordblocks.prototype.setBoard = function setBoard(word, orientation, x, y) {
  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {
    let boardslot = "";
    let divname = "";

    if (orientation == "horizontal") {
      boardslot = y + "_" + (x + i);
    }

    if (orientation == "vertical") {
      boardslot = y + i + "_" + x;
    }

    divname = "#" + boardslot;
    $(divname).addClass("set");
  }
}; 

//////////////////
// Return Board //
//////////////////


Wordblocks.prototype.returnBoard = function returnBoard() {
  var board = {};

  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
      let divname = i + 1 + "_" + (j + 1);
      board[divname] = {
        letter: "_",
        fresh: 1
      };
    }
  }

  return board;
}; 

/////////////////
// Return Deck //
/////////////////


Wordblocks.prototype.returnDeck = function returnDeck() {
  var deck = {};
  deck['1'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['2'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['3'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['4'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['5'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['6'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['7'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['8'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['9'] = {
    img: "/wordblocks/img/A.jpg",
    name: "A"
  };
  deck['10'] = {
    img: "/wordblocks/img/B.jpg",
    name: "B"
  };
  deck['11'] = {
    img: "/wordblocks/img/B.jpg",
    name: "B"
  };
  deck['12'] = {
    img: "/wordblocks/img/C.jpg",
    name: "C"
  };
  deck['13'] = {
    img: "/wordblocks/img/C.jpg",
    name: "C"
  };
  deck['14'] = {
    img: "/wordblocks/img/D.jpg",
    name: "D"
  };
  deck['15'] = {
    img: "/wordblocks/img/D.jpg",
    name: "D"
  };
  deck['16'] = {
    img: "/wordblocks/img/D.jpg",
    name: "D"
  };
  deck['17'] = {
    img: "/wordblocks/img/D.jpg",
    name: "D"
  };
  deck['18'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['19'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['20'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['21'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['22'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['23'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['24'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['25'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['26'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['27'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['28'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['29'] = {
    img: "/wordblocks/img/E.jpg",
    name: "E"
  };
  deck['30'] = {
    img: "/wordblocks/img/F.jpg",
    name: "F"
  };
  deck['41'] = {
    img: "/wordblocks/img/F.jpg",
    name: "F"
  };
  deck['42'] = {
    img: "/wordblocks/img/G.jpg",
    name: "G"
  };
  deck['43'] = {
    img: "/wordblocks/img/G.jpg",
    name: "G"
  };
  deck['44'] = {
    img: "/wordblocks/img/G.jpg",
    name: "G"
  };
  deck['45'] = {
    img: "/wordblocks/img/H.jpg",
    name: "H"
  };
  deck['46'] = {
    img: "/wordblocks/img/H.jpg",
    name: "H"
  };
  deck['47'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['48'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['49'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['50'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['51'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['52'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['53'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['54'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['55'] = {
    img: "/wordblocks/img/I.jpg",
    name: "I"
  };
  deck['56'] = {
    img: "/wordblocks/img/J.jpg",
    name: "J"
  };
  deck['57'] = {
    img: "/wordblocks/img/K.jpg",
    name: "K"
  };
  deck['58'] = {
    img: "/wordblocks/img/L.jpg",
    name: "L"
  };
  deck['59'] = {
    img: "/wordblocks/img/L.jpg",
    name: "L"
  };
  deck['60'] = {
    img: "/wordblocks/img/L.jpg",
    name: "L"
  };
  deck['61'] = {
    img: "/wordblocks/img/L.jpg",
    name: "L"
  };
  deck['62'] = {
    img: "/wordblocks/img/M.jpg",
    name: "M"
  };
  deck['63'] = {
    img: "/wordblocks/img/M.jpg",
    name: "M"
  };
  deck['64'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['65'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['66'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['67'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['68'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['69'] = {
    img: "/wordblocks/img/N.jpg",
    name: "N"
  };
  deck['70'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['71'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['72'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['73'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['74'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['75'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['76'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['77'] = {
    img: "/wordblocks/img/O.jpg",
    name: "O"
  };
  deck['78'] = {
    img: "/wordblocks/img/P.jpg",
    name: "P"
  };
  deck['79'] = {
    img: "/wordblocks/img/P.jpg",
    name: "P"
  };
  deck['80'] = {
    img: "/wordblocks/img/Q.jpg",
    name: "Q"
  };
  deck['81'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['82'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['83'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['84'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['85'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['86'] = {
    img: "/wordblocks/img/R.jpg",
    name: "R"
  };
  deck['87'] = {
    img: "/wordblocks/img/S.jpg",
    name: "S"
  };
  deck['88'] = {
    img: "/wordblocks/img/S.jpg",
    name: "S"
  };
  deck['89'] = {
    img: "/wordblocks/img/S.jpg",
    name: "S"
  };
  deck['90'] = {
    img: "/wordblocks/img/S.jpg",
    name: "S"
  };
  deck['91'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['92'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['93'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['94'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['95'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['96'] = {
    img: "/wordblocks/img/T.jpg",
    name: "T"
  };
  deck['97'] = {
    img: "/wordblocks/img/U.jpg",
    name: "U"
  };
  deck['98'] = {
    img: "/wordblocks/img/U.jpg",
    name: "U"
  };
  deck['99'] = {
    img: "/wordblocks/img/U.jpg",
    name: "U"
  };
  deck['100'] = {
    img: "/wordblocks/img/U.jpg",
    name: "U"
  };
  deck['101'] = {
    img: "/wordblocks/img/V.jpg",
    name: "V"
  };
  deck['102'] = {
    img: "/wordblocks/img/V.jpg",
    name: "V"
  };
  deck['103'] = {
    img: "/wordblocks/img/W.jpg",
    name: "W"
  };
  deck['104'] = {
    img: "/wordblocks/img/W.jpg",
    name: "W"
  };
  deck['105'] = {
    img: "/wordblocks/img/X.jpg",
    name: "X"
  };
  deck['106'] = {
    img: "/wordblocks/img/U.jpg",
    name: "U"
  };
  deck['107'] = {
    img: "/wordblocks/img/Y.jpg",
    name: "Y"
  };
  deck['108'] = {
    img: "/wordblocks/img/Y.jpg",
    name: "Y"
  };
  deck['109'] = {
    img: "/wordblocks/img/Z.jpg",
    name: "Z"
  };
  return deck;
};

Wordblocks.prototype.returnLetters = function returnLetters() {
  var letters = {};
  letters['A'] = {
    score: 1
  };
  letters['B'] = {
    score: 3
  };
  letters['C'] = {
    score: 2
  };
  letters['D'] = {
    score: 2
  };
  letters['E'] = {
    score: 1
  };
  letters['F'] = {
    score: 2
  };
  letters['G'] = {
    score: 2
  };
  letters['H'] = {
    score: 1
  };
  letters['I'] = {
    score: 1
  };
  letters['J'] = {
    score: 8
  };
  letters['K'] = {
    score: 4
  };
  letters['L'] = {
    score: 2
  };
  letters['M'] = {
    score: 2
  };
  letters['N'] = {
    score: 1
  };
  letters['O'] = {
    score: 1
  };
  letters['P'] = {
    score: 2
  };
  letters['Q'] = {
    score: 10
  };
  letters['R'] = {
    score: 1
  };
  letters['S'] = {
    score: 1
  };
  letters['T'] = {
    score: 1
  };
  letters['U'] = {
    score: 2
  };
  letters['V'] = {
    score: 3
  };
  letters['W'] = {
    score: 2
  };
  letters['X'] = {
    score: 8
  };
  letters['Y'] = {
    score: 2
  };
  letters['Z'] = {
    score: 10
  };
  return letters;
};

Wordblocks.prototype.returnBonus = function returnBonus(pos) {
  let bonus = "";

  if (pos == "1_1") {
    return "3L";
  }

  if (pos == "1_15") {
    return "3L";
  }

  if (pos == "3_8") {
    return "3L";
  }

  if (pos == "8_3") {
    return "3L";
  }

  if (pos == "8_13") {
    return "3L";
  }

  if (pos == "13_8") {
    return "3L";
  }

  if (pos == "15_1") {
    return "3L";
  }

  if (pos == "15_15") {
    return "3L";
  }

  if (pos == "2_2") {
    return "3W";
  }

  if (pos == "2_14") {
    return "3W";
  }

  if (pos == "8_8") {
    return "3W";
  }

  if (pos == "14_2") {
    return "3W";
  }

  if (pos == "14_14") {
    return "3W";
  }

  if (pos == "1_5") {
    return "2L";
  }

  if (pos == "1_11") {
    return "2L";
  }

  if (pos == "3_4") {
    return "2L";
  }

  if (pos == "3_12") {
    return "2L";
  }

  if (pos == "4_3") {
    return "2L";
  }

  if (pos == "4_13") {
    return "2L";
  }

  if (pos == "5_8") {
    return "2L";
  }

  if (pos == "5_1") {
    return "2L";
  }

  if (pos == "5_15") {
    return "2L";
  }

  if (pos == "8_5") {
    return "2L";
  }

  if (pos == "8_11") {
    return "2L";
  }

  if (pos == "11_1") {
    return "2L";
  }

  if (pos == "11_8") {
    return "2L";
  }

  if (pos == "11_15") {
    return "2L";
  }

  if (pos == "12_3") {
    return "2L";
  }

  if (pos == "12_13") {
    return "2L";
  }

  if (pos === "13_4") {
    return "2L";
  }

  if (pos === "13_12") {
    return "2L";
  }

  if (pos == "15_5") {
    return "2L";
  }

  if (pos == "15_11") {
    return "2L";
  }

  if (pos == "1_8") {
    return "2W";
  }

  if (pos == "4_6") {
    return "2W";
  }

  if (pos == "4_10") {
    return "2W";
  }

  if (pos == "6_4") {
    return "2W";
  }

  if (pos == "6_12") {
    return "2W";
  }

  if (pos == "8_1") {
    return "2W";
  }

  if (pos == "8_15") {
    return "2W";
  }

  if (pos == "10_4") {
    return "2W";
  }

  if (pos == "10_12") {
    return "2W";
  }

  if (pos == "12_6") {
    return "2W";
  }

  if (pos == "12_10") {
    return "2W";
  }

  if (pos == "15_8") {
    return "2W";
  }

  return bonus;
}; 

////////////////
// Score Word //
////////////////


Wordblocks.prototype.scoreWord = function scoreWord(word, player, orientation, x, y) {
  let score = 0;
  let touchesWord = 0;
  let thisword = "";
  let finalword = "";
  x = parseInt(x);
  y = parseInt(y);
  
  //
  // find the start of the word
  //

  if (orientation == "horizontal") {
    let beginning_of_word = x;
    let end_of_word = x;
    let tilesUsed = 0; 
    
    //
    // find the beginning of the word
    //

    let current_x = parseInt(x) - 1;
    let current_y = y;
    let boardslot = y + "_" + current_x;
    let divname = "#" + boardslot;

    if (current_x < 1) {
      beginning_of_word = 1;
    } else {
      while (this.game.board[boardslot].letter != "_" && current_x >= 1) {
        beginning_of_word = current_x;
        current_x--;
        boardslot = y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_x < 1) {
          break;
        }
      }
    } 
    
    //
    // find the end of the word
    //


    current_x = parseInt(x) + 1;
    current_y = y;
    boardslot = y + "_" + current_x;
    divname = "#" + boardslot;

    if (current_x <= 15) {
      while (this.game.board[boardslot].letter != "_" && current_x <= 15) {
        end_of_word = current_x;
        current_x++;
        boardslot = y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_x > 15) {
          break;
        }
      }
    }

    let word_bonus = 1; 
    
    //
    // score this word
    //

    thisword = "";

    for (let i = beginning_of_word, k = 0; i <= end_of_word; i++) {
      boardslot = y + "_" + i;
      let tmpb = this.returnBonus(boardslot);
      let letter_bonus = 1;

      if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) {
        word_bonus = word_bonus * 3;
      }

      if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) {
        word_bonus = word_bonus * 2;
      }

      if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) {
        letter_bonus = 3;
      }

      if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) {
        letter_bonus = 2;
      }

      if (this.game.board[boardslot].fresh == 1) {
        tilesUsed += 1;
      }

      if (this.game.board[boardslot].fresh != 1) {
        touchesWord = 1;
      }

      let thisletter = this.game.board[boardslot].letter;
      thisword += thisletter;
      score += this.letters[thisletter].score * letter_bonus;
    }

    if (!checkWord(thisword)) {
      return -1;
    }

    finalword += thisword;

    if (tilesUsed == 7) {
      score += 10;
      word_bonus += 1;
    }

    score *= word_bonus; 
    
    //
    // now score vertical words 
    //

    for (let i = x; i < x + word.length; i++) {
      boardslot = y + "_" + i;

      if (this.game.board[boardslot].fresh == 1) {
        let orth_start = parseInt(y);
        let orth_end = parseInt(y); 
        
        //
        // find the beginning of the word
        //

        current_x = i;
        current_y = orth_start - 1;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_y == 0) {
          orth_start = 1;
        } else {
          while (this.game.board[boardslot].letter != "_" && current_y > 0) {
            orth_start = current_y;
            current_y--;
            boardslot = current_y + "_" + current_x;
            divname = "#" + boardslot;

            if (current_y < 1) {
              break;
            }
          }
        } 
        
        //
        // find the end of the word
        //


        current_x = i;
        current_y = orth_end + 1;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_y > 15) {
          orth_end = 15;
        } else {
          while (this.game.board[boardslot].letter != "_" && current_y <= 15) {
            orth_end = current_y;
            current_y++;
            boardslot = current_y + "_" + current_x;

            if (current_y > 15) {
              break;
            }
          }
        }

        let wordscore = 0;
        let word_bonus = 1; 
        
        //
        // score this word
        //

        thisword = "";

        if (orth_start != orth_end) {
          for (let w = orth_start, q = 0; w <= orth_end; w++) {
            let boardslot = w + "_" + i;
            let tmpb = this.returnBonus(boardslot);
            let letter_bonus = 1;

            if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) {
              word_bonus = word_bonus * 3;
            }

            if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) {
              word_bonus = word_bonus * 2;
            }

            if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) {
              letter_bonus = 3;
            }

            if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) {
              letter_bonus = 2;
            }

            if (this.game.board[boardslot].fresh != 1) {
              touchesWord = 1;
            }

            let thisletter = this.game.board[boardslot].letter;
            thisword += thisletter;
            wordscore += this.letters[thisletter].score * letter_bonus;
          }

          score += wordscore * word_bonus;

          if (!checkWord(thisword)) {
            return -1;
          }
        }
      }
    }
  }

  if (orientation == "vertical") {
    let beginning_of_word = y;
    let end_of_word = y;
    let tilesUsed = 0;
    
    //
    // find the beginning of the word
    //

    let current_x = parseInt(x);
    let current_y = parseInt(y) - 1;
    let boardslot = current_y + "_" + current_x;
    let divname = "#" + boardslot;

    if (current_y <= 0) {
      beginning_of_word = 1;
    } else {
      while (this.game.board[boardslot].letter != "_" && current_y > 0) {
        beginning_of_word = current_y;
        current_y--;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_y <= 0) {
          break;
        }
      }
    } 
    
    //
    // find the end of the word
    //


    current_x = parseInt(x);
    current_y = parseInt(y) + 1;
    boardslot = current_y + "_" + current_x;
    divname = "#" + boardslot;

    if (current_y > 15) {
      end_of_word = 15;
    } else {
      while (this.game.board[boardslot].letter != "_" && current_y <= 15) {
        end_of_word = current_y;
        current_y++;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_y > 15) {
          break;
        }
      }
    }

    let word_bonus = 1; 
    
    //
    // score this word
    //

    for (let i = beginning_of_word, k = 0; i <= end_of_word; i++) {
      boardslot = i + "_" + x;
      let tmpb = this.returnBonus(boardslot);
      let letter_bonus = 1;

      if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) {
        word_bonus = word_bonus * 3;
      }

      if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) {
        word_bonus = word_bonus * 2;
      }

      if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) {
        letter_bonus = 3;
      }

      if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) {
        letter_bonus = 2;
      }

      if (this.game.board[boardslot].fresh == 1) {
        tilesUsed += 1;
      }

      if (this.game.board[boardslot].fresh != 1) {
        touchesWord = 1;
      }

      let thisletter = this.game.board[boardslot].letter;
      thisword += thisletter;
      score += this.letters[thisletter].score * letter_bonus;
    }

    if (!checkWord(thisword)) {
      return -1;
    }

    finalword += thisword;

    if (tilesUsed == 7) {
      score += 10;
      word_bonus += 1;
    }

    score *= word_bonus; 
    
    //
    // now score horizontal words 
    //

    for (let i = y; i < y + word.length; i++) {
      boardslot = i + "_" + x;

      if (this.game.board[boardslot].fresh == 1) {
        let orth_start = parseInt(x);
        let orth_end = parseInt(x);
        
        //
        // find the beginning of the word
        //

        current_x = orth_start - 1;
        current_y = i;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_x < 1) {
          orth_start = 1;
        } else {
          while (this.game.board[boardslot].letter != "_" && current_x > 0) {
            orth_start = current_x;
            current_x--;
            boardslot = current_y + "_" + current_x;
            divname = "#" + boardslot;

            if (current_x < 1) {
              break;
            }
          }
        } 
        
        //
        // find the end of the word
        //


        current_x = orth_end + 1;
        current_y = i;
        boardslot = current_y + "_" + current_x;
        divname = "#" + boardslot;

        if (current_x > 15) {
          orth_end = 15;
        } else {
          //
          // >= instead of greater than
          //
          while (this.game.board[boardslot].letter != "_" && current_x <= 15) {
            orth_end = current_x;
            current_x++;
            boardslot = current_y + "_" + current_x;

            if (current_x > 15) {
              break;
            }
          }
        }

        let wordscore = 0;
        let word_bonus = 1; 
        
        //
        // score this word
        //

        thisword = "";

        if (orth_start != orth_end) {
          for (let w = orth_start, q = 0; w <= orth_end; w++) {
            boardslot = i + "_" + w;
            let tmpb = this.returnBonus(boardslot);
            let letter_bonus = 1;

            if (tmpb === "3W" && this.game.board[boardslot].fresh == 1) {
              word_bonus = word_bonus * 3;
            }

            if (tmpb === "2W" && this.game.board[boardslot].fresh == 1) {
              word_bonus = word_bonus * 2;
            }

            if (tmpb === "3L" && this.game.board[boardslot].fresh == 1) {
              letter_bonus = 3;
            }

            if (tmpb === "2L" && this.game.board[boardslot].fresh == 1) {
              letter_bonus = 2;
            }

            if (this.game.board[boardslot].fresh != 1) {
              touchesWord = 1;
            }

            let thisletter = this.game.board[boardslot].letter;
            thisword += thisletter;
            wordscore += this.letters[thisletter].score * letter_bonus;
          }

          score += wordscore * word_bonus;

          if (!checkWord(thisword)) {
            return -1;
          }
        }
      }
    }
  }

  if (this.firstmove == 0 && touchesWord == 0) {
    alert("Word does not cross our touch an existing word.");
    return -1;
  }

  this.firstmove = 0;
  $('#lastmove').html("Player " + player + " played " + finalword + " for: " + score + " points.");
  $('#remainder').html("Tiles left: " + this.game.deck[0].crypt.length);
  return score;
};

checkWord = function checkWord(word) {
  if (word.length >= 1 && typeof allWords != "undefined") {
    if (allWords.indexOf(word.toLowerCase()) <= 0) {
      alert(word + " is not a playable word.");
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}; 

//
// Core Game Logic
//


Wordblocks.prototype.handleGame = function handleGame(msg = null) {
  let wordblocks_self = this; 
  
  //
  // show board and tiles
  //

  this.showTiles(); 
  
  ///////////
  // QUEUE //
  ///////////

  if (this.game.queue.length > 0) {
    //
    // save before we start executing the game queue
    //
    wordblocks_self.saveGame(wordblocks_self.game.id);
    let qe = this.game.queue.length - 1;
    let mv = this.game.queue[qe].split("\t");
    let shd_continue = 1; 
    
    //
    // game over conditions
    //

    if (mv[0] === "gameover") {
      //
      // pick the winner
      //
      let x = 0;
      let idx = 0;

      for (let i = 0; i < wordblocks_self.game.score.length; i++) {
        if (wordblocks_self.game.score[i] > x) {
          x = wordblocks_self.game.score[i];
          idx = i;
        }
      }

      for (let i = 0; i < wordblocks_self.game.score.length; i++) {
        if (i != idx && wordblocks_self.game.score[i] == wordblocks_self.game.score[idx]) {
          idx = -1;
        }
      }

      wordblocks_self.game.winner = idx + 1;
      wordblocks_self.game.over = 1;
      wordblocks_self.saveGame(wordblocks_self.game.id);
      wordblocks_self.game.queue.splice(wordblocks_self.game.queue.length - 1, 1);

      if (wordblocks_self.browser_active == 1) {
        this.disableEvents();
        var result = "Game Over<br/>Player " + wordblocks_self.game.winner + " wins!";

        if (idx < 0) {
          result = "It's a tie! Well done everyone!";
        }

        wordblocks_self.updateStatus(result);
        wordblocks_self.updateLog(result);
      }

      this.moves;
      return 0;
    } 
    
    //
    // place word player x y [horizontal/vertical]
    //


    if (mv[0] === "place") {
      //this.firstmove = 0;
      let word = mv[1];
      let player = mv[2];
      let x = mv[3];
      let y = mv[4];
      let orient = mv[5];
      let score = 0;

      if (player != wordblocks_self.game.player) {
        this.addWordToBoard(word, orient, x, y);
        this.setBoard(word, orient, x, y);
        score = this.scoreWord(word, player, orient, x, y);
        this.exhaustWord(word, orient, x, y);
        this.addScoreToPlayer(player, score);
      }

      if (wordblocks_self.game.over == 1) {
        this.updateStatus("Game Over");
        return;
      }

      if (wordblocks_self.game.player == wordblocks_self.returnNextPlayer(player)) {
        if (wordblocks_self.checkForEndGame() == 1) {
          return;
        }

        wordblocks_self.updateStatus("YOUR TURN: click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.");
        wordblocks_self.enableEvents();
      } else {
        wordblocks_self.updateStatus("Player " + wordblocks_self.returnNextPlayer(player) + " turn");
        wordblocks_self.disableEvents();
      }

      this.game.queue.splice(this.game.queue.length - 1, 1);
      return 1; // remove word and wait for next
    }

    if (mv[0] === "turn") {
      if (wordblocks_self.checkForEndGame() == 1) {
        return;
      }

      let player = mv[1];

      if (wordblocks_self.game.player == wordblocks_self.returnNextPlayer(player)) {
        wordblocks_self.updateStatus("YOUR TURN: click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.");
        wordblocks_self.enableEvents();
      } else {
        wordblocks_self.updateStatus("Player " + wordblocks_self.returnNextPlayer(player) + " turn");
        wordblocks_self.disableEvents();
      }

      this.game.queue.splice(this.game.queue.length - 1, 1);
      return 1;
    } 
    
    //
    // avoid infinite loops
    //


    if (shd_continue == 0) {
      return 0;
    }
  } 
  
  // if cards in queue

  /***
    else {
  
      if (this.game.target == this.game.player) {
        this.addEventsToBoard();
      }
  
    }
  ***/


  return 1;
};

Wordblocks.prototype.checkForEndGame = function checkForEndGame() {
  //
  // the game ends when one player has no cards left
  //
  if (this.game.deck[0].hand.length == 0 && this.game.deck[0].crypt.length == 0) {
    this.addMove("gameover");
    this.endTurn();
    return 1;
  }

  return 0;
};

Wordblocks.prototype.addScoreToPlayer = function addScoreToPlayer(player, score) {
  if (this.browser_active == 0) {
    return;
  }

  let divname = "#score_" + player;
  this.game.score[player - 1] = this.game.score[player - 1] + score;
  $(divname).html(parseInt($(divname).html()) + score);
}; 

///////////////
// webServer //
///////////////


Wordblocks.prototype.webServer = function webServer(app, expressapp) {
  expressapp.get('/wordblocks/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/wordblocks/style.css', function (req, res) {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/wordblocks/script.js', function (req, res) {
    res.sendFile(__dirname + '/web/script.js');
    return;
  });
  expressapp.get('/wordblocks/sowpods.js', function (req, res) {
    res.sendFile(__dirname + '/web/sowpods.js');
    return;
  });
  expressapp.get('/wordblocks/img/:imagefile', function (req, res) {
    var imgf = '/web/img/' + req.params.imagefile;

    if (imgf.indexOf("\/") != false) {
      return;
    }

    res.sendFile(__dirname + imgf);
    return;
  });
};

Wordblocks.prototype.addMove = function addMove(mv) {
  this.moves.push(mv);
};

Wordblocks.prototype.endTurn = function endTurn() {
  this.updateStatus("Waiting for information from peers....");
  let extra = {};
  extra.target = this.returnNextPlayer(this.game.player);
  this.game.turn = this.moves;
  this.moves = [];
  this.sendMessage("game", extra);
};