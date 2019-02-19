//
// This module monitors the blockchain and our
// unspent transaction inputs. It creates fake
// transactions to speed up block production 
// for testing purposes.`
//
var saito = require('../../../saito');
var ModTemplate = require('../../template');
var util = require('util');
var crypto = require('crypto');
const Big      = require('big.js');
const fs = require('fs');



//////////////////
// CONSTRUCTOR  //
//////////////////
function Init(app) {

  if (!(this instanceof Init)) { return new Init(app); }

  Init.super_.call(this);

  this.app             = app;
  this.name            = "Init";

  this.max_block       = 4;
  this.payout_block    = 0;

  return this;

}
module.exports = Init;
util.inherits(Init, ModTemplate);



Init.prototype.installModule = function installModule(app) {

  if (this.app.BROWSER == 1) { return; }
  if (this.app.network.isPrivateNetwork() == 0) { return; }
  if (this.app.blockchain.returnLatestBlockId() == 0) {

    //
    // insert pre-signed
    //
    let tx = [];

    //
    // VIP transactions
    //
    tx[0] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"21SLK7Qn79qfdfGbGYN3n3RaFqU9N949yxPpGxoXWX6sD","amt":"247500000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"46WEoQ6vdkioysJMSdhTWqHJzifdetRUSpCtjUdic8ePkSnC2PDrYriFhks3pQsL639bVxrrqXJEmnWcQsoYLUp4","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[1] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"cN7fyrDR4kRNz6AueS26LKjS8N8n8LDHp9WKghAYmm5B","amt":"76500000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"5i3bmFhx8kx5HWfELoLi9GBvhFThGg4sxnSLUJcrLaBAUyQ4z3ZaZodkuhbCJs99yF7uEBywBvD9RqzFtLpZP6XQ","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[2] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"xtrEWbTqgy8AuUe44z6wPSp8xd9nMZ6GUqatpjJYPWe1","amt":"50400000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"2VWecntkK14QT2ZraT3BcQk84rGfuSoY3ANNQkXyKjTD7xM2Xdtd2CPM41nJH8FEnG3hMocxj2GsHtoSgpxhLTaA","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[3] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"26ahwQ4axtxujGP5D4PhEdrMD9ectnERzmqp6jrWaChrJ","amt":"9000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"2ueZ783YQFZ9AyMCQRZwonJSaHey3FTQGW2fdW8PzrJWDiSv4UTw53VfeBPV7h76RzFnaG7jazK9djoPu2dzZFGw","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[4] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"vmCz9ngz6gSkeZx2SSp32VpGbRpE2jsDDYaZ8zk4smqa","amt":"9000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"3FQpmnDWg6XT4cGvtjEFkPGncfymWLJRYjoZ4oBHarECeesKii2omfDcYtgGD9TTBMrPQusZKCXSms7NnDRznUYL","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[5] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"kEcoVPyUj9zLKRUv1GsJmusuBdyZ6SgfWF5TKX44tx6L","amt":"24750000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"3gYwZrrhs2n2yCFMfHTrLxHRW9w9PickoxBrv5K98bLfuDd68NcEE7v8bLgx4JK3qfxXpqE5xERyRLr8wjZkHBQU","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[6] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"fnXYYs1B91RRsg1dUKS1w7otUcytC5XC9wxkNhuJxMnu","amt":"24750000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"5mCJVqjHUKTbXC2e1qSW7oCWbE6238HWpDtzn6C91ZfL1zU7uoT3MZ8ti8B9ZQqpKTG2U68Y66WeqJ4NmFdH1m91","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[7] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"xLRrc6uFb795EoJ9xuN66oKp5zn7gvNA9CL9X3cpjRXB","amt":"9000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"34TQT3fRvr4FW8NY7Nddg5VEVxYLDop5SpvzK8PhdcrYEgcfLgong7dmtDPYQCvDRc6eATW4emafnvJKuhP8voX8","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[8] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"fuHjw4d6pEpDbgzeFBw8KM5JDJGQ8nuN3GhpMeikRdbz","amt":"45000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"CsXBjxjqHTYvDvEbC6gdmASYDjg53x3i21JUfqJVgkm4pPJxB15AkpAZf35NSpJN6H5qDN7AxByDbk5cJ184T8Z","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[9] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"29kNnEriRpRoe3a5Lk9v9vzpxAVAZkAdomuHo8AKTn3TG","amt":"36000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"2CZTxynjGBmizNBaCyETv7xVQmQYnNc7PKdLDryWeNETtnZhKqrwH9JSnzUaXHxdpKKg72FK9XGqF1EGKFqBVpEb","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[10] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"iT3ZsRu4nkdJsy5ELmZJf3ZBRSeytHbq162eRfk1coi1","amt":"350000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"5WxvFgHFJX18afwqwcGxgGJMLWkGsbYREWh63jwA7QwF3QVuXeDEGVUFaF3dfz1mqYUQtv6teXaFUNZEgu9DsNsZ","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[11] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"23K51b1grzEY55JqPR1SS7uo4pJxodMNqrx5KC49dqMcs","amt":"300000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"4oa9ZuBZ1XiV4nj6K3w6N3qMhZTyk8BRyRd9RsRNDtWBq1JUaW3eiQLwd8EdXq2zJnt2kWJ1QsEU5fBXZ4GNbtnq","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[12] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"dRPCYehXaxja4nDYMzLR1avCdRBx2MsZtERAwPNks1vd","amt":"100000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"htPpYpyyqdjHbcx3SnbUAD1cRDJsTwmZCRXF4WeD1tSEDPLbuuwXLJHWNK4QsXJvXYUa8jjZ2jttZDc13rYE3Up","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')
    tx[13] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"22o5syDcshi3Wh4rGqBoXkXcQKeArp2BEXL8yefX5UMCH","amt":"750000000","type":4,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"814bQBL5AaMeCKvfZjnJN1Z88dB1yKjPSjAiFYvfhyjs6Zsj8mCFx2jLoqfqSbLvFgvFGHfm8YwfbS4sJPLprxZ","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":4,"msg":{},"ps":0}}')


    //
    // Floating Coinbase
    //
    tx[14] = new saito.transaction('{"transaction":{"id":1,"from":[{"add":"npDwmBDQafC148AyhqeEBMshHyzJww3X777W9TM3RYNv","amt":"0","type":0,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"to":[{"add":"0","amt":"5100000000","type":5,"bid":0,"tid":0,"sid":0,"bhash":"","lc":1}],"ts":0,"sig":"hKQWvbS2h6hELVW7Le1hpxebQ4Jzx3idRRenhrfKkB989yeN3zM6aFg4Pj63UNmzhq6Kj1Ym5T2PJFCK1DbLv7u","mhash":"4a87bb9d804304a98ce20586bc5cb8ceb0c6f2235653d4259acef8e311fb184c","ver":1,"path":[],"type":5,"msg":{},"ps":0}}')

    //
    // add pre-gen transactions
    //
    for (let i = 0; i < tx.length; i++) {
      this.app.mempool.transactions.push(tx[i]);
    }

  }
  return;

}




