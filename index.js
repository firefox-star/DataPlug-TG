const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const TOKEN = process.env.BOT_TOKEN || '';
if (!TOKEN) {
    console.error('BOT_TOKEN env required');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
console.log('⚡ Black Blade Bot is running...');

// ============ HELPERS ============

function isAdmin(userId) {
    return userId.toString() === (process.env.OWNER_ID || '');
}

function formatPhone(phone) {
    let p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '234' + p.slice(1);
    if (!p.startsWith('+')) p = '+' + p;
    return p;
}

async function downloadFile(fileId) {
    const link = await bot.getFileLink(fileId);
    return new Promise((resolve, reject) => {
        const client = link.startsWith('https') ? https : http;
        client.get(link, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ============ START / MENU ============

bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name || 'Boss';
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🤖 AI Chat', callback_data: 'ai_chat' },
                    { text: '🎨 Sticker Maker', callback_data: 'sticker_help' }
                ],
                [
                    { text: '🎮 Fun & Games', callback_data: 'fun_menu' },
                    { text: '📊 My Profile', callback_data: 'my_profile' }
                ],
                [
                    { text: '📖 Help', callback_data: 'help' }
                ]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, 
        `⚡ *Welcome to Black Blade, ${name}!*\n\n` +
        `I'm your all-in-one Telegram bot. Pick what you need below:\n\n` +
        `• 🤖 _AI Chat_ — Ask me anything\n` +
        `• 🎨 _Sticker Maker_ — Turn images into stickers\n` +
        `• 🎮 _Fun & Games_ — Dice, coins, jokes, facts\n` +
        `• 🎤 _Voice Notes_ — Send voice, get text\n` +
        `• 📥 _Downloaders_ — TikTok & Instagram videos\n\n` +
        `Just type or tap below 👇`,
        { parse_mode: 'Markdown', ...keyboard }
    );
});

// ============ CALLBACK QUERIES ============

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const name = query.from.first_name || 'Boss';

    switch (data) {
        case 'ai_chat':
            bot.sendMessage(chatId,
                `🤖 *AI Chat Mode*\n\nJust type any question and I'll answer using AI.\n\n` +
                `_Examples:_\n• What is quantum computing?\n• Write me a poem about Lagos\n• Explain blockchain simply\n\n` +
                `Type your question now 👇`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'sticker_help':
            bot.sendMessage(chatId,
                `🎨 *Sticker Maker*\n\nSend me any image (photo) and I'll convert it to a WhatsApp-style sticker.\n\n` +
                `_Tips:_\n• Square images work best\n• Send the image directly (not as a file)\n• I'll auto-crop it to 512x512\n\nSend an image now 👇`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'fun_menu':
            bot.sendMessage(chatId,
                `🎮 *Fun & Games*\n\nTap a command below:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🎲 Roll Dice', callback_data: 'fun_dice' },
                                { text: '🪙 Flip Coin', callback_data: 'fun_coin' }
                            ],
                            [
                                { text: '😂 Random Joke', callback_data: 'fun_joke' },
                                { text: '🧠 Random Fact', callback_data: 'fun_fact' }
                            ],
                            [
                                { text: '🔥 Roast Me', callback_data: 'fun_roast' },
                                { text: '💰 Rate My Hustle', callback_data: 'fun_hustle' }
                            ],
                            [
                                { text: '🎯 8-Ball', callback_data: 'fun_8ball' },
                                { text: '🎭 Pick a Dare', callback_data: 'fun_dare' }
                            ],
                            [
                                { text: '« Back to Menu', callback_data: 'back_menu' }
                            ]
                        ]
                    }
                }
            );
            break;

        case 'fun_dice':
            const dice = Math.floor(Math.random() * 6) + 1;
            bot.sendDice(chatId, '🎲');
            bot.sendMessage(chatId, `🎲 You rolled a *${dice}*!`, { parse_mode: 'Markdown' });
            break;

        case 'fun_coin':
            const coin = Math.random() > 0.5 ? 'Heads' : 'Tails';
            const coinEmoji = coin === 'Heads' ? '👑' : '🦅';
            bot.sendMessage(chatId, `${coinEmoji} The coin landed on *${coin}*!`, { parse_mode: 'Markdown' });
            break;

        case 'fun_joke': {
            const jokes = [
                'Why don\'t scientists trust atoms? Because they make up everything! 😂',
                'I told my wife she was drawing her eyebrows too high. She looked surprised. 😂',
                'Why did the scarecrow win an award? He was outstanding in his field! 🌾😂',
                'Parallel lines have so much in common. It\'s a shame they\'ll never meet. 📐😂',
                'I\'m reading a book about anti-gravity. It\'s impossible to put down! 📚😂',
                'Why don\'t eggs tell jokes? They\'d crack each other up! 🥚😂',
                'What do you call a fake noodle? An impasta! 🍝😂',
                'Why did the coffee file a police report? It got mugged! ☕😂',
                'I used to hate facial hair, but then it grew on me. 🧔😂',
                'What do you call a bear with no teeth? A gummy bear! 🐻😂',
                'Nigerian traffic: where 1 hour becomes 3 hours. 🚗😂',
                'NEPA took light? More like NEPA took my happiness. 💡😂'
            ];
            bot.sendMessage(chatId, `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}`);
            break;
        }

        case 'fun_fact': {
            const facts = [
                '🧠 Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.',
                '🧠 Octopuses have three hearts and blue blood.',
                '🧠 A group of flamingos is called a "flamboyance".',
                '🧠 Bananas are berries, but strawberries aren\'t.',
                '🧠 The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).',
                '🧠 Nigeria has over 500 spoken languages.',
                '🧠 A day on Venus is longer than a year on Venus.',
                '🧠 The human brain uses about 20% of the body\'s total energy.',
                '🧠 There are more possible iterations of a game of chess than there are atoms in the observable universe.',
                '🧠 WhatsApp was founded in 2009 by a former Yahoo employee.'
            ];
            bot.sendMessage(chatId, facts[Math.floor(Math.random() * facts.length)]);
            break;
        }

        case 'fun_roast': {
            const roasts = [
                `You're like a cloud. When you disappear, it's a beautiful day. 🔥`,
                `I'd explain it to you, but I left my crayons at home. 🔥`,
                `You're the reason they put instructions on shampoo. 🔥`,
                `Your phone has more GB than your bank account. 🔥`,
                `You're not stupid, you're just... accidentally amazing at being wrong. 🔥`,
                `If ignorance is bliss, you must be the happiest person alive. 🔥`,
                `You're like a software update — nobody asked for you. 🔥`,
                `I'd agree with you but then we'd both be wrong. 🔥`
            ];
            bot.sendMessage(chatId, roasts[Math.floor(Math.random() * roasts.length)]);
            break;
        }

        case 'fun_hustle': {
            const rates = [
                `💰 Your hustle rate: 9.5/10 \nFuture Dangote detected! 🏭`,
                `💰 Your hustle rate: 7/10 \nYou dey try, just keep pushing! 💪`,
                `💰 Your hustle rate: 8.5/10 \nOmo this one na CEO material! 📈`,
                `💰 Your hustle rate: 6/10 \nYou need more sleep and more grinding 😤`,
                `💰 Your hustle rate: 10/10 \nLion of the Savannah! No cap! 🦁`
            ];
            bot.sendMessage(chatId, rates[Math.floor(Math.random() * rates.length)], { parse_mode: 'Markdown' });
            break;
        }

        case 'fun_8ball': {
            const answers = [
                '🎱 Yes, definitely!',
                '🎱 Nah, not happening.',
                '🎱 Ask again later...',
                '🎱 100% yes!',
                '🎱 My sources say no 💀',
                '🎱 Outlook not so good',
                '🎱 It is certain!',
                '🎱 Don\'t count on it',
                '🎱 Reply hazy, try again',
                '🎱 Signs point to yes! ✨'
            ];
            bot.sendMessage(chatId, answers[Math.floor(Math.random() * answers.length)]);
            break;
        }

        case 'fun_dare': {
            const dares = [
                '🎭 Send "I love you" to the 5th person in your chat list and screenshot the reaction.',
                '🎭 Type everything in ALL CAPS for the next 10 minutes.',
                '🎭 Send a voice note singing the Nigerian anthem.',
                '🎭 Let me roast you (type "roast me" after this).',
                '🎭 Send your most embarrassing photo to this chat.',
                '🎭 Call someone and say "I\'m your biggest fan" then hang up.',
                '🎭 Send a message to your crush right now. No excuses. 💀',
                '🎭 Change your profile pic to something ridiculous for 1 hour.',
                '🎭 Send "I need help" to a random contact and see what happens.'
            ];
            bot.sendMessage(chatId, dares[Math.floor(Math.random() * dares.length)]);
            break;
        }

        case 'my_profile':
            bot.sendMessage(chatId,
                `📊 *Your Profile*\n\n` +
                `• Name: *${query.from.first_name || 'Unknown'}* ${query.from.last_name || ''}\n` +
                `• Username: @${query.from.username || 'Not set'}\n` +
                `• User ID: \`${query.from.id}\`\n` +
                `• Language: ${query.from.language_code || 'Unknown'}\n` +
                `• Bot: ${query.from.is_bot ? 'Yes' : 'No'}\n` +
                `• Account Type: ${query.from.is_premium ? 'Premium ⭐' : 'Standard'}`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'help':
            bot.sendMessage(chatId,
                `📖 *Black Blade Commands*\n\n` +
                `*AI & Chat*\n` +
                `• Just type any question → AI responds\n• \`/ask <question>\` — Quick AI answer\n\n` +
                `*Sticker Maker*\n` +
                `• Send any photo → Get sticker back\n\n` +
                `*Voice Notes*\n` +
                `• Send a voice note → Get text transcription\n\n` +
                `*Downloaders*\n` +
                `• Send a TikTok/Instagram link → Get video\n\n` +
                `*Utilities*\n` +
                `• \`/weather <city>\` — Weather info\n` +
                `• \`/calc <expression>\` — Calculator\n` +
                `• \`/translate <text>\` — Translate to English\n` +
                `• \`/qr <text>\` — Generate QR code\n\n` +
                `*Fun*\n` +
                `• \`/dice\` — Roll a dice\n` +
                `• \`/coin\` — Flip a coin\n` +
                `• \`/joke\` — Random joke\n` +
                `• \`/fact\` — Random fact\n` +
                `• \`/8ball\` — Magic 8-ball\n` +
                `• \`/dare\` — Random dare\n` +
                `• \`/roast\` — Get roasted\n\n` +
                `• \`/start\` — Main menu`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'back_menu':
            bot.sendMessage(chatId, '⚡ Use /start to open the main menu.');
            break;
    }

    bot.answerCallbackQuery(query.id);
});

// ============ AI CHAT (catches all text messages) ============

bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands
    if (text.startsWith('/')) return;

    // Skip URLs (handled by link handler)
    if (/https?:\/\/(www\.)?(tiktok|instagram)\.com/.test(text)) return;

    // AI Chat — respond to any text message
    const thinking = await bot.sendMessage(chatId, '🤔 *Thinking...*', { parse_mode: 'Markdown' });

    try {
        const response = await axios.post('https://api.shizo.xyz/api/v1/ai/chatgpt', {
            prompt: text
        }, { timeout: 30000 });

        const answer = response.data?.result || response.data?.answer || response.data?.data || 
                       response.data?.msg || response.data?.response ||
                       (typeof response.data === 'string' ? response.data : null);

        if (answer) {
            await bot.editMessageText(`🤖 *AI Response:*\n\n${answer}`, {
                chat_id: chatId,
                message_id: thinking.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            await bot.editMessageText('🤖 *AI Response:*\n\nHmm, I couldn\'t generate a response. Try again.', {
                chat_id: chatId,
                message_id: thinking.message_id,
                parse_mode: 'Markdown'
            });
        }
    } catch (err) {
        console.error('[AI Error]', err.message);
        await bot.editMessageText(`🤖 *AI is currently busy.*\n\nError: ${err.message}\n\nTry again in a moment.`, {
            chat_id: chatId,
            message_id: thinking.message_id,
            parse_mode: 'Markdown'
        });
    }
});

// ============ STICKER MAKER (photos → stickers) ============

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const status = await bot.sendMessage(chatId, '🎨 Converting to sticker...');

    try {
        const photo = msg.photo[msg.photo.length - 1]; // highest resolution
        const buffer = await downloadFile(photo.file_id);

        // Resize to 512x512 and convert to webp
        const stickerBuffer = await sharp(buffer)
            .resize(512, 512, { fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer();

        await bot.deleteMessage(chatId, status.message_id);
        await bot.sendSticker(chatId, stickerBuffer);
    } catch (err) {
        console.error('[Sticker Error]', err.message);
        bot.editMessageText('❌ Failed to create sticker. Try sending the image again.', {
            chat_id: chatId,
            message_id: status.message_id
        });
    }
});

// ============ VOICE NOTE TRANSCRIPTION ============

bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const status = await bot.sendMessage(chatId, '🎤 Processing voice note...');

    try {
        const fileId = msg.voice.file_id;
        const link = await bot.getFileLink(fileId);

        // Use free Whisper API or a simple approach
        // For now we'll use a free transcription service
        const formData = new URLSearchParams();
        formData.append('audio_url', link);

        const response = await axios.post('https://api.deepgram.com/v1/listen?model=nova-2&language=multi', {
            url: link
        }, {
            headers: {
                'Authorization': `Token ${process.env.DEEPGRAM_KEY || ''}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        if (response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
            const transcript = response.data.results.channels[0].alternatives[0].transcript;
            await bot.editMessageText(`🎤 *Transcript:*\n\n"${transcript}"`, {
                chat_id: chatId,
                message_id: status.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            await bot.editMessageText('🎤 Could not transcribe this voice note. Make sure it\'s clear and in English.', {
                chat_id: chatId,
                message_id: status.message_id
            });
        }
    } catch (err) {
        console.error('[Voice Error]', err.message);
        await bot.editMessageText('🎤 Voice transcription requires a Deepgram API key. Set DEEPGRAM_KEY env variable.', {
            chat_id: chatId,
            message_id: status.message_id
        });
    }
});

// ============ DOWNLOADERS (TikTok & Instagram) ============

bot.on('text', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text;

    // TikTok
    const tiktokMatch = text.match(/https?:\/\/(www\.)?tiktok\.com\/[\S]+/);
    if (tiktokMatch) {
        const status = await bot.sendMessage(chatId, '📥 Downloading TikTok video...');
        try {
            const url = tiktokMatch[0];
            // Use tikwm API (free, no key needed)
            const resp = await axios.post('https://www.tikwm.com/api/', {
                url: url,
                hd: 1
            }, { timeout: 15000 });

            if (resp.data?.code === 0 && resp.data?.data?.play) {
                const videoUrl = resp.data.data.hd ? resp.data.data.hdplay : resp.data.data.play;
                await bot.deleteMessage(chatId, status.message_id);
                await bot.sendVideo(chatId, videoUrl, {
                    caption: `⚡ *${resp.data.data.title || 'TikTok Video'}*\n👤 @${resp.data.data.author?.unique_id || 'unknown'}`,
                    parse_mode: 'Markdown'
                });
            } else {
                throw new Error('Could not fetch video');
            }
        } catch (err) {
            console.error('[TikTok Error]', err.message);
            bot.editMessageText(`❌ Failed to download TikTok video.\n\n${err.message}`, {
                chat_id: chatId,
                message_id: status.message_id
            });
        }
        return;
    }

    // Instagram
    const instaMatch = text.match(/https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\S]+/);
    if (instaMatch) {
        const status = await bot.sendMessage(chatId, '📥 Downloading Instagram post...');
        try {
            const url = instaMatch[0];
            const resp = await axios.get(`https://api.savefrom.biz/save.php?url=${encodeURIComponent(url)}`, {
                timeout: 15000
            });

            if (resp.data?.url) {
                await bot.deleteMessage(chatId, status.message_id);
                const isVideo = resp.data.url.includes('.mp4');
                if (isVideo) {
                    await bot.sendVideo(chatId, resp.data.url);
                } else {
                    await bot.sendPhoto(chatId, resp.data.url);
                }
            } else {
                throw new Error('Could not fetch media');
            }
        } catch (err) {
            console.error('[Instagram Error]', err.message);
            // Fallback to another service
            try {
                const url = instaMatch[0];
                const resp2 = await axios.get(`https://co.wuk.sh/api/json`, {
                    params: { url, a: '1', p: 'home', s: '0', v: 'v2' },
                    timeout: 15000
                });

                if (resp2.data?.url) {
                    await bot.editMessageText('📥 Downloading (fallback)...', {
                        chat_id: chatId,
                        message_id: status.message_id
                    });
                    await bot.deleteMessage(chatId, status.message_id);
                    await bot.sendVideo(chatId, resp2.data.url);
                } else {
                    throw new Error('No download URL found');
                }
            } catch (err2) {
                bot.editMessageText('❌ Failed to download Instagram post. Try sending the link as text only (no caption).', {
                    chat_id: chatId,
                    message_id: status.message_id
                });
            }
        }
        return;
    }
});

