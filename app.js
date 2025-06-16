require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();

// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Cambiar a true en producción con HTTPS
}));

// Rutas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

// Base de datos temporal (empleados.json)
let empleados = require('./data/empleados.json');
let constanciasGeneradas = [];

// Guardar datos en el JSON
function saveData() {
    fs.writeFileSync('./data/empleados.json', JSON.stringify(empleados, null, 2));
}

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});