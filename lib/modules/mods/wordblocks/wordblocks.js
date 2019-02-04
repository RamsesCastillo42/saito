var saito = require('../../../saito');
var Game = require('../../game');
var util = require('util');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Wordblocks(app) {

  if (!(this instanceof Wordblocks)) { return new Wordblocks(app); }

  Wordblocks.super_.call(this);

  this.app             = app;

  this.name            = "Wordblocks";
  this.browser_active  = 0;
  this.handlesEmail    = 1;
  this.emailAppName    = "Wordblocks";

  //
  // this sets the ratio used for determining
  // the size of the original pieces
  //
  this.gameboardWidth  = 2677;

  this.letters         = {};
  this.moves           = [];

  return this;

}
module.exports = Wordblocks;
util.inherits(Wordblocks, Game);




////////////////
// show tiles //
////////////////
Wordblocks.prototype.showTiles = function showTiles() {

  let html = "";

  for (let i = 0; i < this.game.hand.length; i++) {
    html += this.returnTile(this.game.cards[this.game.hand[i]].name);
  }

  $('.tiles').html(html);

  //
  // set tile size
  //
  $('.tile').css('height',this.scale(163)+"px");
  $('.tile').css('width',this.scale(148)+"px");


}



////////////////
// initialize //
////////////////
Wordblocks.prototype.initializeGame = async function initializeGame(game_id) {

  this.updateStatus("loading game...");
  this.loadGame(game_id);

  if (this.game.status != "") { this.updateStatus(this.game.status); }


  //
  // initialize
  //
  if (this.game.initializing == 1) {
    this.game.initializing = 0;
  }


  //
  // deal cards 
  //
  if (this.game.deck.cards.length == 0 && this.game.step.game == 0) {

    this.updateStatus("Generating the Game");

    this.game.queue.push("EMAIL\tready");
    this.game.queue.push("DEAL\t2\t8");
    this.game.queue.push("DEAL\t1\t8");
    this.game.queue.push("DECKENCRYPT\t2");
    this.game.queue.push("DECKENCRYPT\t1");
    this.game.queue.push("DECKXOR\t2");
    this.game.queue.push("DECKXOR\t1");
    this.game.queue.push("DECK\t"+JSON.stringify(this.returnDeck()));

  }


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
  if (this.game.opponents != undefined) { players = this.game.opponents.length+1; }
  for (let i = 0; i < players; i++) {
    let this_player = i+1;
    html += '<div class="player">Player '+this_player+': <span id="score_'+this_player+'">0</span></div>';
  }
  if (this.browser_active == 1) { $('.score').html(html); }
 

  //
  // return letters
  //
  this.letters = this.returnLetters();

  //
  // initialize interface
  //
  $('.slot').css('height', this.scale(163)+"px");
  $('.slot').css('width', this.scale(148)+"px");

  //
  // set x/y positions
  //
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {

      let divname = "#" + (i+1) + "_" + (j+1);

      let xpos = (j * 148) + 84 + (j * 21);
      let ypos = (i * 163) + 84 + (i * 21);

      xpos = this.scale(xpos) + "px";
      ypos = this.scale(ypos) + "px";

      $(divname).css('top',  ypos);
      $(divname).css('left', xpos);

    }
  }

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
      let divname = "#"+i;
      let letter = this.game.board[i].letter;
      $(divname).html(this.returnTile(letter));
    }

  }

//alert(JSON.stringify(this.game.board));

  //
  // set tile size
  //
  $('.tile').css('height',this.scale(163)+"px");
  $('.tile').css('width',this.scale(148)+"px");


  //
  // attach events
  //
  this.addEventsToBoard();



  //
  // if the browser is active, shift to the game that way
  //
  if (this.browser_active == 1) {
    let msg = {};
    msg.extra = {};
    msg.extra.target = this.game.target;
    this.handleGame(msg);
  }
}



