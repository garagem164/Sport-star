// engine/goal.js — Sistema de comemoração de gol com texto, zoom, confete, animação e som
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO GOL
    // ============================================================
    const GoalConfig = {
        // Texto
        text: {
            primary: 'GOOOOL!',
            secondary: '⚽',
            colors: ['#FFD93D', '#FF6B6B', '#4A90D9', '#6C5CE7', '#FF9F43'],
            fontSize: 80,
            fontSizeSmall: 48,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            shadowBlur: 40,
            shadowColor: 'rgba(255, 215, 0, 0.4)',
        },

        // Zoom
        zoom: {
            target: 1.3,
            duration: 0.6,
            ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            shakeIntensity: 8,
        },

        // Confete
        confetti: {
            count: 150,
            duration: 4.0,
            colors: ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FF9F43', '#00D2D3', '#FF6BB5', '#A8E6CF'],
            speed: 300,
            spread: 600,
            size: [4, 12],
            gravity: 200,
            rotation: true,
        },

        // Animação
        animation: {
            duration: 2.0,
            textPulse: true,
            textScale: 1.2,
            fadeOut: true,
            particles: true,
        },

        // Som
        sound: {
            enabled: true,
            volume: 0.9,
            pitch: 1.0,
            duration: 1.5,
        },
    };

    // ============================================================
    // 2. CLASSE DE COMEMORAÇÃO DE GOL
    // ============================================================
    class GoalCelebration {
        constructor(options = {}) {
            this.config = { ...GoalConfig, ...options };

            // Estado
            this.active = false;
            this.progress = 0;
            this.duration = this.config.animation.duration;
            this.elapsed = 0;

            // Texto
            this.text = this.config.text.primary;
            this.textColor = this.config.text.colors[0];
            this.textScale = 0;

            // Zoom
            this.originalZoom = 1.0;
            this.currentZoom = 1.0;
            this.targetZoom = this.config.zoom.target;

            // Confete
            this.confetti = [];
            this.confettiActive = false;

            // Partículas
            this.particles = [];
            this.particleSystem = null;

            // Som
            this.soundPlayed = false;

            // Callbacks
            this.onStart = null;
            this.onComplete = null;
            this.onUpdate = null;

            // Referências
            this.renderer = null;
            this.camera = null;
            this.audio = null;
            this.game = null;

            // Bind
            this._update = this._update.bind(this);
            this._render = this._render.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(renderer, camera, audio = null, game = null) {
            this.renderer = renderer;
            this.camera = camera;
            this.audio = audio;
            this.game = game;

            console.log('[Goal] Sistema de comemoração de gol inicializado');
            return this;
        }

        // ============================================================
        // 4. INICIAR COMEMORAÇÃO
        // ============================================================

        start(team = null) {
            if (this.active) return;

            this.active = true;
            this.progress = 0;
            this.elapsed = 0;
            this.soundPlayed = false;
            this.confettiActive = true;

            // Define cor do texto baseado no time
            if (team === 'blue') {
                this.textColor = '#4A90D9';
            } else if (team === 'red') {
                this.textColor = '#E74C3C';
            } else {
                this.textColor = this.config.text.colors[Math.floor(Math.random() * this.config.text.colors.length)];
            }

            // Salva zoom original
            if (this.camera) {
                this.originalZoom = this.camera.zoom;
                this.currentZoom = this.originalZoom;
            }

            // Gera confetes
            this._generateConfetti();

            // Gera partículas
            this._generateParticles();

            // Toca som
            this._playSound();

            // Notifica início
            if (this.onStart) {
                this.onStart({ team, text: this.text, color: this.textColor });
            }

            console.log(`[Goal] 🎉 GOOOOL! Time ${team || '?'}`);

            return this;
        }

        // ============================================================
        // 5. GERAÇÃO DE CONFETE
        // ============================================================

        _generateConfetti() {
            const count = this.config.confetti.count;
            const colors = this.config.confetti.colors;
            const spread = this.config.confetti.spread;
            const speed = this.config.confetti.speed;

            this.confetti = [];

            // Centro da tela
            const cx = this.renderer?.width / 2 || 400;
            const cy = this.renderer?.height / 2 || 300;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const velocity = speed * (0.5 + Math.random() * 1.0);
                const size = this.config.confetti.size[0] + Math.random() * (this.config.confetti.size[1] - this.config.confetti.size[0]);

                this.confetti.push({
                    x: cx + (Math.random() - 0.5) * 100,
                    y: cy - 100 + (Math.random() - 0.5) * 50,
                    vx: Math.cos(angle) * velocity * (0.3 + Math.random() * 0.7),
                    vy: -Math.random() * velocity * 0.8 - 100,
                    size: size,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                    life: 1.5 + Math.random() * 2.5,
                    maxLife: 3.5 + Math.random() * 2.0,
                    width: size * (0.5 + Math.random() * 0.5),
                    height: size * (0.3 + Math.random() * 0.3),
                    gravity: this.config.confetti.gravity * (0.8 + Math.random() * 0.4),
                    alpha: 1.0,
                });
            }
        }

        // ============================================================
        // 6. GERAÇÃO DE PARTÍCULAS
        // ============================================================

        _generateParticles() {
            this.particles = [];

            const cx = this.renderer?.width / 2 || 400;
            const cy = this.renderer?.height / 2 || 300;
            const colors = this.config.text.colors;

            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 100 + Math.random() * 300;

                this.particles.push({
                    x: cx + (Math.random() - 0.5) * 80,
                    y: cy + (Math.random() - 0.5) * 40,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 50,
                    size: 2 + Math.random() * 6,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 0.8 + Math.random() * 1.2,
                    maxLife: 1.5 + Math.random() * 1.0,
                    alpha: 0.8 + Math.random() * 0.2,
                    gravity: 150 + Math.random() * 100,
                    friction: 0.98 + Math.random() * 0.01,
                    type: Math.random() > 0.5 ? 'circle' : 'star',
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 15,
                });
            }
        }

        // ============================================================
        // 7. TOQUE DE SOM
        // ============================================================

        _playSound() {
            if (!this.config.sound.enabled || !this.audio) return;

            try {
                // Toca som de gol
                this.audio.playGoal();

                // Toca apito também
                setTimeout(() => {
                    if (this.audio && this.active) {
                        this.audio.playWhistle();
                    }
                }, 200);

                this.soundPlayed = true;
            } catch (e) {
                console.warn('[Goal] Erro ao tocar som:', e);
            }
        }

        // ============================================================
        // 8. ATUALIZAÇÃO
        // ============================================================

        update(deltaTime) {
            if (!this.active) return;

            this.elapsed += deltaTime;
            this.progress = Math.min(1, this.elapsed / this.duration);

            // --- ZOOM ---
            if (this.camera) {
                // Fase 1: Zoom in (0-30% do tempo)
                if (this.progress < 0.3) {
                    const p = this.progress / 0.3;
                    const eased = this._easeOutBack(p);
                    this.currentZoom = this.originalZoom + (this.targetZoom - this.originalZoom) * eased;
                    this.camera.zoom = this.currentZoom;
                }
                // Fase 2: Manter zoom (30-70% do tempo)
                else if (this.progress < 0.7) {
                    this.camera.zoom = this.targetZoom;
                }
                // Fase 3: Zoom out (70-100% do tempo)
                else {
                    const p = (this.progress - 0.7) / 0.3;
                    const eased = this._easeInOut(p);
                    this.currentZoom = this.targetZoom + (this.originalZoom - this.targetZoom) * eased;
                    this.camera.zoom = this.currentZoom;
                }
            }

            // --- TEXTO ---
            // Pulso do texto
            if (this.config.animation.textPulse) {
                const pulse = Math.sin(this.elapsed * 6) * 0.05 + 1;
                this.textScale = 1 + (this.config.animation.textScale - 1) * pulse;
            } else {
                this.textScale = 1 + (1 - this.progress) * (this.config.animation.textScale - 1);
            }

            // --- CONFETE ---
            this._updateConfetti(deltaTime);

            // --- PARTÍCULAS ---
            this._updateParticles(deltaTime);

            // --- NOTIFICAÇÃO ---
            if (this.onUpdate) {
                this.onUpdate({
                    progress: this.progress,
                    elapsed: this.elapsed,
                    textScale: this.textScale,
                    zoom: this.currentZoom,
                });
            }

            // --- FINALIZAÇÃO ---
            if (this.progress >= 1) {
                // Restaura zoom
                if (this.camera) {
                    this.camera.zoom = this.originalZoom;
                }

                this.active = false;

                if (this.onComplete) {
                    this.onComplete();
                }

                console.log('[Goal] Comemoração finalizada');
            }
        }

        // ============================================================
        // 9. ATUALIZAÇÃO DO CONFETE
        // ============================================================

        _updateConfetti(deltaTime) {
            const gravity = this.config.confetti.gravity;

            for (const c of this.confetti) {
                // Física
                c.vx *= 0.995;
                c.vy += gravity * deltaTime;
                c.x += c.vx * deltaTime;
                c.y += c.vy * deltaTime;

                // Rotação
                c.rotation += c.rotationSpeed * deltaTime;

                // Vida
                c.life -= deltaTime;
                c.alpha = Math.max(0, c.life / c.maxLife);

                // Força do vento (efeito sutil)
                c.vx += Math.sin(this.elapsed + c.y * 0.01) * 5 * deltaTime;
            }

            // Remove confetes mortos
            this.confetti = this.confetti.filter(c => c.life > 0 && c.y < this.renderer?.height + 100);
        }

        // ============================================================
        // 10. ATUALIZAÇÃO DE PARTÍCULAS
        // ============================================================

        _updateParticles(deltaTime) {
            for (const p of this.particles) {
                p.vx *= Math.pow(p.friction, deltaTime * 60);
                p.vy += p.gravity * deltaTime;
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;

                p.life -= deltaTime;
                p.alpha = Math.max(0, p.life / p.maxLife * 0.8);

                p.rotation += p.rotationSpeed * deltaTime;
            }

            this.particles = this.particles.filter(p => p.life > 0);
        }

        // ============================================================
        // 11. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.active) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            ctx.save();

            // --- 1. DESENHA CONFETE ---
            for (const c of this.confetti) {
                ctx.globalAlpha = c.alpha * 0.9;
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.rotation);

                ctx.fillStyle = c.color;
                const w = c.width * (0.5 + Math.sin(this.elapsed * 3 + c.x) * 0.2);
                const h = c.height * (0.5 + Math.cos(this.elapsed * 2 + c.y) * 0.2);
                ctx.fillRect(-w / 2, -h / 2, w, h);

                ctx.restore();
            }

            // --- 2. DESENHA PARTÍCULAS ---
            for (const p of this.particles) {
                ctx.globalAlpha = p.alpha * 0.8;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                ctx.fillStyle = p.color;

                if (p.type === 'star') {
                    this._renderStar(ctx, p.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            // --- 3. DESENHA TEXTO ---
            ctx.globalAlpha = 1 - this.progress * 0.3;

            const fontSize = this.progress < 0.5 ?
                this.config.text.fontSize * (1 + this.progress * 0.4) :
                this.config.text.fontSize * (1.4 - (this.progress - 0.5) * 0.8);

            const finalSize = Math.max(fontSize * this.textScale, 20);

            // Sombra do texto
            ctx.shadowColor = this.config.text.shadowColor;
            ctx.shadowBlur = this.config.text.shadowBlur * (1 + (1 - this.progress) * 0.5);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Texto principal
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Gradiente do texto
            const textGradient = ctx.createLinearGradient(centerX - 200, centerY - 50, centerX + 200, centerY + 50);
            const color1 = this.textColor;
            const color2 = this.config.text.colors[Math.floor(Math.random() * this.config.text.colors.length)];
            textGradient.addColorStop(0, color1);
            textGradient.addColorStop(0.5, '#FFD93D');
            textGradient.addColorStop(1, color2);

            ctx.fillStyle = textGradient;
            ctx.font = `bold ${finalSize}px ${this.config.text.fontFamily}`;

            // Pulso adicional do texto
            const extraPulse = 1 + Math.sin(this.elapsed * 8) * 0.03 * (1 - this.progress);
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(extraPulse, extraPulse);
            ctx.fillText(this.text, 0, -20);
            ctx.restore();

            // Subtítulo (emoji)
            ctx.shadowBlur = this.config.text.shadowBlur * 0.5;
            ctx.font = `${finalSize * 0.5}px ${this.config.text.fontFamily}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = (1 - this.progress) * 0.8 + 0.2;
            ctx.fillText(this.config.text.secondary, centerX, centerY + finalSize * 0.6);
            ctx.globalAlpha = 1;

            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // ============================================================
        // 12. UTILITÁRIOS DE RENDERIZAÇÃO
        // ============================================================

        _renderStar(ctx, size) {
            const points = 5;
            const outerRadius = size;
            const innerRadius = size * 0.4;

            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        }

        // ============================================================
        // 13. FUNÇÕES DE EASING
        // ============================================================

        _easeOutBack(t) {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }

        _easeInOut(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        // ============================================================
        // 14. CONTROLE
        // ============================================================

        isActive() {
            return this.active;
        }

        getProgress() {
            return this.progress;
        }

        // ============================================================
        // 15. LIMPEZA
        // ============================================================

        clear() {
            this.confetti = [];
            this.particles = [];
            this.active = false;
            this.progress = 0;

            if (this.camera) {
                this.camera.zoom = this.originalZoom;
            }

            return this;
        }

        // ============================================================
        // 16. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.clear();
            this.renderer = null;
            this.camera = null;
            this.audio = null;
            this.game = null;
            this.onStart = null;
            this.onComplete = null;
            this.onUpdate = null;
            return this;
        }
    }

    // ============================================================
    // 17. EXPORTAÇÃO
    // ============================================================

    const GoalModule = {
        Config: GoalConfig,
        GoalCelebration: GoalCelebration,

        create: (options) => new GoalCelebration(options),
    };

    // ============================================================
    // 18. EXPORTA PARA O GLOBAL
    // ============================================================

    global.GoalModule = GoalModule;
    global.GoalCelebration = GoalCelebration;

    console.log('[Goal] Módulo de comemoração de gol carregado');

})(typeof window !== 'undefined' ? window : this);
