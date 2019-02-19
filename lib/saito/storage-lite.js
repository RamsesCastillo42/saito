const path     = require('path');

/**
 * Storage Constructor
 * @param {*} app
 */
function Storage(app, data, dest="blocks") {

    if (!(this instanceof Storage)) {
      return new Storage(app);
    }

    var dir = data || path.join(__dirname, '../data');

    this.app                = app || {};
    this.directory          = dir;
    this.dest               = dest;
    this.db                 = null;
    this.loading_active     = false;

    return this;
}
module.exports = Storage;

Storage.prototype.initialize = async function initialize() {
  console.log("LOADING AND SAVING OPTIONS")
  await this.loadOptions();
  await this.saveOptions();
}

Storage.prototype.loadOptions = async function loadOptions() {
  console.log("I HOPE THIS ISN'T RUNNING", this)
}

Storage.prototype.saveOptions = async function saveOptions() {
  console.log("I HOPE THIS ISN'T RUNNING 2", this)
}

Storage.prototype.onChainReorganization = async function onChainReorganization() {}

Storage.prototype.loadBlocksFromDisk = async function loadBlocksFromDisk() {}

Storage.prototype.saveConfirmation = function saveConfirmation() {
  if (this.app.BROWSER == 1) { return; }
}

Storage.prototype.saveBlock = async function saveBlock(blk=null, lc=0) {

  console.log(" .... updte slips: " + new Date().getTime());

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
}