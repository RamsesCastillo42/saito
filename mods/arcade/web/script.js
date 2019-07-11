

  var open_games = [];

  // OPEN GAMES



  function createGameButton(button_class, button_id) {

    var button = document.createElement("button");
    button.className = button_class;
    button.id = button_id;

    let text_node;

    switch(button_class){
      case "accept_game":
        text_node = document.createTextNode("ACCEPT");
        break;
      case "reject_game":
        text_node = document.createTextNode("REJECT");
        break;
      case "join_game":
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

  function createGameTableCell(content) {
    var gameTableCell = document.createElement("div");
    gameTableCell.className = "game_table_cell";

    var gameTableCellContent = document.createTextNode(content);
    gameTableCell.appendChild(gameTableCellContent);
    return gameTableCell
  }




  function renderGamesTable(games, my_publickey="") {

    $('#games-table tbody').empty();

    let gamesTable = document.getElementById('games_table');
    // let gamesTableBody = document.createElement("tbody");
    gamesTable.innerHTML = '';

    games.reverse().forEach((game) => {
      if (game.player == "unknown") { return; }

      var gameRow = document.createElement("div");
      gameRow.className = "game_table_row";

      if (game.status.length > 20) { game.status = `${game.status.substring(0, 20)}...`; }
      if (game.state == "open") { game.status = "waiting for opponent"; }
      if (game.state == "over") { game.status = "opponent resigned"; }
      if (game.state == "accept") { game.status = "waiting for acceptance"; }



      let playerName = my_publickey == game.player ?  "Me" : game.player.substring(0,16);
      if (game.identifier != null) {
        playerName = game.identifier;
      }
      let playerCell = createGameTableCell(playerName);
      playerCell.id = "game_cell_player";

      let gameCell = createGameTableCell(game.game);
      gameCell.id = "game_cell_game";

      let statusCell = createGameTableCell(game.status);
      statusCell.id = "game_cell_status";

      if (game.state == "open") {

        var buttonCell = document.createElement("div");
        buttonCell.className = "button_container";
        buttonCell.appendChild(this.createGameButton("accept_game", game.sig));

      } else {

        if (game.state == "over") {
          var buttonCell = document.createElement("div");
          buttonCell.className = "button_container";
          buttonCell.appendChild(this.createGameButton("join_game", game.adminid));
          buttonCell.appendChild(this.createGameButton("delete_game", game.adminid));
	} else {

	  if (game.state == "invited") {

            var buttonCell = document.createElement("div");
            buttonCell.className = "button_container";
            buttonCell.appendChild(this.createGameButton("accept_game", game.adminid));

	  } else {

            var buttonCell = document.createElement("div");
            buttonCell.className = "button_container";
            buttonCell.appendChild(this.createGameButton("join_game", game.adminid));
            buttonCell.appendChild(this.createGameButton("delete_game", game.adminid));

	  }
	}
      }

      if (game.state != "deleted") {
        gameRow.append(playerCell,gameCell,statusCell,buttonCell);
        gamesTable.appendChild(gameRow);
      }

    })
  }

  function renderForumTable(posts) {
    $('.forum_table').empty();
    let html = "";

    posts.forEach(post => {
      html +=
        `<div class="post-preview" style="width:100%;">
          <div class="content_title">
            <a href="/r/${post.subreddit}/${post.tx.sig}">${post.title}</a>
          </div>
          <div class="content_details">
            submitted by
            <span class="post_author_clickable">${post.post_author.substring(0,24)}
            to
            <a href="/r/${post.subreddit}">/r/${post.subreddit}</a>
          </div>
        </div>`;
    });

    $('.forum_table').html(html);
  }


  function populateGameMonitor(app) {

    let game_options = "";
    let game_self = app.modules.returnModule(this.active_game);

    if (this.active_game != "") {
      if (game_self != null) {
        game_options = game_self.returnGameOptionsHTML();
      }
    }

    $('.game_details').html(game_options);
  }
















  function showMonitor() {
    this.populateGameMonitor(this.app);
    this.updateBalance(this.app);

    $('.game_monitor').slideDown(500, function() {});
    $('.gamelist').hide();
    $('#arcade_container').hide();
    $('#games').hide();
    $('.game_options').hide();

    this.addModalEvents();

    if (this.browser_active == 1) { this.attachEvents(this.app); }
  }

  function addModalEvents() {
    // Modal Functionality
    // Get the modal
    var modal = document.getElementById("game_modal");
    var btn = document.getElementById("game_button");
    var modalSelector = document.getElementById("game_modal_selector");
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

    // game_modal_selector
    modalSelector.addEventListener("change", (event) => {
      let gameSelectHTML = this.renderModalOptions(event.target.value)
      $('#game_start_options').innerHTML = '';
      $('#game_start_options').html(gameSelectHTML);
    });
  }

  function renderModalOptions(option, app) {
    switch(option) {
      case 'open':
        return `<button class="quick_invite">CREATE GAME</button>`
      case 'link':
        return `<input class="quick_link_input" />`
      case 'key':
        let selectedGameModule = app.modules.returnModule(this.active_game);
        let html = `<div class="oponent_key_container">`
        for (let i = 0; i < selectedGameModule.maxPlayers - 1; i++) {
          html += `<div style="display: flex; align-items: center;"><span style="margin-right: 15px;">OPPONENT ${i + 1}:</span> <input class="opponent_address" id=${i}></input></div>`
        }
        html += `<button class="quick_invite"> INVITE</button>`;
        html += "</div>";
        return html;
      default:
        break;
    }
  }

