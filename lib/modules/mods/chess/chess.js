var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');
var chess = require('chess.js');
//var chessboard = require('chessboardjs/www/js/chessboard');
//var chessboard = require('./web/chessboard.js');
var chessboard = require('chessboardjs')
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
    this.browser_active = 1;
    this.handlesEmail = 1;
    this.emailAppName = "Chess";

    this.game = {};
    this.board = null;

    chess_app = this.app;

    return this;

}
module.exports = Chessgame;
util.inherits(Chessgame, ModTemplate);

////////////////
// Initialize //
////////////////
Chessgame.prototype.initialize = function initialize() {

    if (this.browser_active == 0) { return; }

    if (this.app.BROWSER == 1) {

        var this_chess = this;

      //  this_chess.game.white = "mLDpru2pgMZfoC82uCGoRcVps1ucryVyHxRuLCXY8hZs";
      //  this_chess.game.black = "27mQhpLr8jqc2rfrsNcSkzjwcckYWwJ6SqVgwrSSbS4Vx";
      //  this_chess.game.id = "2";

        var urlParams = new URLSearchParams(window.location.search);
        this_chess.game.white = urlParams.get('white');
        this_chess.game.black = urlParams.get('black');
        this_chess.game.id = urlParams.get('id');
    }

}

Chessgame.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {

    if (tx.transaction.msg.module != "Chess") { return; }

    if (conf == 0) {
        var this_chess = chess_app.modules.returnModule("Chess");
        if (tx.transaction.msg.id == this_chess.game.id) {
            if (tx.transaction.to[0].add == this_chess.publickey) {
                this_chess.setBoard(tx.dmsg.position);
                this_chess.updateStatus();
            }
        }
    }
}

Chessgame.prototype.createMoveTX = function createMoveTX(data) {

    var this_chess = chess_app.modules.returnModule("Chess");

    var opponent = "";
    if (this_chess.game.white == this_chess.publickey) {
        opponent = this_chess.game.black;
    } else {
        opponent = this_chess.game.white;
    }

    var newtx = this_chess.app.wallet.createUnsignedTransactionWithDefaultFee(opponent, 0);

    newtx.transaction.msg = Object.assign({}, data, { module: "Chess" });

    if (newtx == null) { return null; }
    var newtx = this.app.wallet.signTransaction(newtx);

    this.app.network.propagateTransactionWithCallback(newtx, () => {
        if (this.app.BROWSER) {
            //alert("your message was propagated")
            this_chess.updateStatus();
        }
    })

        return newtx;
}

Chessgame.prototype.notifyOpponent = function notifyOpponent(data){

    var this_chess = chess_app.modules.returnModule("Chess");

    var opponent = "";
    if (this_chess.game.white == this_chess.publickey) {
        opponent = this_chess.game.black;
    } else {
        opponent = this_chess.game.white;
    }

    var newtx = this_chess.app.wallet.createUnsignedTransactionWithDefaultFee(opponent, 0);

    var message = {};
    message.title = "Your opponent moved in your chess game.";
    message.data = "<a target='_blank' href='/chess?id=" + data.id + "&white=" + data.white + "&black=" + data.black + "'>";
    message.data += "Click to discover their fiendish reply</a>";
    
    newtx.transaction.msg = Object.assign({}, message, { module: "Email" });

    if (newtx == null) { return null; }
    var newtx = this.app.wallet.signTransaction(newtx);

    this.app.network.propagateTransaction(newtx, "transaction");

}

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
    console.log('###################         #############################');
    console.log('###################  CHESS  #############################');
    console.log('###################         #############################');
    console.log('#########################################################');
    console.log('#########################################################');

    //   if (app.BROWSER == 0) { return; }
    if (app.BROWSER) {
        /// copied from example.


        this.game.game = new chess.Chess();

        this.setBoard('start');

        this.updateStatus();

        this.attachEvents();

    };
}

Chessgame.prototype.attachEvents = function attachEvents() {

    var this_chess = chess_app.modules.returnModule("Chess");

    $('#move_accept').off();
    $('#move_accept').on('click', function () {

        console.log('send move transaction and wait for reply.');

        var data = {};
        data.white = this_chess.game.white;
        data.black = this_chess.game.black;
        data.id = this_chess.game.id;
        data.position = this_chess.game.game.fen();

        this_chess.createMoveTX(data);
        //this_chess.notifyOpponent(data);

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

    var this_chess = chess_app.modules.returnModule("Chess");

    if (this_chess.game.game.game_over() === true ||
        (this_chess.game.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (this_chess.game.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

Chessgame.prototype.onDrop = function onDrop(source, target) {

    var this_chess = chess_app.modules.returnModule("Chess");

    this_chess.removeGreySquares();

    // see if the move is legal
    var move = this_chess.game.game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    //alert('nice drop');

    this_chess.updateStatus();
};

Chessgame.prototype.onMouseoverSquare = function onMouseoverSquare(square, piece) {

    var this_chess = chess_app.modules.returnModule("Chess");

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

    var this_chess = chess_app.modules.returnModule("Chess");

    this_chess.removeGreySquares();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
Chessgame.prototype.onSnapEnd = function onSnapEnd() {

    var this_chess = chess_app.modules.returnModule("Chess");

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

    var this_chess = chess_app.modules.returnModule("Chess");

    this_chess.lockBoard(this_chess.game.chessboard.fen(newPos));

    $('#move_accept').prop('disabled', false);
    $('#move_accept').addClass('green');

    $('#move_reject').prop('disabled', false);
    $('#move_reject').addClass('red');

};

Chessgame.prototype.updateStatus = function updateStatus() {

    var this_chess = chess_app.modules.returnModule("Chess");

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


Chessgame.prototype.updateBoard = function updateBoard(position) {

    this.game.chessboard.position(position);
    this.game.game.load(position);
}

Chessgame.prototype.setBoard = function setBoard(position) {

    this.game.moveStartPosition = position;

    if (this.game.chessboard) {
        this.game.chessboard.destroy();
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

    this.game.chessboard = new chessboard('board', cfg);
    this.game.game.load(position);

    if (this.game.black == this.publickey) {
        this.game.chessboard.orientation('black');
    }

}

Chessgame.prototype.lockBoard = function lockBoard(position) {

    var cfg = {
        pieceTheme: 'chess/pieces/{piece}.png',
        moveSpeed: 0,
        position: position
    }

    this.game.chessboard.destroy();
    this.game.chessboard = new chessboard('board', cfg);

    if (this.game.black == this.publickey) {
        this.game.chessboard.orientation('black');
    }
}
