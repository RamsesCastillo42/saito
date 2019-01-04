var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');
var chess = require('chess.js');
//var chessboard = require('chessboardjs/www/js/chessboard');
var chessboard = require('./web/chessboard.js');
var chess_app_ZZZ = 'gree';

//////////////////
// CONSTRUCTOR  //
//////////////////
function Chessgame(app) {

    if (!(this instanceof Chessgame)) { return new Chessgame(app); }

    Chessgame.super_.call(this);

    this.app = app;

    this.publickey = app.wallet.returnPublicKey();

    this.name = "Chess";
    this.browser_active = 1;
    this.handlesEmail = 1;
    this.emailAppName = "Chess";

    this.game = {};
    this.board = null;

    chess_app_ZZZ = this.app;

    return this;

}
module.exports = Chessgame;
util.inherits(Chessgame, ModTemplate);

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

}

Chessgame.prototype.initializeHTML = function initializeHTML(app) {

    console.log('#########################################################');
    console.log('#########################################################');
    console.log('#########################################################');
    console.log('#########################################################');
    console.log('#########################################################');
    console.log('#########################################################');
    console.log('#########################################################');

    //   if (app.BROWSER == 0) { return; }
    if (app.BROWSER) {
        /// copied from example.

      
        this.game.game = new chess.Chess();
        
        this.setBoard('start');

        this.updateStatus();
    };
}

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
Chessgame.prototype.onDragStart = function onDragStart(source, piece, position, orientation) {

    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");

    if (mymodule.game.game.game_over() === true ||
        (mymodule.game.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (mymodule.game.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

Chessgame.prototype.onDrop = function onDrop(source, target) {

    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");
    
    mymodule.removeGreySquares();

    // see if the move is legal
    var move = mymodule.game.game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    alert('nice drop');

    mymodule.updateStatus();
};

Chessgame.prototype.onMouseoverSquare = function onMouseoverSquare(square, piece) {
    console.log('mouse over');

    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");
    
    // get list of possible moves for this square
    var moves = mymodule.game.game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    mymodule.greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        mymodule.greySquare(moves[i].to);
    }
};

Chessgame.prototype.onMouseoutSquare = function onMouseoutSquare(square, piece) {
    console.log('mouse out');
    
    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");
    
    mymodule.removeGreySquares();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
Chessgame.prototype.onSnapEnd = function onSnapEnd() {

    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");

    mymodule.game.chessboard.position(mymodule.game.game.fen());
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

Chessgame.prototype.updateStatus = function updateStatus() {

    var mymodule = chess_app_ZZZ.modules.returnModule("Chess");

    var status = '';

    var moveColor = 'White';
    if (mymodule.game.game.turn() === 'b') {
        moveColor = 'Black';
    }

    // checkmate?
    if (mymodule.game.game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    }

    // draw?
    else if (mymodule.game.game.in_draw() === true) {
        status = 'Game over, drawn position';
    }

    // game still on
    else {
        status = moveColor + ' to move';

        // check?
        if (mymodule.game.game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    var statusEl = $('#status');
    var fenEl = $('#fen');
    var pgnEl = $('#pgn');
 

    statusEl.html(status);
    fenEl.html(mymodule.game.game.fen());
    pgnEl.html(mymodule.game.game.pgn());

};


Chessgame.prototype.setBoard = function setBoard(position) {

    var cfg = {
        draggable: true,
        position: position,
        pieceTheme: 'chess/pieces/{piece}.png',
        onDragStart: this.onDragStart,
        onDrop: this.onDrop,
        onMouseoutSquare: this.onMouseoutSquare,
        onMouseoverSquare: this.onMouseoverSquare,
        onSnapEnd: this.onSnapEnd
    };
    
    this.game.chessboard = new chessboard('board', cfg);

}