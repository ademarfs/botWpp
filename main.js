const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const client = new Client();

// Importa funções
const {
    scheduleDailyReset,
    handleMessage,
} = require('./funcoes');

let userState = {};
let userTimeouts = {};
let userEndTimeouts = {};
let userProcessing = {};
let userLastMessageTime = {};

const DEBOUNCE_INTERVAL = 3000;
const numeroIgnorado = [
    '557191416765@c.us',
    '557196196498@c.us',
    '557185244558@c.us',
    '557598958810@c.us',
    '557192057040@c.us',
    '557187212552@c.us',
];
const atendentes = [
    '554699357118@c.us',
    '557182311260@c.us',
];

// Estado de pausa por cliente
let clientPaused = {};

scheduleDailyReset(userState, userTimeouts, userEndTimeouts);

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

client.initialize();

// Captura mensagens enviadas pelo próprio bot (atendente)
client.on('message_create', async msg => {
    if (msg.fromMe) {
        const clientNumber = msg.to;

        // Verifica se a mensagem contém o comando "!" em qualquer parte da mensagem para pausar o bot
        if (msg.body.includes('!')) {
            clientPaused[clientNumber] = true;
            return;
        }

        // Verifica se a mensagem contém o comando "#" em qualquer parte da mensagem para reativar o bot
        if (msg.body.includes('#')) {
            clientPaused[clientNumber] = false;
            return;
        }
    }
});

// Captura mensagens recebidas de clientes
client.on('message', async msg => {
    const isPaused = clientPaused[msg.from] || false;
    // Processa a mensagem apenas se o bot não estiver pausado para este cliente
    if (!isPaused && !atendentes.includes(msg.from)) {
        await handleMessage(msg, client, userTimeouts, userEndTimeouts, userState, userProcessing, userLastMessageTime, numeroIgnorado, DEBOUNCE_INTERVAL);
    }
});
