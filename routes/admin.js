const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Middleware para proteger rutas de admin
router.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
});

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Dashboard de admin
router.get('/dashboard', (req, res) => {
    const empleados = require('../data/empleados.json');
    res.render('admin/dashboard', { empleados });
});

// Subir archivo Excel
router.get('/upload', (req, res) => {
    res.render('admin/upload');
});

router.post('/upload', upload.single('excelFile'), (req, res) => {
    if (!req.file) {
        return res.redirect('/admin/upload?error=1');
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Procesar datos y guardar en empleados.json
        const empleados = jsonData.map(emp => ({
            id: emp.ID || Date.now(),
            nombre: emp.NOMBRE || '',
            cedula: emp.CEDULA || '',
            fechaIngreso: emp.FECHA_INGRESO || '',
            cargo: emp.CARGO || '',
            sede: emp.SEDE || '',
            sueldoBasico: emp.SUELDO_BASICO || 0,
            primaHijos: emp.PRIMA_HIJOS || 0,
            primaProfesionalizacion: emp.PRIMA_PROFESIONALIZACION || 0,
            primaAntiguedad: emp.PRIMA_ANTIGUEDAD || 0,
            primaAsistencial: emp.PRIMA_ASISTENCIAL || 0,
            primaTrabajadores: emp.PRIMA_TRABAJADORES || 0,
            bonoAlimentacion: emp.BONO_ALIMENTACION || 0
        }));

        fs.writeFileSync('./data/empleados.json', JSON.stringify(empleados, null, 2));
        res.redirect('/admin/dashboard?success=1');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/upload?error=2');
    }
});

// Verificar constancia
router.post('/verificar-constancia', (req, res) => {
    const { codigo } = req.body;
    const constancias = require('../data/constancias.json') || [];
    const constancia = constancias.find(c => c.codigo === codigo);
    
    if (constancia) {
        res.json({ 
            valida: true, 
            datos: constancia 
        });
    } else {
        res.json({ 
            valida: false 
        });
    }
});

module.exports = router;