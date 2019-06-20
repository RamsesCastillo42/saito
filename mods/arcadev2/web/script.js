



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



