'use strict';

const saito    = require('./saito');
const fs       = require('fs-extra')
const shashmap = require('shashmap');
const path     = require('path');
const sqlite   = require('sqlite');


/**
 * Storage Constructor
 * @param {*} app
 */
function Storage(app, data, dest="blocks") {

  if (!(this instanceof Storage)) {
    return new Storage(app);
  }

  var dir = data || path.join(__dirname, '../../data');

  this.app                 = app || {};
  this.directory           = dir;
  this.dest                = dest;
  this.db                  = null;
  this.loading_active      = false;

  this.use_shashmap_dump   = 0;
  this.shashmap_dump_mod   = 100;
  this.shashmap_fastload   = 0;
  this.shashmap_dump_bid   = 0;
  this.shashmap_dump_bhash = "";
  if (this.app.BROWSER == 0) { this.use_shashmap_dump = 1; }


  return this;

}
module.exports = Storage;


/**
 * Initialize the database and load the options file
 */
Storage.prototype.initialize = async function initialize() {

  //
  // load options file
  //
  this.loadOptions();

  //
  // save the file
  //
  this.saveOptions();

  //
  // only servers will have sqlite3 installed
  //
  if (this.app.BROWSER == 0) {

    // database
    try {

      this.db = await sqlite.open(this.directory + '/database.sq3');

      //
      // restore shashmap ? 
      //
      if (this.use_shashmap_dump == 1) {

        //
        // this sets shashmap_dump_bid / bhash
        //
        await this.returnShashmapDump();
        let shashmap_imported = 0;

        if (this.shashmap_dump_bid >0 && this.shashmap_dump_bhash != "") {

          let shashmap_file = this.directory + '/shashmaps/' + this.shashmap_dump_bid + "_" + this.shashmap_dump_bhash + '.smap';
          if (fs.existsSync(shashmap_file)) {
            this.shashmap_fastload = 1;
            await shashmap.load(shashmap_file);
            shashmap_imported = 1;

            await this.createDatabaseTablesNonDestructive();
            if (shashmap_imported == 1) {
              let sql = "DELETE FROM blocks WHERE block_id >= $bid";
              let params = { $bid : this.shashmap_dump_bid };
              await this.execDatabase(sql, params);
            }
          } else {

            await this.createDatabaseTables();

          }
        } else {

          await this.createDatabaseTables();

        }

      } else {
        await this.createDatabaseTables();
      }

      await Promise.all([
        // pragma temp store -- temp objects in memory (2) (default = 0)
        this.db.run("PRAGMA temp_store = 2"),

        // controls pagesize. default is 4096
        this.db.run("PRAGMA page_size = 32768"),

        // increase cache size (default is 1024)
        this.db.run("PRAGMA cache_size = 512000"),

        // radically faster db writes at cost of corruption on power failure
        this.db.run("PRAGMA synchronous = OFF"),

        // depreciated by small tweak
        this.db.run("PRAGMA count_changes = false"),

        // no rollbacks and db corruption on power failure
        this.db.run("PRAGMA journal_mode = OFF"),
      ]);
    } catch(err) {
      console.log(err);
    }
  }

  return;
}

/**
 * Create DB Tables
 */
Storage.prototype.createDatabaseTables = async function createDatabaseTables() {

  if (this.app.BROWSER == 1) { return; }

  try {
    await this.db.run("DROP TABLE IF EXISTS blocks");
    await this.createDatabaseTablesNonDestructive();
  } catch(err) {
    console.log(err);
  }
}


/**
 * Create DB Tables
 */
Storage.prototype.createDatabaseTablesNonDestructive = async function createDatabaseTablesNonDestructive() {

  if (this.app.BROWSER == 1) { return; }

  try {
    await this.db.run("\
      CREATE TABLE IF NOT EXISTS blocks (\
        id INTEGER, \
        reindexed INTEGER, \
        block_id INTEGER, \
        golden_ticket INTEGER, \
        min_tx_id INTEGER, \
        max_tx_id INTEGER, \
        block_json_id INTEGER, \
        hash TEXT, \
        conf INTEGER, \
        longest_chain INTEGER, \
        shashmap INTEGER DEFAULT 0, \
        UNIQUE (block_id, hash), \
        PRIMARY KEY(id ASC) \
      )");

    await Promise.all([
      this.db.run("CREATE INDEX IF NOT EXISTS blocks_idx ON blocks (block_id, longest_chain)"),
      this.db.run("CREATE INDEX IF NOT EXISTS blocks_idx2 ON blocks (reindexed)"),
      this.db.run("CREATE INDEX IF NOT EXISTS blocks_idx3 ON blocks (hash)")
    ]);
  } catch(err) {
    console.log(err);
  }
}


