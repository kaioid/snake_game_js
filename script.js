/**
 * Canvas principal do jogo e contexto 2D para renderização.
 * Define dimensões do grid baseadas no tamanho do canvas e no tamanho da célula (box).
 */
let canvas = document.getElementById('cobra');
let contexto = canvas.getContext('2d');
let tamanhoCelula = 32;
const colunas = Math.floor(canvas.width / tamanhoCelula);
const linhas = Math.floor(canvas.height / tamanhoCelula);
/** Número total de células do grid (colunas x linhas). */
const totalCelulas = colunas * linhas;

/**
 * Coordenadas em pixels para índice linear da célula no grid.
 * @param {number} x Coordenada X em pixels (múltiplo de `box`).
 * @param {number} y Coordenada Y em pixels (múltiplo de `box`).
 * @returns {number} Índice linear no intervalo [0, totalCells).
 */
function indiceAPartirDeXY(x, y) {
  return x / tamanhoCelula + (y / tamanhoCelula) * colunas;
}

function construirCelulasLivres() {
  estado.celulasLivres = new Array(totalCelulas);
  estado.posicaoLivre = new Int32Array(totalCelulas);
  for (let i = 0; i < totalCelulas; i++) {
    estado.celulasLivres[i] = i;
    estado.posicaoLivre[i] = i;
  }
  estado.quantidadeLivres = totalCelulas;
}

function removerCelulaLivre(idx) {
  if (!estado.posicaoLivre) return;
  const pos = estado.posicaoLivre[idx];
  if (pos === -1) return;
  const ultimoIdx = estado.celulasLivres[estado.quantidadeLivres - 1];
  estado.celulasLivres[pos] = ultimoIdx;
  estado.posicaoLivre[ultimoIdx] = pos;
  estado.quantidadeLivres--;
  estado.posicaoLivre[idx] = -1;
}

function adicionarCelulaLivre(idx) {
  if (!estado.posicaoLivre) return;
  if (estado.posicaoLivre[idx] !== -1) return;
  estado.celulasLivres[estado.quantidadeLivres] = idx;
  estado.posicaoLivre[idx] = estado.quantidadeLivres;
  estado.quantidadeLivres++;
}
/**
 * @typedef {'left'|'right'|'up'|'down'} Direction
 * @typedef {{x:number, y:number}} Segment
 */

/**
 * Estado central do jogo.
 * @type {{
 *  snake: Segment[],
 *  direction: Direction,
 *  nextDirection: Direction,
 *  food: {x:number,y:number},
 *  score: number,
 *  highScore: number,
 *  isPaused: boolean,
 *  isGameOver: boolean,
 *  stepMs: number,
 *  lastTime: number,
 *  accumulator: number,
 *  eatFlashTicks: number,
 *  occ: Set<number>,
 *  freeCells: number[]|null,
 *  freePos: Int32Array|null,
 *  freeCount: number
 * }}
 */
const estado = {
  cobra: [{ x: 8 * tamanhoCelula, y: 8 * tamanhoCelula }],
  direcao: 'right',
  proximaDirecao: 'right',
  comida: { x: 0, y: 0 },
  pontuacao: 0,
  recorde: Number(localStorage.getItem('highScore') || 0),
  pausado: false,
  fimDeJogo: false,
  passoMs: 100,
  ultimoTempo: 0,
  acumulador: 0,
  ticksFlashComida: 0,
  ocupacao: new Set(),
  celulasLivres: null,
  posicaoLivre: null,
  quantidadeLivres: 0,
};

let cores = {
  fundo: '#000',
  cobra: '#888',
  cabecaCobra: '#aaa',
  comida: '#ff0',
  grade: 'rgba(255,255,255,0.06)',
};

/**
 * Configurações do jogo para evitar números mágicos e facilitar ajustes.
 * - baseStep/minStep: passo inicial e mínimo (ms) do loop
 * - speedUpEvery/speedStep: aceleração a cada X pontos em Y ms
 * - eyeSize/eyeOffset: tamanho e deslocamento dos olhos da cobra
 */
