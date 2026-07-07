// engine/replay.js — Sistema de replay com gravação e câmera lenta
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO REPLAY
    // ============================================================
    const ReplayConfig = {
        // Gravação
        recordDuration: 20, // segundos
        recordInterval: 1/60, // 60 FPS
        maxFrames: 1200, // 20 * 60

        // Reprodução
        slowMotionSpeed: 0.3, // 30% da velocidade
        normalSpeed: 1.0,
        fastSpeed: 2.0,

        // Buffer
        bufferSize: 50,
        compression: true,

        // Visual
        showControls: true,
        showTimeline: true,
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        controlColor: 'rgba(255, 255, 255, 0.8)',
    };

    // ============================================================
    // 2. FRAME DE REPLAY
    // ============================================================
    class ReplayFrame {
        constructor() {
            this.timestamp = 0;
            this.data = null;
            this.snapshot = null;
        }

        serialize() {
            return {
                timestamp: this.timestamp,
                data: this.data,
                snapshot: this.snapshot,
            };
        }

        deserialize(data) {
            this.timestamp = data.timestamp;
            this.data = data.data;
            this.snapshot = data.snapshot;
            return this;
        }
    }

    // ============================================================
    // 3. SISTEMA DE REPLAY
    // ============================================================
    class ReplaySystem {
        constructor(options = {}) {
            this.config = { ...ReplayConfig, ...options };

            // Estado
            this.isRecording = false;
            this.isPlaying = false;
            this.isPaused = false;
            this.speed = 1.0;

            // Buffer de frames
            this.frames = [];
            this.currentFrameIndex = 0;
            this.recordStartTime = 0;
            this.playStartTime = 0;

            // Dados do jogo
            this.snapshots = [];
            this.gameState = null;

            // Callbacks
            this.onPlayStart = null;
            this.onPlayEnd = null;
            this.onFrame = null;

            // Referências
            this.game = null;
            this.renderer = null;
            this.camera = null;

            // Controles
            this.controls = {
                play: false,
                pause: false,
                stop: false,
                speed: 1.0,
                progress: 0,
            };

            // Bind
            this._captureFrame = this._captureFrame.bind(this);
            this._playFrame = this._playFrame.bind(this);
        }

        // ============================================================
        // 4. INICIALIZAÇÃO
        // ============================================================

        init(game, renderer, camera) {
            this.game = game;
            this.renderer = renderer;
            this.camera = camera;

            console.log('[Replay] Sistema de replay inicializado');
            return this;
        }

        // ============================================================
        // 5. GRAVAÇÃO
        // ============================================================

        startRecording() {
            if (this.isRecording) return;

            this.isRecording = true;
            this.frames = [];
            this.recordStartTime = performance.now();
            this.currentFrameIndex = 0;

            console.log('[Replay] Gravação iniciada');
            return this;
        }

        stopRecording() {
            if (!this.isRecording) return;

            this.isRecording = false;
            console.log(`[Replay] Gravação finalizada: ${this.frames.length} frames`);
            return this;
        }

        _captureFrame() {
            if (!this.isRecording) return;

            const now = performance.now();
            const timestamp = (now - this.recordStartTime) / 1000;

            // Captura snapshot do estado atual
            const snapshot = this._captureSnapshot();

            const frame = new ReplayFrame();
            frame.timestamp = timestamp;
            frame.snapshot = snapshot;

            this.frames.push(frame);

            // Mantém apenas os últimos X segundos
            const maxFrames = this.config.maxFrames;
            if (this.frames.length > maxFrames) {
                this.frames.shift();
                this.currentFrameIndex = this.frames.length - 1;
            }

            // Atualiza índice
            this.currentFrameIndex = this.frames.length - 1;

            // Callback
            if (this.onFrame) {
                this.onFrame(frame, this.frames.length);
            }
        }

        _captureSnapshot() {
            const snapshot = {
                time: performance.now(),
                game: null,
                objects: [],
            };

            // Captura estado do jogo
            if (this.game) {
                snapshot.game = {
                    turn: this.game.turn,
                    phase: this.game.phase,
                    score: { ...this.game.score },
                    currentPlayer: this.game.currentPlayer?.id || null,
                    state: this.game.state,
                };
            }

            // Captura posições dos discos
            if (this.game && this.game.discs) {
                for (const disc of this.game.discs) {
                    snapshot.objects.push({
                        type: 'disc',
                        id: disc.id,
                        team: disc.team,
                        position: {
                            x: disc.position.x,
                            y: disc.position.y,
                        },
                        velocity: {
                            x: disc.velocity.x,
                            y: disc.velocity.y,
                        },
                        rotation: disc.rotation || 0,
                        radius: disc.radius,
                        isActive: disc.isActive,
                        isMovable: disc.isMovable,
                    });
                }
            }

            // Captura posição da bola
            if (this.game && this.game.ball) {
                const ball = this.game.ball;
                snapshot.objects.push({
                    type: 'ball',
                    id: ball.id,
                    position: {
                        x: ball.position.x,
                        y: ball.position.y,
                    },
                    velocity: {
                        x: ball.velocity.x,
                        y: ball.velocity.y,
                    },
                    radius: ball.radius,
                    rotation: ball.rotation || 0,
                });
            }

            // Captura câmera
            if (this.camera) {
                snapshot.camera = {
                    x: this.camera.x,
                    y: this.camera.y,
                    zoom: this.camera.zoom,
                    targetX: this.camera.targetX,
                    targetY: this.camera.targetY,
                };
            }

            return snapshot;
        }

        // ============================================================
        // 6. REPRODUÇÃO
        // ============================================================

        play(speed = 1.0) {
            if (this.isPlaying && !this.isPaused) return;

            if (this.frames.length === 0) {
                console.warn('[Replay] Nenhum frame para reproduzir');
                return;
            }

            this.isPlaying = true;
            this.isPaused = false;
            this.speed = speed || 1.0;
            this.playStartTime = performance.now();
            this.currentFrameIndex = 0;

            // Reset do estado do jogo para o início do replay
            this._applyFrame(0);

            if (this.onPlayStart) {
                this.onPlayStart(this.frames.length, this.speed);
            }

            console.log(`[Replay] Reprodução iniciada (${this.speed}x)`);
            return this;
        }

        pause() {
            if (!this.isPlaying) return;
            this.isPaused = true;
            console.log('[Replay] Pausado');
            return this;
        }

        resume() {
            if (!this.isPlaying || !this.isPaused) return;
            this.isPaused = false;
            this.playStartTime = performance.now() - (this._getCurrentTime() * 1000 / this.speed);
            console.log('[Replay] Retomado');
            return this;
        }

        stop() {
            if (!this.isPlaying) return;

            this.isPlaying = false;
            this.isPaused = false;
            this.currentFrameIndex = 0;

            if (this.onPlayEnd) {
                this.onPlayEnd();
            }

            console.log('[Replay] Reprodução parada');
            return this;
        }

        _playFrame() {
            if (!this.isPlaying || this.isPaused) return;

            const totalDuration = this.frames[this.frames.length - 1]?.timestamp || 0;
            const currentTime = this._getCurrentTime();

            // Calcula progresso
            const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

            // Verifica se chegou ao fim
            if (progress >= 1) {
                this.stop();
                return;
            }

            // Encontra o frame correspondente
            const targetTime = currentTime;
            let frameIndex = 0;

            for (let i = 0; i < this.frames.length; i++) {
                if (this.frames[i].timestamp <= targetTime) {
                    frameIndex = i;
                } else {
                    break;
                }
            }

            // Aplica o frame
            if (frameIndex !== this.currentFrameIndex) {
                this.currentFrameIndex = frameIndex;
                this._applyFrame(frameIndex);
            }

            // Atualiza controles
            this.controls.progress = progress;
        }

        _applyFrame(index) {
            if (index < 0 || index >= this.frames.length) return;

            const frame = this.frames[index];
            if (!frame || !frame.snapshot) return;

            const snapshot = frame.snapshot;

            // Restaura estado do jogo
            if (this.game && snapshot.game) {
                // Aplica estado parcial (não modifica completamente)
                // para evitar conflitos
                if (this.game.turn !== snapshot.game.turn) {
                    this.game.turn = snapshot.game.turn;
                }
                if (this.game.phase !== snapshot.game.phase) {
                    this.game.phase = snapshot.game.phase;
                }
            }

            // Restaura posições dos objetos
            for (const obj of snapshot.objects) {
                if (obj.type === 'disc') {
                    const disc = this.game?.discs?.find(d => d.id === obj.id);
                    if (disc) {
                        disc.position.set(obj.position.x, obj.position.y);
                        disc.velocity.set(obj.velocity.x, obj.velocity.y);
                        disc.rotation = obj.rotation || 0;
                        disc.isActive = obj.isActive;
                        disc.isMovable = obj.isMovable;
                    }
                } else if (obj.type === 'ball') {
                    const ball = this.game?.ball;
                    if (ball) {
                        ball.position.set(obj.position.x, obj.position.y);
                        ball.velocity.set(obj.velocity.x, obj.velocity.y);
                        ball.rotation = obj.rotation || 0;
                    }
                }
            }

            // Restaura câmera
            if (this.camera && snapshot.camera) {
                this.camera.x = snapshot.camera.x;
                this.camera.y = snapshot.camera.y;
                this.camera.zoom = snapshot.camera.zoom;
            }
        }

        _getCurrentTime() {
            const elapsed = (performance.now() - this.playStartTime) / 1000;
            return elapsed * this.speed;
        }

        // ============================================================
        // 7. CONTROLE DE VELOCIDADE
        // ============================================================

        setSpeed(speed) {
            this.speed = Math.max(0.1, Math.min(3.0, speed));
            this.controls.speed = this.speed;

            if (this.isPlaying) {
                this.playStartTime = performance.now() - (this._getCurrentTime() * 1000 / this.speed);
            }

            return this;
        }

        slowMotion() {
            return this.setSpeed(this.config.slowMotionSpeed);
        }

        normalSpeed() {
            return this.setSpeed(this.config.normalSpeed);
        }

        fastSpeed() {
            return this.setSpeed(this.config.fastSpeed);
        }

        // ============================================================
        // 8. NAVEGAÇÃO
        // ============================================================

        goToFrame(index) {
            if (index < 0 || index >= this.frames.length) return;

            this.currentFrameIndex = index;
            this._applyFrame(index);

            if (this.isPlaying) {
                this.playStartTime = performance.now() - (this.frames[index]?.timestamp || 0) * 1000 / this.speed;
            }

            return this;
        }

        goToProgress(progress) {
            const index = Math.floor(progress * this.frames.length);
            return this.goToFrame(index);
        }

        nextFrame() {
            return this.goToFrame(Math.min(this.currentFrameIndex + 1, this.frames.length - 1));
        }

        prevFrame() {
            return this.goToFrame(Math.max(this.currentFrameIndex - 1, 0));
        }

        // ============================================================
        // 9. RENDERIZAÇÃO (controles overlay)
        // ============================================================

        render(ctx) {
            if (!this.isPlaying && this.frames.length === 0) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;

            ctx.save();

            // Overlay de replay
            if (this.isPlaying) {
                // Barra de progresso
                const barHeight = 6;
                const barY = height - 40;
                const barX = 80;
                const barWidth = width - 160;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.roundRect(barX - 10, barY - 10, barWidth + 20, barHeight + 20, 10);
                ctx.fill();

                // Fundo da barra
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth, barHeight, 3);
                ctx.fill();

                // Progresso
                const progress = this.frames.length > 0 ? this.currentFrameIndex / this.frames.length : 0;
                ctx.fillStyle = '#4A90D9';
                ctx.shadowColor = 'rgba(74, 144, 217, 0.5)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth * progress, barHeight, 3);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Indicador de posição
                const indicatorX = barX + barWidth * progress;
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(indicatorX, barY + barHeight / 2, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Texto do tempo
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const totalTime = this.frames[this.frames.length - 1]?.timestamp || 0;
                const currentTime = this.frames[this.currentFrameIndex]?.timestamp || 0;
                ctx.fillText(
                    `${currentTime.toFixed(1)}s / ${totalTime.toFixed(1)}s`,
                    width / 2,
                    barY + barHeight / 2 + 20
                );

                // Indicador de câmera lenta
                if (this.speed < 0.9) {
                    ctx.fillStyle = '#FFD93D';
                    ctx.font = '12px system-ui, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(`🐢 ${(this.speed * 100).toFixed(0)}%`, width - 20, barY - 10);
                } else if (this.speed > 1.5) {
                    ctx.fillStyle = '#FF6B6B';
                    ctx.font = '12px system-ui, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(`🚀 ${(this.speed * 100).toFixed(0)}%`, width - 20, barY - 10);
                }
            }

            // Botões de controle
            const btnY = height - 70;
            const btnSize = 36;
            const spacing = 10;

            // Fundo dos controles
            if (this.config.showControls) {
                const totalWidth = 5 * (btnSize + spacing) - spacing + 40;
                const startX = (width - totalWidth) / 2;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.roundRect(startX - 10, btnY - 8, totalWidth + 20, btnSize + 16, 12);
                ctx.fill();

                // Botão de play/pause
                const btnPos = (i) => startX + 10 + i * (btnSize + spacing);

                // Botão Rewind (voltar)
                this._renderButton(ctx, btnPos(0), btnY, '⏮', () => this.prevFrame());

                // Botão Play/Pause
                const playIcon = this.isPlaying && !this.isPaused ? '⏸' : '▶';
                const isActive = this.isPlaying || this.frames.length > 0;
                this._renderButton(ctx, btnPos(1), btnY, playIcon, () => {
                    if (this.isPlaying) {
                        if (this.isPaused) {
                            this.resume();
                        } else {
                            this.pause();
                        }
                    } else {
                        this.play();
                    }
                }, isActive);

                // Botão Stop
                this._renderButton(ctx, btnPos(2), btnY, '⏹', () => this.stop());

                // Botão Fast Forward (avançar)
                this._renderButton(ctx, btnPos(3), btnY, '⏭', () => this.nextFrame());

                // Botão Slow Motion
                const isSlow = this.speed < 0.9;
                this._renderButton(ctx, btnPos(4), btnY, '🐢', () => {
                    if (this.speed === this.config.slowMotionSpeed) {
                        this.normalSpeed();
                    } else {
                        this.slowMotion();
                    }
                }, true, isSlow ? '#FFD93D' : null);

                // Botão Normal
                if (this.speed !== 1.0 && this.speed !== this.config.slowMotionSpeed) {
                    this._renderButton(ctx, btnPos(5), btnY, '1x', () => this.normalSpeed());
                }
            }

            ctx.restore();
        }

        _renderButton(ctx, x, y, label, action, enabled = true, color = null) {
            const size = 36;

            ctx.save();

            // Fundo do botão
            if (enabled) {
                ctx.fillStyle = color || 'rgba(255, 255, 255, 0.1)';
                ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            }

            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 8);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Label
            ctx.fillStyle = enabled ? this.config.controlColor : 'rgba(255, 255, 255, 0.3)';
            ctx.font = '16px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + size / 2, y + size / 2 + 1);

            ctx.restore();
        }

        // ============================================================
        // 10. GERENCIAMENTO DE FRAMES
        // ============================================================

        getFrameCount() {
            return this.frames.length;
        }

        getDuration() {
            return this.frames.length > 0 ? this.frames[this.frames.length - 1]?.timestamp || 0 : 0;
        }

        getCurrentFrame() {
            return this.currentFrameIndex;
        }

        getCurrentTime() {
            return this.frames[this.currentFrameIndex]?.timestamp || 0;
        }

        getProgress() {
            return this.frames.length > 0 ? this.currentFrameIndex / this.frames.length : 0;
        }

        // ============================================================
        // 11. LIMPEZA
        // ============================================================

        clear() {
            this.frames = [];
            this.currentFrameIndex = 0;
            this.isRecording = false;
            this.isPlaying = false;
            this.isPaused = false;
            this.snapshots = [];
            return this;
        }

        // ============================================================
        // 12. EXPORTAÇÃO/IMPORTAÇÃO
        // ============================================================

        exportReplay() {
            return {
                config: this.config,
                frames: this.frames.map(f => f.serialize()),
                duration: this.getDuration(),
                frameCount: this.frames.length,
            };
        }

        importReplay(data) {
            this.clear();
            this.config = { ...this.config, ...data.config };

            for (const frameData of data.frames) {
                const frame = new ReplayFrame();
                frame.deserialize(frameData);
                this.frames.push(frame);
            }

            console.log(`[Replay] Importado: ${this.frames.length} frames`);
            return this;
        }

        // ============================================================
        // 13. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                isRecording: this.isRecording,
                isPlaying: this.isPlaying,
                isPaused: this.isPaused,
                speed: this.speed,
                frameCount: this.frames.length,
                currentFrame: this.currentFrameIndex,
                duration: this.getDuration(),
                progress: this.getProgress(),
            };
        }

        // ============================================================
        // 14. ATUALIZAÇÃO (loop)
        // ============================================================

        update(deltaTime) {
            // Gravação
            if (this.isRecording) {
                this._captureFrame();
            }

            // Reprodução
            if (this.isPlaying && !this.isPaused) {
                this._playFrame();
            }
        }

        // ============================================================
        // 15. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.clear();
            this.game = null;
            this.renderer = null;
            this.camera = null;
            this.onPlayStart = null;
            this.onPlayEnd = null;
            this.onFrame = null;

            console.log('[Replay] Sistema destruído');
            return this;
        }
    }

    // ============================================================
    // 16. EXPORTAÇÃO
    // ============================================================

    const ReplayModule = {
        Config: ReplayConfig,
        ReplayFrame: ReplayFrame,
        ReplaySystem: ReplaySystem,

        create: (options) => new ReplaySystem(options),
    };

    // ============================================================
    // 17. EXPORTA PARA O GLOBAL
    // ============================================================

    global.ReplayModule = ReplayModule;
    global.ReplayFrame = ReplayFrame;
    global.ReplaySystem = ReplaySystem;

    console.log('[Replay] Módulo de replay carregado');

})(typeof window !== 'undefined' ? window : this);