/**
 * Executes an SQL command like INSERT, UPDATE, etc.
 *
 * @param {string} sql command
 * @param {*} parameters
 */
Storage.prototype.execDatabase = async function execDatabase(sql, params, mycallback=null) {

  if (this.app.BROWSER == 1) { return; }

  try {
    let res = await this.db.run(sql, params)
    if (mycallback == null) { return; }
    mycallback(null, res);
  } catch (err) {
    if (mycallback == null) { return; }
    mycallback(err);
    this.app.logger.logError("Error thrown in execDatabase: "+sql+" " + JSON.stringify(params), {message:"", stack: err});
  }
}

/**
 * Saves a block to database and disk and shashmap
 *
 * @param {saito.block} blk block
 * @param {int} lc longest chain
 */
Storage.prototype.saveBlock = async function saveBlock(blk=null, lc=0) {

//console.log(" .... updte slips: " + new Date().getTime());

  //
  // shashmap_fastload speedup avoids all shashmap and database
  // work if we are reloading from disk and have our database
  // and shashmap already updated to a particularly BID
  //
  if (this.shashmap_fastload == 1) {
    if (this.shashmap_dump_bid > blk.block.id) {} else { this.shashmap_fastload = 0; } 
  }


  /////////////////////////////////////////
  // update slips here for wallet insert //
  /////////////////////////////////////////
  if (this.app.BROWSER == 1 || blk == null || !blk.is_valid ) { 
    for (let b = 0; b < blk.transactions.length; b++) {
      for (let bb = 0; bb < blk.transactions[b].transaction.to.length; bb++) {
        //
        // this information is also needed by the wallet when inserting slips
        // if we edit this, we need to check wallet.processPayments to be sure
        // that slip information is still valid.
        //
        blk.transactions[b].transaction.to[bb].bid = blk.block.id;
        blk.transactions[b].transaction.to[bb].bhash = blk.returnHash();
        blk.transactions[b].transaction.to[bb].tid = blk.transactions[b].transaction.id;
        blk.transactions[b].transaction.to[bb].lc = lc;
      }
    }
    return;
  }

//console.log(" .... updte shsmp: " + new Date().getTime());

  //
  //
  //
  if (this.shashmap_fastload == 0) {

    ///////////////////////
    // slips to shashmap //
    ///////////////////////
    //
    // insert the "to" slips so that future blocks can manipulate them
    //
    for (let b = 0; b < blk.transactions.length; b++) {
      for (let bb = 0; bb < blk.transactions[b].transaction.to.length; bb++) {
        if (blk.transactions[b].transaction.to[bb].amt > 0) {

          //
          // this information is also needed by the wallet when inserting slips
          // if we edit this, we need to check wallet.processPayments to be sure
          // that slip information is still valid.
          //
          blk.transactions[b].transaction.to[bb].bid = blk.block.id;
          blk.transactions[b].transaction.to[bb].bhash = blk.returnHash();
          blk.transactions[b].transaction.to[bb].tid = blk.transactions[b].transaction.id;
          blk.transactions[b].transaction.to[bb].lc = lc;

          var slip_map_index = blk.transactions[b].transaction.to[bb].returnIndex();
          shashmap.insert_slip(slip_map_index, -1);

        }
      }
    }


    ///////////////////////
    // block to database //
    ///////////////////////
    //
    // this is > -1 if we are reading the block
    // off disk and restoring our database, in
    // which case we want to use our prior IDs
    // to maintain consistency with the saved
    // blocks
    //
    var sql = "";
    var params = "";
    if (blk.save_db_id > -1) {
      sql = `INSERT INTO blocks (id, block_id, golden_ticket, reindexed, block_json_id, hash, conf, longest_chain, min_tx_id, max_tx_id) VALUES ($dbid, $block_id, $golden_ticket, 1, $block_json_id, $hash, 0, $lc, $mintxid, $maxtxid)`;
      params =  {
        $dbid: blk.save_db_id,
        $block_id: blk.block.id,
        $golden_ticket: blk.containsGoldenTicket(),
        $block_json_id : 0,
        $hash: blk.returnHash(),
        $lc: lc,
        $mintxid: blk.returnMinTxId(),
        $maxtxid: blk.returnMaxTxId()
      }
    } else {
      sql = `INSERT INTO blocks (block_id, golden_ticket, reindexed, block_json_id, hash, conf, longest_chain, min_tx_id, max_tx_id) VALUES ($block_id, $golden_ticket, 1, $block_json_id, $hash, 0, $lc, $mintxid, $maxtxid)`;
      params = {
        $block_id: blk.block.id,
        $golden_ticket: blk.containsGoldenTicket(),
        $block_json_id : 0,
        $hash: blk.returnHash(),
        $lc: lc,
        $mintxid: blk.returnMinTxId(),
        $maxtxid: blk.returnMaxTxId()
      }
    };



    ///////////////////
    // block to disk //
    ///////////////////
    try {
      var res = await this.db.run(sql, params);
  
      //
      // save shashmap
      //
      if (this.app.BROWSER == 0) { await this.dumpShashmap(blk.block.id, blk.returnHash()); }
      blk.filename = `${blk.block.id}-${res.lastID}.blk`;
      var tmp_filepath = `${this.directory}/${this.dest}/${blk.filename}`;
      let blkjson = blk.stringify();

      if (!fs.existsSync(tmp_filepath)) {
        fs.writeFileSync(tmp_filepath, blkjson, 'UTF-8');
      }

      return true;

    } catch (err) {
      console.log("ERROR: " + err);
    }

  }

  return true;

}




