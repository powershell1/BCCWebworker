import express from 'express';
import expressWs from 'express-ws';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

// routes
import login from './http_modules/client_side/login.js';
import users from './http_modules/client_side/users.js';
import devices from './http_modules/device_side/devices.js';

const app = express();
expressWs(app);
app.use(bodyParser.urlencoded({ extended: true }));

app.ws('/', (ws, req) => {
    ws.send('pong');
});

app.use('/login', login);
app.use('/devices', devices);
app.use('/users', devices);

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(80, () => {
    console.log("Server has started on port 80!");
});