const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let sock;
let lastQR = '';

async function startSock() {
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveState);
    sock.ev.on('connection.update', ({ connection, qr }) => {
        if (qr) {
            lastQR = qr;
            console.log("📲 Novo QR gerado.");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') console.log('✅ Conectado ao WhatsApp com sucesso!');
        if (connection === 'close') {
            console.log('❌ Conexão encerrada.');
            lastQR = '';
            startSock();
        }
    });
}

startSock();

app.get('/', (req, res) => res.send('🚀 Erika França - API WhatsApp online'));

// Endpoint para visualizar QR code no navegador
app.get('/qr', (req, res) => {
    if (!lastQR) return res.send('QR code não gerado ainda. Faça redeploy.');
    const qrStr = qrcode.generate(lastQR, { small: true, output: 'terminal' });
    res.set('Content-Type', 'text/plain');
    res.send(qrStr);
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).send("number e message são obrigatórios");
    try {
        await sock.sendMessage(number + "@s.whatsapp.net", { text: message });
        res.send("Mensagem enviada com sucesso!");
    } catch (err) {
        res.status(500).send("Erro ao enviar mensagem: " + err.message);
    }
});

app.listen(PORT, () => console.log(`🟢 API rodando na porta ${PORT}`));