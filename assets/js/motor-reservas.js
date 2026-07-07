/* ============================================================================
 * motor-reservas.js — Regras de negócio de reserva do Enjoy Coworking.
 *
 * Módulo PURO: sem dependências, sem acesso a rede/DOM. Só lógica testável.
 * Usado tanto no front (reservar.html) quanto espelhado nas RPCs do banco
 * (criar_reserva / cancelar_reserva no 0001_schema_inicial.sql).
 *
 * REGRAS (decididas 06/07 — ver 02-esqueleto-app.md / 04-monetizacao.md):
 *   • Duração mínima: 1h (60 min).
 *   • Buffer de higienização: 30 min, exigido SÓ quando o profissional da
 *     reserva adjacente é OUTRO. Mesmo profissional emenda sem buffer.
 *   • Respeita bloqueios de manutenção.
 *   • Respeita o horário de funcionamento do dia da semana.
 *   • Sem sobreposição de reservas ativas na mesma sala.
 *
 * Datas: sempre objetos Date (ou ISO string). Trabalha em horário local.
 * ==========================================================================*/
(function (raiz) {
  "use strict";

  // Configuração padrão (o app pode sobrescrever lendo a tabela `config`).
  var CONFIG_PADRAO = {
    duracaoMinimaMin: 60, // duração mínima da reserva
    bufferMin: 30,        // higienização entre profissionais diferentes
    passoSlotMin: 30      // granularidade da timeline de slots
  };

  var MS_MIN = 60 * 1000;

  // ---- utilidades de data ----------------------------------------------------
  function paraDate(v) {
    return v instanceof Date ? v : new Date(v);
  }
  function minutosEntre(a, b) {
    return (paraDate(b).getTime() - paraDate(a).getTime()) / MS_MIN;
  }
  function somaMin(d, min) {
    return new Date(paraDate(d).getTime() + min * MS_MIN);
  }

  /**
   * Dois intervalos [ini,fim) se sobrepõem?
   * Semântica half-open: fim de um == início de outro NÃO é sobreposição
   * (permite emendar sem buffer).
   */
  function haSobreposicao(iniA, fimA, iniB, fimB) {
    return paraDate(iniA).getTime() < paraDate(fimB).getTime() &&
           paraDate(iniB).getTime() < paraDate(fimA).getTime();
  }

  /**
   * calcularPreco(produtos, inicio, fim)
   * Preço da reserva. No MVP a base é a HORA avulsa, proporcional à duração.
   * Ex.: 1h30 com hora=R$75 → 75 * 1.5 = R$112,50.
   * `produtos` é o array de produtos_preco (procura o tipo 'hora').
   * Retorna número (reais, 2 casas).
   */
  function calcularPreco(produtos, inicio, fim) {
    var horas = minutosEntre(inicio, fim) / 60;
    if (!(horas > 0)) return 0;
    var prodHora = (produtos || []).find(function (p) {
      return p.tipo === "hora";
    });
    var valorHora = prodHora ? Number(prodHora.valor) : 0;
    var total = valorHora * horas;
    return Math.round(total * 100) / 100;
  }

  /**
   * exigeBufferEntre(reserva, novaReserva)
   * true se as duas reservas são de profissionais DIFERENTES (aí precisa buffer).
   * Mesmo profissional (mesmo profissionalId) → false (emenda livre).
   */
  function exigeBufferEntre(reservaExistente, profissionalIdNovo) {
    return reservaExistente.profissionalId !== profissionalIdNovo;
  }

  /**
   * conflitoComReserva(reservaExistente, ini, fim, profissionalId, cfg)
   * Retorna null se ok, ou uma string com o motivo do conflito.
   *  - sobreposição direta → sempre conflito
   *  - se profissional diferente: exige `bufferMin` de folga entre as reservas
   */
  function conflitoComReserva(r, ini, fim, profissionalId, cfg) {
    // sobreposição direta (qualquer profissional)
    if (haSobreposicao(r.inicio, r.fim, ini, fim)) {
      return "sobreposicao";
    }
    // buffer só entre profissionais diferentes
    if (exigeBufferEntre(r, profissionalId)) {
      var rIniExp = somaMin(r.inicio, -cfg.bufferMin);
      var rFimExp = somaMin(r.fim, cfg.bufferMin);
      if (haSobreposicao(rIniExp, rFimExp, ini, fim)) {
        return "buffer";
      }
    }
    return null;
  }

  /**
   * dentroDoHorario(horarioFuncionamento, ini, fim)
   * horarioFuncionamento: { "0":{abre:"08:00",fecha:"18:00"}, ... } (0=domingo).
   * true se a reserva cabe na janela do dia. (Assume ini/fim no mesmo dia.)
   */
  function dentroDoHorario(horarioFuncionamento, ini, fim) {
    ini = paraDate(ini); fim = paraDate(fim);
    var dia = String(ini.getDay());
    var janela = horarioFuncionamento && horarioFuncionamento[dia];
    if (!janela) return false; // dia fechado
    var abre = horaParaData(ini, janela.abre);
    var fecha = horaParaData(ini, janela.fecha);
    return ini.getTime() >= abre.getTime() && fim.getTime() <= fecha.getTime();
  }

  function horaParaData(base, hhmm) {
    var p = String(hhmm).split(":");
    var d = new Date(base);
    d.setHours(Number(p[0]), Number(p[1] || 0), 0, 0);
    return d;
  }

  /**
   * podeReservar(reservasExistentes, bloqueios, horarioFuncionamento, novaReserva, config)
   * Valida TODAS as regras. Retorna { ok:boolean, motivo:string|null }.
   * novaReserva = { inicio, fim, profissionalId }.
   * reservasExistentes = [{ inicio, fim, profissionalId }].
   * bloqueios = [{ inicio, fim }].
   */
  function podeReservar(reservasExistentes, bloqueios, horarioFuncionamento, novaReserva, config) {
    var cfg = Object.assign({}, CONFIG_PADRAO, config || {});
    var ini = paraDate(novaReserva.inicio);
    var fim = paraDate(novaReserva.fim);

    if (!(fim.getTime() > ini.getTime())) {
      return { ok: false, motivo: "Horário final deve ser maior que o inicial." };
    }
    // duração mínima
    if (minutosEntre(ini, fim) < cfg.duracaoMinimaMin) {
      return { ok: false, motivo: "Duração mínima de " + cfg.duracaoMinimaMin + " minutos." };
    }
    // horário de funcionamento
    if (horarioFuncionamento && !dentroDoHorario(horarioFuncionamento, ini, fim)) {
      return { ok: false, motivo: "Fora do horário de funcionamento." };
    }
    // bloqueios de manutenção
    var bloqueio = (bloqueios || []).some(function (b) {
      return haSobreposicao(b.inicio, b.fim, ini, fim);
    });
    if (bloqueio) {
      return { ok: false, motivo: "Sala bloqueada para manutenção nesse período." };
    }
    // reservas existentes (sobreposição + buffer)
    for (var i = 0; i < (reservasExistentes || []).length; i++) {
      var motivo = conflitoComReserva(reservasExistentes[i], ini, fim, novaReserva.profissionalId, cfg);
      if (motivo === "sobreposicao") {
        return { ok: false, motivo: "Horário já reservado." };
      }
      if (motivo === "buffer") {
        return { ok: false, motivo: "Necessário " + cfg.bufferMin + " min de higienização entre profissionais diferentes." };
      }
    }
    return { ok: true, motivo: null };
  }

  /**
   * slotsDisponiveis(reservasExistentes, bloqueios, horarioFuncionamento, data, profissionalId, config)
   * Gera a timeline do dia `data` (Date ou "AAAA-MM-DD") em passos de `passoSlotMin`.
   * Retorna [{ inicio:Date, fim:Date, status:"livre"|"ocupado"|"bloqueado"|"buffer" }].
   *   status é do ponto de vista do `profissionalId` que quer reservar:
   *   - "ocupado"  : cai em cima de uma reserva existente
   *   - "buffer"   : livre, mas dentro do buffer de outro profissional (indisponível)
   *   - "bloqueado": manutenção
   *   - "livre"    : disponível pra iniciar uma reserva
   */
  function slotsDisponiveis(reservasExistentes, bloqueios, horarioFuncionamento, data, profissionalId, config) {
    var cfg = Object.assign({}, CONFIG_PADRAO, config || {});
    var base = paraDate(data);
    var dia = String(base.getDay());
    var janela = horarioFuncionamento && horarioFuncionamento[dia];
    if (!janela) return []; // fechado nesse dia

    var abre = horaParaData(base, janela.abre);
    var fecha = horaParaData(base, janela.fecha);
    var slots = [];
    var passo = cfg.passoSlotMin;

    for (var t = abre.getTime(); t + passo * MS_MIN <= fecha.getTime(); t += passo * MS_MIN) {
      var sIni = new Date(t);
      var sFim = somaMin(sIni, passo);
      var status = "livre";

      // bloqueio
      if ((bloqueios || []).some(function (b) { return haSobreposicao(b.inicio, b.fim, sIni, sFim); })) {
        status = "bloqueado";
      } else {
        for (var i = 0; i < (reservasExistentes || []).length; i++) {
          var r = reservasExistentes[i];
          if (haSobreposicao(r.inicio, r.fim, sIni, sFim)) {
            status = "ocupado";
            break;
          }
          // buffer só conta contra profissional diferente
          if (exigeBufferEntre(r, profissionalId)) {
            var rIniExp = somaMin(r.inicio, -cfg.bufferMin);
            var rFimExp = somaMin(r.fim, cfg.bufferMin);
            if (haSobreposicao(rIniExp, rFimExp, sIni, sFim)) {
              status = "buffer";
              // não dá break: uma sobreposição real depois teria prioridade,
              // mas como já checamos sobreposição acima, manter buffer é ok.
            }
          }
        }
      }
      slots.push({ inicio: sIni, fim: sFim, status: status });
    }
    return slots;
  }

  var api = {
    CONFIG_PADRAO: CONFIG_PADRAO,
    calcularPreco: calcularPreco,
    podeReservar: podeReservar,
    slotsDisponiveis: slotsDisponiveis,
    haSobreposicao: haSobreposicao,
    exigeBufferEntre: exigeBufferEntre,
    dentroDoHorario: dentroDoHorario
  };

  // Export universal: browser (window.MotorReservas) + CommonJS (testes node).
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  raiz.MotorReservas = api;
})(typeof window !== "undefined" ? window : this);
