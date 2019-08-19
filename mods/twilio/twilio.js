var config = require('./twilio.config');

/**
 * Sends sms to a phone number
 *
 * @param {string} to - phone number
 * @param {string} message message being sent
 */
module.exports.sendSms = function(to, message) {
  var client = require('twilio')(config.accountSid, config.authToken);

  return client.api.messages
    .create({
      body: message,
      to: to,
      from: config.sendingNumber,
    }).then(function(data) {
      console.log('Gamer notified');
    }).catch(function(err) {
      console.error('Could not notify gamer');
      console.error(err);
    });
};