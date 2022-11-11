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
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message')
})


const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

await mongoClient.connect();
db = mongoClient.db("uol-db");

const participatnsCollection = db.collection('participants')
const messagesCollection = db.collection('messages')

const app = express();
app.use(express.json());
app.use(cors());

// "/participants" route
app.get('/participants', async (req, res) => {
    try{
        const participants = await participatnsCollection.find({}).toArray()
        res.status(200).send(participants)
    }catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
})
app.post('/participants', async (req, res) => {
    const user = req.body
    const validation = userSchema.validate(user, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors)
        return
    }

    try{
        const {name} = req.body
        const nameValidation = await participatnsCollection.findOne({name: name})
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

// "/messages" route

app.post('/messages', async (req, res) => {
    const {to, text, type} = req.body
    const {from} = req.headers
    const message = {
        to,
        text,
        type,
        from
    }
    const messageValidation = {
        to,
        text,
        type
    }

    const validation = messageSchema.validate(messageValidation, { abortEarly: false });
    console.log(validation)
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors)
        return
    }

    try{
        const fromValidation = await participatnsCollection.findOne({name: from})
        if(!fromValidation) {
            res.sendStatus(422)
            return
        }

        await messagesCollection.insertOne({from: from, to: to, text: text, type: type, time: dayjs().format('HH:MM:ss')})
        res.sendStatus(201)
    }catch (error) {
        console.error(error)
        res.sendStatus(500)
    }
})

app.get('/messages', async (req, res) => {
    try {
        const messages = await messagesCollection.find({}).toArray()
        res.status(200).send(messages)
    } catch(error){
        console.error(error)
        res.sendStatus(500)
    }
})

app.listen(5000);
console.log("Rodando na porta 5000")
