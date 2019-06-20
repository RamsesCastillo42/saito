
//
// IF THIS FILE CHANGES, BE SURE TO UPDATE THE
// COPY OF THE FILE IN THE APPSTORE MODULE DIR
//
// it uses a copy of this file to generate the
// browser.js file needed by the chrome exts
//
function Mods(app) {

  if (!(this instanceof Mods)) {
    return new Mods(app);
  }

  this.app     = app;
  this.mods    = [];

  this.lowest_sync_bid = -1;

  return this;

}
module.exports = Mods



////////////////////////
// Initialize Modules //
////////////////////////
Mods.prototype.pre_initialize = function pre_initialize() {

  // ADD MODULES HERE

  if (this.app.options.modules == null) {
    this.app.options.modules = [];
    for (let i = 0; i < this.mods.length; i++) {
      mi = 0;
      for (let j = 0; j < this.app.options.modules.length; j++) { if (this.mods[i].name == this.app.options.modules[j]) { mi = 1; }}
      if (mi == 0) {
        if (this.app.BROWSER == 0) {
          this.mods[i].installModule(this.app);
        }
        this.app.options.modules.push(this.mods[i].name);
      };
    }
    this.app.storage.saveOptions();
  }

}



Mods.prototype.affixCallbacks = function affixCallbacks(txindex, message, callbackArray, callbackIndexArray) {
  for (let i = 0; i < this.mods.length; i++) {
    if (message.module != undefined) {
      if (this.mods[i].shouldAffixCallbackToModule(message.module) == 1) {
        callbackArray.push(this.mods[i].onConfirmation);
        callbackIndexArray.push(txindex);
      }
    }
  }
}

Mods.prototype.initialize = function initialize() {
  console.log("GETTING INITIALIZD");
  for (let i = 0; i < this.mods.length; i++) {
    this.mods[i].initialize(this.app);
  }
}

Mods.prototype.displayEmailForm = function displayEmailForm(modname) {
  for (let i = 0; i < this.mods.length; i++) {
    if (modname == this.mods[i].name) {
      if (this.mods[i].handlesEmail == 1) {
        this.mods[i].displayEmailForm(this.app);
        for (let ii = 0; ii < this.mods.length; ii++) {
      if (this.mods[ii].name == "Email") {
            this.mods[ii].active_module = modname;
      }
    }
      }
    }
  }
  return null;
}

Mods.prototype.displayEmailMessage = function displayEmailMessage(modname, message_id) {
  for (let i = 0; i < this.mods.length; i++) {
    if (modname == this.mods[i].name) {
      if (this.mods[i].handlesEmail == 1) {
        return this.mods[i].displayEmailMessage(this.app, message_id);
      }
    }
  }
  return null;
}

Mods.prototype.attachEvents = function attachEvents() {
  for (imp = 0; imp < this.mods.length; imp++) {
    if (this.mods[imp].browser_active == 1) {
      this.mods[imp].attachEvents(this.app);
    }
  }
  return null;
}

Mods.prototype.attachEmailEvents = function attachEmailEvents() {
  for (let imp = 0; imp < this.mods.length; imp++) {
    this.mods[imp].attachEmailEvents(this.app);
  }
  return null;
}

Mods.prototype.initializeHTML = function initializeHTML() {
  for (let icb = 0; icb < this.mods.length; icb++) {
    if (this.mods[icb].browser_active == 1) {
      this.mods[icb].initializeHTML(this.app);
    }
  }
  return null;
}

Mods.prototype.formatEmailTransaction = function formatEmailTransaction(tx, modname) {
  for (let i = 0; i < this.mods.length; i++) {
    if (modname == this.mods[i].name) {
      return this.mods[i].formatEmailTransaction(tx, this.app);
    }
  }
  return null;
}

Mods.prototype.handleDomainRequest = function handleDomainRequest(message, peer, mycallback) {
  for (let iii = 0; iii < this.mods.length; iii++) {
    if (this.mods[iii].handlesDNS == 1) {
      this.mods[iii].handleDomainRequest(this.app, message, peer, mycallback);
    }
  }
  return;
}

Mods.prototype.handleMultipleDomainRequest = function handleMultipleDomainRequest(message, peer, mycallback) {
  for (let iii = 0; iii < this.mods.length; iii++) {
    if (this.mods[iii].handlesDNS == 1) {
      this.mods[iii].handleMultipleDomainRequest(this.app, message, peer, mycallback);
    }
  }
  return;
}

Mods.prototype.handlePeerRequest = function handlePeerRequest(message, peer, mycallback=null) {
  for (let iii = 0; iii < this.mods.length; iii++) {
    try {
      this.mods[iii].handlePeerRequest(this.app, message, peer, mycallback);
    } catch (err) {}
  }
  return;
}

Mods.prototype.loadFromArchives = function loadFromArchives(tx) {
  for (let iii = 0; iii < this.mods.length; iii++) {
    this.mods[iii].loadFromArchives(this.app, tx);
  }
  return;
}

Mods.prototype.returnModule = function returnModule(modname) {
  for (let i = 0; i < this.mods.length; i++) {
    if (modname == this.mods[i].name) {
      return this.mods[i];
    }
  }
  return null;
}

Mods.prototype.updateBalance = function updateBalance() {
  for (let i = 0; i < this.mods.length; i++) {
    this.mods[i].updateBalance(this.app);
  }
  return null;
}

Mods.prototype.updateBlockchainSync = function updateBlockchainSync(current, target) {
  if (this.lowest_sync_bid == -1) { this.lowest_sync_bid = current; }
  target = target-(this.lowest_sync_bid-1);
  current = current-(this.lowest_sync_bid-1);
  if (target < 1) { target = 1; }
  if (current < 1) { current = 1; }
  let percent_downloaded = 100;
  if (target > current) {
    percent_downloaded = Math.floor(100*(current/target));
  }
  for (let i = 0; i < this.mods.length; i++) {
    this.mods[i].updateBlockchainSync(this.app, percent_downloaded);
  }
  return null;
}

Mods.prototype.webServer = function webServer(expressapp) {
  for (let i = 0; i < this.mods.length; i++) {
    this.mods[i].webServer(this.app, expressapp);
  }
  return null;
}

Mods.prototype.onNewBlock = function onNewBlock(blk, i_am_the_longest_chain) {
  for (let iii = 0; iii < this.mods.length; iii++) {
    this.mods[iii].onNewBlock(blk, i_am_the_longest_chain);
  }
  return;
}

Mods.prototype.onChainReorganization = function onChainReorganization(block_id, block_hash, lc) {
  for (let imp = 0; imp < this.mods.length; imp++) {
    this.mods[imp].onChainReorganization(block_id, block_hash, lc);
  }
  return null;
}

