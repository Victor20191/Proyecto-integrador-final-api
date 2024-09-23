require('dotenv').config({ path: '../.env' });
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 4001;

// Middleware
app.use(cors({
  origin: 'http://localhost:4200' 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    options: {
      encrypt: true, 
      trustServerCertificate: true 
    }
};

//Consulta areas de captura
app.get('/api/area', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT id_area, area FROM areas_lecturas_qr`;
    res.json(result.recordset);
  } catch (err) {
    console.error('Error en /api/area:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    await sql.close();
  }
});

//Consulta areas de VihiculosQr
app.get('/api/vehiculos', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT id, placa FROM vehiculos_qr`
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    res.status(500).send('Error en el servidor');
  } finally {
    await sql.close();
  }
});

// Ruta de consulta lecturas
app.get('/api/reporte', async (req, res) => {
  const userId = req.query.userId;
  const userRole = req.query.userRole;

  try {
    await sql.connect(config);
    let query = 'SELECT * FROM vw_ReporteQR';
    let request = new sql.Request();

    if (userRole !== 'Administrador') {
      query += ' WHERE id_usuario = @userId';
      request.input('userId', sql.Int, parseInt(userId));
    }

    const result = await request.query(query);
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
    const result = await sql.query` SELECT u.*, r.nombre_rol 
      FROM usuarios_qr u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = ${user}`;

    if (result.recordset.length > 0) {
      const userData = result.recordset[0];
      if (userData.contrasena === password) { 
        const { contrasena, ...userInfo } = userData;
        res.json({ success: true, message: 'Login exitoso', user: userInfo });
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
  const datos = Array.isArray(req.body) ? req.body : [req.body];
  let connection;
  try {
    connection = await sql.connect(config);
    
    const resultados = [];
    for (const item of datos) {
      
      if (!item.area_captura || !item.id_usuario) {
        throw new Error('area_captura e id_usuario son requeridos');
      }
      
      const result = await sql.query`
        INSERT INTO qr_registro (area_captura, vehiculo, lectura, id_usuario) 
        VALUES (${item.area_captura}, ${item.vehiculo || ''}, ${item.lectura}, ${item.id_usuario})
      `;
      resultados.push(result);
    }
    
    res.status(200).json({
      message: 'Datos insertados correctamente',
      count: resultados.length,
      results: resultados
    });
  } catch (err) {
    console.error('Error detallado:', err); 
    res.status(500).json({
      error: err.message || 'Error del servidor',
      details: err.toString()
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});