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
  this.description = `Wordblocks is a word game in which two to four players score points by placing tiles bearing a single letter onto a board divided into a 15×15 grid of squares. The tiles must form words that, in crossword fashion, read left to right in rows or downward in columns, and be included in a standard dictionary or lexicon.`;
  this.browser_active = 0;
  this.handlesEmail = 1;
  this.emailAppName = "Wordblocks";
  this.maxPlayers = 4;
  this.useHUD = 1;
  // this.addHUDMenu = ['Tiles', 'Score', 'Lang'];

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
  this.last_played_word = {player: '', finalword: '', score: ''};
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
  if (!this.app.browser.isMobileBrowser(navigator.userAgent)) {
    const chat = this.app.modules.returnModule("Chat");
    chat.addPopUpChat();
  }
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

  resizeBoard = function resizeBoard(app) {

    if (this.window && !app.browser.isMobileBrowser(navigator.userAgent)) {

      // let height = this.window.innerHeight;
      // let width = this.window.innerWidth;

      let height = this.screen.height;
      let width = this.screen.width;

      if (width < 900) {
        if (width > 500) {
          $('.main').css('zoom', (width / 905));
          $('.rack').css('zoom', (width / 905));
          $('h').css('zoom', (width / 905));
        } else {
          $('.main').css('zoom', 500 / 900);
          $('.rack').css('zoom', 500 / 900);
          $('#tiles > div.tile').css('zoom', 500 / 900);
        }
      }

      if (height < 900) {
        if (height > 500) {
          $('.main').css('zoom', (height / 905));
          $('.rack').css('zoom', (height / 905));
          $('#tiles > div.tile').css('zoom', (height / 905));
        } else {
          $('.main').css('zoom', 500 / 900);
          $('.rack').css('zoom', 500 / 900);
          $('#tiles > div.tile').css('zoom', 500 / 900);
        }
      }

      if (height > 900 && width > 900) {
        $('.main').css('zoom', 1);
        $('.rack').css('zoom', 1);
        $('#tiles > div.tile').css('zoom', 1);
      }

      if (height < 1125) {
        $('#controls').addClass('fixedbottom');
        $('.main').addClass('mainfixedbottom');
      } else {
        $('#controls').removeClass('fixedbottom');
        $('.main').removeClass('mainfixedbottom');
      }
    }
  };



  responsive = function responsive() {

  };

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
  
  var op = 0;
  for (let i = 0; i < players; i++) {
    let this_player = i + 1;

    if (this.game.player == this_player) {
      html += `
        <div class="player">
          <span class="player_name">Your Score</span>
          <span id="score_${this_player}"> ${this.game.score[i]} </span>
        </div>
      `;
    } else {
      //let opponent = await this.app.dns.fetchIdentifierPromise(this.game.opponents[op]);
      let opponent = this.game.opponents[op];
      op++;
      html += `
        <div class="player">
          <span class="player_name">${opponent.substring(0,16)}</span>
          <span id="score_${this_player}"> ${this.game.score[i]} </span>
        </div>
      `;
    }
  }

  if (this.browser_active == 1) {
    $('.score').html(html);
  }

  //
  // who can go?
  //


  

  if (this.game.target == this.game.player) {
    this.updateStatusWithTiles("YOUR TURN: click on the board to place tiles, or <span class=\"link tosstiles\">discard tiles</span>.");
    this.enableEvents();
  } else {
    this.updateStatusWithTiles(`Waiting for Player ${this.game.target} to move.`);
    this.disableEvents();
  }

  //
  // return letters
  //


  this.letters = this.returnLetters();

  //
  // initialize interface
  //

  resizeBoard(this.app);

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
  $('#tiles').disableSelection();
  $(window).resize(function () {
    resizeBoard();
  });

  var element = document.getElementById('gameboard');
  if (element !== null) {
    var hammertime = new Hammer(element, {});

    hammertime.get('pinch').set({ enable: true });
    hammertime.get('pan').set({ threshold: 0 });

    var fixHammerjsDeltaIssue = undefined;
    var pinchStart = { x: undefined, y: undefined }
    var lastEvent = undefined;

    var originalSize = {
      width: window.screen.width,
      height: window.screen.width
    }

    var current = {
      x: 0,
      y: 0,
      z: 1,
      zooming: false,
      width: originalSize.width * 1,
      height: originalSize.height * 1,
    }

    var last = {
      x: current.x,
      y: current.y,
      z: current.z
    }

    function getRelativePosition(element, point, originalSize, scale) {
      var domCoords = getCoords(element);

      var elementX = point.x - domCoords.x;
      var elementY = point.y - domCoords.y;

      var relativeX = elementX / (originalSize.width * scale / 2) - 1;
      var relativeY = elementY / (originalSize.height * scale / 2) - 1;
      return { x: relativeX, y: relativeY }
    }

    function getCoords(elem) { // crossbrowser version
      var box = elem.getBoundingClientRect();

      var body = document.body;
      var docEl = document.documentElement;

      var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      var clientTop = docEl.clientTop || body.clientTop || 0;
      var clientLeft = docEl.clientLeft || body.clientLeft || 0;

      var top  = box.top +  scrollTop - clientTop;
      var left = box.left + scrollLeft - clientLeft;

      return { x: Math.round(left), y: Math.round(top) };
    }

    function scaleFrom(zoomOrigin, currentScale, newScale) {
      var currentShift = getCoordinateShiftDueToScale(originalSize, currentScale);
      var newShift = getCoordinateShiftDueToScale(originalSize, newScale)

      var zoomDistance = newScale - currentScale

      var shift = {
        x: currentShift.x - newShift.x,
        y: currentShift.y - newShift.y,
      }

      var output = {
        x: zoomOrigin.x * shift.x,
        y: zoomOrigin.y * shift.y,
        z: zoomDistance
      }
      return output
    }


    function getCoordinateShiftDueToScale(size, scale){
      var newWidth = scale * size.width;
      var newHeight = scale * size.height;
      var dx = (newWidth - size.width) / 2
      var dy = (newHeight - size.height) / 2
      return {
        x: dx,
        y: dy
      }
    }

    hammertime.on('pan', function(e) {
      if (lastEvent !== 'pan') {
        fixHammerjsDeltaIssue = {
          x: e.deltaX,
          y: e.deltaY
        }
      }

      current.x = last.x + e.deltaX - fixHammerjsDeltaIssue.x;
      current.y = last.y + e.deltaY - fixHammerjsDeltaIssue.y;
      lastEvent = 'pan';
      update();
    });

    hammertime.on('pinch', function(e) {
      var d = scaleFrom(pinchZoomOrigin, last.z, last.z * e.scale)

      let newX = d.x + last.x + e.deltaX;
      let newY = d.y + last.y + e.deltaY;
      let newZ = d.z + last.z;

      current.x = newX;
      current.y = newY;
      current.z = newZ;
      lastEvent = 'pinch';
      update();
    });

    var pinchZoomOrigin = undefined;
    hammertime.on('pinchstart', function(e) {
      pinchStart.x = e.center.x;
      pinchStart.y = e.center.y;
      pinchZoomOrigin = getRelativePosition(element, { x: pinchStart.x, y: pinchStart.y }, originalSize, current.z);
      lastEvent = 'pinchstart';
    });

    hammertime.on('panend', function(e) {
      last.x = current.x;
      last.y = current.y;
      lastEvent = 'panend';
    });

    hammertime.on('pinchend', function(e) {
      if ((originalSize.height * current.z) <= originalSize.height &&
        (originalSize.width * current.z) <= originalSize.width) {
        return;
      }

      last.x = current.x;
      last.y = current.y;
      last.z = current.z;
      lastEvent = 'pinchend';
    });

    function update() {
      // if (lastEvent !== 'pan') {
        if ((originalSize.height * current.z) < originalSize.height &&
          (originalSize.width * current.z) < originalSize.width) {
          if (current.z < 1) {
            element.style.transform = `translate3d(0, 0, 0) scale(1)`;
            current = {x: 0, y: 0, z: 1};
            last = {
              x: current.x,
              y: current.y,
              z: current.z
            }
            return;
          }
        }
      // }

      current.height = originalSize.height * current.z;
      current.width = originalSize.width * current.z;

      element.style.transform = "translate3d(" + current.x + "px, " + current.y + "px, 0) scale(" + current.z + ")";
    }
  }

  $('#game_status').on('click', () => {
    $('.log').hide();
    if (this.app.browser.isMobileBrowser(navigator.userAgent) && window.matchMedia("(orientation: portrait)").matches || window.innerHeight > 700) {
      $("#sizer").switchClass("fa-caret-up", "fa-caret-down");
      $("#hud").switchClass("short", "tall", 150);
    } else {
      $("#sizer").switchClass("fa-caret-left", "fa-caret-right");
      $("#hud").switchClass("narrow", "wide", 150);
    }

    $('.hud_menu_overlay').hide();
    $('.status').show();
  });
};


