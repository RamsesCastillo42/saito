const fs = require('fs');
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');
const sqlite = require('sqlite');
var numeral = require('numeral');
const path = require("path");
const axios = require('axios');
const markdown = require( "markdown" ).markdown;

class Observer extends ModTemplate {

  constructor(app) {

    super();

    var dir = path.join(__dirname, '../../data');

    this.app             = app;

    this.dir             = dir;

    this.name            = "Observer";
    this.browser_active  = 0;
    this.emailAppName    = "Observer";

    this.db              = null;
    this.games           = {};

  }



  attachEvents(app) {

    let observer_self = this;

    $('.game_to_observe').off();
    $('.game_to_observe').on('click', function() {

      let game_id = $(this).attr("id");

      $.get(`arcade/observer/${game_id}`, (response, error) => {

        if (error == "success") {

          let game = JSON.parse(response);

          let address_to_watch = game.id.substring(0, game.id.indexOf('&'));

          //
          // tell peers to forward this address transactions
          //
          observer_self.app.keys.addWatchedPublicKey(address_to_watch);


          //
          // specify observer mode only
          //
          game.player = 0;
          if (observer_self.app.options.games == undefined) {
            observer_self.app.options.games = [];
          }
           for (let i = 0; i < observer_self.app.options.games.length; i++) {
            if (observer_self.app.options.games[i].id == game.id) {
              observer_self.app.options.games.splice(i, 1);
            }
          }
          observer_self.app.options.games.push(game);
          observer_self.app.storage.saveOptions();

          //
          // move into game
          //
          window.location = '/'+observer_self.app.options.games[observer_self.app.options.games.length-1].module.toLowerCase();

        }

      });

    });

  }





  ////////////////
  // Web Server //
  ////////////////
  webServer(app, expressapp) {

    let arcade_self = this;

    expressapp.get('/observer/', async (req, res) => {

      let arcade_self = app.modules.returnModule("Arcade");

      //var sql    = "SELECT DISTINCT game_id FROM mod_games ORDER BY id";
      var sql    = "SELECT game_id, module, last_move FROM mod_games GROUP BY game_id ORDER BY last_move DESC LIMIT 50";
      var params = {};
      var open_games = await arcade_self.db.all(sql, params);
      let html = this.returnHTML(open_games);

      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write(html);
      res.end();
      return;

    });
  }



  returnHTML(games) {

let html = `
  <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="">
      <meta name="author" content="">
      <title>Saito Game Observer</title>
      <link rel="stylesheet" type="text/css" href="/arcade/style.css" />
      <script type="text/javascript" src="/lib/jquery/jquery-3.2.1.min.js"></script>
    </head>
    <body>
        <div id="Observer_browser_active"></div>
        <div class="header">
          <a href="/" style="text-decoration:none;color:inherits">
            <img src="/img/saito_logo_black.png" style="width:35px;margin-top:5px;margin-left:25px;margin-right:10px;float:left;" />
          </a> 
        </div>
        <div style="margin: 1em auto;max-width: 1200px;font-size:1.2em;">
          <p></p>
          <b>Active Games:</b>
          <p></p>`;
  for (let i = 0; i < games.length; i++) {
    if (games[i].game_id != "") {
      html += `
      <div id="${games[i].game_id}" style="clear:both" class="game_table_row">
        <div>
          GAME ID: ${games[i].game_id.substring(0,12)}
        </div>
        <div style="text-align: center">
          ${games[i].module}
        </div>
        <div style="text-align: left">
          Last Move: ${this.dateFormatter(games[i].last_move)} minute(s)
        </div>
        <div>
          <button id="${games[i].game_id}" class="accept_game game_to_observe">WATCH</button>
        </div>
      </div>`;
    }
  }
  html += `
    </div>
      <script src="/socket.io/socket.io.js"></script>
      <script src="/browser.js"></script>
    </body>
    </html>`;

    return html;
  }

  dateFormatter(last_move) {
    // we want our time in minutes
    return Math.round((new Date().getTime() - last_move) / 60000);
  }



}

module.exports = Observer

