const functions = require("firebase-functions");
const _ = require('loadsh');
const admin = require("firebase-admin");
const { nanoid } = require("nanoid");
const joi = require("joi");

const root = admin.database();

const logger = require("../utils/Logger");
const { mustValidate } = require("../utils/validation");
const handleResponse = require("../utils/handleResponse");
const ErrorWithDetail = require("../utils/ErrorWithDetail");

exports.signUpUsers = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                name: joi.string().required(),
                phone_number: joi.string().min(10).pattern(/^[0-9]+$/).required(),
            }).required();
        const { name, phone_number } = mustValidate(validateSchema(), req.body);
        var user = {
            name: name,
            phone_number: phone_number
        };
        var phone_inuse = false;
        await root.ref("users").orderByChild("phone_number").equalTo(phone_number).once("value", snapshot => {
            if (snapshot.exists()) {
                phone_inuse = true;
                return
            }
        })
        if (phone_inuse === true) {
            throw new ErrorWithDetail("Invalid Data", "phone already in use");
        }
        const db = root.ref("users");
        var result = db.push(user).getKey();
        handleResponse(res, { uid: result })
    } catch (err) {
        handleResponse(res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
});

exports.generateInviteLink = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                uid: joi.string().required(),
                relation: joi.string().valid('GrandFather', 'GrandMother', 'Mother', 'Father', 'Son', 'Daugther').required(),
            }).required();

        const { uid, relation } = mustValidate(validateSchema(), req.body);
        const usersDb = root.ref("users");
        var doesUserExist = await (await usersDb.child(uid).get()).val();

        if (doesUserExist === null) {
            throw new ErrorWithDetail("Invalid Uid", "user not found")
        }

        var linkInfo = {
            inviterId: uid,
            relation: relation,
            isUsed: false,
            invitedId: ''
        };
        const linkId = nanoid(8);
        logger.log(linkId);
        const linkInfoDB = root.ref('linkinfo');

        var result = linkInfoDB.child(linkId).set(linkInfo);



        handleResponse(res, { linkId: linkId, to: relation })
    } catch (err) {
        logger.log(err)
        handleResponse(res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})

exports.onInvation = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                invitationId: joi.string().required(),
                invitedId: joi.string().required(),
            }).required();

        const { invitationId, invitedId } = mustValidate(validateSchema(), req.body);
        const usersDb = root.ref("users");
        var doesUserExist = await (await usersDb.child(invitedId).get()).val();
        if (doesUserExist === null) {
            throw new ErrorWithDetail("Invalid Uid", "user not found")
        }

        const linkInfoDB = root.ref('linkinfo');
        var linkInfo = await (await linkInfoDB.child(invitationId).get()).val()
        if (linkInfo === null) {
            throw new ErrorWithDetail("Invalid invitation", "Invitation not found");
        }
        if (linkInfo.isUsed === true) {
            throw new ErrorWithDetail("Invalid Invitation", "Link already used");
        }


        linkInfo = {
            isUsed: true,
            invitedId: invitedId

        }
        var result = linkInfoDB.child(invitationId).update(linkInfo);

        handleResponse(res, { result: "sucessfull" })
    } catch (err) {
        logger.log(err)
        handleResponse(res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})
