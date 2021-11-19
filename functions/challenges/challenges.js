const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");

exports.addChallange = functions.https.onRequest(async (req, res) => {
    try {

        const validateSchema = () =>
            joi.object({
                questionId: joi.string().required(),
                challengerId: joi.string().required(),
                answerId: joi.string().required()
            }).required();
        const { questionId, challengerId, answerId } = mustValidate(validateSchema(), req.body);
        var challange = {
            questionId: questionId,
            challengerId: challengerId,
            answerId: answerId
        };

        const usersDb = root.ref("users");
        const questionDb = root.ref("question");
        const questionChoiceDB = root.ref("questionChoice");

        var userExists = await (await usersDb.child(challengerId).get()).val();
        var questionExists = await (await questionDb.child(questionId).get()).val();
        var questionChoiceExists = await (await questionChoiceDB.child(answerId).get()).val();

        if (userExists === null) {
            throw new ErrorWithDetail("Invalid Data", "User Id not found");
        }
        
        if (questionExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Id not found")
        }
        if (questionChoiceExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Choice Id not found")
        }

        const db = root.ref("challanges");
        var result = db.push(challange).getKey();
        handleResponse(req, res, { challange_id: result })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

})