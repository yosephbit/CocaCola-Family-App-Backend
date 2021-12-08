const functions = require("firebase-functions");
const fs = require("fs");

const logger = require('./utils/Logger');
const users = require('./users/users');
const questions = require('./questions/questions');
const challenges = require('./challenges/challenges');
const auth = require('./auth/auth');
const adminUsers = require('./admin/admin')
const config = require('./utils/config')

async function createAdmin() {
    const adminUsersDb = config.getAdminUsersDb()
    var adminUser = {
        username: "admin",
        password: "password",
    }
    var result = await adminUsersDb.push(adminUser).getKey()
    return result
}
async function initializeQuestions() {
    fs.readFile('payload.json', (err, data) => {
        if (err) throw err;
        let questions = JSON.parse(data);

        const db = config.getQuestionsDb();
        const choiceDb = config.getQuestionChoicesDb()
        for (const question of questions.questions) {
            var getSingleQuestion = {
                questionText: question.question.questionText,
                availableAnswers: {
                    id: []
                }
            };
            var result = db.push(getSingleQuestion).getKey();

            var answer = {
                answersText: question.answers.choice1.choiceText
            }
            var choiceID1 = choiceDb.push(answer).getKey();
            var answer = {
                answersText: question.answers.choice2.choiceText
            }
            var choiceID2 = choiceDb.push(answer).getKey();

            var availableAnswers = {
                relation: question.relation,
                questionText: question.question.questionText,
                challengeText: question.question.challengeText,
                answersId: {
                    choiceID1: choiceID1,
                    choiceID2: choiceID2
                }
            }

            var result = config.getQuestionsDb().child(result).set(availableAnswers)

        }
    })
}

//test purpose only
async function initializeUsers() {
    var user = {
        name: "test",
        phone_number: 1234556789,
        created_at: Date.now()
    }
    const usersDb = config.getUsersDb()
    for (i = 0; i < 27; i++) {
        await usersDb.push(user)
        var user = {
            name: "test"+i,
            phone_number: 1234556789+i,
            created_at: Date.now()
        }

    }
}

async function initializQuestionForTesting() {
    for (i = 0; i < 9; i++){
        await initializeQuestions();
    }
}

exports.initializeQuestions = initializeQuestions;

exports.createAdmin = createAdmin;

exports.initializeUsers = initializeUsers;
exports.initializQuestionForTesting = initializQuestionForTesting;

