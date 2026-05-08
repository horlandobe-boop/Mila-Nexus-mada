const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

let dbFile = './database.json';
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ menus: [] }));

// Pejy ho an'ny Admin
app.get('/', (req, res) => {
    let data = JSON.parse(fs.readFileSync(dbFile));
    let rows = data.menus.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${m.question}</td>
            <td><a href="/delete/${i}">Fafana</a></td>
        </tr>`).join('');

    res.send(`
        <h1>NEXUS Admin Dashboard</h1>
        <form action="/add" method="POST">
            <input type="text" name="q" placeholder="Question/Menu" required>
            <input type="text" name="r" placeholder="Réponse" required>
            <button type="submit">Ampidirina</button>
        </form>
        <hr>
        <h3>Broadcast Message</h3>
        <form action="/broadcast" method="POST">
            <textarea name="msg" placeholder="Hafatra ho an'ny rehetra..."></textarea>
            <button type="submit">Alefa Broadcast</button>
        </form>
        <table border="1"><tr><th>No</th><th>Menu</th><th>Action</th></tr>${rows}</table>
    `);
});

// Lojika hanampiana Menu
app.post('/add', (req, res) => {
    let data = JSON.parse(fs.readFileSync(dbFile));
    data.menus.push({ question: req.body.q, reponse: req.body.r });
    fs.writeFileSync(dbFile, JSON.stringify(data));
    res.redirect('/');
});

app.listen(3000, () => console.log("Dashboard mandeha amin'ny port 3000"));
        
