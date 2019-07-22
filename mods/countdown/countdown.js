var saito = require('../../lib/saito/saito');
const util = require('util');
const ModTemplate = require('../../lib/templates/template');

var countdown = 0;
var countdownNumberEl = null;
var counterActive = false;
var targetEl = null;

//////////////////
// CONSTRUCTOR  //
//////////////////
function Countdown(app) {

    if (!(this instanceof Countdown)) { return new Countdown(app); }

    this.app = app;

    this.name = "Countdown";
    this.description = "Adds a countdown since last block feature;"
    this.browser_active = 0;

    return this;

}
module.exports = Countdown;
util.inherits(Countdown, ModTemplate);

Countdown.prototype.initialize = async function initialize() {
    if (this.app.BROWSER == 0) { return; }
}

Countdown.prototype.webServer = function webServer(app, expressapp) {

    expressapp.get('/countdown/style.css', function (req, res) {
        res.sendFile(__dirname + '/web/style.css');
        return;
    });
}

Countdown.prototype.addCountdown = function addCountdown(selector) {

    var head = document.getElementsByTagName('head')[0];
    head.innerHTML += '<link rel="stylesheet" type="text/css" href="/countdown/style.css" />';
    targetEl = $(selector);
    targetEl.html("");
}

Countdown.prototype.onNewBlock = function onNewBlock() {

    if (this.app.BROWSER == 1) {
        countdown = 0;
        targetEl.html("");
        targetEl.html('<div id="countdown" class="countdown">\
        <div id="countdown-number"></div>\
        <svg>\
          <circle r="18" cx="20" cy="20"></circle>\
          </svg>\
      </div>');

        countdownNumberEl = document.getElementById('countdown-number');
        countdownNumberEl.textContent = countdown;
        if (counterActive == false) {
            tick();
        }
    }
}

var tick = function () {
    if (countdownNumberEl) {
        if (countdown <= 44) {
            countdownNumberEl.textContent = countdown;
            countdown++;
            setTimeout(tick, 1000);
            counterActive = true;
        } else {
            countdownNumberEl.textContent = "45+";
            counterActive = false;
        }
    }
}