const configuracao = {
  passoBase: 100,
  passoMinimo: 60,
  aceleraACada: 5,
  passoAceleracao: 10,
  tamanhoOlho: 6,
  deslocamentoOlho: 6,
};

/**
 * Atualiza a paleta de cores lendo variáveis CSS (tema atual).
 * Força a reconstrução da grade em offscreen para refletir o tema.
 */
function atualizarCores() {
  const s = getComputedStyle(document.documentElement);
  cores.fundo = s.getPropertyValue('--bg').trim() || cores.fundo;
  cores.cobra = s.getPropertyValue('--snake').trim() || cores.cobra;
  cores.cabecaCobra =
    s.getPropertyValue('--snake-head').trim() || cores.cabecaCobra;
  cores.comida = s.getPropertyValue('--food').trim() || cores.comida;
  cores.grade = s.getPropertyValue('--grid').trim() || cores.grade;
  canvasGrade = null;
}

/**
 * Desenha o fundo do tabuleiro, incluindo a grade e o efeito de "flash" ao comer.
 */
/** Canvas offscreen com a grade pré-desenhada. */
let canvasGrade = null;
/**
 * Constrói a grade em um canvas offscreen para reduzir draw calls por frame.
 * Usa as cores atuais configuradas em `cores.grade`.
 */
function construirCanvasGrade() {
  const canvasOffscreen = document.createElement('canvas');
  canvasOffscreen.width = canvas.width;
  canvasOffscreen.height = canvas.height;
  const ctx = canvasOffscreen.getContext('2d');
  ctx.strokeStyle = cores.grade;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= colunas; i++) {
    const p = i * tamanhoCelula;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, linhas * tamanhoCelula);
    ctx.moveTo(0, p);
    ctx.lineTo(colunas * tamanhoCelula, p);
  }
  ctx.stroke();
  canvasGrade = canvasOffscreen;
}

/**
 * Desenha o fundo do tabuleiro (fundo + grade) e aplica o efeito de flash ao comer.
 */
function criarBG() {
  contexto.fillStyle = cores.fundo;
  contexto.fillRect(0, 0, colunas * tamanhoCelula, linhas * tamanhoCelula);
  if (!canvasGrade) construirCanvasGrade();
  contexto.drawImage(canvasGrade, 0, 0);

  if (estado.ticksFlashComida > 0) {
    contexto.fillStyle = 'rgba(255,255,255,0.08)';
    contexto.fillRect(0, 0, colunas * tamanhoCelula, linhas * tamanhoCelula);
    estado.ticksFlashComida--;
  }
}

/**
 * Desenha todos os segmentos da cobra. O primeiro segmento é a cabeça,
 * renderizada com cor diferente e dois "olhos" simples na direção do movimento.
 */
function criarCobrinha() {
  for (let i = 0; i < estado.cobra.length; i++) {
    const seg = estado.cobra[i];
    contexto.fillStyle = i === 0 ? cores.cabecaCobra : cores.cobra;
    contexto.fillRect(seg.x, seg.y, tamanhoCelula, tamanhoCelula);
    if (i === 0) {
      contexto.fillStyle = '#fff';
      const eyeSize = configuracao.tamanhoOlho;
      const offset = configuracao.deslocamentoOlho;
      let ex1 = seg.x + offset,
        ey1 = seg.y + offset;
      let ex2 = seg.x + tamanhoCelula - offset - eyeSize,
        ey2 = seg.y + offset;
      if (estado.direcao === 'down') {
        ey1 = seg.y + tamanhoCelula - offset - eyeSize;
        ey2 = ey1;
      } else if (estado.direcao === 'left') {
        ex1 = seg.x + offset;
        ex2 = seg.x + offset;
        ey1 = seg.y + offset;
        ey2 = seg.y + tamanhoCelula - offset - eyeSize;
      } else if (estado.direcao === 'right') {
        ex1 = seg.x + tamanhoCelula - offset - eyeSize;
        ex2 = ex1;
        ey1 = seg.y + offset;
        ey2 = seg.y + tamanhoCelula - offset - eyeSize;
      }
      contexto.fillRect(ex1, ey1, eyeSize, eyeSize);
      contexto.fillRect(ex2, ey2, eyeSize, eyeSize);
    }
  }
}

