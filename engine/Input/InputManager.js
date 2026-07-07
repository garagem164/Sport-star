/**
 * Gerenciador de input com mira por arrastar
 * @class InputManager
 */
class InputManager {
    constructor(options = {}) {
        this.config = {
            deadZone: 5,
            maxDragDistance: 200,
            minForce: 50,
            maxForce: 800,
            smoothFactor: 0.85,
            ...options
        };
        
        this.isDown = false;
        this.isDragging = false;
        this.hasSelected = false;
        this.selectedDisc = null;
        
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.smoothPos = { x: 0, y: 0 };
        
        this.dragVector = { x: 0, y: 0 };
        this.dragDistance = 0;
        this.dragAngle = 0;
        this.force = 0;
        this.forceNormalized = 0;
        
        this.canvas = null;
        this.renderer = null;
        this._listeners = [];
        this._boundHandlers = {};
        
        this.onShoot = null;
        this.onDiscSelected = null;
        this.onDiscDeselected = null;
        this.onDragMove = null;
    }

    /**
     * Inicializa o input
     * @param {HTMLCanvasElement} canvas 
     * @param {FieldRenderer} renderer 
     * @returns {InputManager} this
     */
    init(canvas, renderer = null) {
        this.canvas = canvas;
        this.renderer = renderer;
        
        if (!canvas) {
            console.error('[Input] Canvas não fornecido');
            return this;
        }
        
        this._setupEvents();
        return this;
    }

    _setupEvents() {
        const canvas = this.canvas;
        
        this._boundHandlers = {
            down: this._onDown.bind(this),
            move: this._onMove.bind(this),
            up: this._onUp.bind(this),
            cancel: this._onCancel.bind(this),
        };
        
        // Mouse
        canvas.addEventListener('mousedown', this._boundHandlers.down);
        canvas.addEventListener('mousemove', this._boundHandlers.move);
        canvas.addEventListener('mouseup', this._boundHandlers.up);
        canvas.addEventListener('mouseleave', this._boundHandlers.cancel);
        
        // Touch
        canvas.addEventListener('touchstart', this._boundHandlers.down, { passive: false });
        canvas.addEventListener('touchmove', this._boundHandlers.move, { passive: false });
        canvas.addEventListener('touchend', this._boundHandlers.up, { passive: false });
        canvas.addEventListener('touchcancel', this._boundHandlers.cancel, { passive: false });
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this._listeners = [
            { type: 'mousedown', handler: this._boundHandlers.down },
            { type: 'mousemove', handler: this._boundHandlers.move },
            { type: 'mouseup', handler: this._boundHandlers.up },
            { type: 'mouseleave', handler: this._boundHandlers.cancel },
            { type: 'touchstart', handler: this._boundHandlers.down },
            { type: 'touchmove', handler: this._boundHandlers.move },
            { type: 'touchend', handler: this._boundHandlers.up },
            { type: 'touchcancel', handler: this._boundHandlers.cancel },
        ];
    }