// ============ TEXT COMMANDS ============

// Dice
bot.onText(/\/dice/, (msg) => {
    bot.sendDice(msg.chat.id, '🎲');
});

// Coin
bot.onText(/\/coin/, (msg) => {
    const coin = Math.random() > 0.5 ? 'Heads 👑' : 'Tails 🦅';
    bot.sendMessage(msg.chat.id, `🪙 *${coin}*!`, { parse_mode: 'Markdown' });
});

// Joke
bot.onText(/\/joke/, (msg) => {
    const jokes = [
        'Why don\'t scientists trust atoms? Because they make up everything! 😂',
        'I told my wife she was drawing her eyebrows too high. She looked surprised. 😂',
        'Why did the scarecrow win an award? Outstanding in his field! 🌾😂',
        'Parallel lines have so much in common. It\'s a shame they\'ll never meet. 📐😂',
        'I\'m reading a book about anti-gravity. Impossible to put down! 📚😂',
        'What do you call a fake noodle? An impasta! 🍝😂',
        'Why did the coffee file a police report? It got mugged! ☕😂',
        'NEPA took light? More like NEPA took my happiness. 💡😂',
        'Why don\'t eggs tell jokes? They\'d crack each other up! 🥚😂',
        'What do you call a bear with no teeth? A gummy bear! 🐻😂'
    ];
    bot.sendMessage(msg.chat.id, `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}`);
});

