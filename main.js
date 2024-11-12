const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const client = new Client();

// Importa funções
const {
    sendDelayedMessage, // Função p/ enviar mensagens com delay
    startTimeout, // Função p/ iniciar timeout de inatividade
    resetTimeout, // Função p/ resetar o timeout de inatividade
    scheduleDailyReset, 
    handleMessage,// Função p/ agendar um reset diário dos estados dos usuários
} = require('./funcoes');  // Caminho para chamar o arquivo de funções

// Mapas para armazenar estado, respostas e timeouts de inatividade
let userState = {}; // Estado
let userTimeouts = {}; // Timeouts de inatividade (inicial)
let userEndTimeouts = {}; // Timeouts finais para encerrar o atendimento
let userProcessing = {}; // Controle de mensagens em processamento para evitar duplicidades
let userLastMessageTime = {}; // Controle de tempo da última mensagem para evitar spam

// Configura intervalo de debounce (em milissegundos)
const DEBOUNCE_INTERVAL = 3000;

// Números desativados p/ bot
const numeroIgnorado = [
    '557191416765@c.us', // Murilo
    //'557192415136@c.us', // Ademar
    '557196196498@c.us', // Ludmilla
    '557185244558@c.us', // Matheus
    '557598958810@c.us', // Camilla
    '557192057040@c.us', // Danilo
    '557187212552@c.us', // Eduardo
];

// Agendar reset diário dos usuários
scheduleDailyReset(userState, userTimeouts, userEndTimeouts);

// Serviço de leitura do QR Code para autenticar no WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    //console.log('Tudo certo! WhatsApp conectado.');
});

client.initialize();

client.on('message', async msg => {
    await handleMessage(msg, client, userTimeouts, userEndTimeouts, userState, userProcessing, userLastMessageTime, numeroIgnorado, DEBOUNCE_INTERVAL)
});