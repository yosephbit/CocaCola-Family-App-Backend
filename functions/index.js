const functions = require("firebase-functions");
const admin = require('firebase-admin');

let isUser =true;

admin.initializeApp();
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
const root = admin.database();


const logger = require('./utils/Logger');
const users = require('./users/users');
const questions = require('./questions/questions');
const challenges = require('./challenges/challenges');
const auth = require('./auth/auth');
const adminUsers =require('./admin/admin')
const startupScript = require('./startupScript')

exports.helloWorld = functions.https.onRequest((request, response) => {
  logger.log("asd")
  response.send("Hello from Firebase!");
});


exports.generateInviteLink = users.generateInviteLink;

exports.onInvitationLink = users.onInvitation;

exports.addFamily = users.addFamily;

exports.getInviteDetails = users.getInviteLinkDetails;

//question related


exports.addChoiceToQuestion = questions.addChoiceToQuestion;

exports.answerQuestion = questions.addAnswers;

exports.getSingleQuestion = questions.getSingleQuestion;

exports.getQuiz = questions.getQuiz;

exports.getScore = questions.getScore;

exports.addScoreForPlayTogether = questions.addScoreForPlayTogether;

exports.addMultipleQuestions =questions.addMultipleQuestions;

exports.getSingleScoreById = questions.getSingleScoreById;

//challange related 

exports.addChallange = challenges.addChallange; 

exports.getChallenge = challenges.getChallenge;

exports.createChallangeInstance = challenges.createChallangeInstance;

exports.onChallengeCreated= challenges.onChallengeCreated;

//Authrization related

exports.sendCode=auth.sendCode;

exports.verifyToken=auth.verifyToken;


//admin only

exports.addAdmin = adminUsers.addAdmin;

exports.adminLogin=adminUsers.adminLogin;

exports.addQuestion = questions.addQuestion; 

exports.editQuestion = questions.editQuestion;

exports.deleteQuestion = questions.deleteQuestion;

exports.editQuestionChoice = questions.editQuestionChoice;

exports.getUsersList = users.getUsersList;

exports.getLinksList = adminUsers.adminLinkList;

exports.getScoresList = questions.getScoresList;