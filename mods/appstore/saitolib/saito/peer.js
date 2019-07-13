const io = require('socket.io-client');
const saito = require('./saito');

const EventEmitter = require('events');
var util = require('util');



/**
 * Peer Constructor
 * @param {*} app
 */
function Peer(app, peerjson = "") {

  if (!(this instanceof Peer)) {
    return new Peer(app, peerjson);
  }

  this.app = app || {};


  this.peer = {};
  this.peer.host = "localhost";
  this.peer.port = "12101";
  this.peer.publickey = "";
  this.peer.protocol = "http";
  this.peer.synctype = "full";         // full = full blocks
  // lite = spv client

  this.peer.endpoint = {};
  this.peer.endpoint.host = "localhost";
  this.peer.endpoint.port = "12101";
  this.peer.endpoint.publickey = "";
  this.peer.endpoint.protocol = "http";

  this.peer.endpoint
  this.peer.keylist = [];

  //
  // validating publickey
  //
  this.handshake_ts = new Date().getTime();
  this.handshake_signature = "";
  this.handshake_completed = 0;
  this.handshake_requests_in = 0;
  this.handshake_requests_out = 0;
  this.verified = 0;
  this.challenge_remote = null;            // challenge peer creates
  this.challenge_local = null;            // challenge I create

  //
  // what to send
  //
  this.sendblocks = 1;
  this.sendtransactions = 1;
  this.sendtickets = 1;

  //
  // queue to prevent flooding
  //
  this.message_queue = [];
  this.message_queue_speed = 3000;             // sent
  this.message_queue_timer = null;


  if (this.app.SPVMODE == 1 || this.app.BROWSER == 1) {
    this.peer.synctype = "lite";
  }

  if (peerjson != "") {
    let peerobj = JSON.parse(peerjson);

    if (peerobj.peer.endpoint == null) {
      peerobj.peer.endpoint = {};
      peerobj.peer.endpoint.host = peerobj.peer.host;
      peerobj.peer.endpoint.port = peerobj.peer.port;
      peerobj.peer.endpoint.protocol = peerobj.peer.protocol;
    }

    this.peer = peerobj.peer;
    this.sendblocks = peerobj.sendblocks;
    this.sendtransactions = peerobj.sendtransactions;
    this.sendtickets = peerobj.sendtickets;
  }

  //
  // manage blockchain sync queue
  //
  this.message_queue_timer = setInterval(() => {
    if (this.message_queue.length > 0) {
      if (this.message_queue.length > 10) { this.message_queue = this.message_queue.splice(10); }
console.log("Messages in Queue: " + this.message_queue.length);
      if (this.socket != null) {
        console.log("SOCKET IS NOT NULL");
        if (this.socket.connected == true) {
console.log("Emitting Messages in Queue!");
          this.socket.emit('request', this.message_queue[0]);
          this.message_queue.splice(0, 1);
        }
      }
    }
  }, this.message_queue_speed);

  return this;

}

module.exports = Peer;

/**
 * Initialize Peer
 */
Peer.prototype.initialize = function initialize() {

}

/**
 * Returns the publickey of the peer
 */
Peer.prototype.returnPublicKey = function returnPublicKey() {
  return this.peer.publickey;
}

Peer.prototype.returnBlockURL = function returnBlockURL(block_hashes) {
  let {protocol, host, port} = this.peer.endpoint;
  let url_sync_address = "blocks";

  if (this.peer.synctype == "lite") {
    url_sync_address = "lite-blocks";
    if (block_hashes.length == 1) {
      return `${protocol}://${host}:${port}/${url_sync_address}/${block_hashes[0]}/${this.app.wallet.returnPublicKey()}`
    }
  } else {
    if (block_hashes.length == 1) {
      return `${protocol}://${host}:${port}/${url_sync_address}/${block_hashes[0]}`
    }
  }

  return `${protocol}://${host}:${port}/${url_sync_address}`;
}




/**
 * Connect to another peer in the network
 */
