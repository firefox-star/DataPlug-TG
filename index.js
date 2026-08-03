const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');

const TOKEN = process.env.BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;
const WEBAPP_URL = process.env.WEBAPP_URL || '';
const OWNER_ID = process.env.OWNER_ID || '';

if (!TOKEN) { console.error('BOT_TOKEN required'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(express.json());

// ============ DATABASE (JSON) ============
const DB_PATH = path.join(__dirname, 'database', 'db.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (_) {}
    return { users: {}, orders: [], payments: [] };
}

function saveDB(db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function ensureUser(telegramId, name) {
    const db = loadDB();
    if (!db.users[telegramId]) {
        db.users[telegramId] = {
            telegramId, name,
            phone: '', password: '',
            wallet: 0, created: Date.now()
        };
        saveDB(db);
    }
    return db.users[telegramId];
}

// ============ DATA PLANS ============

const PLANS = {
    mtn: [
        { id: 'mtn_500_7', label: '500MB', size: '500 MB', validity: '7 days', price: 200 },
        { id: 'mtn_1gb_14', label: '1GB', size: '1 GB', validity: '14 days', price: 350 },
        { id: 'mtn_2gb_30', label: '2GB', size: '2 GB', validity: '30 days', price: 650 },
        { id: 'mtn_3gb_30', label: '3GB', size: '3 GB', validity: '30 days', price: 950 },
        { id: 'mtn_5gb_30', label: '5GB', size: '5 GB', validity: '30 days', price: 1500 },
        { id: 'mtn_10gb_30', label: '10GB', size: '10 GB', validity: '30 days', price: 2800 }
    ],
    airtel: [
        { id: 'airtel_500_7', label: '500MB', size: '500 MB', validity: '7 days', price: 220 },
        { id: 'airtel_1gb_14', label: '1GB', size: '1 GB', validity: '14 days', price: 380 },
        { id: 'airtel_2gb_30', label: '2GB', size: '2 GB', validity: '30 days', price: 700 },
        { id: 'airtel_3gb_30', label: '3GB', size: '3 GB', validity: '30 days', price: 1000 },
        { id: 'airtel_5gb_30', label: '5GB', size: '5 GB', validity: '30 days', price: 1600 },
        { id: 'airtel_10gb_30', label: '10GB', size: '10 GB', validity: '30 days', price: 3000 }
    ],
    glo: [
        { id: 'glo_500_7', label: '500MB', size: '500 MB', validity: '7 days', price: 180 },
        { id: 'glo_1gb_14', label: '1GB', size: '1 GB', validity: '14 days', price: 330 },
        { id: 'glo_2gb_30', label: '2GB', size: '2 GB', validity: '30 days', price: 600 },
        { id: 'glo_3gb_30', label: '3GB', size: '3 GB', validity: '30 days', price: 900 },
        { id: 'glo_5gb_30', label: '5GB', size: '5 GB', validity: '30 days', price: 1400 },
        { id: 'glo_10gb_30', label: '10GB', size: '10 GB', validity: '30 days', price: 2500 }
    ],
    '9mobile': [
        { id: '9m_500_7', label: '500MB', size: '500 MB', validity: '7 days', price: 200 },
        { id: '9m_1gb_14', label: '1GB', size: '1 GB', validity: '14 days', price: 350 },
        { id: '9m_2gb_30', label: '2GB', size: '2 GB', validity: '30 days', price: 650 },
        { id: '9m_3gb_30', label: '3GB', size: '3 GB', validity: '30 days', price: 950 },
        { id: '9m_5gb_30', label: '5GB', size: '5 GB', validity: '30 days', price: 1500 },
        { id: '9m_10gb_30', label: '10GB', size: '10 GB', validity: '30 days', price: 2800 }
    ]
};

const NETWORKS = [
    { id: 'mtn', name: 'MTN', color: '#FFC300' },
    { id: 'airtel', name: 'Airtel', color: '#ED1C24' },
    { id: 'glo', name: 'Glo', color: '#50B651' },
    { id: '9mobile', name: '9Mobile', color: '#006B53' }
];

// ============ AUTH HELPERS ============

const sessions = new Map();

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = sessions.get(token);
    next();
}

// ============ BOT COMMANDS ============

bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name || 'User';
    ensureUser(msg.from.id, name);

    const url = WEBAPP_URL
        ? `${WEBAPP_URL}?tg_id=${msg.from.id}&tg_name=${encodeURIComponent(name)}`
        : '';

    if (url) {
        bot.sendMessage(msg.chat.id,
            `⚡ *Welcome to Black Blade Data, ${name}!*\n\n` +
            `Buy cheap MTN, Airtel, Glo & 9Mobile data at the best prices.\n\n` +
            `👇 Tap below to open the app:`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🚀 Open Data Store', web_app: { url } }
                    ]]
                }
            }
        );
    } else {
        bot.sendMessage(msg.chat.id,
            `⚡ *Black Blade Data*\n\nSet WEBAPP_URL env variable to enable the web app.\n\nCommands:\n/balance - Check wallet`,
            { parse_mode: 'Markdown' }
        );
    }
});

