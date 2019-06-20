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

  returnGameMonitor(app) {

    let game_options = "";
    let game_self = app.modules.returnModule(this.active_game);

    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }

    let show_game_options = game_options == "" ? "none" : "block";

    let quick_invite =
    `<div class="quick_invite_box">
      <div class="quick_invite" id="quick_invite"><i class="fa fa-magic"></i> Generate Invite Link</div>
      <div class="quick_invite_switch"> or <a style="color:#003444;border-bottom: 1px dashed;cursor:pointer" class="toggle_invite">invite by publickey:</a></div>
    </div>
    `

    let multi_invite = `
      <div class="invitation_player1" id="invitation_player1" style="max-width:620px;">
        <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em;" id="opponent_address" class="opponent_address" />
        <div class="opponent_address2">
          <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address2" />
          <p></p>
        </div>
        <div class="opponent_address3">
          <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address3" />
          <p></p>
        </div>

        <div class="invite_button_box">
          <div class="invite_button" id="invite_button">
            <i class="fa fa-envelope"></i> Send Invite
          </div>
          <div class="invite_button_switch"> or <a style="color:#003444;border-bottom: 1px dashed;cursor:pointer" class="toggle_invite">generate invite link</a></div>
        </div>

      </div>
    `

    let invite_html = game_self.maxPlayers > 2 ? multi_invite : quick_invite;

    var invite_description = ''
    if (game_self.maxPlayers > 2) {
      invite_description =
      `<div id="invite_publickey_description" style="display:block">
        Provide Saito address of opponent(s):
      </div>`
    } else {
      invite_description =
        `<div id="invite_link_description" style="display:none">
          Generate link to invite players or <a style="color:#003444;border-bottom:1px dashed;" class="toggle_invite">invite by publickey:</a>
        </div>
        <div id="invite_publickey_description" style="display:none">
          Provide Saito address of opponent(s):
        </div>`
    }

    return `

      <!-- <div class="address_box">

        Send this address to your opponent for invitation:

        <p></p>

        <span style="font-family: Courier">ADDRESS: </span><span class="saito_address" id="saito_address">${app.wallet.returnPublicKey()}</span>
        <br />
        <span style="font-family: Courier">BALANCE: </span><span class="saito_balance" id="saito_balance">0.0</span> SAITO

      </div> -->

      <div class="funding_alert">
        Transfer tokens to this address or <a href="https://apps.saito.network/faucet?saito_address=${app.wallet.returnPublicKey()}&source_app=arcade" target="_new">fund this address from the main faucet</a>.
      </div>

      <div class="manage_invitations" style="display:none">

        <img class="gameimage" id="Twilight" src="/arcade/img/twilight.jpg">

        <div class="game_details" style="display:${show_game_options}">${game_options}</div>

        <div style="grid-area: game-generate;">

          ${invite_description}

          ${invite_html}

          <div class="invitation_player1" id="invitation_player1" style="display:none; max-width:620px">
            <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em;" id="opponent_address" class="opponent_address" />
            <div class="opponent_address2">
              <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address2" />
            </div>
            <div class="opponent_address3">
              <input type="text" style="border:1px solid #444;width:100%;padding:4px;font-size:1.15em" id="opponent_address3" />
            </div>

            <div class="invite_button" id="invite_button">
              <i class="fa fa-envelope"></i> Send Invite
            </div>
            <div class="invite_button_switch"> or <a style="color:#003444;border-bottom: 1px dashed;cursor:pointer" class="toggle_invite">generate invite link</a></div>
          </div>

          <div id="publisher_message" class="publisher_message" style="display:none"></div>

          <div class="return_to_arcade" id="return_to_arcade">
          <i class="fa fa-arrow-circle-left"></i> Return to Arcade
          </div>

          <div class="invitation_player2" id="invitation_player2" style="display:none">
            Invitation received from <span class="player2_address"></span> [ <span class="player2_accept link gamelink" id="player2_accept"><i class="fa fa-check-circle"></i> ACCEPT INVITATION</span> ]
          </div>

        </div>

      </div>

    `;

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
    } catch (err) {}


    $('.saito_balance').html(app.wallet.returnBalance().replace(/0+$/,'').replace(/\.$/,'\.0'));

    if (app.wallet.returnBalance() >= 2) {
      $('.funding_alert').hide();
      $('.manage_invitations').show();
    }
  }

  showMonitor() {

    // this.monitor_shown_already = 1;
    // this.currently_viewing_monitor = 1;

    $('.game_monitor').html(this.returnGameMonitor(this.app));
    this.updateBalance(this.app);
    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade-container').hide();
    $('#games').hide();
    $('.game_options').hide();

    //
    // game module specific, like max players
    //
    let game_mod = this.app.modules.returnModule(this.active_game);
    if (game_mod != null) {
      if (game_mod.maxPlayers > 2) { $('.opponent_address2').show(); }
      if (game_mod.maxPlayers > 3) { $('.opponent_address3').show(); }
    }

    if (this.browser_active == 1) { this.attachEvents(this.app); }


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