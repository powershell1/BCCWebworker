import express from 'express';
import expressWs from 'express-ws';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

// routes
import login from './http_modules/client_side/login.js';
import devices from './http_modules/device_side/devices.js';

const app = express();
expressWs(app);
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/login', login);
app.use('/devices', devices);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(80, () => {
    console.log("Server has started on port 80!");
});