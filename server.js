const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('API da Erika França Imobiliária está online 🏡✨');
});

// Rota exemplo para IA futuramente
app.post('/mensagem', (req, res) => {
  const { pergunta } = req.body;
  res.json({ resposta: `Recebi sua pergunta: "${pergunta}". Em breve, a IA responderá com empatia.` });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});