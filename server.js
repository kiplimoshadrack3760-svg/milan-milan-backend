const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '174379';
const PASSKEY = process.env.PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK_URL = 'https://milan-milan-backend.onrender.com/callback';

async function getToken(){
  try{
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    console.log('Requesting token with key:', CONSUMER_KEY ? CONSUMER_KEY.substring(0,8)+'...' : 'NOT SET');
    const res = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { 
        headers: { Authorization: `Basic ${auth}` },
        timeout: 15000
      }
    );
    console.log('Token obtained successfully:', res.data.access_token ? 'YES' : 'NO');
    return res.data.access_token;
  }catch(err){
    console.error('Token error status:', err.response ? err.response.status : 'NO RESPONSE');
    console.error('Token error data:', err.response ? JSON.stringify(err.response.data) : err.message);
    console.error('Token error code:', err.code);
    throw new Error('Token failed: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
}

app.post('/pay', async(req, res)=>{
  try{
    const { phone, amount } = req.body;

    // Format timestamp as YYYYMMDDHHmmss
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0') +
      String(now.getHours()).padStart(2,'0') +
      String(now.getMinutes()).padStart(2,'0') +
      String(now.getSeconds()).padStart(2,'0');

    // Generate password
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    // Format phone — ensure it starts with 254
    const formattedPhone = '254' + phone.replace(/^0/, '').replace(/^\+254/, '').replace(/^254/, '');

    // Get token
    const token = await getToken();

    // STK Push
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: 'Milan Accessories',
        TransactionDesc: 'Payment for order'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true, data: response.data });

  }catch(err){
    const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('M-Pesa error:', errMsg);
    console.error('Consumer Key:', CONSUMER_KEY ? CONSUMER_KEY.substring(0,10)+'...' : 'NOT SET');
    console.error('Shortcode:', SHORTCODE);
    console.error('Passkey set:', PASSKEY ? 'YES' : 'NO');
    res.status(500).json({
      success: false,
      error: errMsg
    });
  }
});

app.post('/callback', (req, res)=>{
  console.log('M-Pesa callback:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.get('/', (req, res) => res.send('Milan Accessories M-Pesa Backend is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
