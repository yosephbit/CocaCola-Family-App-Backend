const dotenv=require('dotenv').config();
const logger = require('./Logger')

TWILIO_ACCOUNT_SID="Yor Account ID"
TWILIO_AUTH_TOKEN="Your Account Token"
TWILIO_PHONE="+12566855168"
TWILIO_MID="MG992c25732c71ce4c8ffb8a023690e0b3"
FORNT_END_URL="https://coke-cny.netlify.app"


const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
const phone = TWILIO_PHONE;
const client = require('twilio')(accountSid, authToken);
const MID= TWILIO_MID;

async function sendSms(to,body) {
    logger.log('Sending SMS');
    await client.messages.create({
        body: body,
        messagingServiceSid: MID,
        to: to //To be uncommented for testing purposes only
    }).then(message => logger.log(message.sid))
}
module.exports = sendSms