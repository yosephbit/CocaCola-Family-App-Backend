const functions = require("firebase-functions");
const fs = require("fs");

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
async function  initializeQuestions() { 
     fs.readFile('payload.json', (err, data) => {
        if(err) throw err;
        let questions = JSON.parse(data);

        const db = config.getQuestionsDb();
        const choiceDb = config.getQuestionChoicesDb()
        for (const question of questions.questions){
            logger.log(question.question.questionText)
            var getSingleQuestion = {
                questionText: question.question.questionText,
                availableAnswers: {
                    id: []
                }
            };
            var result =  db.push(getSingleQuestion).getKey();

            var answer = {
                answersText: question.answers.choice1.choiceText
            }
            var choiceID1 = choiceDb.push(answer).getKey();
            var answer = {
                answersText: question.answers.choice2.choiceText
            }
            var choiceID2 = choiceDb.push(answer).getKey();

            var availableAnswers = {
                questionText: question.question.questionText,
                answersId: {
                    choiceID1: choiceID1,
                    choiceID2: choiceID2
                }
            }

            var result =  config.getQuestionsDb().child(result).set(availableAnswers)

        }
    })
}


exports.initializeQuestions=initializeQuestions;

exports.createAdmin=createAdmin;