/**
 * Desenha a comida na posição atual.
 */
function desenharComida() {
  contexto.fillStyle = cores.comida;
  contexto.fillRect(estado.comida.x, estado.comida.y, tamanhoCelula, tamanhoCelula);
}

/**
 * Atualiza o HUD (placar atual e recorde) no DOM.
 */
let elPontuacao = null;
let elRecorde = null;
let btnPausar = null;
let btnReiniciar = null;
function atualizarHUD() {
  if (elPontuacao && elPontuacao.textContent !== String(estado.pontuacao)) {
    elPontuacao.textContent = String(estado.pontuacao);
  }
  if (elRecorde && elRecorde.textContent !== String(estado.recorde)) {
    elRecorde.textContent = String(estado.recorde);
  }
}

/**
 * Atualiza o estado visual dos botões de controle (pausar/retomar e reiniciar).
 */
function atualizarControlesUI() {
  if (btnPausar) {
    btnPausar.disabled = estado.fimDeJogo;
    btnPausar.textContent = estado.pausado ? 'Retomar' : 'Pausar';
  }
  if (btnReiniciar) {
    btnReiniciar.disabled = false;
  }
}

/**
 * Verifica se uma coordenada (x,y) está ocupada por qualquer segmento da cobra.
 * @param {number} x - coordenada x em pixels (múltiplo de box)
 * @param {number} y - coordenada y em pixels (múltiplo de box)
 * @returns {boolean} true se algum segmento ocupa (x,y)
 */
function estaNaCobra(x, y) {
  return estado.ocupacao.has(indiceAPartirDeXY(x, y));
}

/**
 * Gera uma nova posição de comida em uma célula livre do grid.
 * Garante que não nasce sobre a cobra.
 */
function gerarComida() {
  if (!estado.celulasLivres || estado.quantidadeLivres <= 0) return;
  const r = Math.floor(Math.random() * estado.quantidadeLivres);
  const idx = estado.celulasLivres[r];
  const x = (idx % colunas) * tamanhoCelula;
  const y = Math.floor(idx / colunas) * tamanhoCelula;
  estado.comida.x = x;
  estado.comida.y = y;
}

/**
 * Ajusta o passo fixo (ms) do loop do jogo, afetando a velocidade.
 * @param {number} ms - valor em milissegundos entre atualizações lógicas
 */
function definirVelocidade(ms) {
  estado.passoMs = ms;
}

/**
 * Desenha uma sobreposição translúcida com um texto informativo (pausa/game over).
 * @param {string} text - mensagem a ser exibida
 */
function desenharSobreposicao(texto) {
  contexto.fillStyle = 'rgba(0,0,0,0.3)';
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.fillStyle = 'white';
  contexto.font = '20px Arial';
  contexto.textAlign = 'center';
  contexto.fillText(texto, canvas.width / 2, 40);
}

