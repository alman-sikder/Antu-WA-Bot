const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');

// --- LUXURY CONFIGURATION ---
const CONFIG = {
    API_KEY: "AIzaSyBDaDpdh2ZlJSDWJ89LXKNwG9jgzUcVDM4",
    NICKNAME: "Antu",
    OFFLINE_THRESHOLD: 30 * 1000, // Reduced to 30 seconds
    MAX_MEMORY: 30, // Increased to 30 messages for deep context
    MODEL_NAME: "gemini-2.0-flash" // Updated to fix your 404 error
};

const CONTACTS = {
    '8801533331321@c.us': 'Babui (The love of my life, my world)',
    '8801933614471@c.us': 'KMC (My friend)',
    '8801705589963@c.us': 'Sabbir (My brother)',
    '8801816844231@c.us': 'Ayman (My friend)',
    '8801601534642@c.us': 'Tomato (My student)',
    '8801581872622@c.us': 'Antu (That is me!)'
};

// --- CORE ENGINE ---
class LuxuryBot {
    constructor() {
        this.genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
        this.memory = new Map();
        this.lastActive = new Map();
        
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });
    }

    getChatContext(chatId) {
        if (!this.memory.has(chatId)) this.memory.set(chatId, []);
        return this.memory.get(chatId);
    }

    async generateResponse(senderName, messageBody, history) {
        const isBabui = senderName.includes("Babui");
        
        const personalityPrompt = `
            You are ${CONFIG.NICKNAME}. You are not a service; you are a real person with a life.
            CURRENT CONTEXT: Talking to ${senderName}.
            
            STRICT PERSONALITY RULES:
            - NEVER say "How can I help you," "I am an AI," or "As a representative."
            - Use humor, light sarcasm, and flirting (ONLY if talking to Babui).
            - If it's Babui: Be the "tough guy" but soft for her. Flirt back, be romantic, and deeply emotional.
            - If it's a student (Tomato): Be helpful but cool.
            - If it's a friend: Use "bro" vibes, jokes, and don't be too formal.
            - Ask related questions occasionally to keep the convo alive.
            - LIMIT: Max 2 sentences. No paragraphs.
            
            LATEST MESSAGE: "${messageBody}"
        `;

        const chat = this.model.startChat({
            history: history,
            generationConfig: { maxOutputTokens: 100 }
        });

        const result = await chat.sendMessage(personalityPrompt);
        return result.response.text().trim();
    }

    init() {
        this.client.on('qr', qr => qrcode.generate(qr, { small: true }));
        this.client.on('ready', () => console.log('>>> LUXURY BOT DEPLOYED: STATUS ACTIVE'));

        this.client.on('message_create', (msg) => {
            if (msg.fromMe) this.lastActive.set(msg.to, Date.now());
        });

        this.client.on('message', async (message) => {
            const chat = await message.getChat();
            if (chat.isGroup) return;

            const senderId = message.from;
            const senderName = CONTACTS[senderId] || "someone";
            
            // Safety Check: 30-second wait
            const lastInteraction = this.lastActive.get(senderId) || 0;
            if (Date.now() - lastInteraction < CONFIG.OFFLINE_THRESHOLD) return;

            // Memory Management
            const history = this.getChatContext(senderId);
            history.push({ role: "user", parts: [{ text: message.body }] });
            if (history.length > CONFIG.MAX_MEMORY) history.shift();

            try {
                const reply = await this.generateResponse(senderName, message.body, history);
                
                if (reply.includes("OWNER_FALLBACK")) return;

                // Humane Typing
                const words = reply.split(' ').length;
                const typingTime = Math.min(Math.max((words / 5) * 6000, 3000), 12000);

                await chat.sendStateTyping();
                setTimeout(async () => {
                    await this.client.sendMessage(senderId, reply);
                    history.push({ role: "model", parts: [{ text: reply }] });
                }, typingTime);

            } catch (err) {
                console.error("Critical System Failure:", err);
            }
        });

        this.client.initialize();
    }
}

const myBot = new LuxuryBot();
myBot.init();