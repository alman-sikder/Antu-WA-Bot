require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

// --- JARVIS CONFIGURATION ---
const CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY,
    NICKNAME: "Jarvis",
    OWNER_NICKNAME: "Antu",
    MODEL_NAME: "gemini-2.0-flash",
    MAX_MEMORY: 50 
};

const CONTACTS = {
    '+8801533331321@c.us': 'Babui (My World)',
    '+8801581872622@c.us': 'Owner (Antu)',
    '+8801757360041@c.us': 'Sujana',
    '+8801618996866@c.us': 'Sujana sister 2',
    '+8801705589963@c.us': 'Sabbir (Brother)'
};

const chatMemory = new Map();
let botActive = true; 
let morningGreeted = false;

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// --- LUXURY FEATURES ---
const sendMorningGreeting = async () => {
    const hour = new Date().getHours();
    if (hour === 8 && !morningGreeted && botActive) {
        const greets = ["Good morning Babui. I love you baby. ❤️", "Good morning Honeybun! ❤️"];
        try {
            await client.sendMessage('+8801533331321@c.us', greets[Math.floor(Math.random() * greets.length)]);
            morningGreeted = true;
        } catch (e) { console.error("Greeting failed"); }
    }
    if (hour === 0) morningGreeted = false;
};

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
    console.log('>>> JARVIS SYSTEMS ONLINE');
    setInterval(sendMorningGreeting, 60000);
});

client.on('message_create', async (msg) => {
    const content = msg.body.toLowerCase();
    const isOwner = msg.fromMe || msg.from === '+8801581872622@c.us';

    // REMOTE SWITCH
    if (isOwner && content.includes("jarvis offline")) {
        botActive = false;
        await msg.reply("Understood, Sir. Systems going offline.");
        return;
    }
    if (isOwner && content.includes("jarvis online")) {
        botActive = true;
        await msg.reply("Systems back online. How can I assist you, Sir?");
        return;
    }

    // JARVIS SELF-CALL & NORMAL REPLY LOGIC
    if (!botActive && !content.includes("jarvis online")) return;
    
    // Trigger if someone texts you OR you call Jarvis from your own phone
    if (!msg.fromMe || (msg.fromMe && content.includes("jarvis"))) {
        const senderId = msg.fromMe ? msg.to : msg.from;
        const senderName = CONTACTS[senderId] || "Guest";

        if (!chatMemory.has(senderId)) chatMemory.set(senderId, []);
        const history = chatMemory.get(senderId);
        history.push({ role: "user", parts: [{ text: msg.body }] });

        const systemPrompt = `You are JARVIS. Replying for Antu, a high-level meteorology researcher.
        Be sophisticated, helpful, and protective. 
        If talking to Antu: Address him as 'Sir'. 
        If talking to Babui: Be deeply affectionate and flirty on Antu's behalf.
        Length: Max 2 sentences. Research-focused tone.`;

        try {
            const result = await model.generateContent({
                contents: [...history.slice(-10), { role: "user", parts: [{ text: systemPrompt }] }]
            });
            const reply = result.response.text().trim();
            
            const chat = await msg.getChat();
            await chat.sendStateTyping();
            
            setTimeout(async () => {
                // If I called him, send to the chat I am in. If others, reply to them.
                await client.sendMessage(senderId, reply);
                history.push({ role: "model", parts: [{ text: reply }] });
                if (history.length > CONFIG.MAX_MEMORY) history.shift();
            }, 3000);
        } catch (err) { console.error("Jarvis brain fault:", err.message); }
    }
});

client.initialize();