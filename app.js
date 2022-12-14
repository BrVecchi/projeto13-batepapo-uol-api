import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
dotenv.config();

const userSchema = joi.object({
  name: joi.string().required(),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message"),
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

await mongoClient.connect();
db = mongoClient.db("uol-db");

const participantsCollection = db.collection("participants");
const messagesCollection = db.collection("messages");

const app = express();
app.use(express.json());
app.use(cors());

// status validation
const statusValidation = async () => {
  const participants = await participantsCollection.find().toArray();
  const participantsToDelete = participants.filter(
    (participant) => Date.now() - participant.lastStatus > 10000
  );
  participantsToDelete.forEach(async (participant) => {
    await participantsCollection.deleteOne({ name: participant.name });
    await messagesCollection.insertOne({
      from: participant.name,
      to: "Todos",
      text: "sai da sala...",
      type: "status",
      time: dayjs().format("HH:MM:ss"),
    });
  });
};
setInterval(statusValidation, 15000);

// "/participants" route
app.get("/participants", async (req, res) => {
  try {
    const participants = await participantsCollection.find({}).toArray();
    res.status(200).send(participants);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});
app.post("/participants", async (req, res) => {
  const user = req.body;
  const validation = userSchema.validate(user, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const { name } = req.body;
    const nameValidation = await participantsCollection.findOne({ name: name });
    if (nameValidation) {
      res.sendStatus(409);
      return;
    }
    await participantsCollection.insertOne({
      name: user.name,
      lastStatus: Date.now(),
    });
    await messagesCollection.insertOne({
      from: user.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:MM:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// "/messages" route
app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  const messageValidation = {
    to,
    text,
    type,
  };

  const validation = messageSchema.validate(messageValidation, {
    abortEarly: false,
  });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const fromValidation = await participantsCollection.findOne({ name: user });
    if (!fromValidation) {
      res.sendStatus(422);
      return;
    }

    await messagesCollection.insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:MM:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});
app.get("/messages/", async (req, res) => {
  const limit = Number(req.query.limit);
  const { user } = req.headers;

  try {
    const messages = await messagesCollection
      .find({})
      .sort({ $natural: -1 })
      .limit(limit || 0)
      .toArray();
    const messagesToShow = messages.filter(
      (message) => message.to === "Todos" || message.to === user
    );
    res.status(200).send(messagesToShow.reverse());
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// "/status" route
app.post("/status", async (req, res) => {
  const { user } = req.headers;

  try {
    const userToValidate = await participantsCollection.findOne({ name: user });
    if (!userToValidate) {
      res.sendStatus(404);
      return;
    }
    await participantsCollection.updateOne(
      { _id: ObjectId(user._id) },
      { $set: { lastStatus: Date.now() } }
    );
    res.sendStatus(200);
  } catch (error) {
    // console.error(error)
    res.sendStatus(500);
  }
});

app.listen(5000);
console.log("Rodando na porta 5000");
