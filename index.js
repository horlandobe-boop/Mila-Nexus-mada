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

app.get("/", (req, res) => res.send("NEXUS Bot is Live"));
app.listen(process.env.PORT || 3000);

async function startNexus() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        // Ity no manery ny Render ho toy ny Chrome
        browser: ["Chrome (Linux)", "", ""]
    });

    // RAHA MBOLA TSY NAMPIDITRA CODE
    if (!conn.authState.creds.registered) {
        const phoneNumber = "261382266876"; 
        
        // Miandry 10 segondra mba ho tafiditra tsara ny server
        await delay(10000); 

        try {
            // MANGATAKA CODE
            const code = await conn.requestPairingCode(phoneNumber);
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
            
            // Ity no mampiseho azy ao amin'ny LOGS ao amin'ny Render
            console.log("\n\n****************************************");
            console.log("NY PAIRING CODE-NAO DIA: " + formattedCode);
            console.log("****************************************\n\n");
        } catch (e) {
            console.log("Hadisoana: Avereno ny Deploy (Manual Deploy)");
        }
    }

    conn.ev.on('creds.update', saveCreds);

    // --- LOJIKA NEXUS (Menu amin'ny laharana) ---
    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

        if (!fs.existsSync('./database.json')) {
            fs.writeFileSync('./database.json', JSON.stringify({ menus: [] }));
        }
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
            console.log("TAFIDITRA SOA AMAN-TSARA!");
        }
    });
}

startNexus();