/////////////////
// Return Tile //
/////////////////
Wordblocks.prototype.returnTile = function returnTile(letter) {

  let html = "";  

  if (letter == "A") { html = '<img class="tile" src="/wordblocks/img/A.jpg" />'; }
  if (letter == "B") { html = '<img class="tile" src="/wordblocks/img/B.jpg" />'; }
  if (letter == "C") { html = '<img class="tile" src="/wordblocks/img/C.jpg" />'; }
  if (letter == "D") { html = '<img class="tile" src="/wordblocks/img/D.jpg" />'; }
  if (letter == "E") { html = '<img class="tile" src="/wordblocks/img/E.jpg" />'; }
  if (letter == "F") { html = '<img class="tile" src="/wordblocks/img/F.jpg" />'; }
  if (letter == "G") { html = '<img class="tile" src="/wordblocks/img/G.jpg" />'; }
  if (letter == "H") { html = '<img class="tile" src="/wordblocks/img/H.jpg" />'; }
  if (letter == "I") { html = '<img class="tile" src="/wordblocks/img/I.jpg" />'; }
  if (letter == "J") { html = '<img class="tile" src="/wordblocks/img/J.jpg" />'; }
  if (letter == "K") { html = '<img class="tile" src="/wordblocks/img/K.jpg" />'; }
  if (letter == "L") { html = '<img class="tile" src="/wordblocks/img/L.jpg" />'; }
  if (letter == "M") { html = '<img class="tile" src="/wordblocks/img/M.jpg" />'; }
  if (letter == "N") { html = '<img class="tile" src="/wordblocks/img/N.jpg" />'; }
  if (letter == "O") { html = '<img class="tile" src="/wordblocks/img/O.jpg" />'; }
  if (letter == "P") { html = '<img class="tile" src="/wordblocks/img/P.jpg" />'; }
  if (letter == "Q") { html = '<img class="tile" src="/wordblocks/img/Q.jpg" />'; }
  if (letter == "R") { html = '<img class="tile" src="/wordblocks/img/R.jpg" />'; }
  if (letter == "S") { html = '<img class="tile" src="/wordblocks/img/S.jpg" />'; }
  if (letter == "T") { html = '<img class="tile" src="/wordblocks/img/T.jpg" />'; }
  if (letter == "U") { html = '<img class="tile" src="/wordblocks/img/U.jpg" />'; }
  if (letter == "V") { html = '<img class="tile" src="/wordblocks/img/V.jpg" />'; }
  if (letter == "W") { html = '<img class="tile" src="/wordblocks/img/W.jpg" />'; }
  if (letter == "X") { html = '<img class="tile" src="/wordblocks/img/X.jpg" />'; }
  if (letter == "Y") { html = '<img class="tile" src="/wordblocks/img/Y.jpg" />'; }
  if (letter == "Z") { html = '<img class="tile" src="/wordblocks/img/Z.jpg" />'; }

  return html;

}


