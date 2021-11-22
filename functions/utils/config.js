const admin = require("firebase-admin");
const root = admin.database();

module.exports.getAuthDb = function getAuthDb(){
    return root.ref("verificationDb")
}

module.exports.getUsersDb = function getUsersDb(){
    return root.ref("users");
}

module.exports.getChalllengesDb = function getChalllengesDb(){
    return root.ref("challenges");
}

module.exports.getAnswersDb = function getAnswersDb(){
    return root.ref("answers");
}

module.exports.getFamiliesDb = function getFamiliesDb(){
   return root.ref("families")
}

module.exports.getChallengeInstancesDb = function getChallengeInstancesDb(){
    return root.ref("challengeInstanceDb")
}
module.exports.getQuestionsDb = function getQuestionsDb(){
    return root.ref("questions");
}
module.exports.getQuestionChoicesDb = function getQuestionChoicesDb(){
    return root.ref("questionsChoice")
}

module.exports.getLinkInfoDb = function getLinkInfoDb(){
    return root.ref("linkInfo");
}