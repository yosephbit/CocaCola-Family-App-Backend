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
const config = require("../utils/config");
const checkSessions = require("../utils/checkSessions");

exports.generateInviteLink = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                uid: joi.string().required(),
                relation: joi.string().valid('GrandFather', 'GrandMother', 'Mother', 'Father', 'Son', 'Daughter').required(),
            }).required();

        const { uid, relation } = mustValidate(validateSchema(), req.body);
        const usersDb = config.getUsersDb();
        var doesUserExist = await (await usersDb.child(uid).get()).val();

        if (doesUserExist === null) {

            handleResponse(req, res, { status: "error", "msg": "user not found" }, 401)
            return
        }

        var linkInfo = {
            inviterId: uid,
            relation: relation.toLowerCase(),
            isUsed: false,
            invitedId: ''
        };
        const linkId = nanoid(8);
        logger.log(linkId);
        const linkInfoDB = config.getLinkInfoDb();

        var result = await linkInfoDB.child(linkId).set(linkInfo);



        handleResponse(req, res, { linkId: linkId, to: relation, from: doesUserExist.name })
    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})
exports.getInviteLinkDetails = functions.https.onRequest(async (req, res) => {
    try {

        const validateSchema = () =>
            joi.object({
                invitationId: joi.string().required()
            }).required();

        const { invitationId } = mustValidate(validateSchema(), req.body);



        const linkInfoDB = config.getLinkInfoDb();

        var result = await (await linkInfoDB.child(invitationId).get()).val();
        const usersDb = config.getUsersDb();
        if (result.isUsed === true) {
            handleResponse(req, res, { status: "error", "msg": "Link Already Used" }, 404)
            return 
        }
        var doesUserExist = await (await usersDb.child(result.inviterId).get()).val();

        if (doesUserExist === null) {

            handleResponse(req, res, { status: "error", "msg": "user not found" }, 401)
            return
        }


        handleResponse(req, res, { from: doesUserExist.name })
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
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
        const usersDb = config.getUsersDb();
        var doesUserExist = await (await usersDb.child(invitedId).get()).val();
        if (doesUserExist === null) {
            handleResponse(req, res, { status: "error", "msg": "user not found" }, 401)
            return
        }

        const linkInfoDB = config.getLinkInfoDb();
        var linkInfo = await (await linkInfoDB.child(invitationId).get()).val()
        if (linkInfo === null) {
            handleResponse(req, res, { status: "error", "msg": "Invitation not found" }, 404)
            return 
        }
        if (linkInfo.isUsed === true) {
            handleResponse(req, res, { status: "error", "msg":"Link already used" }, 404)
            return
        }


        linkInfo = {
            isUsed: true,
            invitedId: invitedId

        }
        var result = await linkInfoDB.child(invitationId).update(linkInfo);

        handleResponse(req, res, { result: "successful" })
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
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
        const usersDb = config.getUsersDb();
        const familyDb = config.getFamiliesDb();

        var userExists = await (await usersDb.child(userId).get()).val();
        var familyMemberExists = await (await usersDb.child(familyMemberId).get()).val();

        if (userExists === null || familyMemberExists === null) {

            handleResponse(req, res, { status: "error", "msg": "user not found" }, 401)
            return
        }

        var family = {
            usersId: userId,
            familyMemberId: familyMemberId,
            relation: relation
        }
        var result = await familyDb.push(family).getKey();

        handleResponse(req, res, { familyId, result });

    } catch (err) {
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})

//admin 

exports.getUsersList = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                page: joi.number().required(),
                itemsPerPage: joi.number().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { page, itemsPerPage, uid, token } = mustValidate(validateSchema(), req.body)
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return 
        }

        const usersDb = config.getUsersDb()
        var users = await (await usersDb.orderByKey().get()).val();
        users = Object.entries(users)
        var startAt = page * itemsPerPage
        var endAt = startAt + itemsPerPage
        users = users.slice(startAt, endAt)
        handleResponse(req, res, users)
    } catch (err) {
        logger.log(err);

        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);

    }
})



