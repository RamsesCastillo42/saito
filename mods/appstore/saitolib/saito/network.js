const saito = require('./saito');


/**
 * Network Constructor
 * @param {*} app
 */
function Network(app) {

  if (!(this instanceof Network)) {
    return new Network(app);
  }


  this.app                      = app || {};


  this.peers                    = [];
  this.peer_monitor_timer       = null;
  this.peer_monitor_timer_speed = 10000;  // check socket status every 10 seconds
  this.peers_connected          = 0;
  this.peers_connected_limit    = 20; // max peers

  this.polling_timer            = null;
  this.polling_speed            = 60000; // attempt to reconnect every ten minutes

  //
  // we don't transmit fees that have
  // less than this in payment, in order
  // to provide a baseline.
  //
  this.minimum_rebroadcast_fee              = 0.001;

  return this;

}
module.exports = Network;



/**
 * Initialize Network
 *
 * Check our options file to see which peers we should
 * connect to and start the connection process. Note that
 * connections are not instant, so other parts of the
 * application may not be able to use the network right
 * when they are initializing
 *
 * Once peers are setup, we start a timer that monitors
 * the quality of the connections and handles socket
 * disconnections.
 */
Network.prototype.initialize = function initialize() {

  // connect to peers
  if (this.app.options.peers != null) {
    for (let i = 0; i < this.app.options.peers.length; i++) {
      console.log("Initialize our Network and Connect to Peers");
      this.addPeer(JSON.stringify(this.app.options.peers[i]));
    }
  }

  // and monitor them
  this.peer_monitor_timer = setInterval(() => {
    for (let i = this.peers.length-1; i >= 0; i--) {
      if (i >= this.peers.length) { i = this.peers.length-1; }
      if (!this.peers[i].isConnected()) {

	let disconnect_from_peer = 1;

	//
	// do not eliminate peers getting connected
	//
	if (this.peers[i].handshake_completed == 0) {

console.log("handshake is not completed....");

	  disconnect_from_peer = 0;
	  let current_ts = new Date().getTime();
	  let diff_ts    = current_ts - this.peers[i].handshake_ts;

	  //
	  // disconnect after 5 seconds if handshake failed
	  //
	  if (diff_ts > 5000) {
	    disconnect_from_peer = 1;
	  }
	}

	if (disconnect_from_peer == 1) {
  	  console.log("We should cleanup this disconnected socket");
	  console.log(" ... is its handshake done? " + this.peers[i].handshake_completed);
          this.cleanupDisconnectedSocket(this.peers[i]);
	  console.log("We have cleaned-up this disconnected socket");
	}

      }
    }
  }, this.peer_monitor_timer_speed);

  // long-polling
  //
  // attempt to re-establish a connection with peers in options file
  //
  // this.polling_timer = setInterval(() => {
  //   if (this.peers != null) {
  //     for (let i = 0; i < this.peers.length; i++) {
  //       if (!this.peers[i].isConnected()) {
  //         console.log("Attempting to reconnect to the following peer");
  //         this.peers[i].connect();
  //       }
  //     }
  //   }
  // }, this.polling_speed);


}







/**
 * Add a remote peer to our network connection class
 *
 * We do a quick sanity check to make sure we are not connecting
 * to ourselves before we connect to a peer node.
 *
 * @param {string} peerjson json on peer
 * @param {boolean} sendblks send blocks to this peer
 * @param {boolean} sendtx send transactions to this peer
 * @param {boolean} sendgtix golden ticket solutions to this peer
 *
 **/
Network.prototype.addPeer = function addPeer(peerjson, sendblks=1, sendtx=1, sendgtix=1) {

  let peerhost = "";
  let peerport = "";

  console.log("CONNECTING TO : " + peerjson);


  let peerobj = {};
  peerobj.peer = JSON.parse(peerjson);

  if (peerobj.peer.protocol == null) {
    peerobj.peer.protocol = "http";
  }

  peerobj.sendblocks       = sendblks;
  peerobj.sendtransactions = sendtx;
  peerobj.sendtickets      = sendgtix;

  if (peerobj.peer.host != undefined) { peerhost = peerobj.peer.host; }
  if (peerobj.peer.port != undefined) { peerport = peerobj.peer.port; }

  //
  // no duplicate connections
  //
  for (let i = 0; i < this.peers.length; i++) {
console.log("Adding peer: " + i + " --- " + this.peers.length);
    if (this.peers[i].peer.host == peerhost && this.peers[i].peer.port == peerport) {
      if (sendblks == 1) { this.peers[i].sendblocks = 1;       }
      if (sendtx   == 1) { this.peers[i].sendtransactions = 1; }
      if (sendgtix == 1) { this.peers[i].sendtickets = 1;      }
      return;
    }
  }


  //
  // do not connect to ourselves
  //
  if (this.app.options.server != null) {
    if (this.app.options.server.host == peerhost && this.app.options.server.port == peerport) {
      console.log("Not adding "+this.app.options.server.host+" as peer node as it is our server.");
      return;
    }
    if (this.app.options.server.endpoint != null) {
      if (this.app.options.server.endpoint.host == peerhost &&
        this.app.options.server.endpoint.port == peerport) {
        console.log("Not adding "+this.app.options.server.endpoint.host+" as peer node as it is our server.");
        return;
      }
    }
  }

  //
  // create peer and add it
  //
  let peer = new saito.peer(this.app, JSON.stringify(peerobj));
  peer.connect();
  this.peers.push(peer);
  this.peers_connected++;

  //
  // 
  //
  console.log("CONNECTED TO : " + peerjson);

}




