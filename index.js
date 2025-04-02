import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; 



const app = express();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});
// Verificar conexión a la base de datos
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error de conexión a la base de datos:', err);
    } else {
        console.log('Conexión a la base de datos establecida correctamente');
        connection.release();
    }
});

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

app.listen(5000, () => {
    console.log('Servidor corriendo en el puerto 4000');
});

//-------------------Images-----------------------------------------------------------



app.put('/imageupdate', upload.single('image'), (req, res) => {
    const { Id } = req.body;
    if (!id || !req.file) {
        return res.status(400).json({ message: 'imagen requerida' });
    }

    const imageUrl = req.file.path;

    db.query('UPDATE users SET image = ? WHERE id = ?', [imageUrl, Id], (err, result) => {
        if (err) {
            console.error('Error al actualizar la imagen:', err);
            return res.status(500).json({ message: 'Error al actualizar la imagen' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json({ message: 'Imagen actualizada exitosamente', imageUrl });
    });
});


//-------------------------------------------------------------------------------------

app.get('/user/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM users WHERE ID = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});


//--------------------------------------------------------------------------------------
app.post('/register', (req, res) => {
    const { name, lastname, email, pass, address, city, birth, phone } = req.body;
    const role = "Creadores";
    if (!email || !pass) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    bcrypt.hash(pass, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error al encriptar la contraseña:', err);
            return res.status(500).json({ message: 'Error al encriptar la contraseña' });
        }
        console.log('Contraseña encriptada:', hashedPassword);

        db.query('INSERT INTO users (usr_role, name, lastname, email, password, address, city, phone, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)', 
        [role, name, lastname, email, hashedPassword, address, city, phone, birth], 
        (err, result) => {
            if (err) {
                console.error('Error al insertar el usuario:', err);
                return res.status(500).json({ message: 'Error al registrar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, pass } = req.body;

    if (!email || !pass) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error al consultar el usuario:', err);
            return res.status(500).json({ message: 'Error al buscar el usuario' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = results[0];

        bcrypt.compare(pass, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error al comparar contraseñas:', err);
                return res.status(500).json({ message: 'Error al comparar las contraseñas' });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Contraseña incorrecta' });
            }

            const token = jwt.sign({ id: user.id, email: user.email }, 'tu_clave_secreta', { expiresIn: '1h' });

            res.status(200).json({
                message: 'Inicio de sesión exitoso',
                token,
                user: { id: user.id }
            });
        });
    });
});


//------------------------------------------------------------------------------------------------------------------------

app.post('/Addartworks', (req, res) => {
    const { id } = req.params;
    const { artwork_type, title, descripcion, image, firstprice, artistid, categoriaid } = req.body;

    if (!title || !firstprice || !artistid || !categoriaid || !image) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const sql = 'INSERT INTO artworks (artwork_type, title, descripcion, image, firstprice, artistid, categoriaid) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [artwork_type, title, descripcion, image, firstprice, artistid, categoriaid], (err, result) => {
        if (err) {
            console.error('Error al insertar el producto:', err);
            return res.status(500).json({ message: 'Error al registrar el producto' });
        }
        res.status(201).json({ message: 'Producto registrado exitosamente', id: result.insertId });
    });
});


app.post('/Addactions', (req, res) => {
    const {artistid,title,currentBid,endedtime,descripcion,image} = req.body;

    if (!title || !currentBid || !artistid || !image || !endedtime || !descripcion) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const sql = 'INSERT INTO auctions (artistid,title,currentBid,endedtime,descripcion,image) VALUES (?,?,?,?,?,?)';
    
    db.query(sql, [artistid,title,currentBid,endedtime,descripcion,image], (err, result) => {
        if (err) {
            console.error('Error al insertar el producto:', err);
            return res.status(500).json({ message: 'Error al registrar el producto' });
        }
        res.status(201).json({ message: 'Producto registrado exitosamente', id: result.insertId });
    });
});


app.get('/artworks', (req, res) => {
    db.query('SELECT * FROM artworks', (err, results) => {
        if (err) {
            console.error('Error al obtener los productos:', err);
            return res.status(500).json({ message: 'Error al obtener los productos' });
        }

        // Convertir la imagen BLOB a Base64
        const artworks = results.map(artwork => {
            let base64Image = artwork.image ? artwork.image.toString('base64') : null;
            if (base64Image) {
                base64Image = `data:image/jpeg;base64,${base64Image}`;
            }

            return {
                ...artwork,
                image: base64Image
            };
        });

        res.status(200).json(artworks);
    });
});

//------------------------------------------------------------------------------------------------------------------------------------------------------

app.get('/products/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM artworks WHERE artistid = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.get('/auctions/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM auctions WHERE artistid = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.get('/products/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM artworks WHERE artistid = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});
app.get('/sales/:id', (req, res) => {
    const { id } = req.params;

    const query=`
    Select d.*, ar.*, at.*
    FROM direct_transaction d
    JOIN artworks ar ON d.artworkId = ar.id
    JOIN users at ON ar.artistId = at.id
    WHERE d.artistid = ?
    `

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});