/////////////////////////
// Add Events to Board //
/////////////////////////
Wordblocks.prototype.addEventsToBoard = function addEventsToBoard() {

  let wordblocks_self = this;

  $('.slot').off();
  $('.slot').on('click',function() {

    let divname = $(this).attr("id");
    let html = 'Add a Word:<p></p><ul><li class="card" id="horizontally">horizontally</li><li class="card" id="vertically">vertically</li><li class="card" id="cancel">cancel</li></ul>';

    let tmpx = divname.split("_");
    let y = tmpx[0];
    let x = tmpx[1];

    let orientation = "";
    let word = "";

    $('.status').html(html);
    $('.status').show();

    $('.card').off();
    $('.card').on('click', function() {

      let action2 = $(this).attr("id");
      
      if (action2 == "horizontally") {
        orientation = "horizontal";
      }
      if (action2 == "vertically") {
        orientation = "vertical";
      }
      if (action2 == "cancel") {
	$('.card').off();
	$('.status').hide();
	return;
      }

      word = prompt("Provide your word:");
      if (word) {

//alert("BOARD: " + JSON.stringify(wordblocks_self.game.board)); 

	//
	// reset board
	//
        $('.status').hide();

        //
        // if entry is valid
        //
        if (wordblocks_self.isEntryValid(word, orientation, x, y) == 1) {

	  let myscore = 0;

	  //
	  // remove tiles from hand
	  //
	  wordblocks_self.removeTilesFromHand(word);

	  //
	  // get new cards
	  //
	  let cards_needed = 7;
          cards_needed = cards_needed - wordblocks_self.game.hand.length;
          wordblocks_self.addMove("DEAL\t"+wordblocks_self.game.player+"\t"+cards_needed);

	  //
	  // place word on board
	  //
	  wordblocks_self.addMove("place\t"+word+"\t"+wordblocks_self.game.player+"\t"+x+"\t"+y+"\t"+orientation);
	  wordblocks_self.endTurn();

	  wordblocks_self.addWordToBoard(word, orientation, x, y);
	  myscore = wordblocks_self.scoreWord(word, wordblocks_self.game.player, orientation, x, y);
	  wordblocks_self.exhaustWord(word, orientation, x, y);
	  wordblocks_self.addScoreToPlayer(wordblocks_self.game.player, myscore);

        };

      }
    });   
  });

}




Wordblocks.prototype.removeTilesFromHand = function removeTilesFromHand(word) {

  while (word.length > 0) {

    let tmpx = word[0];
    tmpx = tmpx.toUpperCase();

    for (let i = 0; i < this.game.hand.length; i++) {
      if (this.game.cards[this.game.hand[i]].name == tmpx) {
	this.game.hand.splice(i, 1);
	i = this.game.hand.length;
      }
    }

    if (word.length > 1) {
      word = word.substring(1);
    } else {
      word = "";
    }

  }

}



//
// is Entry Valid
//
Wordblocks.prototype.isEntryValid = function isEntryValid(word, orientation, x, y) {

  let valid_placement = 1;

  x = parseInt(x);
  y = parseInt(y);

  for (let i = 0; i < word.length; i++) {

    let boardslot = "";
    let letter = word[i].toUpperCase();

    if (orientation == "horizontal") { boardslot = y + "_" + (x+i); }
    if (orientation == "vertical") { boardslot = (y+i) + "_" + x; }

    if (this.game.board[boardslot].letter != "_") { 
      if (this.game.board[boardslot].letter != letter) { 
console.log(letter + " -- " + boardslot + " -- AND LETTER ---> " + this.game.board[boardslot].letter + " and orientation: " + orientation);
        valid_placement = 0;
      }
    }
  }

  if (valid_placement == 0) { alert("This is an invalid placement!"); }

  return valid_placement;

}



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

    if (orientation == "horizontal") { boardslot = y + "_" + (x+i); }
    if (orientation == "vertical") { boardslot = (y+i) + "_" + x; }

    this.game.board[boardslot].fresh = 0;

  }

  //this.saveGame(this.game.id);

}



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

    if (orientation == "horizontal") { boardslot = y + "_" + (x+i); }
    if (orientation == "vertical") { boardslot = (y+i) + "_" + x; }
    divname = "#"+boardslot;

    if (this.game.board[boardslot].letter != "_") {
      if (this.game.board[boardslot].letter != letter) {
        this.game.board[boardslot].letter = letter;
	$(divname).html(this.returnTile(letter));
      }
    } else {
      this.game.board[boardslot].letter = letter;
      $(divname).html(this.returnTile(letter));
    }
  }

  $('.tile').css('height',this.scale(163)+"px");
  $('.tile').css('width',this.scale(148)+"px");

}



