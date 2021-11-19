const functions = require("firebase-functions");
const admin = require('firebase-admin');

admin.initializeApp();
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
const root = admin.database();


const logger = require('./utils/Logger');
const users = require('./users/users');
const questions = require('./questions/questions');
const challenges = require('./challenges/challenges');

exports.helloWorld = functions.https.onRequest((request, response) => {
  logger.log("asd")
  response.send("Hello from Firebase!");
});


///user related
exports.signUp =users.signUpUsers;

exports.generateInviteLink = users.generateInviteLink;

exports.onInvitationLink = users.onInvitation;

exports.addFamily = users.addFamily;

exports.getInviteDetails = users.getInviteLinkDetails;
//question related
exports.addQuestion = questions.addQuestion; 

exports.addChoiceToQuestion = questions.addChoiceToQuestion;

exports.answerQuestion = questions.addAnswers;

exports.getQuiz = questions.getQuiz;

//challange related 

exports.addChallange = challenges.addChallange; 