// Fact
bot.onText(/\/fact/, (msg) => {
    const facts = [
        '🧠 Honey never spoils. 3000-year-old honey was found still edible in Egyptian tombs.',
        '🧠 Octopuses have three hearts and blue blood.',
        '🧠 A group of flamingos is called a "flamboyance".',
        '🧠 Bananas are berries, but strawberries aren\'t.',
        '🧠 The shortest war lasted 38 minutes (Britain vs Zanzibar, 1896).',
        '🧠 Nigeria has over 500 spoken languages.',
        '🧠 A day on Venus is longer than a year on Venus.',
        '🧠 There are more chess possibilities than atoms in the universe.'
    ];
    bot.sendMessage(msg.chat.id, facts[Math.floor(Math.random() * facts.length)]);
});

// 8ball
bot.onText(/\/8ball/, (msg) => {
    const answers = [
        '🎱 Yes, definitely!', '🎱 Nah, not happening.', '🎱 Ask again later...',
        '🎱 100% yes!', '🎱 My sources say no 💀', '🎱 Outlook not so good',
        '🎱 It is certain!', '🎱 Don\'t count on it', '🎱 Signs point to yes! ✨'
    ];
    bot.sendMessage(msg.chat.id, answers[Math.floor(Math.random() * answers.length)]);
});