//////////////////
// Return Board //
//////////////////
Wordblocks.prototype.returnBoard = function returnBoard() {

  var board = {};

  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
      let divname = (i+1) + "_" + (j+1);
      board[divname] = { letter: "_" , fresh : 1 }
    }
  }

  return board;

}


/////////////////
// Return Deck //
/////////////////
Wordblocks.prototype.returnDeck = function returnDeck() {

  var deck = {};

  deck['1']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['2']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['3']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['4']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['5']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['6']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['7']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['8']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['9']   = { img : "/wordblocks/img/A.jpg" , name : "A" };
  deck['10']  = { img : "/wordblocks/img/B.jpg" , name : "B" };

  deck['11']   = { img : "/wordblocks/img/B.jpg" , name : "B" };
  deck['12']   = { img : "/wordblocks/img/C.jpg" , name : "C" };
  deck['13']   = { img : "/wordblocks/img/C.jpg" , name : "C" };
  deck['14']   = { img : "/wordblocks/img/D.jpg" , name : "D" };
  deck['15']   = { img : "/wordblocks/img/D.jpg" , name : "D" };
  deck['16']   = { img : "/wordblocks/img/D.jpg" , name : "D" };
  deck['17']   = { img : "/wordblocks/img/D.jpg" , name : "D" };
  deck['18']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['19']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['20']   = { img : "/wordblocks/img/E.jpg" , name : "E" };

  deck['21']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['22']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['23']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['24']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['25']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['26']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['27']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['28']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['29']   = { img : "/wordblocks/img/E.jpg" , name : "E" };
  deck['30']   = { img : "/wordblocks/img/F.jpg" , name : "F" };

  deck['41']   = { img : "/wordblocks/img/F.jpg" , name : "F" };
  deck['42']   = { img : "/wordblocks/img/G.jpg" , name : "G" };
  deck['43']   = { img : "/wordblocks/img/G.jpg" , name : "G" };
  deck['44']   = { img : "/wordblocks/img/G.jpg" , name : "G" };
  deck['45']   = { img : "/wordblocks/img/H.jpg" , name : "H" };
  deck['46']   = { img : "/wordblocks/img/H.jpg" , name : "H" };
  deck['47']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['48']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['49']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['50']   = { img : "/wordblocks/img/I.jpg" , name : "I" };

  deck['51']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['52']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['53']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['54']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['55']   = { img : "/wordblocks/img/I.jpg" , name : "I" };
  deck['56']   = { img : "/wordblocks/img/J.jpg" , name : "J" };
  deck['57']   = { img : "/wordblocks/img/K.jpg" , name : "K" };
  deck['58']   = { img : "/wordblocks/img/L.jpg" , name : "L" };
  deck['59']   = { img : "/wordblocks/img/L.jpg" , name : "L" };
  deck['60']   = { img : "/wordblocks/img/L.jpg" , name : "L" };

  deck['61']   = { img : "/wordblocks/img/L.jpg" , name : "L" };
  deck['62']   = { img : "/wordblocks/img/M.jpg" , name : "M" };
  deck['63']   = { img : "/wordblocks/img/M.jpg" , name : "M" };
  deck['64']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['65']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['66']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['67']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['68']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['69']   = { img : "/wordblocks/img/N.jpg" , name : "N" };
  deck['70']   = { img : "/wordblocks/img/O.jpg" , name : "O" };

  deck['71']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['72']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['73']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['74']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['75']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['76']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['77']   = { img : "/wordblocks/img/O.jpg" , name : "O" };
  deck['78']   = { img : "/wordblocks/img/P.jpg" , name : "P" };
  deck['79']   = { img : "/wordblocks/img/P.jpg" , name : "P" };
  deck['80']   = { img : "/wordblocks/img/Q.jpg" , name : "Q" };

  deck['81']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['82']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['83']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['84']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['85']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['86']   = { img : "/wordblocks/img/R.jpg" , name : "R" };
  deck['87']   = { img : "/wordblocks/img/S.jpg" , name : "S" };
  deck['88']   = { img : "/wordblocks/img/S.jpg" , name : "S" };
  deck['89']   = { img : "/wordblocks/img/S.jpg" , name : "S" };
  deck['90']   = { img : "/wordblocks/img/S.jpg" , name : "S" };

  deck['91']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['92']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['93']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['94']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['95']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['96']   = { img : "/wordblocks/img/T.jpg" , name : "T" };
  deck['97']   = { img : "/wordblocks/img/U.jpg" , name : "U" };
  deck['98']   = { img : "/wordblocks/img/U.jpg" , name : "U" };
  deck['99']   = { img : "/wordblocks/img/U.jpg" , name : "U" };
  deck['100']  = { img : "/wordblocks/img/U.jpg" , name : "U" };

  deck['101']  = { img : "/wordblocks/img/V.jpg" , name : "V" };
  deck['102']  = { img : "/wordblocks/img/V.jpg" , name : "V" };
  deck['103']  = { img : "/wordblocks/img/W.jpg" , name : "W" };
  deck['104']  = { img : "/wordblocks/img/W.jpg" , name : "W" };
  deck['105']  = { img : "/wordblocks/img/X.jpg" , name : "X" };
  deck['106']  = { img : "/wordblocks/img/U.jpg" , name : "U" };
  deck['107']  = { img : "/wordblocks/img/Y.jpg" , name : "Y" };
  deck['108']  = { img : "/wordblocks/img/Y.jpg" , name : "Y" };
  deck['109']  = { img : "/wordblocks/img/Z.jpg" , name : "Z" };

  return deck;

}
Wordblocks.prototype.returnLetters = function returnLetters() {

  var letters = {};

  letters['A']  = { score : 1 };
  letters['B']  = { score : 3 };
  letters['C']  = { score : 2 };
  letters['D']  = { score : 2 };
  letters['E']  = { score : 1 };
  letters['F']  = { score : 2 };
  letters['G']  = { score : 2 };
  letters['H']  = { score : 1 };
  letters['I']  = { score : 1 };
  letters['J']  = { score : 8 };
  letters['K']  = { score : 4 };
  letters['L']  = { score : 2 };
  letters['M']  = { score : 4 };
  letters['N']  = { score : 1 };
  letters['O']  = { score : 1 };
  letters['P']  = { score : 2 };
  letters['Q']  = { score : 10 };
  letters['R']  = { score : 1 };
  letters['S']  = { score : 1 };
  letters['T']  = { score : 1 };
  letters['U']  = { score : 2 };
  letters['V']  = { score : 3 };
  letters['W']  = { score : 2 };
  letters['X']  = { score : 8 };
  letters['Y']  = { score : 2 };
  letters['Z']  = { score : 10 };

  return letters;
}
Wordblocks.prototype.returnBonus = function returnBonus(pos) {

  let bonus = "";

  if (pos == "1_1")   { return "3L"; }
  if (pos == "1_15")  { return "3L"; }
  if (pos == "3_8")   { return "3L"; }
  if (pos == "8_3")   { return "3L"; }
  if (pos == "8_13")  { return "3L"; }
  if (pos == "13_8")  { return "3L"; }
  if (pos == "15_1")  { return "3L"; }
  if (pos == "15_15") { return "3L"; }

  if (pos == "2_2")   { return "3W"; }
  if (pos == "2_14")  { return "3W"; }
  if (pos == "8_8")   { return "3W"; }
  if (pos == "14_2")  { return "3W"; }
  if (pos == "14_14") { return "3W"; }

  if (pos == "1_5")   { return "2L"; }
  if (pos == "1_11")  { return "2L"; }
  if (pos == "3_4")   { return "2L"; }
  if (pos == "3_12")  { return "2L"; }
  if (pos == "4_3")   { return "2L"; }
  if (pos == "4_13")  { return "2L"; }
  if (pos == "5_1")   { return "2L"; }
  if (pos == "5_15")  { return "2L"; }
  if (pos == "11_1")  { return "2L"; }
  if (pos == "11_15") { return "2L"; }
  if (pos == "12_3")  { return "2L"; }
  if (pos == "12_13") { return "2L"; }
  if (pos === "13_4")  { return "2L"; }
  if (pos === "13_12") { return "2L"; }
  if (pos == "15_5")  { return "2L"; }
  if (pos == "15_11") { return "2L"; }

  if (pos == "1_8")   { return "2W"; }
  if (pos == "4_6")   { return "2W"; }
  if (pos == "4_10")   { return "2W"; }
  if (pos == "6_4")   { return "2W"; }
  if (pos == "6_12")  { return "2W"; }
  if (pos == "8_1")   { return "2W"; }
  if (pos == "8_15")  { return "2W"; }
  if (pos == "10_4")   { return "2W"; }
  if (pos == "10_12")  { return "2W"; }
  if (pos == "12_6")  { return "2W"; }
  if (pos == "12_10")  { return "2W"; }
  if (pos == "15_8")  { return "2W"; }

  return bonus;
}