/**
 *
 * delete the non-slip data associated with blocks
 * such as the local files as well as any information
 * in our database
 *
 * @params {integer} lowest_block_id to keep
 **/
Storage.prototype.deleteBlock = async function deleteBlock(block_id, block_hash, lc) {

  if (this.app.BROWSER == 1) { return; }

  var blk = await this.loadSingleBlockFromDiskById(block_id);
  if (blk == null) {
  } else {

    //
    // delete txs (not every block has them)
    //
    if (blk.transactions != undefined) {
      for (let b = 0; b < blk.transactions.length; b++) {
        for (let bb = 0; bb < blk.transactions[b].transaction.to.length; bb++) {

          blk.transactions[b].transaction.to[bb].bid   = block_id;
          blk.transactions[b].transaction.to[bb].bhash = block_hash;
          blk.transactions[b].transaction.to[bb].tid   = blk.transactions[b].transaction.id;

          shashmap.delete_slip(blk.transactions[b].transaction.to[bb].returnIndex());

        }
      }
    }

    //
    // deleting file
    //
    let block_filename = `${this.directory}/${this.dest}/${blk.filename}`;

    fs.unlink(block_filename, function(err) {
      if (err) {
        this.app.logger.logError("Error thrown in deleteBlock", {message:"", stack: err});
      }
    });

  }



  ///////////////////////
  // remove stragglers //
  ///////////////////////
  let sql2 = "SELECT block_id, id FROM blocks WHERE block_id < $block_id AND longest_chain = $lc";
  let params2 = { $block_id : block_id+2 , $lc : 0 };
  this.queryDatabaseArray(sql2, params2, function(err, rows) {
    if (rows != null) {
      for (let z = 0; z < rows.length; z++) {

        let bid = rows[z].block_id;
        let dbid = rows[z].id;

        let block_filename = `${this.directory}/${this.dest}/${bid}-${dbid}.blk`;

        fs.unlink(block_filename, function(err) {
          if (err) {
            this.app.logger.logError("Error thrown in deleteBlock", {message:"", stack: err});
          }
        });

      }
    }
  });



  /////////////////////////////
  // remove shashmap backups //
  /////////////////////////////
  let sql3 = "SELECT block_id, hash FROM blocks WHERE shashmap = 1 AND longest_chain = 1 ORDER BY block_id DESC";
console.log("DELETING THE SHASHMAP: ");
  this.queryDatabaseArray(sql3, {}, function(err, rows) {
    if (rows != null) {

      let database_updated = 0;

      for (let z = 1; z < rows.length; z++) {

        let bid = rows[z].block_id;
        let bhash = rows[z].hash;

        if (database_updated == 0) {
          let sql4 = "UPDATE blocks SET shashmap = 0 WHERE block_id <= $bid";
          let params4 = { $bid : bid };
          database_updated = 1;
          try {
            this.queryDatabaseArray(sql4, params4, function(err, rows) {});
          } catch (err) {
          }
        }

        let shashmap_dump_filename = `${this.directory}/shashmaps/${bid}-${bhash}.smap`;

console.log("DELETING FILE: " + shashmap_dump_filename);

        fs.unlink(shashmap_dump_filename, function(err) {
          if (err) {
            this.app.logger.logError("Error thrown in deleteBlock : shashmap_dump_deletion", {message:"", stack: err});
          }
        });

      }
    }
  });





  //////////////
  // database //
  //////////////
  let sql = "DELETE FROM blocks WHERE block_id < $block_id";
  let params = { $block_id : block_id };
  this.db.run(sql, params, function(err) {});

  if (Math.random() < 0.005) {
    //this.app.logger.logInfo(" ... defragmenting block database ... ");
    this.db.run("VACUUM", {}, function(err) {
      if (err) { this.app.logger.logError("Error thrown in deleteBlocks", {message: "", stack: err}); }
    });
  }

}


