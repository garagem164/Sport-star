/**
 * Renderizador do campo de futebol
 * @class FieldRenderer
 */
class FieldRenderer {
    constructor(options = {}) {
        this.config = {
            width: options.width || 800,
            height: options.height || 500,
            padding: options.padding || 30,
            goalWidth: options.goalWidth || 120,
            goalDepth: options.goalDepth || 20,
            ...options
        };
        
        this.fieldWidth = this.config.width;
        this.fieldHeight = this.config.height;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.balls = [];
        this.players = [];
    }

    /**
     * Inicializa o renderizador
     */
    init() {
        // Configuração inicial
        return this;
    }

    /**
     * Redimensiona o campo
     */
    resize(canvasWidth, canvasHeight) {
        const aspect = this.config.width / this.config.height;
        const containerAspect = canvasWidth / canvasHeight;
        
        let fieldWidth, fieldHeight;
        
        if (containerAspect > aspect) {
            fieldHeight = canvasHeight - this.config.padding * 2;
            fieldWidth = fieldHeight * aspect;
        } else {
            fieldWidth = canvasWidth - this.config.padding * 2;
            fieldHeight = fieldWidth / aspect;
        }
        
        fieldWidth = Math.min(fieldWidth, canvasWidth - this.config.padding * 2);
        fieldHeight = Math.min(fieldHeight, canvasHeight - this.config.padding * 2);
        
        this.fieldWidth = fieldWidth;
        this.fieldHeight = fieldHeight;
        this.offsetX = (canvasWidth - fieldWidth) / 2;
        this.offsetY = (canvasHeight - fieldHeight) / 2;
        this.scale = fieldWidth / this.config.width;
        
        return this;
    }

    /**
     * Converte coordenadas do mundo para tela
     */
    worldToScreen(worldX, worldY) {
        return {
            x: this.offsetX + worldX * this.scale,
            y: this.offsetY + worldY * this.scale,
        };
    }

    /**
     * Converte coordenadas da tela para mundo
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale,
        };
    }

    /**
     * Renderiza o campo
     */
    render(ctx) {
        const { fieldWidth, fieldHeight, offsetX, offsetY, scale } = this;
        
        ctx.save();
        
        // Fundo do campo (gramado)
        const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX, offsetY + fieldHeight);
        gradient.addColorStop(0, '#2d7d3a');
        gradient.addColorStop(0.3, '#348a42');
        gradient.addColorStop(0.5, '#2d7d3a');
        gradient.addColorStop(0.7, '#348a42');
        gradient.addColorStop(1, '#2d7d3a');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(offsetX, offsetY, fieldWidth, fieldHeight, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Borda do campo
        const border = 2 * scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = border;
        ctx.beginPath();
        ctx.roundRect(offsetX, offsetY, fieldWidth, fieldHeight, 10);
        ctx.stroke();
        
        // Linha do meio
        const midX = offsetX + fieldWidth / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(midX, offsetY + 2);
        ctx.lineTo(midX, offsetY + fieldHeight - 2);
        ctx.stroke();
        
        // Círculo central
        const centerRadius = Math.min(fieldWidth, fieldHeight) * 0.08;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(midX, offsetY + fieldHeight / 2, centerRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ponto central
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(midX, offsetY + fieldHeight / 2, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Área grande (penalty) - esquerda
        const penaltyW = this.config.goalWidth * 1.6 * scale;
        const penaltyD = this.config.goalDepth * 2.5 * scale;
        const goalW = this.config.goalWidth * scale;
        const goalD = this.config.goalDepth * scale;
        
        // Área de penalty esquerda
        const px = offsetX + goalD * 0.5;
        const py = offsetY + (fieldHeight - penaltyW) / 2;
        this._drawArea(ctx, px, py, penaltyD, penaltyW, 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.3)');
        
        // Área de penalty direita
        const px2 = offsetX + fieldWidth - goalD * 0.5 - penaltyD;
        this._drawArea(ctx, px2, py, penaltyD, penaltyW, 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.3)');
        
        // Área pequena (goal area) - esquerda
        const goalAreaW = this.config.goalWidth * 1.2 * scale;
        const goalAreaD = this.config.goalDepth * 1.2 * scale;
        const gap = goalD * 0.3;
        
        const gax = offsetX + gap;
        const gay = offsetY + (fieldHeight - goalAreaW) / 2;
        this._drawArea(ctx, gax, gay, goalAreaD, goalAreaW, 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.4)');
        
        // Área pequena - direita
        const gax2 = offsetX + fieldWidth - gap - goalAreaD;
        this._drawArea(ctx, gax2, gay, goalAreaD, goalAreaW, 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.4)');
        
        // Goleiras
        this._drawGoal(ctx, offsetX, offsetY + (fieldHeight - goalW) / 2, goalD, goalW, true);
        this._drawGoal(ctx, offsetX + fieldWidth - goalD, offsetY + (fieldHeight - goalW) / 2, goalD, goalW, false);
        
        ctx.restore();
    }

    _drawArea(ctx, x, y, w, h, fillColor, strokeColor) {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
        ctx.stroke();
    }

    _drawGoal(ctx, x, y, depth, width, isLeft) {
        const scale = this.scale;
        const postW = 3 * scale;
        
        ctx.save();
        
        // Sombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = isLeft ? -2 : 2;
        ctx.shadowOffsetY = 2;
        
        // Fundo da goleira
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, depth, width);
        
        ctx.shadowBlur = 0;
        
        // Postes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Poste esquerdo
        ctx.fillRect(x, y, postW, width);
        // Poste direito
        ctx.fillRect(x + depth - postW, y, postW, width);
        // Travessão superior
        ctx.fillRect(x, y, depth, postW);
        // Travessão inferior
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y + width - postW, depth, postW);
        
        // Rede (linhas)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        
        const spacing = 8 * scale;
        for (let i = 0; i < depth; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + postW);
            ctx.lineTo(x + i, y + width - postW);
            ctx.stroke();
        }
        
        for (let i = 0; i < width; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(x + postW, y + i);
            ctx.lineTo(x + depth - postW, y + i);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Obtém as dimensões do campo em unidades do mundo
     */
    getWorldBounds() {
        return {
            width: this.config.width,
            height: this.config.height,
            minX: 0,
            maxX: this.config.width,
            minY: 0,
            maxY: this.config.height,
        };
    }

    /**
     * Obtém estatísticas do renderizador
     */
    getStats() {
        return {
            fieldWidth: this.fieldWidth,
            fieldHeight: this.fieldHeight,
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
        };
    }
}

// Polyfill para roundRect se não existir
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (radii || 0);
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}
