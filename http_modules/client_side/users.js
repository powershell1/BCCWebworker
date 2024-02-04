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


export default router;