/**
 *
 * delete older shashmap dumps
 *
 * @params {integer} lowest_block_id to keep
 **/
Storage.prototype.deleteShashmapDumps = async function deleteShashmapDumps(block_id, block_hash) {

  let storage_self = this;

  if (this.app.BROWSER == 1) { return; }

  /////////////////////////////
  // remove shashmap backups //
  /////////////////////////////
  let sql3 = "SELECT block_id, hash FROM blocks WHERE shashmap = 1 ORDER BY block_id DESC";
  this.queryDatabaseArray(sql3, {}, function(err, rows) {
    if (rows != null) {

      let database_updated = 0;

      for (let z = 0; z < rows.length; z++) {

        let bid = rows[z].block_id;
        let bhash = rows[z].hash;

        if (bid != block_id && block_hash != bhash) {

          let shashmap_dump_filename = `${storage_self.directory}/shashmaps/${bid}_${bhash}.smap`;

console.log("DELETING FILE: " + shashmap_dump_filename);

          fs.unlink(shashmap_dump_filename, function(err) {
            if (err) {
              storage_self.app.logger.logError("Error thrown in deleteBlock : shashmap_dump_deletion", {message:"", stack: err});
            }
          });

        }
      }
    }
  });


  let sql4 = "UPDATE blocks SET shashmap = 0 WHERE block_id < $bid";
  let params4 = { $bid : block_id };
  try {
    this.queryDatabaseArray(sql4, params4, function(err, rows) {});
  } catch (err) {
  }

}



/**
 * This function is called by the Blockchain class when it
 * initializes. It looks to see if we have any blocks saved
 * to disk and -- if so -- force-adds them to the blockchain.
 *
 * This is done in chunks in order to avoid exhausting all of
 * our memory. Logically, we should have no more than two
 * blocks getting processed at a time -- one working its way
 * through the addBlockToBlockchain process in the blockchain
 * class and another sitting queued up in the mempool.
 *
 * @param {integer} mylimit how many blocks to index
 */
