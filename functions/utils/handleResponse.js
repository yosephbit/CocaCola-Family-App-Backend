const handleResponse = (req,res,body,status=200)=>{    
     
     res.set('Access-Control-Allow-Origin', '*');

       // Send response to OPTIONS requests
       res.set('Access-Control-Allow-Methods', '*');
       res.set('Access-Control-Allow-Headers', '*');
       res.set('Access-Control-Max-Age', '3600');
     if (req.method === 'OPTIONS') {
       res.status(204).send('');
     } else {
          res.status(status).send(body);
     }
     
}
module.exports = handleResponse;
