const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const express = require("express");
const app = express();

let pairingCode = "Andraso kely, mbola mangataka code...";

// Pejy web hanehoana ny code pairing
app.get("/", (req, res) => res.send(`<h1>NEXUS Bot</h1><p>Status: Mandehana ao amin'ny /code raha hijery ny pairing code.</p>`));
app.get("/code", (req, res) => res.send(`<h1>NEXUS PAIRING CODE</h1><h2 style="color:blue">${pairingCode}</h2><p>Ampidiro amin'ny laharana 261382266876 io.</p>`));

app.listen(process.env.PORT || 3000, () => console.log("Server mandeha..."));

async function startNexus() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // MANGATAKA CODE
    if (!conn.authState.creds.registered) {
        const phoneNumber = "261382266876"; 
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNumber);
                pairingCode = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("CODE PAIRING:", pairingCode);
            } catch (err) {
                pairingCode = "Fisiana olana: " + err.message;
            }
        }, 8000); // Natao 8s mba hahazoana antoka fa vonona ny socket
    }

    conn.ev.on('creds.update', saveCreds);

    // LOJIKA MENU (NEXUS)
    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        
        if (!fs.existsSync('./database.json')) fs.writeFileSync('./database.json', JSON.stringify({ menus: [] }));
        const data = JSON.parse(fs.readFileSync('./database.json'));

        let menuList = "*--- NEXUS MENU ---*\n\n";
        data.menus.forEach((m, i) => { menuList += `${i + 1}. ${m.question}\n`; });
        menuList += "\n_Soraty ny laharana fotsiny._";

        const choice = parseInt(text);
        if (!isNaN(choice) && data.menus[choice - 1]) {
            await conn.sendMessage(from, { text: data.menus[choice - 1].reponse });
        } else {
            await conn.sendMessage(from, { text: "Ny laharana ihany no soratina tompoko.\n\n" + menuList });
        }
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) startNexus();
        } else if (connection === 'open') {
            pairingCode = "Efa tafiditra (Connected)!";
            console.log("Tafiditra ny bot!");
        }
    });
}

startNexus();
