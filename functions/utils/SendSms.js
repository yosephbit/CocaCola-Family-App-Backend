const dotenv=require('dotenv').config();
const logger = require('./Logger')

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phone = process.env.TWILIO_PHONE;
const client = require('twilio')(accountSid, authToken);


async function sendSms(to,body) {
    logger.log('Sending SMS');
    await client.messages.create({
        body: body,
        from: phone,
        to: to //To be uncommented for testing purposes only
    }).then(message => logger.log(message.sid))
}
module.exports = sendSms