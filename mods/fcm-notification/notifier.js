const sqlite = require('sqlite')
const ModTemplate = require('../../lib/templates/template');

const path = require('path');

const admin = require('firebase-admin');

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
                    publickey TEXT NOT NULL, \
                    token TEXT NOT NULL,  \
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

    try {
      var serviceAccount = require('./saitowalletServiceAccountKey.json');
    } catch(err) {
      console.log("Firebase not properly configured")
      return
    }

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

      var sql = 'DELETE FROM users WHERE publickey = $publickey'
      await this.db.run(sql, {$publickey: publickey})

      if (!publickey || !token) {
        res.status(400)
        res.send({
          payload: {},
          error: {
            message: "Insufficient data to execute task (missing publickey or token)"
          }
        })
        return
      }
      sql = 'INSERT INTO users (publickey, token, unixtime) VALUES ($publickey, $token, $unixtime)'
      const params = {$publickey: publickey, $token: token, $unixtime: new Date().getTime()}

      try {
        var db_action_status = await this.db.run(sql, params)
      } catch (err) {
        console.log(err)
      }
      if (db_action_status.changes === 1) {
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

  async notifyByPublickeys(publickey, title, body) {
    // This registration token comes from the client FCM SDKs.
    try {
      var registrationTokens = await this._getTokensByPublickeys(publickey)
      if (registrationTokens.length == 0) {
        return
      }
    } catch(err) {
      console.log(err)
      return
    }

    // See the "Defining the message payload" section above for details
    // on how to define a message payload.
    var payload = {
      notification: {
        title,
        body
      }
    };

    var options = {
      collapseKey: "saito_is_rad"
    }

    // Send a message to the device corresponding to the provided
    // registration token with the provided options.
    admin.messaging().sendToDevice(registrationTokens, payload, options)
      .then(function(response) {
        console.log('Successfully sent message:', response);
      })
      .catch(function(error) {
        console.log('Error sending message:', error);
      });
  }

  async _getTokensByPublickeys(publickeys) {
    let question_string = publickeys.map(id => '?').join(', ')
    let sql = `SELECT * FROM users WHERE publickey IN (${question_string})`

    try {
      let rows = await this.db.all(sql, publickeys);
      return rows.map(row => row.token)
    } catch(err) {
      console.log(err)
    }
  }
}

module.exports = Notifier;