////////////////
// Score Word //
////////////////
Wordblocks.prototype.scoreWord = function scoreWord(word, player, orientation, x, y) {

  let score = 0;

  x = parseInt(x);
  y = parseInt(y);

  //
  // find the start of the word
  //
  if (orientation == "horizontal") {

    let beginning_of_word = x;
    let end_of_word = x;

    //
    // find the beginning of the word
    //
    let current_x = parseInt(x)-1;
    let current_y = y;
    let boardslot = y+"_"+current_x;
    let divname = "#"+boardslot;

    if (current_x < 1) { beginning_of_word = 1; } else {
      while (this.game.board[boardslot].letter != "_" && current_x >= 1) {
        beginning_of_word = current_x;
        current_x--;
        boardslot = y+"_"+current_x;
        divname = "#"+boardslot;
	if (current_x < 1) { break; }
      }
    }   
    //
    // find the end of the word
    //
    current_x = parseInt(x)+1;
    current_y = y;
    boardslot = y+"_"+current_x;
    divname = "#"+boardslot;

    if (current_x <= 15) {
      while (this.game.board[boardslot].letter != "_" && current_x <= 15) {
        end_of_word = current_x;
        current_x++;
        boardslot = y+"_"+current_x;
        divname = "#"+boardslot;
        if (current_x > 15) { break; }
      }
    }

    let word_bonus = 1;

    //
    // score this word
    //
    for (let i = beginning_of_word, k = 0; i <= end_of_word; i++) {
      boardslot = y+"_"+i;

      let tmpb = this.returnBonus(boardslot);
      let letter_bonus = 1;

      if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) { word_bonus = 3; }
      if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) { word_bonus = 2; }
      if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 3; }
      if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 2; }

      let thisletter = this.game.board[boardslot].letter;
      score += (this.letters[thisletter].score * letter_bonus);
    }

    score *= word_bonus;


