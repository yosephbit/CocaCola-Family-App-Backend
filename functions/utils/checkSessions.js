const { logger } = require('firebase-functions/v1')
const config =require('./config')
const ErrorWithDetail =require('./ErrorWithDetail')
const checkSessions = async (token, uid)=>{    
    const sessionsDb=config.getSessionsDb()
    const session = await (await sessionsDb.child(token).get()).val()
    if(session === null) return false 
    else if (session.ttl < Date.now()) return false
    else if (uid !== session.uid) return false
    else return true
}
module.exports = checkSessions;
