const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const joi = require("joi");
const dotenv=require("dotenv").config();

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");
const sendSms = require("../utils/SendSms");
const config = require("../utils/config");

exports.createChallangeInstance = functions.https.onRequest(async (req, res) => {
    try{
        const validateSchema = ()=>
            joi.object({ 
                challangerId: joi.string().required(),
            }).required();
        const {challangerId} = mustValidate(validateSchema(), req.body);
        const challangeInstance ={
            challangerId: challangerId,
        };

        const challengeInstanceDb = config.getChallengeInstancesDb();

        const challangeInstanceId= challengeInstanceDb.push(challangeInstance).getKey();
        handleResponse(req, res, {challangeInstanceId})
    }catch(err){
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err },)
    }
})
exports.addChallange = functions.https.onRequest(async (req, res) => {
    try {

        const validateSchema = () =>
            joi.object({
                challangeInstanceId : joi.string().required(),
                questionId: joi.string().required(),
                answerId: joi.string().required()
            }).required();
        const { questionId,  answerId,challangeInstanceId } = mustValidate(validateSchema(), req.body);

        var challange = {
            challangeInstanceId : challangeInstanceId,
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
            throw new ErrorWithDetail("Invalid Data", "Questions Id not found")
        }
        if (questionChoiceExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Choice Id not found")
        }
        if(challangeExists === null) {
            throw new ErrorWithDetail("Invalid Data", "ChallangeInstance  dOes not exist");
        }

        const db = config.getChalllengesDb();
        var result = db.push(challange).getKey();
        handleResponse(req, res, { challange_id: "Challange added successfully" })
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

})

exports.getChalllenge = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                challengeInstanceId: joi.string().required()
            }).required()
        
        const { challengeInstanceId } = mustValidate(validateSchema(), req.body);
        const challengerDb = config.getChalllengesDb();
        var questions =
        await challengerDb.orderByChild("challangeInstanceId").equalTo(challengeInstanceId).once("value", snapshot => {
            if (snapshot.exists()) {
                questions = snapshot.val();
            }else{
                throw new ErrorWithDetail("Invalid Data", "Challanger Id not found in challange")
            }
        });
       // questions = Object.entries(questions)
        
        handleResponse(req, res, { questions: questions });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})


exports.onChallengeCreated= functions.https.onRequest(async (req, res) => {
    try{
        const validateSchema = () =>
            joi.object({
                challengeInstanceId: joi.string().required()
            }).required()
        const {challengeInstanceId} =mustValidate(validateSchema(), req.body);

        
        const challengeInstanceDb = config.getChallengeInstancesDb();
        
        var challangeExists = await (await challengeInstanceDb.child(challengeInstanceId).get()).val();
        if(challangeExists === null){
            throw new ErrorWithDetail("Invalid Data","Challane Instance Id not found")
        }
        challenge=JSON.parse(JSON.stringify(challangeExists));
        var uid=challenge.challangerId;
        const usersDb = config.getUsersDb()
        var doesUserExist = await (await usersDb.child(uid).get()).val();
        if(doesUserExist === null){
            throw new ErrorWithDetail("Invalid Data","User Id linked with Challange Instance not found")
        }
        user=JSON.parse(JSON.stringify(doesUserExist));
        var smsTo=user.phone_number
        var smsBody=createSmsBodyHelper(challengeInstanceId,user.name)
        await sendSms(smsTo,smsBody);
        handleResponse(req, res, {"message":"SMS sent successfully"});
    }catch (err) {
        logger.log(err);
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err },500)
    }
})

function createSmsBodyHelper(challangeInstanceId,challangerName){
    var body= challangerName+" has prepared your trivial quiz Go to "
    var link=process.env.FORNT_END_URL+"?challenge="+challangeInstanceId
    body=body+ link+" to Complete your Challange!";
    return body;
}