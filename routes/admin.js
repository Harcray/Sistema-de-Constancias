const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');

// Middleware para proteger rutas de admin
router.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login');
});

// Configuración de Multer con validación
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Crear directorio si no existe
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Función para cargar empleados con manejo de errores
function loadEmployees() {
    try {
        const data = fs.readFileSync('./data/empleados.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        return [];
    }
}

// Función para guardar empleados
function saveEmployees(employees) {
    try {
        fs.writeFileSync(
            './data/empleados.json',
            JSON.stringify(employees, null, 2),
            'utf8'
        );
        return true;
    } catch (error) {
        console.error('Error al guardar empleados:', error);
        return false;
    }
}

// Dashboard de admin
router.get('/dashboard', (req, res) => {
    const empleados = loadEmployees();
    res.render('admin/dashboard', { 
        empleados,
        success: req.query.success,
        error: req.query.error
    });
});

// Subir archivo Excel
router.get('/upload', (req, res) => {
    res.render('admin/upload', { 
        error: req.query.error,
        success: req.query.success 
    });
});

router.post('/upload', upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.redirect('/admin/upload?error=no_file');
    }

    try {
        // 1. Leer archivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.redirect('/admin/upload?error=empty_file');
        }
        
        // 2. Validar campos obligatorios
        const requiredFields = ['CEDULA', 'NOMBRE', 'CARGO', 'SUELDO_BASICO'];
        const isValid = jsonData.every(emp => 
            requiredFields.every(field => emp[field] !== undefined && emp[field] !== '')
        );
        
        if (!isValid) {
            fs.unlinkSync(req.file.path);
            return res.redirect('/admin/upload?error=missing_fields');
        }

        // 3. Cargar empleados existentes
        const existingEmployees = loadEmployees();
        
        // 4. Procesar datos del Excel
        const updatedEmployees = [...existingEmployees];
        let newEmployeesCount = 0;
        let updatedEmployeesCount = 0;

        jsonData.forEach(newEmp => {
            // Buscar si el empleado ya existe (por cédula)
            const existingIndex = existingEmployees.findIndex(
                emp => emp.cedula === newEmp.CEDULA.toString().trim()
            );

            const employeeData = {
                id: newEmp.ID || uuidv4(),
                nombre: newEmp.NOMBRE?.toString().trim() || '',
                cedula: newEmp.CEDULA?.toString().trim() || '',
                fechaIngreso: newEmp.FECHA_INGRESO || '',
                cargo: newEmp.CARGO?.toString().trim() || '',
                sede: newEmp.SEDE?.toString().trim() || '',
                sueldoBasico: Number(newEmp.SUELDO_BASICO) || 0,
                primaHijos: Number(newEmp.PRIMA_HIJOS) || 0,
                primaProfesionalizacion: Number(newEmp.PRIMA_PROFESIONALIZACION) || 0,
                primaAntiguedad: Number(newEmp.PRIMA_ANTIGUEDAD) || 0,
                primaAsistencial: Number(newEmp.PRIMA_ASISTENCIAL) || 0,
                primaTrabajadores: Number(newEmp.PRIMA_TRABAJADORES) || 0,
                bonoAlimentacion: Number(newEmp.BONO_ALIMENTACION) || 0
            };

            if (existingIndex !== -1) {
                // Actualizar empleado existente (conservando el ID original)
                employeeData.id = existingEmployees[existingIndex].id;
                updatedEmployees[existingIndex] = employeeData;
                updatedEmployeesCount++;
            } else {
                // Añadir nuevo empleado
                updatedEmployees.push(employeeData);
                newEmployeesCount++;
            }
        });

        // 5. Guardar los cambios
        const saveResult = saveEmployees(updatedEmployees);
        
        if (!saveResult) {
            throw new Error('Error al guardar los empleados');
        }

        // 6. Eliminar archivo temporal
        fs.unlinkSync(req.file.path);
        
        // 7. Redirigir con estadísticas
        res.redirect(`/admin/dashboard?success=upload_ok&new=${newEmployeesCount}&updated=${updatedEmployeesCount}`);
    } catch (error) {
        console.error('Error al procesar Excel:', error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        let errorCode = 'processing_error';
        if (error.message.includes('formato')) errorCode = 'invalid_format';
        
        res.redirect(`/admin/upload?error=${errorCode}`);
    }
});

// Verificar constancia
router.post('/verificar-constancia', (req, res) => {
    try {
        const { codigo } = req.body;
        const constancias = require('../data/constancias.json') || [];
        const constancia = constancias.find(c => c.codigo === codigo);
        
        res.json({ 
            valida: !!constancia,
            datos: constancia || null
        });
    } catch (error) {
        console.error('Error al verificar constancia:', error);
        res.status(500).json({ 
            valida: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;