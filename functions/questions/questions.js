const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");
const config = require("../utils/config");

exports.addAnswers = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                challangeId: joi.string().required(),
                respondentId: joi.string().required(),
                questionId: joi.string().required(),
                questionChoiceId: joi.string().required()
            }).required();
        const { challangeId, respondentId, subjectId, questionId, questionChoiceId } = mustValidate(validateSchema(), req.body);

        const usersDb = config.getUsersDb();
        const questionDb = config.getQuestionsDb();
        const questionChoiceDB = config.getQuestionChoicesDb();
        const answersDb = config.getAnswersDb();
        const challangeInstanceDb = config.getChallengeInstancesDb();

        var challangeInstanceExists = await (await challangeInstanceDb.child(challangeId).get()).val();
        var respondentExists = await (await usersDb.child(respondentId).get()).val();
        var questionExists = await (await questionDb.child(questionId).get()).val();
        var questionChoiceExists = await (await questionChoiceDB.child(questionChoiceId).get()).val();

        if (respondentExists === null) {
            handleResponse(req, res, { status: "error", "msg": "respondant Id not found" }, 404)
            return 
        }
        if (questionExists === null) {

            handleResponse(req, res, { status: "error", "msg": "respondant Id not found" }, 401)
            return
        }
        if (questionChoiceExists === null) {

            handleResponse(req, res, { status: "error", "msg": "Questions Choice Id not found" }, 404)
            return
        }
        if (challangeInstanceExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Challenge Id not found" }, 404)
            return 
        }

        answer = {
            challangeId: challangeId,
            respondentId: respondentId,
            questionId: questionId,
            questionChoiceId: questionChoiceId,
            timeStamp: Date.now()
        }

        var result = await answersDb.push(answer).getKey();
        handleResponse(req, res, { answersId: "Answer to question added successfully" })
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }


})

