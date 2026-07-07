// engine/main.js — Ponto de entrada unificado e otimizado
(function(global) {
    'use strict';

    // ============================================================
    // 1. INICIALIZAÇÃO DO JOGO
    // ============================================================
    function initGame() {
        console.log('[Main] Iniciando jogo...');

        // Verifica módulos essenciais
        const required = ['Math2D', 'Physics', 'Game', 'Renderer'];
        for (const mod of required) {
            if (typeof global[mod] === 'undefined') {
                console.error(`[Main] Módulo essencial não encontrado: ${mod}`);
                return;
            }
        }

        // Obtém referências
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('[Main] Canvas não encontrado');
            return;
        }

        const ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
        });

        // Cria instâncias
        const physics = new Physics.System({ gravity: new Vec2(0, 0) });
        const renderer = new Renderer.FieldRenderer();
        const input = new InputManager();
        const camera = new Camera();
        const audio = new AudioManager();
        const particles = new ParticleSystem();
        const game = new Game();

        // Inicializa
        renderer.init();
        input.init(canvas, renderer);
        camera.init(canvas.width, canvas.height);
        audio.init();
        particles.init(renderer);
        game.init(physics, renderer, input, camera, audio, particles);

        // Configura discos (exemplo)
        const discs = [];
        const ball = new Ball();

        // Inicia jogo
        game.startGame();

        // Loop principal via Core
        if (global.Core) {
            global.Core.init();
        }

        console.log('[Main] Jogo iniciado com sucesso!');
        return { game, physics, renderer, input, camera, audio, particles };
    }

    // ============================================================
    // 2. AUTO-INICIALIZAÇÃO
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }

    // ============================================================
    // 3. EXPORTAÇÃO
    // ============================================================
    global.Main = {
        init: initGame,
    };

    console.log('[Main] Carregado');

})(typeof window !== 'undefined' ? window : this);
