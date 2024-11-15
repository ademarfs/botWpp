const Usuario = require("./Usuario")

class GerenciadorUsuarios {
  constructor() {
    this.usuarios = new Map()
  }

  obterUsuario(idUsuario) {
    if (!this.usuarios.has(idUsuario)) {
      this.usuarios.set(idUsuario, new Usuario(idUsuario))
    }
    return this.usuarios.get(idUsuario)
  }

  resetarTodosUsuarios() {
    this.usuarios.forEach(usuario => {
      usuario.limparEstado()
    })
  }

  removerUsuario(idUsuario) {
    if (this.usuarios.has(idUsuario)) {
      const usuario = this.usuarios.get(idUsuario)
      usuario.resetarTimeouts()
      this.usuarios.delete(idUsuario)
    }
  }
}

module.exports = GerenciadorUsuarios
