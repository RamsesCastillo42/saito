var saito = require('../../lib/saito/saito');
const util = require('util');
const ModTemplate = require('../../lib/templates/template');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Countdown(app) {

    if (!(this instanceof Countdown)) { return new Countdown(app); }

    this.app = app;

    this.name = "Countdown";
    this.description = "Adds a countdown since last block feature;"
    this.browser_active = 0;

    this.countdown = 0;
    this.countdownNumberEl = null;
    this.counterActive = false;
    this.targetEl = null;

    return this;

}
module.exports = Countdown;
util.inherits(Countdown, ModTemplate);


Countdown.prototype.initialize = async function initialize() {
  if (this.app.BROWSER == 0) { return; }
}


Countdown.prototype.addCountdown = function addCountdown(selector) {
    var head = document.getElementsByTagName('head')[0];
    head.innerHTML += '<link rel="stylesheet" type="text/css" href="/countdown/style.css" />';
    this.targetEl = $(selector);
    this.targetEl.html("");
}

Countdown.prototype.onNewBlock = function onNewBlock() {

    if (this.app.BROWSER == 1) {
        if (this.targetEl != null) {
            this.countdown = 0;
            this.targetEl.html("");
            this.targetEl.html('<div id="countdown" class="countdown"><div id="countdown-number"></div><svg><circle r="18" cx="20" cy="20"></circle></svg></div>');
            this.countdownNumberEl = document.getElementById('countdown-number');
            this.countdownNumberEl.textContent = this.countdown;
            if (this.counterActive == false) {
                this.tick();
            }
        }
    }
}

Countdown.prototype.tick = function tick() {
    if (this.countdownNumberEl) {
        if (this.countdown <= 44) {
            this.countdownNumberEl.textContent = this.countdown;
            this.countdown++;
            setTimeout(this.tick, 1000);
            this.counterActive = true;
        } else {
            this.countdownNumberEl.textContent = "45+";
            this.counterActive = false;
        }
    }
}



Countdown.prototype.webServer = function webServer(app, expressapp) {
    expressapp.get('/countdown/style.css', function (req, res) {
        res.sendFile(__dirname + '/web/style.css');
        return;
    });
}