bot.onText(/\/balance/, (msg) => {
    const user = ensureUser(msg.from.id, msg.from.first_name);
    bot.sendMessage(msg.chat.id, `💰 *Wallet Balance:* \u20A6${user.wallet.toFixed(2)}`, { parse_mode: 'Markdown' });
});

// ============ WEB APP API ============

// Auth - login/register via Telegram
app.post('/api/auth', (req, res) => {
    const { telegramId, name, phone, password } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

    const db = loadDB();
    let user = db.users[telegramId];

    if (!user) {
        // Auto-register from Telegram
        user = {
            telegramId, name: name || 'User',
            phone: phone || '', password: password || '',
            wallet: 0, created: Date.now()
        };
        db.users[telegramId] = user;
        saveDB(db);
    } else {
        // Update name if changed
        if (name) user.name = name;
        // If phone/password provided, update profile
        if (phone) user.phone = phone;
        if (password) user.password = password;
        saveDB(db);
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, telegramId);
    res.json({ token, user: { name: user.name, phone: user.phone, wallet: user.wallet } });
});

// Get user profile
app.get('/api/profile', authMiddleware, (req, res) => {
    const db = loadDB();
    const user = db.users[req.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, phone: user.phone, wallet: user.wallet, created: user.created });
});

// Get networks & plans
app.get('/api/plans', (req, res) => {
    res.json({ networks: NETWORKS, plans: PLANS });
});

// Fund wallet - user reports payment
app.post('/api/fund', authMiddleware, (req, res) => {
    const { amount, reference } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum funding is ₦100' });

    const db = loadDB();
    const user = db.users[req.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const payment = {
        id: uuid(), userId: req.userId,
        amount, reference: reference || `TX${Date.now()}`,
        status: 'pending', type: 'funding',
        created: Date.now()
    };
    db.payments.push(payment);
    saveDB(db);

    // Notify owner
    if (OWNER_ID) {
        bot.sendMessage(OWNER_ID,
            `💰 *Funding Request*\n\n` +
            `👤 ${user.name} (${user.phone || 'No phone'})\n` +
            `💵 Amount: ₦${amount}\n` +
            `🔄 Ref: ${payment.id.slice(0, 8)}\n\n` +
            `Use /approve ${payment.id.slice(0, 8)} or /reject ${payment.id.slice(0, 8)}`,
            { parse_mode: 'Markdown' }
        );
    }

    res.json({ success: true, paymentId: payment.id, message: 'Payment submitted. Wait for confirmation.' });
});

// Buy data
app.post('/api/buy', authMiddleware, (req, res) => {
    const { network, planId, phone } = req.body;
    if (!network || !planId || !phone) return res.status(400).json({ error: 'All fields required' });

    const plans = PLANS[network];
    if (!plans) return res.status(400).json({ error: 'Invalid network' });

    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const db = loadDB();
    const user = db.users[req.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.wallet < plan.price) {
        return res.status(400).json({ error: `Insufficient balance. You need ₦${plan.price} but have ₦${user.wallet}` });
    }

    // Deduct from wallet
    user.wallet -= plan.price;

    const order = {
        id: uuid(), userId: req.userId,
        network, planId, phone,
        planLabel: plan.label, planSize: plan.size,
        price: plan.price, status: 'pending',
        created: Date.now()
    };
    db.orders.push(order);
    saveDB(db);

    // Notify owner
    if (OWNER_ID) {
        const netName = NETWORKS.find(n => n.id === network)?.name || network;
        bot.sendMessage(OWNER_ID,
            `📡 *New Data Order*\n\n` +
            `👤 ${user.name}\n` +
            `🌐 ${netName} ${plan.label} (${plan.validity})\n` +
            `📱 ${phone}\n` +
            `💰 ₦${plan.price}\n` +
            `🆔 ${order.id.slice(0, 8)}\n\n` +
            `Use /done ${order.id.slice(0, 8)} to mark as delivered`,
            { parse_mode: 'Markdown' }
        );
    }

    res.json({ success: true, orderId: order.id, message: `Order placed! ${NETWORKS.find(n => n.id === network)?.name} ${plan.label} to ${phone}` });
});

// Get order history
app.get('/api/orders', authMiddleware, (req, res) => {
    const db = loadDB();
    const orders = db.orders.filter(o => o.userId === req.userId).sort((a, b) => b.created - a.created);
    res.json(orders);
});

// Get pending payments (for user)
app.get('/api/payments', authMiddleware, (req, res) => {
    const db = loadDB();
    const payments = db.payments.filter(p => p.userId === req.userId).sort((a, b) => b.created - a.created);
    res.json(payments);
});

// ============ OWNER COMMANDS ============

bot.onText(/\/approve (.+)/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const code = msg.match[1].trim();
    const db = loadDB();
    const payment = db.payments.find(p => p.id.startsWith(code) && p.status === 'pending');
    if (!payment) { bot.sendMessage(msg.chat.id, '❌ Payment not found or already processed.'); return; }

    payment.status = 'approved';
    const user = db.users[payment.userId];
    if (user) {
        user.wallet += payment.amount;
        bot.sendMessage(payment.userId, `✅ *Wallet Funded!*\n\n₦${payment.amount} has been added to your wallet.\nNew balance: ₦${user.wallet.toFixed(2)}`, { parse_mode: 'Markdown' });
    }
    saveDB(db);
    bot.sendMessage(msg.chat.id, `✅ Approved ₦${payment.amount} for ${user?.name || 'user'}.`);
});

