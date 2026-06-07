const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '174379';
const PASSKEY = process.env.PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;
async function getToken(){
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{
    headers:{Authorization:`Basic ${auth}`}
  });
  return res.data.access_token;
}

app.post('/pay', async(req,res)=>{
  try{
    const {phone, amount} = req.body;
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
    const formattedPhone = '254'+phone.replace(/^0/,'').replace(/^\+254/,'');
    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',{
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: 'Milan Accessories',
      TransactionDesc: 'Payment for order'
    },{headers:{Authorization:`Bearer ${token}`}});
    res.json({success:true, data:response.data});
  }catch(err){
    res.status(500).json({success:false, error:err.message});
  }
});

app.post('/callback', (req,res)=>{
  console.log('M-Pesa callback:', JSON.stringify(req.body));
  res.json({ResultCode:0, ResultDesc:'Success'});
});

app.get('/', (req,res)=>res.send('Milan Accessories M-Pesa Backend Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