alert("Beginning: " + beginning_of_word + " -- Ending: " + end_of_word + " --- Score: " + score); 


    //
    // now score vertical words 
    //
    for (let i = x; i < (x+word.length); i++) {

      boardslot = y + "_" + i;

      if (this.game.board[boardslot].fresh == 1) {

	let orth_start = parseInt(y);
	let orth_end   = parseInt(y);

        //
        // find the beginning of the word
        //
        current_x = i;
        current_y = orth_start-1;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;

        if (current_y == 0) {

	  orth_start = 1;

        } else {

          while (this.game.board[boardslot].letter != "_" && current_y > 0) {
            orth_start = current_y;
            current_y--;
            boardslot = current_y+"_"+current_x;
            divname = "#"+boardslot;

	    if (current_y < 1) { break; }

          }

	}

        //
        // find the end of the word
        //
        current_y = orth_end+1;
        current_x = i;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;

	if (current_y > 15) {

	  orth_end = 15;

	} else {

          while (this.game.board[boardslot].letter != "_" && current_y <= 15) {
            end_of_word = current_y;
            current_y++;
            boardslot = current_y+"_"+current_x;
	    if (current_y > 15) { break; }
          }

	}

	let wordscore = 0;
	let word_bonus = 1;

        //
        // score this word
        //
        if (orth_start != orth_end) {
          for (let i = orth_start, k = 0; i <= orth_end; i++) {
            boardslot = i+"_"+x;

            let tmpb = this.returnBonus(boardslot);
            let letter_bonus = 1;

            if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) { word_bonus = 3; }
            if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) { word_bonus = 2; }
            if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 3; }
            if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 2; }


            let thisletter = this.game.board[boardslot].letter;