Wordblocks.prototype.updateStatusWithTiles = function updateStatusWithTiles(status) {
  let tile_html ='';
  for (let i = 0; i < this.game.deck[0].hand.length; i++) {
    tile_html += this.returnTileHTML(this.game.deck[0].cards[this.game.deck[0].hand[i]].name);
  }
  let {player, finalword, score} = this.last_played_word;
  let last_move_html = finalword == '' ? '...' : `Player ${player} played ${finalword} for: ${score} points.`;
  let html =
  `
    <div>${status}</div>
    <div class="status_container">
      <div style="display: flex; font-size: 0.8rem;">
        <div id="remainder" class="remainder">Tiles left: ${this.game.deck[0].crypt.length}</div>
        <div id="lastmove" class="lastmove">
        ${last_move_html}
        </div>
      </div>
      <div class="rack" id="rack">
        <div class="tiles" id="tiles">
          ${tile_html}
        </div>
        <img id="shuffle" class="shuffle" src="/wordblocks/img/reload.png">
      </div>
      <div class="score" id="score">loading...</div>
    </div
  `
  $('.status').html(html);
  this.calculateScore();
  this.enableEvents();
}


Wordblocks.prototype.calculateScore = async function calculateScore() {
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

  var op = 0;
  for (let i = 0; i < players; i++) {
    let this_player = i + 1;

    if (this.game.player == this_player) {
      html += `
        <div class="player">
          <span class="player_name">Your Score</span>
          <span class="player_score" id="score_${this_player}"> ${this.game.score[i]} </span>
        </div>
      `;
    } else {
      //let opponent = await this.app.dns.fetchIdentifierPromise(this.game.opponents[op]);
      let opponent = this.game.opponents[op];
      op++;
      html += `
        <div class="player">
          <span class="player_name">${opponent.substring(0,16)}</span>
          <span class="player_score" id="score_${this_player}"> ${this.game.score[i]} </span>
        </div>
      `;
    }
  }

  if (this.browser_active == 1) {
    $('.score').html(html);
  }
}


