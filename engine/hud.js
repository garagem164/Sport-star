// engine/hud.js — HUD moderna e premium para o jogo
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO HUD
    // ============================================================
    const HUDConfig = {
        // Cores
        colors: {
            background: 'rgba(10, 15, 25, 0.85)',
            backgroundSecondary: 'rgba(20, 30, 45, 0.7)',
            border: 'rgba(255, 255, 255, 0.08)',
            shadow: 'rgba(0, 0, 0, 0.4)',
            text: {
                primary: '#FFFFFF',
                secondary: 'rgba(255, 255, 255, 0.7)',
                tertiary: 'rgba(255, 255, 255, 0.4)',
                accent: '#88C0FF',
            },
        },

        // Tamanhos
        sizes: {
            small: 10,
            medium: 14,
            large: 18,
            xlarge: 24,
            xxlarge: 36,
        },

        // Animações
        animations: {
            duration: 0.3,
            delay: 0.1,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },

        // Efeitos
        effects: {
            glow: true,
            shadow: true,
            glass: true,
            blur: 8,
        },
    };

    // ============================================================
    // 2. CLASSE HUD MODERNA
    // ============================================================
    class ModernHUD {
        constructor(options = {}) {
            this.config = { ...HUDConfig, ...options };

            // Estado
            this.visible = true;
            this.animating = false;
            this.animationProgress = 1;

            // Dados
            this.score = { blue: 0, red: 0 };
            this.turn = 0;
            this.turnTime = 0;
            this.maxTurnTime = 30;
            this.currentPlayer = null;
            this.phase = 'idle';
            this.isGameOver = false;
            this.result = null;

            // Botões
            this.buttons = [];
            this.hoveredButton = null;
            this.clickedButton = null;

            // Referências
            this.game = null;
            this.renderer = null;

            // Callbacks
            this.onButtonClick = null;

            // Bind
            this._render = this._render.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(game, renderer) {
            this.game = game;
            this.renderer = renderer;

            // Configura botões
            this._setupButtons();

            console.log('[HUD] HUD moderno inicializado');
            return this;
        }

        // ============================================================
        // 4. CONFIGURAÇÃO DE BOTÕES
        // ============================================================

        _setupButtons() {
            this.buttons = [
                {
                    id: 'pause',
                    label: '⏸',
                    tooltip: 'Pausar',
                    x: 0,
                    y: 0,
                    width: 40,
                    height: 40,
                    action: () => {
                        if (this.game) {
                            if (this.game.state === 'playing') {
                                this.game.pauseGame();
                            } else if (this.game.state === 'paused') {
                                this.game.resumeGame();
                            }
                        }
                    },
                },
                {
                    id: 'restart',
                    label: '🔄',
                    tooltip: 'Reiniciar',
                    x: 0,
                    y: 0,
                    width: 40,
                    height: 40,
                    action: () => {
                        if (this.game && this.game.restart) {
                            this.game.restart();
                        }
                    },
                },
            ];
        }

        // ============================================================
        // 5. ATUALIZAÇÃO DE DADOS
        // ============================================================

        update(data) {
            if (data) {
                this.score = data.score || this.score;
                this.turn = data.turn || this.turn;
                this.turnTime = data.turnTime || this.turnTime;
                this.maxTurnTime = data.maxTurnTime || this.maxTurnTime;
                this.currentPlayer = data.currentPlayer || this.currentPlayer;
                this.phase = data.phase || this.phase;
                this.isGameOver = data.isGameOver || this.isGameOver;
                this.result = data.result || this.result;
            }

            // Atualiza estado dos botões
            this._updateButtons();
        }

        _updateButtons() {
            for (const btn of this.buttons) {
                if (btn.id === 'pause') {
                    if (this.game) {
                        btn.label = this.game.state === 'paused' ? '▶' : '⏸';
                        btn.tooltip = this.game.state === 'paused' ? 'Retomar' : 'Pausar';
                    }
                }
            }
        }

        // ============================================================
        // 6. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.visible) return;
            if (!ctx) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;

            ctx.save();

            // Aplica animação
            const alpha = this.animationProgress;

            // Fundo principal com glass effect
            this._renderBackground(ctx, width, height, alpha);

            // Placar central
            this._renderScore(ctx, width, height, alpha);

            // Informações do turno
            this._renderTurnInfo(ctx, width, height, alpha);

            // Botões
            this._renderButtons(ctx, width, height, alpha);

            // Indicador de fase
            this._renderPhase(ctx, width, height, alpha);

            // Game Over overlay
            if (this.isGameOver) {
                this._renderGameOver(ctx, width, height, alpha);
            }

            ctx.restore();
        }

        // ============================================================
        // 7. RENDERIZAÇÃO DO FUNDO
        // ============================================================

        _renderBackground(ctx, width, height, alpha) {
            ctx.globalAlpha = alpha;

            // Fundo superior com glass effect
            const topBarHeight = 80;
            const topBarX = 20;
            const topBarY = 20;
            const topBarWidth = width - 40;

            if (this.config.effects.glass) {
                ctx.shadowColor = this.config.colors.shadow;
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 5;
            }

            // Fundo com gradiente
            const gradient = ctx.createLinearGradient(0, topBarY, 0, topBarY + topBarHeight);
            gradient.addColorStop(0, this.config.colors.background);
            gradient.addColorStop(1, this.config.colors.backgroundSecondary);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(topBarX, topBarY, topBarWidth, topBarHeight, 16);
            ctx.fill();

            // Borda sutil
            if (this.config.effects.glass) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = this.config.colors.border;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(topBarX, topBarY, topBarWidth, topBarHeight, 16);
                ctx.stroke();

                // Brilho do glass
                const glassGradient = ctx.createLinearGradient(
                    topBarX, topBarY,
                    topBarX, topBarY + topBarHeight * 0.3
                );
                glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
                glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glassGradient;
                ctx.beginPath();
                ctx.roundRect(topBarX, topBarY, topBarWidth, topBarHeight * 0.3, 16);
                ctx.fill();
            }

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 8. RENDERIZAÇÃO DO PLACAR
        // ============================================================

        _renderScore(ctx, width, height, alpha) {
            ctx.globalAlpha = alpha;

            const centerX = width / 2;
            const topBarY = 20;
            const barHeight = 80;

            // Placar com estilo moderno
            const scoreY = topBarY + barHeight / 2;

            // Time Azul
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            // Nome do time
            ctx.fillStyle = this.config.colors.text.secondary;
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText('AZUL', centerX - 70, scoreY - 20);

            // Pontuação
            ctx.fillStyle = '#4A90D9';
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textShadow = '0 0 30px rgba(74, 144, 217, 0.3)';
            ctx.fillText(this.score.blue || 0, centerX - 20, scoreY + 6);

            // VS
            ctx.textAlign = 'center';
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '12px system-ui, sans-serif';
            ctx.textShadow = 'none';
            ctx.fillText('VS', centerX, scoreY);

            // Time Vermelho
            ctx.textAlign = 'left';
            ctx.fillStyle = this.config.colors.text.secondary;
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText('VERMELHO', centerX + 70, scoreY - 20);

            ctx.fillStyle = '#E74C3C';
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textShadow = '0 0 30px rgba(231, 76, 60, 0.3)';
            ctx.fillText(this.score.red || 0, centerX + 20, scoreY + 6);

            ctx.textShadow = 'none';

            // Separador
            ctx.fillStyle = this.config.colors.border;
            ctx.fillRect(centerX - 1, scoreY - 20, 2, 40);

            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 9. RENDERIZAÇÃO DAS INFORMAÇÕES DO TURNO
        // ============================================================

        _renderTurnInfo(ctx, width, height, alpha) {
            ctx.globalAlpha = alpha;

            const centerX = width / 2;
            const topBarY = 20;
            const barHeight = 80;
            const infoY = topBarY + barHeight + 20;

            // Caixa de informações
            const infoX = 30;
            const infoWidth = 220;
            const infoHeight = 70;

            ctx.shadowColor = this.config.colors.shadow;
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 4;

            ctx.fillStyle = this.config.colors.backgroundSecondary;
            ctx.beginPath();
            ctx.roundRect(infoX, infoY, infoWidth, infoHeight, 12);
            ctx.fill();

            if (this.config.effects.glass) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = this.config.colors.border;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(infoX, infoY, infoWidth, infoHeight, 12);
                ctx.stroke();
            }

            ctx.shadowBlur = 0;

            // Informações
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Turno
            ctx.fillStyle = this.config.colors.text.primary;
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.fillText(`Turno ${this.turn}`, infoX + 16, infoY + 10);

            // Jogador atual
            if (this.currentPlayer) {
                const color = this.currentPlayer.color || '#FFFFFF';
                const name = this.currentPlayer.name || 'Desconhecido';
                
                ctx.fillStyle = color;
                ctx.font = '13px system-ui, sans-serif';
                ctx.fillText(`🎯 ${name}`, infoX + 16, infoY + 32);

                // Indicador de vez
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(infoX + infoWidth - 20, infoY + 32, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Tempo do turno (barra de progresso)
            const timeX = infoX + 16;
            const timeY = infoY + 54;
            const timeWidth = infoWidth - 32;
            const timeHeight = 4;
            const progress = Math.max(0, Math.min(1, this.turnTime / this.maxTurnTime));

            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.beginPath();
            ctx.roundRect(timeX, timeY, timeWidth, timeHeight, 2);
            ctx.fill();

            const timeColor = progress > 0.8 ? '#E74C3C' : progress > 0.5 ? '#F39C12' : '#4A90D9';
            ctx.fillStyle = timeColor;
            ctx.shadowColor = timeColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(timeX, timeY, timeWidth * (1 - progress), timeHeight, 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Tempo restante
            const timeLeft = Math.max(0, this.maxTurnTime - this.turnTime);
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '9px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`${timeLeft.toFixed(1)}s`, infoX + infoWidth - 16, timeY - 14);
            ctx.textAlign = 'left';

            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 10. RENDERIZAÇÃO DOS BOTÕES
        // ============================================================

        _renderButtons(ctx, width, height, alpha) {
            ctx.globalAlpha = alpha;

            const topBarY = 20;
            const barHeight = 80;

            // Posiciona botões no canto superior direito
            const btnY = topBarY + (barHeight - 40) / 2;
            let btnX = width - 30 - 40;

            for (let i = this.buttons.length - 1; i >= 0; i--) {
                const btn = this.buttons[i];
                btn.x = btnX;
                btn.y = btnY;
                btn.width = 40;
                btn.height = 40;

                // Verifica hover
                const isHovered = this.hoveredButton === btn.id;
                const isClicked = this.clickedButton === btn.id;

                // Sombra do botão
                if (this.config.effects.shadow) {
                    ctx.shadowColor = this.config.colors.shadow;
                    ctx.shadowBlur = isHovered ? 25 : 15;
                    ctx.shadowOffsetY = isHovered ? 2 : 4;
                }

                // Fundo do botão
                const gradient = ctx.createRadialGradient(
                    btn.x + 20, btn.y + 20, 0,
                    btn.x + 20, btn.y + 20, 30
                );

                if (isHovered) {
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
                } else {
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
                }

                ctx.shadowBlur = 0;
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
                ctx.fill();

                // Borda do botão
                ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.2)' : this.config.colors.border;
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.beginPath();
                ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
                ctx.stroke();

                // Glow do botão (quando hover)
                if (isHovered && this.config.effects.glow) {
                    ctx.shadowColor = 'rgba(136, 192, 255, 0.3)';
                    ctx.shadowBlur = 30;
                    ctx.fillStyle = 'rgba(136, 192, 255, 0.05)';
                    ctx.beginPath();
                    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Ícone do botão
                ctx.shadowBlur = 0;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isHovered ? '#FFFFFF' : this.config.colors.text.secondary;
                ctx.font = '18px system-ui, sans-serif';
                ctx.fillText(btn.label, btn.x + 20, btn.y + 22);

                // Tooltip
                if (isHovered && btn.tooltip) {
                    const tipY = btn.y - 30;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.font = '10px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.beginPath();
                    ctx.roundRect(btn.x + 20 - 30, tipY - 18, 60, 20, 6);
                    ctx.fill();
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(btn.tooltip, btn.x + 20, tipY - 2);
                }

                btnX -= 50;
            }

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 11. RENDERIZAÇÃO DA FASE
        // ============================================================

        _renderPhase(ctx, width, height, alpha) {
            ctx.globalAlpha = alpha;

            const centerX = width / 2;
            const topBarY = 20;
            const barHeight = 80;
            const phaseY = topBarY + barHeight + 20 + 70 + 10;

            const phaseNames = {
                'idle': 'Selecione um disco',
                'aiming': 'Mire e dispare! 🎯',
                'shooting': 'Disparando... 💫',
                'waiting': 'Aguardando... ⏳',
                'turnEnd': 'Fim do turno ⏰',
                'gameOver': 'Fim de Jogo 🏆',
            };

            const phaseText = phaseNames[this.phase] || this.phase;
            const isActive = this.phase === 'aiming' || this.phase === 'shooting';

            // Fundo da fase
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = this.config.colors.shadow;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 3;

            const bgColor = isActive ? 'rgba(74, 144, 217, 0.15)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fillStyle = bgColor;
            const phaseWidth = Math.max(200, phaseText.length * 12 + 40);
            const phaseX = centerX - phaseWidth / 2;
            ctx.beginPath();
            ctx.roundRect(phaseX, phaseY - 16, phaseWidth, 32, 16);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Texto da fase
            const phaseColor = isActive ? '#88C0FF' : this.config.colors.text.secondary;
            ctx.fillStyle = phaseColor;
            ctx.font = isActive ? 'bold 13px system-ui, sans-serif' : '12px system-ui, sans-serif';

            if (isActive) {
                ctx.shadowColor = 'rgba(136, 192, 255, 0.3)';
                ctx.shadowBlur = 20;
            }

            ctx.fillText(phaseText, centerX, phaseY + 1);
            ctx.shadowBlur = 0;

            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 12. RENDERIZAÇÃO DO GAME OVER
        // ============================================================

        _renderGameOver(ctx, width, height, alpha) {
            ctx.globalAlpha = 1;

            const centerX = width / 2;
            const centerY = height / 2;

            // Fundo escuro com blur
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, width, height);

            // Caixa de game over premium
            const boxWidth = 420;
            const boxHeight = 320;
            const boxX = centerX - boxWidth / 2;
            const boxY = centerY - boxHeight / 2;

            // Sombra
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 50;
            ctx.shadowOffsetY = 10;

            // Fundo com glass effect
            const gradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
            gradient.addColorStop(0, 'rgba(15, 20, 35, 0.95)');
            gradient.addColorStop(1, 'rgba(10, 15, 25, 0.98)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24);
            ctx.fill();

            // Borda com glow
            ctx.shadowBlur = 0;
            const borderColor = this.result === 'blue' ? '#4A90D9' :
                               this.result === 'red' ? '#E74C3C' :
                               '#FFD93D';
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Brilho do glass
            const glassGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + 60);
            glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
            glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glassGradient;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, 60, 24);
            ctx.fill();

            // Título
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let title = '';
            let titleColor = '#FFFFFF';
            let emoji = '';

            if (this.result === 'blue') {
                title = 'Vitória do Time Azul!';
                titleColor = '#4A90D9';
                emoji = '🏆';
            } else if (this.result === 'red') {
                title = 'Vitória do Time Vermelho!';
                titleColor = '#E74C3C';
                emoji = '🏆';
            } else if (this.result === 'draw') {
                title = 'Empate!';
                titleColor = '#FFD93D';
                emoji = '🤝';
            } else {
                title = 'Fim de Jogo';
                emoji = '⚽';
            }

            ctx.fillStyle = titleColor;
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.shadowColor = titleColor;
            ctx.shadowBlur = 20;
            ctx.fillText(`${emoji} ${title}`, centerX, boxY + 50);
            ctx.shadowBlur = 0;

            // Placar final
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 56px system-ui, sans-serif';
            ctx.textShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            ctx.fillText(
                `${this.score.blue || 0}  x  ${this.score.red || 0}`,
                centerX,
                boxY + 130
            );
            ctx.textShadow = 'none';

            // Detalhes
            ctx.fillStyle = this.config.colors.text.secondary;
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillText(
                `${this.turn} turnos  •  ${this.goalHistory?.length || 0} gols`,
                centerX,
                boxY + 175
            );

            // Estatísticas do vencedor
            if (this.result && this.result !== 'draw') {
                const player = this.result === 'blue' ? 
                    this.game?.players?.blue : this.game?.players?.red;
                if (player) {
                    ctx.fillStyle = this.config.colors.text.tertiary;
                    ctx.font = '12px system-ui, sans-serif';
                    ctx.fillText(
                        `🎯 ${player.shoots || 0} disparos  •  ⚽ ${player.goals || 0} gols`,
                        centerX,
                        boxY + 205
                    );
                }
            }

            // Botão de reinício
            const btnWidth = 180;
            const btnHeight = 48;
            const btnY2 = boxY + boxHeight - 60;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 4;

            const btnGradient = ctx.createLinearGradient(centerX - btnWidth/2, btnY2, centerX + btnWidth/2, btnY2 + btnHeight);
            btnGradient.addColorStop(0, '#4A90D9');
            btnGradient.addColorStop(1, '#357ABD');
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(centerX - btnWidth/2, btnY2, btnWidth, btnHeight, 12);
            ctx.fill();

            ctx.shadowBlur = 0;

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 15px system-ui, sans-serif';
            ctx.fillText('🔄 Jogar Novamente', centerX, btnY2 + btnHeight/2);

            // Timer de reinício automático
            if (this.game?.config?.restart?.autoRestart && this.game?.timers?.restartDelay > 0) {
                ctx.fillStyle = this.config.colors.text.tertiary;
                ctx.font = '11px system-ui, sans-serif';
                ctx.fillText(
                    `Reiniciando em ${Math.ceil(this.game.timers.restartDelay)}s...`,
                    centerX,
                    boxY + boxHeight - 18
                );
            }

            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 13. INTERAÇÃO COM BOTÕES
        // ============================================================

        handleMouseMove(x, y) {
            let hovered = null;

            for (const btn of this.buttons) {
                if (x >= btn.x && x <= btn.x + btn.width &&
                    y >= btn.y && y <= btn.y + btn.height) {
                    hovered = btn.id;
                    break;
                }
            }

            this.hoveredButton = hovered;
            return hovered;
        }

        handleClick(x, y) {
            // Verifica clique nos botões
            for (const btn of this.buttons) {
                if (x >= btn.x && x <= btn.x + btn.width &&
                    y >= btn.y && y <= btn.y + btn.height) {
                    if (btn.action) {
                        btn.action();
                        this.clickedButton = btn.id;
                        setTimeout(() => {
                            this.clickedButton = null;
                        }, 200);
                    }
                    return btn.id;
                }
            }

            // Verifica clique no botão de reinício do game over
            if (this.isGameOver) {
                const width = this.renderer?.width || 800;
                const height = this.renderer?.height || 600;
                const centerX = width / 2;
                const centerY = height / 2;
                const boxHeight = 320;
                const boxY = centerY - boxHeight / 2;
                const btnWidth = 180;
                const btnHeight = 48;
                const btnY2 = boxY + boxHeight - 60;

                if (x >= centerX - btnWidth/2 && x <= centerX + btnWidth/2 &&
                    y >= btnY2 && y <= btnY2 + btnHeight) {
                    if (this.game && this.game.restart) {
                        this.game.restart();
                    }
                    return 'restart';
                }
            }

            return null;
        }

        // ============================================================
        // 14. CONTROLE DE VISIBILIDADE
        // ============================================================

        show() {
            this.visible = true;
            this.animating = true;
            this.animationProgress = 0;
            
            // Anima entrada
            const animate = () => {
                this.animationProgress += 0.05;
                if (this.animationProgress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animationProgress = 1;
                    this.animating = false;
                }
            };
            animate();

            return this;
        }

        hide() {
            this.visible = false;
            return this;
        }

        toggle() {
            this.visible = !this.visible;
            return this;
        }

        // ============================================================
        // 15. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                visible: this.visible,
                animating: this.animating,
                score: { ...this.score },
                turn: this.turn,
                currentPlayer: this.currentPlayer,
                phase: this.phase,
                isGameOver: this.isGameOver,
                result: this.result,
                buttons: this.buttons.length,
            };
        }
    }

    // ============================================================
    // 16. EXPORTAÇÃO
    // ============================================================

    const HUDModule = {
        Config: HUDConfig,
        ModernHUD: ModernHUD,

        create: (options) => new ModernHUD(options),
    };

    // ============================================================
    // 17. EXPORTA PARA O GLOBAL
    // ============================================================

    global.HUDModule = HUDModule;
    global.ModernHUD = ModernHUD;

    console.log('[HUD] Módulo HUD moderno carregado');

})(typeof window !== 'undefined' ? window : this);
