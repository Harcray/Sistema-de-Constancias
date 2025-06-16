const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Middleware para proteger rutas de usuario
router.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'user') {
        next();
    } else {
        res.redirect('/login');
    }
});

// Dashboard de usuario
router.get('/dashboard', (req, res) => {
    const empleados = require('../data/empleados.json');
    const usuario = empleados.find(e => e.cedula === req.session.user.cedula);
    res.render('user/dashboard', { usuario });
});

// Generar constancia
router.get('/constancia', (req, res) => {
    const empleados = require('../data/empleados.json');
    const usuario = empleados.find(e => e.cedula === req.session.user.cedula);
    
    if (!usuario) {
        return res.redirect('/user/dashboard?error=1');
    }

    // Generar código único
    const codigo = 'CONST-' + Date.now().toString(36).toUpperCase();
    
    // Calcular total mensual
    const totalMensual = usuario.sueldoBasico + usuario.primaHijos + 
                         usuario.primaProfesionalizacion + usuario.primaAntiguedad + 
                         usuario.primaAsistencial + usuario.primaTrabajadores;

    // Crear objeto de constancia
    const constancia = {
        codigo,
        fechaGeneracion: new Date().toLocaleDateString('es-VE'),
        usuario: {
            nombre: usuario.nombre,
            cedula: usuario.cedula,
            cargo: usuario.cargo,
            sede: usuario.sede
        },
        datosLaborales: {
            fechaIngreso: usuario.fechaIngreso,
            sueldoBasico: usuario.sueldoBasico,
            primaHijos: usuario.primaHijos,
            primaProfesionalizacion: usuario.primaProfesionalizacion,
            primaAntiguedad: usuario.primaAntiguedad,
            primaAsistencial: usuario.primaAsistencial,
            primaTrabajadores: usuario.primaTrabajadores,
            totalMensual,
            bonoAlimentacion: usuario.bonoAlimentacion
        }
    };

    // Guardar constancia
    let constancias = [];
    try {
        constancias = require('../data/constancias.json');
    } catch (e) {
        console.log('Creando nuevo archivo de constancias');
    }
    
    constancias.push(constancia);
    fs.writeFileSync('./data/constancias.json', JSON.stringify(constancias, null, 2));

    res.render('user/constancia', { 
        constancia,
        fechaActual: new Date().toLocaleDateString('es-VE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    });
});

module.exports = router;    