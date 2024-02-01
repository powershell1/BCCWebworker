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
            code: 400,
            message: 'Invaild body.'
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

async function getUserDatabases() {
    await client.connect();
    const databases = await client.db('Userdata')
        .collection('Infomation');
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
            code: 401,
            message: 'Invaild username or password.'
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
            code: 401,
            message: 'Invaild session.'
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
    if (!find) { return; }
    // ws.send(JSON.stringify(ReturnLogin(find)));
    if (!global.sessions[session]) {
        global.sessions[session] = [];
    }
    console.log("Hello world!");
    global.sessions[session].push(ws);
    ws.on('close', () => {
        if (global.sessions[session].length === 1) {
            delete global.sessions[session];
            return;
        }
        global.sessions[session].splice(global.sessions[session].indexOf(ws), 1);
    });
});

export default router;