/////////////////
// Return Tile //
/////////////////


Wordblocks.prototype.returnTileHTML = function returnTileHTML(letter) {
  let html = "";
  let letterScore = this.returnLetters();

  if (letter == "A") {html = '<div class="tile A sc' + letterScore["A"].score + '">A</div>';}
  if (letter == "B") {html = '<div class="tile B sc' + letterScore["B"].score + '">B</div>';}
  if (letter == "C") {html = '<div class="tile C sc' + letterScore["C"].score + '">C</div>';}
  if (letter == "D") {html = '<div class="tile D sc' + letterScore["D"].score + '">D</div>';}
  if (letter == "E") {html = '<div class="tile E sc' + letterScore["E"].score + '">E</div>';}
  if (letter == "F") {html = '<div class="tile F sc' + letterScore["F"].score + '">F</div>';}
  if (letter == "G") {html = '<div class="tile G sc' + letterScore["G"].score + '">G</div>';}
  if (letter == "H") {html = '<div class="tile H sc' + letterScore["H"].score + '">H</div>';}
  if (letter == "I") {html = '<div class="tile I sc' + letterScore["I"].score + '">I</div>';}
  if (letter == "J") {html = '<div class="tile J sc' + letterScore["J"].score + '">J</div>';}
  if (letter == "K") {html = '<div class="tile K sc' + letterScore["K"].score + '">K</div>';}
  if (letter == "L") {html = '<div class="tile L sc' + letterScore["L"].score + '">L</div>';}
  if (letter == "M") {html = '<div class="tile M sc' + letterScore["M"].score + '">M</div>';}
  if (letter == "N") {html = '<div class="tile N sc' + letterScore["N"].score + '">N</div>';}
  if (letter == "O") {html = '<div class="tile O sc' + letterScore["O"].score + '">O</div>';}
  if (letter == "P") {html = '<div class="tile P sc' + letterScore["P"].score + '">P</div>';}
  if (letter == "Q") {html = '<div class="tile Q sc' + letterScore["Q"].score + '">Q</div>';}
  if (letter == "R") {html = '<div class="tile R sc' + letterScore["R"].score + '">R</div>';}
  if (letter == "S") {html = '<div class="tile S sc' + letterScore["S"].score + '">S</div>';}
  if (letter == "T") {html = '<div class="tile T sc' + letterScore["T"].score + '">T</div>';}
  if (letter == "U") {html = '<div class="tile U sc' + letterScore["U"].score + '">U</div>';}
  if (letter == "V") {html = '<div class="tile V sc' + letterScore["V"].score + '">V</div>';}
  if (letter == "W") {html = '<div class="tile W sc' + letterScore["W"].score + '">W</div>';}
  if (letter == "X") {html = '<div class="tile X sc' + letterScore["X"].score + '">X</div>';}
  if (letter == "Y") {html = '<div class="tile Y sc' + letterScore["Y"].score + '">Y</div>';}
  if (letter == "Z") {html = '<div class="tile Z sc' + letterScore["Z"].score + '">Z</div>';}
  return html;
};