exports.getScore = functions.https.onRequest(async (req, res, next) => {
    try {
        const validateSchema = () =>
            joi.object({
                challangeId: joi.string().required(),
                respondentId: joi.string().required()
            }).required()
        const { respondentId, challangeId } = mustValidate(validateSchema(), req.body);

        const usersDb = config.getUsersDb();
        const challengesDb = config.getChalllengesDb();
        const answersDb = config.getAnswersDb();
        const scoresDb = config.getScoresDb();

        var respondantExists = await (await usersDb.child(respondentId).get()).val();

        if (respondantExists === null) {
            handleResponse(req, res, { status: "error", "msg": "respondandt Id not found" }, 401)
            return 
        }

        var responses;
        await answersDb.orderByChild("challangeId").equalTo(challangeId).once("value", snapshot => {
            if (snapshot.exists()) {
                responses = snapshot.val();
            } else {
                handleResponse(req, res, { status: "error", "msg": "Challenger Id not found" }, 401)
                return 
           
            }
        });
        responses = Object.entries(responses);
        //responses=responses.filter(filterAnswersBySubjectIdHelper.bind(this, subjectId));

        var subjectsAnswers;
        await challengesDb.orderByChild("challangeInstanceId").equalTo(challangeId).once("value", snapshot => {
            if (snapshot.exists()) {
                subjectsAnswers = snapshot.val();
            } else {

                handleResponse(req, res, { status: "error", "msg": "Challenger Id not found" }, 404)
                return

            }
        });

        //needs more nauance here 
        var score = 0;
        subjectsAnswers = Object.entries(subjectsAnswers);
        responses.forEach(singleResponse => {
            var result = subjectsAnswers.find(findAnswersByQuestionId.bind(this, singleResponse));
            if (result != undefined) {

                if (result[1].answerId === singleResponse[1].questionChoiceId) {
                    score++;
                }
            }
        });
        //calculate Percentage 
        var percentage = (score / responses.length) * 100;
        var newScore = {
            challangeId: challangeId,
            respondentId: respondentId,
            netScore: score,
            percentage: percentage,
            timeStamp: Date.now()
        }
        var result = await scoresDb.push(newScore).getKey();
        handleResponse(req, res, { "scoreId": result, "net score": score, "percentage": percentage });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.getQuiz = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                numberOfQuestions: joi.number().required()
            }).required()

        const { numberOfQuestions } = mustValidate(validateSchema(), req.body);
        const questionsDb = config.getQuestionsDb();

        var questions = await (await questionsDb.orderByKey().get()).val();
        questions = Object.entries(questions)

        logger.log(questions.length)
        //questions=JSON.stringify(questions);
        if (questions.length < numberOfQuestions) {
            handleResponse(req, res, { status: "error", "msg": "Number of questions is too high" }, 404)
            return 
        }
        randmizedQuestions = shuffleArray(questions)
        randmizedQuestions = randmizedQuestions.slice(0, numberOfQuestions)
        quizeArray = []
        for (const question of randmizedQuestions) {
            var choice1 = await getQuestionsChoiceById(question[1].answersId.choiceID1);
            var choice2 = await getQuestionsChoiceById(question[1].answersId.choiceID2);
            var questionFull = {
                "question": {
                    "questionId": question[0],
                    "questionText": question[1].questionText
                },
                "answers": {
                    "choice1": {
                        "choiceId": question[1].answersId.choiceID1,
                        "choiceText": choice1.answersText
                    },
                    "choice2": {
                        "choiceId": question[1].answersId.choiceID2,
                        "choiceText": choice2.answersText
                    },
                }
            }
            quizeArray.push(questionFull);

        }
        handleResponse(req, res, { questions: quizeArray });
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.getSingleQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                questionId: joi.string().required()
            }).required();
        const { questionId } = mustValidate(validateSchema(), req.body);

        const questionsDb = config.getQuestionsDb();

        var questionExists = await (await questionsDb.child(questionId).get()).val();
        if (questionExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Question Id not found" }, 404)
            return 
        }
        //only for pretty json
        var question = questionExists;
        handleResponse(req, res, { question });

    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err },)

    }
})
exports.getSingleScoreById = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                scoreId: joi.string().required()
            }).required();
        const { scoreId } = mustValidate(validateSchema(), req.body);

        const scoresDb = config.getScoresDb();

        var scoreExists = await (await scoresDb.child(scoreId).get()).val();
        if (scoreExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Score Id not found" }, 404)
            return
        }
        //only for pretty json
        var score = scoreExists;
        handleResponse(req, res, { score });

    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err },)

    }
})
exports.addScoreForPlayTogether = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                respondentId: joi.string().required(),
                netScore: joi.string().required(),
                percentage: joi.string().required()
            }).required()
        const { respondentId, netScore, percentage } = mustValidate(validateSchema(), req.body);

        const usersDb = config.getUsersDb();
        const scoresDb = config.getScoresDb();

        var respondantExists = await (await usersDb.child(respondentId).get()).val();

        if (respondantExists === null) {

            handleResponse(req, res, { status: "error", "msg": "respondant Id not found" }, 401)
            return
        }

        var newScore = {
            respondentId: respondentId,
            netScore: netScore,
            percentage: percentage,
            timeStamp: Date.now()
        }
        var result = await scoresDb.push(newScore).getKey();
        handleResponse(req, res, { "scoreId": result, "net score": score, "percentage": percentage });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

//helper functions
function shuffleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
function findAnswersByQuestionId(element, singleResponse) {

    return element[1].questionId === singleResponse[1].questionId;
}

async function getQuestionsChoiceById(questionChoiceId) {
    var questionsChoiceDb = config.getQuestionChoicesDb();

    questionChoice = await (await questionsChoiceDb.child(questionChoiceId).get()).val();
    return questionChoice;

}


///Questions Related API for admin


exports.addQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                questionText: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { questionText, uid, token } = mustValidate(validateSchema(), req.body);
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }
        var question = {
            questionText: questionText,
            availableAnswers: {
                id: []
            }
        };

        const db = config.getQuestionsDb();
        var result = db.push(question).getKey();
        handleResponse(req, res, { question_id: result })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
});

