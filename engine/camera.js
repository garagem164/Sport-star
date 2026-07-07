// engine/camera.js — Sistema de câmera com zoom, movimento suave e responsivo
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DA CÂMERA
    // ============================================================
    const CameraConfig = {
        // Zoom
        minZoom: 0.3,
        maxZoom: 2.0,
        defaultZoom: 1.0,
        zoomSpeed: 0.01,
        zoomSmoothFactor: 0.12,

        // Movimento
        smoothFactor: 0.08,
        maxSpeed: 800,
        deceleration: 0.92,

        // Limites
        bounds: {
            minX: -100,
            maxX: 900,
            minY: -100,
            maxY: 600,
        },

        // Shake
        shakeIntensity: 0,
        shakeDecay: 0.9,
        shakeMaxIntensity: 20,

        // Responsivo
        aspectRatio: 1.6,
        fitMode: 'contain', // 'contain', 'cover', 'fill'

        // Automático
        autoCenter: true,
        autoZoom: true,
        targetPadding: 50,
    };

    // ============================================================
    // 2. CLASSE CÂMERA
    // ============================================================
    class Camera {
        constructor(options = {}) {
            this.config = { ...CameraConfig, ...options };

            // Posição da câmera (mundo)
            this.targetX = 0;
            this.targetY = 0;
            this.x = 0;
            this.y = 0;

            // Zoom
            this.targetZoom = this.config.defaultZoom;
            this.zoom = this.config.defaultZoom;

            // Velocidade
            this.vx = 0;
            this.vy = 0;

            // Dimensões da tela
            this.screenWidth = 0;
            this.screenHeight = 0;

            // Shake
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;

            // Estado
            this.isMoving = false;
            this.isZooming = false;
            this._lastTime = 0;

            // Alvos para centralização automática
            this.targets = [];
            this.focusTarget = null;

            // Limites
            this.bounds = { ...this.config.bounds };

            // Callbacks
            this.onMove = null;
            this.onZoom = null;

            // Bind
            this._update = this._update.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(screenWidth, screenHeight) {
            this.screenWidth = screenWidth;
            this.screenHeight = screenHeight;
            this._updateAspectRatio();
            return this;
        }

        resize(screenWidth, screenHeight) {
            this.screenWidth = screenWidth;
            this.screenHeight = screenHeight;
            this._updateAspectRatio();
            return this;
        }

        // ============================================================
        // 4. ATUALIZAÇÃO
        // ============================================================

        update(deltaTime) {
            if (!deltaTime) deltaTime = 1/60;
            this._lastTime += deltaTime;

            // Centralização automática
            if (this.config.autoCenter && this.targets.length > 0) {
                this._updateAutoCenter();
            }

            // Zoom automático
            if (this.config.autoZoom && this.targets.length > 0) {
                this._updateAutoZoom();
            }

            // Movimento suave (interpolação)
            const smoothFactor = this.config.smoothFactor;
            const zoomSmooth = this.config.zoomSmoothFactor;

            // Posição
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;

            // Velocidade para movimento suave
            this.vx += dx * smoothFactor * deltaTime * 60;
            this.vy += dy * smoothFactor * deltaTime * 60;

            // Amortecimento
            this.vx *= Math.pow(this.config.deceleration, deltaTime * 60);
            this.vy *= Math.pow(this.config.deceleration, deltaTime * 60);

            // Limita velocidade
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > this.config.maxSpeed) {
                this.vx = (this.vx / speed) * this.config.maxSpeed;
                this.vy = (this.vy / speed) * this.config.maxSpeed;
            }

            // Aplica movimento
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Zoom suave
            const zoomDiff = this.targetZoom - this.zoom;
            this.zoom += zoomDiff * zoomSmooth;

            // Aplica limites de zoom
            this.zoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, this.zoom));

            // Shake
            if (this.shakeIntensity > 0.01) {
                const intensity = this.shakeIntensity * this.zoom;
                this.shakeX = (Math.random() - 0.5) * intensity * 2;
                this.shakeY = (Math.random() - 0.5) * intensity * 2;
                this.shakeIntensity *= this.config.shakeDecay;
            } else {
                this.shakeX = 0;
                this.shakeY = 0;
                this.shakeIntensity = 0;
            }

            // Verifica se está em movimento
            this.isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1;
            this.isZooming = Math.abs(zoomDiff) > 0.001;

            // Notifica movimento
            if (this.isMoving && this.onMove) {
                this.onMove({ x: this.x, y: this.y, vx: this.vx, vy: this.vy });
            }
            if (this.isZooming && this.onZoom) {
                this.onZoom({ zoom: this.zoom, targetZoom: this.targetZoom });
            }

            // Aplica limites
            this._applyBounds();
        }

        // ============================================================
        // 5. CENTRALIZAÇÃO AUTOMÁTICA
        // ============================================================

        _updateAutoCenter() {
            if (this.targets.length === 0) return;

            // Calcula centro dos alvos
            let cx = 0, cy = 0;
            let count = 0;

            for (const target of this.targets) {
                if (target && target.position) {
                    cx += target.position.x;
                    cy += target.position.y;
                    count++;
                } else if (target && target.x !== undefined && target.y !== undefined) {
                    cx += target.x;
                    cy += target.y;
                    count++;
                }
            }

            if (count > 0) {
                cx /= count;
                cy /= count;

                // Se tem foco, usa o alvo focado
                if (this.focusTarget) {
                    if (this.focusTarget.position) {
                        cx = this.focusTarget.position.x;
                        cy = this.focusTarget.position.y;
                    } else if (this.focusTarget.x !== undefined) {
                        cx = this.focusTarget.x;
                        cy = this.focusTarget.y;
                    }
                }

                this.targetX = cx;
                this.targetY = cy;
            }
        }

        // ============================================================
        // 6. ZOOM AUTOMÁTICO
        // ============================================================

        _updateAutoZoom() {
            if (this.targets.length < 2) {
                // Com apenas um alvo, mantém zoom padrão
                this.targetZoom = this.config.defaultZoom;
                return;
            }

            // Calcula a distância entre os alvos mais distantes
            let maxDist = 0;
            const positions = [];

            for (const target of this.targets) {
                let pos = null;
                if (target && target.position) {
                    pos = target.position;
                } else if (target && target.x !== undefined) {
                    pos = { x: target.x, y: target.y };
                }
                if (pos) {
                    positions.push(pos);
                }
            }

            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[i].x - positions[j].x;
                    const dy = positions[i].y - positions[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxDist) {
                        maxDist = dist;
                    }
                }
            }

            // Calcula zoom baseado na distância
            if (maxDist > 0) {
                const padding = this.config.targetPadding * 2;
                const worldWidth = this.getWorldWidth();
                const worldHeight = this.getWorldHeight();
                const minWorldDim = Math.min(worldWidth, worldHeight);

                const targetZoom = (minWorldDim / (maxDist + padding));
                this.targetZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, targetZoom));
            }
        }

        // ============================================================
        // 7. APLICAÇÃO DE LIMITES
        // ============================================================

        _applyBounds() {
            const halfWidth = this.getWorldWidth() / 2;
            const halfHeight = this.getWorldHeight() / 2;

            const minX = this.bounds.minX + halfWidth;
            const maxX = this.bounds.maxX - halfWidth;
            const minY = this.bounds.minY + halfHeight;
            const maxY = this.bounds.maxY - halfHeight;

            this.x = Math.max(minX, Math.min(maxX, this.x));
            this.y = Math.max(minY, Math.min(maxY, this.y));

            // Sincroniza target com posição atual se estiver nos limites
            if (this.x >= minX && this.x <= maxX) {
                this.targetX = this.x;
            }
            if (this.y >= minY && this.y <= maxY) {
                this.targetY = this.y;
            }
        }

        // ============================================================
        // 8. ASPECTO RATIO
        // ============================================================

        _updateAspectRatio() {
            if (this.screenWidth === 0 || this.screenHeight === 0) return;

            const screenRatio = this.screenWidth / this.screenHeight;
            const targetRatio = this.config.aspectRatio;

            if (this.config.fitMode === 'contain') {
                if (screenRatio > targetRatio) {
                    // Tela mais larga
                    this._worldWidth = this.screenHeight * targetRatio;
                    this._worldHeight = this.screenHeight;
                } else {
                    this._worldWidth = this.screenWidth;
                    this._worldHeight = this.screenWidth / targetRatio;
                }
            } else if (this.config.fitMode === 'cover') {
                if (screenRatio > targetRatio) {
                    this._worldWidth = this.screenWidth;
                    this._worldHeight = this.screenWidth / targetRatio;
                } else {
                    this._worldWidth = this.screenHeight * targetRatio;
                    this._worldHeight = this.screenHeight;
                }
            } else {
                // Fill
                this._worldWidth = this.screenWidth;
                this._worldHeight = this.screenHeight;
            }
        }

        // ============================================================
        // 9. CONVERSÃO DE COORDENADAS
        // ============================================================

        worldToScreen(worldX, worldY) {
            const halfWidth = this.getWorldWidth() / 2;
            const halfHeight = this.getWorldHeight() / 2;

            const screenX = (worldX - this.x + halfWidth) / this.zoom;
            const screenY = (worldY - this.y + halfHeight) / this.zoom;

            return {
                x: screenX + this.shakeX,
                y: screenY + this.shakeY,
            };
        }

        screenToWorld(screenX, screenY) {
            const halfWidth = this.getWorldWidth() / 2;
            const halfHeight = this.getWorldHeight() / 2;

            const worldX = (screenX - this.shakeX) * this.zoom + this.x - halfWidth;
            const worldY = (screenY - this.shakeY) * this.zoom + this.y - halfHeight;

            return {
                x: worldX,
                y: worldY,
            };
        }

        // ============================================================
        // 10. MÉTODOS DE CONTROLE
        // ============================================================

        moveTo(x, y, instant = false) {
            this.targetX = x;
            this.targetY = y;

            if (instant) {
                this.x = x;
                this.y = y;
                this.vx = 0;
                this.vy = 0;
            }

            return this;
        }

        moveBy(dx, dy, instant = false) {
            this.targetX += dx;
            this.targetY += dy;

            if (instant) {
                this.x += dx;
                this.y += dy;
                this.vx = 0;
                this.vy = 0;
            }

            return this;
        }

        setZoom(zoom, instant = false) {
            this.targetZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));

            if (instant) {
                this.zoom = this.targetZoom;
            }

            return this;
        }

        zoomIn(amount = 0.1) {
            this.targetZoom = Math.min(this.config.maxZoom, this.targetZoom + amount);
            return this;
        }

        zoomOut(amount = 0.1) {
            this.targetZoom = Math.max(this.config.minZoom, this.targetZoom - amount);
            return this;
        }

        // ============================================================
        // 11. SHAKE
        // ============================================================

        shake(intensity, duration = 0.5) {
            this.shakeIntensity = Math.min(intensity, this.config.shakeMaxIntensity);
            return this;
        }

        // ============================================================
        // 12. ALVOS
        // ============================================================

        addTarget(target) {
            if (!this.targets.includes(target)) {
                this.targets.push(target);
            }
            return this;
        }

        removeTarget(target) {
            const index = this.targets.indexOf(target);
            if (index !== -1) {
                this.targets.splice(index, 1);
            }
            return this;
        }

        clearTargets() {
            this.targets = [];
            return this;
        }

        setFocusTarget(target) {
            this.focusTarget = target;
            return this;
        }

        // ============================================================
        // 13. GETTERS
        // ============================================================

        getWorldWidth() {
            return this._worldWidth || this.screenWidth;
        }

        getWorldHeight() {
            return this._worldHeight || this.screenHeight;
        }

        getViewport() {
            const halfWidth = this.getWorldWidth() / 2;
            const halfHeight = this.getWorldHeight() / 2;

            return {
                minX: this.x - halfWidth,
                maxX: this.x + halfWidth,
                minY: this.y - halfHeight,
                maxY: this.y + halfHeight,
            };
        }

        getState() {
            return {
                x: this.x,
                y: this.y,
                targetX: this.targetX,
                targetY: this.targetY,
                zoom: this.zoom,
                targetZoom: this.targetZoom,
                vx: this.vx,
                vy: this.vy,
                isMoving: this.isMoving,
                isZooming: this.isZooming,
                shakeIntensity: this.shakeIntensity,
                targets: this.targets.length,
                screenWidth: this.screenWidth,
                screenHeight: this.screenHeight,
                worldWidth: this.getWorldWidth(),
                worldHeight: this.getWorldHeight(),
            };
        }

        // ============================================================
        // 14. RENDERIZAÇÃO (debug)
        // ============================================================

        render(ctx) {
            if (!ctx) return;

            const viewport = this.getViewport();

            ctx.save();

            // Desenha bordas da viewport
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                viewport.minX,
                viewport.minY,
                viewport.maxX - viewport.minX,
                viewport.maxY - viewport.minY
            );
            ctx.setLineDash([]);

            // Desenha centro
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const state = this.getState();
            ctx.fillText(`Zoom: ${state.zoom.toFixed(2)}`, 10, 10);
            ctx.fillText(`Pos: (${state.x.toFixed(0)}, ${state.y.toFixed(0)})`, 10, 25);
            ctx.fillText(`Targets: ${state.targets}`, 10, 40);

            ctx.restore();
        }
    }

    // ============================================================
    // 15. EXPORTAÇÃO
    // ============================================================

    const CameraModule = {
        Config: CameraConfig,
        Camera: Camera,

        create: (options) => new Camera(options),
    };

    // ============================================================
    // 16. EXPORTA PARA O GLOBAL
    // ============================================================

    global.CameraModule = CameraModule;
    global.Camera = Camera;

    console.log('[Camera] Módulo de câmera carregado.');

})(typeof window !== 'undefined' ? window : this);
