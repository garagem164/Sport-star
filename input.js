// engine/input.js — Sistema de input para seleção, arrasto e disparo de discos
// Mouse, Touch, seta, força, direção, movimento suave
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE INPUT
    // ============================================================
    const InputConfig = {
        // Sensibilidade
        sensitivity: 1.0,
        maxDragDistance: 200,
        minDragDistance: 10,
        
        // Força
        maxForce: 800,
        minForce: 50,
        forceMultiplier: 1.5,
        
        // Precisão
        deadZone: 5,
        smoothFactor: 0.85,
        
        // Visual
        arrow: {
            color: 'rgba(255, 255, 255, 0.9)',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            width: 3,
            length: 40,
            headSize: 12,
            glowColor: 'rgba(255, 255, 255, 0.2)',
        },
        
        // Feedback
        haptic: true,
        showForce: true,
        showDirection: true,
        showTrajectory: true,
        trajectoryPoints: 15,
    };

    // ============================================================
    // 2. CLASSE INPUT
    // ============================================================
    class InputManager {
        constructor(options = {}) {
            this.config = { ...InputConfig, ...options };
            
            // Estado do input
            this.isDown = false;
            this.isDragging = false;
            this.hasSelected = false;
            this.selectedDisc = null;
            
            // Posições
            this.startPos = { x: 0, y: 0 };
            this.currentPos = { x: 0, y: 0 };
            this.endPos = { x: 0, y: 0 };
            this.smoothPos = { x: 0, y: 0 };
            
            // Dados de arrasto
            this.dragVector = { x: 0, y: 0 };
            this.dragDistance = 0;
            this.dragAngle = 0;
            this.force = 0;
            this.forceNormalized = 0;
            
            // Dados do toque/click
            this.pointerId = null;
            this.isTouch = false;
            this.isMouse = false;
            
            // Event listeners
            this._listeners = [];
            
            // Referência ao canvas
            this.canvas = null;
            this.renderer = null;
            
            // Estado de animação
            this._animationFrame = null;
            this._lastTime = 0;
            
            // Histórico para movimento suave
            this._positionHistory = [];
            this._velocityHistory = [];
            this._smoothVelocity = { x: 0, y: 0 };
            
            // Callbacks
            this.onDiscSelected = null;
            this.onDiscDeselected = null;
            this.onDragStart = null;
            this.onDragMove = null;
            this.onDragEnd = null;
            this.onShoot = null;
            
            // Bind dos métodos
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onPointerCancel = this._onPointerCancel.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(canvas, renderer = null) {
            this.canvas = canvas;
            this.renderer = renderer;
            
            if (!canvas) {
                console.error('[Input] Canvas não fornecido');
                return this;
            }
            
            // Configura eventos
            this._setupEvents();
            
            // Inicia loop de animação
            this._startAnimationLoop();
            
            console.log('[Input] Sistema de input inicializado');
            return this;
        }

        // ============================================================
        // 4. CONFIGURAÇÃO DE EVENTOS
        // ============================================================

        _setupEvents() {
            const canvas = this.canvas;
            
            // Eventos de mouse
            canvas.addEventListener('mousedown', this._onPointerDown);
            canvas.addEventListener('mousemove', this._onPointerMove);
            canvas.addEventListener('mouseup', this._onPointerUp);
            canvas.addEventListener('mouseleave', this._onPointerCancel);
            
            // Eventos de touch
            canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
            canvas.addEventListener('touchmove', this._onPointerMove, { passive: false });
            canvas.addEventListener('touchend', this._onPointerUp, { passive: false });
            canvas.addEventListener('touchcancel', this._onPointerCancel, { passive: false });
            
            // Previne context menu
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
            
            // Guarda referências para remoção
            this._listeners = [
                { type: 'mousedown', handler: this._onPointerDown },
                { type: 'mousemove', handler: this._onPointerMove },
                { type: 'mouseup', handler: this._onPointerUp },
                { type: 'mouseleave', handler: this._onPointerCancel },
                { type: 'touchstart', handler: this._onPointerDown },
                { type: 'touchmove', handler: this._onPointerMove },
                { type: 'touchend', handler: this._onPointerUp },
                { type: 'touchcancel', handler: this._onPointerCancel },
            ];
        }

        // ============================================================
        // 5. MANIPULADORES DE EVENTOS
        // ============================================================

        _onPointerDown(e) {
            e.preventDefault();
            
            const pos = this._getPointerPos(e);
            if (!pos) return;
            
            // Inicia seleção
            this.isDown = true;
            this.isDragging = false;
            this.hasSelected = false;
            this.startPos = { ...pos };
            this.currentPos = { ...pos };
            this.smoothPos = { ...pos };
            this.isTouch = e.type.startsWith('touch');
            this.isMouse = e.type.startsWith('mouse');
            
            // Limpa histórico
            this._positionHistory = [];
            this._velocityHistory = [];
            
            // Verifica se clicou em algum disco
            this.selectedDisc = this._findDiscAt(pos.x, pos.y);
            
            if (this.selectedDisc) {
                this.hasSelected = true;
                this.isDragging = false;
                
                // Notifica seleção
                if (this.onDiscSelected) {
                    this.onDiscSelected(this.selectedDisc);
                }
            } else {
                this.selectedDisc = null;
                if (this.onDiscDeselected) {
                    this.onDiscDeselected();
                }
            }
        }

        _onPointerMove(e) {
            e.preventDefault();
            
            const pos = this._getPointerPos(e);
            if (!pos) return;
            
            this.currentPos = { ...pos };
            
            // Atualiza posição suavizada
            this.smoothPos.x += (pos.x - this.smoothPos.x) * (1 - this.config.smoothFactor);
            this.smoothPos.y += (pos.y - this.smoothPos.y) * (1 - this.config.smoothFactor);
            
            // Adiciona ao histórico
            this._positionHistory.push({ ...pos, time: Date.now() });
            if (this._positionHistory.length > 10) {
                this._positionHistory.shift();
            }
            
            // Calcula velocidade suave
            this._updateSmoothVelocity();
            
            if (this.isDown && this.hasSelected && this.selectedDisc) {
                // Calcula vetor de arrasto
                const dx = this.startPos.x - this.currentPos.x;
                const dy = this.startPos.y - this.currentPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Verifica se começou a arrastar
                if (!this.isDragging && distance > this.config.deadZone) {
                    this.isDragging = true;
                    if (this.onDragStart) {
                        this.onDragStart(this.selectedDisc, { x: dx, y: dy, distance });
                    }
                }
                
                if (this.isDragging) {
                    // Atualiza dados de arrasto
                    const maxDist = this.config.maxDragDistance;
                    const clampedDist = Math.min(distance, maxDist);
                    const ratio = clampedDist / maxDist;
                    
                    // Normaliza vetor
                    const normX = dx / (distance || 1);
                    const normY = dy / (distance || 1);
                    
                    this.dragVector = {
                        x: normX * clampedDist,
                        y: normY * clampedDist,
                    };
                    this.dragDistance = clampedDist;
                    this.dragAngle = Math.atan2(dy, dx);
                    
                    // Calcula força (com curva de potência para melhor controle)
                    const forceCurve = ratio * ratio * 0.7 + ratio * 0.3;
                    this.force = this.config.minForce + (this.config.maxForce - this.config.minForce) * forceCurve;
                    this.forceNormalized = forceCurve;
                    
                    if (this.onDragMove) {
                        this.onDragMove(this.selectedDisc, {
                            vector: this.dragVector,
                            distance: this.dragDistance,
                            angle: this.dragAngle,
                            force: this.force,
                            normalized: this.forceNormalized,
                            start: this.startPos,
                            current: this.currentPos,
                        });
                    }
                }
            }
        }

        _onPointerUp(e) {
            e.preventDefault();
            
            if (this.isDown && this.isDragging && this.selectedDisc) {
                // Dispara o disco
                const shootData = {
                    disc: this.selectedDisc,
                    vector: { ...this.dragVector },
                    distance: this.dragDistance,
                    angle: this.dragAngle,
                    force: this.force,
                    normalized: this.forceNormalized,
                    start: { ...this.startPos },
                    end: { ...this.currentPos },
                };
                
                if (this.onShoot) {
                    this.onShoot(shootData);
                }
                
                if (this.onDragEnd) {
                    this.onDragEnd(this.selectedDisc, shootData);
                }
            }
            
            // Reseta estado
            this.isDown = false;
            this.isDragging = false;
            this.hasSelected = false;
            this.dragVector = { x: 0, y: 0 };
            this.dragDistance = 0;
            this.force = 0;
            this.forceNormalized = 0;
            this._positionHistory = [];
            this._velocityHistory = [];
            this._smoothVelocity = { x: 0, y: 0 };
            
            // Notifica deseleção
            if (this.selectedDisc && this.onDiscDeselected) {
                this.onDiscDeselected(this.selectedDisc);
            }
            this.selectedDisc = null;
        }

        _onPointerCancel(e) {
            e.preventDefault();
            this._onPointerUp(e);
        }

        // ============================================================
        // 6. UTILITÁRIOS DE POSIÇÃO
        // ============================================================

        _getPointerPos(e) {
            const canvas = this.canvas;
            const rect = canvas.getBoundingClientRect();
            
            let clientX, clientY;
            
            if (e.type.startsWith('touch')) {
                const touch = e.touches[0] || e.changedTouches[0];
                if (!touch) return null;
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            // Converte para coordenadas do canvas
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;
            
            // Converte para coordenadas do mundo se tiver renderer
            if (this.renderer) {
                const world = this.renderer.screenToWorld(x, y);
                return { x: world.x, y: world.y };
            }
            
            return { x, y };
        }

        // ============================================================
        // 7. DETECÇÃO DE DISCO
        // ============================================================

        _findDiscAt(x, y) {
            // Busca em discos (deve ser implementado pelo jogo)
            // Por enquanto, retorna null
            return null;
        }

        // ============================================================
        // 8. VELOCIDADE SUAVE
        // ============================================================

        _updateSmoothVelocity() {
            const history = this._positionHistory;
            if (history.length < 2) {
                this._smoothVelocity = { x: 0, y: 0 };
                return;
            }
            
            // Calcula velocidade baseada no histórico recente
            const recent = history.slice(-5);
            let totalVx = 0, totalVy = 0;
            let count = 0;
            
            for (let i = 1; i < recent.length; i++) {
                const dx = recent[i].x - recent[i-1].x;
                const dy = recent[i].y - recent[i-1].y;
                const dt = (recent[i].time - recent[i-1].time) / 1000;
                
                if (dt > 0) {
                    totalVx += dx / dt;
                    totalVy += dy / dt;
                    count++;
                }
            }
            
            if (count > 0) {
                this._smoothVelocity = {
                    x: totalVx / count,
                    y: totalVy / count,
                };
            }
        }

        // ============================================================
        // 9. LOOP DE ANIMAÇÃO
        // ============================================================

        _startAnimationLoop() {
            const loop = (timestamp) => {
                this._animationFrame = requestAnimationFrame(loop);
                this._update(timestamp);
            };
            this._animationFrame = requestAnimationFrame(loop);
        }

        _update(timestamp) {
            if (!this._lastTime) this._lastTime = timestamp;
            const deltaTime = (timestamp - this._lastTime) / 1000;
            this._lastTime = timestamp;
            
            // Atualiza animações contínuas
            if (this.isDragging && this.selectedDisc) {
                // Atualiza feedback visual (se necessário)
            }
        }

        // ============================================================
        // 10. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.isDragging || !this.selectedDisc) return;
            
            const pos = this.renderer ? 
                this.renderer.worldToScreen(this.currentPos.x, this.currentPos.y) :
                this.currentPos;
            
            const startPos = this.renderer ?
                this.renderer.worldToScreen(this.startPos.x, this.startPos.y) :
                this.startPos;
            
            // Desenha seta
            this._renderArrow(ctx, startPos, pos);
            
            // Desenha força
            if (this.config.showForce) {
                this._renderForce(ctx, startPos, pos);
            }
            
            // Desenha trajetória
            if (this.config.showTrajectory) {
                this._renderTrajectory(ctx, startPos, pos);
            }
        }

        // ============================================================
        // 11. RENDERIZAÇÃO DA SETA
        // ============================================================

        _renderArrow(ctx, start, end) {
            const config = this.config.arrow;
            const dx = start.x - end.x;
            const dy = start.y - end.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.config.deadZone) return;
            
            const angle = Math.atan2(dy, dx);
            const length = Math.min(distance, config.length);
            const normX = dx / distance;
            const normY = dy / distance;
            
            const endX = start.x - normX * length;
            const endY = start.y - normY * length;
            
            ctx.save();
            
            // Sombra da seta
            ctx.shadowColor = config.shadowColor;
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // Brilho da seta
            if (this.isDragging) {
                const glow = ctx.createRadialGradient(
                    (start.x + endX) / 2,
                    (start.y + endY) / 2,
                    0,
                    (start.x + endX) / 2,
                    (start.y + endY) / 2,
                    length * 0.8
                );
                glow.addColorStop(0, config.glowColor);
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc((start.x + endX) / 2, (start.y + endY) / 2, length * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Linha da seta
            ctx.shadowColor = config.shadowColor;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = config.color;
            ctx.lineWidth = config.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Cabeça da seta
            const headSize = config.headSize;
            const headAngle = 0.5;
            
            ctx.shadowBlur = 8;
            ctx.fillStyle = config.color;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX + headSize * Math.cos(angle + Math.PI - headAngle),
                endY + headSize * Math.sin(angle + Math.PI - headAngle)
            );
            ctx.lineTo(
                endX + headSize * Math.cos(angle + Math.PI + headAngle),
                endY + headSize * Math.sin(angle + Math.PI + headAngle)
            );
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }

        // ============================================================
        // 12. RENDERIZAÇÃO DA FORÇA
        // ============================================================

        _renderForce(ctx, start, end) {
            const dx = start.x - end.x;
            const dy = start.y - end.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.config.deadZone) return;
            
            const progress = Math.min(distance / this.config.maxDragDistance, 1);
            
            // Barra de força
            const barX = end.x + 20;
            const barY = end.y - 20;
            const barWidth = 8;
            const barHeight = 60;
            
            ctx.save();
            
            // Fundo da barra
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 4);
            ctx.fill();
            
            // Preenchimento da barra (gradiente de cor)
            const gradient = ctx.createLinearGradient(barX, barY + barHeight, barX, barY);
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(0.4, '#FFC107');
            gradient.addColorStop(0.7, '#FF9800');
            gradient.addColorStop(1, '#F44336');
            
            const fillHeight = barHeight * progress;
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(
                barX,
                barY + barHeight - fillHeight,
                barWidth,
                fillHeight,
                4
            );
            ctx.fill();
            
            // Borda da barra
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 4);
            ctx.stroke();
            
            // Texto da força
            const forcePercent = Math.round(progress * 100);
            ctx.shadowBlur = 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${forcePercent}%`, barX + barWidth / 2, barY - 4);
            
            ctx.restore();
        }

        // ============================================================
        // 13. RENDERIZAÇÃO DA TRAJETÓRIA
        // ============================================================

        _renderTrajectory(ctx, start, end) {
            const dx = start.x - end.x;
            const dy = start.y - end.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.config.deadZone) return;
            
            const angle = Math.atan2(dy, dx);
            const force = Math.min(distance / this.config.maxDragDistance, 1);
            const power = this.config.minForce + (this.config.maxForce - this.config.minForce) * force;
            
            ctx.save();
            
            const points = this.config.trajectoryPoints;
            const gravity = 500;
            const timeStep = 0.03;
            const friction = 0.97;
            
            // Velocidade inicial
            const speed = power / 100;
            const vx = -Math.cos(angle) * speed;
            const vy = -Math.sin(angle) * speed;
            
            let px = start.x;
            let py = start.y;
            let vx2 = vx;
            let vy2 = vy;
            
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            
            for (let i = 0; i < points; i++) {
                px += vx2 * timeStep;
                py += vy2 * timeStep;
                vy2 += gravity * timeStep;
                vx2 *= friction;
                vy2 *= friction;
                
                // Verifica se saiu do campo
                if (py > 1000 || px < -100 || px > 1000) break;
                
                ctx.lineTo(px, py);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Pontos de predição
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            let px2 = start.x;
            let py2 = start.y;
            let vx3 = vx;
            let vy3 = vy;
            
            for (let i = 0; i < points; i += 3) {
                px2 += vx3 * timeStep * 2;
                py2 += vy3 * timeStep * 2;
                vy3 += gravity * timeStep * 2;
                vx3 *= friction;
                vy3 *= friction;
                
                if (py2 > 1000 || px2 < -100 || px2 > 1000) break;
                
                ctx.beginPath();
                ctx.arc(px2, py2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }

        // ============================================================
        // 14. LIMPEZA
        // ============================================================

        destroy() {
            if (this._animationFrame) {
                cancelAnimationFrame(this._animationFrame);
                this._animationFrame = null;
            }
            
            const canvas = this.canvas;
            if (canvas) {
                for (const listener of this._listeners) {
                    canvas.removeEventListener(listener.type, listener.handler);
                }
            }
            
            this._listeners = [];
            this.canvas = null;
            this.selectedDisc = null;
            
            console.log('[Input] Sistema de input destruído');
        }

        // ============================================================
        // 15. MÉTODOS PÚBLICOS
        // ============================================================

        getDragState() {
            return {
                isDragging: this.isDragging,
                isDown: this.isDown,
                hasSelected: this.hasSelected,
                selectedDisc: this.selectedDisc,
                dragVector: { ...this.dragVector },
                dragDistance: this.dragDistance,
                dragAngle: this.dragAngle,
                force: this.force,
                forceNormalized: this.forceNormalized,
                startPos: { ...this.startPos },
                currentPos: { ...this.currentPos },
                smoothPos: { ...this.smoothPos },
                smoothVelocity: { ...this._smoothVelocity },
            };
        }

        getScreenPos(worldX, worldY) {
            if (this.renderer) {
                return this.renderer.worldToScreen(worldX, worldY);
            }
            return { x: worldX, y: worldY };
        }

        getWorldPos(screenX, screenY) {
            if (this.renderer) {
                return this.renderer.screenToWorld(screenX, screenY);
            }
            return { x: screenX, y: screenY };
        }

        // Método para definir disco encontrado (chamado pelo jogo)
        setSelectedDisc(disc) {
            this.selectedDisc = disc;
            this.hasSelected = !!disc;
            return this;
        }
    }

    // ============================================================
    // 16. EXPORTAÇÃO
    // ============================================================

    const InputModule = {
        Config: InputConfig,
        InputManager: InputManager,
        
        create: (options) => new InputManager(options),
    };

    // ============================================================
    // 17. EXPORTA PARA O GLOBAL
    // ============================================================

    global.InputModule = InputModule;
    global.InputManager = InputManager;

    console.log('[Input] Módulo de input carregado.');

})(typeof window !== 'undefined' ? window : this);
