/**
 * Jogo completo com todas as mecânicas
 * @class Game
 */
class Game {
    constructor(options = {}) {
        // Configurações
        this.config = {
            scoreToWin: options.scoreToWin || 5,
            maxTurns: options.maxTurns || 20,
            turnTime: options.turnTime || 30,
            delayAfterShoot: options.delayAfterShoot || 1.5,
            delayAfterGoal: options.delayAfterGoal || 2.0,
            fieldWidth: options.fieldWidth || 800,
            fieldHeight: options.fieldHeight || 500,
            ...options
        };
        
        // Estado
        this.state = 'playing';
        this.phase = 'idle';
        this.turn = 0;
        this.result = null;
        this.isGameOver = false;
        this.isTurnEnding = false;
        this.turnTime = 0;
        this.stoppedCheckCount = 0;
        this.stoppedThreshold = 5;
        
        // Jogadores
        this.players = this._createPlayers();
        this.currentPlayer = null;
        this.opponentPlayer = null;
        
        // Entidades
        this.discs = [];
        this.ball = null;
        this.score = { blue: 0, red: 0 };
        this.goalHistory = [];
        
        // Temporizadores
        this.timers = {
            goalDelay: 0,
            gameOverDelay: 0,
            restartDelay: 0,
        };
        
        // Sub-sistemas
        this.physics = null;
        this.collisionSystem = null;
        this.renderer = null;
        this.input = null;
        this.camera = null;
        this.audio = null;
        this.particles = null;
        
        // Callbacks
        this.callbacks = {};
        
        // Bind
        this._onInputShoot = this._onInputShoot.bind(this);
        this._onDiscSelected = this._onDiscSelected.bind(this);
        this._onDiscDeselected = this._onDiscDeselected.bind(this);
        this._onDragMove = this._onDragMove.bind(this);
    }

    // ==================== Inicialização ====================
    
    /**
     * Inicializa o jogo
     */
    init({ physics, collisionSystem, renderer, input, camera, audio, particles }) {
        this.physics = physics;
        this.collisionSystem = collisionSystem;
        this.renderer = renderer;
        this.input = input;
        this.camera = camera;
        this.audio = audio;
        this.particles = particles;
        
        if (this.input) {
            this.input.onShoot = this._onInputShoot;
            this.input.onDiscSelected = this._onDiscSelected;
            this.input.onDiscDeselected = this._onDiscDeselected;
            this.input.onDragMove = this._onDragMove;
            this.input.setGame(this);
        }
        
        // Cria entidades
        this._createEntities();
        
        // Inicia o jogo
        this.startGame();
        
        return this;
    }

    // ==================== Criação de Entidades ====================
    
    _createPlayers() {
        return {
            blue: {
                id: 'blue',
                name: 'Azul',
                color: '#4A90D9',
                discs: [],
                score: 0,
                isHuman: true,
            },
            red: {
                id: 'red',
                name: 'Vermelho',
                color: '#E74C3C',
                discs: [],
                score: 0,
                isHuman: false,
            },
        };
    }