    _onDown(e) {
        e.preventDefault();
        
        const pos = this._getPos(e);
        if (!pos) return;
        
        this.isDown = true;
        this.isDragging = false;
        this.hasSelected = false;
        this.startPos = { ...pos };
        this.currentPos = { ...pos };
        this.smoothPos = { ...pos };
        
        // Verifica seleção de disco
        this.selectedDisc = this._findDisc(pos.x, pos.y);
        
        if (this.selectedDisc) {
            this.hasSelected = true;
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

    _onMove(e) {
        e.preventDefault();
        
        const pos = this._getPos(e);
        if (!pos) return;
        
        this.currentPos = { ...pos };
        this.smoothPos.x += (pos.x - this.smoothPos.x) * (1 - this.config.smoothFactor);
        this.smoothPos.y += (pos.y - this.smoothPos.y) * (1 - this.config.smoothFactor);
        
        if (this.isDown && this.hasSelected && this.selectedDisc) {
            const dx = this.startPos.x - this.currentPos.x;
            const dy = this.startPos.y - this.currentPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (!this.isDragging && dist > this.config.deadZone) {
                this.isDragging = true;
            }
            
            if (this.isDragging) {
                const maxDist = this.config.maxDragDistance;
                const clampedDist = Math.min(dist, maxDist);
                const ratio = clampedDist / maxDist;
                const normX = dx / (dist || 1);
                const normY = dy / (dist || 1);
                
                this.dragVector = { x: normX * clampedDist, y: normY * clampedDist };
                this.dragDistance = clampedDist;
                this.dragAngle = Math.atan2(dy, dx);
                
                const forceCurve = ratio * ratio * 0.7 + ratio * 0.3;
                this.force = this.config.minForce + (this.config.maxForce - this.config.minForce) * forceCurve;
                this.forceNormalized = forceCurve;
                
                if (this.onDragMove) {
                    this.onDragMove({
                        disc: this.selectedDisc,
                        vector: this.dragVector,
                        distance: this.dragDistance,
                        angle: this.dragAngle,
                        force: this.force,
                        normalized: this.forceNormalized,
                    });
                }
            }
        }
    }

    _onUp(e) {
        e.preventDefault();
        
        if (this.isDown && this.isDragging && this.selectedDisc) {
            if (this.onShoot) {
                this.onShoot({
                    disc: this.selectedDisc,
                    vector: { ...this.dragVector },
                    distance: this.dragDistance,
                    angle: this.dragAngle,
                    force: this.force,
                    normalized: this.forceNormalized,
                    start: { ...this.startPos },
                    current: { ...this.currentPos },
                });
            }
        }
        
        this.isDown = false;
        this.isDragging = false;
        this.hasSelected = false;
        this.dragVector = { x: 0, y: 0 };
        this.dragDistance = 0;
        this.force = 0;
        this.forceNormalized = 0;
        
        if (this.selectedDisc && this.onDiscDeselected) {
            this.onDiscDeselected(this.selectedDisc);
        }
        this.selectedDisc = null;
    }

    _onCancel(e) {
        e.preventDefault();
        this._onUp(e);
    }

    _getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let cx, cy;
        if (e.type.startsWith('touch')) {
            const touch = e.touches[0] || e.changedTouches[0];
            if (!touch) return null;
            cx = touch.clientX;
            cy = touch.clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        
        const x = (cx - rect.left) * scaleX;
        const y = (cy - rect.top) * scaleY;
        
        if (this.renderer) {
            const world = this.renderer.screenToWorld(x, y);
            return { x: world.x, y: world.y };
        }
        
        return { x, y };
    }

    _findDisc(x, y) {
        // Busca nos discos do jogo
        if (!this._game) return null;
        
        const discs = this._game.discs || [];
        let closest = null;
        let closestDist = Infinity;
        
        for (const disc of discs) {
            if (!disc.isActive || !disc.isMovable) continue;
            const dist = Math.sqrt(
                Math.pow(x - disc.position.x, 2) + 
                Math.pow(y - disc.position.y, 2)
            );
            if (dist < disc.radius && dist < closestDist) {
                closestDist = dist;
                closest = disc;
            }
        }
        
        return closest;
    }

    /**
     * Define a referência do jogo para detecção de discos
     * @param {Game} game 
     */
    setGame(game) {
        this._game = game;
    }

    /**
     * Renderiza a mira (seta, força, trajetória)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.isDragging || !this.selectedDisc) return;
        
        const pos = this.renderer ? 
            this.renderer.worldToScreen(this.currentPos.x, this.currentPos.y) :
            this.currentPos;
        
        const start = this.renderer ?
            this.renderer.worldToScreen(this.startPos.x, this.startPos.y) :
            this.startPos;
        
        // Seta de direção
        this._renderArrow(ctx, start, pos);
        
        // Indicador de força
        this._renderForce(ctx, start, pos);
        
        // Linha de trajetória
        this._renderTrajectory(ctx, start, pos);
    }

    _renderArrow(ctx, start, end) {
        const dx = start.x - end.x;
        const dy = start.y - end.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.config.deadZone) return;
        
        const angle = Math.atan2(dy, dx);
        const length = Math.min(dist, 60);
        const nx = dx / dist;
        const ny = dy / dist;
        
        const ex = start.x - nx * length;
        const ey = start.y - ny * length;
        
        ctx.save();
        
        // Sombra da seta
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        
        // Linha da seta
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        
        // Cabeça da seta
        const headSize = 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
            ex + headSize * Math.cos(angle + Math.PI - 0.5),
            ey + headSize * Math.sin(angle + Math.PI - 0.5)
        );
        ctx.lineTo(
            ex + headSize * Math.cos(angle + Math.PI + 0.5),
            ey + headSize * Math.sin(angle + Math.PI + 0.5)
        );
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    _renderForce(ctx, start, end) {
        const dx = start.x - end.x;
        const dy = start.y - end.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.config.deadZone) return;
        
        const progress = Math.min(dist / this.config.maxDragDistance, 1);
        const barX = end.x + 25;
        const barY = end.y - 35;
        const barW = 8;
        const barH = 60;
        
        ctx.save();
        
        // Fundo da barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();
        
        // Preenchimento da barra
        const gradient = ctx.createLinearGradient(barX, barY + barH, barX, barY);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(0.4, '#FFC107');
        gradient.addColorStop(0.7, '#FF9800');
        gradient.addColorStop(1, '#F44336');
        
        const fillH = barH * progress;
        ctx.shadowBlur = 0;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(barX, barY + barH - fillH, barW, fillH, 4);
        ctx.fill();
        
        // Borda da barra
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.stroke();
        
        // Porcentagem
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowBlur = 4;
        ctx.fillText(`${Math.round(progress * 100)}%`, barX + barW / 2, barY - 4);
        
        ctx.restore();
    }

    _renderTrajectory(ctx, start, end) {
        const dx = start.x - end.x;
        const dy = start.y - end.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.config.deadZone) return;
        
        const angle = Math.atan2(dy, dx);
        const power = Math.min(dist / this.config.maxDragDistance, 1);
        const force = this.config.minForce + (this.config.maxForce - this.config.minForce) * power;
        const speed = force / 100;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        
        const steps = 20;
        const dt = 0.03;
        const gravity = 500;
        const friction = 0.97;
        
        let px = start.x, py = start.y;
        let vx = -Math.cos(angle) * speed;
        let vy = -Math.sin(angle) * speed;
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        
        for (let i = 0; i < steps; i++) {
            px += vx * dt;
            py += vy * dt;
            vy += gravity * dt;
            vx *= friction;
            vy *= friction;
            
            if (py > 1000 || px < -100 || px > 1000) break;
            ctx.lineTo(px, py);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * Destrói o input
     */
    destroy() {
        const canvas = this.canvas;
        if (canvas) {
            for (const listener of this._listeners) {
                canvas.removeEventListener(listener.type, listener.handler);
            }
        }
        this._listeners = [];
        this.canvas = null;
        this.renderer = null;
        this.selectedDisc = null;
        this._game = null;
    }

    /**
     * @returns {Object} Estado atual do input
     */
    getState() {
        return {
            isDown: this.isDown,
            isDragging: this.isDragging,
            hasSelected: this.hasSelected,
            selectedDisc: this.selectedDisc,
            force: this.force,
            forceNormalized: this.forceNormalized,
            dragDistance: this.dragDistance,
            dragAngle: this.dragAngle,
        };
    }
}
