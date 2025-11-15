# Snake Game (v2) (pt-BR)

Jogo da Cobrinha simples em HTML5 Canvas, com controles por teclado, swipe (toque) e botões na interface. Implementa um loop lógico de passo fixo para garantir consistência, com melhorias de performance como grade pré-renderizada (offscreen), verificação O(1) de ocupação e reaproveitamento de objetos.

## Visão Geral
- Canvas: `index.html` + `style.css` + `script.js`
- Controles: Setas/WASD, Swipe, Botões (Pausar/Reiniciar)
- Preferências: Som e Tema (Claro/Escuro) com persistência em `localStorage`
- Performance: spawn de comida O(1), grade offscreen, pooling de segmentos, colisão O(1)

## Construção do Projeto
- Contexto acadêmico: projeto desenvolvido no início dos estudos de Web (HTML/CSS/JS puros), com foco em aprender Canvas e lógica básica de jogos (game loop, input, colisão e renderização).
  
### Histórico: v1 → v2
- v1 (original):
  - Renderização da grade a cada frame (paths/linhas em tempo real).
  - Colisão com o corpo O(n) percorrendo todos os segmentos.
  - Geração da comida por tentativa com `while (isOnSnake)`, verificando a cobra por varredura.
  - Alocação por tick ao mover a cabeça (novo objeto por passo); `pop()` da cauda sem reaproveitar objeto.
  - Sem botões de toque (apenas teclado e swipe); ids e nomes mistos pt/en.
  - Ainda assim, já usava loop de passo fixo com `requestAnimationFrame` + `accumulator`.
- v2 (atual):
  - Grade pré-renderizada em canvas offscreen (menos draw calls por frame).
  - Colisão O(1) via `Set` de ocupação.
  - Spawn de comida O(1) usando estrutura de “células livres” (swap-pop + mapa posicional).
  - Reaproveitamento do segmento da cauda (pooling) ao mover sem crescer.
  - Botões de Pausar/Reiniciar para toque; ids/variáveis padronizados em pt-BR.
  - Comentários JSDoc e seções de README detalhadas.


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
