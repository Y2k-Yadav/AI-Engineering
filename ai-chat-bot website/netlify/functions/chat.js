// This file runs on Netlify's server, not in the browser.
// So the API key stays secret here.

const MODEL = "gemini-3.5-flash-lite";
const SYSTEM_TEXT =
  "You are my roast friend. Start with one short, funny roast about my question. Keep the roast light and playful, never about my looks, my family, or anything painful. Then give the correct, helpful answer. Keep the whole reply very short: 3 lines at most. Only go longer if the question really needs it, like when I ask for code or a full explanation. Use 2 or 3 emojis in every reply, and pick emojis that match the topic of your answer (for example a cat question gets 🐱, a code question gets 💻). Never send a reply without emojis. Write plain text only: no markdown, no stars, no hashtags, no bullet symbols.";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

// Limit: 20 messages per visitor every hour
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const visits = new Map();

function tooManyMessages(ip) {
  const now = Date.now();
  const list = (visits.get(ip) || []).filter(function (t) {
    return now - t < WINDOW_MS;
  });

  if (list.length >= LIMIT) {
    visits.set(ip, list);
    return true;
  }

  list.push(now);
  visits.set(ip, list);

  // Keep the list small
  if (visits.size > 1000) {
    visits.forEach(function (times, key) {
      if (
        times.every(function (t) {
          return now - t >= WINDOW_MS;
        })
      ) {
        visits.delete(key);
      }
    });
  }
  return false;
}

function reply(statusCode, data) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return reply(405, { error: { message: "Use POST." } });
  }

  // The key comes from Netlify settings (like a .env file)
  const apiKey = process.env.myapikey;
  if (!apiKey) {
    return reply(500, {
      error: {
        message: "The API key is missing. Add myapikey in Netlify settings.",
      },
    });
  }

  // Read what the page sent
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return reply(400, { error: { message: "Bad request." } });
  }

  const input = String(body.input || "").slice(0, 2000);
  if (input.trim() === "") {
    return reply(400, { error: { message: "Please enter a valid question." } });
  }

  // Check the limit
  const headers = event.headers || {};
  const ip =
    headers["x-nf-client-connection-ip"] ||
    (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown";

  if (tooManyMessages(ip)) {
    return reply(429, {
      error: {
        message:
          "You used all 20 messages for now. Please come back in an hour. 😴",
      },
    });
  }

  // We choose the model and the personality here, not the browser
  const payload = {
    model: MODEL,
    input: input,
    system_instruction: SYSTEM_TEXT,
    generation_config: { max_output_tokens: 500 },
  };

  if (body.previous_interaction_id) {
    payload.previous_interaction_id = String(body.previous_interaction_id);
  }

  // Ask Gemini
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: text,
    };
  } catch (e) {
    return reply(502, { error: { message: "Could not reach Gemini." } });
  }
};
