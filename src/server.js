require('dotenv').config({ path: '../.env' });
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 4001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const config = {
    user: process.env.DB_USER || 'tu_usuario',
    password: process.env.DB_PASSWORD || 'tu_contraseña',
    server: process.env.DB_SERVER || 'tu_servidor', 
    database: process.env.DB_DATABASE || 'tu_base_de_datos',
    options: {
      encrypt: true, 
      trustServerCertificate: true 
    }
};

// Ruta de areas
app.get('/api/reporte', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM qr_registro`;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error del servidor');
  } finally {
    await sql.close();
  }
});



//Login usuarios
app.post('/api/login', async (req, res) => {
  const { user, password } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM usuarios_qr WHERE usuario = ${user}`;

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      if (user.contrasena === password) { // Nota: Esto no es seguro para producción
        res.json({ success: true, message: 'Login exitoso' });
      } else {
        res.json({ success: false, message: 'Contraseña incorrecta' });
      }
    } else {
      res.json({ success: false, message: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  } finally {
    await sql.close();
  }
});

// Ruta para insertar datos
app.post('/api/insertar', async (req, res) => {
  console.log('Datos recibidos:', req.body);  // Log de los datos recibidos

  // Verificar si req.body es un array
  const datos = Array.isArray(req.body) ? req.body : [req.body];

  try {
    await sql.connect(config);
    
    for (const item of datos) {
      if (!item.area_captura) {
        throw new Error('area_captura es requerido');
      }

      const result = await sql.query`
        INSERT INTO qr_registro (area_captura, vehiculo, lectura) 
        VALUES (${item.area_captura}, ${item.vehiculo || ''}, ${item.lectura})
      `;
      console.log('Inserción exitosa:', result);
    }

    res.status(200).json({ message: 'Datos insertados correctamente' });
  } catch (err) {
    console.error('Error en la inserción:', err);
    res.status(500).json({ error: err.message || 'Error del servidor' });
  } finally {
    if (sql.connected) {
      await sql.close();
    }
  }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});