document.addEventListener('keydown', tratarTeclado);
document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute(
    'data-theme',
    temaSalvo === 'light' ? 'light' : 'dark'
  );
  atualizarCores();

  elPontuacao = document.getElementById('pontuacao');
  elRecorde = document.getElementById('recorde');
  atualizarHUD();

  btnPausar = document.getElementById('btnPausar');
  btnReiniciar = document.getElementById('btnReiniciar');
  if (btnPausar) {
    btnPausar.addEventListener('click', () => {
      if (!estado.fimDeJogo) {
        estado.pausado = !estado.pausado;
        atualizarControlesUI();
      }
    });
  }
  if (btnReiniciar) {
    btnReiniciar.addEventListener('click', () => {
      reiniciarJogo();
      atualizarControlesUI();
    });
  }
  atualizarControlesUI();

  const preferenciaSom = localStorage.getItem('soundEnabled');
  somHabilitado = preferenciaSom === null ? true : preferenciaSom === 'true';
  const elSom = document.getElementById('alternarSom');
  if (elSom) elSom.checked = somHabilitado;
  const elTema = document.getElementById('alternarTema');
  if (elTema) elTema.checked = temaSalvo === 'light';
});

const elAlternarSom = document.getElementById('alternarSom');
if (elAlternarSom) {
  elAlternarSom.addEventListener('change', (e) => {
    somHabilitado = e.target.checked;
    localStorage.setItem('soundEnabled', String(somHabilitado));
  });
}
const elAlternarTema = document.getElementById('alternarTema');
if (elAlternarTema) {
  elAlternarTema.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    atualizarCores();
  });
}

/**
 * Handler de teclado: pausa/retoma (Space), reinicia (Enter em game over)
 * e bufferiza a próxima direção (setas/WASD), prevenindo reversão 180°.
 * @param {KeyboardEvent} event
 */
function tratarTeclado(evento) {
  if (evento.keyCode == 32) {
    if (!estado.fimDeJogo) estado.pausado = !estado.pausado;
    atualizarControlesUI();
    return;
  }
  if (evento.keyCode == 13) {
    if (estado.fimDeJogo) {
      reiniciarJogo();
      return;
    }
  }
  const tecla = evento.key?.toLowerCase();
  let direcaoDesejada = null;
  if (evento.keyCode == 37 || tecla === 'a') direcaoDesejada = 'left';
  if (evento.keyCode == 38 || tecla === 'w') direcaoDesejada = 'up';
  if (evento.keyCode == 39 || tecla === 'd') direcaoDesejada = 'right';
  if (evento.keyCode == 40 || tecla === 's') direcaoDesejada = 'down';
  if (direcaoDesejada) {
    if (!direcoesOpostas(direcaoDesejada, estado.direcao)) {
      estado.proximaDirecao = direcaoDesejada;
    }
  }
}

/**
 * Retorna true se duas direções são opostas (impede reversão instantânea).
 * @param {'left'|'right'|'up'|'down'} a
 * @param {'left'|'right'|'up'|'down'} b
 */
function direcoesOpostas(a, b) {
  return (
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left') ||
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up')
  );
}

/**
 * Atualiza a simulação um passo fixo:
 * - aplica direção bufferizada
 * - move a cabeça (com wrap)
 * - verifica colisão com o corpo
 * - verifica se comeu (cresce) ou apenas anda (remove cauda)
 */