Peer.prototype.connect = function connect() {

  //
  // remote-originated connection
  //
  if (this.isConnected()) {

    console.log("CONNECT RUNNING... but from an already-connected socket");

    //
    // add events
    //
    this.addSocketEvents();
    this.sendHandshake();

  //
  // we are connecting to another server
  //
  } else {

    console.log("CONNECT RUNNING... no socket, time to open one.");

    //
    // open socket
    //
    // var serverAddress = `${this.peer.protocol}://${this.peer.host}:${this.peer.port}`;
    // var socket = io(serverAddress);
    // this.socket = socket;

    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (err) {
        console.log(err);
      }
      delete this.socket;
      this.socket = null;
    }

    this.socket = io.connect(`${this.peer.protocol}://${this.peer.host}:${this.peer.port}`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ['websocket']
    });

    //
    // add events
    //
    this.addSocketEvents();

  }
}





/**
 * Sends the initial connection information to the remote peer
 **/
Peer.prototype.sendHandshake = function sendHandshake(sync_blockchain = 1) {

  this.handshake_request_out++;
  if (this.handshake_request_out > 5) {
    this.app.network.cleanupDisconnectedSocket(this);
    return;
  }

  var request = {};
  request.request = "handshake";
  request.data = {};
  request.data.host = "";
  request.data.port = "";

  if (this.app.server) {
    request.data.endpoint = this.app.server.server.endpoint;
  }

  request.data.publickey = this.app.wallet.returnPublicKey();
  this.challenge_local = (new Date().getTime());
  request.data.challenge = this.challenge_local;
  request.data.synctype = this.peer.synctype;
  request.data.blockchain_send = 1;
  request.data.last_bid = this.app.blockchain.returnLatestBlockId();
  request.data.forkid = this.app.blockchain.returnForkId();
  request.data.genesis_bid = this.app.blockchain.returnGenesisBlockId();
  request.data.sendtransactions = 1;
  request.data.sendtickets = 1;
  request.data.sendblocks = 1;
  request.data.keylist = this.app.keys.returnWatchedPublicKeys();
  request.data.keylist.push(this.app.wallet.returnPublicKey());

  if (this.app.BROWSER == 0) {
    request.data.host = this.app.options.server.host;
    request.data.port = this.app.options.server.port;
    request.data.protocol = this.app.options.server.protocol;
  }

  this.sendRequest(request.request, request.data);

}




/**
 * Send a message to another Saito peer
 *
 * all messages are interpreted according to
 * the logic defined in the function:
 *
 * addSocketEvents
 *
 * @param {string} message (i.e. "block")
 * @param {string} data {i.e json object}
 **/
Peer.prototype.sendRequest = function sendRequest(message, data = "") {

  // avoid sending unwelcome data
  if (this.sendblocks == 0 && message == "block") { return; }
  if (this.sendblocks == 0 && message == "blockchain") { return; }
  if (this.sendtransactions == 0 && message == "transaction") { return; }
  if (this.sendtickets == 0 && message == "golden ticket") { return; }

  // find out initial state of peer and blockchain
  var userMessage = {};
  userMessage.request = message;
  userMessage.data = data;

  //
  // only send the message if we are connected, otherwise
  // cleanup the connection.
  //
  if (this.socket != null) {
    if (this.socket.connected == true) {
      this.socket.emit('request', JSON.stringify(userMessage));
    } else {
      this.message_queue.push(JSON.stringify(userMessage));
      return;
    }
  } else {
    this.app.network.cleanupDisconnectedSocket(this);
    return;
  }
}
/**
 * send a request to a remote peer with a callback
 *
 * TODO
 *
 * add encryption if key available
 *
 * @params {string} message (i.e. "block")
 * @params {string} data {i.e json object}
 * @params {callback}
 *
 * note that propagates instantly because we have a
 * callback to execute and cannot afford to wait
 */
