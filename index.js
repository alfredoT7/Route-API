const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

app.use(express.json());

// Configuración de multer para manejar la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Definir el esquema de Mongoose
const routeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
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

// Conexión a MongoDB
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    const client = await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    cachedDb = client.connection.db;
    return cachedDb;
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Endpoint para subir y guardar archivos .geojson con un id personalizado
app.post('/upload', upload.single('geojson'), async (req, res) => {
    try {
        await connectToDatabase();
        
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }

        const geojsonData = req.file.buffer.toString('utf-8');
        const geojson = JSON.parse(geojsonData);
        
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'El campo "id" es obligatorio' });
        }
        
        const newRoute = new Route({ id, ...geojson });
        await newRoute.save();
        
        res.status(201).json({ message: 'Archivo GeoJSON subido y guardado con éxito', id });
    } catch (error) {
        console.error('Error en /upload:', error);
        res.status(500).json({ error: 'Error al procesar el archivo GeoJSON o al guardar en la base de datos', details: error.message });
    }
});

// Endpoint para obtener todas las rutas desde la base de datos
app.get('/routes', async (req, res) => {
    try {
        await connectToDatabase();
        const routes = await Route.find();
        res.status(200).json(routes);
    } catch (error) {
        console.error('Error en /routes:', error);
        res.status(500).json({ error: 'Error al obtener las rutas desde la base de datos' });
    }
});

app.get('/routes/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const route = await Route.findOne({ id });
        if (!route) {
            return res.status(404).json({ error: 'Ruta no encontrada' });
        }
        res.status(200).json(route);
    } catch (error) {
        console.error('Error en /routes/:id:', error);
        res.status(500).json({ error: 'Error al buscar la ruta', details: error.message });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Solo para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app;