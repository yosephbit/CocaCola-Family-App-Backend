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




        const questionDb = root.ref("questions")
        var question = await (await questionDb.child(qid).get()).val();
        if (question === null) {
            throw new ErrorWithDetail(`Invalid Data". "Question Id not found"`);
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
        var result = await root.ref("questions").child(qid).set(availableAnswers)

        handleResponse(req, res, { result: "successfully added answers" });
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

});

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

        const usersDb = root.ref("users");
        const questionDb = root.ref("questions");
        const questionChoiceDB = root.ref("questionsChoice");
        const answersDb = root.ref("answers");
        const challangeInstanceDb = root.ref("challengeInstanceDb");

        var challangeInstanceExists =await (await challangeInstanceDb.child(challangeId).get()).val();
        var respondentExists = await (await usersDb.child(respondentId).get()).val();
        var questionExists = await (await questionDb.child(questionId).get()).val();
        var questionChoiceExists = await (await questionChoiceDB.child(questionChoiceId).get()).val();

        if (respondentExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Respondent Id not found");
        }
        if (questionExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Id not found")
        }
        if (questionChoiceExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Questions Choice Id not found")
        }
        if(challangeInstanceExists === null) {
            throw new ErrorWithDetail("Invalid Data", "Challange instance Id not found")
        }

        answer = {
            challangeId: challangeId,
            respondentId: respondentId,
            questionId: questionId,
            questionChoiceId: questionChoiceId
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

        const usersDb = root.ref("users");
        const challengesDb = root.ref("challanges");
        const answersDb = root.ref("answers");

        var respondantExists = await (await usersDb.child(respondentId).get()).val();
    
        if (respondantExists === null) {
            throw new ErrorWithDetail("Invalid Data", "respondantId not found")
        }
        
        var responses;
        await answersDb.orderByChild("challangeId").equalTo(challangeId).once("value", snapshot => {
            if (snapshot.exists()) {
                responses = snapshot.val();
            }else{
                throw new ErrorWithDetail("Invalid Data", "Challanger dsds Id not found in challange")
            
            }
        });
        responses =Object.entries(responses);
        //responses=responses.filter(filterAnswersBySubjectIdHelper.bind(this, subjectId));

        var subjectsAnswers;
        await challengesDb.orderByChild("challangeInstanceId").equalTo(challangeId).once("value", snapshot => {
            if (snapshot.exists()) {
                subjectsAnswers = snapshot.val();
            }else{
                throw new ErrorWithDetail("Invalid Data", "Challanger Id not found in challange")
                
            }
        });

        //needs more nauance here 
        var score=0;
        subjectsAnswers=Object.entries(subjectsAnswers);
        responses.forEach(singleResponse => {
            var result=subjectsAnswers.find(findAnswersByQuestionId.bind(this, singleResponse));
            if(result!=undefined) {
               if( result[1].answerId===singleResponse[1].questionChoiceId ){
                    score++;
               }
            }
        });
        //calculate Percentage 
        var percentage=(score/responses.length)* 100;
        handleResponse(req, res, {"net score": score, "percentage": percentage});
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
        const questionsDb = root.ref("questions");

        var questions = await (await questionsDb.orderByKey().get()).val();
        questions = Object.entries(questions)

        logger.log(questions.length)
        //questions=JSON.stringify(questions);
        if (questions.length < numberOfQuestions) {
            throw new ErrorWithDetail("Invalid Data", "Number of questions is too high")
        }
        randmizedQuestions = shuffleArray(questions)

        handleResponse(req, res, { questions: randmizedQuestions });
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.getSingleQuestion = functions.https.onRequest(async (req, res)=>{
    try {
        const validateSchema = () =>
            joi.object({
                questionId: joi.string().required()
            }).required();
        const {questionId}=mustValidate(validateSchema(), req.body);

        const questionsDb = root.ref("questions");

        var questionExists = await (await questionsDb.child(questionId).get()).val();
        if(questionExists === null){
            throw new ErrorWithDetail("Invalid Data", "Question Id not found");
        }
        //only for pretty json
        var question=questionExists;
        handleResponse(req, res, {question});
        
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err },)
        
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
function filterAnswersBySubjectIdHelper(subjectId,answer) {

    return answer[1].subjectId===subjectId;
    
}
function findAnswersByQuestionId(element, singleResponse) {

    return element[1].questionId===singleResponse[1].questionId;
}