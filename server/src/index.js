const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // needed for Twilio webhook

app.use('/api/auth', require('./routes/auth'));
app.use('/api/family', require('./routes/family'));
app.use('/api/provider', require('./routes/provider'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/biography', require('./routes/biography'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
