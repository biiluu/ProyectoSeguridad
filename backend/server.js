const express = require('express');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5048;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/verificacion', require('./routes/verificacionRoutes'));
app.use('/api/usuarios', require('./routes/registroRoutes'));
app.use('/api/usuarios', require('./routes/sesionRoutes'));
app.use(express.static(require('node:path').join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'MercaUca API - Proyecto SED',
    database: 'MySQL 8',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`MercaUca API disponible en http://localhost:${port}`);
});
