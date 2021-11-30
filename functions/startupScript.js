const functions = require("firebase-functions");
const admin = require('firebase-admin');

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
const root = admin.database();


const logger = require('./utils/Logger');
const users = require('./users/users');
const questions = require('./questions/questions');
const challenges = require('./challenges/challenges');
const auth = require('./auth/auth');
const adminUsers =require('./admin/admin')
const config = require('./utils/config')

async function createAdmin(){
    const adminUsersDb = config.getAdminUsersDb()
    var adminUser={
        username: "admin",
        password: "password",
    }
    var result = await adminUsersDb.push(adminUser).getKey()
    return result
}
exports.createAdmin=createAdmin;