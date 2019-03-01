const sqlite = require('sqlite')
const ModTemplate = require('../../lib/templates/template');

const path = require('path');

const admin = require('firebase-admin');
const serviceAccount = require('./saitowalletServiceAccountKey.json');

class Notifier extends ModTemplate {
  constructor(app) {
    super(app)

    this.app               = app;
    this.db                = null;
    this.dir               = path.join(__dirname, "../../data/notifier.sq3");

    this.name              = "Notifier";
  }

  async installModule() {
    if (this.app.BROWSER == 1) { return; }

    try {
      this.db = await sqlite.open(this.dir);

      var sql = 'CREATE TABLE IF NOT EXISTS users (\
                    id INTEGER, \
                    publickey TEXT, \
                    token TEXT,  \
                    unixtime INT, \
                    UNIQUE (publickey), \
                    PRIMARY KEY(id ASC) \
            )';
      let users = this.db.run(sql, {});

      var sql = 'CREATE TABLE IF NOT EXISTS groups (\
                    id INTEGER, \
                    uuid TEXT, \
                    group_token TEXT, \
                    unixtime INTEGER, \
                    UNIQUE (uuid), \
                    PRIMARY KEY(id ASC) \
            )';
      let groups = this.db.run(sql, {});

      await Promise.all([users, groups]);
    } catch (err) {
      console.log(err);
    }

  }

  async initialize() {
    if (this.app.BROWSER == 1) { return; }

    this.db = await sqlite.open(this.dir);

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://saitowallet.firebaseio.com'
      });
    }
  }

  webServer(app, expressapp) {
    expressapp.post('/notify/token/user/', async (req, res) => {
      const body = req.body
      const publickey = body.publickey
      const token = body.token

      const sql = 'INSERT INTO users (publickey, token, unixtime) VALUES ($publickey, $token, $unixtime)'
      const params = {$publickey: publickey, $token: token, $unixtime: new Date().getTime()}

      try {
        var db_action_status = await this.db.run(sql, params)
      } catch (err) {
        console.log(err)
      }
      if (db_action_status.changes) {
        res.send({
          payload: {
            message: "Success! Token has been linked to publickey"
          },
          error: {}
        })
        return
      } else {
        res.status(400)
        res.send({
          payload: {},
          error: {
            message: "Failed to link token to publickey. Publickey already has linked token"
          }
        })
      }
    })
  }

  async notifyByPublickey(publickey, title, body) {
    if (this.app.BROWSER == 1) { return; }
    // This registration token comes from the client FCM SDKs.
    // var registrationToken = 'bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1...';
    var registrationToken = await this._getTokenByPublickey(publickey)

    // See the "Defining the message payload" section above for details
    // on how to define a message payload.
    var payload = {
      notification: {
        title,
        body
      }
    };

    // Send a message to the device corresponding to the provided
    // registration token with the provided options.
    admin.messaging().sendToDevice(registrationToken, payload)
      .then(function(response) {
        console.log('Successfully sent message:', response);
      })
      .catch(function(error) {
        console.log('Error sending message:', error);
      });
  }

  async _getTokenByPublickey(publickey) {
    let sql = 'SELECT * FROM users WHERE publickey = $publickey'
    let params = {$publickey: publickey}
    try {
      let row = await this.db.get(sql, params)
      return row.token
    } catch(err) {
      console.log(err)
    }
  }
}

module.exports = Notifier;