const cron = require('node-cron'); // Importa o módulo "node-cron" p/ agendamento de tarefas
const delay = ms => new Promise(res => setTimeout(res, ms)); // Função de delay

function hourComerce() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Verifica se é um dia útil (segunda a sexta)
    // Verifica se está dentro do horário comercial (7h às 17:20h)
    const isBusinessHours = (hour > 7 || (hour === 7 && minute >= 0)) && (hour < 17 || (hour === 17 && minute <= 20));
    return isWeekday && isBusinessHours;
}

// Função auxiliar para verificar se o estado atual é o estado final
function isFinalState(state) {
    const finalStates = ['atendente'];  
    return finalStates.includes(state); 
}

// Função para enviar mensagem com delay
async function sendDelayedMessage(time, msg, texto, client) {
    const chat = await msg.getChat();
    await delay(time);
    await chat.sendStateTyping();
    await delay(time);
    await client.sendMessage(msg.from, texto);
}

// Função para iniciar o timeout de inatividade
function startTimeout(msg, client, userTimeouts, userEndTimeouts, userState) {
    const timeoutDuration = 300 * 1000;
    if (isFinalState(userState[msg.from])) {
        return;
    }
    if (userTimeouts[msg.from]) {
        clearTimeout(userTimeouts[msg.from]);
    }
    userTimeouts[msg.from] = setTimeout(async () => {
        await client.sendMessage(msg.from, 'Ainda está aí? Caso não ocorra mais nenhuma interação, encerraremos o atendimento.');
        startEndTimeout(msg, client, userEndTimeouts, userState);
    }, timeoutDuration);
}

// Função para iniciar o timeout final que encerra o atendimento
function startEndTimeout(msg, client, userEndTimeouts, userState) {
    const endTimeoutDuration = 600 * 1000;
    if (userEndTimeouts[msg.from]) {
        clearTimeout(userEndTimeouts[msg.from]);
    }
    userEndTimeouts[msg.from] = setTimeout(async () => {
        await client.sendMessage(msg.from, 'Como não houve resposta, o atendimento foi encerrado. Caso precise de algo mais, por favor, nao hesite em nos contatar. 😊');
        if (userState) {
            userState[msg.from] = undefined; // Reseta o estado do usuário
        }
    }, endTimeoutDuration);
}

// Função para resetar os timeouts, com verificação de estado final
function resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState, skipStartTimeout = false) {
    if (isFinalState(userState[msg.from])) {
        return;
    }
    if (userTimeouts[msg.from]) {
        clearTimeout(userTimeouts[msg.from]);
    }
    if (userEndTimeouts[msg.from]) {
        clearTimeout(userEndTimeouts[msg.from]);
    }
    if (!skipStartTimeout) {
        startTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
    }
}

// Função para agendar o reset diário
function scheduleDailyReset(userState, userTimeouts, userEndTimeouts) {
    cron.schedule('0 */3 * * *', () => {
        Object.keys(userState).forEach(user => {
            userState[user] = undefined;
            if (userTimeouts[user]) {
                clearTimeout(userTimeouts[user]);
                delete userTimeouts[user]; // Remove o timeout
            }
            if (userEndTimeouts[user]) {
                clearTimeout(userEndTimeouts[user]);
                delete userEndTimeouts[user]; // Remove o timeout final
            }
        });
        const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`Reset diário concluído com sucesso às ${dataAtual}.`);
    }, {
        timezone: "America/Sao_Paulo" // Defina o fuso horário apropriado
    });
}

