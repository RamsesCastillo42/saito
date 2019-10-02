var saito = require('../../lib/saito/saito');
var ModTemplate = require('../../lib/templates/game');
var util = require('util');

var this_chess = null;
var chess = null;
var chessboard = null;

//////////////////
// CONSTRUCTOR  //
//////////////////
function Chessgame(app) {

  if (!(this instanceof Chessgame)) { return new Chessgame(app); }

  Chessgame.super_.call(this);

  this.app = app;

  this.publickey = app.wallet.returnPublicKey();

  this.name = "Chess";
  this.description = "Chess is a two-player strategy board game played on a checkered board with 64 squares arranged in an 8×8 grid."
  this.browser_active = 0;
  this.handlesEmail = 1;
  this.emailAppName = "Chess";

  this.game = {};
  this.board = null;
  this.engine = null;

  //#this.game.captured = {}

  //#this.game.captured.white = "";
  //#this.game.captured.black = "";

  this_chess = this;

  return this;

}
module.exports = Chessgame;
util.inherits(Chessgame, ModTemplate);








////////////////////
// initializeGame //
////////////////////
Chessgame.prototype.initializeGame = async function initializeGame(game_id) {


  console.log('######################################################');
  console.log('######################################################');
  console.log('######################         #######################');
  console.log('######################  CHESS  #######################');
  console.log('######################         #######################');
  console.log('######################################################');
  console.log('######################################################');

  if (this.browser_active == 1) {

    // enable chat

    if (!this.app.browser.isMobileBrowser(navigator.userAgent)) {
      const chat = this.app.modules.returnModule("Chat");
      chat.addPopUpChat();
    }

    chess = require('chess.js');
    chessboard = require("../chess/web/chessboard");
    this.board = new chessboard('board', { pieceTheme: 'chess/pieces/{piece}.png' });
    this.engine = new chess.Chess();
  }

  //
  // load this.game object
  //
  this.loadGame(game_id);

  /*if (this.game.captured == undefined) {
    this.game.captured = {}

    this.game.captured.white = "";
    this.game.captured.black = "";

  }
*/

  //
  // finish initializing
  //
  if (this.game.initializing == 1) {

    this.game.initializing = 0;
    this.saveGame(this.game.id);

    //
    // email ourselves
    //
    let title = this.emailAppName + " Game Ready";
    let data = 'Your game of ' + this.emailAppName + ' is ready to play!<p></p><div id="' + this.game.id + '_' + this.game.module + '" class="open_game link">Click here to play your game.</div>';
    let newtx = new saito.transaction();
    let email_self = this.app.modules.returnModule("Email");
    newtx.transaction.ts = new Date().getTime();
    newtx.transaction.from = [];
    newtx.transaction.to = [];
    newtx.transaction.from.push(new saito.slip(this.app.wallet.returnPublicKey()));
    newtx.transaction.to.push(new saito.slip(this.app.wallet.returnPublicKey()));
    email_self.receiveMail(title, data, newtx, function () { });

  }

  if (this.browser_active == 1) {

    if (this.game.position != undefined) {
      this.engine.load(this.game.position);
    } else {
      this.game.position = this.engine.fen();
    }

    if (this.game.target == this.game.player) {
      this.setBoard(this.engine.fen());
    } else {
      this.lockBoard(this.engine.fen());
    }

    var opponent = this.game.opponents[0];

    if (this.app.crypto.isPublicKey(opponent)) {
      if (this.app.keys.returnIdentifierByPublicKey(opponent).length >= 6) {
        opponent = this.app.keys.returnIdentifierByPublicKey(opponent);
      }
      else {
        try {
          opponent = await this.app.dns.fetchIdentifierPromise(opponent);
        }
        catch (err) {
          console.log(err);
        }
      }
    }

    $('#opponent_id').html(opponent);
    this.updateStatusMessage();
    this.attachEvents();

  }

}




