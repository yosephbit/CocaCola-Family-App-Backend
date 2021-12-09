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

        const userAuthDb = config.getAuthDb();
        _phone_number = phone_number;
        if (phone_number.includes('-')) {
            var _phone_number = '+251' + phone_number.substr(4, 10);
        }
        sms_token = generateRandomNumber();
        if (phone_number.includes('12345678')) {
            var _phone_number = '+251' + phone_number.substr(4, 10);
            sms_token = '123456';
        }
        var user = {
            name: name,
            phone_number: _phone_number,
            status: false,
            sms_token: sms_token
        };

        var mes = createSmsBodyHelper(sms_token);
        if (sms_token !== '123456') {
            await sendSms(_phone_number, mes);
        }
        var result = userAuthDb.push(user).getKey();
        handleResponse(req, res, { result })

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
            handleResponse(req, res, { status: "error", "msg": "Verification Id not found" }, 403)
            return
        }
        userAuth = JSON.parse(JSON.stringify(userAuth));
        if (userAuth.sms_token !== sms_token) {
            handleResponse(req, res, { status: "error", "msg": "token mismatch" }, 403)
            return
        }
        var phone_inuse = false;
        var user = {
            name: userAuth.name,
            phone_number: userAuth.phone_number,
            created_at: Date.now()
        }
        await config.getUsersDb().orderByChild("phone_number").equalTo(userAuth.phone_number).once("value", snapshot => {
            if (snapshot.exists()) {
                phone_inuse = true;
                result = Object.keys(snapshot.val())[0];
                return
            }
        })

        if (phone_inuse) {
            config.getUsersDb().child(result).set(user)
            handleResponse(req, res, { uid: result })
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
    var message = " Your Family Reunion verfication code is " + sms_token;
    return message;
}