const Constantes = {
  INTERVALO_DEBOUNCE: 3000, // 3 segundos
  DURACAO_TIMEOUT: 300 * 1000, // 5 minutos
  DURACAO_TIMEOUT_ENCERRAMENTO: 600 * 1000, // 10 minutos
  ATRASO_PADRAO_MENSAGEM: 1500, // 1,5 segundos
  NUMEROS_IGNORADOS: [
    "557191416765@c.us",
    "557196196498@c.us",
    "557185244558@c.us",
    "557598958810@c.us",
    "557192057040@c.us",
    "557187212552@c.us"
  ],
  ATENDENTES: ["554699357118@c.us", "557182311260@c.us"],
  ESTADOS: {
    INICIAL: "iniciouAtendimento1",
    MENU_PRINCIPAL: "iniciouAtendimento2",
    COLABORADOR: "opcaoColaborador",
    CLIENTE: "opcaoCliente",
    ATENDENTE: "atendente"
  },
  MENSAGENS: {
    FORA_HORARIO:
      "Olá, tudo bem? No momento estamos fora do nosso horário comercial. Retornaremos amanhã a partir de 07:35h com o atendimento.",
    ERRO: "Ocorreu um erro inesperado durante o atendimento. Por favor, tente novamente.",
    MENU_PRINCIPAL:
      "Por favor, selecione uma das opções abaixo. Você é um(a):\n\n1 - Colaborador(a) / Vendedor(a)\n2 - Cliente",
    INATIVIDADE: "Ainda está aí? Caso não ocorra mais nenhuma interação, encerraremos o atendimento.",
    ENCERRAMENTO:
      "Como não houve resposta, o atendimento foi encerrado. Caso precise de algo mais, por favor, não hesite em nos contatar. 😊"
  }
}

module.exports = Constantes
