const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: "AIzaSyBDaDpdh2ZlJSDWJ89LXKNwG9jgzUcVDM4",
    NICKNAME: "Antu",
    MODEL_NAME: "gemini-2.0-flash", // Updated to fix 404 error
    MAX_MEMORY: 30 
};

const CONTACTS = {
    '8801533331321@c.us': 'Babui (My World)',
    '8801933614471@c.us': 'KMC',
    '8801705589963@c.us': 'Sabbir',
    '8801816844231@c.us': 'Ayman',
    '8801601534642@c.us': 'Tomato',
    '8801581872622@c.us': 'Antu',
    '8801757360041@c.us': 'Sujana'
};

const chatMemory = new Map();
const lastUserActivity = new Map();

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// --- ENGINE START ---
client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('---------------------------------');
    console.log('>>> ANTU LUXURY BOT: STATUS ON'); // On message
    console.log('---------------------------------');
});

// Track YOUR activity in specific chats
client.on('message_create', (msg) => {
    if (msg.fromMe) {
        lastUserActivity.set(msg.to, Date.now());
    }
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    if (chat.isGroup) return;

    const senderId = message.from;
    const senderName = CONTACTS[senderId] || "someone";
    
    // NEW RULE: Only stand down if you SENT a message in THIS specific chat recently
    const lastInteraction = lastUserActivity.get(senderId) || 0;
    const isRecentlyActiveHere = (Date.now() - lastInteraction < 30000); 

    if (isRecentlyActiveHere) {
        console.log(`[STATUS: OFF] for ${senderName} - Antu is in the chat.`);
        return;
    }

    console.log(`[STATUS: ON] Handling message from ${senderName}...`);

    // Memory Logic
    if (!chatMemory.has(senderId)) chatMemory.set(senderId, []);
    const history = chatMemory.get(senderId);
    history.push({ role: "user", parts: [{ text: message.body }] });

    const personalityPrompt = `
        Your name is ${CONFIG.NICKNAME}. You are meteorology student Alman Sikder (Antu).
        PERSONALITY: Tech-savvy, humorous, and flirty (if with Babui). Use 880-style "bro" vibes for friends.
        RULES: No bot-speak. Max 2 sentences. Read the context of the last 10 msgs.
        TALKING TO: ${senderName}.
    `;

    try {
        const result = await model.generateContent({
            contents: [...history.slice(-10), { role: "user", parts: [{ text: personalityPrompt }] }]
        });
        
        const reply = result.response.text().trim();
        if (reply.includes("OWNER_FALLBACK")) return;

        // FIXED DELAY: 2 seconds per line
        const lines = reply.split('\n').length;
        const typingTime = lines * 2000;

        await chat.sendStateTyping();
        
        setTimeout(async () => {
            await client.sendMessage(senderId, reply);
            history.push({ role: "model", parts: [{ text: reply }] });
            if (history.length > CONFIG.MAX_MEMORY) history.shift();
        }, typingTime);

    } catch (err) {
        console.error("AI Brain Error:", err.message);
    }
});

client.initialize();