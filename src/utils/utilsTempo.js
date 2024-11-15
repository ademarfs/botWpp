class UtilsTempo {
  static eHorarioComercial() {
    const agora = new Date()
    const diaDaSemana = agora.getDay()
    const hora = agora.getHours()
    const minuto = agora.getMinutes()

    const eDiaUtil = diaDaSemana >= 1 && diaDaSemana <= 5
    const eHorarioComercial = (hora > 7 || (hora === 7 && minuto >= 0)) && (hora < 17 || (hora === 17 && minuto <= 20))

    return eDiaUtil && eHorarioComercial
  }

  static atraso(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static obterDataFormatada() {
    return new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    })
  }
}

module.exports = UtilsTempo
