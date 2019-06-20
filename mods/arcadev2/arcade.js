const fs = require('fs');
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');

class Arcade extends ModTemplate {



  constructor(app) {
    super();

    this.app             = app;

    this.name            = "Arcade";
    this.browser_active  = 0;
    this.emailAppName    = "Arcade";

    this.games = {}
    this.games.open = [];
    this.games.ongoing = [];
    this.games.mygames = [];

    this.games.nav     = { selected: 'open' };
  }


  ////////////////
  // initialize //
  ////////////////
  initialize() {

    // Open
    this.games.open.push({ player: 'david@saito', game: 'Twilight Struggle', status: ['reject_game', 'accept_game'] });
    this.games.open.push({ player: 'richard@saito', game: 'Twilight Struggle', status: ['reject_game', 'accept_game'] });

    // Ongoing
    this.games.ongoing.push({ player: 'adrian@saito vs. lzq@saito', game: 'Twilight Struggle', status: ['joinlink'] });

    // My Games
    this.games.mygames.push({ player: 'alice@saito', game: 'Twilight Struggle', status: ['delete_game', 'joinlink'] });

    this.updateNavSelector();
    this.renderGamesTable(this.games.nav.selected);
  }

  attachEvents() {
    let gamesNavMenu = document.getElementById("games-nav-menu");

    gamesNavMenu.addEventListener("click", this.onGamesMenuClick);

  }

  onGamesMenuClick = (event) => {
    let id = event.target.id;
    let previousNavTab = document.getElementById(this.games.nav.selected);

    previousNavTab.className = "";
    this.games.nav.selected = id;

    this.updateNavSelector();
    this.renderGamesTable(id);
  }

  updateNavSelector() {
    let gameNavTab = document.getElementById(this.games.nav.selected);
    gameNavTab.className = "highlighted";
  }

  renderGamesTable(id) {
    let gamesTable = document.getElementById('games-table');
    let gamesTableBody = document.createElement("tbody");
    gamesTable.innerHTML = '';

    this.games[id].forEach((game) => {
      var node = document.createElement("tr");

      var playerTC = document.createElement("td");
      var playerTextNode = document.createTextNode(game.player);
      playerTC.appendChild(playerTextNode);

      var gameTC = document.createElement("td");
      var gameTextNode = document.createTextNode(game.game);
      gameTC.appendChild(gameTextNode);

      var statusTC = document.createElement("td");
      //var statusTextNode = document.createTextNode(game.status);
      game.status.forEach(status => statusTC.appendChild(this.createButtonElement(status)))

      node.append(playerTC,gameTC,statusTC);
      gamesTableBody.appendChild(node);
    })
    gamesTable.append(gamesTableBody);
  }

  createButtonElement(button_class) {
    var button = document.createElement("button");
    button.className = button_class;

    let text_node;

    switch(button_class){
      case "accept_game":
        text_node = document.createTextNode("ACCEPT");
        break;
      case "reject_game":
        text_node = document.createTextNode("REJECT");
        break;
      case "joinlink":
        text_node = document.createTextNode("JOIN");
        break;
      case "delete_game":
        text_node = document.createTextNode("DELETE");
        break;
      default:
        break;
    }

    button.append(text_node);
    return button;
  }

  webServer(app, expressapp) {
    expressapp.get('/arcadev2/',  (req, res) => {
      res.sendFile(__dirname + '/web/index.html');
      return;
    });

    expressapp.get('/arcadev2/email',  (req, res) => {
      res.sendFile(__dirname + '/web/email.html');
      return;
    });

    expressapp.get('/arcadev2/invite/:gameinvite',  (req, res) => {

      let gameinvite = req.params.gameinvite;
      let txmsgstr = "";

      if (gameinvite != null) {
        txmsgstr = app.crypto.base64ToString(gameinvite);
      }

      let data = fs.readFileSync(__dirname + '/web/invite.html', 'utf8', (err, data) => {});
      data = data.replace('GAME_INVITATION', txmsgstr);
      res.setHeader('Content-type', 'text/html');
      res.charset = 'UTF-8';
      res.write(data);
      res.end();
      return;
    });

    expressapp.get('/arcadev2/invite.css',  (req, res) => {
      res.sendFile(__dirname + '/web/invite.css');
      return;
    });

    expressapp.get('/arcadev2/style.css',  (req, res) => {
      res.sendFile(__dirname + '/web/style.css');
      return;
    });

    expressapp.get('/arcade/script.js',  (req, res) => {
      res.sendFile(__dirname + '/web/script.js');
      return;
    });

    expressapp.get('/arcadev2/img/:imagefile',  (req, res) => {
      var imgf = '/web/img/'+req.params.imagefile;
      if (imgf.indexOf("\/") != false) { return; }
      res.sendFile(__dirname + imgf);
      return;
    });
  }
}

module.exports = Arcade;
