
  var open_games = [];

  // OPEN GAMES



  function createButtonElement(button_class) {

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






  function renderGamesTable(games) {

    let gamesTable = document.getElementById('games-table');
    let gamesTableBody = document.createElement("tbody");
    gamesTable.innerHTML = '';

    games.forEach((game) => {

      var node = document.createElement("tr");

      var playerTC = document.createElement("td");
      var playerTextNode = document.createTextNode(game.player);
      playerTC.appendChild(playerTextNode);

      var gameTC = document.createElement("td");
      var gameTextNode = document.createTextNode(game.game);
      gameTC.appendChild(gameTextNode);

      var statusTC = document.createElement("td");
      game.status.forEach(status => statusTC.appendChild(this.createButtonElement(status)))

      node.append(playerTC,gameTC,statusTC);
      gamesTableBody.appendChild(node);
    })
    gamesTable.append(gamesTableBody);
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