////////////////
// handleGame //
////////////////
Chessgame.prototype.handleGame = function handleGame(msg) {

  if (msg.extra == undefined) {
    console.log("NO MESSAGE DEFINED!");
    return;
  }
  if (msg.extra.data == undefined) {
    console.log("NO MESSAGE RECEIVED!");
    return;
  }

  //
  // the message we get from the other player
  // tells us the new board state, so we
  // update our own information and save the
  // game
  //
  let data = JSON.parse(msg.extra.data);
  this.game.position = data.position;
  this.game.target = msg.extra.target;

  /*  
    this.game.captured.white = data.captured.white;
    this.game.captured.black = data.captured.black;
  */
  if (msg.extra.target == this.game.player) {
    if (this.browser_active == 1) {
      this.setBoard(this.game.position);
      this.updateLog(data.move, 999);
      this.updateStatusMessage();
    }
  } else {
    if (this.browser_active == 1) {
      this.lockBoard(this.game.position);
    }
  }

  this.saveGame(this.game.id);

  return 0;

}



/////////////
// endTurn //
/////////////
Chessgame.prototype.endTurn = function endTurn(data) {

  let extra = {};
  extra.target = this.returnNextPlayer(this.game.player);
  extra.data = JSON.stringify(data);
  this.game.target = extra.target;
  this.sendMessage("game", extra);
  this.saveGame(this.game.id);
  this.updateLog(data.move, 999);
  this.updateStatusMessage();

}






