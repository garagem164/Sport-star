// script.js — Ponto de entrada principal do jogo
// Inicialização, loop principal, delta time, FPS, resize e módulos
(function() {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES GLOBAIS
    // ============================================================
    const CONFIG = {
        targetFPS: 60,
        maxDeltaTime: 0.05, // 50ms (evita saltos grandes)
        debug: true, // ativa logs de performance
    };

    // ============================================================
    // 2. ESTADO DO JOGO
    // ============================================================
    const GameState = {
        isRunning: false,
        isPaused: false,
        frameCount: 0,
        fps: 0,
        deltaTime: 0,
        elapsedTime: 0,
        lastTimestamp: 0,
        fpsCounter: 0,
        fpsTimer: 0,
        animationId: null,
    };

    // ============================================================
    // 3. REFERÊNCIAS DOM
    // ============================================================
    const canvas = document.getElementById('gameCanvas');
    const container = document.getElementById('game-container');
    let ctx = null;

    // ============================================================
    // 4. INICIALIZAÇÃO DOS MÓDULOS
    // ============================================================
    function initModules() {
        console.log('[Script] Inicializando módulos da engine...');

        // Verifica se os módulos existem
        const modules = ['Core', 'Input', 'Renderer', 'Game'];
        let allLoaded = true;

        modules.forEach(name => {
            if (typeof window[name] === 'undefined') {
                console.warn(`[Script] Módulo ${name} não encontrado.`);
                allLoaded = false;
            } else {
                console.log(`[Script] Módulo ${name} carregado.`);
            }
        });

        if (!allLoaded) {
            console.warn('[Script] Alguns módulos não foram carregados. O jogo pode não funcionar corretamente.');
        }

        // Inicializa módulos (se já não foram inicializados automaticamente)
        try {
            if (typeof Renderer !== 'undefined' && Renderer.init) {
                Renderer.init();
            }
            if (typeof Input !== 'undefined' && Input.init) {
                Input.init();
            }
            if (typeof Core !== 'undefined' && Core.init) {
                Core.init();
            }
            if (typeof Game !== 'undefined' && Game.init) {
                Game.init();
            }
            console.log('[Script] Módulos inicializados com sucesso.');
        } catch (error) {
            console.error('[Script] Erro ao inicializar módulos:', error);
        }
    }

    // ============================================================
    // 5. CONFIGURAÇÃO DO CANVAS
    // ============================================================
    function setupCanvas() {
        if (!canvas) {
            console.error('[Script] Canvas não encontrado!');
            return false;
        }

        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('[Script] Não foi possível obter o contexto 2D do canvas!');
            return false;
        }

        // Configurações iniciais do contexto
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';

        console.log('[Script] Canvas configurado.');
        return true;
    }

    // ============================================================
    // 6. REDIMENSIONAMENTO AUTOMÁTICO
    // ============================================================
    function handleResize() {
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Ajusta o tamanho do canvas para corresponder ao container
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;

            // Atualiza o renderizador se disponível
            if (typeof Renderer !== 'undefined' && Renderer._resize) {
                Renderer._resize();
            }

            console.log(`[Script] Canvas redimensionado: ${width}x${height}`);
        }
    }

    // ============================================================
    // 7. LOOP PRINCIPAL (requestAnimationFrame + Delta Time)
    // ============================================================
    function gameLoop(timestamp) {
        if (!GameState.isRunning) return;

        // --- Cálculo do Delta Time ---
        if (GameState.lastTimestamp === 0) {
            GameState.lastTimestamp = timestamp;
        }

        let deltaTime = (timestamp - GameState.lastTimestamp) / 1000; // em segundos
        GameState.lastTimestamp = timestamp;

        // Limita o deltaTime máximo para evitar saltos
        if (deltaTime > CONFIG.maxDeltaTime) {
            deltaTime = CONFIG.maxDeltaTime;
        }

        // Se o jogo estiver pausado, não atualiza a lógica
        if (!GameState.isPaused) {
            GameState.deltaTime = deltaTime;
            GameState.elapsedTime += deltaTime;
            GameState.frameCount++;

            // --- Atualização (Update) ---
            update(deltaTime);

            // --- Renderização (Render) ---
            render();
        }

        // --- Cálculo de FPS ---
        GameState.fpsCounter++;
        GameState.fpsTimer += deltaTime;
        if (GameState.fpsTimer >= 1.0) {
            GameState.fps = GameState.fpsCounter;
            GameState.fpsCounter = 0;
            GameState.fpsTimer = 0;

            if (CONFIG.debug) {
                console.log(`[FPS] ${GameState.fps} | Delta: ${(deltaTime * 1000).toFixed(2)}ms`);
            }
        }

        // --- Próximo frame ---
        GameState.animationId = requestAnimationFrame(gameLoop);
    }

    // ============================================================
    // 8. UPDATE (lógica do jogo)
    // ============================================================
    function update(deltaTime) {
        // Atualiza o Core se disponível
        if (typeof Core !== 'undefined' && Core._update) {
            Core._update(deltaTime);
        }

        // Atualiza o Game se disponível
        if (typeof Game !== 'undefined' && Game.update) {
            Game.update(deltaTime);
        }

        // Aqui entra a lógica personalizada do jogo (futuramente)
        // Exemplo: atualizar posições, colisões, IA, etc.
    }

    // ============================================================
    // 9. RENDER (desenho na tela)
    // ============================================================
    function render() {
        if (!ctx || !canvas) return;

        // Limpa o canvas com a cor de fundo
        ctx.fillStyle = '#1e2633';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Renderiza via Core se disponível
        if (typeof Core !== 'undefined' && Core._render) {
            Core._render();
        }

        // Renderiza via Game se disponível
        if (typeof Game !== 'undefined' && Game.render) {
            Game.render(ctx, canvas.width, canvas.height);
        } else {
            // Fallback: desenha uma mensagem padrão
            renderDefault(ctx, canvas.width, canvas.height);
        }

        // Renderiza overlay de debug se ativo
        if (CONFIG.debug) {
            renderDebug(ctx, canvas.width, canvas.height);
        }
    }

    // ============================================================
    // 10. RENDER FALLBACK (caso o módulo Game não esteja disponível)
    // ============================================================
    function renderDefault(ctx, width, height) {
        ctx.save();

        // Fundo gradiente
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.6
        );
        gradient.addColorStop(0, '#2a3344');
        gradient.addColorStop(1, '#1a1f2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Texto central
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Título
        ctx.fillStyle = '#88c0ff';
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText('⚽ Bounce Arena', width / 2, height / 2 - 40);

        // Subtítulo
        ctx.fillStyle = '#a0b8d0';
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.fillText('Jogo em desenvolvimento', width / 2, height / 2 + 20);

        // Status
        ctx.fillStyle = '#6a7f99';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        const status = GameState.isPaused ? '⏸ PAUSADO' : '▶ RODANDO';
        ctx.fillText(`Status: ${status}`, width / 2, height / 2 + 60);

        // FPS
        ctx.fillStyle = '#4a5f79';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${GameState.fps}`, width / 2, height / 2 + 90);

        ctx.restore();
    }

    // ============================================================
    // 11. RENDER DEBUG (informações técnicas)
    // ============================================================
    function renderDebug(ctx, width, height) {
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 200, 70);
        ctx.fillStyle = '#88c0ff';
        ctx.font = '11px monospace';
        ctx.fillText(`FPS: ${GameState.fps}`, 16, 16);
        ctx.fillText(`Frame: ${GameState.frameCount}`, 16, 32);
        ctx.fillText(`Delta: ${(GameState.deltaTime * 1000).toFixed(2)}ms`, 16, 48);
        ctx.fillText(`Tempo: ${GameState.elapsedTime.toFixed(1)}s`, 16, 64);
        ctx.restore();
    }

    // ============================================================
    // 12. CONTROLE DE PAUSE (via tecla P ou evento)
    // ============================================================
    function togglePause() {
        GameState.isPaused = !GameState.isPaused;
        console.log(`[Script] Jogo ${GameState.isPaused ? 'pausado' : 'retomado'}`);
        return GameState.isPaused;
    }

    // ============================================================
    // 13. INICIALIZAÇÃO PRINCIPAL
    // ============================================================
    function init() {
        console.log('[Script] Iniciando jogo...');

        // 1. Configura o canvas
        if (!setupCanvas()) {
            console.error('[Script] Falha ao configurar o canvas. Abortando.');
            return;
        }

        // 2. Inicializa os módulos
        initModules();

        // 3. Configura o redimensionamento
        handleResize();

        // 4. Registra eventos
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 300);
        });

        // 5. Tecla P para pause (debug)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                togglePause();
                e.preventDefault();
            }
            // Tecla R para reset (se disponível)
            if (e.key === 'r' || e.key === 'R') {
                if (typeof Game !== 'undefined' && Game.reset) {
                    Game.reset();
                    console.log('[Script] Jogo resetado via tecla R');
                }
                e.preventDefault();
            }
        });

        // 6. Inicia o loop do jogo
        GameState.isRunning = true;
        GameState.isPaused = false;
        GameState.lastTimestamp = 0;
        GameState.frameCount = 0;
        GameState.fps = 0;
        GameState.elapsedTime = 0;

        // Inicia o Core se disponível
        if (typeof Core !== 'undefined' && Core.start) {
            Core.start();
        }

        // Inicia o loop principal
        GameState.animationId = requestAnimationFrame(gameLoop);

        console.log('[Script] Jogo inicializado com sucesso!');
        console.log(`[Script] Canvas: ${canvas.width}x${canvas.height}`);
        console.log(`[Script] Target FPS: ${CONFIG.targetFPS}`);
        console.log('[Script] Pressione P para pausar, R para resetar (debug)');
    }

    // ============================================================
    // 14. LIMPEZA (para hot-reload ou recarregamento)
    // ============================================================
    function cleanup() {
        GameState.isRunning = false;
        if (GameState.animationId) {
            cancelAnimationFrame(GameState.animationId);
            GameState.animationId = null;
        }
        window.removeEventListener('resize', handleResize);
        console.log('[Script] Cleanup realizado.');
    }

    // ============================================================
    // 15. EXPORTA FUNÇÕES GLOBAIS (para debug e console)
    // ============================================================
    window.__game = {
        state: GameState,
        config: CONFIG,
        togglePause: togglePause,
        cleanup: cleanup,
        resize: handleResize,
        canvas: canvas,
        ctx: ctx,
    };

    // ============================================================
    // 16. INICIA O JOGO QUANDO O DOM ESTIVER PRONTO
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se o DOM já estiver carregado, inicia imediatamente
        init();
    }

    // ============================================================
    // 17. PREVENÇÃO DE COMPORTAMENTOS PADRÃO (toque, scroll)
    // ============================================================
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    }, { passive: false });

    console.log('[Script] script.js carregado e pronto.');
})();