Peer.prototype.sendRequestWithCallback = function sendRequestWithCallback(message, data = "", mycallback) {

  // avoid sending unwelcome data
  if (this.sendblocks == 0 && message == "block") { return; }
  if (this.sendblocks == 0 && message == "blockchain") { return; }
  if (this.sendtransactions == 0 && message == "transaction") { return; }
  if (this.sendtickets == 0 && message == "golden ticket") { return; }

  // find out initial state of peer and blockchain
  var userMessage = {};
  userMessage.request = message;
  userMessage.data = data;

  //
  // only send the message if we are connected, otherwise
  // cleanup the connection.
  //
  if (this.socket != null) {
    if (this.socket.connected == true) {
      this.socket.emit('request', JSON.stringify(userMessage), mycallback);
      return;
    } else {
      this.message_queue.push(JSON.stringify(userMessage));
      tmperr = {}; tmperr.err = "message queued for broadcast";
      mycallback(JSON.stringify(tmperr));
      return;
    }
  }

  //
  // this only executes if we are not connected
  // to the peer above
  //
  tmperr = {}; tmperr.err = "peer not connected";
  mycallback(JSON.stringify(tmperr));

}







/**
 * Is our peer connected?
 * @returns {boolean} isConnected
 */
Peer.prototype.isConnected = function isConnected() {
  if (this.socket != null) {
    if (this.socket.connected == true) {
      return true;
    }
  }
  return false;
}



/**
 * Allow our socket to send and receive messages
 *
 * After we connect to a remote node, we add events to the
 * socket. This function creates those events, which fire
 * on connections / disconnection and whenever we receive
 * data from the remote node.
 *
 * This is the heart of the peer class. All of the important
 * behavior is defined in this function.
 */