/**
 * Foreign-originated connections hit our network class here.
 * If we are originating the connection ourselves, we want to
 * use the function:
 *
 * @param {socket.io-client socket} socket peer socket
 *
 **/
Network.prototype.addRemotePeer = function addRemotePeer(socket) {

  // deny excessive connections
  if (this.peers_connected >= this.peers_connected_limit) {
    var message = {};
        message.request               = "connect-deny";
    socket.emit('request',JSON.stringify(message));
    socket.disconnect();
    return;
  }

  // sanity check
  for (let i = 0; i < this.peers.length; i++) {
    if (this.peers[i].socket_id == socket.id) {
      console.log("error adding socket: already in pool");
      return;
    }
  }


  //
  // add peer
  //
  let peer = new saito.peer(this.app);
  peer.socket = socket;
  peer.connect();
  this.peers.push(peer);
  this.peers_connected++;

}






/**
 * Is Private Network
 *
 * Returns 1 if we are the only node on this network.
 *
 * This is used by the mempool class when producing blocks
 * as we do not want to flood a public network with blocks
 * created when the burn value hits 0.0 if we are on a public
 * network -- it may just be that our connection dropped.
 */
Network.prototype.isPrivateNetwork = function isPrivateNetwork() {

  // we calculate the number of peers to which we ARE connected
  // and/or the number of peers we have specified that we want
  // to be connected with in order to determine if we are on a
  // private network.

  // private networks are useful for testing functionality, as
  // we will not produce blocks without transactions on a public
  // network.

  for (let i = 0; i < this.peers.length; i++) {
    if (this.peers[i].isConnected()) { return false; }
  }

  if (this.app.options.peers != null) { return false; }

  return true;

}



/**
 * returnPeerByPublicKey
 *
 * Returns the peer that matches this publickey
 *
 */
Network.prototype.returnPeerByPublicKey = function returnPeerByPublicKey(pkey) {
  for (let i = 0; i < this.peers.length; i++) {
    if (this.peers[i].peer.publickey == pkey) { return this.peers[i]; }
  }
  return null;
}





/**
 * Remove disconnected peers from our list of peers
 *
 * @param {saito.peer} peer peer to remove
 *
 **/
Network.prototype.cleanupDisconnectedSocket = function cleanupDisconnectedSocket(peer) {

  for (let c = 0; c < this.peers.length; c++) {

console.log("cleanup disconnected socket -- loop: " + c + " ---- " + this.peers.length);

    if (this.peers[c] == peer) {

      //
      // do not remove peers we asked to add
      //
      if (this.app.options.peers != null) {
        for (let d = 0; d < this.app.options.peers.length; d++) {
          if (this.app.options.peers[d].host == peer.peer.host && this.app.options.peers[d].port == peer.peer.port) {
            return;
          }
        }
      }

      //
      // do not remove peers serving dns
      //
      if (this.app.options.peers != null) {
        if (this.app.options.dns != null) {
          for (let d = 0; d < this.app.options.dns.length; d++) {
            if (this.app.options.dns[d].host == peer.peer.host && this.app.options.dns[d].port == peer.peer.port) {
              return;
            }
          }
        }
      }


      //
      // otherwise, remove peer
      //
      clearInterval(this.peers[c].message_queue_timer);
      this.peers.splice(c, 1);
      c--;
      this.peers_connected--;
    }
  }
}





/**
 * propagates a block to the network
 *
 * right now this directly calls the "sendBlock" function
 * but we have a separate function here as in the future
 * we may wish to be more selective about the nodes to
 * which we send blocks as part of active bandwidth
 * management.
 *
 * We should aim to have the code send blocks here if they
 * want the network class to deal with them, or directly to
 * sendBlock if they want to send it to all connections.
 *
 * @param {saito.block} blk
 **/
Network.prototype.propagateBlock = function propagateBlock(blk) {

  if (this.app.BROWSER == 1) { return; }

  if (blk == null) { return; }
  if (blk.is_valid == 0) { return; }

  var data = { bhash : blk.returnHash() , bid : blk.block.id };
  for (let i = 0; i < this.peers.length; i++) {
    console.log("SENDING BLOCK DATA: ", data.bhash);
    console.log("TO: ", this.peers[i].peer.host);
    this.peers[i].sendRequest("block", data);
  }

}

