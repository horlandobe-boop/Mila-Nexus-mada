const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

async function startNexus() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Tsy mila QR fa Pairing Code
        logger: pino({ level: "silent" })
    });

    // --- LOJIKA PAIRING CODE ---
    if (!conn.authState.creds.registered) {
        const phoneNumber = "261382266876"; 
        setTimeout(async () => {
            let code = await conn.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log("----------------------------");
            console.log("PAIRING CODE ILAINA:", code);
            console.log("----------------------------");
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        // Load Menu avy ao amin'ny database.json
        const data = JSON.parse(fs.readFileSync('./database.json'));
        
        // Fanamboarana ny lahatsoratra hiseho
        let menuList = "*NEXUS - Menu*\n\n";
        data.menus.forEach((m, i) => {
            menuList += `${i + 1}. ${m.question}\n`;
        });
        menuList += "\n_Soraty ny laharana hisafidiananao._";

        const choice = parseInt(text.trim());

        if (!isNaN(choice) && data.menus[choice - 1]) {
            // Valiny raha marina ny isa
            await conn.sendMessage(from, { text: data.menus[choice - 1].reponse });
        } else {
            // Hafatra fampianarana raha diso
            await conn.sendMessage(from, { 
                text: "Ny laharana ihany no soratina azafady.\n\n" + menuList 
            });
        }
    });

    conn.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log("Tafiditra soa aman-tsara ny Bot NEXUS!");
    });
}

startNexus();