Peer.prototype.addSocketEvents = async function addSocketEvents() {

  //
  // we wrap the entire function in a try / catch block
  // so that any problems triggered by remote servers 
  // will not crash our server.
  //
  try {

    /////////////
    // connect //
    /////////////
    this.socket.on('connect', () => {
      console.log("client connect");
      this.app.connection.emit('connection_up');

      //
      // browsers get paranoid and rebroadcast any pending txs on connection to any peer
      //
      if (this.app.BROWSER == 1) {
        this.app.wallet.validateWalletSlips(this);
        this.app.network.sendPendingTransactions();
      }
    });

    ////////////////
    // disconnect //
    ////////////////
    this.socket.on('disconnect', () => {
      console.log("client disconnect");
      this.app.connection.emit('connection_dropped');

      // cleanup disconnected websocket
      this.app.connection.emit('peer_disconnect', this);
    });

    ///////////
    // event //
    ///////////
    this.socket.on('event', () => { });


    //////////////////
    // other events //
    //////////////////
    this.socket.on('request', async (data, mycallback = null) => {

      let response = {}
      if (data === undefined) {
	console.log("bad data received...");
	return;
      }
      let message = JSON.parse(data.toString());

      /////////////////////
      // module callback //
      /////////////////////
      try {
        if (message.request != undefined) {
          this.app.modules.handlePeerRequest(message, this, mycallback);
        }
      } catch (err) {
        console.log("Error triggered by: " + JSON.stringify(message));
      }

      ///////////////////////////
      // offchain notification //
      ///////////////////////////
      if (message.request == "offchain") {

        //
        // browsers get notified if ANYONE reports a 
        // chain split. Paranoia for now to start.
        //
        if (this.app.BROWSER == 1) {

          var resyncChain = confirm("Do you want to resync the chain?");

          if (resyncChain) {

            alert("Resetting Blockchain, keeping keys....");

            this.app.options.blockchain.last_hash = "";
            this.app.options.blockchain.last_bid = 0;
            this.app.options.blockchain.last_ts = "";
            this.app.options.blockchain.fork_id = "";
            this.app.options.blockchain.genesis_bid = "";
            this.app.options.blockchain.genesis_ts = "";

            this.app.wallet.wallet.inputs = [];
            this.app.wallet.wallet.outputs = [];
            this.app.wallet.wallet.spends = [];
            this.app.wallet.wallet.balance = "0.0";

            this.app.storage.saveOptions();

            alert("please restart Saito to resync your wallet");

            window.location.reload(true);

          } else {

            //alert("Please check your chain integrity at https://apps.saito.tech");
            //window.location = "https://saito.tech";

          }

        } else {

          //
          // servers shut down if one of the upstream
          // machines they are connecting to report a 
          // chain split, ignoring strange machines.
          //
          if (this.app.options.peers != undefined) {
            for (let i = 0; i < this.app.options.peers.length; i++) {
              if (
                this.app.options.peers[i].host == this.peer.host &&
                this.app.options.peers[i].port == this.peer.port
              ) {
                console.log("OFFCHAIN MESSAGE RECEIVED FOR SERVER - shutting down.");
                // process.exit();
              }
            }
          }
        }
        return;
      }



      ///////////////
      // handshake //
      ///////////////
      if (message.request == "handshake") {

        //
        // peer preferences
        //
        if (message.data.sendblocks < this.sendblocks) { this.sendblocks = message.data.sendblocks; }
        if (message.data.sendtransactions < this.sendtransactions) { this.sendtransactions = message.data.sendtransactions; }
        if (message.data.sendtickets < this.sendtickets) { this.sendtickets = message.data.sendtickets; }

        this.peer.publickey = message.data.publickey;
        this.peer.keylist = message.data.keylist;
        if (message.data.synctype == "lite") { this.peer.synctype = "lite"; }
        if (message.data.host != "") { this.peer.host = message.data.host; }
        if (message.data.port != "") { this.peer.port = message.data.port; }
        if (message.data.endpoint != {} && message.data.endpoint != null) {
          this.peer.endpoint.host = message.data.endpoint.host;
          this.peer.endpoint.port = message.data.endpoint.port;
          this.peer.endpoint.protocol = message.data.endpoint.protocol;
        }

        //
        // check blockchain
        //
        let peer_last_bid = message.data.last_bid;
        let peer_forkid = message.data.forkid;
        let peer_genesis_bid = message.data.genesis_bid;

        //
        // NOTE -- when fetching blocks from peers, you have to update
        // the lowest_acceptable_ts if you do not already have something
        // acceptable in your options / blockchain.
        //

        //
        // update blockchain sync data
        //
        let my_last_bid = this.app.blockchain.returnLatestBlockId();
        if (peer_last_bid > my_last_bid) {
          this.app.options.blockchain.target_bid = peer_last_bid;
          this.app.modules.updateBlockchainSync(my_last_bid, peer_last_bid);
        } else {
          this.app.modules.updateBlockchainSync(my_last_bid, my_last_bid);
        }


        //
        // figure out our last common block
        //
        let last_shared_bid = this.app.blockchain.returnLastSharedBlockId(peer_forkid, peer_last_bid);

        //
        // send blockchain info
        //
        if (this.app.blockchain.returnLatestBlockId() > last_shared_bid) {

          //
          // if we are completely off-chain, let us know
          //
          if ((peer_last_bid - my_last_bid > this.app.blockchain.genesis_period && peer_last_bid != 0)) {

            console.log("PROMPT OFF_CHAIN UPDATE: --->" + peer_last_bid + "<--- " + this.app.blockchain.returnLatestBlockId());
	    console.log("\n\nYour machine appears to be running at least a genesis period behind the machine to which you are connecting. We are terminating your machine now to avoid issues. This is a temporary measure added to the software during TESTNET period.");
            process.exit();
          } else {

            //
	    // if our remote peer is behind us
	    //
	    if ((this.app.BROWSER == 0 && peer_last_bid < my_last_bid)) {

	      //
              // lite-client -- even if last_shared_bid is 0 because the 
              // fork_id situation is wrong, we will send them everything
              // from the latest block they request -- this avoids lite-clients
              // that pop onto the network but do not stick around long-enough
              // to generate a fork ID from being treated as new lite-clients
              // and only sent the last 10 blocks.
              //
              if (last_shared_bid == 0 && peer_last_bid > 0 && (peer_last_bid - last_shared_bid > 9)) {
                if (peer_last_bid - 10 < 0) { peer_last_bid = 0; } else { peer_last_bid = peer_last_bid - 10; }
                this.sendBlockchain(peer_last_bid, message.data.synctype);
              } else {
                this.sendBlockchain(last_shared_bid, message.data.synctype);
              }

	    } else {

              //
	      // the other server is ahead of us in the blockchain
	      //

	    }
          }
        }

	//
	// remote peer is ahead of us in the blockchain
	//
	else {


	}


        //
        // we already received a signature confirming
        // their publickey, but had not received their
        // initial handshake. So now that we have 
        // the handshake, lets validate them.
        //
        if (this.handshake_signature != "") {
          if (this.app.crypto.verifyMessage("_" + this.challenge_local, this.handshake_signature, this.peer.publickey) == 0) {
            var sigmessage = {};
            sigmessage.request = "connect-deny";
            sigmessage.data = {};
            this.socket.emit('request', JSON.stringify(sigmessage));
            this.app.network.cleanupDisconnectedSocket(this);
          } else {
            this.verified = 1;
          }
        }

        //
        // complete handshake
        //
        this.handshake_completed = 1;

        //
        // confirm publickey
        //
	// this runs on the client that connects, and sends a message back to the server
        // asking for connection signature, which is used to confirm the publickey, also
	// sending our signature so that they can confirm ours.
	// 
        this.challenge_remote = message.data.challenge;
        var sigmessage = {};
        sigmessage.request = "connect-sig";
        sigmessage.data = {};
        sigmessage.data.sig = this.app.crypto.signMessage("_" + this.challenge_remote, this.app.wallet.returnPrivateKey());
        this.socket.emit('request', JSON.stringify(sigmessage));

      }



      /////////////////
      // connect-sig //
      /////////////////
      if (message.request == "connect-sig") {
        if (message.data == undefined) { return; }

        //
        // we have the sig-reply but no handshake
        //
        // at this point we should be connected
        // so we send another handshake request
        // and save this signature so we can 
        // process it on receipt of the handshake
        //
        let sig = message.data.sig;

        if (this.handshake_completed == 0) {

          this.handshake_signature = sig;
          //
          // request handshake
          //
          var sigmessage = {};
          sigmessage.request = "handshake request";
          sigmessage.data = {};
          this.socket.emit('request', JSON.stringify(sigmessage));
          return;

        } else {
	}
        if (sig != "") {
          if (this.app.crypto.verifyMessage("_" + this.challenge_local, sig, this.peer.publickey) == 0) {
          } else {
            this.verified = 1;
          }
        }
      }


      ///////////////////////
      // handshake request //
      ///////////////////////
      if (message.request == "handshake request") {
        this.handshake_requests_out++;
        if (this.handshake_requests > 5) {
          this.socket = null;
          this.app.network.cleanupDisconnectedSocket(this);
        }
        this.sendHandshake();
        return;
      }


      ////////////////
      // slip check //
      ////////////////
      if (message.request == "slip check") {
        let validres = {};
        if (message.data == undefined) {
          validres.valid = 0;
        } else {
          if (message.data.slip == undefined) {
            validres.valid = 0;
          } else {

            let slip = new saito.slip();
            slip.add = message.data.slip.add;
            slip.amt = message.data.slip.amt;
            slip.type = message.data.slip.type;
            slip.bid = message.data.slip.bid;
            slip.tid = message.data.slip.tid;
            slip.sid = message.data.slip.sid;
            slip.bhash = message.data.slip.bhash;
            let bid = this.app.blockchain.returnLatestBlockId();

            if (this.app.storage.validateTransactionInput(slip, bid) == 1) {
              validres.valid = 1;
            } else {
              validres.valid = 0;
            }
          }
        }
        if (mycallback != null) { mycallback(JSON.stringify(validres)); }
        return;
      }

      if (message.request == "slip check multiple") {
        if (message.data.slips == null) { 
          if (mycallback != null) { mycallback(null); }
          return;
        }

        let latest_bid = this.app.blockchain.returnLatestBlockId();
        let lc_slips_array = message.data.slips.map((input) => {
          let {add, amt, type, bid, tid, sid, bhash} = input;
          let slip = new saito.slip(add, amt, type, bid, tid, sid, bhash);

          // return 1 if valid, zero if invalid
          return this.app.storage.validateTransactionInput(slip, latest_bid) ? 1 : 0;
        });

        if (mycallback != null) { mycallback(lc_slips_array); }
        return;
      }



      //////////////////
      // connect-deny //
      //////////////////
      if (message.request == "connect-deny") {
        this.socket = null;
        this.app.network.cleanupDisconnectedSocket(this);
        return;
      }

      ///////////////////
      // missing block //
      ///////////////////
      if (message.request == "missing block") {

        let t = JSON.parse(message.data);
        let missing_hash = t.hash;
        let last_hash = t.last_hash;

        let missing_bid = this.app.blockchain.block_hash_hmap[missing_hash];
        let last_bid = this.app.blockchain.block_hash_hmap[last_hash];

        if (last_hash == "") {
          if (missing_bid > 0) {
            var missing_block_data = { bhash: missing_hash, bid: missing_bid };
            this.sendRequest("block", missing_block_data);
          }
          return;
        }

        if (last_bid > 0) {

          // if we need to send more, send whole blockchain
          if (missing_bid > last_bid + 1) {
            this.sendBlockchain(last_bid + 1);
          } else {
            var missing_block_data = { bhash: missing_hash, bid: missing_bid };
            this.sendRequest("block", missing_block_data);
          }

          if (mycallback != null) { mycallback(); }

        }

      }



      ///////////
      // block //
      ///////////
      if (message.request == "block") {
        if (message.data == null) { return; }
        if (message.data.bhash == null) { return; }
        console.log("\n________________________________");
        console.log("BLOCK AVAILABLE: " + message.data.bhash);
        console.log("________________________________\n");
        if (this.app.blockchain.isHashIndexed(message.data.bhash) != 1) {
          this.app.mempool.addBlockToQueue(this, message.data.bhash);
          this.app.mempool.fetchBlocks();
        }
        return;
      }


      ////////////////
      // blockchain //
      ////////////////
      if (message.request == "blockchain") {

        if (this.handshake_completed == 0) { return; }

        let blocks = message.data;
        let prevhash = blocks.start;

        for (let i = 0; i < blocks.prehash.length; i++) {
          let bid = blocks.bid[i];
          let hash = this.app.crypto.hash(blocks.prehash[i] + prevhash);
          let ts = blocks.ts[i];
          let txsno = blocks.txs[i];


	  if (i == 0) {
	    //
	    // if we are a lite-client, set our slips as
	    // off the longest-chain if we are receiving
	    // any slips from later than this sync starts
	    // as we won't know if the chain was reorged
	    // or not.
	    //
	    if (this.app.BROWSER == 1) {
	      console.log("slip sanity check: resetting all slips as invalid >= "+bid);
	      this.app.wallet.resetSlipsOffLongestChain(bid);
	    }
	  }


          if (this.app.blockchain.isHashIndexed(hash) != 1) {
            if (txsno == 0 && this.app.BROWSER == 1) {
              await this.app.blockchain.addHashToBlockchain(hash, ts, bid, prevhash);
            } else {
              this.app.mempool.addBlockToQueue(this, hash);
            }
          }
          prevhash = hash;
        }
        this.app.mempool.fetchBlocks();
        this.app.blockchain.saveBlockchain();
      }



      /////////////////
      // transaction //
      /////////////////
      if (message.request == "transaction") {
        var tx = new saito.transaction(message.data);
        if (tx == null) { console.log("NULL TX"); return; }
        if (!tx.is_valid) { console.log("NOT VALID TX"); return; }
        try {
          this.app.mempool.addTransaction(tx);
        } catch (err) {
          console.log(err);
        }
        if (mycallback != null) {
          mycallback();
        }
        return;
      }


      ///////////////////
      // golden ticket //
      ///////////////////
      if (message.request == "golden ticket") {
        var tx = new saito.transaction(message.data);
        if (tx == null) { return; }
        if (tx.is_valid == 0) { return; }
        this.app.network.propagateGoldenTicket(tx);
        this.app.mempool.importTransaction(message.data);
        return;
      }


      /////////
      // dns //
      /////////
      if (message.request == "dns") {
        this.app.modules.handleDomainRequest(message, this, mycallback);
        return;
      }

      /////////
      // dns //
      /////////
      if (message.request == "dns multiple") {
        this.app.modules.handleMultipleDomainRequest(message, this, mycallback);
        return;
      }

      ////////////
      // module //
      ////////////
      if (message.request == "module") {
        let mod_exists = this.app.modules.mods.some((mod) => {
          return mod.name == message.data
        });
        if (mycallback) {
          mycallback(mod_exists);
        }
      }


      if (mycallback != null) {
        mycallback();
      }

    });

  } catch (err) {
    console.log("ERROR: Peer.addSocketEvents - " + JSON.stringify(err));
  }

}




