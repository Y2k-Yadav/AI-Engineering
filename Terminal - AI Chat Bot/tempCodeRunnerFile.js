import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv"

dotenv.config();
const apikey = process.env.myapikey

const ai = new GoogleGenAI({ apiKey: apikey });

const interaction = await ai.interactions.create({
    model: "gemini-3.8-flash",
    input: "Explain how AI works in a few words",
});
console.log(interaction.output_text);