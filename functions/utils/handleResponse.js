const handleResponse = (res,body,status=200)=>{
     res.status(status).send(body);
}
module.exports = handleResponse;