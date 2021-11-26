const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const { customAlphabet } = require("nanoid");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");
const config = require("../utils/config");
const sendSms = require("../utils/SendSms");


exports.sendCode = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                name: joi.string().required(),
                phone_number: joi.string().required(),
            }).required();
        const { name, phone_number } = mustValidate(validateSchema(), req.body);

        var phone_inuse = false;
        
        const userAuthDb=config.getAuthDb();
        if(phone_number.includes('a')) {
            var _phone_number = '+251'+phone_number.substr(4, 10);
        }
        sms_token=generateRandomNumber();
        var user = {
            name: name,
            phone_number: _phone_number,
            status: false,
            sms_token: sms_token
        };
        var mes=createSmsBodyHelper(sms_token);
        
        await sendSms(_phone_number, mes);
        var result =userAuthDb.push(user).getKey();
        handleResponse(req, res, {result})

    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})
exports.verifyToken = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                verificationId: joi.string().required(),
                sms_token: joi.string().required(),
            }).required();
        const { verificationId, sms_token } = mustValidate(validateSchema(), req.body);

        const userAuthDb = config.getAuthDb();
        const usersDb = config.getUsersDb();

        var userAuth = await (await userAuthDb.child(verificationId).get()).val()

        if (userAuth === null) {
            throw new ErrorWithDetail("Invalid Data", "Verification Id not found")
        }
        userAuth = JSON.parse(JSON.stringify(userAuth));
        if (userAuth.sms_token !== sms_token) {
            throw new ErrorWithDetail("Invalid Token", "sms token doesn't much")
        }
        var phone_inuse=false;
        await config.getUsersDb().orderByChild("phone_number").equalTo(phone_number).once("value", snapshot => {
            if (snapshot.exists()) {
                phone_inuse = true;
                user = snapshot.val();
                return
            }
        })
        var user = {
            name: userAuth.name,
            phone_number: userAuth.phone_number
        }
        if(phone_inuse) {
            handleResponse(req, res, { uid: user })
            return;
        }
        var result = await usersDb.push(user).getKey();
        handleResponse(req, res, { uid: result })


    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})
function generateRandomNumber() {
    const nanoid = customAlphabet("0123456789", 6);
    const random = nanoid();
    return random;
}
function createSmsBodyHelper(sms_token) {
    var message = " Your Coca_cny verfication code is " + sms_token;
    return message;
}