/**
 * Propagates a golden ticket to all peers
 *
 * @param {saito.transaction} tx transaction with a golden ticket solution
 **/
Network.prototype.propagateGoldenTicket = function propagateGoldenTicket(tx) {
  if (tx == null) { return; }
  if (tx.is_valid == 0) { return; }
  if (tx.transaction.gt == 0) { return; }
  if (tx.transaction.msg == "") { return; }

  this.propagateTransaction(tx, "golden ticket");

}


/**
 *
 * this lets us micromanage the information we broadcast
 * to our peers. the message is what is filtered-on by
 * peers when deciding how to treat incoming messages, while
 * the data is whatever data is then read-in by the software
 *
 * @params {string} request message
 * @params {saito.block} request data
 **/
Network.prototype.sendRequest = function sendRequest(message, data="") {
  for (let x = this.peers.length-1; x >= 0; x--) {
    this.peers[x].sendRequest(message, data);
  }
}


/**
 * propagates a transaction to all peers
 *
 * @param {saito.transaction} tx transaction
 * @param {string} outbound_message the message added to the transaction
 **/
Network.prototype.propagateTransaction = function propagateTransaction(tx, outbound_message="transaction", mycallback=null) {

  if (tx == null) { return; }
  if (!tx.is_valid) { return; }

  //
  // add to mempool if it does not already exit
  //
  if (this.app.BROWSER == 0 && this.app.SPVMODE == 0) {
    if (this.app.mempool.containsTransaction(tx) != 1) {
      if ( (this.app.mempool.returnBundlingFeesNeeded() - tx.returnFeesUsable(this.app, this.app.wallet.returnPublicKey())) <= 0) {
        try {
          this.app.mempool.addTransaction(tx);
        } catch(err) {
          console.log(err);
        }
        //
        // return as we can create a block
        //
        return;
      } else {
        try {
          this.app.mempool.addTransaction(tx);
        } catch(err) {
          console.log(err);
        }
      }
    }
  }

  //
  // whether we propagate depends on whether the fees paid are adequate
  //
  let fees = tx.returnFeesTotal(this.app);
  for (let i = 0; i < this.peers.length; i++) {
    fees = fees / 2;
  }
  if (fees < this.minimum_rebroadcast_fee) {
    if (this.app.BROWSER == 1) {
      for (let j = 0; j < tx.transaction.from.length; j++) {
        this.app.wallet.resetSelectSpentInputs(tx.transaction.from[j]);
      }
    }
    if (mycallback != null) {
      mycallback("Transaction fee is too low to propagate");
    }
    return;
  }

  this.sendTransactionToPeers(tx, outbound_message, mycallback);
}


/**
 * Sends Transaction to all connected peers, after checking if the tx has already been there
 */
Network.prototype.sendTransactionToPeers = function signTXAndSendToPeers(tx, outbound_message, callback=null) {
  this.peers.forEach((peer) => {
    if (!peer.inTransactionPath(tx)) {
      let tmptx = peer.addPathToTransaction(tx);
      if (callback) {
        peer.sendRequestWithCallback(outbound_message, JSON.stringify(tmptx.transaction), callback);
      } else {
        peer.sendRequest(outbound_message, JSON.stringify(tmptx.transaction));
      }
    }
  });
}

/**
 * propagateTransactionWithCallback
 *
 * socket.io allows us to send messages and have the
 * other peer invoke a callback. this function wraps
 * this functionality. it is provided so that modules
 * can confirm.
 *
 * TODO:
 *
 * make callback messages secure/encrypted by default
 * if a key exists between us and our target peer.
 *
 * make sure callback message only fires X times,
 * instead of once for every peer that receives it.
 **/
Network.prototype.propagateTransactionWithCallback = function propagateTransactionWithCallback(tx, mycallback=null) {
  this.propagateTransaction(tx, "transaction", mycallback);
}


/**
 * are we connected to the network?
 **/
Network.prototype.isConnected = function isConnected() {
  for (let k = 0; k < this.peers.length; k++) {
    if (this.peers[k].isConnected() == 1) { return 1; }
  }
  return 0;
}


/**
 * are we connected to the network?
 **/
Network.prototype.hasPeer = function hasPeer(publickey) {
  for (let k = 0; k < this.peers.length; k++) {
    if (this.peers[k].returnPublicKey() == publickey) return true
  }
  return false
}



/**
 * close all network connections -- called on shutdown
 **/
Network.prototype.close = function close() {
  for (let i = 0; i < this.peers.length; i++) {
    this.peers[i].socket.disconnect();
  }
  return;
}


