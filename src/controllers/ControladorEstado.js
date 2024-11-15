const GerenciadorMensagens = require("../utils/gerenciadorMensagens")
const Constantes = require("../utils/constantes")

class ControladorEstado {
  static async iniciarTimeoutInatividade(msg, cliente, usuario) {
    if (usuario.estado === Constantes.ESTADOS.ATENDENTE) {
      return
    }

    usuario.timeouts.inatividade = setTimeout(async () => {
      await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.INATIVIDADE)
      this.iniciarTimeoutEncerramento(msg, cliente, usuario)
    }, Constantes.DURACAO_TIMEOUT)
  }

  static async iniciarTimeoutEncerramento(msg, cliente, usuario) {
    usuario.timeouts.encerramento = setTimeout(async () => {
      await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.ENCERRAMENTO)
      usuario.limparEstado()
    }, Constantes.DURACAO_TIMEOUT_ENCERRAMENTO)
  }

  static async tratarFluxoColaborador(msg, cliente, usuario) {
    switch (msg.body) {
      case "0":
        await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.MENU_PRINCIPAL)
        usuario.estado = Constantes.ESTADOS.MENU_PRINCIPAL
        break
      case "1":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Envie máximo de informações possíveis referente ao orçamento e em seguida iremos te atender:\n- dados de contato;\n- empresa e região / unidade;\n- desenvolvimento? Se sim, relatório;\n- desenho(s) / foto(s);\n- quantidade;\n- acabamento;\n- material;\n- etc;"
        )
        usuario.estado = "novoOrcamento"
        break
      case "2":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Por favor, informe o código, nome, ou CNPJ do cliente e em seguida iremos te atender."
        )
        usuario.estado = "statusOrcamento"
        break
      case "3":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Informe o(s) código(s) do(s) desenho(s) e em seguida iremos te atender."
        )
        usuario.estado = "desenho"
        break
      case "4":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Faça um breve resumo sobre o assunto e em seguida iremos te atender."
        )
        usuario.estado = "outrosAssuntos"
        break
      default:
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Opção inválida! Por favor, selecione uma das opções informadas:\n\n1. Novo orçamento\n2. Status de orçamento\n3. Desenho\n4. Outros assuntos\n\n0. Voltar"
        )
    }
  }

  static async tratarFluxoCliente(msg, cliente, usuario) {
    switch (msg.body) {
      case "0":
        await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.MENU_PRINCIPAL)
        usuario.estado = Constantes.ESTADOS.MENU_PRINCIPAL
        break
      case "1":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Este é o seu primeiro contato conosco?\n\n1 - Sim\n2 - Não"
        )
        usuario.estado = "orcamentoCliente"
        break
      case "2":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Para tratativa de prazo, favor entrar em contato com o setor Comercial através do telefone: (71) 2106-9511 ou pelo e-mail: comercial@durit.com.br."
        )
        usuario.estado = "prazoCliente"
        break
      case "3":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Faça um breve resumo sobre o assunto e em seguida iremos te atender."
        )
        usuario.estado = "outrosAssuntosCliente"
        break
      default:
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Opção inválida! Por favor, selecione uma das opções informadas:\n\n1. Orçamento\n2. Prazo de entrega\n3. Outros assuntos\n\n0. Voltar"
        )
    }
  }
}

module.exports = ControladorEstado