Storage.prototype.loadBlocksFromDisk = async function loadBlocksFromDisk(mylimit=0) {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  this.loading_active = true;

  //
  // sort files by creation date, and then name
  // if two files have the same creation date
  //
  let dir   = `${this.directory}/${this.dest}/`;

  //
  // if this takes a long time, our server can
  // just refuse to sync the initial connection
  // as when it starts to connect, currently_reindexing
  // will be set at 1
  //
  let files = fs.readdirSync(dir);

  //
  // "empty" file only
  //
  if (files.length == 1) {
    this.loading_active = false;
    return;
  }

  this.block_size_current         = 0.0;
  files.sort(function(a, b) {
    var compres = fs.statSync(dir + a).mtime.getTime() - fs.statSync(dir + b).mtime.getTime();
    // if exact same creation time... string compare on names to fetch lower ID
    if (compres == 0) {
      return parseInt(a) - parseInt(b);
    }
    return compres;
  });

  for (let i = 0; i < files.length; i++) {

    try {

      let fileID = files[i];

      if (fileID !== "empty") {

        let blk = this.openBlockByFilename(fileID);

        if (blk == null || blk.is_valid == 0) {
          console.log("We have saved an invalid block: " + fileID);
          return null;
        }

        //
        // setting these fields allows our blockchain
        // class to take shortcuts and ensures that when
        // we add a block to the database it will be with
        // the right info.
        //
        blk.save_bid = fileID.substr(0, fileID.indexOf("-"));
        blk.save_db_id = fileID.substr(fileID.indexOf("-") + 1, fileID.indexOf(".")-fileID.indexOf("-")-1);
        blk.prevalidated = 1;       // force-add to index
                                    // cannot be set through json
                                    // prevents spamming network

        // LOGGING INFO
        //this.app.logger.logInfo(`REPOPULATING: adding block to mempool w/ id: ${blk.block.id} -- ${blk.returnHash()}`)
        //console.error(`REPOPULATING: adding block to mempool w/ id: ${blk.block.id} -- ${blk.returnHash()}`)
        //console.log("BEFORE ADDING BLOCK TO BLOCKCHAIN:  " + new Date().getTime());
        await this.app.blockchain.addBlockToBlockchain(blk, true);
        //console.log("AFTER ADDING BLOCK TO BLOCKCHAIN:   " + new Date().getTime());
      }

    } catch (err) {
      console.log(err);
    }
  }

  this.loading_active = false;
  return;
}


Storage.prototype.loadSingleBlockFromDiskWithCallback = async function loadSingleBlockFromDiskWithCallback(hash, mycallback) {
  let blk = await this.loadSingleBlockFromDisk(hash);
  mycallback(blk);
}
Storage.prototype.loadSingleBlockFromDisk = async function loadSingleBlockFromDisk(hash) {
  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  var sql = `SELECT id, block_id FROM blocks WHERE hash=$hash`;
  var params = {
    $hash: hash
  }
  try {
    var row = await this.db.get(sql, params)

    if (row == undefined){ return null; }

    let fileID = `${row.block_id}-${row.id}.blk`;
    let blk = this.openBlockByFilename(fileID);

    if (blk == null) {
      return null;
      //console.log("Error loading block from disk: missing block: " +fileID);
      //this.app.logger.logError(`Error loading block from disk: missing block: ${fileID}`,
      //  { message: "", stack: "" });
      //process.exit();
    }

    //
    // setting these fields allows our blockchain
    // class to take shortcuts and ensures that when
    // we add a block to the database it will be with
    // the right info.
    //
    blk.save_bid = fileID.substr(0, fileID.indexOf("-"));
    blk.save_db_id = fileID.substr(fileID.indexOf("-") + 1, fileID.indexOf(".")-fileID.indexOf("-")-1);
    blk.prevalidated = 1;       // force-add to index
                                // cannot be set through json
                                // prevents spamming network
    return blk;

  } catch (err) {
    console.log(err);
    return null;
  }

}

/**
 * Load block from disk by Id
 * @param {integer} block_id block id
 */
Storage.prototype.loadSingleBlockFromDiskByIdWithCallback = async function loadSingleBlockFromDiskByIdWithCallback(block_id, mycallback) {
  let blk = await this.loadSingleBlockFromDiskById(block_id);
  mycallback(blk);
}
Storage.prototype.loadSingleBlockFromDiskById = async function loadSingleBlockFromDiskById(block_id) {
  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

  var sql = `SELECT id FROM blocks WHERE block_id=$block_id AND longest_chain = 1`;
  var params = {
    $block_id: block_id
  }

  try {

    let row = await this.db.get(sql, params);

    if (row == undefined) { return null; }


    let fileID = `${block_id}-${row.id}.blk`;

    let blk = this.openBlockByFilename(fileID);

    if (blk == null) {
      return null;
      //console.log("Error loading block from disk: missing block: " +fileID);
      //this.app.logger.logError(`Error loading block from disk: missing block: ${fileID}`,
      //  { message: "", stack: "" });
      //process.exit();
    }

    //
    // setting these fields allows our blockchain
    // class to take shortcuts and ensures that when
    // we add a block to the database it will be with
    // the right info.
    //
    blk.save_bid = fileID.substr(0, fileID.indexOf("-"));
    blk.save_db_id = fileID.substr(fileID.indexOf("-") + 1, fileID.indexOf(".")-fileID.indexOf("-")-1);
    blk.prevalidated = 1;       // force-add to index
                                // cannot be set through json
                                // prevents spamming network

    return blk;
  } catch(err) {
    console.log("ERROR HERE!");
    console.log(err);
    return null;
  }
}


