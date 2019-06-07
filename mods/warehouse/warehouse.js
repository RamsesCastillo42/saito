const fs = require('fs');
const util = require('util');
const path = require('path');
const sqlite = require('sqlite');
const saito = require('../../lib/saito/saito');
const ModTemplate = require('../../lib/templates/template');



//////////////////
// CONSTRUCTOR  //
//////////////////

function Warehouse(app) {

    if (!(this instanceof Warehouse)) { return new Warehouse(app); }

    this.app = app;

    // separate database
    this.dest = "blocks";
    this.database = "warehouse.sq3";
    this.dir = path.join(__dirname, "../../data/");

    this.name = "Warehouse";

    return this;

}
module.exports = Warehouse;
util.inherits(Warehouse, ModTemplate);




////////////////////
// Install Module //
////////////////////
Warehouse.prototype.installModule = async function installModule() {



    var warehouse_self = this;

    if (warehouse_self.app.BROWSER == 1 || warehouse_self.app.SPVMODE == 1) { return; }

    warehouse_self.db = await sqlite.open(this.dir + this.database);

    sql = "\
          CREATE TABLE IF NOT EXISTS mod_warehouse_tx (\
          block_time INTEGER, \
          block_id INTEGER, \
          block_hash TEXT, \
          tx_id TEXT PRIMARY KEY, \
          tx_time INTEGER, \
          tx_to TEXT, \
          tx_from TEXT, \
          tx_fee REAL, \
          tx_type TEXT, \
          tx_size INTEGER, \
          tx_module TEXT \
      )";

    try {
        await warehouse_self.db.run(sql, {});

    } catch (err) {
        console.log(err);
    }

    sql = "\
          CREATE TABLE IF NOT EXISTS mod_warehouse_blocks (\
          block_time INTEGER, \
          block_id INTEGER, \
          block_hash TEXT PRIMARY KEY, \
          block_difficulty REAL, \
          block_paysplit REAL, \
          block_treasury REAL, \
          block_coinbase REAL, \
          block_reclaimed REAL, \
          block_vote REAL, \
          block_creator TEXT, \
          block_transactions INTEGER, \
          block_burn_fee REAL \
        )";

    try {
        await warehouse_self.db.run(sql, {});

    } catch (err) {
        console.log(err);
    }
}

////////////////
// Initialize //
////////////////
Warehouse.prototype.initialize = async function initialize() {

    if (this.app.BROWSER == 1) { return; }

    try {

        if (this.db == null) {
            this.db = await sqlite.open(this.dir + this.database);
        }

        this.loadBlocksFromDisk();

    } catch (err) {
        console.log(err);
    }
}




//////////////////
// On New Blocks //
//////////////////
Warehouse.prototype.onNewBlock = function onNewBlock(blk) {

    if (this.app.BROWSER != 1) {
        this.saveTxToDatabase(blk);
        this.saveBlockToDatabase(blk);
    }

}

Warehouse.prototype.saveTxToDatabase = function saveTxToDatabase(blk) {

    var sql = "INSERT OR IGNORE INTO mod_warehouse_tx \
              (block_time, block_id, block_hash, tx_id, tx_time, tx_to, tx_from, tx_fee, tx_type, tx_size, tx_module) \
               VALUES ($block_time, $block_id, $block_hash, $tx_id, $tx_time, $tx_to, $tx_from, $tx_fee, $tx_type, $tx_size, $tx_module)";

    for (let i = 0; i < blk.transactions.length; i++) {
        try {
            var params = {
                $block_time: blk.block.ts,
                $block_id: blk.block.id,
                $block_hash: blk.returnHash(),
                $tx_id: blk.transactions[i].transaction.id,
                $tx_time: blk.transactions[i].transaction.ts,
                $tx_to: blk.transactions[i].transaction.to[0].add,
                $tx_from: blk.transactions[i].transaction.from[0].add,
                $tx_fee: blk.transactions[i].transaction.to[0].amt,
                $tx_type: this.returnTransactionType(blk.transactions[i].transaction.type),
                $tx_size: Buffer.from(JSON.stringify(blk.transactions[i])).length,
                $tx_module: this.returnModuleFromMessage(blk.transactions[i].transaction.msg)
            }
            let row = this.db.run(sql, params);
            if (row != undefined) {
            }
        } catch (err) {
            console.log(err)
        }
    }
}

Warehouse.prototype.saveBlockToDatabase = function saveBlockToDatabase(blk) {

    var sql = "INSERT OR IGNORE INTO mod_warehouse_blocks \
              (block_time, block_id, block_hash, block_difficulty, block_paysplit, block_treasury, block_coinbase, block_reclaimed, block_vote, block_creator, block_transactions, block_burn_fee) \
               VALUES ($block_time, $block_id, $block_hash, $block_difficulty, $block_paysplit, $block_treasury, $block_coinbase, $block_reclaimed, $block_vote, $block_creator, $block_transactions, $block_burn_fee)";

    try {
        var params = {
            $block_time: blk.block.ts,
            $block_id: blk.block.id,
            $block_hash: blk.returnHash(),
            $block_difficulty: blk.block.difficulty,
            $block_paysplit: blk.block.paysplit,
            $block_treasury: blk.block.treasury,
            $block_coinbase: blk.block.coinbase,
            $block_reclaimed: blk.block.reclaimed,
            $block_vote: blk.block.reclaimed,
            $block_creator: blk.block.creator,
            $block_transactions: blk.transactions.length,
            $block_burn_fee: blk.block.bf.current
        }
        let row = this.db.run(sql, params);
        if (row != undefined) {
        }
    } catch (err) {
        console.log(err)
    }
}

Warehouse.prototype.returnTransactionType = function returnTransactionType(id) {

    switch (id) {
        case 0: return ("Message");
        case 1: return ("Golden Ticket");
        case 2: return ("Change");
        case 3: return ("Rebroadcast");
        case 4: return ("Prestige");
        case 5: return ("Golden Chunk");
    }
    return ("");
}

Warehouse.prototype.returnModuleFromMessage = function returnModuleFromMessage(msg) {
    if (typeof (msg.module != "undefined")) {
        return (msg.module);
    } else {
        return ("");
    }
}

Warehouse.prototype.loadBlocksFromDisk = async function loadBlocksFromDisk(mylimit = 0) {

    if (this.app.BROWSER == 1 || this.app.SPVMODE == 1) { return; }

    let dir = `${this.dir}${this.dest}/`;

    let files = fs.readdirSync(dir);

    for (let i = 0; i < files.length; i++) {

        setTimeout(() => {
            try {

                let fileID = files[i];

                console.log("reading " + fileID);

                if (fileID !== "empty") {

                    let blk = this.app.storage.openBlockByFilename(fileID);

                    this.saveTxToDatabase(blk);
                    this.saveBlockToDatabase(blk);
                }

            } catch (err) {
                console.log(err);
            }
        }, 50 * i);
    }
}    