Peer.prototype.sendBlockchain = function sendBlockchain(start_bid, synctype) {

  if (start_bid == 0) {
    let block_gap = synctype == "full" ? this.app.blockchain.genesis_period : 10
    start_bid = this.app.blockchain.returnLatestBlockId() - block_gap;
    if (start_bid < 0) { start_bid = 0; }
  }

  let message = {};
  message.request = "blockchain";
  message.data = {};
  message.data.start = null;
  message.data.prehash = [];
  message.data.bid = [];
  message.data.ts = [];
  message.data.txs = [];

  let starting_blockchain_index = 0;
  let start_idx = 0;

  for (let i = this.app.blockchain.index.bid.length; i >= 0; i--) {
    if (this.app.blockchain.index.bid[i] < start_bid) {
      i = -1;
    } else {
      start_idx = i;
    }
  }

  let first = 0;
  for (let i = start_idx; i < this.app.blockchain.index.hash.length; i++) {
    if (this.app.blockchain.index.lc[i] == 1) {
      if (message.data.start == null) {
        message.data.start = this.app.blockchain.blocks[i].block.prevhash;
      }
      message.data.prehash.push(this.app.blockchain.blocks[i].prehash);
      message.data.bid.push(this.app.blockchain.index.bid[i]);
      message.data.ts.push(this.app.blockchain.index.ts[i]);
      //
      // number of txs for me
      //
      if (this.app.blockchain.blocks[i].hasKeylistTransactionsInBloomFilter(this.peer.keylist)) {
        message.data.txs.push(1);
      } else {
        message.data.txs.push(0);
      }
    }
  }

  this.socket.emit('request', JSON.stringify(message));
  return;

}