    _createEntities() {
        const fw = this.config.fieldWidth;
        const fh = this.config.fieldHeight;
        const discRadius = 18;
        const ballRadius = 12;
        
        // Cria discos azuis (5)
        const bluePositions = this._generatePositions(fw * 0.2, fh / 2, fw * 0.2, fh * 0.35, 5);
        for (let i = 0; i < 5; i++) {
            const disc = new Disc({
                team: 'blue',
                position: new Vec2(bluePositions[i].x, bluePositions[i].y),
                radius: discRadius,
                mass: 1,
                restitution: 0.7,
                friction: 0.3,
            });
            this.discs.push(disc);
            this.players.blue.discs.push(disc);
        }
        
        // Cria discos vermelhos (5)
        const redPositions = this._generatePositions(fw * 0.8, fh / 2, fw * 0.2, fh * 0.35, 5);
        for (let i = 0; i < 5; i++) {
            const disc = new Disc({
                team: 'red',
                position: new Vec2(redPositions[i].x, redPositions[i].y),
                radius: discRadius,
                mass: 1,
                restitution: 0.7,
                friction: 0.3,
            });
            this.discs.push(disc);
            this.players.red.discs.push(disc);
        }
        
        // Cria bola
        this.ball = new Ball({
            position: new Vec2(fw / 2, fh / 2),
            radius: ballRadius,
            mass: 0.5,
            restitution: 0.8,
        });
        
        // Configura invMass para todos
        for (const disc of this.discs) {
            disc.invMass = 1 / disc.mass;
        }
        this.ball.invMass = 1 / this.ball.mass;
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

    // ==================== Estado do Jogo ====================
    
    startGame() {
        this.state = 'playing';
        this.score = { blue: 0, red: 0 };
        this.turn = 0;
        this.goalHistory = [];
        this.isGameOver = false;
        this.result = null;
        this.isTurnEnding = false;
        
        this._resetPositions();
        this._startTurn();
        
        console.log('[Game] Jogo iniciado!');
    }

    _startTurn() {
        this.turn++;
        this.turnTime = 0;
        this.isTurnEnding = false;
        this.stoppedCheckCount = 0;
        
        if (this.turn > this.config.maxTurns) {
            this._handleGameOver('draw');
            return;
        }
        
        const isBlueTurn = this.turn % 2 === 1;
        this.currentPlayer = isBlueTurn ? this.players.blue : this.players.red;
        this.opponentPlayer = isBlueTurn ? this.players.red : this.players.blue;
        
        // Ativa discos do jogador atual
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
        }, this.config.delayAfterShoot * 1000);
    }

    // ==================== Input ====================
    
    _onInputShoot(data) {
        if (this.phase !== 'aiming' || this.isTurnEnding || this.isGameOver) return;
        
        const disc = data.disc;
        if (!disc || disc.team !== this.currentPlayer.id) return;
        
        const force = Math.min(data.force, 800);
        const power = force * 0.1;
        const angle = data.angle;
        
        disc.velocity.set(Math.cos(angle) * power, Math.sin(angle) * power);
        disc.rotationSpeed = (Math.random() - 0.5) * 5;
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

    _onDragMove(data) {
        // Atualiza linha de força em tempo real
    }

    // ==================== Atualização ====================
    
    update(deltaTime) {
        if (this.state !== 'playing') return;
        
        this._updateTimers(deltaTime);
        
        if (!this.isTurnEnding && !this.isGameOver) {
            this.turnTime += deltaTime;
            if (this.turnTime >= this.config.turnTime && this.phase !== 'shooting') {
                this._endTurn();
                return;
            }
        }
        
        // Atualiza físicas
        for (const disc of this.discs) {
            disc.update(deltaTime);
        }
        if (this.ball) {
            this.ball.update(deltaTime);
        }
        
        // Resolve colisões
        if (this.collisionSystem) {
            const field = {
                width: this.config.fieldWidth,
                height: this.config.fieldHeight,
            };
            this.collisionSystem.resolveAll(this.discs, this.ball, field);
        }
        
        // Verifica parada
        if (this.phase === 'shooting' || this.phase === 'waiting') {
            this._checkAllStopped();
        }
        
        // Verifica gols
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
    }

    _checkAllStopped() {
        const threshold = 0.5;
        let allStopped = true;
        
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

    // ==================== Gols ====================
    
    _checkGoals() {
        if (!this.ball || !this.renderer) return;
        
        const pos = this.ball.position;
        const fw = this.config.fieldWidth;
        const fh = this.config.fieldHeight;
        const gw = 120; // Largura do gol
        const gd = 20;  // Profundidade do gol
        
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
            team,
            turn: this.turn,
            score: { ...this.score },
        });
        
        console.log(`[Game] ⚽ GOL! ${team.toUpperCase()} - ${this.score[team]}`);
        
        // Efeitos
        if (this.particles) {
            const cx = this.config.fieldWidth / 2;
            const cy = this.config.fieldHeight / 2;
            this.particles.createGoalExplosion(cx, cy);
        }
        
        if (this.audio) {
            this.audio.playGoal();
            setTimeout(() => this.audio?.playWhistle(), 300);
        }
        
        if (this.score[team] >= this.config.scoreToWin) {
            this._handleGameOver(team);
            return;
        }
        
        this.timers.goalDelay = this.config.delayAfterGoal;
        setTimeout(() => {
            if (!this.isGameOver) {
                this._resetBall();
                if (!this.isTurnEnding) this._startTurn();
            }
        }, this.config.delayAfterGoal * 1000);
    }

    // ==================== Fim de Jogo ====================
    
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
    }

    // ==================== Reinício ====================
    
    restart() {
        if (this.state === 'gameover' || this.state === 'playing') {
            this._restartGame();
            return true;
        }
        return false;
    }

    _restartGame() {
        console.log('[Game] Reiniciando...');
        
        this.isGameOver = false;
        this.isTurnEnding = false;
        this.result = null;
        this.turn = 0;
        this.goalHistory = [];
        this.timers = { goalDelay: 0, gameOverDelay: 0, restartDelay: 0 };
        
        this.score = { blue: 0, red: 0 };
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
        
        if (this.ball) {
            this.ball.velocity.set(0, 0);
            this.ball.rotation = 0;
        }
        
        if (this.input) {
            this.input.isDown = false;
            this.input.isDragging = false;
            this.input.selectedDisc = null;
        }
        
        this.state = 'playing';
        this._startTurn();
    }

    // ==================== Posições ====================
    
    _resetPositions() {
        const fw = this.config.fieldWidth;
        const fh = this.config.fieldHeight;
        
        const bluePositions = this._generatePositions(fw * 0.2, fh / 2, fw * 0.2, fh * 0.35, 5);
        const redPositions = this._generatePositions(fw * 0.8, fh / 2, fw * 0.2, fh * 0.35, 5);
        
        for (let i = 0; i < this.players.blue.discs.length && i < bluePositions.length; i++) {
            this.players.blue.discs[i].position.set(bluePositions[i].x, bluePositions[i].y);
            this.players.blue.discs[i].velocity.set(0, 0);
            this.players.blue.discs[i].isActive = true;
            this.players.blue.discs[i].isMovable = true;
        }
        
        for (let i = 0; i < this.players.red.discs.length && i < redPositions.length; i++) {
            this.players.red.discs[i].position.set(redPositions[i].x, redPositions[i].y);
            this.players.red.discs[i].velocity.set(0, 0);
            this.players.red.discs[i].isActive = true;
            this.players.red.discs[i].isMovable = true;
        }
        
        this._resetBall();
    }

    _resetBall() {
        if (!this.ball) return;
        const fw = this.config.fieldWidth;
        const fh = this.config.fieldHeight;
        this.ball.position.set(fw / 2, fh / 2);
        this.ball.velocity.set(0, 0);
        this.ball.rotation = 0;
        if (this.ball.smoothPosition) {
            this.ball.smoothPosition.copy(this.ball.position);
        }
    }

    // ==================== Renderização ====================
    
    render(ctx) {
        // Renderiza discos
        for (const disc of this.discs) {
            disc.render(ctx, this.renderer);
        }
        
        // Renderiza bola
        if (this.ball) {
            this.ball.render(ctx, this.renderer);
        }
        
        // Renderiza input (mira)
        if (this.input && this.input.render) {
            this.input.render(ctx);
        }
        
        // Renderiza HUD
        this._renderHUD(ctx);
        
        // Renderiza game over
        if (this.isGameOver) {
            this._renderGameOver(ctx);
        }
    }

    _renderHUD(ctx) {
        const width = this.renderer?.width || 800;
        const height = this.renderer?.height || 500;
        
        ctx.save();
        
        // Fundo do HUD
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(15, 15, 220, 80, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Placar
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Azul
        ctx.fillStyle = '#4A90D9';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(`🔵 ${this.score.blue}`, 25, 20);
        
        // Vermelho
        ctx.fillStyle = '#E74C3C';
        ctx.fillText(`🔴 ${this.score.red}`, 25, 48);
        
        // Turno
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(`Turno ${this.turn}`, 115, 25);
        
        // Jogador atual
        if (this.currentPlayer) {
            ctx.fillStyle = this.currentPlayer.color;
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillText(`Vez: ${this.currentPlayer.name}`, 115, 45);
        }
        
        // Tempo
        const timeLeft = Math.max(0, this.config.turnTime - this.turnTime);
        ctx.fillStyle = timeLeft < 5 ? '#FF6B6B' : 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(`⏱ ${timeLeft.toFixed(1)}s`, 115, 65);
        
        // Fase
        const phaseNames = {
            'idle': 'Selecione um disco',
            'aiming': 'Mire e dispare!',
            'shooting': 'Disparando...',
            'waiting': 'Aguardando...',
            'turnEnd': 'Fim do turno',
        };
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(phaseNames[this.phase] || '', width - 20, 20);
        
        // Contador de discos
        if (this.currentPlayer) {
            const activeCount = this.currentPlayer.discs.filter(d => d.isActive && d.isMovable).length;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px system-ui, sans-serif';
            ctx.fillText(`Discos: ${activeCount}/${this.currentPlayer.discs.length}`, width - 20, 40);
        }
        
        ctx.restore();
    }

    _renderGameOver(ctx) {
        const width = this.renderer?.width || 800;
        const height = this.renderer?.height || 500;
        const cx = width / 2;
        const cy = height / 2;
        
        ctx.save();
        
        // Fundo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, width, height);
        
        // Card
        const boxW = 400, boxH = 250;
        const bx = cx - boxW / 2, by = cy - boxH / 2;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(15, 20, 35, 0.95)';
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 20);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Título
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let title = '', color = '#FFFFFF';
        if (this.result === 'blue') {
            title = '🏆 Vitória do Azul!';
            color = '#4A90D9';
        } else if (this.result === 'red') {
            title = '🏆 Vitória do Vermelho!';
            color = '#E74C3C';
        } else if (this.result === 'draw') {
            title = '🤝 Empate!';
            color = '#FFD93D';
        }
        
        ctx.fillStyle = color;
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillText(title, cx, by + 50);
        ctx.shadowBlur = 0;
        
        // Placar
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.fillText(`${this.score.blue}  x  ${this.score.red}`, cx, by + 115);
        
        // Botão reiniciar
        const btnW = 180, btnH = 44;
        const btnX = cx - btnW / 2, btnY = by + boxH - 60;
        
        ctx.shadowColor = 'rgba(74, 144, 217, 0.3)';
        ctx.shadowBlur = 20;
        const gradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        gradient.addColorStop(0, '#4A90D9');
        gradient.addColorStop(1, '#357ABD');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('🔄 Jogar Novamente', cx, btnY + btnH / 2);
        
        // Salva posição do botão
        this._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
        
        ctx.restore();
    }

    // ==================== Interação com HUD ====================
    
    handleClick(x, y) {
        if (this.isGameOver && this._restartBtn) {
            const btn = this._restartBtn;
            if (x >= btn.x && x <= btn.x + btn.w &&
                y >= btn.y && y <= btn.y + btn.h) {
                this._restartGame();
                return true;
            }
        }
        return false;
    }

    // ==================== Getters ====================
    
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
            discs: this.discs.length,
        };
    }

    destroy() {
        if (this.input) {
            this.input.onShoot = null;
            this.input.onDiscSelected = null;
            this.input.onDiscDeselected = null;
            this.input.onDragMove = null;
        }
        this.discs = [];
        this.ball = null;
        this.physics = null;
        this.collisionSystem = null;
        this.renderer = null;
        this.input = null;
        this.camera = null;
        this.audio = null;
        this.particles = null;
        this.callbacks = {};
    }
}
