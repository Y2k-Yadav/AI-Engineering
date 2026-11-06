import { GoogleGenAI } from "@google/genai";
import "colors";
import dotenv from "dotenv";
dotenv.config();

const myAPIKey = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: myAPIKey });

console.log(" Generating response... ".black.bgYellow.bold);

const response = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: "Explain how AI works in a few words, in 100 words or less, and provide a simple example.",
});

console.log("\n Response: ".black.bgGreen.bold);
console.log(`\n${response.output_text}\n`.white.bgBlue.bold);