// ----- Grab the things from the page -----
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const tokenCount = document.getElementById("tokenCount");
const statusText = document.getElementById("statusText");

// The page talks to our own small server file (netlify/functions/chat.js)
const CHAT_URL = "/.netlify/functions/chat";

// ----- Things we remember while chatting -----
let interactionId = null; // lets the AI remember the old messages
let totalTokens = 0;

// ----- Small helper functions -----

// Current time like 10:45 AM
function getTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function scrollDown() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Show a chat message (type is "you" or "ai")
function addMessage(text, type) {
  const row = document.createElement("div");
  row.className = "row " + type;

  const col = document.createElement("div");
  col.className = "col";

  // Bot messages get a small name on top
  if (type === "ai") {
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "🤖 AI Bot";
    col.appendChild(label);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  bubble.title = getTime();

  col.appendChild(bubble);
  row.appendChild(col);
  chatBox.appendChild(row);
  scrollDown();
  return row;
}

// Small note in the middle (type is "info" or "error")
function addNote(text, type) {
  const div = document.createElement("div");
  div.className = "note " + (type || "");
  div.textContent = text;
  chatBox.appendChild(div);
  scrollDown();
  return div;
}

// The bouncing dots while the bot is thinking
function addTyping() {
  const row = document.createElement("div");
  row.className = "row ai";
  row.innerHTML =
    '<div class="col"><div class="label">🤖 AI Bot</div>' +
    '<div class="bubble dots">Thinking <i></i><i></i><i></i></div></div>';
  chatBox.appendChild(row);
  scrollDown();
  return row;
}

// The welcome card at the top
function addWelcome() {
  const div = document.createElement("div");
  div.className = "welcome";
  div.innerHTML =
    '<div class="big">🤖</div>' +
    '<div class="title">Welcome to the AI Chat Bot!</div>' +
    "<div>Type 'exit' to quit.</div>" +
    '<div class="starters">' +
    '<button type="button" class="chip" data-text="Explain HTML in simple words">🌐 Explain HTML</button>' +
    '<button type="button" class="chip" data-text="Roast my coding skills">🔥 Roast my coding</button>' +
    '<button type="button" class="chip" data-text="Tell me a fun fact">🎉 Fun fact</button>' +
    "</div>";
  chatBox.appendChild(div);
}

// Update the token number
function showTokens() {
  tokenCount.textContent = totalTokens;
}

// Find the answer text inside what Google sends back
function getAnswerText(data) {
  // Easy case: text is ready to use
  if (typeof data.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  // Newer shape: a list called "steps"
  if (Array.isArray(data.steps)) {
    for (let i = data.steps.length - 1; i >= 0; i--) {
      const step = data.steps[i];
      if (step.type === "user_input") continue;
      if (Array.isArray(step.content)) {
        const text = step.content
          .map((part) => part.text || "")
          .join("")
          .trim();
        if (text) return text;
      }
    }
  }

  // Older shape: a list called "outputs"
  if (Array.isArray(data.outputs)) {
    for (let i = data.outputs.length - 1; i >= 0; i--) {
      if (data.outputs[i].text) return data.outputs[i].text;
    }
  }

  return "";
}

// Send the question to our server file
async function askAI(question) {
  const body = { input: question };

  // Only add this after the first message
  if (interactionId) {
    body.previous_interaction_id = interactionId;
  }

  let response;
  try {
    response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Run the site with Netlify.");
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error("Cannot reach the server. Run the site with Netlify.");
  }

  if (!response.ok) {
    const message = data.error && data.error.message ? data.error.message : "Something went wrong.";
    throw new Error(message);
  }

  // Remember this chat for next time
  if (data.id) {
    interactionId = data.id;
  }

  // Count tokens
  if (data.usage) {
    totalTokens += data.usage.total_output_tokens || 0;
    showTokens();
  }

  return addEmojiIfMissing(cleanText(getAnswerText(data)));
}

// Remove markdown stars and hashtags so the text looks clean
function cleanText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/\*(\S[^*]*?)\*/g, "$1")
    .replace(/`/g, "");
}

// If the bot forgot emojis, add one at the end
function addEmojiIfMissing(text) {
  if (text && !/\p{Extended_Pictographic}/u.test(text)) {
    return text + " 😎";
  }
  return text;
}

// Start fresh
function resetChat() {
  interactionId = null;
  totalTokens = 0;
  showTokens();
  chatBox.innerHTML = "";
  addWelcome();
}

// ----- What happens when buttons are used -----

// Starter buttons: click one to send it
chatBox.addEventListener("click", function (event) {
  const chip = event.target.closest(".chip");
  if (!chip || sendBtn.disabled) return;
  userInput.value = chip.dataset.text;
  chatForm.requestSubmit();
});

// ✏️ button starts a new chat
newChatBtn.addEventListener("click", resetChat);

// Send button / Enter key
chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  // Do nothing while the bot is still answering
  if (sendBtn.disabled) return;

  const question = userInput.value.trim();

  // Empty message
  if (question === "") {
    addNote("Please enter a valid question.", "error");
    return;
  }

  // Hide the starter buttons after the first message
  const starters = chatBox.querySelector(".starters");
  if (starters) starters.remove();

  // Show the user's message
  addMessage(question, "you");
  userInput.value = "";

  // Exit word
  if (question.toLowerCase() === "exit") {
    addNote("Thank you for using the AI Chat Bot! Goodbye!", "info");
    addNote("Output tokens used: " + totalTokens, "info");
    interactionId = null;
    totalTokens = 0;
    showTokens();
    return;
  }

  // Wait for the answer
  sendBtn.disabled = true;
  statusText.textContent = "Thinking...";
  const typing = addTyping();

  try {
    const answer = await askAI(question);
    typing.remove();
    addMessage(answer || "I got no answer. Try again. 😴", "ai");
  } catch (error) {
    typing.remove();
    addNote("Error: " + error.message, "error");
  }

  statusText.textContent = "Online";
  sendBtn.disabled = false;
  userInput.focus();
});

// ----- Start -----
resetChat();
