// engine/menu.js — Menu Inicial com animações suaves e botões premium
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO MENU
    // ============================================================
    const MenuConfig = {
        // Cores
        colors: {
            background: '#0a0f1a',
            backgroundSecondary: 'rgba(15, 20, 35, 0.8)',
            primary: '#4A90D9',
            primaryHover: '#6BB5FF',
            secondary: '#E74C3C',
            text: {
                primary: '#FFFFFF',
                secondary: 'rgba(255, 255, 255, 0.7)',
                tertiary: 'rgba(255, 255, 255, 0.4)',
            },
            border: 'rgba(255, 255, 255, 0.08)',
            shadow: 'rgba(0, 0, 0, 0.4)',
        },

        // Botões
        buttons: {
            width: 220,
            height: 56,
            spacing: 16,
            radius: 14,
            fontSize: 16,
            iconSize: 20,
        },

        // Animações
        animations: {
            duration: 0.6,
            delay: 0.15,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            floatSpeed: 2.0,
            floatAmplitude: 8,
            particleCount: 50,
        },

        // Título
        title: {
            fontSize: 52,
            subtitleSize: 18,
            glowIntensity: 0.3,
        },

        // Versão
        version: 'v1.0.0',
    };

    // ============================================================
    // 2. CLASSE MENU INICIAL
    // ============================================================
    class MainMenu {
        constructor(options = {}) {
            this.config = { ...MenuConfig, ...options };

            // Estado
            this.visible = true;
            this.animating = false;
            this.animationProgress = 0;
            this.selectedIndex = -1;
            this.hoveredIndex = -1;
            this.clickedIndex = -1;
            this.particles = [];
            this.floatOffset = 0;
            this.time = 0;

            // Botões
            this.buttons = [];
            this._setupButtons();

            // Callbacks
            this.onPlay = null;
            this.onSettings = null;
            this.onCredits = null;
            this.onExit = null;

            // Referências
            this.renderer = null;
            this.game = null;

            // Bind
            this._update = this._update.bind(this);
            this._render = this._render.bind(this);
            this._animate = this._animate.bind(this);

            // Inicializa partículas
            this._initParticles();
        }

        // ============================================================
        // 3. CONFIGURAÇÃO DE BOTÕES
        // ============================================================

        _setupButtons() {
            this.buttons = [
                {
                    id: 'play',
                    label: 'Jogar',
                    icon: '▶',
                    action: () => {
                        if (this.onPlay) this.onPlay();
                    },
                    color: this.config.colors.primary,
                    hoverColor: this.config.colors.primaryHover,
                },
                {
                    id: 'settings',
                    label: 'Configurações',
                    icon: '⚙',
                    action: () => {
                        if (this.onSettings) this.onSettings();
                    },
                    color: 'rgba(255, 255, 255, 0.15)',
                    hoverColor: 'rgba(255, 255, 255, 0.25)',
                },
                {
                    id: 'credits',
                    label: 'Créditos',
                    icon: '🎮',
                    action: () => {
                        if (this.onCredits) this.onCredits();
                    },
                    color: 'rgba(255, 255, 255, 0.15)',
                    hoverColor: 'rgba(255, 255, 255, 0.25)',
                },
                {
                    id: 'exit',
                    label: 'Sair',
                    icon: '✕',
                    action: () => {
                        if (this.onExit) this.onExit();
                    },
                    color: 'rgba(231, 76, 60, 0.3)',
                    hoverColor: 'rgba(231, 76, 60, 0.5)',
                },
            ];
        }

        // ============================================================
        // 4. INICIALIZAÇÃO
        // ============================================================

        init(renderer, game) {
            this.renderer = renderer;
            this.game = game;

            console.log('[Menu] Menu inicial inicializado');
            return this;
        }

        // ============================================================
        // 5. PARTÍCULAS DE FUNDO
        // ============================================================

        _initParticles() {
            const count = this.config.animations.particleCount;
            const width = this.renderer?.width || 800;
            const height = this.renderer?.height || 600;

            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 1 + Math.random() * 3,
                    speed: 0.1 + Math.random() * 0.3,
                    angle: Math.random() * Math.PI * 2,
                    opacity: 0.1 + Math.random() * 0.3,
                    twinkleSpeed: 0.5 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        // ============================================================
        // 6. ATUALIZAÇÃO
        // ============================================================

        update(deltaTime) {
            if (!this.visible) return;

            this.time += deltaTime;
            this.floatOffset = Math.sin(this.time * this.config.animations.floatSpeed) * 
                             this.config.animations.floatAmplitude;

            // Atualiza partículas
            const width = this.renderer?.width || 800;
            const height = this.renderer?.height || 600;

            for (const p of this.particles) {
                p.x += Math.cos(p.angle) * p.speed * deltaTime * 60;
                p.y += Math.sin(p.angle) * p.speed * deltaTime * 60;
                p.angle += (Math.random() - 0.5) * 0.01;
                p.opacity = 0.1 + Math.sin(this.time * p.twinkleSpeed + p.phase) * 0.15 + 0.15;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            }

            // Atualiza animação de entrada
            if (this.animating) {
                this.animationProgress += deltaTime / this.config.animations.duration;
                if (this.animationProgress >= 1) {
                    this.animationProgress = 1;
                    this.animating = false;
                }
            }
        }

        // ============================================================
        // 7. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.visible) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;

            ctx.save();

            // Fundo com gradiente
            this._renderBackground(ctx, width, height);

            // Partículas
            this._renderParticles(ctx, width, height);

            // Título
            this._renderTitle(ctx, width, height);

            // Botões
            this._renderButtons(ctx, width, height);

            // Versão
            this._renderVersion(ctx, width, height);

            ctx.restore();
        }

        // ============================================================
        // 8. RENDERIZAÇÃO DO FUNDO
        // ============================================================

        _renderBackground(ctx, width, height) {
            // Gradiente radial
            const gradient = ctx.createRadialGradient(
                width / 2, height / 2 - 50, 0,
                width / 2, height / 2 - 50, Math.max(width, height) * 0.7
            );
            gradient.addColorStop(0, '#141c2a');
            gradient.addColorStop(0.4, '#0d1420');
            gradient.addColorStop(1, '#060a10');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Gradiente de destaque (topo)
            const highlight = ctx.createRadialGradient(
                width / 2, 0, 0,
                width / 2, 0, height * 0.5
            );
            highlight.addColorStop(0, 'rgba(74, 144, 217, 0.06)');
            highlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = highlight;
            ctx.fillRect(0, 0, width, height);

            // Vignette
            const vignette = ctx.createRadialGradient(
                width / 2, height / 2, height * 0.3,
                width / 2, height / 2, height * 0.9
            );
            vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);
        }

        // ============================================================
        // 9. RENDERIZAÇÃO DE PARTÍCULAS
        // ============================================================

        _renderParticles(ctx, width, height) {
            for (const p of this.particles) {
                const alpha = p.opacity * (0.5 + this.animationProgress * 0.5);
                ctx.globalAlpha = alpha;
                
                // Brilho da partícula
                const glow = ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.size * 3
                );
                glow.addColorStop(0, `rgba(136, 192, 255, ${0.3 * alpha})`);
                glow.addColorStop(1, 'rgba(136, 192, 255, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fill();

                // Ponto
                ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 1;
            }
        }

        // ============================================================
        // 10. RENDERIZAÇÃO DO TÍTULO
        // ============================================================

        _renderTitle(ctx, width, height) {
            const centerX = width / 2;
            const centerY = height / 2 - 100 + this.floatOffset * 0.3;

            // Sombra do título
            ctx.shadowColor = 'rgba(74, 144, 217, 0.2)';
            ctx.shadowBlur = 60;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;

            // Título principal
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const progress = this.animationProgress;
            const scale = 0.6 + progress * 0.4;
            const alpha = progress;

            ctx.globalAlpha = alpha;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);

            // Glow do título
            ctx.shadowColor = 'rgba(74, 144, 217, 0.3)';
            ctx.shadowBlur = 80;

            // Texto principal
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${this.config.title.fontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textShadow = '0 0 60px rgba(74, 144, 217, 0.2)';
            ctx.fillText('⚽ BOUNCE', 0, -10);

            // Destaque da palavra ARENA
            ctx.fillStyle = '#4A90D9';
            ctx.textShadow = '0 0 60px rgba(74, 144, 217, 0.4)';
            ctx.fillText('ARENA', 0, 50);

            ctx.shadowBlur = 0;

            // Subtítulo
            const subY = 90;
            ctx.fillStyle = this.config.colors.text.secondary;
            ctx.font = `${this.config.title.subtitleSize}px system-ui, sans-serif`;
            ctx.textShadow = 'none';
            ctx.fillText('Batalha de Discos • Estratégia • Precisão', 0, subY);

            ctx.restore();

            // Linha decorativa abaixo do título
            const lineY = centerY + 100;
            const lineWidth = 200 * scale;
            const lineAlpha = 0.3 * alpha;

            ctx.globalAlpha = lineAlpha;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - lineWidth / 2, lineY);
            ctx.lineTo(centerX + lineWidth / 2, lineY);
            ctx.stroke();

            // Glow da linha
            ctx.strokeStyle = 'rgba(74, 144, 217, 0.1)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(centerX - lineWidth / 2, lineY);
            ctx.lineTo(centerX + lineWidth / 2, lineY);
            ctx.stroke();

            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 11. RENDERIZAÇÃO DOS BOTÕES
        // ============================================================

        _renderButtons(ctx, width, height) {
            const btnWidth = this.config.buttons.width;
            const btnHeight = this.config.buttons.height;
            const spacing = this.config.buttons.spacing;
            const totalHeight = this.buttons.length * (btnHeight + spacing) - spacing;
            const startY = height / 2 + 120 + this.floatOffset * 0.2;

            const progress = this.animationProgress;

            for (let i = 0; i < this.buttons.length; i++) {
                const btn = this.buttons[i];
                const delay = i * this.config.animations.delay;
                const btnProgress = Math.max(0, Math.min(1, (progress - delay / 0.6) * 1.5));
                const offsetY = (1 - btnProgress) * 30;

                const x = width / 2 - btnWidth / 2;
                const y = startY + i * (btnHeight + spacing) + offsetY;
                const isHovered = this.hoveredIndex === i;
                const isClicked = this.clickedIndex === i;
                const isSelected = this.selectedIndex === i;

                // Salva posição para detecção de clique
                btn._x = x;
                btn._y = y;
                btn._width = btnWidth;
                btn._height = btnHeight;

                ctx.save();
                ctx.globalAlpha = btnProgress;

                // Sombra do botão
                ctx.shadowColor = this.config.colors.shadow;
                ctx.shadowBlur = isHovered ? 30 : 20;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = isHovered ? 6 : 4;

                // Fundo do botão
                const isPrimary = btn.id === 'play';
                const bgColor = isHovered ? btn.hoverColor : btn.color;

                if (isPrimary) {
                    // Gradiente para botão principal
                    const gradient = ctx.createLinearGradient(x, y, x, y + btnHeight);
                    const startColor = isHovered ? '#5A9DE9' : '#4A90D9';
                    const endColor = isHovered ? '#4A7FC9' : '#357ABD';
                    gradient.addColorStop(0, startColor);
                    gradient.addColorStop(1, endColor);
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)';
                }

                ctx.beginPath();
                ctx.roundRect(x, y, btnWidth, btnHeight, this.config.buttons.radius);
                ctx.fill();

                // Borda do botão
                ctx.shadowBlur = 0;
                if (isHovered || isPrimary) {
                    ctx.strokeStyle = isPrimary ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = isHovered ? 2 : 1;
                    ctx.beginPath();
                    ctx.roundRect(x, y, btnWidth, btnHeight, this.config.buttons.radius);
                    ctx.stroke();
                }

                // Glow do botão (hover)
                if (isHovered && this.config.animations.duration) {
                    ctx.shadowColor = isPrimary ? 'rgba(74, 144, 217, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                    ctx.shadowBlur = 40;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                    ctx.beginPath();
                    ctx.roundRect(x, y, btnWidth, btnHeight, this.config.buttons.radius);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Efeito de clique
                if (isClicked) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.beginPath();
                    ctx.roundRect(x + 2, y + 2, btnWidth - 4, btnHeight - 4, this.config.buttons.radius - 2);
                    ctx.fill();
                }

                // Ícone
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isPrimary ? 'rgba(255, 255, 255, 0.9)' : 
                               isHovered ? '#FFFFFF' : this.config.colors.text.secondary;
                ctx.font = `${this.config.buttons.iconSize}px system-ui, sans-serif`;
                ctx.fillText(btn.icon, x + 20, y + btnHeight / 2);

                // Label
                ctx.textAlign = 'center';
                ctx.fillStyle = isPrimary ? '#FFFFFF' : 
                               isHovered ? '#FFFFFF' : this.config.colors.text.primary;
                ctx.font = `bold ${this.config.buttons.fontSize}px system-ui, sans-serif`;
                ctx.fillText(btn.label, x + btnWidth / 2 + 10, y + btnHeight / 2 + 1);

                ctx.restore();
            }
        }

        // ============================================================
        // 12. RENDERIZAÇÃO DA VERSÃO
        // ============================================================

        _renderVersion(ctx, width, height) {
            ctx.globalAlpha = this.animationProgress * 0.4;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(this.config.version, width / 2, height - 20);
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 13. INTERAÇÃO COM O MENU
        // ============================================================

        handleMouseMove(x, y) {
            if (!this.visible) return -1;

            let hovered = -1;
            for (let i = 0; i < this.buttons.length; i++) {
                const btn = this.buttons[i];
                if (x >= btn._x && x <= btn._x + btn._width &&
                    y >= btn._y && y <= btn._y + btn._height) {
                    hovered = i;
                    break;
                }
            }

            this.hoveredIndex = hovered;
            return hovered;
        }

        handleClick(x, y) {
            if (!this.visible) return null;

            for (let i = 0; i < this.buttons.length; i++) {
                const btn = this.buttons[i];
                if (x >= btn._x && x <= btn._x + btn._width &&
                    y >= btn._y && y <= btn._y + btn._height) {
                    this.clickedIndex = i;
                    this.selectedIndex = i;

                    // Efeito de clique
                    setTimeout(() => {
                        this.clickedIndex = -1;
                    }, 200);

                    // Executa ação
                    if (btn.action) {
                        setTimeout(() => {
                            btn.action();
                        }, 150);
                    }

                    return btn.id;
                }
            }

            return null;
        }

        // ============================================================
        // 14. ANIMAÇÃO DE ENTRADA
        // ============================================================

        show() {
            this.visible = true;
            this.animating = true;
            this.animationProgress = 0;
            this.selectedIndex = -1;
            this.hoveredIndex = -1;
            return this;
        }

        hide() {
            this.visible = false;
            return this;
        }

        toggle() {
            this.visible = !this.visible;
            if (this.visible) {
                this.show();
            }
            return this;
        }

        // ============================================================
        // 15. MÉTODOS DE NAVEGAÇÃO POR TECLADO
        // ============================================================

        navigateUp() {
            if (this.selectedIndex > 0) {
                this.selectedIndex--;
            } else {
                this.selectedIndex = this.buttons.length - 1;
            }
            this.hoveredIndex = this.selectedIndex;
            return this.selectedIndex;
        }

        navigateDown() {
            if (this.selectedIndex < this.buttons.length - 1) {
                this.selectedIndex++;
            } else {
                this.selectedIndex = 0;
            }
            this.hoveredIndex = this.selectedIndex;
            return this.selectedIndex;
        }

        selectCurrent() {
            if (this.selectedIndex >= 0 && this.selectedIndex < this.buttons.length) {
                const btn = this.buttons[this.selectedIndex];
                if (btn.action) {
                    btn.action();
                }
                return btn.id;
            }
            return null;
        }

        // ============================================================
        // 16. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                visible: this.visible,
                animating: this.animating,
                progress: this.animationProgress,
                selectedIndex: this.selectedIndex,
                hoveredIndex: this.hoveredIndex,
                particles: this.particles.length,
                buttons: this.buttons.length,
            };
        }

        // ============================================================
        // 17. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.particles = [];
            this.buttons = [];
            this.onPlay = null;
            this.onSettings = null;
            this.onCredits = null;
            this.onExit = null;
            this.renderer = null;
            this.game = null;
        }
    }

    // ============================================================
    // 18. EXPORTAÇÃO
    // ============================================================

    const MenuModule = {
        Config: MenuConfig,
        MainMenu: MainMenu,

        create: (options) => new MainMenu(options),
    };

    // ============================================================
    // 19. EXPORTA PARA O GLOBAL
    // ============================================================

    global.MenuModule = MenuModule;
    global.MainMenu = MainMenu;

    console.log('[Menu] Módulo de menu inicial carregado');

})(typeof window !== 'undefined' ? window : this);
