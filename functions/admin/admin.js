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
const { now } = require("lodash");
const checkSessions = require("../utils/checkSessions");
exports.addAdmin = functions.https.onRequest(async (req, res) => {
    try {

        const validateSchema = () =>
            joi.object({
                username: joi.string().required(),
                password: joi.string().required(),
                uid: joi.string().required(),
                token: joi.string().required()
            }).required()

        const { username, password, uid, token } = mustValidate(validateSchema(), req.body);

        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }

        const adminUsersDb = config.getAdminUsersDb();

        var adminExists = false;

        await adminUsersDb.orderByChild("username").equalTo(username).once("value", snapshot => {
            if (snapshot.exists()) {
                adminExists = true;
                return
            }
        })

        if (adminExists) {
            handleResponse(req, res, { status: "error", "msg": "Invalid Data Username already toekn" }, 401)
            return
        }
        var admin = {
            username: username,
            password: password
        }
        var result = await adminUsersDb.push(admin).getKey();
        handleResponse(req, res, { "username": admin.username });
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)

    }

}
)
exports.adminLogin = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                username: joi.string().required(),
                password: joi.string().required()
            }).required()

        const { username, password } = mustValidate(validateSchema(), req.body);

        const adminUsersDb = config.getAdminUsersDb();
        const sessionsDb = config.getSessionsDb();


        var admin = null;

        await adminUsersDb.orderByChild("username").equalTo(username).once("value", snapshot => {
            if (snapshot.exists()) {
                admin = (snapshot.val());
                return
            }
        })
        if (admin === null) {
            handleResponse(req, res, { status: "error", "msg": "username or passowrd not found" }, 402)
            return 
        }
        admin = JSON.parse(JSON.stringify(admin));
        var catchedPassword = Object.values(admin)[0]?.password
        if (catchedPassword !== password) {
            handleResponse(req, res, { status: "error", "msg": "username or password not found" }, 402)
            return
        }
        var dt = new Date()
        var ttl = dt.setHours(dt.getHours() + 24) //session valid for three hours
        newSession = {
            uid: Object.keys(admin)[0],
            ttl: ttl
        }
        var result = await sessionsDb.push(newSession).getKey()
        handleResponse(req, res, {"token": result, "user": newSession.uid})

    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500)
    }
})

exports.adminLinkList = functions.https.onRequest(async (req, res) => {
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
        const linkInfoDB = config.getLinkInfoDb()
        var links = await (await linkInfoDB.orderByKey().get()).val();
        links = Object.entries(links)
        var startAt = page * itemsPerPage
        var endAt = startAt + itemsPerPage
        total_links = links.length
        links = links.slice(startAt, endAt)
        handleResponse(req, res, { links: links, total_links: total_links })
    } catch (err) {
        logger.log(err);
        handleResponse(req, res, { status: "error", "msg": err.msg ? { detail: err.message } : err }, 500);
    }
})

exports.getDashBoardStats = functions.https.onRequest(async (req, res) => {
    try {
        const validateSchema = () =>
            joi.object({
                uid: joi.string().required(),
                token: joi.string().required()
            }).required();
        const { uid, token } = mustValidate(validateSchema(), req.body)
        const session = await checkSessions(token, uid);
        if (!session) {
            handleResponse(req, res, { status: "error", "msg": "Session Expired" }, 401)
            return
        }
        const linksDb = config.getLinkInfoDb();
        const usersDb = config.getUsersDb();
        const challengesInstanceDb = config.getChallengeInstancesDb();

        let  no_users, no_challenges, no_links, no_clicked_links ;
        await usersDb.once("value", snapshot => {
           no_users= snapshot.numChildren();
        })
        await linksDb.once("value", snapshot => {
            no_links= snapshot.numChildren();
        })
        await challengesInstanceDb.once("value", snapshot => {
            no_challenges= snapshot.numChildren()
        })

        await linksDb.orderByChild("isUsed").equalTo(true).once("value", snapshot => {
            no_clicked_links=snapshot.numChildren()
        })
        handleResponse(req, res, {"noUsers": no_users, "noChallenges": no_challenges, "noLinks" : no_links, "noClickedLinks" : no_clicked_links});
    } catch (err) {
        logger.log(err)
        handleResponse(req, res, { status: "error", "msg": err.msg ? {detail: err.message } : err }, 500)
        
    }

})