/**
 * if a block exists with name, open it from disk and
 * returns the block data
 *
 * @param {string} block filename
*/
Storage.prototype.openBlockByFilename = function openBlockByFilename(filename) {


  let block_filename = `${this.directory}/${this.dest}/${filename}`;

  try {
  //
  // readFileSync leads to issues loading from
  // disk. for some reason the only file is not
  // opened and we never hit the function inside
  //
  if (fs.existsSync(block_filename)) {
    let data = fs.readFileSync(block_filename, 'utf8');
    var blk = new saito.block(this.app, data);
    blk.filename = filename;

    if (!blk.is_valid) {
      console.log("BLK IS NOT VALID!");
      return null;
    }

    return blk;

  } else {
    //this.app.logger.logInfo(`cannot open: ${block_filename} as it does not exist on disk`);
    console.error(`cannot open: ${block_filename} as it does not exist on disk`)
    return null;
  }
  } catch (err) {
    console.log("Error reading block from disk");
    this.app.logger.logError("Error reading block from disk", {message: "", stack: err})
  }

  return null;
}


/**
 * This is called when we want to validate that a transaction's
 * inputs have not been spent. It goes through all of the inputs
 * and checks them.
 *
 * @param {array} slip_array an array of slips to validate
 * @returns {boolean} are the slips in the transaction valid?
 */
Storage.prototype.validateTransactionInputs = function validateTransactionInputs(slip_array, bid) {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return false; }

  for (let i = 0; i < slip_array.length; i++) {
    if (this.validateTransactionInput(slip_array[i], bid) == false) {
      console.log(slip_array[i].returnIndex());
      return false;
    }
  }

  return true;
}



/**
 * This is called when we want to validate that a single slip is
 * valid. It takes the slip as the argument.
 *
 * @param {array} slip to validate
 * @returns {boolean} is the slip valid
 */
Storage.prototype.validateTransactionInput = function validateTransactionInput(slip, bid) {

  if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return true; }

  if (slip.amt > 0) {
    if (shashmap.validate_slip(slip.returnIndex(), bid) == 0) {
      if (slip.bid < this.app.blockchain.lowest_acceptable_bid) {

        //
        // we cannot be sure that we should be rejecting this block
        // unless we have a full genesis period, as only with a full
        // genesis period of blocks can we be sure that the inputs
        // are coming from a valid chain.
        //
        // the solution to the problem posed by this is to confirm
        // that the fork_id for the chain is correct once it has
        // been downloaded. this is the same vulnerability as getting
        // a chain-poisoned tip in bitcoin
        //

        //
        // but ensure slip also valid in genesis period
        //
        if (slip.bid < (bid - this.app.blockchain.genesis_period)) {
          return false;
        }

      } else {
        return false;
      }
    }
  }

  return true;
}



/**
 * Return Value of Shashmap Entry for Slip
 */
Storage.prototype.returnShashmapValue = function returnShashmapValue(slip) {
  return shashmap.slip_value(slip.returnIndex());
}




/**
 * Load the options file
 */
Storage.prototype.loadOptions = async function loadOptions() {

  //
  // servers
  //
  if (this.app.BROWSER == 0) {


    if (fs.existsSync(__dirname + '/../../config/options')) {

      //
      // open options file
      //
      try {
        let optionsfile = fs.readFileSync(__dirname + '/../../config/options', 'utf8');
        this.app.options = JSON.parse(optionsfile);
      } catch (err) {
        this.app.logger.logError("Error Reading Options File", {message:"", stack: err});
        process.exit();
      }

    } else {

      //
      // default options file
      //
      this.app.options = JSON.parse('{"server":{"host":"localhost","port":12101,"protocol":"http"}}');

    }
  //////////////
  // browsers //
  //////////////
  } else {

    let data = null;

    ///////////////////////////////
    // fetch from Chrome Storage //
    ///////////////////////////////
    //
    // we should have already fetched
    // our data from the Chrome backend
    // storage. (start.js)
    //
    //if (this.app.CHROME == 1) {
    //  if (this.app.options == null) { this.app.options = {}; }
    //  return;
    //}

    ////////////////////////////
    // read from localStorage //
    ////////////////////////////
    if (typeof(Storage) !== "undefined") {
      data = localStorage.getItem("options");
      this.app.options = JSON.parse(data);
    }

    //////////////////////////
    // or fetch from server //
    //////////////////////////
    if (data == null) {

      //
      // jquery
      //
      $.ajax({
        url: '/options',
        dataType: 'json',
        async: false,
        success: (data) => {
          this.app.options = data;
          console.log("LOADING: " + JSON.stringify(this.app.options));
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log("ERROR loading options file from server");
        }
      });
    }
  }

}

