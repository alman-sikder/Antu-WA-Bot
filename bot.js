require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

const CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY,
    NICKNAME: "Jarvis",
    OWNER_ID: '8801581872622', 
    MODEL_NAME: "gemini-2.0-flash",
    MAX_MEMORY: 15 
};

const CONTACTS = {
    '8801533331321@c.us': 'Babui (My World)',
    '8801581872622@c.us': 'Owner (Antu)',
    '8801757360041@c.us': 'Sujana',
    '8801618996866@c.us': 'Sujana sister 2',
    '8801705589963@c.us': 'Sabbir',
    '8801816844231@c.us': 'Ayman'
};

let botActive = true;

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('---------------------------------');
    console.log('>>> JARVIS RESEARCH SYSTEMS: ONLINE');
    console.log('---------------------------------');
});

client.on('message_create', async (msg) => {
    const content = msg.body.toLowerCase();
    const isOwner = msg.fromMe || msg.from.includes(CONFIG.OWNER_ID);

    // REMOTE POWER SWITCH
    if (isOwner && content.includes("jarvis offline")) {
        botActive = false;
        return msg.reply("Systems standing down, Sir.");
    }
    if (isOwner && content.includes("jarvis online")) {
        botActive = true;
        return msg.reply("Systems re-engaged. I am online, Sir.");
    }

    if (!botActive) return;

    // TRIGGER LOGIC
    if (!msg.fromMe || (msg.fromMe && content.includes("jarvis"))) {
        const senderId = msg.fromMe ? msg.to : msg.from;
        if (!CONTACTS[senderId] && !msg.fromMe) return;

        const systemPrompt = `You are JARVIS. Assisting Antu, a meteorology researcher.
        If the message contains 'search', provide a data-heavy analytical report.
        If Antu: Call him 'Sir'. If Babui: Be loving.
        Tone: Elite, research-focused. Max 2 sentences unless searching.`;

        try {
            const result = await model.generateContent(`${systemPrompt}\n\nInput: ${msg.body}`);
            const reply = result.response.text().trim();
            const chat = await msg.getChat();
            await chat.sendStateTyping();
            
            setTimeout(async () => {
                await client.sendMessage(senderId, reply);
            }, 2500);

        } catch (e) {
            console.error(e.message.includes("429") ? "[QUOTA] Cooling down..." : "Jarvis Error:", e.message);
        }
    }
});

client.initialize();