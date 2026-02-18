const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: "AIzaSyBDaDpdh2ZlJSDWJ89LXKNwG9jgzUcVDM4",
    NICKNAME: "Antu",
    MODEL_NAME: "gemini-2.0-flash", 
    MAX_MEMORY: 30 
};

const CONTACTS = {
    '+8801533331321@c.us': 'Babui (My World)',
    '+8801933614471@c.us': 'KMC',
    '+8801705589963@c.us': 'Sabbir',
    '+8801816844231@c.us': 'Ayman',
    '+8801601534642@c.us': 'Tomato',
    '+8801581872622@c.us': 'Antu',
    '+8801757360041@c.us': 'Sujana',
    '+8801618996866@c.us': 'Sujana sister 2'
};

const chatMemory = new Map();
const lastUserActivity = new Map();
let morningGreeted = false; // Prevents spamming Babui multiple times between 8-9am

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// --- HELPER: MORNING GREETINGS ---
const sendMorningGreeting = async () => {
    const now = new Date();
    const hour = now.getHours();
    const babuiId = '+8801533331321@c.us';

    if (hour === 8 && !morningGreeted) {
        const greetings = [
            "Good morning Babui. I love you baby. ❤️",
            "Good morning Honeybun! Hope you have a lovely day. ❤️",
            "Morning love! You're going to kill it today. I love you.",
            "Good morning my world. Sending you all my love for a great day!"
        ];
        const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
        
        try {
            await client.sendMessage(babuiId, randomGreet);
            morningGreeted = true;
            console.log(`[AUTO] Morning greeting sent to Babui.`);
        } catch (e) { console.error("Greeting failed:", e); }
    }
    // Reset the lock at midnight
    if (hour === 0) morningGreeted = false;
};

// --- ENGINE ---
client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('>>> ANTU LUXURY BOT: STATUS ON');
    setInterval(sendMorningGreeting, 60000); // Check every minute
});

client.on('message_create', (msg) => {
    if (msg.fromMe) lastUserActivity.set(msg.to, Date.now());
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    if (chat.isGroup) return;

    const senderId = message.from;
    const senderName = CONTACTS[senderId] || "someone";
    
    const lastInteraction = lastUserActivity.get(senderId) || 0;
    if (Date.now() - lastInteraction < 30000) return;

    console.log(`[STATUS: ON] Replying to ${senderName}...`);

    if (!chatMemory.has(senderId)) chatMemory.set(senderId, []);
    const history = chatMemory.get(senderId);
    history.push({ role: "user", parts: [{ text: message.body }] });

    const personalityPrompt = `
        Your name is ${CONFIG.NICKNAME}. You are a meteorology student and researcher (first-gen college student).
        PERSONALITY: Analytical, tech-savvy, helpful, yet humorous. 
        RELATIONSHIP: Deeply love Babui. Be affectionate/flirty with her. Be a cool mentor/friend to others.
        LIMIT: Max 2 sentences. No bot phrases like "How can I help you?".
    `;

    try {
        const result = await model.generateContent({
            contents: [...history.slice(-10), { role: "user", parts: [{ text: personalityPrompt }] }]
        });
        
        const reply = result.response.text().trim();
        const typingTime = reply.split('\n').length * 2000;

        await chat.sendStateTyping();
        
        setTimeout(async () => {
            await client.sendMessage(senderId, reply);
            history.push({ role: "model", parts: [{ text: reply }] });
            if (history.length > CONFIG.MAX_MEMORY) history.shift();
        }, typingTime);

    } catch (err) {
        console.error("AI Error:", err.message);
    }
});

client.initialize();