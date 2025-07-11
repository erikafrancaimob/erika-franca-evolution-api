// index.js
require('dotenv').config();
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// auth: WhatsApp
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
let sock;

// Supabase Client
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;
const supabase       = createClient(SUPABASE_URL, SUPABASE_KEY);

// Express App
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Função para iniciar a conexão WhatsApp
async function startSock() {
  sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) {
      console.log('📲 Novo QR gerado. Acesse /qr para visualizar no navegador.');
      qrcode.generate(qr, { small: true });
      // opcional: armazenar qr para rota /qr
      fs.writeFileSync('./last_qr.txt', qr);
    }
    if (connection === 'open') console.log('✅ Conectado ao WhatsApp!');
    if (connection === 'close') {
      console.log('❌ Conexão encerrada. Reiniciando...');
      startSock();
    }
  });
}
startSock();

// Rota raiz
app.get('/', (_req, res) => {
  res.send('🚀 Erika França - API WhatsApp & Imóveis online');
});

// Rota QR para navegador
app.get('/qr', (_req, res) => {
  try {
    const qr = fs.readFileSync('./last_qr.txt', 'utf8');
    res.set('Content-Type', 'text/plain');
    res.send(qrcode.generate(qr, { small: true, output: 'terminal' }));
  } catch {
    res.send('QR code não gerado ainda. Faça redeploy.');
  }
});

// Rota de listagem de imóveis no Supabase
app.get('/imoveis', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('property_code, title, price, images')
      .eq('status', 'disponível')
      .order('property_code', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint para enviar mensagem via WhatsApp
app.post('/send', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message)
    return res.status(400).send('number e message são obrigatórios');

  try {
    await sock.sendMessage(number + '@s.whatsapp.net', { text: message });
    return res.send('Mensagem enviada com sucesso!');
  } catch (err) {
    return res.status(500).send('Erro ao enviar mensagem: ' + err.message);
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🟢 API rodando na porta ${PORT}`);
});
