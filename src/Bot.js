const { Client } = require("whatsapp-web.js")
const qrcode = require("qrcode-terminal")
const cron = require("node-cron")
const GerenciadorUsuarios = require("./models/GerenciadorUsuarios")
const ControladorMensagens = require("./controllers/ControladorMensagens")
const Constantes = require("./utils/constantes")
const UtilsTempo = require("./utils/utilsTempo")

class BotWhatsApp {
  constructor() {
    this.cliente = new Client()
    this.gerenciadorUsuarios = new GerenciadorUsuarios()
    this.controladorMensagens = new ControladorMensagens(this.gerenciadorUsuarios)

    this.inicializarBot()
  }

  inicializarBot() {
    this.cliente.on("qr", qr => {
      qrcode.generate(qr, { small: true })
    })

    this.cliente.on("ready", () => {
      console.log("WhatsApp conectado com sucesso!")
    })

    this.cliente.on("message_create", this.tratarCriacaoMensagem.bind(this))
    this.cliente.on("message", this.tratarMensagemRecebida.bind(this))
    this.cliente.on("disconnected", reason => {
      console.log("WhatsApp desconectado:", reason)
    })

    this.inicializarAgendador()

    this.cliente.initialize().catch(erro => {
      console.error("Erro ao inicializar o cliente:", erro)
    })
  }

  async tratarCriacaoMensagem(msg) {
    if (msg.fromMe) {
      const numeroCliente = msg.to
      const usuario = this.gerenciadorUsuarios.obterUsuario(numeroCliente)

      if (msg.body.includes("!")) {
        usuario.statusPausa = true
        console.log(`Atendimento pausado para ${numeroCliente}`)
      } else if (msg.body.includes("#")) {
        usuario.statusPausa = false
        console.log(`Atendimento reativado para ${numeroCliente}`)
      }
    }
  }

  async tratarMensagemRecebida(msg) {
    try {
      const usuario = this.gerenciadorUsuarios.obterUsuario(msg.from)

      if (!usuario.statusPausa && !Constantes.ATENDENTES.includes(msg.from)) {
        await this.controladorMensagens.tratarMensagem(msg, this.cliente)
      }
    } catch (erro) {
      console.error("Erro ao processar mensagem:", erro)
    }
  }

  inicializarAgendador() {
    cron.schedule(
      "0 */3 * * *",
      () => {
        try {
          this.gerenciadorUsuarios.resetarTodosUsuarios()
          console.log(`Reset realizado em ${UtilsTempo.obterDataFormatada()}`)
        } catch (erro) {
          console.error("Erro ao executar reset programado:", erro)
        }
      },
      {
        timezone: "America/Sao_Paulo"
      }
    )
  }
}

// Inicializar o bot
const bot = new BotWhatsApp()

module.exports = BotWhatsApp
