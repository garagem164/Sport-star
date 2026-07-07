// engine/particles.js — Sistema de partículas premium
// Confete, Faíscas, Poeira, Rastros, Explosão de gol
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE PARTÍCULAS
    // ============================================================
    const ParticleConfig = {
        // Configurações padrão
        defaults: {
            life: 2.0,
            fade: 0.98,
            gravity: 0.1,
            friction: 0.98,
            maxParticles: 1000,
        },

        // Cores
        colors: {
            confetti: ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FF9F43', '#00D2D3', '#FF6BB5', '#A8E6CF'],
            spark: ['#FFFFFF', '#FFD93D', '#FF9F43', '#FF6B6B', '#4A90D9'],
            dust: ['rgba(200, 200, 200, 0.6)', 'rgba(180, 180, 180, 0.4)', 'rgba(160, 160, 160, 0.3)'],
            goal: ['#FFD93D', '#FF6B6B', '#4A90D9', '#6C5CE7', '#FF9F43', '#00D2D3', '#FF6BB5', '#A8E6CF', '#FFFFFF'],
            trail: ['rgba(255, 255, 255, 0.3)', 'rgba(136, 192, 255, 0.2)'],
        },

        // Contagens
        counts: {
            confetti: 80,
            spark: 40,
            dust: 30,
            goal: 150,
            trail: 20,
        },
    };

    // ============================================================
    // 2. CLASSE DE PARTÍCULA
    // ============================================================
    class Particle {
        constructor(options = {}) {
            // Posição
            this.x = options.x || 0;
            this.y = options.y || 0;
            
            // Velocidade
            this.vx = options.vx || 0;
            this.vy = options.vy || 0;
            
            // Tamanho
            this.size = options.size || 4;
            this.sizeEnd = options.sizeEnd || 0;
            
            // Vida
            this.life = options.life || 2.0;
            this.maxLife = this.life;
            this.fade = options.fade || 0.98;
            this.alive = true;
            
            // Cor
            this.color = options.color || '#FFFFFF';
            this.alpha = options.alpha || 1.0;
            this.alphaEnd = options.alphaEnd || 0;
            
            // Rotação
            this.rotation = options.rotation || 0;
            this.rotationSpeed = options.rotationSpeed || 0;
            
            // Física
            this.gravity = options.gravity || 0;
            this.friction = options.friction || 0.98;
            this.bounce = options.bounce || 0.3;
            
            // Tipo
            this.type = options.type || 'circle'; // circle, rect, star, confetti
            
            // Dados extras
            this.data = options.data || {};
            this.trail = [];
            this.maxTrail = options.maxTrail || 0;
            
            // Renderização
            this.renderFn = options.renderFn || null;
        }

        update(deltaTime) {
            if (!this.alive) return false;
            
            // Atualiza vida
            this.life -= deltaTime;
            if (this.life <= 0) {
                this.alive = false;
                return false;
            }
            
            // Física
            this.vx *= Math.pow(this.friction, deltaTime * 60);
            this.vy *= Math.pow(this.friction, deltaTime * 60);
            this.vy += this.gravity * deltaTime * 60;
            
            // Movimento
            this.x += this.vx * deltaTime * 60;
            this.y += this.vy * deltaTime * 60;
            
            // Rotação
            this.rotation += this.rotationSpeed * deltaTime * 60;
            
            // Interpolação de tamanho
            const lifeRatio = this.life / this.maxLife;
            const currentSize = this.size + (this.sizeEnd - this.size) * (1 - lifeRatio);
            this.currentSize = Math.max(0, currentSize);
            
            // Interpolação de alpha
            const currentAlpha = this.alpha + (this.alphaEnd - this.alpha) * (1 - lifeRatio);
            this.currentAlpha = Math.max(0, Math.min(1, currentAlpha));
            
            // Rastro
            if (this.maxTrail > 0) {
                this.trail.push({ x: this.x, y: this.y, alpha: this.currentAlpha });
                if (this.trail.length > this.maxTrail) {
                    this.trail.shift();
                }
            }
            
            return true;
        }

        render(ctx) {
            if (!this.alive || this.currentSize < 0.1 || this.currentAlpha < 0.01) return;
            
            ctx.save();
            ctx.globalAlpha = this.currentAlpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Desenha rastro
            if (this.trail.length > 1) {
                for (let i = 1; i < this.trail.length; i++) {
                    const alpha = (i / this.trail.length) * this.currentAlpha * 0.3;
                    const size = this.currentSize * (i / this.trail.length);
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.trail[i].x - this.x, this.trail[i].y - this.y, size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = this.currentAlpha;
            }
            
            // Renderiza baseado no tipo
            if (this.renderFn) {
                this.renderFn(ctx, this);
            } else {
                this._renderDefault(ctx);
            }
            
            ctx.restore();
        }

        _renderDefault(ctx) {
            const size = this.currentSize;
            
            switch (this.type) {
                case 'circle':
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'rect':
                    ctx.fillStyle = this.color;
                    ctx.fillRect(-size / 2, -size / 2, size, size);
                    break;
                    
                case 'star':
                    this._renderStar(ctx, size);
                    break;
                    
                case 'confetti':
                    this._renderConfetti(ctx, size);
                    break;
                    
                default:
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();
            }
        }

        _renderStar(ctx, size) {
            const points = 5;
            const outerRadius = size;
            const innerRadius = size * 0.4;
            
            ctx.fillStyle = this.color;
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

        _renderConfetti(ctx, size) {
            const width = size;
            const height = size * 0.6;
            
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.rotate(this.rotation * 0.5);
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
        }
    }

    // ============================================================
    // 3. SISTEMA DE PARTÍCULAS
    // ============================================================
    class ParticleSystem {
        constructor(options = {}) {
            this.config = { ...ParticleConfig, ...options };
            this.particles = [];
            this.pools = {};
            this.renderer = null;
            this.autoUpdate = true;
        }

        init(renderer) {
            this.renderer = renderer;
            return this;
        }

        // ============================================================
        // 4. CRIAÇÃO DE PARTÍCULAS
        // ============================================================

        createParticle(options) {
            const particle = new Particle({
                ...this.config.defaults,
                ...options,
            });
            this.particles.push(particle);
            return particle;
        }

        createBurst(options) {
            const count = options.count || 20;
            const particles = [];
            
            for (let i = 0; i < count; i++) {
                const angle = options.angle !== undefined ? 
                    options.angle + (Math.random() - 0.5) * (options.spread || Math.PI * 2) :
                    Math.random() * Math.PI * 2;
                    
                const speed = options.speed || (100 + Math.random() * 200);
                const vx = Math.cos(angle) * speed * (0.5 + Math.random() * 0.5);
                const vy = Math.sin(angle) * speed * (0.5 + Math.random() * 0.5);
                
                const p = this.createParticle({
                    x: options.x || 0,
                    y: options.y || 0,
                    vx: vx,
                    vy: vy,
                    size: options.size || (2 + Math.random() * 6),
                    life: options.life || (1 + Math.random() * 2),
                    color: options.colors ? 
                        options.colors[Math.floor(Math.random() * options.colors.length)] : 
                        '#FFFFFF',
                    alpha: options.alpha || 1,
                    alphaEnd: options.alphaEnd || 0,
                    gravity: options.gravity || 0.1,
                    friction: options.friction || 0.98,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                    type: options.type || 'circle',
                    ...options.particleOptions,
                });
                
                particles.push(p);
            }
            
            return particles;
        }

        // ============================================================
        // 5. TIPOS DE EXPLOSÃO
        // ============================================================

        // --- CONFETE ---
        createConfetti(x, y, count = null) {
            const num = count || this.config.counts.confetti;
            const colors = this.config.colors.confetti;
            
            return this.createBurst({
                x: x,
                y: y,
                count: num,
                speed: 150 + Math.random() * 250,
                spread: Math.PI * 2,
                size: 4 + Math.random() * 8,
                life: 2 + Math.random() * 3,
                colors: colors,
                type: 'confetti',
                alpha: 0.9,
                alphaEnd: 0,
                gravity: 0.15,
                friction: 0.97,
                particleOptions: {
                    rotationSpeed: (Math.random() - 0.5) * 15,
                    maxTrail: 0,
                },
            });
        }

        // --- FAÍSCAS ---
        createSparks(x, y, count = null) {
            const num = count || this.config.counts.spark;
            const colors = this.config.colors.spark;
            
            return this.createBurst({
                x: x,
                y: y,
                count: num,
                speed: 200 + Math.random() * 400,
                spread: Math.PI * 2,
                size: 1 + Math.random() * 3,
                life: 0.5 + Math.random() * 1.5,
                colors: colors,
                type: 'circle',
                alpha: 0.9,
                alphaEnd: 0,
                gravity: 0.05,
                friction: 0.95,
                particleOptions: {
                    rotationSpeed: (Math.random() - 0.5) * 20,
                    maxTrail: 5,
                    sizeEnd: 0,
                },
            });
        }

        // --- POEIRA ---
        createDust(x, y, count = null) {
            const num = count || this.config.counts.dust;
            const colors = this.config.colors.dust;
            
            return this.createBurst({
                x: x,
                y: y,
                count: num,
                speed: 20 + Math.random() * 60,
                spread: Math.PI * 2,
                size: 2 + Math.random() * 6,
                life: 1 + Math.random() * 2,
                colors: colors,
                type: 'circle',
                alpha: 0.3 + Math.random() * 0.3,
                alphaEnd: 0,
                gravity: -0.02,
                friction: 0.99,
                particleOptions: {
                    rotationSpeed: (Math.random() - 0.5) * 2,
                    maxTrail: 0,
                },
            });
        }

        // --- RASTRO ---
        createTrail(x, y, vx, vy, color = null, count = null) {
            const num = count || this.config.counts.trail;
            const colors = color ? [color] : this.config.colors.trail;
            
            return this.createBurst({
                x: x,
                y: y,
                count: num,
                speed: 10 + Math.random() * 30,
                spread: 0.5,
                size: 2 + Math.random() * 4,
                life: 0.3 + Math.random() * 0.7,
                colors: colors,
                type: 'circle',
                alpha: 0.5 + Math.random() * 0.3,
                alphaEnd: 0,
                gravity: 0,
                friction: 0.98,
                particleOptions: {
                    rotationSpeed: (Math.random() - 0.5) * 2,
                    maxTrail: 0,
                    vx: vx + (Math.random() - 0.5) * 20,
                    vy: vy + (Math.random() - 0.5) * 20,
                },
            });
        }

        // --- EXPLOSÃO DE GOL ---
        createGoalExplosion(x, y) {
            const particles = [];
            const colors = this.config.colors.goal;
            
            // Confete principal
            const confetti = this.createConfetti(x, y, 100);
            particles.push(...confetti);
            
            // Faíscas
            const sparks = this.createSparks(x, y, 60);
            particles.push(...sparks);
            
            // Estrelas
            const stars = this.createBurst({
                x: x,
                y: y,
                count: 40,
                speed: 100 + Math.random() * 300,
                spread: Math.PI * 2,
                size: 3 + Math.random() * 6,
                life: 1 + Math.random() * 2,
                colors: ['#FFD93D', '#FF6B6B', '#FFFFFF'],
                type: 'star',
                alpha: 0.9,
                alphaEnd: 0,
                gravity: 0.05,
                friction: 0.98,
                particleOptions: {
                    rotationSpeed: (Math.random() - 0.5) * 10,
                    maxTrail: 0,
                },
            });
            particles.push(...stars);
            
            // Anel de partículas
            const ringCount = 60;
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const speed = 150 + Math.random() * 200;
                const p = this.createParticle({
                    x: x + Math.cos(angle) * 10,
                    y: y + Math.sin(angle) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    life: 1 + Math.random() * 1.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 0.8,
                    alphaEnd: 0,
                    gravity: 0.1,
                    friction: 0.97,
                    type: 'circle',
                    rotation: angle,
                    rotationSpeed: (Math.random() - 0.5) * 5,
                    maxTrail: 3,
                });
                particles.push(p);
            }
            
            // Poeira elevada
            const dust = this.createDust(x, y - 30, 20);
            particles.push(...dust);
            
            return particles;
        }

        // ============================================================
        // 6. ATUALIZAÇÃO
        // ============================================================

        update(deltaTime) {
            if (!this.autoUpdate) return;
            
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                const alive = p.update(deltaTime);
                if (!alive) {
                    this.particles.splice(i, 1);
                }
            }
        }

        // ============================================================
        // 7. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            // Ordena por alpha (transparentes primeiro) para melhor blending
            const sorted = [...this.particles].sort((a, b) => a.currentAlpha - b.currentAlpha);
            
            for (const p of sorted) {
                p.render(ctx);
            }
        }

        // ============================================================
        // 8. MÉTODOS DE CONTROLE
        // ============================================================

        clear() {
            this.particles = [];
            return this;
        }

        pause() {
            this.autoUpdate = false;
            return this;
        }

        resume() {
            this.autoUpdate = true;
            return this;
        }

        getCount() {
            return this.particles.length;
        }

        getStats() {
            return {
                count: this.particles.length,
                types: this.particles.reduce((acc, p) => {
                    acc[p.type] = (acc[p.type] || 0) + 1;
                    return acc;
                }, {}),
            };
        }

        // ============================================================
        // 9. MÉTODOS DE PRÉ-CRIAÇÃO (BATCH)
        // ============================================================

        preCreateConfetti(x, y, count) {
            return this.createConfetti(x, y, count);
        }

        preCreateSparks(x, y, count) {
            return this.createSparks(x, y, count);
        }

        preCreateGoalExplosion(x, y) {
            return this.createGoalExplosion(x, y);
        }

        // ============================================================
        // 10. LIMPEZA
        // ============================================================

        destroy() {
            this.clear();
            this.renderer = null;
            this.pools = {};
            return this;
        }
    }

    // ============================================================
    // 11. EXPORTAÇÃO
    // ============================================================

    const ParticleModule = {
        Config: ParticleConfig,
        Particle: Particle,
        ParticleSystem: ParticleSystem,

        create: (options) => new ParticleSystem(options),
    };

    // ============================================================
    // 12. EXPORTA PARA O GLOBAL
    // ============================================================

    global.ParticleModule = ParticleModule;
    global.Particle = Particle;
    global.ParticleSystem = ParticleSystem;

    console.log('[Particles] Módulo de partículas carregado');

})(typeof window !== 'undefined' ? window : this);
