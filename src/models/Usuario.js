class Usuario {
  constructor(id, estado = null, statusPausa = false) {
    this.id = id
    this.estado = estado
    this.ultimaMensagemTempo = null
    this.estaProcessando = false
    this.timeouts = {
      inatividade: null,
      encerramento: null
    }
    this.statusPausa = statusPausa
  }

  resetarTimeouts() {
    if (this.timeouts.inatividade) {
      clearTimeout(this.timeouts.inatividade)
      this.timeouts.inatividade = null
    }
    if (this.timeouts.encerramento) {
      clearTimeout(this.timeouts.encerramento)
      this.timeouts.encerramento = null
    }
  }

  limparEstado() {
    this.estado = null
    this.resetarTimeouts()
    this.estaProcessando = false
  }
}

module.exports = Usuario
