var saito = require('./saito');

var app        = {};
    app.crypto = new saito.crypto();


let x = "ba0041d174739fac02ad";
let xor1   = "26dd6e04317a02998e66d814cb962bc40eb7ce9f29def7d174d5f96d44695668";
let xor2   = "f5af4ebb2666f341feaa74538e40fbeef6063cd14bd58b745b63f1961ff822d5";

let y = app.crypto.decodeXOR(x, xor1);
let z = app.crypto.decodeXOR(y, xor2);

console.log(y);
console.log(z);







