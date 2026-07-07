// engine/game.js — Sistema principal do jogo com turnos e jogadores
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO JOGO
    // ============================================================
    const GameConfig = {
        // Times
        teams: {
            blue: {
                name: 'Azul',
                color: '#4A90D9',
                secondary: '#2C6BA0',
                highlight: '#6BB5FF',
                discs: 5,
            },
            red: {
                name: 'Vermelho',
                color: '#E74C3C',
                secondary: '#C0392B',
                highlight: '#FF6B5A',
                discs: 5,
            },
        },

        // Turnos
        turn: {
            maxTime: 30, // segundos por turno
            delayAfterShoot: 1.5, // segundos após disparo
        },

        // Física
        physics: {
            friction: 0.985,
            restitution: 0.7,
            maxVelocity: 600,
        },

        // Força
        force: {
            min: 50,
            max: 800,
            multiplier: 1.5,
        },

        // Objetivo
        goals: {
            scoreToWin: 5,
        },
    };

    // ============================================================
    // 2. CLASSE PRINCIPAL DO JOGO
    // ============================================================
    class Game {
        constructor(options = {}) {
            this.config = { ...GameConfig, ...options };

            // Estado do jogo
            this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameover'
            this.turn = 0;
            this.phase = 'idle'; // 'idle', 'aiming', 'shooting', 'waiting', 'turnEnd'
            
            // Jogadores
            this.players = {
                blue: null,
                red: null,
            };
            this.currentPlayer = null;
            this.opponentPlayer = null;

            // Discos
            this.discs = [];
            this.ball = null;

            // Turno
            this.turnTime = 0;
            this.turnMaxTime = this.config.turn.maxTime;
            this.turnDelay = 0;
            this.isTurnEnding = false;

            // Estado de movimento
            this.allStopped = false;
            this.lastCheckTime = 0;
            this.stoppedCheckCount = 0;
            this.stoppedThreshold = 3; // frames consecutivos parados

            // Pontuação
            this.score = {
                blue: 0,
                red: 0,
            };

            // Histórico
            this.history = [];
            this.maxHistory = 50;

            // Callbacks
            this.onTurnStart = null;
            this.onTurnEnd = null;
            this.onShoot = null;
            this.onScore = null;
            this.onGameOver = null;
            this.onStateChange = null;

            // Referências
            this.physics = null;
            this.renderer = null;
            this.input = null;
            this.camera = null;

            // Bind
            this._update = this._update.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(physics, renderer, input, camera) {
            this.physics = physics;
            this.renderer = renderer;
            this.input = input;
            this.camera = camera;

            // Configura input
            if (this.input) {
                this.input.onShoot = this._onInputShoot.bind(this);
                this.input.onDiscSelected = this._onDiscSelected.bind(this);
                this.input.onDiscDeselected = this._onDiscDeselected.bind(this);
            }

            // Cria jogadores
            this._createPlayers();

            // Configura estado inicial
            this.setState('menu');

            console.log('[Game] Jogo inicializado');
            return this;
        }

        // ============================================================
        // 4. CRIAÇÃO DE JOGADORES
        // ============================================================

        _createPlayers() {
            const blueConfig = this.config.teams.blue;
            const redConfig = this.config.teams.red;

            // Jogador Azul
            this.players.blue = {
                id: 'blue',
                name: blueConfig.name,
                color: blueConfig.color,
                secondary: blueConfig.secondary,
                highlight: blueConfig.highlight,
                discs: [],
                score: 0,
                isHuman: true,
                isCurrent: false,
            };

            // Jogador Vermelho
            this.players.red = {
                id: 'red',
                name: redConfig.name,
                color: redConfig.color,
                secondary: redConfig.secondary,
                highlight: redConfig.highlight,
                discs: [],
                score: 0,
                isHuman: false,
                isCurrent: false,
            };
        }

        // ============================================================
        // 5. CONFIGURAÇÃO DE DISCOS
        // ============================================================

        setupDiscs(discs, ball) {
            this.discs = discs;
            this.ball = ball;

            // Distribui discos pelos jogadores
            this._assignDiscsToPlayers();

            return this;
        }

        _assignDiscsToPlayers() {
            // Limpa discos dos jogadores
            this.players.blue.discs = [];
            this.players.red.discs = [];

            for (const disc of this.discs) {
                if (disc.team === 'blue') {
                    this.players.blue.discs.push(disc);
                } else if (disc.team === 'red') {
                    this.players.red.discs.push(disc);
                }
            }
        }

        // ============================================================
        // 6. GERENCIAMENTO DE ESTADO
        // ============================================================

        setState(state) {
            this.state = state;
            if (this.onStateChange) {
                this.onStateChange(state);
            }
            console.log(`[Game] Estado: ${state}`);
        }

        startGame() {
            this.setState('playing');
            this.score.blue = 0;
            this.score.red = 0;
            this.turn = 0;
            this._startTurn();
        }

        pauseGame() {
            if (this.state === 'playing') {
                this.setState('paused');
            }
        }

        resumeGame() {
            if (this.state === 'paused') {
                this.setState('playing');
            }
        }

        endGame(winner) {
            this.setState('gameover');
            if (this.onGameOver) {
                this.onGameOver(winner);
            }
        }

        // ============================================================
        // 7. GERENCIAMENTO DE TURNOS
        // ============================================================

        _startTurn() {
            this.turn++;
            this.turnTime = 0;
            this.turnDelay = 0;
            this.isTurnEnding = false;
            this.allStopped = false;
            this.stoppedCheckCount = 0;

            // Alterna jogador
            const isBlueTurn = this.turn % 2 === 1;
            this.currentPlayer = isBlueTurn ? this.players.blue : this.players.red;
            this.opponentPlayer = isBlueTurn ? this.players.red : this.players.blue;

            // Marca discos ativos
            for (const disc of this.discs) {
                disc.isActive = disc.team === this.currentPlayer.id;
                disc.isMovable = disc.team === this.currentPlayer.id;
            }

            // Reseta estado do input
            if (this.input) {
                this.input.isDown = false;
                this.input.isDragging = false;
                this.input.selectedDisc = null;
            }

            this.phase = 'idle';

            if (this.onTurnStart) {
                this.onTurnStart({
                    turn: this.turn,
                    player: this.currentPlayer,
                    opponent: this.opponentPlayer,
                });
            }

            console.log(`[Game] Turno ${this.turn} - Jogador ${this.currentPlayer.name}`);
        }

        _endTurn() {
            this.isTurnEnding = true;
            this.phase = 'turnEnd';

            // Desativa discos do jogador atual
            for (const disc of this.discs) {
                if (disc.team === this.currentPlayer.id) {
                    disc.isMovable = false;
                    disc.isActive = false;
                }
            }

            if (this.onTurnEnd) {
                this.onTurnEnd({
                    turn: this.turn,
                    player: this.currentPlayer,
                    opponent: this.opponentPlayer,
                });
            }

            // Inicia próximo turno após delay
            setTimeout(() => {
                this._startTurn();
            }, this.config.turn.delayAfterShoot * 1000);
        }

        // ============================================================
        // 8. AÇÃO DE DISPARO
        // ============================================================

        _onInputShoot(data) {
            if (this.phase !== 'aiming' || this.isTurnEnding) return;

            const disc = data.disc;
            if (!disc || disc.team !== this.currentPlayer.id) return;

            // Calcula força e direção
            const force = Math.min(data.force, this.config.force.max);
            const power = force * this.config.force.multiplier;
            
            // Aplica impulso
            const angle = data.angle;
            const impulseX = Math.cos(angle) * power;
            const impulseY = Math.sin(angle) * power;

            disc.velocity.set(impulseX, impulseY);
            disc.rotationSpeed = (Math.random() - 0.5) * 10;

            // Marca como ativo (já foi usado)
            disc.isActive = false;
            disc.isMovable = false;

            this.phase = 'shooting';

            if (this.onShoot) {
                this.onShoot({
                    disc: disc,
                    force: force,
                    angle: angle,
                    impulse: { x: impulseX, y: impulseY },
                    player: this.currentPlayer,
                });
            }

            console.log(`[Game] Disparo - Força: ${force.toFixed(0)}, Ângulo: ${(angle * 180 / Math.PI).toFixed(1)}°`);
        }

        // ============================================================
        // 9. SELEÇÃO DE DISCO
        // ============================================================

        _onDiscSelected(disc) {
            if (this.phase !== 'idle' && this.phase !== 'aiming') return;
            if (!disc || disc.team !== this.currentPlayer.id) return;
            if (!disc.isActive || !disc.isMovable) return;

            this.phase = 'aiming';
            this.input.isDragging = false;

            console.log(`[Game] Disco selecionado: ${disc.id}`);
        }

        _onDiscDeselected(disc) {
            if (this.phase === 'aiming') {
                this.phase = 'idle';
                this.input.isDragging = false;
                console.log(`[Game] Disco deselecionado`);
            }
        }

        // ============================================================
        // 10. ATUALIZAÇÃO DO JOGO
        // ============================================================

        update(deltaTime) {
            if (this.state !== 'playing') return;

            // Atualiza tempo do turno
            if (!this.isTurnEnding) {
                this.turnTime += deltaTime;

                // Verifica tempo máximo do turno
                if (this.turnTime >= this.turnMaxTime && this.phase !== 'shooting') {
                    this._endTurn();
                    return;
                }
            }

            // Verifica se todos os discos pararam
            if (this.phase === 'shooting' || this.phase === 'waiting') {
                this._checkAllStopped();
            }

            // Atualiza discos
            for (const disc of this.discs) {
                if (!disc.isStatic && disc.velocity) {
                    disc.update(deltaTime);
                }
            }

            // Atualiza bola
            if (this.ball) {
                this.ball.update(deltaTime);
            }

            // Atualiza física (se necessário)
            if (this.physics) {
                this.physics.update(deltaTime);
            }

            // Verifica gols
            this._checkGoals();
        }

        // ============================================================
        // 11. VERIFICAÇÃO DE PARADA
        // ============================================================

        _checkAllStopped() {
            let allStopped = true;
            const threshold = 0.5;

            // Verifica discos em movimento
            for (const disc of this.discs) {
                if (disc.isStatic) continue;
                const speed = disc.velocity.magnitude();
                if (speed > threshold) {
                    allStopped = false;
                    break;
                }
            }

            // Verifica bola
            if (this.ball && !this.ball.isStatic) {
                const speed = this.ball.velocity.magnitude();
                if (speed > threshold) {
                    allStopped = false;
                }
            }

            if (allStopped) {
                this.stoppedCheckCount++;
            } else {
                this.stoppedCheckCount = 0;
            }

            // Confirma parada após alguns frames consecutivos
            if (this.stoppedCheckCount >= this.stoppedThreshold && !this.isTurnEnding) {
                this.allStopped = true;
                this.phase = 'waiting';
                
                // Finaliza turno
                setTimeout(() => {
                    if (!this.isTurnEnding) {
                        this._endTurn();
                    }
                }, 300);
            }
        }

        // ============================================================
        // 12. VERIFICAÇÃO DE GOLS
        // ============================================================

        _checkGoals() {
            if (!this.ball || !this.renderer) return;

            const ballPos = this.ball.position;
            const fieldWidth = this.renderer.config.width;
            const fieldHeight = this.renderer.config.height;
            const goalWidth = this.renderer.config.goal.width;
            const goalDepth = this.renderer.config.goal.depth;

            // Verifica gol na esquerda (time vermelho)
            if (ballPos.x < -goalDepth && 
                ballPos.y > (fieldHeight - goalWidth) / 2 && 
                ballPos.y < (fieldHeight + goalWidth) / 2) {
                this._scoreGoal('blue');
                return;
            }

            // Verifica gol na direita (time azul)
            if (ballPos.x > fieldWidth + goalDepth && 
                ballPos.y > (fieldHeight - goalWidth) / 2 && 
                ballPos.y < (fieldHeight + goalWidth) / 2) {
                this._scoreGoal('red');
                return;
            }

            // Verifica se bola saiu do campo (reposiciona)
            if (ballPos.x < -100 || ballPos.x > fieldWidth + 100 ||
                ballPos.y < -100 || ballPos.y > fieldHeight + 100) {
                this._resetBall();
            }
        }

        _scoreGoal(team) {
            if (this.isTurnEnding) return;

            // Impede múltiplos gols
            this.isTurnEnding = true;

            // Adiciona ponto
            this.score[team] = (this.score[team] || 0) + 1;
            this.currentPlayer.score = this.score[team];

            if (this.onScore) {
                this.onScore({
                    team: team,
                    score: this.score[team],
                    player: team === 'blue' ? this.players.blue : this.players.red,
                });
            }

            console.log(`[Game] GOL! Time ${team} - ${this.score[team]} pontos`);

            // Verifica vitória
            if (this.score[team] >= this.config.goals.scoreToWin) {
                const winner = team === 'blue' ? this.players.blue : this.players.red;
                this.endGame(winner);
                return;
            }

            // Reseta bola e finaliza turno
            setTimeout(() => {
                this._resetBall();
                if (!this.isTurnEnding) {
                    this._endTurn();
                }
            }, 1000);
        }

        _resetBall() {
            if (!this.ball) return;

            const fieldWidth = this.renderer.config.width;
            const fieldHeight = this.renderer.config.height;

            this.ball.position.set(fieldWidth / 2, fieldHeight / 2);
            this.ball.velocity.set(0, 0);
            this.ball.smoothPosition.copy(this.ball.position);
            this.ball.smoothVelocity.set(0, 0);
        }

        // ============================================================
        // 13. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!ctx) return;

            // Renderiza discos
            for (const disc of this.discs) {
                if (disc.render) {
                    disc.render(ctx, this.renderer);
                }
            }

            // Renderiza bola
            if (this.ball && this.ball.render) {
                this.ball.render(ctx, this.renderer);
            }

            // Renderiza input (seta, força, etc)
            if (this.input && this.input.render) {
                this.input.render(ctx);
            }

            // Renderiza HUD
            this._renderHUD(ctx);
        }

        // ============================================================
        // 14. HUD
        // ============================================================

        _renderHUD(ctx) {
            if (!ctx) return;

            const screenWidth = this.renderer.width || ctx.canvas.width;
            const screenHeight = this.renderer.height || ctx.canvas.height;

            ctx.save();

            // Fundo do HUD
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.roundRect(10, 10, 200, 80, 10);
            ctx.fill();

            // Placar
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Time Azul
            ctx.fillStyle = this.config.teams.blue.color;
            ctx.font = 'bold 18px system-ui, sans-serif';
            ctx.fillText(`🔵 Azul: ${this.score.blue}`, 20, 20);

            // Time Vermelho
            ctx.fillStyle = this.config.teams.red.color;
            ctx.fillText(`🔴 Vermelho: ${this.score.red}`, 20, 45);

            // Turno
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(`Turno: ${this.turn}`, 20, 70);

            // Jogador atual
            if (this.currentPlayer) {
                const color = this.currentPlayer.color || '#FFFFFF';
                ctx.fillStyle = color;
                ctx.font = 'bold 14px system-ui, sans-serif';
                ctx.fillText(`Vez: ${this.currentPlayer.name}`, 140, 20);
            }

            // Tempo do turno
            const timeLeft = Math.max(0, this.turnMaxTime - this.turnTime);
            ctx.fillStyle = timeLeft < 5 ? '#FF6B6B' : 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText(`⏱ ${timeLeft.toFixed(1)}s`, 140, 40);

            // Fase
            const phaseNames = {
                'idle': 'Selecione um disco',
                'aiming': 'Mire e dispare',
                'shooting': 'Disparando...',
                'waiting': 'Aguardando...',
                'turnEnd': 'Fim do turno',
            };
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(phaseNames[this.phase] || '', 140, 58);

            // Status
            if (this.isTurnEnding) {
                ctx.fillStyle = '#FFD93D';
                ctx.font = 'bold 12px system-ui, sans-serif';
                ctx.fillText('⏳ Finalizando...', 140, 76);
            }

            // Contador de discos
            if (this.currentPlayer) {
                const activeCount = this.currentPlayer.discs.filter(d => d.isActive && d.isMovable).length;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = '10px system-ui, sans-serif';
                ctx.fillText(`Discos: ${activeCount}`, 20, 90);
            }

            ctx.restore();
        }

        // ============================================================
        // 15. RESET
        // ============================================================

        reset() {
            this.state = 'menu';
            this.turn = 0;
            this.phase = 'idle';
            this.score.blue = 0;
            this.score.red = 0;
            this.turnTime = 0;
            this.isTurnEnding = false;
            this.allStopped = false;
            this.stoppedCheckCount = 0;

            this.currentPlayer = null;
            this.opponentPlayer = null;

            // Reseta discos
            for (const disc of this.discs) {
                disc.velocity.set(0, 0);
                disc.isActive = true;
                disc.isMovable = true;
            }

            // Reseta bola
            if (this.ball) {
                this._resetBall();
            }

            // Reseta input
            if (this.input) {
                this.input.isDown = false;
                this.input.isDragging = false;
                this.input.selectedDisc = null;
            }

            console.log('[Game] Jogo resetado');
        }

        // ============================================================
        // 16. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                state: this.state,
                turn: this.turn,
                phase: this.phase,
                currentPlayer: this.currentPlayer ? this.currentPlayer.id : null,
                score: { ...this.score },
                discs: {
                    total: this.discs.length,
                    blue: this.players.blue.discs.length,
                    red: this.players.red.discs.length,
                },
                turnTime: this.turnTime,
                isTurnEnding: this.isTurnEnding,
                allStopped: this.allStopped,
            };
        }
    }

    // ============================================================
    // 17. EXPORTAÇÃO
    // ============================================================

    const GameModule = {
        Config: GameConfig,
        Game: Game,

        create: (options) => new Game(options),
    };

    // ============================================================
    // 18. EXPORTA PARA O GLOBAL
    // ============================================================

    global.GameModule = GameModule;
    global.Game = Game;

    console.log('[Game] Módulo do jogo carregado.');

})(typeof window !== 'undefined' ? window : this);
