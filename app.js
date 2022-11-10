import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

await mongoClient.connect();
db = mongoClient.db("meu_lindo_projeto");

const app = express();
app.use(express.json());
app.use(cors());

app.listen(5000);
