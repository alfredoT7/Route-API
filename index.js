const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const { env } = require('process');
const app = express();

app.use(express.json()); // Middleware para procesar JSON en las solicitudes

// Configuración de multer para manejar la subida de archivos
const upload = multer({ dest: 'uploads/' });

// Definir el esquema de Mongoose con un `id` proporcionado por el usuario
const routeSchema = new mongoose.Schema({
    id: {
        type: String, // El tipo será String, como mencionaste
        required: true,
        unique: true // Asegúrate de que sea único en la base de datos
    },
    type: {
        type: String,
        required: true
    },
    features: {
        type: Array,
        required: true
    }
});

const Route = mongoose.model('Route', routeSchema);

// Conectar a la base de datos MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Conectado a la base de datos');
    })
    .catch(() => {
        console.log('Error al conectar a la base de datos');
    });

// Endpoint para subir y guardar archivos .geojson con un id personalizado
app.post('/upload', upload.single('geojson'), async (req, res) => {
    try {
        // Leer el archivo .geojson
        const geojsonData = fs.readFileSync(req.file.path, 'utf-8');
        const geojson = JSON.parse(geojsonData);

        // Obtener el id del cuerpo de la solicitud
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'El campo "id" es obligatorio' });
        }

        // Guardar los datos en la base de datos con el `id` proporcionado por el cliente
        const newRoute = new Route({ id, ...geojson });
        await newRoute.save();

        // Eliminar el archivo subido temporalmente
        fs.unlinkSync(req.file.path);

        res.status(201).json({ message: 'Archivo GeoJSON subido y guardado con éxito', id });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el archivo GeoJSON o al guardar en la base de datos', details: error.message });
    }
});

// Endpoint para obtener todas las rutas desde la base de datos
app.get('/routes', async (req, res) => {
    try {
        const routes = await Route.find();
        res.status(200).json(routes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las rutas desde la base de datos' });
    }
});

app.get('/routes/:id', async (req, res) => {
    try {
        const { id } = req.params; // Extraer el id de los parámetros de la URL
        const route = await Route.findOne({ id });
        if (!route) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
        res.status(200).json(route);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar la ruta', details: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});