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

async function getUserDatabases() {
    await client.connect();
    const databases = await client.db('Userdata')
        .collection('Infomation');
    return databases;
}

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