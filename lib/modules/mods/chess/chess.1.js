var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');
var chess = require('chess.js');
var chessboard = require('chessboardjs');


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

    expressapp.get('/chess/chessboard.js', (req, res) => {
        res.sendFile(__dirname + '/www/js/chessboard.js');
        return;
    });

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

            statusEl = $('#status'),
            fenEl = $('#fen'),
            pgnEl = $('#pgn');

        // do not pick up pieces if the game is over
        // only pick up pieces for the side to move
        var onDragStart = function (source, piece, position, orientation) {
            if (game.game_over() === true ||
                (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
                return false;
            }
        };

        var onDrop = function (source, target) {
            removeGreySquares();

            // see if the move is legal
            var move = game.move({
                from: source,
                to: target,
                promotion: 'q' // NOTE: always promote to a queen for example simplicity
            });

            // illegal move
            if (move === null) return 'snapback';
        };

        var onMouseoverSquare = function (square, piece) {
            // get list of possible moves for this square
            var moves = game.moves({
                square: square,
                verbose: true
            });

            // exit if there are no moves available for this square
            if (moves.length === 0) return;

            // highlight the square they moused over
            greySquare(square);

            // highlight the possible squares for this piece
            for (var i = 0; i < moves.length; i++) {
                greySquare(moves[i].to);
            }
        };

        var onMouseoutSquare = function (square, piece) {
            removeGreySquares();
        };

        var onDrop = function (source, target) {
            // see if the move is legal
            var move = game.move({
                from: source,
                to: target
                //promotion: 'q' // NOTE: always promote to a queen for example simplicity
            });

            // illegal move
            if (move === null) return 'snapback';

            updateStatus();
        };

        // update the board position after the piece snap 
        // for castling, en passant, pawn promotion
        var onSnapEnd = function () {
            board.position(game.fen());
        };

        var removeGreySquares = function () {
            $('#board .square-55d63').css('background', '');
        };

        var greySquare = function (square) {
            var squareEl = $('#board .square-' + square);

            var background = '#a9a9a9';
            if (squareEl.hasClass('black-3c85d') === true) {
                background = '#696969';
            }

            squareEl.css('background', background);
        };

        var updateStatus = function () {
            var status = '';

            var moveColor = 'White';
            if (game.turn() === 'b') {
                moveColor = 'Black';
            }

            // checkmate?
            if (game.in_checkmate() === true) {
                status = 'Game over, ' + moveColor + ' is in checkmate.';
            }

            // draw?
            else if (game.in_draw() === true) {
                status = 'Game over, drawn position';
            }

            // game still on
            else {
                status = moveColor + ' to move';

                // check?
                if (game.in_check() === true) {
                    status += ', ' + moveColor + ' is in check';
                }
            }

            statusEl.html(status);
            fenEl.html(game.fen());
            //pgnEl.html(game.pgn());

        };

        game = app.modules.returnModule("Chessgame");
        
        game.setBoard('start');
        
        updateStatus();

    };
}

Chessgame.prototype.setBoard = function setBoard(position) {

    var cfg = {
        draggable: true,
        position: position,
        pieceTheme: 'chess/pieces/{piece}.png',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };
    
    board = ChessBoard('board', cfg);

}