const saito = require('./lib/saito/saito');
const mods = require('./mods/mods.config');

var app                   = {};
    app.BROWSER           = 1;
    app.SPVMODE           = 0;
    app.CHROME            = 0;
    app.GENESIS_PUBLICKEY = "npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv";

initSaito();


async function initSaito() {

  ////////////////////
  // Load Variables //
  ////////////////////
  try {
    app.crypto     = new saito.crypto();
    app.connection = new saito.connection();
    app.cluster    = new saito.cluster(app);
    app.logger     = new saito.logger(app);
    app.storage    = new saito.storage(app);
    app.mempool    = new saito.mempool(app);
    app.voter      = new saito.voter(app);
    app.wallet     = new saito.wallet(app);
    app.miner      = new saito.miner(app);
    app.monitor    = new saito.monitor(app);
    app.browser    = new saito.browser(app);
    app.archives   = new saito.archives(app);
    app.dns        = new saito.dns(app);
    app.keys       = new saito.keychain(app);
    app.network    = new saito.network(app);
    app.burnfee    = new saito.burnfee(app);
    app.blockchain = new saito.blockchain(app);
    app.server     = new saito.server(app);
    app.modules    = require('./lib/saito/modules')(app, mods);

    //this.mods.push(require('./mods/permanentledger/permanentledger')(this.app));
    //this.mods.push(require('./mods/spammer/spammer')(this.app));
    //this.mods.push(require('./mods/init/init')(this.app));
  //   this.mods.push(require('../../mods/welcome/welcome')(this.app));
  //   // this.mods.push(require('./mods/twilight/twilight')(this.app));
  //   this.mods.push(require('../../mods/chess/chess')(this.app));
  //   this.mods.push(require('../../mods/arcade/arcade')(this.app));




  //   this.mods.push(require('../../mods/settings/settings')(this.app));
  //   //this.mods.push(require('./mods/raw/raw')(this.app));
  //   this.mods.push(require('../../mods/advert/advert')(this.app));
  // // uses msig
  //   this.mods.push(require('../../mods/appstore/appstore')(this.app));
  // //  this.mods.push(require('./mods/auth/auth')(this.app));
  // //  this.mods.push(require('./mods/bank/bank')(this.app));
  // // uses msig
  //   const Chat = require('../../mods/chat/chat');
  //   this.mods.push(new Chat(this.app));
  //   this.mods.push(require('../../mods/email/email')(this.app));
  //   this.mods.push(require('../../mods/encrypt/encrypt')(this.app));

  //   //this.mods.push(require('./mods/ethchannels/ethchannels')(this.app));

  //   this.mods.push(require('../../mods/explorer/explorer')(this.app));
  // // uses msig
  //   this.mods.push(require('../../mods/facebook/facebook')(this.app));
  //   this.mods.push(require('../../mods/faucet/faucet')(this.app));
  //   this.mods.push(require('../../mods/registry/registry')(this.app));

  //   this.mods.push(require('../../mods/reddit/reddit')(this.app));
  //   this.mods.push(require('../../mods/remix/remix')(this.app));
  //   this.mods.push(require('../../mods/money/money')(this.app));
  //   this.mods.push(require('../../mods/debug/debug')(this.app));

    ////////////////
    // Initialize //
    ////////////////
    app.logger.initialize();
    app.cluster.initialize();
    await app.storage.initialize();
    app.voter.initialize();
    app.wallet.initialize();
    app.mempool.initialize();
    await app.blockchain.initialize();
    app.keys.initialize();
    app.network.initialize();

    //
    // archives before modules
    //
    app.archives.initialize();
    //
    // dns before browser so modules can
    // initialize with dns support
    //
    app.dns.initialize();
    //
    // modules pre-initialized before
    // browser, so that the browser
    // can check which application we
    // are viewing.
    //
    app.modules.pre_initialize();
    app.browser.initialize();
    app.modules.initialize();
    //
    // server initialized after modules
    // so that the modules can use the
    // server to feed their own subpages
    // as necessary
    //
    app.server.initialize();


    if (app.BROWSER == 0) {
      console.log(`


          ,▄▄▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▄▄µ                                                                                                 
     ▄▄▓▓▓▓▓█▀▀▀▀└^'         '└└▀▀▀▀█▓▓▓▓▓▓▄▄                                                                                           
   ▓▓▓█▀▀÷     ,▄▄▄▓▓▓▓▓▓▓▓▓▓▓▄▄▄▄     ' ▀▀█▓▓▓                                                                                         
   ▓▓▓    ▄▄▓▓▓█▀▀▀▀└'¬'''¬'└"▀▀▀▀█▓▓▓▄▄    ▓▓▓                                                                                         
   ▐▓▓∩  ▐▓▓     ,▄▄▓▓▓▓▓▓▓▓▓▄▄▄,   '^▓▓▌  j▓▓▌                                                                                         
    ▓▓▌  j▓▓  ]▓█▀▀¬         ¬└▀▀█▓∩  ▓▓▌  ▓▓▓                                                                                          
    ▀▓▓⌐  ▓▓▄  ▓▌                ▐▓⌐ ]▓▓  ]▓▓▌        Welcome to Saito
     ▓▓▓  ▐▓▓  ▓▓                ▓▌  ▓▓⌐  ▓▓▓                                                                                           
     └▓▓▌  ▀▓▌  ▓▓              ▓▓  ▓▓▌  ▓▓▓─         address: ${app.wallet.returnPublicKey()}
      ╙▓▓▌  ▀▓▓  ▓▓            ▓▓  ▓▓▌  ▄▓▓▀          balance: ${app.wallet.returnBalance()}
       ╙▓▓▌  ▀▓▓  ▀▓▄        ╓▓█  ▓▓▀  ▓▓▓▀                                                                                             
        ^▓▓▓  ╙▓▓▄ ^▀▓▄    ╓▓▓▀ ╓▓▓▀  ▓▓▓▀            Above is the address and balance of this computer on the Saito network. Once Saito
          █▓▓▄  ▀▓▓▄ └▀▓▄▄▓█▀ ,▓▓█' ,▓▓▓"             is running it will generate tokens automatically over time. You can increase your
           ▀▓▓▓   ▀▓▓▄  "▀  ,▓▓█▀  ▄▓▓▀               clients. The more transactions you process the greater the chance that you will be
             ▀▓▓▓   ▀▓▓▄  ▄▓▓▀|  ▄▓▓▓|                rewarded for the work.
              └▀▓▓▓   ╙▀▓▓█▀   ▄▓▓▓▀                                                                                                     
                └▀▓▓▓▄      ,▄▓▓▓▀                    Questions or comments? Please contact us anytime at: david@saito
                   ▀▓▓▓▄  ▄▓▓▓▀                                                                                                          
                     ^▀▓▓▓▓█▀                                                                                                            
                        └'                                                                                                               
      `);
    } else {

      console.log(`
          ,▄▄▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▄▄µ
     ▄▄▓▓▓▓▓█▀▀▀▀└^'         '└└▀▀▀▀█▓▓▓▓▓▓▄▄
   ▓▓▓█▀▀÷     ,▄▄▄▓▓▓▓▓▓▓▓▓▓▓▄▄▄▄     ' ▀▀█▓▓▓
   ▓▓▓    ▄▄▓▓▓█▀▀▀▀└'¬'''¬'└"▀▀▀▀█▓▓▓▄▄    ▓▓▓
   ▐▓▓∩  ▐▓▓     ,▄▄▓▓▓▓▓▓▓▓▓▄▄▄,   '^▓▓▌  j▓▓▌
    ▓▓▌  j▓▓  ]▓█▀▀¬         ¬└▀▀█▓∩  ▓▓▌  ▓▓▓
    ▀▓▓⌐  ▓▓▄  ▓▌                ▐▓⌐ ]▓▓  ]▓▓▌
     ▓▓▓  ▐▓▓  ▓▓                ▓▌  ▓▓⌐  ▓▓▓
     └▓▓▌  ▀▓▌  ▓▓              ▓▓  ▓▓▌  ▓▓▓─
      ╙▓▓▌  ▀▓▓  ▓▓            ▓▓  ▓▓▌  ▄▓▓▀
       ╙▓▓▌  ▀▓▓  ▀▓▄        ╓▓█  ▓▓▀  ▓▓▓▀
        ^▓▓▓  ╙▓▓▄ ^▀▓▄    ╓▓▓▀ ╓▓▓▀  ▓▓▓▀
          █▓▓▄  ▀▓▓▄ └▀▓▄▄▓█▀ ,▓▓█' ,▓▓▓"
           ▀▓▓▓   ▀▓▓▄  "▀  ,▓▓█▀  ▄▓▓▀
             ▀▓▓▓   ▀▓▓▄  ▄▓▓▀|  ▄▓▓▓|
              └▀▓▓▓   ╙▀▓▓█▀   ▄▓▓▓▀
                └▀▓▓▓▄      ,▄▓▓▓▀
                   ▀▓▓▓▄  ▄▓▓▓▀
                     ^▀▓▓▓▓█▀
                        └'

    Welcome to Saito

    address: ${app.wallet.returnPublicKey()}
    balance: ${app.wallet.returnBalance()}

    Above is the address and balance of this computer on the Saito network. Once Saito
    is running it will generate tokens automatically over time. You can increase your
    likelihood of this by processing more transactions and creating services that attract
    clients. The more transactions you process the greater the chance that you will be
    rewarded for the work.

    Questions or comments? Please contact us anytime at: david@saito
      `)
    }


  } catch (err) {
    console.log(err);
  }
} // init saito

function shutdownSaito() {
  console.log("Shutting down Saito");
  app.server.close();
  app.network.close();
}

/////////////////////
// Cntl-C to Close //
/////////////////////
process.on('SIGTERM', function () {
  shutdownSaito();
  console.log("Network Shutdown");
  process.exit(0)
});
process.on('SIGINT', function () {
  shutdownSaito();
  console.log("Network Shutdown");
  process.exit(0)
});




