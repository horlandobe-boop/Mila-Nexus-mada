const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const express = require("express");
const app = express();

let pairingCode = "Mbola mikaroka code... Refresh-o ny pejy afaka 10 segondra.";

app.get("/", (req, res) => res.send("<h1>NEXUS Bot mandeha...</h1>"));
app.get("/code", (req, res) => res.send(`
    <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1>NEXUS PAIRING CODE</h1>
        <div style="background:#f4f4f4; padding:20px; display:inline-block; border-radius:10px;">
            <h2 style="color:#25D366; font-size:40px; letter-spacing:5px;">${pairingCode}</h2>
        </div>
        <p>Laharana: <b>261382266876</b></p>
        <p><i>Raha mbola tsy mivoaka ny code, andraso kely dia refresh-o ny pejy.</i></p>
    </div>
`));

app.listen(process.env.PORT || 3000);

async function startNexus() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        // Ity ampahany ity no mampiseho ny code pairing amin'ny server
        browser: ["Chrome (Linux)", "", ""] 
    });

    if (!conn.authState.creds.registered) {
        const phoneNumber = "261382266876";
        
        // Miandry kely ny socket ho vonona tanteraka
        await delay(5000);
        
        try {
            let code = await conn.requestPairingCode(phoneNumber);
            pairingCode = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log("CODE PAIRING NIVOAKA: " + pairingCode);
        } catch (err) {
            console.error("Hadisoana tamin'ny fangatahana code:", err);
            pairingCode = "Hadisoana: " + err.message + ". Avereno ny Deploy.";
        }
    }

    conn.ev.on('creds.update', saveCreds);

    // Lojika Menu NEXUS
    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        
        if (!fs.existsSync('./database.json')) fs.writeFileSync('./database.json', JSON.stringify({ menus: [], clients: [] }));
        const data = JSON.parse(fs.readFileSync('./database.json'));

        // Tehirizo ny client mba hahafahana manao broadcast any aoriana
        if (!data.clients) data.clients = [];
        if (!data.clients.includes(from)) {
            data.clients.push(from);
            fs.writeFileSync('./database.json', JSON.stringify(data));
        }

        let menuList = "*--- NEXUS MENU ---*\n\n";
        data.menus.forEach((m, i) => { menuList += `${i + 1}. ${m.question}\n`; });
        menuList += "\n_Soraty ny laharana hisafidiananao._";

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
            pairingCode = "EFA TAFIDITRA!";
        }
    });
}

startNexus();