function atualizarPasso() {
  if (estado.pausado || estado.fimDeJogo) return;

  if (!direcoesOpostas(estado.proximaDirecao, estado.direcao)) {
    estado.direcao = estado.proximaDirecao;
  }

  let snakeX = estado.cobra[0].x;
  let snakeY = estado.cobra[0].y;
  if (estado.direcao == 'right') snakeX += tamanhoCelula;
  if (estado.direcao == 'left') snakeX -= tamanhoCelula;
  if (estado.direcao == 'up') snakeY -= tamanhoCelula;
  if (estado.direcao == 'down') snakeY += tamanhoCelula;

  if (snakeX > (colunas - 1) * tamanhoCelula) snakeX = 0;
  if (snakeX < 0) snakeX = (colunas - 1) * tamanhoCelula;
  if (snakeY > (linhas - 1) * tamanhoCelula) snakeY = 0;
  if (snakeY < 0) snakeY = (linhas - 1) * tamanhoCelula;

  const newIdx = indiceAPartirDeXY(snakeX, snakeY);

  if (estado.ocupacao.has(newIdx)) {
    estado.fimDeJogo = true;
    if (estado.pontuacao > estado.recorde) {
      estado.recorde = estado.pontuacao;
      localStorage.setItem('highScore', String(estado.recorde));
      atualizarHUD();
    }
    tocarBeep('gameover');
    atualizarControlesUI();
    return;
  }

  const vaiComer = snakeX === estado.comida.x && snakeY === estado.comida.y;
  if (vaiComer) {
    estado.cobra.unshift({ x: snakeX, y: snakeY });
    estado.ocupacao.add(newIdx);

    if (estado.posicaoLivre) {
      const pos = estado.posicaoLivre[newIdx];
      if (pos !== -1) {
        const lastIdx = estado.celulasLivres[estado.quantidadeLivres - 1];
        estado.celulasLivres[pos] = lastIdx;
        estado.posicaoLivre[lastIdx] = pos;
        estado.quantidadeLivres--;
        estado.posicaoLivre[newIdx] = -1;
      }
    }
    estado.pontuacao += 1;
    atualizarHUD();
    gerarComida();
    estado.ticksFlashComida = 4;
    const novaVelocidade = Math.max(
      /**
       * Game loop baseado em requestAnimationFrame com passo lógico fixo (accumulator).
       * Garante consistência da simulação independentemente do FPS.
       * @param {DOMHighResTimeStamp} ts - timestamp de alta resolução do rAF
       */
      configuracao.passoMinimo,
      configuracao.passoBase -
        Math.floor(estado.pontuacao / configuracao.aceleraACada) * configuracao.passoAceleracao
    );
    if (novaVelocidade !== estado.passoMs) definirVelocidade(novaVelocidade);
    tocarBeep('eat');
  } else {
    const cauda = estado.cobra.pop();
    const tailIdx = indiceAPartirDeXY(cauda.x, cauda.y);
    estado.ocupacao.delete(tailIdx);
    cauda.x = snakeX;
    cauda.y = snakeY;
    estado.cobra.unshift(cauda);
    estado.ocupacao.add(newIdx);

    if (estado.posicaoLivre) {
      let pos = estado.posicaoLivre[newIdx];
      if (pos !== -1) {
        const lastIdx = estado.celulasLivres[estado.quantidadeLivres - 1];
        estado.celulasLivres[pos] = lastIdx;
        estado.posicaoLivre[lastIdx] = pos;
        estado.quantidadeLivres--;
        estado.posicaoLivre[newIdx] = -1;
      }

      if (estado.posicaoLivre[tailIdx] === -1) {
        estado.celulasLivres[estado.quantidadeLivres] = tailIdx;
        estado.posicaoLivre[tailIdx] = estado.quantidadeLivres;
        estado.quantidadeLivres++;
      }
    }
  }
}

function desenharQuadro() {
  criarBG();
  criarCobrinha();
  desenharComida();
  if (estado.pausado) {
    desenharSobreposicao('PAUSADO');
  } else if (estado.fimDeJogo) {
    desenharSobreposicao('GAME OVER - Enter para reiniciar');
  }
}

function executarLoop(ts) {
  if (!estado.ultimoTempo) estado.ultimoTempo = ts;
  let dt = ts - estado.ultimoTempo;
  if (dt > 250) dt = 250;
  atualizarControlesUI();
  estado.ultimoTempo = ts;
  estado.acumulador += dt;
  while (estado.acumulador >= estado.passoMs) {
    atualizarPasso();
    estado.acumulador -= estado.passoMs;
  }
  desenharQuadro();
  requestAnimationFrame(executarLoop);
}

