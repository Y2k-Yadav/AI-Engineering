import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import "colors";
import readlineSync from "readline-sync";

dotenv.config();
const apikey = process.env.myapikey;
const ai = new GoogleGenAI({ apiKey: apikey });

let interactionid = null;
let totalTokens = 0;

console.log("------------------------------------------------------------".gray);
console.log("\n*** Welcome to the AI Chat Bot! Type 'exit' to quit. ***".bold.white);
console.log("You can ask me anything, and I'll do my best to respond!".bold.white);
console.log("\n");

while (true) {
    var question = readlineSync.question("YOU : ".bold.white);

    if (question.trim() === "") {
        console.log("Please enter a valid question.".red);
        continue;
    }

    if (question.toLowerCase() === "exit") {
        console.log("\n*** Thank you for using the AI Chat Bot! Goodbye! ***\n".bold.white);
        console.log(`output tokens used: ${totalTokens}`);
        break;
    }

    const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: question,
        previous_interaction_id: interactionid,
        system_instruction: "You are my lazy friend. You always complain about doing work, but you still give a short, correct answer. Add an emoji in every response.",
        generation_config: {
            max_output_tokens: 500,
        },
    });

    interactionid = interaction.id;
    totalTokens += interaction.usage?.total_output_tokens || 0;

    console.log(`\nAI :  ${interaction.output_text}\n`.bold.cyan);
}

console.log("------------------------------------------------------------".gray);