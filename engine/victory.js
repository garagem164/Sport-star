// engine/victory.js — Tela de Vitória com fogos, taça, pontuação e botão jogar novamente
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DA TELA DE VITÓRIA
    // ============================================================
    const VictoryConfig = {
        // Cores
        colors: {
            background: 'rgba(10, 15, 25, 0.92)',
            backgroundSecondary: 'rgba(20, 30, 45, 0.7)',
            card: 'rgba(15, 20, 35, 0.95)',
            border: 'rgba(255, 255, 255, 0.08)',
            gold: '#FFD93D',
            silver: '#BDC3C7',
            bronze: '#CD7F32',
            text: {
                primary: '#FFFFFF',
                secondary: 'rgba(255, 255, 255, 0.7)',
                tertiary: 'rgba(255, 255, 255, 0.4)',
            },
        },

        // Layout
        layout: {
            width: 480,
            maxHeight: 580,
            padding: 32,
            borderRadius: 24,
            cardSpacing: 16,
        },

        // Fogos
        fireworks: {
            count: 8,
            bursts: 3,
            particlesPerBurst: 60,
            colors: ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FF9F43', '#00D2D3', '#FF6BB5', '#A8E6CF'],
            duration: 6.0,
            speed: 200,
            gravity: 300,
            spread: 400,
            size: [2, 5],
            life: [1.0, 2.5],
        },

        // Taça
        trophy: {
            size: 80,
            color: '#FFD93D',
            glowColor: 'rgba(255, 215, 0, 0.3)',
            shineColor: 'rgba(255, 255, 255, 0.4)',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
        },

        // Animações
        animations: {
            duration: 0.8,
            delay: 0.1,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            floatSpeed: 1.5,
            floatAmplitude: 6,
        },

        // Botão
        button: {
            width: 200,
            height: 48,
            borderRadius: 12,
            fontSize: 16,
            color: '#4A90D9',
            hoverColor: '#6BB5FF',
            textColor: '#FFFFFF',
            shadowColor: 'rgba(74, 144, 217, 0.3)',
        },
    };

    // ============================================================
    // 2. CLASSE DE PARTÍCULA DE FOGO
    // ============================================================
    class FireworkParticle {
        constructor(options = {}) {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.vx = options.vx || 0;
            this.vy = options.vy || 0;
            this.size = options.size || 3;
            this.color = options.color || '#FFFFFF';
            this.life = options.life || 2.0;
            this.maxLife = this.life;
            this.gravity = options.gravity || 300;
            this.alpha = 1.0;
            this.trail = [];
            this.maxTrail = 5;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 10;
        }

        update(deltaTime) {
            this.vy += this.gravity * deltaTime;
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.life -= deltaTime;
            this.alpha = Math.max(0, this.life / this.maxLife);

            this.rotation += this.rotationSpeed * deltaTime;

            // Rastro
            if (this.maxTrail > 0 && this.alpha > 0.2) {
                this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
                if (this.trail.length > this.maxTrail) {
                    this.trail.shift();
                }
            }

            return this.life > 0;
        }

        render(ctx) {
            if (this.alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = this.alpha;

            // Rastro
            for (let i = 1; i < this.trail.length; i++) {
                const t = i / this.trail.length;
                const alpha = this.alpha * t * 0.3;
                const size = this.size * t * 0.5;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = this.alpha;

            // Brilho da partícula
            const glow = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size * 3
            );
            glow.addColorStop(0, this.color);
            glow.addColorStop(0.3, this.color);
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
        }
    }

    // ============================================================
    // 3. CLASSE PRINCIPAL - TELA DE VITÓRIA
    // ============================================================
    class VictoryScreen {
        constructor(options = {}) {
            this.config = { ...VictoryConfig, ...options };

            // Estado
            this.visible = false;
            this.animating = false;
            this.animationProgress = 0;
            this.winner = null;
            this.score = { blue: 0, red: 0 };
            this.stats = null;
            this.elapsed = 0;

            // Fogos
            this.fireworks = [];
            this.fireworkTimers = [];
            this.fireworksActive = false;

            // Taça
            this.trophyRotation = 0;
            this.trophyFloat = 0;

            // Botão
            this.buttonHovered = false;
            this.buttonClicked = false;

            // Callbacks
            this.onPlayAgain = null;
            this.onMenu = null;
            this.onClose = null;

            // Referências
            this.renderer = null;
            this.game = null;
            this.audio = null;

            // Bind
            this._update = this._update.bind(this);
            this._render = this._render.bind(this);
            this._spawnFirework = this._spawnFirework.bind(this);
        }

        // ============================================================
        // 4. INICIALIZAÇÃO
        // ============================================================

        init(renderer, game, audio = null) {
            this.renderer = renderer;
            this.game = game;
            this.audio = audio;

            console.log('[Victory] Tela de vitória inicializada');
            return this;
        }

        // ============================================================
        // 5. MOSTRAR TELA
        // ============================================================

        show(winner, score, stats = null) {
            this.visible = true;
            this.animating = true;
            this.animationProgress = 0;
            this.winner = winner;
            this.score = score || { blue: 0, red: 0 };
            this.stats = stats;
            this.elapsed = 0;
            this.fireworksActive = true;

            // Gera fogos iniciais
            this.fireworks = [];
            this.fireworkTimers = [];

            // Anima entrada
            const animate = () => {
                this.animationProgress += 0.025;
                if (this.animationProgress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animationProgress = 1;
                    this.animating = false;
                }
            };
            animate();

            // Inicia fogos
            this._startFireworks();

            // Toca som de vitória
            if (this.audio) {
                this.audio.playVictory();
                setTimeout(() => {
                    if (this.audio && this.visible) {
                        this.audio.playWhistle();
                    }
                }, 500);
            }

            console.log(`[Victory] 🏆 Vitória do time ${winner}!`);

            return this;
        }

        // ============================================================
        // 6. OCULTAR TELA
        // ============================================================

        hide() {
            this.visible = false;
            this.fireworksActive = false;
            this.fireworks = [];
            this.fireworkTimers = [];

            if (this.onClose) {
                this.onClose();
            }

            return this;
        }

        // ============================================================
        // 7. FOGOS DE ARTIFÍCIO
        // ============================================================

        _startFireworks() {
            if (!this.fireworksActive) return;

            // Limpa fogos anteriores
            this.fireworks = [];
            this.fireworkTimers = [];

            // Agendamento de fogos
            const count = this.config.fireworks.count;
            const interval = this.config.fireworks.duration / count;

            for (let i = 0; i < count; i++) {
                const delay = i * interval + Math.random() * 0.5;
                setTimeout(() => {
                    if (this.fireworksActive && this.visible) {
                        this._spawnFirework();
                    }
                }, delay * 1000);
            }

            // Fogos extras aleatórios
            for (let i = 0; i < count * 0.5; i++) {
                const delay = 0.5 + Math.random() * this.config.fireworks.duration;
                setTimeout(() => {
                    if (this.fireworksActive && this.visible && Math.random() > 0.5) {
                        this._spawnFirework();
                    }
                }, delay * 1000);
            }
        }

        _spawnFirework() {
            const width = this.renderer?.width || 800;
            const height = this.renderer?.height || 600;
            const config = this.config.fireworks;

            // Posição aleatória no topo da tela
            const x = 50 + Math.random() * (width - 100);
            const y = 50 + Math.random() * (height * 0.5);

            // Múltiplas explosões
            const bursts = 1 + Math.floor(Math.random() * config.bursts);

            for (let b = 0; b < bursts; b++) {
                const burstX = x + (Math.random() - 0.5) * 100;
                const burstY = y + (Math.random() - 0.5) * 80;
                const count = config.particlesPerBurst * (0.5 + Math.random() * 0.5);
                const colors = config.colors;

                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = config.speed * (0.3 + Math.random() * 0.7);
                    const size = config.size[0] + Math.random() * (config.size[1] - config.size[0]);

                    const particle = new FireworkParticle({
                        x: burstX,
                        y: burstY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 50,
                        size: size,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: config.life[0] + Math.random() * (config.life[1] - config.life[0]),
                        gravity: config.gravity * (0.8 + Math.random() * 0.4),
                    });

                    this.fireworks.push(particle);
                }

                // Efeito de estrela no centro
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const speed = 50 + Math.random() * 100;

                    const particle = new FireworkParticle({
                        x: burstX,
                        y: burstY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 30,
                        size: 1 + Math.random() * 2,
                        color: '#FFFFFF',
                        life: 0.3 + Math.random() * 0.5,
                        gravity: 50,
                    });

                    this.fireworks.push(particle);
                }
            }

            // Efeito de som (opcional)
            if (this.audio && Math.random() > 0.3) {
                this.audio.playCollision();
            }
        }

        // ============================================================
        // 8. ATUALIZAÇÃO
        // ============================================================

        update(deltaTime) {
            if (!this.visible) return;

            this.elapsed += deltaTime;

            // Atualiza fogos
            this.fireworksActive = this.elapsed < this.config.fireworks.duration;

            for (let i = this.fireworks.length - 1; i >= 0; i--) {
                const alive = this.fireworks[i].update(deltaTime);
                if (!alive) {
                    this.fireworks.splice(i, 1);
                }
            }

            // Gera novos fogos aleatórios
            if (this.fireworksActive && Math.random() < 0.02) {
                this._spawnFirework();
            }

            // Taça - animação flutuante
            this.trophyFloat = Math.sin(this.elapsed * this.config.animations.floatSpeed) *
                              this.config.animations.floatAmplitude;
            this.trophyRotation = Math.sin(this.elapsed * 0.3) * 0.05;
        }

        // ============================================================
        // 9. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.visible) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            const progress = this.animationProgress;
            const alpha = progress;

            ctx.save();

            // --- FUNDO ---
            ctx.fillStyle = this.config.colors.background;
            ctx.fillRect(0, 0, width, height);

            // --- FOGOS ---
            for (const particle of this.fireworks) {
                particle.render(ctx);
            }

            // --- CARD PRINCIPAL ---
            const cardWidth = this.config.layout.width;
            const cardHeight = Math.min(this.config.layout.maxHeight, 420);
            const cardX = centerX - cardWidth / 2;
            const cardY = centerY - cardHeight / 2;

            const scale = 0.7 + progress * 0.3;
            const cardAlpha = alpha;

            ctx.globalAlpha = cardAlpha;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-centerX, -centerY);

            // Sombra do card
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 50;
            ctx.shadowOffsetY = 10;

            // Fundo do card
            ctx.shadowBlur = 0;
            ctx.fillStyle = this.config.colors.card;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardWidth, cardHeight, this.config.layout.borderRadius);
            ctx.fill();

            // Borda com glow
            const borderColor = this.winner === 'blue' ? '#4A90D9' :
                               this.winner === 'red' ? '#E74C3C' :
                               this.config.colors.gold;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardWidth, cardHeight, this.config.layout.borderRadius);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Brilho do glass
            const glassGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 60);
            glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
            glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glassGradient;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardWidth, 60, this.config.layout.borderRadius);
            ctx.fill();

            const contentY = cardY + 40;

            // --- TAÇA ---
            const trophySize = this.config.trophy.size;
            const trophyX = centerX;
            const trophyY = contentY + 20 + this.trophyFloat;

            // Sombra da taça
            ctx.shadowColor = this.config.trophy.shadowColor;
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 5;

            // Glow da taça
            const glow = ctx.createRadialGradient(
                trophyX, trophyY, 0,
                trophyX, trophyY, trophySize * 1.5
            );
            glow.addColorStop(0, this.config.trophy.glowColor);
            glow.addColorStop(1, 'rgba(255, 215, 0, 0)');

            ctx.shadowBlur = 0;
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(trophyX, trophyY, trophySize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Corpo da taça
            ctx.save();
            ctx.translate(trophyX, trophyY);
            ctx.rotate(this.trophyRotation);

            ctx.shadowColor = this.config.trophy.shadowColor;
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 4;

            // Base da taça
            const baseGradient = ctx.createLinearGradient(-30, 40, 30, 50);
            baseGradient.addColorStop(0, '#D4A800');
            baseGradient.addColorStop(0.5, '#FFD93D');
            baseGradient.addColorStop(1, '#B8960F');

            ctx.fillStyle = baseGradient;
            ctx.beginPath();
            ctx.moveTo(-30, 40);
            ctx.quadraticCurveTo(-25, 50, -20, 50);
            ctx.lineTo(20, 50);
            ctx.quadraticCurveTo(25, 50, 30, 40);
            ctx.quadraticCurveTo(0, 45, -30, 40);
            ctx.fill();

            // Haste
            const stemGradient = ctx.createLinearGradient(-5, 20, 5, 40);
            stemGradient.addColorStop(0, '#D4A800');
            stemGradient.addColorStop(0.5, '#FFD93D');
            stemGradient.addColorStop(1, '#B8960F');

            ctx.fillStyle = stemGradient;
            ctx.fillRect(-4, 20, 8, 22);

            // Taça principal (corpo)
            const cupGradient = ctx.createRadialGradient(-10, -10, 5, 0, 0, 35);
            cupGradient.addColorStop(0, '#FFF4A0');
            cupGradient.addColorStop(0.3, '#FFD93D');
            cupGradient.addColorStop(0.7, '#D4A800');
            cupGradient.addColorStop(1, '#B8960F');

            ctx.shadowBlur = 25;
            ctx.fillStyle = cupGradient;
            ctx.beginPath();
            ctx.moveTo(-25, 10);
            ctx.quadraticCurveTo(-35, -15, -20, -30);
            ctx.quadraticCurveTo(-10, -38, 0, -38);
            ctx.quadraticCurveTo(10, -38, 20, -30);
            ctx.quadraticCurveTo(35, -15, 25, 10);
            ctx.quadraticCurveTo(0, 18, -25, 10);
            ctx.fill();

            // Brilho da taça
            ctx.shadowBlur = 0;
            const shine = ctx.createRadialGradient(-15, -25, 2, -10, -20, 20);
            shine.addColorStop(0, this.config.trophy.shineColor);
            shine.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = shine;
            ctx.beginPath();
            ctx.arc(-10, -20, 20, 0, Math.PI * 2);
            ctx.fill();

            // Estrela na taça
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.6;
            ctx.font = '20px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', 0, -15);
            ctx.globalAlpha = 1;

            ctx.restore();

            // --- TÍTULO ---
            const titleY = trophyY + trophySize + 20;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const isDraw = this.winner === 'draw' || !this.winner;
            const titleText = isDraw ? '🤝 Empate!' : '🏆 Vitória!';
            const titleColor = isDraw ? this.config.colors.gold :
                              this.winner === 'blue' ? '#4A90D9' : '#E74C3C';

            ctx.shadowColor = titleColor;
            ctx.shadowBlur = 30;
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 28px system-ui, sans-serif';
            ctx.fillText(titleText, centerX, titleY);

            // Nome do vencedor
            if (!isDraw) {
                const teamName = this.winner === 'blue' ? 'Time Azul' : 'Time Vermelho';
                ctx.shadowBlur = 0;
                ctx.fillStyle = this.config.colors.text.secondary;
                ctx.font = '18px system-ui, sans-serif';
                ctx.fillText(teamName, centerX, titleY + 36);
            }

            // --- PONTUAÇÃO ---
            const scoreY = titleY + (isDraw ? 40 : 70);
            ctx.shadowBlur = 0;

            // Placar
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 42px system-ui, sans-serif';
            ctx.textShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            ctx.fillText(
                `${this.score.blue || 0}  x  ${this.score.red || 0}`,
                centerX,
                scoreY + 10
            );
            ctx.textShadow = 'none';

            // Estatísticas
            const statsY = scoreY + 50;
            if (this.stats) {
                ctx.fillStyle = this.config.colors.text.tertiary;
                ctx.font = '13px system-ui, sans-serif';
                const statsText = `${this.stats.turn || 0} turnos  •  ${this.stats.goals || 0} gols`;
                ctx.fillText(statsText, centerX, statsY);
            }

            // --- BOTÃO JOGAR NOVAMENTE ---
            const btnY = cardY + cardHeight - 60;
            const btnWidth = this.config.button.width;
            const btnHeight = this.config.button.height;
            const btnX = centerX - btnWidth / 2;

            const isHovered = this.buttonHovered;
            const isClicked = this.buttonClicked;

            ctx.shadowColor = this.config.button.shadowColor;
            ctx.shadowBlur = isHovered ? 30 : 15;
            ctx.shadowOffsetY = isHovered ? 4 : 6;

            const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
            const color = isHovered ? this.config.button.hoverColor : this.config.button.color;
            btnGradient.addColorStop(0, color);
            btnGradient.addColorStop(1, this._darkenColor(color, 0.2));

            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btnX, btnY, btnWidth, btnHeight, this.config.button.borderRadius);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Efeito de clique
            if (isClicked) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.roundRect(btnX + 2, btnY + 2, btnWidth - 4, btnHeight - 4, this.config.button.borderRadius - 2);
                ctx.fill();
            }

            ctx.fillStyle = this.config.button.textColor;
            ctx.font = `bold ${this.config.button.fontSize}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔄 Jogar Novamente', centerX, btnY + btnHeight / 2 + 1);

            // Botão Menu (pequeno)
            const menuBtnY = btnY + btnHeight + 12;
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText('← Menu Principal', centerX, menuBtnY + 8);

            // Salva posições dos botões
            this._playBtn = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };
            this._menuBtn = { x: centerX - 80, y: menuBtnY, width: 160, height: 24 };

            ctx.restore();
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 10. INTERAÇÃO
        // ============================================================

        handleMouseMove(x, y) {
            if (!this.visible) return null;

            const hovered = {
                play: false,
                menu: false,
            };

            if (this._playBtn) {
                hovered.play = x >= this._playBtn.x && x <= this._playBtn.x + this._playBtn.width &&
                               y >= this._playBtn.y && y <= this._playBtn.y + this._playBtn.height;
            }

            if (this._menuBtn) {
                hovered.menu = x >= this._menuBtn.x && x <= this._menuBtn.x + this._menuBtn.width &&
                               y >= this._menuBtn.y && y <= this._menuBtn.y + this._menuBtn.height;
            }

            this.buttonHovered = hovered.play || hovered.menu;

            return hovered;
        }

        handleClick(x, y) {
            if (!this.visible) return null;

            // Botão Jogar Novamente
            if (this._playBtn && x >= this._playBtn.x && x <= this._playBtn.x + this._playBtn.width &&
                y >= this._playBtn.y && y <= this._playBtn.y + this._playBtn.height) {

                this.buttonClicked = true;
                setTimeout(() => { this.buttonClicked = false; }, 200);

                if (this.onPlayAgain) {
                    this.onPlayAgain();
                }
                return 'play_again';
            }

            // Botão Menu
            if (this._menuBtn && x >= this._menuBtn.x && x <= this._menuBtn.x + this._menuBtn.width &&
                y >= this._menuBtn.y && y <= this._menuBtn.y + this._menuBtn.height) {

                if (this.onMenu) {
                    this.onMenu();
                }
                return 'menu';
            }

            // Qualquer clique na tela (fecha)
            return null;
        }

        // ============================================================
        // 11. UTILITÁRIOS
        // ============================================================

        _darkenColor(color, amount) {
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);

            r = Math.floor(r * (1 - amount));
            g = Math.floor(g * (1 - amount));
            b = Math.floor(b * (1 - amount));

            return `rgb(${r}, ${g}, ${b})`;
        }

        // ============================================================
        // 12. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                visible: this.visible,
                animating: this.animating,
                progress: this.animationProgress,
                winner: this.winner,
                score: { ...this.score },
                fireworks: this.fireworks.length,
                elapsed: this.elapsed,
            };
        }

        // ============================================================
        // 13. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.fireworks = [];
            this.fireworkTimers = [];
            this.renderer = null;
            this.game = null;
            this.audio = null;
            this.onPlayAgain = null;
            this.onMenu = null;
            this.onClose = null;
            return this;
        }
    }

    // ============================================================
    // 14. EXPORTAÇÃO
    // ============================================================

    const VictoryModule = {
        Config: VictoryConfig,
        VictoryScreen: VictoryScreen,

        create: (options) => new VictoryScreen(options),
    };

    // ============================================================
    // 15. EXPORTA PARA O GLOBAL
    // ============================================================

    global.VictoryModule = VictoryModule;
    global.VictoryScreen = VictoryScreen;

    console.log('[Victory] Módulo de tela de vitória carregado');

})(typeof window !== 'undefined' ? window : this);
