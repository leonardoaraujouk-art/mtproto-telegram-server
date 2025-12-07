const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/api/auth', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.connect();
    
    const { phoneCodeHash } = await client.sendCode({
      apiId,
      apiHash,
    }, phoneNumber);
    
    res.json({
      success: true,
      phoneCodeHash,
      session: stringSession.save()
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { phoneNumber, phoneCode, phoneCodeHash, session } = req.body;
    
    const stringSession = new StringSession(session);
    const client = new TelegramClient(stringSession, apiId, apiHash, {});
    
    await client.connect();
    await client.signIn({
      phoneNumber,
      phoneCode,
      phoneCodeHash
    });
    
    const fullSession = client.session.save();
    
    await supabase
      .from('telegram_sessions')
      .insert([{ 
        phone_number: phoneNumber, 
        session: fullSession 
      }]);
    
    res.json({ 
      success: true, 
      session: fullSession 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'MTProto Server' });
});

app.get('/', (req, res) => {
  res.json({ message: 'MTProto Telegram Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MTProto Server running on port ${PORT}`);
});