// Dare
bot.onText(/\/dare/, (msg) => {
    const dares = [
        '🎭 Send "I love you" to the 5th person in your chat list and screenshot the reaction.',
        '🎭 Type everything in ALL CAPS for the next 10 minutes.',
        '🎭 Send a voice note singing the Nigerian anthem.',
        '🎭 Call someone and say "I\'m your biggest fan" then hang up.',
        '🎭 Send your most embarrassing photo to this chat.',
        '🎭 Change your profile pic to something ridiculous for 1 hour.',
        '🎭 Send "I need help" to a random contact and see what happens.'
    ];
    bot.sendMessage(msg.chat.id, dares[Math.floor(Math.random() * dares.length)]);
});

// Roast
bot.onText(/\/roast/, (msg) => {
    const name = msg.from.first_name || 'my friend';
    const roasts = [
        `${name}, you're like a cloud. When you disappear, it's a beautiful day. 🔥`,
        `${name}, I'd explain it to you but I left my crayons at home. 🔥`,
        `${name}, you're the reason they put instructions on shampoo. 🔥`,
        `${name}, your phone has more GB than your bank account. 🔥`,
        `${name}, you're not stupid, you're just accidentally amazing at being wrong. 🔥`,
        `${name}, if ignorance is bliss, you must be the happiest person alive. 🔥`,
        `${name}, you're like a software update — nobody asked for you. 🔥`
    ];
    bot.sendMessage(msg.chat.id, roasts[Math.floor(Math.random() * roasts.length)]);
});

