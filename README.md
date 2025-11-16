# Snake Game (v2.3) (pt-BR)

Jogo da Cobrinha simples em HTML5 Canvas, com controles por teclado, swipe (toque) e botões na interface. Implementa um loop lógico de passo fixo para garantir consistência, com melhorias de performance como grade pré-renderizada (offscreen), verificação O(1) de ocupação e reaproveitamento de objetos.

## Visão Geral

- Canvas: `index.html` + `style.css` + `script.js`
- Controles: Setas/WASD, Swipe, Botões (Pausar/Reiniciar) e D‑Pad direcional (toque)
- Preferências: Som e Tema (Claro/Escuro) com persistência em `localStorage`
- Performance: spawn de comida O(1), grade offscreen, pooling de segmentos, colisão O(1)
- Mobile: HUD no canvas, anti‑zoom e tamanho de célula adaptativo

## Construção do Projeto

- Contexto acadêmico: projeto desenvolvido no início dos estudos de Web (HTML/CSS/JS puros), com foco em aprender Canvas e lógica básica de jogos (game loop, input, colisão e renderização).

### Histórico:

- (v1):
  - Renderização da grade a cada frame (paths/linhas em tempo real).
  - Colisão com o corpo O(n) percorrendo todos os segmentos.
  - Geração da comida por tentativa com `while (isOnSnake)`, verificando a cobra por varredura.
  - Alocação por tick ao mover a cabeça (novo objeto por passo); `pop()` da cauda sem reaproveitar objeto.
  - Sem botões de toque (apenas teclado e swipe); ids e nomes mistos pt/en.
  - Ainda assim, já usava loop de passo fixo com `requestAnimationFrame` + `accumulator`.
- (v2):
  - Grade pré-renderizada em canvas offscreen (menos draw calls por frame).
  - Colisão O(1) via `Set` de ocupação.
  - Spawn de comida O(1) usando estrutura de “células livres” (swap-pop + mapa posicional).
  - Reaproveitamento do segmento da cauda (pooling) ao mover sem crescer.
  - Botões de Pausar/Reiniciar para toque; ids/variáveis padronizados em pt-BR.
  - Comentários JSDoc e seções de README detalhadas.
- (v2.1):
  - Suporte responsivo para diferentes tamanhos de tela, evitando scroll e cortes na borda inferior (ajuste do canvas ao viewport com `visualViewport`/`innerWidth|Height`, múltiplos de célula e safe-area).
- (v2.2):
  - Suporte mobile completo: layout otimizado para toque, D‑Pad com visual de controle, HUD reduzido dentro do canvas e proteção contra zoom acidental.
  - Velocidade adaptativa por tamanho de grade e leve progressão em telas menores.
- (v2.3):
  - Células adaptativas: o tamanho de cada célula se ajusta ao lado útil do canvas para caber mais células em telas menores (mantendo múltiplos exatos para a grade).

## Como Executar

Você pode abrir o jogo diretamente no navegador ou usar um servidor local (recomendado para testar em dispositivos na rede ou evitar políticas de arquivo do navegador).

### 1) Abrir diretamente (Windows PowerShell)

```powershell
Start-Process (Join-Path $PWD index.html)
```

### 2) Servidor via Python (opcional)

Requer Python instalado.

```powershell
# Python 3
python -m http.server 8080
# Alternativa com o lançador do Windows
py -3 -m http.server 8080

# Em seguida, abra no navegador
Start-Process http://localhost:8080
```

### 3) Servidor via Node (opcional)

Requer Node.js instalado (usa npx sem instalar dependências no projeto).

```powershell
npx serve -p 8080 .
Start-Process http://localhost:8080
```

## Controles do Jogo

- Movimento: Setas ou WASD
- Pausar/Retomar: tecla Espaço ou botão "Pausar/Retomar"
- Reiniciar: tecla Enter (após Game Over) ou botão "Reiniciar"
- Dispositivos de toque: swipe para mover (direita/esquerda/cima/baixo)
- D‑Pad (toque): botões ▲ ◀ ▶ ▼ logo abaixo do canvas
- Alternar som: checkbox "Som"
- Alternar tema: checkbox "Tema Claro"

## Estrutura do Projeto

```
index.html    # Marcações, HUD, botões e canvas (#cobra)
style.css     # Estilos, tema claro/escuro via CSS vars
script.js     # Lógica do jogo, renderização e entrada
```

## Detalhes de Implementação

- Loop lógico de passo fixo: independente do FPS do navegador (accumulator + rAF)
- Grade offscreen: a grade é pré-desenhada em um canvas offscreen e "blitada" por frame
- Ocupação O(1): Set de ocupação para colisão e estrutura de células livres para spawn sem tentativas
- Pooling da cauda: ao mover sem crescer, o último segmento é reutilizado (menos GC)
- Preferências:
  - `localStorage['highScore']`: recorde
  - `localStorage['soundEnabled']`: som habilitado
  - `localStorage['theme']`: tema atual ("light" ou "dark")

## Suporte Mobile (v2.2+)

- Canvas responsivo: calcula área disponível (título, HUD, controles e safe‑area) e usa o maior quadrado possível, sempre em múltiplos de `tamanhoCelula`.
- Layout focado no jogo: em toque, a página fica alinhada ao topo; o HUD de pontuação do DOM é ocultado e um placar compacto é desenhado dentro do canvas, com fundo semi‑transparente.
- D‑Pad como controle: grade 3×3 com botões ▲ ◀ ▶ ▼, cantos arredondados por braço, feedback de pressão e foco acessível (`:focus-visible`).
- Anti‑zoom: `meta viewport` com `user-scalable=no`, `maximum-scale=1`; `touch-action: none` no canvas; bloqueio de `dblclick` e gestos (`gesturestart/change/end`) para evitar zoom acidental.
- Mensagens otimizadas: em telas de toque, o Game Over mostra apenas "GAME OVER".
- Velocidade adaptativa: `calcularPassoBase()` e `obterDinamicaVelocidade()` ajustam a velocidade base e a progressão conforme o tamanho do grid e se o dispositivo é touch.
- Células adaptativas (v2.3): define o tamanho da célula de 12–32px com alvo de ~22 células por lado em toque (~16 no desktop), aumentando a densidade do tabuleiro em telas pequenas.

### Decisões de Design

- Borda com wrap-around (a cobra atravessa e surge do lado oposto) para manter o ritmo do jogo simples e contínuo.
- Buffer de direção (`proximaDirecao`) para evitar reversões 180° instantâneas e garantir comandos consistentes entre steps.
- Separação leve entre atualização (`atualizarPasso`) e renderização (`desenharQuadro`) para clareza.

## Medir Desempenho (Chrome DevTools)

1. Abra o jogo no Chrome
2. `F12` → aba Performance → clique em "Record"
3. Jogue por alguns segundos e pare a gravação
4. Observe:
   - FPS estável
   - Menos picos de "Scripting" e eventos de "(garbage collection)"
   - Tempo reduzido de desenho graças à grade offscreen

## Dicas / Solução de Problemas

- Sem áudio no primeiro movimento? Clique/tocar na janela uma vez (política de autoplay do navegador) e tente novamente.
- Lentidão em telas de alta densidade? Mantive resolução padrão; pode-se adicionar scaling para `devicePixelRatio` como melhoria opcional.
- Preferências: use os checkboxes "Som" e "Tema Claro" no HUD; o estado persiste entre sessões.
