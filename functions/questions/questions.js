const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");

exports.addQuestion = functions.https.onRequest(async (req, res) =>{
    try {
        const validateSchema = () =>
            joi.object({
                questionText: joi.string().required()
            }).required();
        const { questionText } = mustValidate(validateSchema(), req.body);
        var question = {
            questionText: questionText,
            avaliableAnswers: ''
        };
        
        const db = root.ref("questions");
        var result = db.push(question).getKey();
        handleResponse(res, { question_id: result })
    } catch (err) {
        handleResponse(res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
});
