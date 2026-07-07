// engine/game.js — Jogo otimizado (versão unificada e corrigida)
(function(global) {
    'use strict';

    const { Vec2 } = global;

    // ============================================================
    // 1. CONFIGURAÇÕES
    // ============================================================
    const CONFIG = {
        teams: {
            blue: { name: 'Azul', color: '#4A90D9', discs: 5 },
            red: { name: 'Vermelho', color: '#E74C3C', discs: 5 },
        },
        turn: { maxTime: 30, delayAfterShoot: 1.5, delayAfterGoal: 2.0 },
        goals: { scoreToWin: 5, maxTurns: 20 },
        force: { min: 50, max: 800 },
        restart: { autoRestart: false, delayAfterGameOver: 5 },
    };

    // ============================================================
    // 2. CLASSE DO JOGO
    // ============================================================
    class Game {
        constructor(options = {}) {
            this.config = { ...CONFIG, ...options };
            
            this.state = 'menu';
            this.turn = 0;
            this.phase = 'idle';
            this.result = null;
            this.isGameOver = false;
            this.isTurnEnding = false;
            
            this.players = { blue: null, red: null };
            this.currentPlayer = null;
            this.opponentPlayer = null;
            
            this.discs = [];
            this.ball = null;
            this.score = { blue: 0, red: 0 };
            this.goalHistory = [];
            
            this.turnTime = 0;
            this.turnMaxTime = this.config.turn.maxTime;
            this.stoppedCheckCount = 0;
            this.stoppedThreshold = 3;
            
            this.timers = { goalDelay: 0, gameOverDelay: 0, restartDelay: 0 };
            
            this.physics = null;
            this.renderer = null;
            this.input = null;
            this.camera = null;
            this.audio = null;
            this.particles = null;
            this.visual = null;
            this.goalCelebration = null;
            
            this._createPlayers();
            
            // Bind
            this._onInputShoot = this._onInputShoot.bind(this);
            this._onDiscSelected = this._onDiscSelected.bind(this);
            this._onDiscDeselected = this._onDiscDeselected.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================
        init(physics, renderer, input, camera, audio = null, particles = null) {
            this.physics = physics;
            this.renderer = renderer;
            this.input = input;
            this.camera = camera;
            this.audio = audio;
            this.particles = particles;
            
            if (this.input) {
                this.input.onShoot = this._onInputShoot;
                this.input.onDiscSelected = this._onDiscSelected;
                this.input.onDiscDeselected = this._onDiscDeselected;
            }
            
            // Configura IA se necessário
            if (this._ai) {
                this._ai.init(this, physics, null, this.discs, []);
            }
            
            console.log('[Game] Inicializado');
            return this;
        }

        // ============================================================
        // 4. PLAYERS
        // ============================================================
        _createPlayers() {
            this.players.blue = {
                id: 'blue',
                name: 'Azul',
                color: '#4A90D9',
                discs: [],
                score: 0,
                isHuman: true,
            };
            
            this.players.red = {
                id: 'red',
                name: 'Vermelho',
                color: '#E74C3C',
                discs: [],
                score: 0,
                isHuman: false,
            };
        }

        // ============================================================
        // 5. DISCOS E BOLA
        // ============================================================
        setupDiscs(discs, ball) {
            this.discs = discs;
            this.ball = ball;
            
            this.players.blue.discs = discs.filter(d => d.team === 'blue');
            this.players.red.discs = discs.filter(d => d.team === 'red');
            
            return this;
        }

        // ============================================================
        // 6. ESTADO DO JOGO
        // ============================================================
        startGame() {
            this.state = 'playing';
            this.score.blue = 0;
            this.score.red = 0;
            this.turn = 0;
            this.goalHistory = [];
            this.isGameOver = false;
            this.result = null;
            
            this._resetPositions();
            this._startTurn();
            
            console.log('[Game] Jogo iniciado');
        }

        _startTurn() {
            this.turn++;
            this.turnTime = 0;
            this.isTurnEnding = false;
            this.stoppedCheckCount = 0;
            
            if (this.turn > this.config.goals.maxTurns) {
                this._handleGameOver('draw');
                return;
            }
            
            const isBlueTurn = this.turn % 2 === 1;
            this.currentPlayer = isBlueTurn ? this.players.blue : this.players.red;
            this.opponentPlayer = isBlueTurn ? this.players.red : this.players.blue;
            
            for (const disc of this.discs) {
                disc.isActive = disc.team === this.currentPlayer.id;
                disc.isMovable = disc.team === this.currentPlayer.id;
            }
            
            if (this.input) {
                this.input.isDown = false;
                this.input.isDragging = false;
                this.input.selectedDisc = null;
            }
            
            this.phase = 'idle';
            console.log(`[Game] Turno ${this.turn} - ${this.currentPlayer.name}`);
        }

        _endTurn() {
            if (this.isTurnEnding) return;
            this.isTurnEnding = true;
            this.phase = 'turnEnd';
            
            for (const disc of this.discs) {
                if (disc.team === this.currentPlayer.id) {
                    disc.isMovable = false;
                    disc.isActive = false;
                }
            }
            
            setTimeout(() => {
                if (this.state === 'playing' && !this.isGameOver) {
                    this._startTurn();
                }
            }, this.config.turn.delayAfterShoot * 1000);
        }

        // ============================================================
        // 7. INPUT
        // ============================================================
        _onInputShoot(data) {
            if (this.phase !== 'aiming' || this.isTurnEnding || this.isGameOver) return;
            
            const disc = data.disc;
            if (!disc || disc.team !== this.currentPlayer.id) return;
            
            const force = Math.min(data.force, this.config.force.max);
            const power = force * 0.1;
            const angle = data.angle;
            
            disc.velocity.set(Math.cos(angle) * power, Math.sin(angle) * power);
            disc.rotationSpeed = (Math.random() - 0.5) * 10;
            disc.isActive = false;
            disc.isMovable = false;
            
            this.phase = 'shooting';
            
            if (this.audio) this.audio.playClick();
            
            console.log(`[Game] Disparo - Força: ${force.toFixed(0)}`);
        }

        _onDiscSelected(disc) {
            if (this.phase !== 'idle' && this.phase !== 'aiming') return;
            if (this.isTurnEnding || this.isGameOver) return;
            if (!disc || disc.team !== this.currentPlayer.id) return;
            if (!disc.isActive || !disc.isMovable) return;
            
            this.phase = 'aiming';
        }

        _onDiscDeselected(disc) {
            if (this.phase === 'aiming') {
                this.phase = 'idle';
            }
        }

        // ============================================================
        // 8. ATUALIZAÇÃO
        // ============================================================
        update(deltaTime) {
            if (this.state !== 'playing') return;
            
            this._updateTimers(deltaTime);
            
            if (!this.isTurnEnding && !this.isGameOver) {
                this.turnTime += deltaTime;
                
                if (this.turnTime >= this.turnMaxTime && this.phase !== 'shooting') {
                    this._endTurn();
                    return;
                }
            }
            
            if (this.phase === 'shooting' || this.phase === 'waiting') {
                this._checkAllStopped();
            }
            
            // Atualiza discos
            for (const disc of this.discs) {
                if (!disc.isStatic && disc.velocity) {
                    disc.update(deltaTime);
                }
            }
            
            if (this.ball) {
                this.ball.update(deltaTime);
            }
            
            if (this.physics) {
                this.physics.update(deltaTime);
            }
            
            if (!this.isGameOver) {
                this._checkGoals();
            }
        }

        _updateTimers(deltaTime) {
            if (this.timers.goalDelay > 0) {
                this.timers.goalDelay -= deltaTime;
                if (this.timers.goalDelay <= 0) {
                    this.timers.goalDelay = 0;
                    if (!this.isGameOver) {
                        this._resetBall();
                        if (!this.isTurnEnding) this._startTurn();
                    }
                }
            }
            
            if (this.timers.gameOverDelay > 0) {
                this.timers.gameOverDelay -= deltaTime;
                if (this.timers.gameOverDelay <= 0) {
                    this.timers.gameOverDelay = 0;
                    if (this.config.restart.autoRestart) {
                        this.timers.restartDelay = this.config.restart.delayAfterGameOver;
                    }
                }
            }
            
            if (this.timers.restartDelay > 0) {
                this.timers.restartDelay -= deltaTime;
                if (this.timers.restartDelay <= 0) {
                    this.timers.restartDelay = 0;
                    this._restartGame();
                }
            }
        }

        _checkAllStopped() {
            let allStopped = true;
            const threshold = 0.5;
            
            for (const disc of this.discs) {
                if (disc.isStatic) continue;
                if (disc.velocity.mag() > threshold) {
                    allStopped = false;
                    break;
                }
            }
            
            if (this.ball && !this.ball.isStatic) {
                if (this.ball.velocity.mag() > threshold) {
                    allStopped = false;
                }
            }
            
            if (allStopped) {
                this.stoppedCheckCount++;
            } else {
                this.stoppedCheckCount = 0;
            }
            
            if (this.stoppedCheckCount >= this.stoppedThreshold && !this.isTurnEnding && !this.isGameOver) {
                this.phase = 'waiting';
                
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
        // 9. GOLS
        // ============================================================
        _checkGoals() {
            if (!this.ball || !this.renderer) return;
            
            const pos = this.ball.position;
            const fw = this.renderer.fieldWidth || 800;
            const fh = this.renderer.fieldHeight || 500;
            const gw = this.renderer.config?.goal?.width || 120;
            const gd = this.renderer.config?.goal?.depth || 20;
            
            // Gol esquerdo (time vermelho)
            if (pos.x < -gd && pos.y > (fh - gw) / 2 && pos.y < (fh + gw) / 2) {
                this._scoreGoal('blue');
                return;
            }
            
            // Gol direito (time azul)
            if (pos.x > fw + gd && pos.y > (fh - gw) / 2 && pos.y < (fh + gw) / 2) {
                this._scoreGoal('red');
                return;
            }
            
            // Bola fora do campo
            if (pos.x < -200 || pos.x > fw + 200 || pos.y < -200 || pos.y > fh + 200) {
                this._resetBall();
            }
        }

        _scoreGoal(team) {
            if (this.isTurnEnding || this.isGameOver) return;
            
            this.isTurnEnding = true;
            this.score[team]++;
            
            const player = team === 'blue' ? this.players.blue : this.players.red;
            player.score = this.score[team];
            
            this.goalHistory.push({
                team: team,
                turn: this.turn,
                score: { ...this.score },
            });
            
            console.log(`[Game] ⚽ GOL! ${team.toUpperCase()} - ${this.score[team]}`);
            
            // Efeitos visuais
            if (this.particles) {
                const cx = this.renderer?.width / 2 || 400;
                const cy = this.renderer?.height / 2 || 300;
                this.particles.createGoalExplosion(cx, cy);
            }
            
            if (this.audio) {
                this.audio.playGoal();
                setTimeout(() => this.audio?.playWhistle(), 300);
            }
            
            if (this.goalCelebration) {
                this.goalCelebration.start(team);
            }
            
            if (this.score[team] >= this.config.goals.scoreToWin) {
                this._handleGameOver(team);
                return;
            }
            
            this.timers.goalDelay = this.config.turn.delayAfterGoal;
            
            setTimeout(() => {
                if (!this.isGameOver) {
                    this._resetBall();
                    this._resetPositions();
                    if (!this.isTurnEnding) this._startTurn();
                }
            }, this.config.turn.delayAfterGoal * 1000);
        }

        // ============================================================
        // 10. FIM DE JOGO
        // ============================================================
        _handleGameOver(winner) {
            if (this.isGameOver) return;
            
            this.isGameOver = true;
            this.phase = 'gameOver';
            this.result = winner;
            this.state = 'gameover';
            
            console.log(`[Game] Fim de jogo! ${winner === 'draw' ? 'Empate!' : winner + ' venceu!'}`);
            
            if (this.audio) {
                if (winner !== 'draw') this.audio.playVictory();
                else this.audio.playWhistle();
            }
            
            if (this.config.restart.autoRestart) {
                this.timers.gameOverDelay = this.config.turn.delayAfterGameOver;
                this.timers.restartDelay = this.config.restart.delayAfterGameOver;
            }
        }

        // ============================================================
        // 11. REINÍCIO
        // ============================================================
        _restartGame() {
            console.log('[Game] Reiniciando...');
            
            this.isGameOver = false;
            this.isTurnEnding = false;
            this.result = null;
            this.turn = 0;
            this.goalHistory = [];
            this.timers = { goalDelay: 0, gameOverDelay: 0, restartDelay: 0 };
            
            this.score.blue = 0;
            this.score.red = 0;
            this.players.blue.score = 0;
            this.players.red.score = 0;
            
            this._resetPositions();
            
            for (const disc of this.discs) {
                disc.velocity.set(0, 0);
                disc.isActive = true;
                disc.isMovable = true;
                disc.rotation = 0;
                disc.rotationSpeed = 0;
            }
            
            if (this.ball) this._resetBall();
            if (this.input) {
                this.input.isDown = false;
                this.input.isDragging = false;
                this.input.selectedDisc = null;
            }
            
            this.state = 'playing';
            this._startTurn();
        }

        restart() {
            if (this.state === 'gameover' || this.state === 'menu') {
                this._restartGame();
                return true;
            }
            return false;
        }

        // ============================================================
        // 12. RESET DE POSIÇÕES
        // ============================================================
        _resetPositions() {
            if (!this.renderer) return;
            
            const fw = this.renderer.fieldWidth || 800;
            const fh = this.renderer.fieldHeight || 500;
            
            const blueDiscs = this.players.blue.discs;
            const redDiscs = this.players.red.discs;
            
            const bluePos = this._generatePositions(fw * 0.2, fh / 2, fw * 0.2, fh * 0.3, blueDiscs.length);
            const redPos = this._generatePositions(fw * 0.8, fh / 2, fw * 0.2, fh * 0.3, redDiscs.length);
            
            for (let i = 0; i < blueDiscs.length && i < bluePos.length; i++) {
                blueDiscs[i].position.set(bluePos[i].x, bluePos[i].y);
                blueDiscs[i].velocity.set(0, 0);
                blueDiscs[i].isActive = true;
                blueDiscs[i].isMovable = true;
            }
            
            for (let i = 0; i < redDiscs.length && i < redPos.length; i++) {
                redDiscs[i].position.set(redPos[i].x, redPos[i].y);
                redDiscs[i].velocity.set(0, 0);
                redDiscs[i].isActive = true;
                redDiscs[i].isMovable = true;
            }
            
            this._resetBall();
        }

        _generatePositions(cx, cy, spreadX, spreadY, count) {
            const positions = [];
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const ox = (col / (cols - 1 || 1) - 0.5) * spreadX;
                const oy = (row / (rows - 1 || 1) - 0.5) * spreadY;
                positions.push({
                    x: cx + ox + (Math.random() - 0.5) * 5,
                    y: cy + oy + (Math.random() - 0.5) * 5,
                });
            }
            
            return positions;
        }

        _resetBall() {
            if (!this.ball || !this.renderer) return;
            
            const fw = this.renderer.fieldWidth || 800;
            const fh = this.renderer.fieldHeight || 500;
            
            this.ball.position.set(fw / 2, fh / 2);
            this.ball.velocity.set(0, 0);
            if (this.ball.smoothPosition) {
                this.ball.smoothPosition.copy(this.ball.position);
            }
            this.ball.rotation = 0;
        }

        // ============================================================
        // 13. RENDERIZAÇÃO
        // ============================================================
        render(ctx) {
            // Renderiza discos
            for (const disc of this.discs) {
                if (disc.render) {
                    disc.render(ctx, this.renderer);
                }
            }
            
            if (this.ball && this.ball.render) {
                this.ball.render(ctx, this.renderer);
            }
            
            if (this.input && this.input.render) {
                this.input.render(ctx);
            }
            
            if (this.goalCelebration && this.goalCelebration.isActive()) {
                this.goalCelebration.render(ctx);
            }
        }

        // ============================================================
        // 14. ESTATÍSTICAS
        // ============================================================
        getStats() {
            return {
                state: this.state,
                turn: this.turn,
                phase: this.phase,
                result: this.result,
                isGameOver: this.isGameOver,
                currentPlayer: this.currentPlayer?.id || null,
                score: { ...this.score },
                goals: this.goalHistory.length,
                turnTime: this.turnTime,
                isTurnEnding: this.isTurnEnding,
                discs: {
                    total: this.discs.length,
                    blue: this.players.blue.discs.length,
                    red: this.players.red.discs.length,
                },
            };
        }

        // ============================================================
        // 15. DESTRUIÇÃO
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
            this.audio = null;
            this.particles = null;
            this.goalCelebration = null;
        }
    }

    // ============================================================
    // 16. EXPORTAÇÃO
    // ============================================================
    const GameModule = {
        Config: CONFIG,
        Game: Game,
        create: (o) => new Game(o),
    };

    global.GameModule = GameModule;
    global.Game = Game;

    console.log('[Game] Carregado');

})(typeof window !== 'undefined' ? window : this);
