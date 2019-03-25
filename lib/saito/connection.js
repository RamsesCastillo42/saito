const saito = require('./saito');
const EventEmitter = require('events');

/////////////////
// Constructor //
/////////////////

class Connection extends EventEmitter {
  constructor() {
    super()
  }
}

module.exports = Connection;

