/**
 * Ponto de entrada principal do jogo
 * @module Main
 */
const Main = {
    game: null,
    renderer: null,
    input: null,
    physics: null,
    collisionSystem: null,
    camera: null,
    audio: null,
    particles: null,
    canvas: null,
    ctx: null,
    running: false,
    animationId: null,
    lastTime: 0,

    /**
     * Inicializa o jogo
     */
    init() {
        console.log('[Main] 🎮 Iniciando Bounce Arena...');
        
        // Obtém canvas
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('[Main] Canvas não encontrado!');
            return;
        }
        
        // Configura canvas
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
        });
        
        // Redimensiona canvas
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        window.addEventListener('orientationchange', () => setTimeout(() => this._resizeCanvas(), 300));
        
        // Cria sub-sistemas
        this._createSystems();
        
        // Inicializa o jogo
        this._initGame();
        
        // Inicia loop
        this.start();
        
        console.log('[Main] ✅ Jogo iniciado com sucesso!');
    },

    /**
     * Redimensiona o canvas
     */
    _resizeCanvas() {
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        
        if (this.renderer) {
            this.renderer.resize(rect.width, rect.height);
        }
        
        if (this.camera) {
            this.camera.resize(rect.width, rect.height);
        }
    },

    /**
     * Cria os sub-sistemas
     */
    _createSystems() {
        // Física
        this.physics = new PhysicsSystem({ 
            gravity: new Vec2(0, 0),
            damping: 0.98,
            substeps: 4,
        });
        
        // Sistema de colisões
        this.collisionSystem = new CollisionSystem();
        
        // Renderizador
        this.renderer = new FieldRenderer({
            width: 800,
            height: 500,
            padding: 30,
            goalWidth: 120,
            goalDepth: 20,
        });
        this.renderer.init();
        
        // Input
        this.input = new InputManager({
            maxDragDistance: 200,
            minForce: 50,
            maxForce: 800,
        });
        this.input.init(this.canvas, this.renderer);
        
        // Câmera
        this.camera = {
            x: 0, y: 0, zoom: 1,
            resize: (w, h) => {},
            update: (dt) => {},
        };
        
        // Áudio
        this.audio = {
            play: () => {},
            playGoal: () => {},
            playWhistle: () => {},
            playVictory: () => {},
            playClick: () => {},
            playCollision: () => {},
        };
        
        // Partículas
        this.particles = {
            createGoalExplosion: (x, y) => {},
            update: (dt) => {},
            render: (ctx) => {},
        };
    },

    /**
     * Inicializa o jogo
     */
    _initGame() {
        this.game = new Game({
            scoreToWin: 5,
            maxTurns: 20,
            turnTime: 30,
            delayAfterShoot: 1.5,
            delayAfterGoal: 2.0,
            fieldWidth: 800,
            fieldHeight: 500,
        });
        
        this.game.init({
            physics: this.physics,
            collisionSystem: this.collisionSystem,
            renderer: this.renderer,
            input: this.input,
            camera: this.camera,
            audio: this.audio,
            particles: this.particles,
        });
        
        // Adiciona eventos de clique para reinício
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width / (window.devicePixelRatio || 1));
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height / (window.devicePixelRatio || 1));
            this.game.handleClick(x, y);
        });
    },

    /**
     * Inicia o loop do jogo
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this._loop(performance.now());
        console.log('[Main] Loop iniciado');
    },

    /**
     * Para o loop do jogo
     */
    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('[Main] Loop parado');
    },

    /**
     * Loop principal
     */
    _loop(timestamp) {
        if (!this.running) return;
        
        const delta = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        const dt = Math.min(delta, 0.05);
        
        // Atualiza
        this.game.update(dt);
        
        // Renderiza
        this._render();
        
        // Próximo frame
        this.animationId = requestAnimationFrame((t) => this._loop(t));
    },

    /**
     * Renderiza o jogo
     */
    _render() {
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Limpa canvas
        ctx.clearRect(0, 0, width, height);
        
        // Renderiza campo
        if (this.renderer) {
            this.renderer.render(ctx);
        }
        
        // Renderiza jogo
        if (this.game) {
            this.game.render(ctx);
        }
    },

    /**
     * Reinicia o jogo
     */
    restart() {
        if (this.game) {
            this.game.restart();
        }
    },

    /**
     * Obtém estatísticas
     */
    getStats() {
        if (this.game) {
            return this.game.getStats();
        }
        return null;
    }
};

// Inicialização automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Main.init());
} else {
    Main.init();
}

// Exporta para debugging
window.Main = Main;
window.Game = Game;
window.Disc = Disc;
window.Ball = Ball;

console.log('[Main] Carregado com sucesso!');
