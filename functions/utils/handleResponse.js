const handleResponse = (req,res,body,status=200)=>{    
     
     res.set('Access-Control-Allow-Origin', '*');

     if (req.method === 'OPTIONS') {
       // Send response to OPTIONS requests
       res.set('Access-Control-Allow-Methods', 'GET');
       res.set('Access-Control-Allow-Headers', 'Content-Type');
       res.set('Access-Control-Max-Age', '3600');
       res.status(204).send('');
     } else {
          res.status(status).send(body);
     }
     
}
module.exports = handleResponse;