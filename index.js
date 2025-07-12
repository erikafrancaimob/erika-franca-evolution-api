require('dotenv').config();
const express = require('express');
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const cors = require('cors');

// Inicialização
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// WhatsApp
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
let sock;
let lastQR = '';

// Conectar WhatsApp
async function startSock() {
  sock = makeWASocket({ auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) {
      lastQR = qr;
      console.log('📲 Novo QR gerado. Acesse /qr');
      fs.writeFileSync('./last_qr.txt', qr);
    }
    if (connection === 'open') console.log('✅ Conectado ao WhatsApp!');
    if (connection === 'close') {
      console.log('❌ Conexão encerrada. Tentando reconectar...');
      startSock();
    }
  });
}
startSock();

// Rota status
app.get("/", (_req, res) => {
  res.send("🚀 API da Erika França Imobiliária online com IA");
});

// Rota QR
app.get("/qr", (_req, res) => {
  try {
    const qr = fs.readFileSync('./last_qr.txt', 'utf8');
    res.set('Content-Type', 'text/plain');
    res.send(qrcode.generate(qr, { small: true, output: 'terminal' }));
  } catch {
    res.send('QR code ainda não gerado. Aguarde ou redeploy.');
  }
});

// Rota imóveis
app.get("/imoveis", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("property_code, title, price, images")
      .eq("status", "disponível")
      .order("property_code", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensagem via WhatsApp
app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).send("Campos 'number' e 'message' são obrigatórios.");
  try {
    await sock.sendMessage(`${number}@s.whatsapp.net`, { text: message });
    res.send("Mensagem enviada com sucesso!");
  } catch (err) {
    res.status(500).send("Erro ao enviar mensagem: " + err.message);
  }
});

// Rota com IA da OpenAI
app.post("/mensagem", async (req, res) => {
  const { pergunta } = req.body;
  if (!pergunta) return res.status(400).json({ erro: "Campo 'pergunta' é obrigatório." });

  try {
    const resposta = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é uma assistente de atendimento humanizado da Imobiliária Erika França. Responda com empatia, simpatia e clareza." },
        { role: "user", content: pergunta }
      ]
    });
    res.json({ resposta: resposta.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao consultar IA: " + err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => console.log(`🟢 Servidor com IA rodando na porta ${PORT}`));