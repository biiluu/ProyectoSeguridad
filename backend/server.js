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
app.use(['/api/productos', '/api/Productos'], require('./routes/productosRoutes'));
app.use(['/api/novedades', '/api/Novedades'], require('./routes/novedadesRoutes'));
app.use(['/api/search', '/api/Search'], require('./routes/searchRoutes'));
app.use('/api/usuarios', require('./routes/sesionRoutes'));
app.use('/api/carrito', require('./routes/carritoRoutes'));
app.use('/api/carrito', require('./routes/carritoRoutes'));
app.use('/api/admin/usuarios', require('./routes/adminUsuariosRoutes'));
app.use('/api/admin/productos', require('./routes/adminProductosRoutes'));
app.use(express.static(require('node:path').join(__dirname, '../frontend')));
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