/**
 * Reorganizes the block table in the database
 * @param {int} block_id
 * @param {string} block_hash
 * @param {int} lc
 */
Storage.prototype.onChainReorganization = async function onChainReorganization(block_id, block_hash, lc) {

  if (this.app.BROWSER == 0) {

    // update database with longest chain information
    let sql = "UPDATE blocks SET longest_chain = $lc WHERE hash = $block_hash";
    let params = { $lc : lc , $block_hash : block_hash };
    try {
      let response = await this.db.run(sql, params);
      //console.log("REORG RESPONSE", response);
    } catch(err) {
      console.log("Error thrown in Storage onChainReorganization", err);
    }

  }

  //
  // update blockchain longest-chain hash
  //
  this.app.blockchain.block_hash_lc_hmap[block_hash] = lc;


  //
  // remove any shashmap dumps that are outdated
  //
  // this happens if we have taken a dump
  if (block_id == this.shashmap_dump_bid && lc == 0) {
    this.deleteShashmapDumps(block_id+1,"");
  }

}

/**
 * Save the options file
 */
Storage.prototype.saveOptions = function saveOptions() {

  // if (this.app.options == null) { this.app.options = {}; }
  this.app.options = Object.assign({}, this.app.options);

  if (this.app.CHROME == 1) {
    chrome.storage.local.set({'options': JSON.stringify(this.app.options)});
    return;
  }

  //
  // servers
  //
  if (this.app.BROWSER == 0) {
    try {
      fs.writeFileSync(`${__dirname}/../../config/options`, JSON.stringify(this.app.options), null, 4);
    } catch (err) {
      this.app.logger.logError("Error thrown in storage.saveOptions", {message: "", stack: err});
      console.log(err);
      return;
    }

  //
  // browsers
  //
  } else {
    if (typeof(Storage) !== "undefined") {
      localStorage.setItem("options", JSON.stringify(this.app.options));
    }
  }
}



/**
 * Reset the options file
 */
Storage.prototype.resetOptions = function resetOptions() {

  //
  // prevents caching
  //
  let tmpdate = new Date().getTime();
  let loadurl = `/options?x=${tmpdate}`;

  return new Promise((resolve, reject) => {
    $.ajax({
      url: loadurl,
      dataType: 'json',
      async: false,
      success: (data) => {
        this.app.options = data;
        this.saveOptions();
        resolve();
      },
      error: (XMLHttpRequest, textStatus, errorThrown) => {
        this.app.logger.logError("Reading client.options from server failed", {message: "", stack: errorThrown});
        reject();
      }
    });
  })

}




///////////////////////
// saveClientOptions //
///////////////////////
//
// when browsers connect to our server, we check to see
// if the client.options file exists in our web directory
// and generate one here if it does not.
//
// this is fed out to client browsers and serves as their
// default options, specifying us as the node to which they
// should connect and through which they can route their
// transactions. :D
//
Storage.prototype.saveClientOptions = function saveClientOptions() {

  if (this.app.BROWSER == 1) { return; }
  let client_peer = Object.assign({}, this.app.server.server.endpoint, {synctype: "lite"});
  //
  // mostly empty, except that we tell them what our latest
  // block_id is and send them information on where our
  // server is located so that they can sync to it.
  //
  var t                      = {};
      t.keys                 = [];
      t.peers                = [];
      t.proxymod             = [];
      t.dns                  = [];
      t.blockchain           = {};
      t.registry             = this.app.options.registry;
      t.dns                  = this.app.dns.dns.domains;
      t.peers.push(client_peer);
      t.proxymod.push(client_peer);

  //
  // write file
  //
  try {
    fs.writeFileSync(`${__dirname}/web/client.options`, JSON.stringify(t));
  } catch(err) {
    console.log(err);
    this.app.logger.logError("Error thrown in storage.saveBlock", {message: "", stack: err});
  }

  // fs.writeFileSync("saito/web/client.options", JSON.stringify(t), (err) => {
  //   if (err) {
  //   console.log(err);
  //   this.app.logger.logError("Error thrown in storage.saveBlock", {message: "", stack: err});
  //   }
  // });

}


