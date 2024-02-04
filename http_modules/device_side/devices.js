import express from 'express';
import expressWs from 'express-ws';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { createHmac } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

global.devices = {};

const router = express.Router();
expressWs(router);
const client = new MongoClient(process.env.MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});

client.connect();

async function getIoTDatabases() {
    const databases = await client.db('IoT')
        .collection('IoTList');
    return databases;
}

function sendDeviceState(session, find, state) {
    if (!global.sessions[session]) { return; }
    global.sessions[session].forEach(ws => {
        ws.send(JSON.stringify({
            type: `device_${state ? "online" : "offline"}`,
            name: find.name,
            serial: find._id
        }));
    });
}

function sendApplicationSignal(session, state) {
    if (!global.sessions[session]) { return; }
    global.sessions[session].forEach(ws => {
        ws.send(state);
    });
}

router.ws('/', async (ws, req) => {
    const { serial, password } = req.headers;
    if (!serial || !password) { return ws.terminate(); }
    const passwordHash = createHmac('sha256', process.env.PASSWORD_HASH_KEY);
    const IoTDatabases = await getIoTDatabases();
    const find = await IoTDatabases.findOne({
        _id: new ObjectId(serial),
        password: passwordHash.update(password).digest('hex')
    });
    if (!find) { return ws.terminate(); }
    const session = find.paired;
    sendDeviceState(session, find, true);
    if (!global.devices[session]) {
        global.devices[session] = {};
    }
    if (global.devices[session][serial]) { return ws.terminate(); }
    global.devices[session][serial] = ws;
    ws.on('close', () => {
        sendDeviceState(session, find, false);
        delete global.devices[session][serial];
        if (Object.keys(global.devices[session]).length === 0) {
            delete global.devices[session];
        }
    });
    var lastPing = Date.now();
    ws.on('message', (msg) => {
        if (msg === 'ping') {
            lastPing = Date.now();
            return
        }
        sendApplicationSignal(session, msg);
    });
    const interval = setInterval(() => {
        if (Date.now() - lastPing > 5000) {
            ws.terminate();
            clearInterval(interval);
        }
    }, 1000);
});

export default router;