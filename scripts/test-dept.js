const IMS_API_KEY = process.env.IMS_API_KEY;
fetch('http://localhost:4001/api/v1/integrations/departments',{
  method:'POST',
  headers:{'Content-Type':'application/json','x-api-key':IMS_API_KEY},
  body:JSON.stringify({source:'test',items:[{code:'FIN',name:'Finance Office'}],options:{mode:'upsert'}})
}).then(r=>r.json()).then(console.log).catch(e=>console.error(e));
