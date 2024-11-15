const GerenciadorMensagens = require("../utils/gerenciadorMensagens")
const UtilsTempo = require("../utils/utilsTempo")
const Constantes = require("../utils/constantes")
const ControladorEstado = require("./ControladorEstado")

class ControladorMensagens {
  constructor(gerenciadorUsuarios) {
    this.gerenciadorUsuarios = gerenciadorUsuarios
  }

  async tratarMensagem(msg, cliente) {
    const usuario = this.gerenciadorUsuarios.obterUsuario(msg.from)

    if (Constantes.NUMEROS_IGNORADOS.includes(msg.from)) {
      return
    }

    try {
      if (!UtilsTempo.eHorarioComercial()) {
        await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.FORA_HORARIO)
        return
      }

      if (
        usuario.estaProcessando ||
        (usuario.ultimaMensagemTempo && Date.now() - usuario.ultimaMensagemTempo < Constantes.INTERVALO_DEBOUNCE)
      ) {
        return
      }

      usuario.ultimaMensagemTempo = Date.now()
      usuario.estaProcessando = true

      await this.processarMensagem(msg, cliente, usuario)
    } catch (erro) {
      console.error("Erro ao tratar mensagem:", erro)
      await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.ERRO)
    } finally {
      usuario.estaProcessando = false
    }
  }

  async processarMensagem(msg, cliente, usuario) {
    const contact = await msg.getContact()
    const nome = contact.pushname ? contact.pushname.split(" ")[0] : "Cliente"

    // Iniciar novo atendimento
    if (!usuario.estado && msg.from.endsWith("@c.us")) {
      await this.iniciarNovoAtendimento(msg, cliente, usuario, nome)
      return
    }

    // Processar estados existentes
    switch (usuario.estado) {
      case Constantes.ESTADOS.MENU_PRINCIPAL:
        await this.tratarMenuPrincipal(msg, cliente, usuario)
        break
      case Constantes.ESTADOS.COLABORADOR:
        await ControladorEstado.tratarFluxoColaborador(msg, cliente, usuario)
        break
      case Constantes.ESTADOS.CLIENTE:
        await ControladorEstado.tratarFluxoCliente(msg, cliente, usuario)
        break
      case "orcamentoCliente":
        await this.tratarOrcamentoCliente(msg, cliente, usuario)
        break
      case "informarCnpjCliente":
        await this.tratarCnpjCliente(msg, cliente, usuario)
        break
      case "informarDadosOrcamento":
        await this.finalizarAtendimento(msg, cliente, usuario)
        break
      case "novoOrcamento":
      case "statusOrcamento":
      case "desenho":
      case "outrosAssuntos":
      case "prazoCliente":
      case "outrosAssuntosCliente":
        await this.finalizarAtendimento(msg, cliente, usuario)
        break
    }

    if (usuario.estado !== Constantes.ESTADOS.ATENDENTE) {
      ControladorEstado.iniciarTimeoutInatividade(msg, cliente, usuario)
    }
  }

  async iniciarNovoAtendimento(msg, cliente, usuario, nome) {
    usuario.estado = Constantes.ESTADOS.INICIAL
    await GerenciadorMensagens.enviarMensagemComAtraso(
      msg,
      cliente,
      `Olá, ${nome}, tudo bem? A Durit Brasil agradece seu contato. Irei redirecionar a conversa para um de nossos colaboradores(as), mas antes, para um contato mais objetivo, preciso filtrar algumas informações, ok?`
    )
    await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.MENU_PRINCIPAL)
    usuario.estado = Constantes.ESTADOS.MENU_PRINCIPAL
    ControladorEstado.iniciarTimeoutInatividade(msg, cliente, usuario)
  }

  async tratarMenuPrincipal(msg, cliente, usuario) {
    switch (msg.body) {
      case "1":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Selecione uma das opções:\n\n1. Novo orçamento\n2. Status de orçamento\n3. Desenho\n4. Outros assuntos\n\n0. Voltar"
        )
        usuario.estado = Constantes.ESTADOS.COLABORADOR
        break
      case "2":
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Selecione uma das opções:\n\n1. Orçamento\n2. Prazo de entrega\n3. Outros assuntos\n\n0. Voltar"
        )
        usuario.estado = Constantes.ESTADOS.CLIENTE
        break
      default:
        await GerenciadorMensagens.enviarMensagemComAtraso(
          msg,
          cliente,
          "Opção inválida! " + Constantes.MENSAGENS.MENU_PRINCIPAL
        )
        break
    }
  }

  async tratarOrcamentoCliente(msg, cliente, usuario) {
    if (msg.body === "1" || msg.body === "2") {
      usuario.estado = "informarCnpjCliente"
      await GerenciadorMensagens.enviarMensagemComAtraso(
        msg,
        cliente,
        "Por favor, informe o CNPJ da sua empresa (somente os números):"
      )
    } else {
      await GerenciadorMensagens.enviarMensagemComAtraso(
        msg,
        cliente,
        "Opção inválida! Este é o seu primeiro contato conosco?\n\n1 - Sim\n2 - Não"
      )
    }
  }

  async tratarCnpjCliente(msg, cliente, usuario) {
    const cnpj = msg.body.replace(/\D/g, "")
    if (cnpj.length === 14) {
      await GerenciadorMensagens.enviarMensagemComAtraso(
        msg,
        cliente,
        "Envie o máximo de informações possíveis referente ao orçamento que em seguida iremos te atender:\n- dados de contato (nome e e-mail);\n- desenho(s) / foto(s);\n- quantidade;\n- acabamento;\n- material;\n- aplicação;\n- etc;"
      )
      usuario.estado = "informarDadosOrcamento"
    } else {
      await GerenciadorMensagens.enviarMensagemComAtraso(
        msg,
        cliente,
        "CNPJ incorreto! Por favor, insira um CNPJ válido com 14 dígitos numéricos."
      )
    }
  }

  async finalizarAtendimento(msg, cliente, usuario) {
    usuario.estado = Constantes.ESTADOS.ATENDENTE
    usuario.resetarTimeouts()
  }

  async verificarInatividade(msg, cliente, usuario) {
    if (usuario.estado === Constantes.ESTADOS.ATENDENTE) {
      return false
    }

    const tempoInativo = Date.now() - usuario.ultimaMensagemTempo
    if (tempoInativo >= Constantes.DURACAO_TIMEOUT) {
      await this.encerrarAtendimentoPorInatividade(msg, cliente, usuario)
      return true
    }
    return false
  }

  async encerrarAtendimentoPorInatividade(msg, cliente, usuario) {
    await GerenciadorMensagens.enviarMensagemComAtraso(msg, cliente, Constantes.MENSAGENS.ENCERRAMENTO)
    usuario.limparEstado()
  }
}

module.exports = ControladorMensagens
