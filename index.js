const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const express = require("express"); // Manampy an'ity mba tsy hijanona ny Render
const app = express();

// Manao izay tsy haha-mati ny Render (Keep-alive)
app.get("/", (req, res) => res.send("NEXUS Bot is Running..."));
app.listen(process.env.PORT || 3000);

async function startNexus() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }), // "fatal" ihany mba hadio ny logs
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Zava-dehibe amin'ny pairing
    });

    // --- LOJIKA PAIRING CODE ---
    // Raha mbola tsy nampifandraisina (tsy misy creds) dia mangataka code
    if (!conn.authState.creds.registered) {
        const phoneNumber = "261382266876"; 
        
        // Miandry kely aloha vao mangataka code
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n========================================");
                console.log("NY PAIRING CODE-NAO DIA:", code);
                console.log("========================================\n");
            } catch (err) {
                console.log("Fisiana olana tamin'ny fangatahana code: ", err);
            }
        }, 5000); // 5 segondra vao mangataka
    }

    conn.ev.on('creds.update', saveCreds);

    // Lojika famaliana Menu (tsy niova)
    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        if (!fs.existsSync('./database.json')) {
            fs.writeFileSync('./database.json', JSON.stringify({ menus: [] }));
        }
        
        const data = JSON.parse(fs.readFileSync('./database.json'));
        let menuList = "*--- NEXUS MENU ---*\n\n";
        data.menus.forEach((m, i) => { menuList += `${i + 1}. ${m.question}\n`; });
        menuList += "\n_Soraty ny laharana hisafidiananao._";

        const choice = parseInt(text.trim());
        if (!isNaN(choice) && data.menus[choice - 1]) {
            await conn.sendMessage(from, { text: data.menus[choice - 1].reponse });
        } else {
            await conn.sendMessage(from, { text: "Ny laharana ihany no soratina azafady.\n\n" + menuList });
        }
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startNexus();
        } else if (connection === 'open') {
            console.log("Tafiditra soa aman-tsara ny Bot NEXUS!");
        }
    });
}

startNexus();
