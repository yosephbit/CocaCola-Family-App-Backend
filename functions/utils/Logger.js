const functions = require('firebase-functions');
const _ =require("lodash");

module.exports.log =function log(message){
 //   var message_str=_.toString(message);
    functions.logger.info(message, {structuredData: true});
}