// Função do fluxo de atendimento
async function handleMessage(msg, client, userTimeouts, userEndTimeouts, userState, userProcessing, userLastMessageTime, numeroIgnorado, DEBOUNCE_INTERVAL) {
    const userId = msg.from;
    const now = Date.now();

    if (numeroIgnorado.includes(userId)) {
        return;
    }

    // Verifica se já estamos processando uma mensagem deste usuário ou se ele enviou uma mensagem em sequência muito rapidamente
    if (userProcessing[userId] || (userLastMessageTime[userId] && (now - userLastMessageTime[userId]) < DEBOUNCE_INTERVAL)) {
        return;
    }

    // Atualiza o timestamp da última mensagem e define o usuário como "em processamento"
    userLastMessageTime[userId] = now;
    userProcessing[userId] = true;

    // Função para marcar o processamento como concluído
    const markProcessingComplete = () => {
        userProcessing[userId] = false;
    };

    try {
        // Obtém informações do chat e do contato do usuário
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname ? contact.pushname.split(" ")[0] : 'Cliente'; // Primeiro nome do cliente no WhatsApp

        if (hourComerce()) {
            // INICIO DO ATENDIMENTO AUTOMÁTICO (BOAS-VINDAS E PRIMEIRO MENU)
            if (!userState[msg.from]) {
                if (msg.from.endsWith('@c.us')) {
                    userState[msg.from] = 'iniciouAtendimento1';
                    await sendDelayedMessage(1500, msg, `Olá, ${name}, tudo bem? A Durit Brasil agradece seu contato. Irei redirecionar a conversa para um de nossos colaboradores(as), mas antes, para um contato mais objetivo, preciso filtrar algumas informações, ok?`, client);
                    await sendDelayedMessage(1500, msg, 'Por favor, selecione uma das opções abaixo. Você é um(a):\n\n1 - Colaborador(a) / Vendedor(a)\n2 - Cliente', client);
                    userState[msg.from] = 'iniciouAtendimento2';
                    startTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                    markProcessingComplete();  
                    return;
                }
            }
            // MENU PRINCIPAL DE ESCOLHA (COLABORADOR OU CLIENTE)
            if (userState[msg.from] === 'iniciouAtendimento2') {
                switch (msg.body) {
                    case '1': // Opção Colaborador
                        await sendDelayedMessage(1500, msg, 'Selecione uma das opções:\n\n1. Novo orçamento\n2. Status de orçamento\n3. Desenho\n4. Outros assuntos\n\n0. Voltar', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'opcaoColaborador';
                        break;

                    case '2': // Opção Cliente
                        await sendDelayedMessage(1500, msg, 'Selecione uma das opções:\n\n1. Orçamento\n2. Prazo de entrega\n3. Outros assuntos\n\n0. Voltar', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'opcaoCliente';
                        break;
                    default:
                        await sendDelayedMessage(1500, msg, 'Opção inválida! Por favor, selecione uma das opções informadas:\n\n1 - Colaborador(a) / Vendedor(a)\n2 - Cliente', client);
                        break;
                }
                markProcessingComplete();
                return;
            }

            // BLOCO PARA A OPÇÃO COLABORADOR
            if (userState[msg.from] === 'opcaoColaborador') {
                switch (msg.body) {
                    case '0':
                        await sendDelayedMessage(1500, msg, 'Por favor, selecione uma das opções abaixo. Você é um(a):\n\n1 - Colaborador(a) / Vendedor(a)\n2 - Cliente', client);
                        userState[msg.from] = 'iniciouAtendimento2';
                        break;
                    case '1':
                        await sendDelayedMessage(1500, msg, 'Envie máximo de informações possíveis referente ao orçamento e em seguida iremos te atender:\n- dados de contato;\n- empresa e região / unidade;\n- desenvolvimento? Se sim, relatório;\n- desenho(s) / foto(s);\n- quantidade;\n- acabamento;\n- material;\n- etc;', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'novoOrcamento';
                        break;
                    case '2':
                        await sendDelayedMessage(1500, msg, 'Por favor, informe o código, nome, ou CNPJ do cliente e em seguida iremos te atender.', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'statusOrcamento';
                        break;
                    case '3':
                        await sendDelayedMessage(1500, msg, 'Informe o(s) código(s) do(s) desenho(s) e em seguida iremos te atender.', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'desenho';
                        break;
                    case '4':
                        await sendDelayedMessage(1500, msg, 'Faça um breve resumo sobre o assunto e em seguida iremos te atender.', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'outrosAssuntos';
                        break;
                    default:
                        await sendDelayedMessage(1500, msg, 'Opção inválida! Por favor, selecione uma das opções informadas:\n\n1. Novo orçamento\n2. Status de orçamento\n3. Desenho\n4. Outros assuntos\n\n0. Voltar', client);
                        break;
                }
                markProcessingComplete();
                return;
            }

            // MANIPULAÇÕES DE STATUS PÓS ESCOLHA DE COLABORADOR
            if (['novoOrcamento', 'statusOrcamento', 'desenho', 'outrosAssuntos'].includes(userState[msg.from])) {
                userState[msg.from] = 'atendente';
                clearTimeout(userTimeouts[msg.from]);
                clearTimeout(userEndTimeouts[msg.from]);
                markProcessingComplete();
                return;
            }   

            // BLOCO PARA A OPÇÃO CLIENTE
            if (userState[msg.from] === 'opcaoCliente') {
                switch (msg.body) {
                    case '0':
                        await sendDelayedMessage(1500, msg, 'Por favor, selecione uma das opções abaixo. Você é um(a):\n\n1 - Colaborador(a) / Vendedor(a)\n2 - Cliente', client);
                        userState[msg.from] = 'iniciouAtendimento2';
                        break;
                    case '1':
                        await sendDelayedMessage(1500, msg, 'Este é o seu primeiro contato conosco?\n\n1 - Sim\n2 - Não', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'orcamentoCliente';
                        break;
                    case '2':
                        await sendDelayedMessage(1500, msg, 'Para tratativa de prazo, favor entrar em contato com o setor Comercial através do telefone: (71) 2106-9511 ou pelo e-mail: comercial@durit.com.br. ', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState, true);
                        userState[msg.from] = 'prazoCliente';
                        break;
                    case '3':
                        await sendDelayedMessage(1500, msg, 'Faça um breve resumo sobre o assunto e em seguida iremos te atender.', client);
                        resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                        userState[msg.from] = 'outrosAssuntosCliente';
                        break;
                    default:
                        await sendDelayedMessage(1500, msg, 'Opção inválida! Por favor, selecione uma das opções informadas:\n\n1. Orçamento\n2. Prazo de entrega\n3. Outros assuntos\n\n0. Voltar', client);
                        break;
                }
                markProcessingComplete();
                return;
            }

            // CLIENTE - INFORMAÇÃO DE CNPJ
            if (userState[msg.from] === 'orcamentoCliente') {
                if (msg.body === '1' || msg.body === '2') {
                    // Caso uma opção válida seja selecionada (1 ou 2), envia a mensagem para solicitar o CNPJ e altera o estado
                    userState[msg.from] = 'informarCnpjCliente';
                    await sendDelayedMessage(1500, msg, 'Por favor, informe o CNPJ da sua empresa (somente os números):', client);
                    resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                } else {
                    await sendDelayedMessage(1500, msg, 'Opção inválida! Por favor, selecione uma das opções informadas. Este é o seu primeiro contato conosco?\n\n1 - Sim\n2 - Não', client);
                }
                markProcessingComplete();
                return;
            }

            // CLIENTE - VERIFICAÇÃO DO CNPJ
            if (userState[msg.from] === 'informarCnpjCliente') {
                const cnpj = msg.body.replace(/\D/g, ''); // Remove caracteres não numéricos
                if (cnpj.length === 14) { // Verifica se o CNPJ tem 14 dígitos
                    await sendDelayedMessage(1500, msg, 'Envie o máximo de informações possíveis referente ao orçamento que em seguida iremos te atender:\n- dados de contato (nome e e-mail);\n- desenho(s) / foto(s);\n- quantidade;\n- acabamento;\n- material;\n- aplicação;\n- etc;', client);
                    resetTimeout(msg, client, userTimeouts, userEndTimeouts, userState);
                    userState[msg.from] = 'informarDadosOrcamento';
                } else {
                    await sendDelayedMessage(1500, msg, 'CNPJ incorreto! Por favor, insira um CNPJ válido com 14 dígitos numéricos.', client);
                }
                markProcessingComplete();
                return;
            }

            // MANIPULAÇÕES DE STATUS, PÓS ESCOLHA DO CLIENTE, PARA ATENDENTE
            if (['orcamentoCliente', 'informarDadosOrcamento', 'prazoCliente', 'outrosAssuntosCliente'].includes(userState[msg.from])) {
                userState[msg.from] = 'atendente';
                clearTimeout(userTimeouts[msg.from]);
                clearTimeout(userEndTimeouts[msg.from]);
                markProcessingComplete();
                return;
            }   
        } else {
            await sendDelayedMessage(1500, msg, 'Olá, tudo bem? No momento estamos fora do nosso horário comercial. Retornaremos amanhã a partir de 07:35h com o atendimento.', client);
        }
    } catch (error) {
        await sendDelayedMessage(1500, msg, 'Ocorreu um erro inesperado durante o atendimento. Por favor, tente novamente.', client);
    } finally {
        markProcessingComplete();
    }
}

module.exports = {
    delay,
    sendDelayedMessage,
    startTimeout,
    startEndTimeout,
    resetTimeout,
    isFinalState,
    scheduleDailyReset,
    handleMessage,
};