console.log(thisletter + ": " + this.letters[thisletter].score);

            wordscore += (this.letters[thisletter].score * letter_bonus);
          }
	  score += (wordscore * word_bonus);
        }
      }
    }
  }






  if (orientation == "vertical") {

alert("VERTICAL SOCRING!");

    let beginning_of_word = y;
    let end_of_word = y;

    //
    // find the beginning of the word
    //
    let current_x = parseInt(x); 
    let current_y = parseInt(y)-1;
    let boardslot = y+"_"+current_x;
    let divname = "#"+boardslot;

    if (current_y <= 0) { beginning_of_word = 1; } else {
      while (this.game.board[boardslot].letter != "_" && current_y > 0) {
        beginning_of_word = current_y;
        current_y--;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;
	if (current_y <= 0) { break; }
      }
    }

alert("BOW: " + beginning_of_word + " -- " + end_of_word);

    //
    // find the end of the word
    //
    current_x = parseInt(x);
    current_y = parseInt(y)+1;
    boardslot = current_y+"_"+current_x;
    divname = "#"+boardslot;

   if (current_y > 15) {
     end_of_word = 15;
   } else {
     while (this.game.board[boardslot].letter != "_" && current_y <= 15) {
        end_of_word = current_y;
        current_y++;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;
	if (current_y > 15) { break; }
      }
    }

    let word_bonus = 1;

    //
    // score this word
    //
    for (let i = beginning_of_word, k = 0; i <= end_of_word; i++) {

      boardslot = i+"_"+x;

      let tmpb = this.returnBonus(boardslot);
      let letter_bonus = 1;

if (tmpb != "") { alert("BONUS: " + tmpb + " -- " + boardslot); }

      if (tmpb == "3W" && this.game.board[boardslot].fresh == 1) { word_bonus = 3; }
      if (tmpb == "2W" && this.game.board[boardslot].fresh == 1) { word_bonus = 2; }
      if (tmpb == "3L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 3; }
      if (tmpb == "2L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 2; }

      let thisletter = this.game.board[boardslot].letter;
      score += (this.letters[thisletter].score * letter_bonus);
    }


    //
    // now score horizontal words 
    //
    for (let i = y; i < (y+word.length); i++) {

      boardslot = i + "_" + x;

      if (this.game.board[boardslot].fresh == 1) {

	let orth_start = parseInt(x);
	let orth_end   = parseInt(x);

        //
        // find the beginning of the word
        //
        current_x = orth_start-1;
        current_y = i;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;

        if (current_x < 1) {

	  orth_start = 1;

        } else {

          while (this.game.board[boardslot].letter != "_" && current_x > 0) {
            orth_start = current_x;
            current_x--;
            boardslot = current_y+"_"+current_x;
            divname = "#"+boardslot;
	    if (current_x < 1) { break; }
          }

	}

        //
        // find the end of the word
        //
        current_x = orth_end+1;
        current_y = i;
        boardslot = current_y+"_"+current_x;
        divname = "#"+boardslot;

	if (current_x > 15) {

	  orth_end = 15;

	} else {

          while (this.game.board[boardslot].letter != "_" && current_x < 15) {
            end_of_word = current_x;
            current_x++;
            boardslot = current_y+"_"+current_x;
	    if (current_x > 15) { break; }
          }

	}

	let wordscore = 0;
	let word_bonus = 1;


        //
        // score this word
        //
	if (orth_start != orth_end) {
          for (let i = orth_start, k = 0; i <= orth_end; i++) {

            boardslot = y+"_"+i;
  
            let tmpb = this.returnBonus(boardslot);
            let letter_bonus = 1;

if (tmpb != "") { alert("BONUS: " + tmpb + " -- " + boardslot); }

            if (tmpb === "3W" && this.game.board[boardslot].fresh == 1) { word_bonus = 3; }
            if (tmpb === "2W" && this.game.board[boardslot].fresh == 1) { word_bonus = 2; }
            if (tmpb === "3L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 3; }
            if (tmpb === "2L" && this.game.board[boardslot].fresh == 1) { letter_bonus = 2; }

            let thisletter = this.game.board[boardslot].letter;
            wordscore += (this.letters[thisletter].score * letter_bonus);
          }

alert("HORIZONTAL WORD SCORE: " + wordscore + " ---- " + orth_start + " -- " + orth_end);

	  score += (wordscore * word_bonus);
        }
      }
    }
  }

  return score;

}




//
// Core Game Logic
//
Wordblocks.prototype.handleGame = function handleGame(msg=null) {

  let wordblocks_self = this;

  //
  // show board and tiles
  //
  this.showTiles();
  this.addEventsToBoard();


  ///////////
  // QUEUE //
  ///////////
  if (this.game.queue.length > 0) {

      //
      // save before we start executing the game queue
      //
      wordblocks_self.saveGame(wordblocks_self.game.id);

      let qe = this.game.queue.length-1;
      let mv = this.game.queue[qe].split("\t");
      let shd_continue = 1;

      //
      // place word player x y [horizontal/vertical]
      //
      if (mv[0] == "place") {

	let word   = mv[1];
	let player = mv[2];
	let x      = mv[3];
	let y      = mv[4];
	let orient = mv[5];

	let score = 0;

	if (player != wordblocks_self.game.player) {
	  this.addWordToBoard(word, orient, x, y);
	  score = this.scoreWord(word, player, orient, x, y);
	  this.exhaustWord(word, orient, x, y);
	  this.addScoreToPlayer(player, score);
	}


	if (wordblocks_self.game.player == wordblocks_self.returnNextPlayer()) {
	  this.updateStatus("Your turn!");
	}


        this.game.queue.splice(this.game.queue.length-1, 1);
	return 1; // remove word and wait for next
      }


      //
      // avoid infinite loops
      //
      if (shd_continue == 0) { 
        console.log("NOT CONTINUING");
        return 0; 
      }

  } // if cards in queue

  return 1;

}



Wordblocks.prototype.addScoreToPlayer = function addScoreToPlayer(player, score) {

  if (this.browser_active == 0) { return; }
  let divname = "#score_"+player;
  $(divname).html((parseInt($(divname).html()) + score));

}



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
  expressapp.get('/wordblocks/img/:imagefile', function (req, res) {
    var imgf = '/web/img/'+req.params.imagefile;
    if (imgf.indexOf("\/") != false) { return; }
    res.sendFile(__dirname + imgf);
    return;
  });

}




Wordblocks.prototype.addMove = function addMove(mv) {
  this.moves.push(mv);
}

Wordblocks.prototype.endTurn = function endTurn() {

  this.updateStatus("Waiting for information from peers....");
 
  let extra = {};
      extra.target = this.returnNextPlayer(this.game.player);
  this.game.turn = this.moves;
  this.sendMessage("game", extra);
  this.moves = [];
  this.saveGame(this.game.id);

}

