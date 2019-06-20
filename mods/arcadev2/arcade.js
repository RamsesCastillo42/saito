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
    this.games.completed = [];

    this.games.nav       = { selected: 'open' };

  }







  ////////////////////
  // Install Module //
  ////////////////////
  async installModule() {

    if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

    var arcade_self = this;

    try {
      var sqlite = require('sqlite');
      this.db = await sqlite.open('./data/arcade.sq3');
      var sql = "CREATE TABLE IF NOT EXISTS mod_arcade (id INTEGER, status TEXT, game_bid INTEGER, player1_publickey TEXT, created_at INTEGER, expires_at INTEGER, PRIMARY KEY(id ASC))";
      let res = await this.db.run(sql, {});

    } catch (err) {
    }

  }





  ////////////////
  // Initialize //
  ////////////////
  async initialize() {

    if (this.app.BROWSER == 1 && this.browser_active == 1) {

      // Open
      this.games.open.push({ player: 'david@saito', game: 'Twilight Struggle', status: ['reject_game', 'accept_game'] });
      this.games.open.push({ player: 'richard@saito', game: 'Twilight Struggle', status: ['reject_game', 'accept_game'] });

      // Completed
      this.games.completed.push({ player: 'adrian@saito vs. lzq@saito', game: 'Twilight Struggle', status: ['joinlink'] });

      renderGamesTable(this.games[this.games.nav.selected]);

    }

    if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

    if (this.db == null) {
      try {
        var sqlite = require('sqlite');
        this.db = await sqlite.open('./data/arcade.sq3');
      } catch (err) {}
    }

  }









  ////////////////////
  // Attach Events //
  ///////////////////
  attachEvents() {

    //
    // Games Table
    //
    $('.games-nav-menu-item').on('click', (event) => {

alert("SELECTION");

      document.getElementById(this.games.nav.selected).className = "";

      let id = $(this).attr("id");
      this.games.nav.selected = id;
      document.getElementById(this.games.nav.selected).className = "highlighted";

      showGamesTable(this.games[id]);

    });



    //
    // Arcade Game Event Listener
    //
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

  }





  ////////////////////
  // Update Balance //
  ////////////////////
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







  ////////////////
  // Web Server //
  ////////////////
  webServer(app, expressapp) {

    expressapp.get('/arcade/',  (req, res) => {
      res.sendFile(__dirname + '/web/index.html');
      return;
    });

    expressapp.get('/arcade/email',  (req, res) => {
      res.sendFile(__dirname + '/web/email.html');
      return;
    });

    expressapp.get('/arcade/invite/:gameinvite',  (req, res) => {

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

    expressapp.get('/arcade/invite.css',  (req, res) => {
      res.sendFile(__dirname + '/web/invite.css');
      return;
    });

    expressapp.get('/arcade/style.css',  (req, res) => {
      res.sendFile(__dirname + '/web/style.css');
      return;
    });

    expressapp.get('/arcade/script.js',  (req, res) => {
      res.sendFile(__dirname + '/web/script.js');
      return;
    });

    expressapp.get('/arcade/img/:imagefile',  (req, res) => {
      var imgf = '/web/img/'+req.params.imagefile;
      if (imgf.indexOf("\/") != false) { return; }
      res.sendFile(__dirname + imgf);
      return;
    });
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




















  returnGameMonitor(app) {

    let game_options = "";
    let game_self = app.modules.returnModule(this.active_game);

    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }

    let show_game_options = game_options == "" ? "none" : "block";

    let invite_html = game_self.maxPlayers > 2 ? multi_invite : quick_invite;

    var invite_description = ''
    if (game_self.maxPlayers > 2) {
    } else {
    }

  }







  hideMonitor() {

    $('.gamelist').show();
    $('.game_options').show();
    $('.game_monitor').hide();

  }









}

module.exports = Arcade;

