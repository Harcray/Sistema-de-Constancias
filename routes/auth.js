const express = require('express');
const router = express.Router();

// Middleware para pasar el usuario a las vistas
router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Usuarios de ejemplo (en producción usar base de datos)
const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'usuario1', password: 'user123', role: 'user', cedula: '12345678' }
];

// Login
router.get('/login', (req, res) => {
    res.render('auth/login', { 
        error: req.query.error 
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user;
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/user/dashboard');
        }
    }
    res.redirect('/login?error=1');
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
        }
        res.redirect('/login');
    });
});

// Ruta raíz
router.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/user/dashboard');
        }
    }
    res.redirect('/login');
});

module.exports = router;