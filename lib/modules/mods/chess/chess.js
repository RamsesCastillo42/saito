var saito = require('../../../saito');
var ModTemplate = require('../../game');
var util = require('util');

var this_chess = null;
var chess = null;
var chessboard = null;
var chess_app = 'gree';


//////////////////
// CONSTRUCTOR  //
//////////////////
function Chessgame(app) {

    if (!(this instanceof Chessgame)) { return new Chessgame(app); }

    Chessgame.super_.call(this);

    this.app = app;

    this.publickey = app.wallet.returnPublicKey();

    this.name = "Chess";
    this.browser_active = 0;
    this.handlesEmail = 1;
    this.emailAppName = "Chess";

    this.game = {};
    this.board = null;

    chess_app = this.app;
    this_chess = this;

    return this;

}
module.exports = Chessgame;
util.inherits(Chessgame, ModTemplate);





    
////////////////////
// initializeGame //
////////////////////
Chessgame.prototype.initializeGame = async function initializeGame(game_id) {

  ///////////////////////////////////
  // we have finished initializing //
  ///////////////////////////////////
  if (this.game.initializing == 1) { this.game.initializing = 0; this.saveGame(this.game.id); }



  console.log('#########################################################');
  console.log('#########################################################');
  console.log('###################         #############################');
  console.log('###################  CHESS  #############################');
  console.log('###################         #############################');
  console.log('#########################################################');
  console.log('#########################################################');

  //
  // load this.game object
  // 
  this.loadGame(game_id);

  //
  // initialize the javascript objects we need
  //
  chess = require('chess.js');
  if (this.browser_active == 1) { chessboard = require('chessboardjs'); }
  
  //
  // create game engine
  //
  if (this.game.game == undefined) {

    //
    // new game
    //
    this.game.game = new chess.Chess();
    this.game.position = this.game.game.fen();
    this.saveGame(game_id);

    //
    // email ourselves -- the game is ready!
    //
    let title = this.emailAppName + " Game Ready";
    let data  = 'Your game of ' + this.emailAppName + ' is ready to play!<p></p><div id="'+this.game.id+'" class="open_game link">Click here to open or continue this game.</div>';
    let email_self = this.app.modules.returnModule("Email");

    let newtx = new saito.transaction();
    newtx.transaction.ts = new Date().getTime();
    newtx.transaction.from = [];
    newtx.transaction.to = [];
    newtx.transaction.from.push(new saito.slip(this.app.wallet.returnPublicKey()));
    newtx.transaction.to.push(new saito.slip(this.app.wallet.returnPublicKey()));
    email_self.receiveMail(title, data, newtx, function() {});

  } else {

    //
    // old game
    //
    this.game.game = new chess.Chess();
    this.game.game.load(this_chess.game.position);

  }

  //
  // initialize interface
  //
  if (this.browser_active == 1) {

    //
    // active player moves, others lock
    //
    if (this.game.target == this.game.player) {
      this.setBoard(this.game.game.fen());
    } else {
      this.lockBoard(this.game.game.fen());
    }

    this.updateStatusMessage();
    this.attachEvents();
  }
}



////////////////
// handleGame //
////////////////
//
// This function handles the bulk of the game logic. 
// Whenever a message is received for this module, it
// will be processed by this function.
//
Chessgame.prototype.handleGame = function handleGame(msg) {

  let data = JSON.parse(msg.extra.data);
  this_chess.game.position = data.position;
  this_chess.game.target = msg.extra.target;

  if (msg.extra.target == this.game.player) {
    this_chess.setBoard(this_chess.game.position);
    this_chess.updateStatusMessage();
  }

  this_chess.saveGame(this_chess.game.id);

}



/////////////
// endTurn //
/////////////
//
// this takes the data that we want to send to our
// peers and adds it to the transaction that will
// be sent. 
//
// handleGame needs to extract this information and
// recreate the board.
//
Chessgame.prototype.endTurn = function endTurn(data) {

  let extra = {};
      extra.target = this.returnNextPlayer(this.game.player);
      extra.data   = JSON.stringify(data);
  this_chess.game.target = extra.target;
  this_chess.sendMessage("game", extra);
  this_chess.saveGame(this_chess.game.id);
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
        data.position = this_chess.game.game.fen();

        this_chess.endTurn(data);

        $('#move_accept').prop('disabled', true);
        $('#move_accept').removeClass('green');

        $('#move_reject').prop('disabled', true);
        $('#move_reject').removeClass('red');
    });


    $('#move_reject').off();
    $('#move_reject').on('click', function () {

        this_chess.setBoard(this_chess.game.moveStartPosition);

        $('#move_accept').prop('disabled', true);
        $('#move_accept').removeClass('green');

        $('#move_reject').prop('disabled', true);
        $('#move_reject').removeClass('red');
    });

}

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
Chessgame.prototype.onDragStart = function onDragStart(source, piece, position, orientation) {

    if (this_chess.game.game.game_over() === true ||
        (this_chess.game.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (this_chess.game.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

Chessgame.prototype.onDrop = function onDrop(source, target) {

    this_chess.removeGreySquares();

    // see if the move is legal
    var move = this_chess.game.game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

};

Chessgame.prototype.onMouseoverSquare = function onMouseoverSquare(square, piece) {

    // get list of possible moves for this square
    var moves = this_chess.game.game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

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

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
Chessgame.prototype.onSnapEnd = function onSnapEnd() {
    this_chess.game.chessboard.position(this_chess.game.game.fen());
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

    this_chess.lockBoard(this_chess.game.chessboard.fen(newPos));

    $('#move_accept').prop('disabled', false);
    $('#move_accept').addClass('green');

    $('#move_reject').prop('disabled', false);
    $('#move_reject').addClass('red');

    this_chess.updateStatusMessage("Confirm Move to Send!");

};

Chessgame.prototype.updateStatusMessage = function updateStatusMessage(str="") {

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
    if (this_chess.game.game.turn() === 'b') {
        moveColor = 'Black';
    }

    // checkmate?
    if (this_chess.game.game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    }

    // draw?
    else if (this_chess.game.game.in_draw() === true) {
        status = 'Game over, drawn position';
    }

    // game still on
    else {

        status = moveColor + ' to move';

        // check?
        if (this_chess.game.game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    var statusEl = $('#status');
    //var fenEl = $('#fen');
    //var pgnEl = $('#pgn');

    statusEl.html(status);
    //fenEl.html(this_chess.game.game.fen());
    //pgnEl.html(this_chess.game.game.pgn());

};


Chessgame.prototype.setBoard = function setBoard(position) {

    this_chess.game.moveStartPosition = position;

    if (this_chess.game.chessboard != undefined) {
      if (this_chess.game.chessboard.destroy != undefined) {
        this_chess.game.chessboard.destroy();
      }
    }

    var cfg = {
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

    this_chess.game.chessboard = new chessboard('board', cfg);
    this_chess.game.game.load(position);

    if (this_chess.game.player == 2) {
      this_chess.game.chessboard.orientation('black');
    }

}

Chessgame.prototype.lockBoard = function lockBoard(position) {

    if (this_chess.game.chessboard != undefined) {
      if (this_chess.game.chessboard.destroy != undefined) {
        this_chess.game.chessboard.destroy();
      }
    }

    var cfg = {
        pieceTheme: 'chess/pieces/{piece}.png',
        moveSpeed: 0,
        position: position
    }

    this.game.chessboard = new chessboard('board', cfg);
    this_chess.game.game.load(position);

    if (this.game.player == 2) {
      this.game.chessboard.orientation('black');
    }
}