///////////////
// webServer //
///////////////
Chessgame.prototype.webServer = function webServer(app, expressapp) {
  expressapp.get('/chess/', (req, res) => {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/chess/style.css', (req, res) => {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
  expressapp.get('/chess/chessboard.css', (req, res) => {
    res.sendFile(__dirname + '/www/css/chessboard.css');
    return;
  });
  /*expressapp.get('/chess/chessboard.js', (req, res) => {
      res.sendFile(__dirname + '/www/js/chessboard.js');
      return;
  });*/
  expressapp.get('/chess/pieces/:imagefile', function (req, res) {
    var imgf = '/www/img/chesspieces/alpha/' + req.params.imagefile;
    if (imgf.indexOf("\/") != false) { return; }
    res.sendFile(__dirname + imgf);
    return;
  });
  expressapp.get('/chess/chess/pieces/:imagefile', function (req, res) {
    var imgf = '/www/img/chesspieces/alpha/' + req.params.imagefile;
    if (imgf.indexOf("\/") != false) { return; }
    res.sendFile(__dirname + imgf);
    return;
  });
}




Chessgame.prototype.attachEvents = function attachEvents() {

  $('#move_accept').off();
  $('#move_accept').on('click', function () {

    console.log('send move transaction and wait for reply.');

    var data = {};
    data.white = this_chess.game.white;
    data.black = this_chess.game.black;
    data.id = this_chess.game.id;
    data.position = this_chess.engine.fen();
    data.move = this_chess.game.move;
    /*    data.captured = {};
        data.captured.white = this_chess.game.captured.white;
        data.captured.black = this_chess.game.captured.black;
    */
    this_chess.endTurn(data);

    $('#move_accept').prop('disabled', true);
    $('#move_accept').removeClass('green');

    $('#move_reject').prop('disabled', true);
    $('#move_reject').removeClass('red');

  });


  $('#move_reject').off();
  $('#move_reject').on('click', function () {

    this_chess.setBoard(this_chess.game.position);
    $('#move_accept').prop('disabled', true);
    $('#move_accept').removeClass('green');

    $('#move_reject').prop('disabled', true);
    $('#move_reject').removeClass('red');

  });

  $(window).resize(function () {
    this_chess.board.resize();
  });
}



Chessgame.prototype.updateStatusMessage = function updateStatusMessage(str = "") {

  if (this.browser_active != 1) { return; }

  //
  // print message if provided
  //
  if (str != "") {
    var statusEl = $('#status');
    statusEl.html(str);
    return;
  }

  var status = '';

  var moveColor = 'White';
  if (this.engine.turn() === 'b') {
    moveColor = 'Black';
  }

  // checkmate?
  if (this.engine.in_checkmate() === true) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  }

  // draw?
  else if (this.engine.in_draw() === true) {
    status = 'Game over, drawn position';
  }

  // game still on
  else {

    status = moveColor + ' to move';

    // check?
    if (this.engine.in_check() === true) {
      status += ', ' + moveColor + ' is in check';
    }

  }


  var statusEl = $('#status');
  statusEl.html(status);
  var capturedEL = $('#captured');
  console.log(this.game.position);
  console.log(this.engine.fen());
  console.log(this.returnCaptured(this.engine.fen()));
  console.log(this.returnCapturedHTML(this.returnCaptured(this.engine.fen())));
  //capturedEL.html(this.game.captured.white + "</br>" + this.game.captured.black);
  capturedEL.html(this.returnCapturedHTML(this.returnCaptured(this.engine.fen())));
  this.updateLog();

};




Chessgame.prototype.setBoard = function setBoard(position) {

  this.game.moveStartPosition = position;

  if (this.board != undefined) {
    if (this.board.destroy != undefined) {
      this.board.destroy();
    }
  }

  let cfg = {
    draggable: true,
    position: position,
    pieceTheme: 'chess/pieces/{piece}.png',
    onDragStart: this.onDragStart,
    onDrop: this.onDrop,
    onMouseoutSquare: this.onMouseoutSquare,
    onMouseoverSquare: this.onMouseoverSquare,
    onSnapEnd: this.onSnapEnd,
    onMoveEnd: this.onMoveEnd,
    onChange: this.onChange
  };

  if (this.browser_active == 1) {
    this.board = new chessboard('board', cfg);
  }
  this.engine.load(position);

  if (this.game.player == 2 && this.browser_active == 1) {
    this.board.orientation('black');
  }

}


Chessgame.prototype.lockBoard = function lockBoard(position) {

  if (this.board != undefined) {
    if (this.board.destroy != undefined) {
      this.board.destroy();
    }
  }

  let cfg = {
    pieceTheme: 'chess/pieces/{piece}.png',
    moveSpeed: 0,
    position: position
  }

  this.board = new chessboard('board', cfg);
  this.engine.load(position);

  if (this.game.player == 2) {
    this.board.orientation('black');
  }

}

//////////////////
// Board Config //
//////////////////
Chessgame.prototype.onDragStart = function onDragStart(source, piece, position, orientation) {

  if (this_chess.engine.game_over() === true ||
    (this_chess.engine.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (this_chess.engine.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
};

Chessgame.prototype.onDrop = function onDrop(source, target, piece, newPos, oldPos, orientation, topromote) {

  this_chess.removeGreySquares();

  this_chess.game.move = this_chess.engine.fen().split(" ").slice(-1)[0] + " " + this_chess.colours(this_chess.engine.fen().split(" ")[1]) + ": ";

  //was a pawn moved to the last rank
  if ((source.charAt(1) == 7 && target.charAt(1) == 8 && piece == 'wP') 
      || (source.charAt(1) == 2 && target.charAt(1) == 1 && piece == 'bP')) {
    // check with user on desired piece to promote.
    this_chess.checkPromotion(source, target, piece.charAt(0));
  } else {
    // see if the move is legal
    var move = this_chess.engine.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    // illegal move
    if (move === null) return 'snapback';
    // legal move - make it

    this_chess.game.move += this_chess.pieces(move.piece) + " ";

    this_chess.game.move += " - " + move.san;
  }
}

Chessgame.prototype.promoteAfterDrop = function promoteAfterDrop(source, target, piece) {
  var move = this_chess.engine.move({
    from: source,
    to: target,
    promotion: piece
  });
  $('#promotion').hide();
  $('#buttons').show();

  this_chess.updateStatusMessage("Confirm Move to Send!");

  // legal move - make it

  this_chess.game.move += this_chess.pieces(move.piece) + " ";

  this_chess.game.move += " - " + move.san;

  this_chess.updateStatusMessage('Pawn promoted to ' + this_chess.pieces(piece) + '.');

};

Chessgame.prototype.checkPromotion = function checkPromotion(source, target, color) {
  $('#buttons').hide();
  let html = "";
  html += this.piecehtml('q', color);
  html += this.piecehtml('r', color);
  html += this.piecehtml('b', color);
  html += this.piecehtml('n', color);
  $('#promotion-choices').html(html);
  $('#promotion-choices').children().each(function (i) {
    var $this = $(this);
    $this.click(function () {
      $('#promotion').hide();
      $('#buttons').show();
      this_chess.promoteAfterDrop(source, target, $this.attr('alt'));
    });
  });
  this_chess.updateStatusMessage('Chose promotion piece');
  $('#promotion').show();
}

Chessgame.prototype.onMouseoverSquare = function onMouseoverSquare(square, piece) {

  // get list of possible moves for this square
  var moves = this_chess.engine.moves({
    square: square,
    verbose: true
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) { return; }

  // highlight the square they moused over
  this_chess.greySquare(square);

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    this_chess.greySquare(moves[i].to);
  }
};

Chessgame.prototype.onMouseoutSquare = function onMouseoutSquare(square, piece) {
  this_chess.removeGreySquares();
};

Chessgame.prototype.onSnapEnd = function onSnapEnd() {
  this_chess.board.position(this_chess.engine.fen());
};

Chessgame.prototype.removeGreySquares = function removeGreySquares() {
  $('#board .square-55d63').css('background', '');
};

Chessgame.prototype.greySquare = function greySquare(square) {

  var squareEl = $('#board .square-' + square);

  var background = '#a9a9a9';
  if (squareEl.hasClass('black-3c85d') === true) {
    background = '#696969';
  }

  squareEl.css('background', background);

};


Chessgame.prototype.onChange = function onChange(oldPos, newPos) {

  this_chess.lockBoard(this_chess.engine.fen(newPos));

  $('#move_accept').prop('disabled', false);
  $('#move_accept').addClass('green');

  $('#move_reject').prop('disabled', false);
  $('#move_reject').addClass('red');
  
  if ($('#buttons').is("vissible")) {
    this_chess.updateStatusMessage("Confirm Move to Send!");
  }

};

Chessgame.prototype.colours = function colours(x) {

  switch (x) {
    case "w": return ("White");
    case "b": return ("Black");
  }

  return;

}

Chessgame.prototype.pieces = function pieces(x) {

  switch (x) {
    case "p": return ("Pawn");
    case "r": return ("Rook");
    case "n": return ("Knight");
    case "b": return ("Bishop");
    case "q": return ("Queen");
    case "k": return ("King");
  }

  return;

}

Chessgame.prototype.returnCaptured = function returnCaptured(afen) {
  afen = afen.split(" ")[0];
  let WH = ["Q", "R", "R", "B", "B", "N", "N", "P", "P", "P", "P", "P", "P", "P", "P"];
  let BL = ["q", "r", "r", "b", "b", "n", "n", "p", "p", "p", "p", "p", "p", "p", "p"];
  for (var i = 0; i < afen.length; i++) {
    if (WH.indexOf(afen[i]) >= 0) {
      WH.splice(WH.indexOf(afen[i]), 1);
    }
    if (BL.indexOf(afen[i]) >= 0) {
      BL.splice(BL.indexOf(afen[i]), 1);
    }
  }
  return [WH, BL];
}

Chessgame.prototype.returnCapturedHTML = function returnCapturedHTML(acapt) {
  let captHTML = "";
  for (var i = 0; i < acapt[0].length; i++) {
    captHTML += this.piecehtml(acapt[0][i], "w");
  }
  captHTML += "<br />";
  for (var i = 0; i < acapt[1].length; i++) {
    captHTML += this.piecehtml(acapt[1][i], "b");
  }
  return captHTML;
}

Chessgame.prototype.piecehtml = function piecehtml(p, c) {
  var pieceImg = '<img class="captured" alt="' + p + '" src = "/chess/pieces/' + c + p.toUpperCase() + '.png">';
  return (pieceImg);
}

/*
Chessgame.prototype.returnGameOptionsHTML = function returnGameOptionsHTML() {

  return `
        <h3>Chess: </h3>

        <form id="options" class="options">

          <label for="color">Pick Your Color:</label>
          <select name="color">
            <option value="black" default>Black</option>
            <option value="white">White</option>
          </select>

          </form>
          `}
  */
