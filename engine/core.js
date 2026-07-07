// engine/core.js — Núcleo otimizado do jogo
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES GLOBAIS
    // ============================================================
    const CONFIG = {
        targetFPS: 60,
        maxDeltaTime: 0.05,
        debug: false,
        version: '2.0.0',
    };

    // ============================================================
    // 2. ESTADO GLOBAL
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
    let canvas = null;
    let ctx = null;
    let container = null;

    // ============================================================
    // 4. MÓDULOS CARREGADOS
    // ============================================================
    const loadedModules = {};

    // ============================================================
    // 5. INICIALIZAÇÃO
    // ============================================================
    function init() {
        console.log(`[Core] Inicializando v${CONFIG.version}...`);

        // Obtém referências DOM
        canvas = document.getElementById('gameCanvas');
        container = document.getElementById('game-container');

        if (!canvas || !container) {
            console.error('[Core] Elementos DOM não encontrados');
            return false;
        }

        // Configura canvas
        ctx = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
        });

        if (!ctx) {
            console.error('[Core] Não foi possível obter contexto 2D');
            return false;
        }

        // Carrega módulos
        loadModules();

        // Configura eventos
        setupEvents();

        // Inicia loop
        startLoop();

        console.log('[Core] Inicializado com sucesso');
        return true;
    }

    // ============================================================
    // 6. CARREGAMENTO DE MÓDULOS
    // ============================================================
    function loadModules() {
        const moduleNames = [
            'Math2D', 'Physics', 'Collisions', 'Renderer',
            'Discs', 'BallModule', 'InputModule', 'CameraModule',
            'GameModule', 'HUDModule', 'MenuModule', 'AudioModule',
            'ParticleModule', 'AIModule', 'ReplayModule',
            'SettingsModule', 'GoalModule', 'VictoryModule',
            'PerformanceModule', 'VisualModule', 'PostProcessingModule',
            'DeviceModule'
        ];

        for (const name of moduleNames) {
            if (typeof global[name] !== 'undefined') {
                loadedModules[name] = global[name];
                if (CONFIG.debug) console.log(`[Core] Módulo carregado: ${name}`);
            } else if (CONFIG.debug) {
                console.warn(`[Core] Módulo não encontrado: ${name}`);
            }
        }
    }

    // ============================================================
    // 7. EVENTOS
    // ============================================================
    function setupEvents() {
        // Resize
        const resizeHandler = debounce(handleResize, 100);
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', () => setTimeout(handleResize, 300));

        // Pause
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                togglePause();
                e.preventDefault();
            }
        });

        // Previne scroll
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    }

    // ============================================================
    // 8. REDIMENSIONAMENTO
    // ============================================================
    function handleResize() {
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Ajusta tamanho do canvas
        const width = rect.width;
        const height = rect.height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // Ajusta escala do contexto
        ctx.scale(dpr, dpr);

        // Notifica módulos
        if (loadedModules.Renderer?.FieldRenderer) {
            const renderer = loadedModules.Renderer.FieldRenderer.instance;
            if (renderer) renderer.resize(width, height);
        }

        if (loadedModules.CameraModule?.Camera) {
            const camera = loadedModules.CameraModule.Camera.instance;
            if (camera) camera.resize(width, height);
        }
    }

    // ============================================================
    // 9. LOOP PRINCIPAL
    // ============================================================
    function startLoop() {
        if (GameState.isRunning) return;

        GameState.isRunning = true;
        GameState.lastTimestamp = 0;
        GameState.animationId = requestAnimationFrame(loop);

        console.log('[Core] Loop iniciado');
    }

    function loop(timestamp) {
        if (!GameState.isRunning) return;

        // Calcula delta time
        if (GameState.lastTimestamp === 0) {
            GameState.lastTimestamp = timestamp;
        }

        let deltaTime = (timestamp - GameState.lastTimestamp) / 1000;
        GameState.lastTimestamp = timestamp;

        // Limita delta time
        if (deltaTime > CONFIG.maxDeltaTime) {
            deltaTime = CONFIG.maxDeltaTime;
        }

        // Processa frame
        if (!GameState.isPaused) {
            GameState.deltaTime = deltaTime;
            GameState.elapsedTime += deltaTime;
            GameState.frameCount++;

            // Atualiza
            update(deltaTime);

            // Renderiza
            render();

            // Calcula FPS
            GameState.fpsCounter++;
            GameState.fpsTimer += deltaTime;
            if (GameState.fpsTimer >= 1.0) {
                GameState.fps = GameState.fpsCounter;
                GameState.fpsCounter = 0;
                GameState.fpsTimer = 0;
            }
        }

        // Próximo frame
        GameState.animationId = requestAnimationFrame(loop);
    }

    // ============================================================
    // 10. UPDATE E RENDER
    // ============================================================
    function update(deltaTime) {
        // Atualiza física
        if (loadedModules.Physics?.PhysicsSystem?.instance) {
            loadedModules.Physics.PhysicsSystem.instance.update(deltaTime);
        }

        // Atualiza jogo
        if (loadedModules.GameModule?.Game?.instance) {
            loadedModules.GameModule.Game.instance.update(deltaTime);
        }

        // Atualiza partículas
        if (loadedModules.ParticleModule?.ParticleSystem?.instance) {
            loadedModules.ParticleModule.ParticleSystem.instance.update(deltaTime);
        }

        // Atualiza câmera
        if (loadedModules.CameraModule?.Camera?.instance) {
            loadedModules.CameraModule.Camera.instance.update(deltaTime);
        }

        // Atualiza efeitos visuais
        if (loadedModules.VisualModule?.VisualEffects?.instance) {
            loadedModules.VisualModule.VisualEffects.instance.update(deltaTime);
        }

        // Atualiza replay
        if (loadedModules.ReplayModule?.ReplaySystem?.instance) {
            loadedModules.ReplayModule.ReplaySystem.instance.update(deltaTime);
        }
    }

    function render() {
        if (!ctx || !canvas) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Limpa canvas
        ctx.clearRect(0, 0, width, height);

        // Renderiza campo
        if (loadedModules.Renderer?.FieldRenderer?.instance) {
            loadedModules.Renderer.FieldRenderer.instance.render(ctx);
        }

        // Renderiza jogo
        if (loadedModules.GameModule?.Game?.instance) {
            loadedModules.GameModule.Game.instance.render(ctx);
        }

        // Renderiza HUD
        if (loadedModules.HUDModule?.ModernHUD?.instance) {
            loadedModules.HUDModule.ModernHUD.instance.render(ctx);
        }

        // Renderiza menu
        if (loadedModules.MenuModule?.MainMenu?.instance) {
            loadedModules.MenuModule.MainMenu.instance.render(ctx);
        }

        // Renderiza vitória
        if (loadedModules.VictoryModule?.VictoryScreen?.instance) {
            loadedModules.VictoryModule.VictoryScreen.instance.render(ctx);
        }

        // Renderiza partículas
        if (loadedModules.ParticleModule?.ParticleSystem?.instance) {
            loadedModules.ParticleModule.ParticleSystem.instance.render(ctx);
        }

        // Aplica pós-processamento
        if (loadedModules.PostProcessingModule?.PostProcessingSystem?.instance) {
            const pp = loadedModules.PostProcessingModule.PostProcessingSystem.instance;
            pp.apply(ctx, width, height, GameState.deltaTime);
        }

        // Debug
        if (CONFIG.debug) {
            renderDebug(ctx, width, height);
        }
    }

    // ============================================================
    // 11. DEBUG
    // ============================================================
    function renderDebug(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 200, 80);

        ctx.fillStyle = '#88c0ff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillText(`FPS: ${GameState.fps}`, 16, 14);
        ctx.fillText(`Frame: ${GameState.frameCount}`, 16, 30);
        ctx.fillText(`Delta: ${(GameState.deltaTime * 1000).toFixed(2)}ms`, 16, 46);
        ctx.fillText(`Tempo: ${GameState.elapsedTime.toFixed(1)}s`, 16, 62);

        ctx.restore();
    }

    // ============================================================
    // 12. UTILITÁRIOS
    // ============================================================
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function togglePause() {
        GameState.isPaused = !GameState.isPaused;
        console.log(`[Core] Jogo ${GameState.isPaused ? 'pausado' : 'retomado'}`);
        return GameState.isPaused;
    }

    function stop() {
        GameState.isRunning = false;
        if (GameState.animationId) {
            cancelAnimationFrame(GameState.animationId);
            GameState.animationId = null;
        }
        console.log('[Core] Loop parado');
    }

    // ============================================================
    // 13. EXPORTAÇÃO
    // ============================================================
    const Core = {
        config: CONFIG,
        state: GameState,
        canvas: () => canvas,
        ctx: () => ctx,
        init: init,
        stop: stop,
        togglePause: togglePause,
        resize: handleResize,
        getModule: (name) => loadedModules[name],
        getModules: () => ({ ...loadedModules }),
        version: CONFIG.version,
    };

    global.Core = Core;

    // ============================================================
    // 14. AUTO-INICIALIZAÇÃO
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Core] Núcleo do jogo carregado');

})(typeof window !== 'undefined' ? window : this);