Wordblocks.prototype.addTile = function (obj, letter) {
  if (letter !== "_") {
    //obj.css("background-image", "url(wordblocks/img/" + letter.toUpperCase() + ".jpg)");
    obj.find('.bonus').css('display', 'none');
    obj.append(this.returnTileHTML(letter));
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
    let html = `
      <div class="tile-placement-controls">
        <span class="action" id="horizontally"><i class="fas fa-arrows-alt-h"></i> horizontally</span>
        <span class="action" id="vertically"><i class="fas fa-arrows-alt-v"></i> vertically</span>
        <span class="action" id="cancel"><i class="far fa-window-close"></i> cancel</span>
      </div>`;
    let tmpx = divname.split("_");
    let y = tmpx[0];
    let x = tmpx[1];
    let orientation = "";
    let word = "";

    let offsetX = wordblocks_self.app.browser.isMobileBrowser(navigator.userAgent) ? 25 : 55;
    let offsetY = wordblocks_self.app.browser.isMobileBrowser(navigator.userAgent) ? 25 : 55;

    let greater_offsetX = wordblocks_self.app.browser.isMobileBrowser(navigator.userAgent) ? 135 : 155;
    let greater_offsetY = wordblocks_self.app.browser.isMobileBrowser(navigator.userAgent) ? 135 : 155;

    let left = $(this).offset().left + offsetX;
    let top = $(this).offset().top + offsetY;

    if (x > 8){ left -= greater_offsetX; }
    if (y > 8){ top -= greater_offsetY; }

    $('.tile-placement-controls').remove();
    if (wordblocks_self.app.browser.isMobileBrowser(navigator.userAgent)) {
      let tile_html ='';
      for (let i = 0; i < wordblocks_self.game.deck[0].hand.length; i++) {
        tile_html += wordblocks_self.returnTileHTML(wordblocks_self.game.deck[0].cards[wordblocks_self.game.deck[0].hand[i]].name);
      }
      let updated_status = `
      <div class="rack" id="rack">
        <div class="tiles" id="tiles">
          ${tile_html}
        </div>
        <img id="shuffle" class="shuffle" src="/wordblocks/img/reload.png">
      </div>
      ${html}
      `
      $('.status').html(updated_status);
      wordblocks_self.enableEvents();
    } else {
      $('body').append(html);
      $('.tile-placement-controls').addClass("active-status");
      $('.tile-placement-controls').css({"position": "absolute", "top": top, "left": left});
    }

    $('.action').off();
    $('.action').on('click', function () {

      let action2 = $(this).attr("id");

      if (action2 == "horizontally") {
        orientation = "horizontal";
      }

      if (action2 == "vertically") {
        orientation = "vertical";
      }

      if (action2 == "cancel") {
        $('.action').off();
        wordblocks_self.updateStatusWithTiles("Click on the board to place a letter from that square, or <span class=\"link tosstiles\">discard tiles</span> if you cannot move.");
        wordblocks_self.addEventsToBoard();
        return;
      }

      word = prompt("Provide your word:");

      if (word) {
        //
        // reset board
        //
        $('.tile-placement-controls').html('');
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
            wordblocks_self.updateStatusWithTiles(
              `Try again! Click on the board to place a letter from that square, or
              <span class="link tosstiles">discard tiles</span> if you cannot move.`
            );
            wordblocks_self.addEventsToBoard();
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
        } else {
          wordblocks_self.updateStatusWithTiles(
            `Word is not valid, try again! Click on the board to place a word, or
            <span class="link tosstiles">discard tiles</span>`
          );
          wordblocks_self.addEventsToBoard();
        }
      }
    });
  });

  $('#shuffle').on('click', function () {
    for (var i = $('#tiles').children.length; i >= 0; i--) {
      $('#tiles')[0].appendChild($('#tiles')[0].childNodes[Math.random() * i | 0]);
    }
  });
  $('#tiles').sortable();
  $('#tiles').disableSelection();
  $(window).resize(function () {
    resizeBoard();
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
      $(divname).find('.tile').remove();
      $(divname).find('.bonus').css("display", "block");
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
    deck['1'] = { name: "A" };
    deck['2'] = { name: "A" };
    deck['3'] = { name: "A" };
    deck['4'] = { name: "A" };
    deck['5'] = { name: "A" };
    deck['6'] = { name: "A" };
    deck['7'] = { name: "A" };
    deck['8'] = { name: "A" };
    deck['9'] = { name: "A" };
    deck['10'] = { name: "B" };
    deck['11'] = { name: "B" };
    deck['12'] = { name: "C" };
    deck['13'] = { name: "C" };
    deck['14'] = { name: "D" };
    deck['15'] = { name: "D" };
    deck['16'] = { name: "D" };
    deck['17'] = { name: "D" };
    deck['18'] = { name: "E" };
    deck['19'] = { name: "E" };
    deck['20'] = { name: "E" };
    deck['21'] = { name: "E" };
    deck['22'] = { name: "E" };
    deck['23'] = { name: "E" };
    deck['24'] = { name: "E" };
    deck['25'] = { name: "E" };
    deck['26'] = { name: "E" };
    deck['27'] = { name: "E" };
    deck['28'] = { name: "E" };
    deck['29'] = { name: "E" };
    deck['30'] = { name: "F" };
    deck['41'] = { name: "F" };
    deck['42'] = { name: "G" };
    deck['43'] = { name: "G" };
    deck['44'] = { name: "G" };
    deck['45'] = { name: "H" };
    deck['46'] = { name: "H" };
    deck['47'] = { name: "I" };
    deck['48'] = { name: "I" };
    deck['49'] = { name: "I" };
    deck['50'] = { name: "I" };
    deck['51'] = { name: "I" };
    deck['52'] = { name: "I" };
    deck['53'] = { name: "I" };
    deck['54'] = { name: "I" };
    deck['55'] = { name: "I" };
    deck['56'] = { name: "J" };
    deck['57'] = { name: "K" };
    deck['58'] = { name: "L" };
    deck['59'] = { name: "L" };
    deck['60'] = { name: "L" };
    deck['61'] = { name: "L" };
    deck['62'] = { name: "M" };
    deck['63'] = { name: "M" };
    deck['64'] = { name: "N" };
    deck['65'] = { name: "N" };
    deck['66'] = { name: "N" };
    deck['67'] = { name: "N" };
    deck['68'] = { name: "N" };
    deck['69'] = { name: "N" };
    deck['70'] = { name: "O" };
    deck['71'] = { name: "O" };
    deck['72'] = { name: "O" };
    deck['73'] = { name: "O" };
    deck['74'] = { name: "O" };
    deck['75'] = { name: "O" };
    deck['76'] = { name: "O" };
    deck['77'] = { name: "O" };
    deck['78'] = { name: "P" };
    deck['79'] = { name: "P" };
    deck['80'] = { name: "Q" };
    deck['81'] = { name: "R" };
    deck['82'] = { name: "R" };
    deck['83'] = { name: "R" };
    deck['84'] = { name: "R" };
    deck['85'] = { name: "R" };
    deck['86'] = { name: "R" };
    deck['87'] = { name: "S" };
    deck['88'] = { name: "S" };
    deck['89'] = { name: "S" };
    deck['90'] = { name: "S" };
    deck['91'] = { name: "T" };
    deck['92'] = { name: "T" };
    deck['93'] = { name: "T" };
    deck['94'] = { name: "T" };
    deck['95'] = { name: "T" };
    deck['96'] = { name: "T" };
    deck['97'] = { name: "U" };
    deck['98'] = { name: "U" };
    deck['99'] = { name: "U" };
    deck['100'] = { name: "U" };
    deck['101'] = { name: "V" };
    deck['102'] = { name: "V" };
    deck['103'] = { name: "W" };
    deck['104'] = { name: "W" };
    deck['105'] = { name: "X" };
    deck['106'] = { name: "U" };
    deck['107'] = { name: "Y" };
    deck['108'] = { name: "Y" };
    deck['109'] = { name: "Z" };
  return deck;
};

Wordblocks.prototype.returnLetters = function returnLetters() {
  var letters = {};
  letters['A'] = { score: 1 };
  letters['B'] = { score: 3 };
  letters['C'] = { score: 2 };
  letters['D'] = { score: 2 };
  letters['E'] = { score: 1 };
  letters['F'] = { score: 2 };
  letters['G'] = { score: 2 };
  letters['H'] = { score: 1 };
  letters['I'] = { score: 1 };
  letters['J'] = { score: 8 };
  letters['K'] = { score: 4 };
  letters['L'] = { score: 2 };
  letters['M'] = { score: 2 };
  letters['N'] = { score: 1 };
  letters['O'] = { score: 1 };
  letters['P'] = { score: 2 };
  letters['Q'] = { score: 10 };
  letters['R'] = { score: 1 };
  letters['S'] = { score: 1 };
  letters['T'] = { score: 1 };
  letters['U'] = { score: 2 };
  letters['V'] = { score: 3 };
  letters['W'] = { score: 2 };
  letters['X'] = { score: 8 };
  letters['Y'] = { score: 2 };
  letters['Z'] = { score: 10 };
  return letters;
};

Wordblocks.prototype.returnBonus = function returnBonus(pos) {
  let bonus = "";

  if (pos == "1_1") { return "3L"; }
  if (pos == "1_15") { return "3L"; }
  if (pos == "3_8") { return "3L"; }
  if (pos == "8_3") { return "3L"; }
  if (pos == "8_13") { return "3L"; }
  if (pos == "13_8") { return "3L"; }
  if (pos == "15_1") { return "3L"; }
  if (pos == "15_15") { return "3L"; }
  if (pos == "2_2") { return "3W"; }
  if (pos == "2_14") { return "3W"; }
  if (pos == "8_8") { return "3W"; }
  if (pos == "14_2") { return "3W"; }
  if (pos == "14_14") { return "3W"; }
  if (pos == "1_5") { return "2L"; }
  if (pos == "1_11") { return "2L"; }
  if (pos == "3_4") { return "2L"; }
  if (pos == "3_12") { return "2L"; }
  if (pos == "4_3") { return "2L"; }
  if (pos == "4_13") { return "2L"; }
  if (pos == "5_8") { return "2L"; }
  if (pos == "5_1") { return "2L"; }
  if (pos == "5_15") { return "2L"; }
  if (pos == "8_5") { return "2L"; }
  if (pos == "8_11") { return "2L"; }
  if (pos == "11_1") { return "2L"; }
  if (pos == "11_8") { return "2L"; }
  if (pos == "11_15") { return "2L"; }
  if (pos == "12_3") { return "2L"; }
  if (pos == "12_13") { return "2L"; }
  if (pos === "13_4") { return "2L"; }
  if (pos === "13_12") { return "2L"; }
  if (pos == "15_5") { return "2L"; }
  if (pos == "15_11") { return "2L"; }
  if (pos == "1_8") { return "2W"; }
  if (pos == "4_6") { return "2W"; }
  if (pos == "4_10") { return "2W"; }
  if (pos == "6_4") { return "2W"; }
  if (pos == "6_12") { return "2W"; }
  if (pos == "8_1") { return "2W"; }
  if (pos == "8_15") { return "2W"; }
  if (pos == "10_4") { return "2W"; }
  if (pos == "10_12") { return "2W"; }
  if (pos == "12_6") { return "2W"; }
  if (pos == "12_10") { return "2W"; }
  if (pos == "15_8") { return "2W"; }
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
  $('#lastmove').html(`Player ${player} played ${finalword} for: ${score} points.`);
  $('#remainder').html(`Tiles left: ${this.game.deck[0].crypt.length}`);
  this.last_played_word = {player, finalword, score};
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
      //lets end this

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

      if (wordblocks_self.browser_active == 1) {
        this.disableEvents();
        var result = `Game Over -- Player ${wordblocks_self.game.winner} Wins!`;

        if (idx < 0) {
          result = "It's a tie! Well done everyone!";
        }

        wordblocks_self.updateStatus(result);
        wordblocks_self.updateLog(result);
      }

      this.game.queue.splice(this.game.queue.length - 1, 1);
      return 0;
    }

    if (mv[0] === "endgame") {
      //this.moves;
      this.game.queue.splice(this.game.queue.length - 1, 1);
      this.addMove("gameover");
      return 1;
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
        //this.updateStatus("Game Over");
        return;
      }

      if (wordblocks_self.game.player == wordblocks_self.returnNextPlayer(player)) {
        if (wordblocks_self.checkForEndGame() == 1) {
          return;
        }

        wordblocks_self.updateStatusWithTiles("YOUR TURN: click on the board to place tiles, or <span class=\"link tosstiles\">discard tiles</span>.");
        wordblocks_self.enableEvents();
      } else {
        wordblocks_self.updateStatusWithTiles("Player " + wordblocks_self.returnNextPlayer(player) + " turn");
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
        wordblocks_self.updateStatusWithTiles("YOUR TURN: click on the board to place tiles, or <span class=\"link tosstiles\">discard tiles</span>.");
        wordblocks_self.enableEvents();
      } else {
        wordblocks_self.updateStatusWithTiles("Player " + wordblocks_self.returnNextPlayer(player) + " turn");
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
    this.addMove("endgame");
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
  this.updateStatusWithTiles("Waiting for information from peers....");
  let extra = {};
  extra.target = this.returnNextPlayer(this.game.player);
  this.game.turn = this.moves;
  this.moves = [];
  this.sendMessage("game", extra);
};