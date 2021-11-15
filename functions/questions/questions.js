const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");

exports.addQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                questionText: joi.string().required()
            }).required();
        const { questionText } = mustValidate(validateSchema(), req.body);
        var question = {
            questionText: questionText,
            availableAnswers: {
                id: []
            }
        };

        const db = root.ref("questions");
        var result = db.push(question).getKey();
        handleResponse(req, res, { question_id: result })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
});

exports.addChoiceToQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                qid: joi.string().required(),
                answersText: joi.string().required()
            }).required();
        const { qid, answersText } = mustValidate(validateSchema(), req.body);
        var answer = {
            answersText: answersText,
        };
        const db = root.ref("questionsChoice");
        var choiceID = db.push(answer).getKey();


        var availableAnswers = {
            answersId: {
                choiceID
            }
        }

        var result = root.ref("questions").child(qid).child('answersId').setValue(availableAnswers.answersId)
        logger.log(result);
        handleResponse(req, res, { result: result })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

});

exports.addAnswers = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                respondentId: joi.string().required(),
                subjectId: joi.string().required(),
                questionId: joi.string().required(),
                questionChoiceId: joi.string().required()
            }).required();
        const { respondentId: respondentId, subjectId, questionId, questionChoiceId } = mustValidate(validateSchema(), req.body);

        const usersDb = root.ref("users");
        const questionDb = root.ref("question");
        const questionChoiceDB = root.ref("questionChoice");
        const answersDb = root.ref("answers");

        var respondentExists = await (await usersDb.child(respondentId).get()).val();
        var subjectExists = await (await usersDb.child(subjectId).get()).val();
        var questionExists = await (await questionDb.child(questionId).get()).val();
        var questionChoiceExists = await (await questionChoiceDB.child(questionChoiceId).get()).val();

        if (respondentExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Respondent Id not found");
        }
        if (subjectExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Subject Id not found")
        }
        if (questionExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Id not found")
        }
        if (questionChoiceExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Choice Id not found")
        }

        answer = {
            respondentId: respondentId,
            subjectId: subjectId,
            questionId: questionId,
            questionChoiceId: questionChoiceId
        }

        var result = await answersDb.push(answer).getKey();
        handleResponse(req, res, { answersId: result })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }


})

exports.getScore = functions.https.onRequest(async (req, res, next) => {
    try {
        //TODO

    } catch (err) {
        handleResponse(res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.getQuiz = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                numberOfQuestions: joi.number().required()
            }).required()

        const { numberOfQuestions } = mustValidate(validateSchema(), req.body);
        const questionsDb = root.ref("questions");
        
        var questions = await (await questionsDb.orderByKey().get()).val();
        questions = Object.entries(questions)

        logger.log(questions.length)
        //questions=JSON.stringify(questions);
        if (questions.length < numberOfQuestions){
            throw new ErrorWithDetail("Invalid Data", "Number of questions is too high")
        }
        randmizedQuestions = shuffleArray(questions)
        
        handleResponse(req,res, {questions:randmizedQuestions});
    } catch (err) {
        logger.log(err);
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

function shuffleArray(array) {
   
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }
        return array;
}