/**
 * TODO: uses a callback and should be moved to await / async promise
 **/
Storage.prototype.returnBlockFilenameByHash = async function returnBlockFilenameByHash(block_hash, mycallback) {

  let sql    = "SELECT id, block_id FROM blocks WHERE hash = $block_hash";
  let params = { $block_hash : block_hash };

  try {
    let row = await this.db.get(sql, params)
    if (row == undefined) {
      mycallback(null, "Block not found on this server");
      return
    }
    let filename = `${row.block_id}-${row.id}.blk`;
    mycallback(filename, null);
  } catch (err) {
    console.log("ERROR getting block filename in storage: " + err);
    mycallback(null, err);
  }

}


Storage.prototype.returnBlockFilenameByHashPromise = function returnBlockFilenameByHashPromise(block_hash) {
  return new Promise((resolve, reject) => {
    this.returnBlockFilenameByHash(block_hash, (filename, err) => {
      if (err) { reject(err) }
      resolve(filename);
    })
  })
}




/**
 * Query database
 **/
Storage.prototype.queryDatabase = async function queryDatabase(sql, params, callback) {
  if (this.app.BROWSER == 1) { return; }
  var row = await this.db.get(sql, params)
  var err = {};
  if (row == undefined) { return null; }
  callback(null, row);
}
Storage.prototype.queryDatabaseArray = async function queryDatabaseArray(sql, params, callback) {
  if (this.app.BROWSER == 1) { return; }
  var rows = await this.db.all(sql, params)
  var err = {};
  if (rows == undefined) { return null; }
  callback(null, rows);
}



Storage.prototype.updateShashmap = function updateShashmap(slip_map_index, bid) {
  shashmap.insert_slip(slip_map_index, bid);
  return;
}



/*
 * update database to indicate we have given this block
 * its confirmation. used when force-adding blocks to
 * the database.
 *
 * @params {string} block_hash
 * @params {integer} confirmation num
 */
Storage.prototype.saveConfirmation = function saveConfirmation(hash, conf) {

  if (this.app.BROWSER == 1) { return; }

  let sql = "UPDATE blocks SET conf = $conf WHERE hash = $hash";
  let params = {
    $conf: conf,
    $hash: hash
  };
  this.execDatabase(sql, params);

}



/*
 * fetch the latest shashmap backup that is on the longest chain
 *
 * @params {string} block_hash
 * @params {integer} confirmation num
 */
Storage.prototype.returnShashmapDump = async function returnShashmapDump() {

  let storage_self = this;

  try {
    let sql2 = "SELECT block_id, hash FROM blocks WHERE shashmap = 1 AND longest_chain = 1 ORDER BY block_id DESC LIMIT 1";
    let params2 = {};
    let rows = await this.db.all(sql2, params2)

    if (rows == null) { return null; }
    if (rows.length == 0) { return null; }

    storage_self.shashmap_dump_bid = rows[0].block_id;
    storage_self.shashmap_dump_bhash = rows[0].hash;
    return;
  } catch (err) {
    console.error("SHASHMAP DUMP ERROR: ", err);
    return null;
  }
}


/*
 * fetch the latest shashmap backup that is on the longest chain
 *
 * @params {string} block_hash
 * @params {integer} confirmation num
 */
Storage.prototype.dumpShashmap = async function dumpShashmap(bid, bhash) {

  if (this.use_shashmap_dump == 0) { return null; }
  if (bid % this.shashmap_dump_mod != 1) { return null; }

  let shashmap_file = this.directory + '/shashmaps/' + bid + "_" + bhash + '.smap';
  await shashmap.save(shashmap_file);


  try {
    let sql = "UPDATE blocks SET shashmap = $shashval WHERE block_id = $bid AND hash = $hash";
    let params = { $shashval : 1 , $bid : bid , $hash : bhash };
    await this.execDatabase(sql, params);
  } catch (err) {
    return null;
  }

console.log("and deleting shashmap dumps...");

  this.deleteShashmapDumps(bid,bhash);

  return 1;

}



