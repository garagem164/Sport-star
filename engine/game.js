// engine/game.js — Sistema completo do jogo com gol, placar, vitória, empate, reinício e tempo
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
            delayAfterGoal: 2.0, // segundos após gol
            delayAfterGameOver: 3.0, // segundos após fim de jogo
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
            maxTurns: 20,
            allowDraw: true,
        },

        // Reinício
        restart: {
            autoRestart: false,
            delayAfterGameOver: 5,
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
            this.result = null; // 'blue', 'red', 'draw'
            
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
            this.isGameOver = false;

            // Estado de movimento
            this.allStopped = false;
            this.lastCheckTime = 0;
            this.stoppedCheckCount = 0;
            this.stoppedThreshold = 3;

            // Pontuação
            this.score = {
                blue: 0,
                red: 0,
            };

            // Histórico de gols
            this.goalHistory = [];
            this.maxHistory = 50;

            // Temporizadores
            this.timers = {
                goalDelay: 0,
                gameOverDelay: 0,
                restartDelay: 0,
            };

            // Callbacks
            this.onTurnStart = null;
            this.onTurnEnd = null;
            this.onShoot = null;
            this.onScore = null;
            this.onGameOver = null;
            this.onStateChange = null;
            this.onRestart = null;

            // Referências
            this.physics = null;
            this.renderer = null;
            this.input = null;
            this.camera = null;
            this.field = null;

            // Bind
            this._update = this._update.bind(this);
            this._restartGame = this._restartGame.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(physics, renderer, input, camera, field) {
            this.physics = physics;
            this.renderer = renderer;
            this.input = input;
            this.camera = camera;
            this.field = field;

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
                goals: 0,
                shoots: 0,
                accuracy: 0,
            };

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
                goals: 0,
                shoots: 0,
                accuracy: 0,
            };
        }

        // ============================================================
        // 5. CONFIGURAÇÃO DE DISCOS
        // ============================================================

        setupDiscs(discs, ball) {
            this.discs = discs;
            this.ball = ball;
            this._assignDiscsToPlayers();
            return this;
        }

        _assignDiscsToPlayers() {
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
            this.goalHistory = [];
            this.isGameOver = false;
            this.result = null;
            this._resetPositions();
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

            // Verifica se atingiu o máximo de turnos
            if (this.turn > this.config.goals.maxTurns) {
                this._handleGameOver('draw');
                return;
            }

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
            if (this.isTurnEnding) return;
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
                if (this.state === 'playing' && !this.isGameOver) {
                    this._startTurn();
                }
            }, this.config.turn.delayAfterShoot * 1000);
        }

        // ============================================================
        // 8. AÇÃO DE DISPARO
        // ============================================================

        _onInputShoot(data) {
            if (this.phase !== 'aiming' || this.isTurnEnding || this.isGameOver) return;

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

            // Estatísticas
            this.currentPlayer.shoots = (this.currentPlayer.shoots || 0) + 1;

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
            if (this.isTurnEnding || this.isGameOver) return;
            if (!disc || disc.team !== this.currentPlayer.id) return;
            if (!disc.isActive || !disc.isMovable) return;

            this.phase = 'aiming';
            this.input.isDragging = false;
        }

        _onDiscDeselected(disc) {
            if (this.phase === 'aiming') {
                this.phase = 'idle';
                this.input.isDragging = false;
            }
        }

        // ============================================================
        // 10. ATUALIZAÇÃO DO JOGO
        // ============================================================

        update(deltaTime) {
            if (this.state !== 'playing') return;

            // Atualiza temporizadores
            this._updateTimers(deltaTime);

            // Atualiza tempo do turno
            if (!this.isTurnEnding && !this.isGameOver) {
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

            // Atualiza física
            if (this.physics) {
                this.physics.update(deltaTime);
            }

            // Verifica gols
            if (!this.isGameOver) {
                this._checkGoals();
            }
        }

        // ============================================================
        // 11. ATUALIZAÇÃO DE TEMPORIZADORES
        // ============================================================

        _updateTimers(deltaTime) {
            // Timer de delay após gol
            if (this.timers.goalDelay > 0) {
                this.timers.goalDelay -= deltaTime;
                if (this.timers.goalDelay <= 0) {
                    this.timers.goalDelay = 0;
                    // Reinicia o jogo após o gol
                    if (!this.isGameOver) {
                        this._resetPositions();
                        if (!this.isTurnEnding) {
                            this._startTurn();
                        }
                    }
                }
            }

            // Timer de delay após fim de jogo
            if (this.timers.gameOverDelay > 0) {
                this.timers.gameOverDelay -= deltaTime;
                if (this.timers.gameOverDelay <= 0) {
                    this.timers.gameOverDelay = 0;
                    if (this.config.restart.autoRestart) {
                        this.timers.restartDelay = this.config.restart.delayAfterGameOver;
                    }
                }
            }

            // Timer para reinício automático
            if (this.timers.restartDelay > 0) {
                this.timers.restartDelay -= deltaTime;
                if (this.timers.restartDelay <= 0) {
                    this.timers.restartDelay = 0;
                    this._restartGame();
                }
            }
        }

        // ============================================================
        // 12. VERIFICAÇÃO DE PARADA
        // ============================================================

        _checkAllStopped() {
            let allStopped = true;
            const threshold = 0.5;

            for (const disc of this.discs) {
                if (disc.isStatic) continue;
                const speed = disc.velocity.magnitude();
                if (speed > threshold) {
                    allStopped = false;
                    break;
                }
            }

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

            if (this.stoppedCheckCount >= this.stoppedThreshold && !this.isTurnEnding && !this.isGameOver) {
                this.allStopped = true;
                this.phase = 'waiting';
                
                // Se não houve gol, finaliza turno
                if (this.timers.goalDelay === 0) {
                    setTimeout(() => {
                        if (!this.isTurnEnding && !this.isGameOver) {
                            this._endTurn();
                        }
                    }, 300);
                }
            }
        }

        // ============================================================
        // 13. VERIFICAÇÃO DE GOLS
        // ============================================================

        _checkGoals() {
            if (!this.ball || !this.renderer) return;

            const ballPos = this.ball.position;
            const fieldWidth = this.renderer.fieldWidth || this.renderer.config?.width || 800;
            const fieldHeight = this.renderer.fieldHeight || this.renderer.config?.height || 500;
            const goalWidth = this.renderer.config?.goal?.width || 120;
            const goalDepth = this.renderer.config?.goal?.depth || 20;

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
            if (ballPos.x < -200 || ballPos.x > fieldWidth + 200 ||
                ballPos.y < -200 || ballPos.y > fieldHeight + 200) {
                this._resetBall();
            }
        }

        _scoreGoal(team) {
            if (this.isTurnEnding || this.isGameOver) return;

            // Impede múltiplos gols
            this.isTurnEnding = true;

            // Adiciona ponto
            this.score[team] = (this.score[team] || 0) + 1;
            const player = team === 'blue' ? this.players.blue : this.players.red;
            player.goals = (player.goals || 0) + 1;
            player.score = this.score[team];

            // Registra gol no histórico
            this.goalHistory.push({
                team: team,
                turn: this.turn,
                time: this.turnTime,
                score: { ...this.score },
                player: player.name,
            });

            // Mantém histórico limitado
            if (this.goalHistory.length > this.maxHistory) {
                this.goalHistory.shift();
            }

            if (this.onScore) {
                this.onScore({
                    team: team,
                    score: this.score[team],
                    player: player,
                    history: this.goalHistory,
                });
            }

            console.log(`[Game] ⚽ GOL! Time ${team.toUpperCase()} - ${this.score[team]} pontos`);

            // Verifica vitória
            if (this.score[team] >= this.config.goals.scoreToWin) {
                this._handleGameOver(team);
                return;
            }

            // Delay após gol
            this.timers.goalDelay = this.config.turn.delayAfterGoal;
            
            // Reseta bola após o delay
            setTimeout(() => {
                if (!this.isGameOver) {
                    this._resetBall();
                    this._resetPositions();
                    if (!this.isTurnEnding) {
                        this._startTurn();
                    }
                }
            }, this.config.turn.delayAfterGoal * 1000);
        }

        // ============================================================
        // 14. FIM DE JOGO
        // ============================================================

        _handleGameOver(winner) {
            if (this.isGameOver) return;
            this.isGameOver = true;
            this.phase = 'gameOver';

            let result = null;
            let message = '';

            if (winner === 'draw') {
                result = 'draw';
                message = 'Empate!';
            } else {
                result = winner;
                const player = winner === 'blue' ? this.players.blue : this.players.red;
                message = `🏆 ${player.name} venceu!`;
            }

            this.result = result;

            if (this.onGameOver) {
                this.onGameOver({
                    winner: result,
                    score: { ...this.score },
                    player: result !== 'draw' ? (result === 'blue' ? this.players.blue : this.players.red) : null,
                    message: message,
                    history: this.goalHistory,
                });
            }

            console.log(`[Game] Fim de jogo! ${message}`);

            // Inicia timer para reinício automático
            if (this.config.restart.autoRestart) {
                this.timers.gameOverDelay = this.config.turn.delayAfterGameOver;
                this.timers.restartDelay = this.config.restart.delayAfterGameOver;
            }

            this.setState('gameover');
        }

        // ============================================================
        // 15. REINÍCIO
        // ============================================================

        _restartGame() {
            console.log('[Game] Reiniciando jogo...');

            this.isGameOver = false;
            this.isTurnEnding = false;
            this.result = null;
            this.turn = 0;
            this.goalHistory = [];
            this.timers = {
                goalDelay: 0,
                gameOverDelay: 0,
                restartDelay: 0,
            };

            // Reseta pontuação
            this.score.blue = 0;
            this.score.red = 0;
            this.players.blue.score = 0;
            this.players.red.score = 0;
            this.players.blue.goals = 0;
            this.players.red.goals = 0;
            this.players.blue.shoots = 0;
            this.players.red.shoots = 0;

            // Reseta posições
            this._resetPositions();

            // Reseta discos
            for (const disc of this.discs) {
                disc.velocity.set(0, 0);
                disc.isActive = true;
                disc.isMovable = true;
                disc.rotation = 0;
                disc.rotationSpeed = 0;
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

            this.setState('playing');
            this._startTurn();

            if (this.onRestart) {
                this.onRestart();
            }
        }

        // ============================================================
        // 16. RESET DE POSIÇÕES
        // ============================================================

        _resetPositions() {
            if (!this.renderer) return;

            const fieldWidth = this.renderer.fieldWidth || this.renderer.config?.width || 800;
            const fieldHeight = this.renderer.fieldHeight || this.renderer.config?.height || 500;

            // Posiciona discos dos times
            const blueDiscs = this.players.blue.discs;
            const redDiscs = this.players.red.discs;

            // Discos azuis (lado esquerdo)
            const bluePositions = this._generatePositions(
                fieldWidth * 0.15,
                fieldHeight / 2,
                fieldWidth * 0.25,
                fieldHeight * 0.3,
                blueDiscs.length
            );

            for (let i = 0; i < blueDiscs.length && i < bluePositions.length; i++) {
                blueDiscs[i].position.set(bluePositions[i].x, bluePositions[i].y);
                blueDiscs[i].velocity.set(0, 0);
                blueDiscs[i].isActive = true;
                blueDiscs[i].isMovable = true;
            }

            // Discos vermelhos (lado direito)
            const redPositions = this._generatePositions(
                fieldWidth * 0.85,
                fieldHeight / 2,
                fieldWidth * 0.25,
                fieldHeight * 0.3,
                redDiscs.length
            );

            for (let i = 0; i < redDiscs.length && i < redPositions.length; i++) {
                redDiscs[i].position.set(redPositions[i].x, redPositions[i].y);
                redDiscs[i].velocity.set(0, 0);
                redDiscs[i].isActive = true;
                redDiscs[i].isMovable = true;
            }

            // Reseta bola
            this._resetBall();
        }

        _generatePositions(centerX, centerY, spreadX, spreadY, count) {
            const positions = [];
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);

            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                const offsetX = (col / (cols - 1 || 1) - 0.5) * spreadX;
                const offsetY = (row / (rows - 1 || 1) - 0.5) * spreadY;
                
                positions.push({
                    x: centerX + offsetX + (Math.random() - 0.5) * 10,
                    y: centerY + offsetY + (Math.random() - 0.5) * 10,
                });
            }

            return positions;
        }

        _resetBall() {
            if (!this.ball || !this.renderer) return;

            const fieldWidth = this.renderer.fieldWidth || this.renderer.config?.width || 800;
            const fieldHeight = this.renderer.fieldHeight || this.renderer.config?.height || 500;

            this.ball.position.set(fieldWidth / 2, fieldHeight / 2);
            this.ball.velocity.set(0, 0);
            this.ball.smoothPosition.copy(this.ball.position);
            this.ball.smoothVelocity.set(0, 0);
            this.ball.rotation = 0;
        }

        // ============================================================
        // 17. RENDERIZAÇÃO
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

            // Renderiza mensagem de game over
            if (this.state === 'gameover') {
                this._renderGameOver(ctx);
            }
        }

        // ============================================================
        // 18. HUD
        // ============================================================

        _renderHUD(ctx) {
            if (!ctx) return;

            const screenWidth = this.renderer?.width || ctx.canvas.width;
            const screenHeight = this.renderer?.height || ctx.canvas.height;

            ctx.save();

            // Fundo do HUD
            const hudHeight = 100;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(10, 10, 240, hudHeight, 12);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Placar - Azul
            const blueScore = this.score.blue || 0;
            const redScore = this.score.red || 0;

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Time Azul
            ctx.fillStyle = this.config.teams.blue.color;
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.fillText(`🔵 ${blueScore}`, 20, 16);

            // Time Vermelho
            ctx.fillStyle = this.config.teams.red.color;
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.fillText(`🔴 ${redScore}`, 20, 42);

            // VS
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText('VS', 68, 28);

            // Turno
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(`Turno ${this.turn}`, 20, 68);

            // Jogador atual
            if (this.currentPlayer) {
                const color = this.currentPlayer.color || '#FFFFFF';
                ctx.fillStyle = color;
                ctx.font = 'bold 13px system-ui, sans-serif';
                ctx.fillText(`Vez: ${this.currentPlayer.name}`, 20, 84);
            }

            // Tempo do turno
            if (!this.isGameOver) {
                const timeLeft = Math.max(0, this.turnMaxTime - this.turnTime);
                ctx.fillStyle = timeLeft < 5 ? '#FF6B6B' : 'rgba(255, 255, 255, 0.6)';
                ctx.font = '12px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`⏱ ${timeLeft.toFixed(1)}s`, screenWidth - 20, 16);
                ctx.textAlign = 'left';
            }

            // Fase
            if (!this.isGameOver) {
                const phaseNames = {
                    'idle': 'Selecione um disco',
                    'aiming': 'Mire e dispare',
                    'shooting': 'Disparando...',
                    'waiting': 'Aguardando...',
                    'turnEnd': 'Fim do turno',
                };
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(phaseNames[this.phase] || '', screenWidth - 20, 34);
                ctx.textAlign = 'left';
            }

            // Contador de discos
            if (this.currentPlayer && !this.isGameOver) {
                const activeCount = this.currentPlayer.discs.filter(d => d.isActive && d.isMovable).length;
                const totalCount = this.currentPlayer.discs.length;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`Discos: ${activeCount}/${totalCount}`, screenWidth - 20, 52);
                ctx.textAlign = 'left';
            }

            // Histórico de gols (pequeno indicador)
            if (this.goalHistory.length > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.font = '9px system-ui, sans-serif';
                ctx.textAlign = 'right';
                const goalsText = this.goalHistory.map(g => 
                    g.team === 'blue' ? '🔵' : '🔴'
                ).join(' ');
                ctx.fillText(`Gols: ${goalsText}`, screenWidth - 20, 70);
                ctx.textAlign = 'left';
            }

            ctx.restore();
        }

        // ============================================================
        // 19. TELA DE GAME OVER
        // ============================================================

        _renderGameOver(ctx) {
            if (!ctx) return;

            const screenWidth = this.renderer?.width || ctx.canvas.width;
            const screenHeight = this.renderer?.height || ctx.canvas.height;
            const centerX = screenWidth / 2;
            const centerY = screenHeight / 2;

            ctx.save();

            // Fundo escuro com blur
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);

            // Caixa de game over
            const boxWidth = 400;
            const boxHeight = 280;
            const boxX = centerX - boxWidth / 2;
            const boxY = centerY - boxHeight / 2;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 40;

            ctx.fillStyle = 'rgba(20, 25, 35, 0.95)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Título
            let title = '';
            let titleColor = '#FFFFFF';
            let player = null;

            if (this.result === 'blue') {
                title = '🏆 Vitória do Time Azul!';
                titleColor = this.config.teams.blue.color;
                player = this.players.blue;
            } else if (this.result === 'red') {
                title = '🏆 Vitória do Time Vermelho!';
                titleColor = this.config.teams.red.color;
                player = this.players.red;
            } else if (this.result === 'draw') {
                title = '🤝 Empate!';
                titleColor = '#FFD93D';
            } else {
                title = 'Fim de Jogo';
                titleColor = '#FFFFFF';
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Título
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 28px system-ui, sans-serif';
            ctx.fillText(title, centerX, boxY + 55);

            // Placar final
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 48px system-ui, sans-serif';
            ctx.fillText(
                `${this.score.blue || 0}  x  ${this.score.red || 0}`,
                centerX,
                boxY + 120
            );

            // Informações adicionais
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '14px system-ui, sans-serif';
            const turnText = `${this.turn} turnos`;
            const goalsText = `${this.goalHistory.length} gols`;
            ctx.fillText(`${turnText} • ${goalsText}`, centerX, boxY + 165);

            // Estatísticas do vencedor
            if (player) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '12px system-ui, sans-serif';
                const stats = `🎯 ${player.shoots || 0} disparos • ⚽ ${player.goals || 0} gols`;
                ctx.fillText(stats, centerX, boxY + 195);
            }

            // Botão de reinício
            const btnY = boxY + 220;
            const btnWidth = 140;
            const btnHeight = 44;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 15;

            const gradient = ctx.createLinearGradient(centerX - btnWidth/2, btnY, centerX + btnWidth/2, btnY + btnHeight);
            gradient.addColorStop(0, '#4A90D9');
            gradient.addColorStop(1, '#357ABD');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(centerX - btnWidth/2, btnY, btnWidth, btnHeight, 10);
            ctx.fill();

            ctx.shadowBlur = 0;

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px system-ui, sans-serif';
            ctx.fillText('🔄 Jogar Novamente', centerX, btnY + btnHeight/2);

            // Timer de reinício automático
            if (this.config.restart.autoRestart && this.timers.restartDelay > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '11px system-ui, sans-serif';
                ctx.fillText(`Reiniciando em ${Math.ceil(this.timers.restartDelay)}s...`, centerX, boxY + boxHeight - 12);
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.font = '10px system-ui, sans-serif';
                ctx.fillText('Clique para reiniciar', centerX, boxY + boxHeight - 12);
            }

            // Detecção de clique no botão (apenas se não estiver em auto-restart)
            if (!this.config.restart.autoRestart || this.timers.restartDelay <= 0) {
                // Será processado no evento de clique
                this._gameOverButton = {
                    x: centerX - btnWidth/2,
                    y: btnY,
                    width: btnWidth,
                    height: btnHeight,
                    onClick: () => this._restartGame(),
                };
            }

            ctx.restore();
        }

        // ============================================================
        // 20. CLIQUE NA TELA DE GAME OVER
        // ============================================================

        handleClick(x, y) {
            if (this.state !== 'gameover') return false;
            if (!this._gameOverButton) return false;

            const btn = this._gameOverButton;
            if (x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height) {
                btn.onClick();
                this._gameOverButton = null;
                return true;
            }
            return false;
        }

        // ============================================================
        // 21. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                state: this.state,
                turn: this.turn,
                phase: this.phase,
                result: this.result,
                isGameOver: this.isGameOver,
                currentPlayer: this.currentPlayer ? this.currentPlayer.id : null,
                score: { ...this.score },
                goals: this.goalHistory.length,
                history: [...this.goalHistory],
                discs: {
                    total: this.discs.length,
                    blue: this.players.blue.discs.length,
                    red: this.players.red.discs.length,
                },
                players: {
                    blue: {
                        name: this.players.blue.name,
                        score: this.players.blue.score,
                        goals: this.players.blue.goals,
                        shoots: this.players.blue.shoots,
                    },
                    red: {
                        name: this.players.red.name,
                        score: this.players.red.score,
                        goals: this.players.red.goals,
                        shoots: this.players.red.shoots,
                    },
                },
                timers: { ...this.timers },
                turnTime: this.turnTime,
                isTurnEnding: this.isTurnEnding,
                allStopped: this.allStopped,
            };
        }

        getGoalHistory() {
            return [...this.goalHistory];
        }

        getScore() {
            return { ...this.score };
        }

        getWinner() {
            return this.result;
        }

        isGameOver() {
            return this.isGameOver;
        }

        // ============================================================
        // 22. REINÍCIO PÚBLICO
        // ============================================================

        restart() {
            if (this.state === 'gameover' || this.state === 'menu') {
                this._restartGame();
                return true;
            }
            return false;
        }

        // ============================================================
        // 23. DESTRUIÇÃO
        // ============================================================

        destroy() {
            if (this.input) {
                this.input.onShoot = null;
                this.input.onDiscSelected = null;
                this.input.onDiscDeselected = null;
            }

            this.discs = [];
            this.ball = null;
            this.physics = null;
            this.renderer = null;
            this.input = null;
            this.camera = null;
            this.field = null;

            console.log('[Game] Jogo destruído');
        }
    }

    // ============================================================
    // 24. EXPORTAÇÃO
    // ============================================================

    const GameModule = {
        Config: GameConfig,
        Game: Game,

        create: (options) => new Game(options),
    };

    // ============================================================
    // 25. EXPORTA PARA O GLOBAL
    // ============================================================

    global.GameModule = GameModule;
    global.Game = Game;

    console.log('[Game] Módulo do jogo carregado (completo)');

})(typeof window !== 'undefined' ? window : this);
