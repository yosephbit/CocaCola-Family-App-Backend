const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");
const dotenv = require("dotenv").config();

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");
const sendSms = require("../utils/SendSms");
const config = require("../utils/config");

exports.createChallangeInstance = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                challangerId: joi.string().required(),
            }).required();
        const { challangerId } = mustValidate(validateSchema(), req.body);
        const challangeInstance = {
            challangerId: challangerId,
            timeStamp: Date.now()
        };

        const challengeInstanceDb = config.getChallengeInstancesDb();

        const challangeInstanceId = challengeInstanceDb.push(challangeInstance).getKey();
        handleResponse(req, res, { challangeInstanceId })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err },)
    }
})
exports.addChallange = functions.https.onRequest(async (req, res) => {
    try {

        const validateSchema = () =>
            joi.object({
                challangeInstanceId: joi.string().required(),
                questionId: joi.string().required(),
                answerId: joi.string().required(),
                timeStamp: Date.now()
            }).required();
        const { questionId, answerId, challangeInstanceId } = mustValidate(validateSchema(), req.body);

        var challange = {
            challangeInstanceId: challangeInstanceId,
            questionId: questionId,
            answerId: answerId
        };


        const challengeInstanceDb = config.getChallengeInstancesDb();
        const questionDb = config.getQuestionsDb();
        const questionChoiceDB = config.getQuestionChoicesDb();

        var challangeExists = await (await challengeInstanceDb.child(challangeInstanceId).get()).val();
        var questionExists = await (await questionDb.child(questionId).get()).val();
        var questionChoiceExists = await (await questionChoiceDB.child(answerId).get()).val();


        if (questionExists === null) {

            handleResponse(req, res, { status: "error", "msg": "question Id not found" }, 404)
            return
        }
        if (questionChoiceExists === null) {

            handleResponse(req, res, { status: "error", "msg": "Questions Choice Id not found" }, 404)
            return
        }
        if (challangeExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Challenge Instance Id not found" }, 404)
            return
        }

        const db = config.getChalllengesDb();
        var result = db.push(challange).getKey();
        handleResponse(req, res, { challange_id: "Challange added successfully" })
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

})

exports.getChallenge = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                challengeInstanceId: joi.string().required()
            }).required()

        const { challengeInstanceId } = mustValidate(validateSchema(), req.body);
        const challengerDb = config.getChalllengesDb();
        var challengeQuestions =
            await challengerDb.orderByChild("challangeInstanceId").equalTo(challengeInstanceId).once("value", snapshot => {
                if (snapshot.exists()) {
                    questions = snapshot.val();
                } else {

                    handleResponse(req, res, { status: "error", "msg": "Challenger Id not found" }, 404)
                    return
                }
            });
        challengeQuestions = Object.entries(JSON.parse(JSON.stringify(challengeQuestions)))
        quizeArray = []
        for (const question of challengeQuestions) {

            const questionsDb = config.getQuestionsDb();
            questionDetails = await (await questionsDb.child(question[1]?.questionId).get()).val();
            var choice1 = await getQuestionsChoiceById(questionDetails?.answersId?.choiceID1);
            var choice2 = await getQuestionsChoiceById(questionDetails?.answersId?.choiceID2);

            var questionFull = {
                "question": {
                    "questionId": question[1]?.questionId,
                    "questionText": questionDetails?.questionText
                },
                "answers": {
                    "choice1": {
                        "choiceId": questionDetails?.answersId?.choiceID1,
                        "choiceText": choice1?.answersText
                    },
                    "choice2": {
                        "choiceId": questionDetails?.answersId?.choiceID2,
                        "choiceText": choice2?.answersText
                    },
                }
            }
            quizeArray.push(questionFull);

        }


        handleResponse(req, res, { questions: quizeArray });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})


exports.onChallengeCreated = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                challengeInstanceId: joi.string().required()
            }).required()
        const { challengeInstanceId } = mustValidate(validateSchema(), req.body);


        const challengeInstanceDb = config.getChallengeInstancesDb();

        var challangeExists = await (await challengeInstanceDb.child(challengeInstanceId).get()).val();
        if (challangeExists === null) {
            handleResponse(req, res, { status: "error", "msg": "Challenge Instance Id not found" }, 404)
            return
        }
        challenge = JSON.parse(JSON.stringify(challangeExists));
        var uid = challenge.challangerId;
        const usersDb = config.getUsersDb()
        var doesUserExist = await (await usersDb.child(uid).get()).val();
        if (doesUserExist === null) {
            handleResponse(req, res, { status: "error", "msg": "user not found" }, 401)
            return
        }
        user = JSON.parse(JSON.stringify(doesUserExist));
        var smsTo = user.phone_number
        var smsBody = createSmsBodyHelper(challengeInstanceId, user.name)
        await sendSms(smsTo, smsBody);
        handleResponse(req, res, { "message": smsBody.toString() });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

function createSmsBodyHelper(challangeInstanceId, challangerName) {
    var body = challangerName + " has prepared your trivial quiz Go to "
    var link = process.env.FORNT_END_URL + "?challenge=" + challangeInstanceId
    body = body + link + " to Complete your Challange!";
    return body;
}


async function getQuestionsChoiceById(questionChoiceId) {
    var questionsChoiceDb = config.getQuestionChoicesDb();

    var questionChoice = await (await questionsChoiceDb.child(questionChoiceId).get()).val();
    return questionChoice;

}