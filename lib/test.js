var saito = require('./saito');


var cards = {};
    cards['1'] = "boat1";
    cards['2'] = "boat2";
    cards['3'] = "boat3";
    cards['4'] = "boat4";
    cards['5'] = "boat5";
    cards['6'] = "boat6";

var discards = {};
    discards['1'] = cards['1'];
    discards['2'] = cards['2'];


var discarded = {};

for (var i in discards) {
  discarded[i] = cards[i];
  delete cards[i];
}


console.log("1: " + JSON.stringify(discarded));
console.log("2: " + JSON.stringify(cards)); 

process.exit();



var app        = {};
    app.crypto = new saito.crypto();


let x = "d83a5cd370757e6dc7299c";
let xor1   = "0ba898a9cd67c229075d929988fc2775acae4c2722b5c060312421dd69d6c300";
let xor2   = "a4fba816c470ce25ae107a090f1e592316faecd680f7ac184e8e87f71d862b14";

let y = app.crypto.decodeXOR(x, xor1);
let z = app.crypto.decodeXOR(y, xor2);

console.log(y);
console.log(z);
console.log(app.crypto.hexToString(z));






