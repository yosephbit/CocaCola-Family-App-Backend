//TODO:

const admin = require("firebase-admin");
const root = admin.database();

module.exports.getAuthDb = function getAuthDb(){
    return root.ref("verificationDb")
}

module.exports.getUsersDb = function getUsersDb(){
    return root.ref("users");
}