bot.onText(/\/reject (.+)/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const code = msg.match[1].trim();
    const db = loadDB();
    const payment = db.payments.find(p => p.id.startsWith(code) && p.status === 'pending');
    if (!payment) { bot.sendMessage(msg.chat.id, '❌ Payment not found.'); return; }
    payment.status = 'rejected';
    saveDB(db);
    bot.sendMessage(payment.userId, `❌ Your funding request of ₦${payment.amount} was rejected. Contact support.`);
    bot.sendMessage(msg.chat.id, `❌ Rejected funding for ${code}.`);
});

bot.onText(/\/done (.+)/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const code = msg.match[1].trim();
    const db = loadDB();
    const order = db.orders.find(o => o.id.startsWith(code) && o.status === 'pending');
    if (!order) { bot.sendMessage(msg.chat.id, '❌ Order not found or already processed.'); return; }
    order.status = 'delivered';
    saveDB(db);
    const user = db.users[order.userId];
    const netName = NETWORKS.find(n => n.id === order.network)?.name || order.network;
    if (user) {
        bot.sendMessage(order.userId,
            `✅ *Data Delivered!*\n\n${netName} ${order.planLabel} has been sent to ${order.phone}.\n\nThank you for using Black Blade! ⚡`,
            { parse_mode: 'Markdown' }
        );
    }
    bot.sendMessage(msg.chat.id, `✅ Marked ${code} as delivered.`);
});

bot.onText(/\/users/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const db = loadDB();
    const users = Object.values(db.users);
    const totalWallet = users.reduce((s, u) => s + u.wallet, 0);
    const totalOrders = db.orders.length;
    const pendingOrders = db.orders.filter(o => o.status === 'pending').length;
    const pendingFunds = db.payments.filter(p => p.status === 'pending').length;
    bot.sendMessage(msg.chat.id,
        `📊 *Bot Stats*\n\n` +
        `👥 Users: ${users.length}\n` +
        `💰 Total Wallets: ₦${totalWallet.toFixed(2)}\n` +
        `📦 Total Orders: ${totalOrders}\n` +
        `⏳ Pending Orders: ${pendingOrders}\n` +
        `💵 Pending Funds: ${pendingFunds}`,
        { parse_mode: 'Markdown' }
    );
});

function isAdmin(userId) {
    return userId.toString() === OWNER_ID;
}

// ============ SERVE WEB APP ============
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ============ START ============
app.listen(PORT, () => {
    console.log(`\u2705 Web app running on port ${PORT}`);
});

console.log('\u26a1 Black Blade Data Bot is running...');
bot.on('polling_error', (err) => console.error('[Polling Error]', err.message));