exports.editQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                questionId: joi.string().required(),
                questionText: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { questionId, questionText, uid, token } = mustValidate(validateSchema(), req.body);
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return ("Invalid session", "Sessions Expired")
        }
        const questionsDb = config.getQuestionsDb();
        var questionExists = await (await questionsDb.child(questionId).get()).val();
        if (questionExists === null) {

            handleResponse(req, res, { status: "error", "msg": "Question Id not found" }, 404)
            return
        }
        var question = {
            questionText: questionText,
            answerId: questionExists.answersId
        };

        var result = await questionsDb.child(questionId).set(question)
        handleResponse(req, res, { question_id: question })
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})

exports.deleteQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                questionId: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { questionId, uid, token } = mustValidate(validateSchema(), req.body);
        const session = await checkSessions(token, uid);
        if (!session) {

            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }
        const questionsDb = config.getQuestionsDb();
        var questionExists = await (await questionsDb.child(questionId).get()).val();
        if (questionExists === null) {

            handleResponse(req, res, { status: "error", "msg": "Question Id not found" }, 404)
            return
        }


        var result = await questionsDb.child(questionId).remove();
        handleResponse(req, res, { result: result })
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})

exports.addMultipleQuestions = functions.https.onRequest(async (req, res) => {
    try {

        const db = config.getQuestionsDb();
        const choiceDb = config.getQuestionChoicesDb()

        var questions = JSON.parse(JSON.stringify(req.body));
        for (const question of questions.questions) {
            const db = config.getQuestionsDb();
            const choiceDb = config.getQuestionChoicesDb()
            logger.log(question.question.questionText)
            var getSingleQuestion = {
                questionText: question.question.questionText,
                availableAnswers: {
                    id: []
                }
            };
            var result = await db.push(getSingleQuestion).getKey();

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

            var result = await config.getQuestionsDb().child(result).set(availableAnswers)
        }
        handleResponse(req, res, { "sucess": true })

    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.addChoiceToQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                qid: joi.string().required(),
                answersText: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { qid, answersText, uid, token } = mustValidate(validateSchema(), req.body);
        const session = await checkSessions(token, uid);
        if (!session) {

            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }

        var answer = {
            answersText: answersText,
        };
        const db = config.getQuestionChoicesDb();
        var choiceID = db.push(answer).getKey();




        const questionDb = config.getQuestionsDb()
        var question = await (await questionDb.child(qid).get()).val();
        if (question === null) {
            handleResponse(req, res, { status: "error", "msg": "Question Id not found" }, 404)
            return
        }
        if (question.answersId === undefined) {
            var availableAnswers = {
                questionText: question.questionText,
                answersId: {
                    choiceID1: choiceID
                }
            }
        } else {
            var availableAnswers = {
                questionText: question.questionText,
                answersId: {
                    choiceID1: question.answersId.choiceID1,
                    choiceID2: choiceID
                }
            }
        }
        var result = await config.getQuestionsDb().child(qid).set(availableAnswers)

        handleResponse(req, res, { result: "successfully added answers" });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

});

exports.editQuestionChoice = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                choiceId: joi.string().required(),
                answersText: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { choiceID, answersText, uid, token } = mustValidate(validateSchema(), req.body);
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }

        const db = config.getQuestionChoicesDb();

        var questionChoiceExists = await (await db.child(choiceID).get()).val();
        if (questionChoiceExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Question Id not found" }, 404)
            return
        }
        var answerChoice = {
            answersText: answersText,
        };

        var result = await db.child(choiceID).set(answerChoice)
        handleResponse(req, res, { question_id: answerChoice })



    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

});

exports.getScoresList = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                page: joi.number().required(),
                itemsPerPage: joi.number().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { page, itemsPerPage, uid, token } = mustValidate(validateSchema(), req.body)
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Sessions Expired" }, 401)
            return
        }
        const getScoresDb = config.getScoresDb()
        var scores = await (await getScoresDb.orderByKey().get()).val();
        scores = Object.entries(scores)
        var startAt = page * itemsPerPage
        var endAt = startAt + itemsPerPage
        scores = scores.slice(startAt, endAt)
        handleResponse(req, res, scores)
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})