// Weather
bot.onText(/\/weather (.+)/, async (msg) => {
    const city = msg.match[1];
    const status = await bot.sendMessage(msg.chat.id, `🌤 Checking weather for *${city}*...`, { parse_mode: 'Markdown' });
    try {
        const resp = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 10000 });
        const current = resp.data.current_condition[0];
        const area = resp.data.nearest_area[0];
        const result =
            `🌤 *Weather in ${area.areaName[0].value}, ${area.country[0].value}*\n\n` +
            `• Temp: *${current.temp_C}°C* (${current.temp_F}°F)\n` +
            `• Feels like: ${current.FeelsLikeC}°C\n` +
            `• Condition: ${current.weatherDesc[0].value}\n` +
            `• Humidity: ${current.humidity}%\n` +
            `• Wind: ${current.windspeedKmph} km/h\n` +
            `• Visibility: ${current.visibility} km`;
        bot.editMessageText(result, { chat_id: msg.chat.id, message_id: status.message_id, parse_mode: 'Markdown' });
    } catch (err) {
        bot.editMessageText(`❌ Could not find weather for "${city}".`, { chat_id: msg.chat.id, message_id: status.message_id });
    }
});

// Calculator
bot.onText(/\/calc (.+)/, (msg) => {
    const expr = msg.match[1].replace(/[^0-9+\-*/().%^ ]/g, '');
    try {
        const safeExpr = expr.replace(/\^/g, '**');
        const result = Function(`"use strict"; return (${safeExpr})`)();
        bot.sendMessage(msg.chat.id, `🧮 *${expr} = ${result}*`, { parse_mode: 'Markdown' });
    } catch {
        bot.sendMessage(msg.chat.id, '❌ Invalid expression. Example: /calc 25 * 4 + 10');
    }
});

// QR Code
bot.onText(/\/qr (.+)/, async (msg) => {
    const text = msg.match[1];
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`;
        await bot.sendPhoto(msg.chat.id, qrUrl, { caption: `📱 QR Code for: ${text}` });
    } catch (err) {
        bot.sendMessage(msg.chat.id, '❌ Failed to generate QR code.');
    }
});

// ============ ERROR HANDLING ============

bot.on('polling_error', (err) => {
    console.error('[Polling Error]', err.message);
});

bot.on('error', (err) => {
    console.error('[Bot Error]', err.message);
});

// Keep alive
setInterval(() => {
    https.get('https://api.telegram.org');
}, 280000);

console.log('✅ Bot is ready and listening for messages!');