Peer.prototype.promptOffChainUpdate = function promptOffChainUpdate() {

  let message = {};
  message.request = "offchain";

  console.log("sending message..." + JSON.stringify(message));
  this.socket.emit('request', JSON.stringify(message));
  return;

}









///////////////////////
// inTransactionPath //
///////////////////////
//
// is this peer is the transaction path of this transaction?
//
// @params {saito.transaction} transaction to check
//
/**
 * Checks if a peer is in the transaction path of the provided transaction
 **/
Peer.prototype.inTransactionPath = function inTransactionPath(tx) {
  if (tx == null) { return 0; }
  if (tx.isFrom(this.peer.publickey)) { return 1; }
  for (let zzz = 0; zzz < tx.transaction.path.length; zzz++) {
    if (tx.transaction.path[zzz].from == this.peer.publickey) {
      return 1;
    }
  }
  return 0;
}


/**
 * Adds the path to TX
 */
Peer.prototype.addPathToTransaction = function addPathToTransaction(tx) {
  var tmptx = new saito.transaction();
  tmptx.transaction = JSON.parse(JSON.stringify(tx.transaction));

  // add our path
  var tmppath = new saito.path();
  tmppath.from = this.app.wallet.returnPublicKey();
  tmppath.to = this.returnPublicKey();
  tmppath.sig = this.app.crypto.signMessage(tmppath.to, this.app.wallet.returnPrivateKey());

  tmptx.transaction.path.push(tmppath);
  return tmptx;
}



