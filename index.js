// Rehefa misy message tonga
conn.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const data = JSON.parse(fs.readFileSync('./database.json'));

    // Fanamboarana ny menu hiseho
    let menuText = "*--- NEXUS MENU ---*\n\n";
    data.menus.forEach((m, i) => {
        menuText += `${i + 1}. ${m.question}\n`;
    });
    menuText += "\n_Soraty ny laharan'ny safidy tianao._";

    const index = parseInt(text) - 1;

    if (!isNaN(index) && data.menus[index]) {
        // Raha nifidy laharana marina izy
        await conn.sendMessage(from, { text: data.menus[index].reponse });
    } else {
        // Raha zavatra hafa no nosoratany
        await conn.sendMessage(from, { text: "Ny laharana ihany no soratina\n\n" + menuText });
    }
});
