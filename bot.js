require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

const CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY,
    NICKNAME: "Jarvis",
    MODEL_NAME: "gemini-2.0-flash",
    MAX_MEMORY: 20 // Reduced to keep it fast
};

const CONTACTS = {
    '8801533331321@c.us': 'Babui (My World)',
    '8801581872622@c.us': 'Owner (Antu)',
    '8801757360041@c.us': 'Sujana',
    '8801618996866@c.us': 'Sujana sister 2'
};

let botActive = true;

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('---------------------------------');
    console.log('>>> JARVIS SYSTEMS ONLINE');
    console.log('---------------------------------');
});

client.on('message_create', async (msg) => {
    const content = msg.body.toLowerCase();
    // Logic to identify YOU even if the number format changes
    const isOwner = msg.fromMe || msg.from.includes('8801581872622');

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

    // TRIGGER: If someone texts you OR you call Jarvis yourself
    if (!msg.fromMe || (msg.fromMe && content.includes("jarvis"))) {
        const senderId = msg.fromMe ? msg.to : msg.from;
        
        // Don't reply to groups or unknown numbers to keep it "Luxury"
        if (!CONTACTS[senderId] && !msg.fromMe) return;

        console.log(`[JARVIS] Processing request from ${CONTACTS[senderId] || 'Owner'}`);

        const systemPrompt = `You are JARVIS. Assist Antu, a meteorology researcher. 
        If it is Antu: Call him 'Sir'. 
        If it is Babui: Be flirty/loving. 
        Be elite, tech-savvy, and concise (max 2 sentences).`;

        try {
            const result = await model.generateContent(systemPrompt + "\nUser said: " + msg.body);
            const reply = result.response.text();
            
            const chat = await msg.getChat();
            await chat.sendStateTyping();
            
            setTimeout(async () => {
                await client.sendMessage(senderId, reply);
            }, 2000);
        } catch (e) { console.error("Jarvis Fault:", e.message); }
    }
});

client.initialize();