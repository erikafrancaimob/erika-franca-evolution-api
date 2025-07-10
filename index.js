const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let sock;

async function startSock() {
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("📲 QR Code para conectar:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp com sucesso!');
        } else if (connection === 'close') {
            console.log('❌ Conexão encerrada.');
            startSock();
        }
    });
}

startSock();

app.get("/", (req, res) => {
    res.send("🚀 Erika França - API WhatsApp online");
});

app.post("/send", async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).send("number e message são obrigatórios");

    try {
        await sock.sendMessage(number + "@s.whatsapp.net", { text: message });
        res.send("Mensagem enviada com sucesso!");
    } catch (err) {
        res.status(500).send("Erro ao enviar mensagem: " + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`🟢 API rodando na porta ${PORT}`);
});