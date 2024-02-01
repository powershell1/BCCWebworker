import express from 'express';
import expressWs from 'express-ws';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { createHmac } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

global.sessions = {};

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

function ReutrnError(res, type) {
    if (type === 'invaild_body') {
        res.json({
            code: 400
        });
        return;
    }
}

function ReturnLogin(data) {
    return {
        code: 200,
        username: data.username,
        email: data.email,
        session: data.session
    }
}

function isJsonString(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
}

async function getUserDatabases() {
    const databases = await client.db('Userdata')
        .collection('Infomation');
    return databases;
}

async function getIoTDatabases() {
    const databases = await client.db('IoT')
        .collection('IoTList');
    return databases;
}

router.post('/', async (req, res) => {
    const { username, password } = req.headers;
    if (!username || !password) { return ReutrnError(res, 'invaild_body'); }
    const passwordHash = createHmac('sha256', process.env.PASSWORD_HASH_KEY);
    const userDatabases = await getUserDatabases();
    // find username or email
    const find = await userDatabases.findOne({
        $or: [
            { username: username },
            { email: username }
        ],
        password: passwordHash.update(password).digest('hex')
    });
    if (!find) {
        res.json({
            code: 401
        });
        return;
    }
    res.json(ReturnLogin(find));
});

router.post('/session', async (req, res) => {
    const { session } = req.headers;
    if (!session) { return ReutrnError(res, 'invaild_body'); }
    const userDatabases = await getUserDatabases();
    const find = await userDatabases.findOne({
        session: session
    });
    if (!find) {
        res.json({
            code: 401
        });
        return;
    }
    res.json(ReturnLogin(find));
});

router.ws('/session', async (ws, req) => {
    const { session } = req.headers;
    if (!session) { return; }
    const userDatabases = await getUserDatabases();
    const find = await userDatabases.findOne({
        session: session
    });
    // console.log(find);
    if (!find) { return; }
    // ws.send(JSON.stringify(ReturnLogin(find)));
    if (!global.sessions[session]) {
        global.sessions[session] = [];
    }
    global.sessions[session].push(ws);
    ws.on('close', () => {
        if (global.sessions[session].length === 1) {
            delete global.sessions[session];
            return;
        }
        global.sessions[session].splice(global.sessions[session].indexOf(ws), 1);
    });
    ws.on('message', async (msg) => {
        const json = isJsonString(msg);
        if (json) {
            if (json.type == 'ready') {
                let devicesDB = await getIoTDatabases();
                let devicePromises = find.deviceList.map(async device => {
                    const deviceGet = await devicesDB.findOne({
                        _id: device
                    });
                    if (!deviceGet) { return null; }
                    return {
                        name: deviceGet.name,
                        serial: deviceGet._id,
                        state: (global.devices[session] && global.devices[session][deviceGet._id]) ? true : false
                    };
                });
                let devices = (await Promise.all(devicePromises)).filter(device => device !== null);
                ws.send(JSON.stringify({
                    type: 'device_list',
                    devices: devices
                }));
            }
        }
        if (!global.devices[session]) { return; }
        for (const serial in global.devices[session]) {
            global.devices[session][serial].send(msg);
        }
    })
});

export default router;