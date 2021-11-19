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
        var result = await db.push(user).getKey();
        handleResponse(req,res, { uid: result })
    } catch (err) {
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
});

exports.generateInviteLink = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                uid: joi.string().required(),
                relation: joi.string().valid('GrandFather', 'GrandMother', 'Mother', 'Father', 'Son', 'Daughter').required(),
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
        const linkInfoDB = root.ref('linkInfo');

        var result = await linkInfoDB.child(linkId).set(linkInfo);



        handleResponse(req,res, { linkId: linkId, to: relation, from: doesUserExist.name })
    } catch (err) {
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})
exports.getInviteLinkDetails= functions.https.onRequest(async (req, res) => {
   try{
       
    const validateSchema = () =>
            joi.object({
                invitationId: joi.string().required()
            }).required();

        const { invitationId } = mustValidate(validateSchema(), req.body);



        const linkInfoDB = root.ref('linkInfo');

        var result = await (await linkInfoDB.child(invitationId).get()).val();

        const usersDb = root.ref("users");
        var doesUserExist = await (await usersDb.child(result.inviterId).get()).val();
        
        if (doesUserExist === null) {
            throw new ErrorWithDetail("Invalid Uid", "user not found")
        }


        handleResponse(req,res, {  from: doesUserExist.name })
    } catch (err) {
        logger.log(err)
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }

})

exports.onInvitation = functions.https.onRequest(async (req, res) => {
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

        const linkInfoDB = root.ref('linkInfo');
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
        var result = await linkInfoDB.child(invitationId).update(linkInfo);

        handleResponse(req,res, { result: "successful" })
    } catch (err) {
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})


exports.addFamily = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                userId: joi.string().required(),
                familyMemberId: joi.string().required(),
                relation: joi.string().valid('GrandFather', 'GrandMother', 'Mother', 'Father', 'Son', 'Daughter').required()
            }).required();

        const { userId, familyMemberId, relation } = mustValidate(validateSchema(), req.body);
        const usersDb = root.ref("users");
        const familyDb = root.ref("families");

        var userExists = await (await usersDb.child(userId).get()).val();
        var familyMemberExists = await (await usersDb.child(familyMemberId).get()).val();

        if (userExists === null || familyMemberExists === null) {
            throw new ErrorWithDetail("Invalid Data", "User not found");
        }

        family = {
            usersId: userId,
            familyMemberId: familyMemberId,
            relation: relation
        }
        var result = await familyDb.push(family).getKey();

        handleResponse(req,res, {familyId, result});

    } catch (err) {
        handleResponse(req,res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})