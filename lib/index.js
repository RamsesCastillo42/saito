const saito_lib   = require('./saito/saito-lite');
const ModTemplate = require('./templates/template');

class Saito {

  constructor(config){
    this.BROWSER           = 1;
    this.SPVMODE           = 0;
    this.options           = config;

    this.newSaito()
    this.modules    = new saito_lib.modules(this);
  }

  newSaito() {
    this.crypto     = new saito_lib.crypto();
    this.storage    = new saito_lib.storage(this);
    this.mempool    = new saito_lib.mempool(this);
    this.voter      = new saito_lib.voter(this);
    this.wallet     = new saito_lib.wallet(this);
    this.miner      = new saito_lib.miner(this);
    this.monitor    = new saito_lib.monitor(this);
    this.dns        = new saito_lib.dns(this);
    this.keys       = new saito_lib.keychain(this);
    this.network    = new saito_lib.network(this);
    this.burnfee    = new saito_lib.burnfee(this);
    this.blockchain = new saito_lib.blockchain(this);

    if (this.options.db) {
      console.log("OUR OPTIONS", this.options)
      this.storage.getData = this.options.db.getData.bind(this.storage)
      this.storage.storeData = this.options.db.storeData.bind(this.storage)
      this.storage.loadOptions = this.options.db.loadOptions.bind(this.storage)
      this.storage.saveOptions = this.options.db.saveOptions.bind(this.storage)
      this.storage.resetOptions = this.options.db.resetOptions.bind(this.storage)
      console.log("STORAGE", this.storage)
    }
  }

  async init() {
    try {
      await this.storage.initialize();
      this.voter.initialize();
      this.wallet.initialize();
      this.mempool.initialize();
      await this.blockchain.initialize();
      this.keys.initialize();
      this.network.initialize();
      this.modules.pre_initialize();
      this.dns.initialize();
      this.modules.initialize();
    } catch(err) {
      console.log(err);
    }
  }

  async reset(config) {
    this.options = config
    this.newSaito()
    await this.init()
  }

  shutdown() {
    this.network.close();
  }
}

module.exports = { Saito, saito_lib, ModTemplate, GameTemplate };




