import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi"
import dayjs from 'dayjs';
dotenv.config();

const userSchema = joi.object({
    name: joi.string().required()
  });

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

await mongoClient.connect();
db = mongoClient.db("uol-db");

const participatnsCollection = db.collection('participants')
const messagesCollection = db.collection('messages')

const app = express();
app.use(express.json());
app.use(cors());

// rota "/participantes"
app.get('/participantes', async (res, req) => {
    try{
        const participants = await participatnsCollection.find({}).toArray()
        res.status(200).send(participants)
    }catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
})
app.post('/participantes', async (res, req) => {
    const user = req.body
    const validation = userSchema.validate(user, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors)
        return
    }

    try{
        const nameValidation = await participatnsCollection.findOne({name: user.name})
        if(nameValidation) {
            res.sendStatus(409)
            return
        }
        await participatnsCollection.insertOne({name: user.name, lastStatus: Date.now()})
        await messagesCollection.insertOne({from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:ss')})
        res.sendStatus(201)
    }catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
})

app.listen(5000);
