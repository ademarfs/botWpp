const UtilsTempo = require("./utilsTempo")
const Constantes = require("./constantes")

class GerenciadorMensagens {
  static async enviarMensagemComAtraso(msg, cliente, texto, tempoAtraso = Constantes.ATRASO_PADRAO_MENSAGEM) {
    try {
      const chat = await msg.getChat()
      await UtilsTempo.atraso(tempoAtraso)
      await chat.sendStateTyping()
      await UtilsTempo.atraso(tempoAtraso)
      return await cliente.sendMessage(msg.from, texto)
    } catch (erro) {
      console.error("Erro ao enviar mensagem:", erro)
      throw erro
    }
  }
}

module.exports = GerenciadorMensagens
