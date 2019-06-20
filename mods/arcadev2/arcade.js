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

    this.active_game     = "";

    this.games           = {}
    this.games.open      = [];
    this.games.ongoing   = [];
    this.games.mygames   = [];

    this.games.nav       = { selected: 'open' };
  }

  initialize() {
    // Test data, will need to be requested from server
    if (this.app.BROWSER == 1) {
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
  }

  attachEvents() {

    // Arcade Game Event Listener
    let gameslist = document.querySelector('.gamelist');
    gameslist.addEventListener('click', (event) => {
      this.active_game = event.target.id;
      this.showMonitor();
      $('.find_player_button').toggle();

      if (this.active_game == "Twilight") {
        $('.publisher_message').html("Twilight Struggle is <a href=\"https://github.com/trevelyan/ts-blockchain/blob/master/license/GMT_Vassal_Modules.pdf\" style=\"border-bottom: 1px dashed;cursor:pointer;\">released for use</a> in open source gaming engines provided that at least one player has purchased the game. By clicking to start a game you confirm that either you or your opponent has purchased a copy. Please support <a href=\"https://gmtgames.com\" style=\"border-bottom: 1px dashed; cursor:pointer\">GMT Games</a> and encourage further development of Twilight Struggle by <a style=\"border-bottom: 1px dashed;cursor:pointer\" href=\"https://www.gmtgames.com/p-588-twilight-struggle-deluxe-edition-2016-reprint.aspx\">picking up a physical copy of the game</a>");
        $('.publisher_message').show();
      }
    })

    // Game Table Nav Menu
    let gamesNavMenu = document.getElementById("games-nav-menu");
    gamesNavMenu.addEventListener("click", (event) => {
      this.onGamesMenuClick(event);
    });
  }

  onGamesMenuClick(event) {
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

  populateGameMonitor(app) {

    let game_options = "";
    let game_self = app.modules.returnModule(this.active_game);

    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }

    $('.game_details').html(game_options);
  }

  updateBalance(app) {
    if (app.BROWSER == 0) { return; }

    //
    // invite page stuff here
    //
    try {
      if (invite_page == 1 && !this.is_initializing) {
        $('.invite_play_button').css('background-color','darkorange');
        $('.invite_play_button').css('border', '1px solid darkorange');
        $('.invite_play_button').show();
        $('.invite_play_button').off();
        $('.invite_play_button').on('click', () => {
          this.acceptGameInvitation();
          this.invitePlayButtonClicked();
        });
        return;
      }
    } catch (err) { console.error(err) }


    $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

    if (app.wallet.returnBalance() >= 2) {
      $('.funding_alert').hide();
      $('.manage_invitations').show();
    }
  }

  showMonitor() {

    // this.monitor_shown_already = 1;
    // this.currently_viewing_monitor = 1;

    this.populateGameMonitor(this.app);
    this.updateBalance(this.app);

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade-container').hide();
    $('#games').hide();
    $('.game_options').hide();

    this.addModalEvents();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }

  addModalEvents() {
    // Modal Functionality
    // Get the modal
    var modal = document.getElementById("myModal");
    var btn = document.getElementById("myBtn");
    var modalSpinner = document.getElementById("game-modal-spinner");
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal
    btn.addEventListener('click', () => {
      modal.style.display = "block";
    });

    // When the user clicks on <span> (x), close the modal
    span.addEventListener('click', () => {
      modal.style.display = "none";
    });

    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener('click', () => {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    });

    // game-modal-spinner
    modalSpinner.addEventListener("change", (event) => {
      let gameSelectHTML = this.renderModalOptions(event.target.value)
      $('#game-start-options').innerHTML = '';
      $('#game-start-options').html(gameSelectHTML);
    });
  }

  renderModalOptions(option) {
    switch(option) {
      case 'open':
        return `<button class="quick_invite">CREATE GAME</button>`
      case 'link':
        return `<input style="padding: 10px;width: 63%;height: 40px;" /><button class="quick_invite"> RECREATE LINK</button`
      case 'key':
        let selectedGameModule = this.app.modules.returnModule(this.active_game);
        let html = `<div style="display: grid; grid-gap: 1em; width: 70%; margin-top: 1em;">`
        for (let i = 0; i < selectedGameModule.maxPlayers - 1; i++) {
          html += `<div style="display: flex; align-items: center;"><span style="margin-right: 15px;">OPPONENT ${i + 1}:</span> <input class="opponent-address" id=${i}></input></div>`
        }
        html += `<button class="quick_invite"> INVITE</button>`;
        html += "</div>";
        return html;
      default:
        break;
    }
  }

  hideMonitor() {
    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();
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