function reiniciarJogo() {
  estado.cobra = [{ x: 8 * tamanhoCelula, y: 8 * tamanhoCelula }];
  estado.direcao = 'right';
  estado.proximaDirecao = 'right';
  estado.pontuacao = 0;
  estado.pausado = false;
  estado.fimDeJogo = false;
  estado.ultimoTempo = 0;
  estado.acumulador = 0;
  estado.ocupacao.clear();
  estado.ocupacao.add(indiceAPartirDeXY(estado.cobra[0].x, estado.cobra[0].y));

  construirCelulasLivres();

  const startIdx = indiceAPartirDeXY(estado.cobra[0].x, estado.cobra[0].y);
  removerCelulaLivre(startIdx);
  gerarComida();
  atualizarHUD();
  definirVelocidade(configuracao.passoBase);
}

estado.ocupacao.clear();
estado.ocupacao.add(indiceAPartirDeXY(estado.cobra[0].x, estado.cobra[0].y));
construirCelulasLivres();
removerCelulaLivre(indiceAPartirDeXY(estado.cobra[0].x, estado.cobra[0].y));
gerarComida();
atualizarHUD();
definirVelocidade(configuracao.passoBase);
requestAnimationFrame(executarLoop);

/**
 * Garante a criação do contexto de áudio (Web Audio API) sob demanda,
 * respeitando políticas de autoplay do navegador.
 */
let contextoAudio = null;
let somHabilitado = true;
function garantirContextoAudio() {
  if (!contextoAudio) {
    try {
      contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return;
    }
  }

  if (contextoAudio && contextoAudio.state === 'suspended') {
    try {
      contextoAudio.resume();
    } catch (_) {}
  }
}
/**
 * Emite um beep curto para feedback de eventos (comer/game over).
 * @param {'eat'|'gameover'} type - tipo do som a tocar
 */
function tocarBeep(tipo) {
  if (!somHabilitado) return;
  try {
    garantirContextoAudio();
    if (!contextoAudio) return;
    const oscilador = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    oscilador.type = 'square';
    const agora = contextoAudio.currentTime;

    ganho.gain.setValueAtTime(0.0001, agora);
    if (tipo === 'eat') {
      oscilador.frequency.setValueAtTime(660, agora);
      ganho.gain.linearRampToValueAtTime(0.1, agora + 0.01);
      ganho.gain.linearRampToValueAtTime(0.0001, agora + 0.12);
      oscilador.onended = () => {
        try {
          oscilador.disconnect();
          ganho.disconnect();
        } catch (_) {}
      };
      oscilador.connect(ganho);
      ganho.connect(contextoAudio.destination);
      oscilador.start(agora);
      oscilador.stop(agora + 0.15);
    } else {
      oscilador.frequency.setValueAtTime(220, agora);
      ganho.gain.linearRampToValueAtTime(0.15, agora + 0.02);
      ganho.gain.linearRampToValueAtTime(0.0001, agora + 0.25);
      oscilador.onended = () => {
        try {
          oscilador.disconnect();
          ganho.disconnect();
        } catch (_) {}
      };
      oscilador.connect(ganho);
      ganho.connect(contextoAudio.destination);
      oscilador.start(agora);
      oscilador.stop(agora + 0.28);
    }
  } catch (_) {}
}

window.addEventListener('pointerdown', () => garantirContextoAudio(), { once: true });

let toqueInicioX = 0,
  toqueInicioY = 0;
canvas.addEventListener(
  'touchstart',
  function (e) {
    if (e.touches && e.touches.length > 0) {
      toqueInicioX = e.touches[0].clientX;
      toqueInicioY = e.touches[0].clientY;
    }
  },
  { passive: true }
);

canvas.addEventListener(
  'touchend',
  function (e) {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - toqueInicioX;
    const dy = t.clientY - toqueInicioY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 10 && absY < 10) return;
    let direcaoDesejada = null;
    if (absX > absY) direcaoDesejada = dx > 0 ? 'right' : 'left';
    else direcaoDesejada = dy > 0 ? 'down' : 'up';
    if (!direcoesOpostas(direcaoDesejada, estado.direcao)) {
      estado.proximaDirecao = direcaoDesejada;
    }
  },
  { passive: true }
);
