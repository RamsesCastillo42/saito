const util = require('util');
const GameTemplate = require('../../template');
const MODULE = "BlackJack";
const TYPE_BET = "bet";
const TYPE_PAYOUT = "payout";

function BlackJack(app) {

    if (!(this instanceof BlackJack)) { return new BlackJack(app); }

    BlackJack.super_.call(this);

    this.app = app;

    // Client
    this.housePublicKey;
    // Server
    this.playerBets = {};

    this.name = "BlackJack";
    this.browser_active = 1;

    return this;
}

module.exports = BlackJack;
util.inherits(BlackJack, GameTemplate);

BlackJack.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {
    if (conf == 0) {
        var blackJack = app.modules.returnModule(MODULE);
        if (tx.transaction.msg.module == MODULE) {
            switch (tx.transaction.msg.type) {
                case TYPE_BET:
                    // if (!app.BROWSER) {
                    blackJack.playerBets[tx.transaction.from[0].add] = tx.transaction.to[0].amt;
                    console.log("PlayerBets: " + blackJack.playerBets);
                // }
                case "payout":
                    blackJack.payout(tx);
                default:
                    break;
            }
        }
    }
}

BlackJack.prototype.webServer = function webServer(app, expressapp) {
    expressapp.get('/blackjack/', (req, res) => {
        res.sendFile(__dirname + '/web/index.html');
        return;
    });
    expressapp.get('/blackjack/style.css', (req, res) => {
        res.sendFile(__dirname + '/web/style.css');
        return;
    });
}

// Client ---------------------------------------------------------------------------------


BlackJack.prototype.createBetTX = function createBetTx(amount) {
    this.housePublicKey = this.app.network.peers[0].peer.publickey;
    var betTx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.housePublicKey, amount);
    if (!betTx) return betTx;

    betTx.transaction.msg = Object.assign({}, { type: TYPE_BET, module: MODULE });

    var betTx = this.app.wallet.signTransaction(betTx);

    this.app.network.propagateTransactionWithCallback(betTx, () => {
        if (this.app.BROWSER) {
        }
    });

    return betTx;
}


BlackJack.prototype.attachEvents = function attachEvents(app) {
    if (!app.BROWSER) { return };

    // Bet Button
    $('#bet_button').off();
    $('#bet_button').on('click', () => {
        let bet = parseInt($('#bet_input').val());

        var betTx = this.createBetTX(bet);

        if (!betTx) {
            alert("You don't have enough funds to bet");
            $('#bet_input').val(0);
        } else {
            this.updateWebAfterBet(betTx);
        }

    });

    // Payout Button
    $('#payout_button').off();
    $('#payout_button').on('click', () => {
        console.log("Payout clicked");
        var msg = {request: "blackjack payout", data: {publickey: this.app.wallet.returnPublicKey()}}
        console.log("Message: ", msg);
        this.app.network.sendRequest(msg.request, msg.data);
    });
}

BlackJack.prototype.updateWebAfterBet = function updateWebAfterBet(betTx) {
    $('#bet_input').attr('disabled', 'disabled');

    this.attachEvents(this.app);
}


BlackJack.prototype.handlePeerRequest = function handlePeerRequest(app, msg, peer, callback) {
    console.log("HandlePeerRequest: ", msg);
    switch (msg.request) {
        case "blackjack payout":
            console.log("HandlePeerRequest - blackjack: ", msg, this.playerBets[msg.data.publickey]);
            var payoutTx = this.app.wallet.createUnsignedTransactionWithDefaultFee(msg.data.publickey, this.playerBets[msg.data.publickey] * 2);
            if (!payoutTx) return payoutTx;

            payoutTx.transaction.msg = Object.assign({}, { type: TYPE_PAYOUT, module: MODULE });

            var payoutTx = this.app.wallet.signTransaction(payoutTx);

            this.app.network.propagateTransactionWithCallback(payoutTx, () => {
                if (this.app.BROWSER) {
                }
            });
    }

    return payoutTx;
}
