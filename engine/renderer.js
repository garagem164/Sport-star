// engine/renderer.js — Renderizador do campo de futebol com gráficos avançados
// Gramado com textura, gradiente, sombras, linhas, área, círculo central,
// goleiras, bordas arredondadas e iluminação
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO CAMPO
    // ============================================================
    const FieldConfig = {
        // Dimensões do campo (em unidades de jogo)
        width: 800,
        height: 500,
        
        // Margens (padding)
        padding: 40,
        
        // Cores do gramado
        grassColors: {
            primary: '#2d7d3a',
            secondary: '#348a42',
            stripe: '#2a7536',
            dark: '#1e5a2a',
            light: '#3a8f48',
        },
        
        // Cores das linhas
        lineColors: {
            main: 'rgba(255, 255, 255, 0.85)',
            secondary: 'rgba(255, 255, 255, 0.5)',
            shadow: 'rgba(0, 0, 0, 0.15)',
        },
        
        // Configuração das goleiras
        goal: {
            width: 120,
            depth: 20,
            color: '#ffffff',
            shadow: 'rgba(0, 0, 0, 0.3)',
        },
        
        // Iluminação
        lighting: {
            angle: 0.3, // Ângulo da luz (radianos)
            intensity: 0.15,
            color: 'rgba(255, 240, 200, 0.08)',
        },
    };

    // ============================================================
    // 2. RENDERIZADOR PRINCIPAL
    // ============================================================
    class FieldRenderer {
        constructor(options = {}) {
            // Configuração
            this.config = {
                ...FieldConfig,
                ...options,
            };

            // Cache para otimização
            this._cache = {
                grassPattern: null,
                shadowMap: null,
                gradients: {},
            };

            // Estado
            this.width = 0;
            this.height = 0;
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.fieldX = 0;
            this.fieldY = 0;
            this.fieldWidth = 0;
            this.fieldHeight = 0;

            // Objetos do jogo (para desenhar)
            this.balls = [];
            this.players = [];
            this.particles = [];
        }

        // ============================================================
        // 3. CONFIGURAÇÃO E REDIMENSIONAMENTO
        // ============================================================

        resize(canvasWidth, canvasHeight) {
            const fieldAspect = this.config.width / this.config.height;
            const canvasAspect = canvasWidth / canvasHeight;

            let fieldWidth, fieldHeight;

            if (canvasAspect > fieldAspect) {
                fieldHeight = canvasHeight - this.config.padding * 2;
                fieldWidth = fieldHeight * fieldAspect;
            } else {
                fieldWidth = canvasWidth - this.config.padding * 2;
                fieldHeight = fieldWidth / fieldAspect;
            }

            // Garante que o campo não ultrapasse os limites
            fieldWidth = Math.min(fieldWidth, canvasWidth - this.config.padding * 2);
            fieldHeight = Math.min(fieldHeight, canvasHeight - this.config.padding * 2);

            this.fieldWidth = fieldWidth;
            this.fieldHeight = fieldHeight;
            this.fieldX = (canvasWidth - fieldWidth) / 2;
            this.fieldY = (canvasHeight - fieldHeight) / 2;
            this.scale = fieldWidth / this.config.width;
            this.width = canvasWidth;
            this.height = canvasHeight;

            // Limpa cache de texturas
            this._cache.grassPattern = null;
            this._cache.shadowMap = null;
            this._cache.gradients = {};

            return this;
        }

        // ============================================================
        // 4. MÉTODOS DE UTILIDADE (conversão de coordenadas)
        // ============================================================

        worldToScreen(worldX, worldY) {
            return {
                x: this.fieldX + worldX * this.scale,
                y: this.fieldY + worldY * this.scale,
            };
        }

        screenToWorld(screenX, screenY) {
            return {
                x: (screenX - this.fieldX) / this.scale,
                y: (screenY - this.fieldY) / this.scale,
            };
        }

        // ============================================================
        // 5. RENDERIZAÇÃO COMPLETA
        // ============================================================

        render(ctx) {
            if (!ctx) return;

            // 1. Fundo (escuro para contraste)
            this._renderBackground(ctx);

            // 2. Gramado com textura e gradiente
            this._renderGrass(ctx);

            // 3. Sombras do campo
            this._renderFieldShadows(ctx);

            // 4. Linhas do campo
            this._renderFieldLines(ctx);

            // 5. Áreas (grande e pequena)
            this._renderAreas(ctx);

            // 6. Círculo central
            this._renderCenterCircle(ctx);

            // 7. Goleiras
            this._renderGoals(ctx);

            // 8. Iluminação (efeito de luz)
            this._renderLighting(ctx);

            // 9. Borda arredondada
            this._renderRoundedBorder(ctx);

            // 10. Partículas/efeitos (opcional)
            this._renderParticles(ctx);
        }

        // ============================================================
        // 6. RENDERIZAÇÃO DO FUNDO
        // ============================================================

        _renderBackground(ctx) {
            // Gradiente radial para fundo
            const gradient = ctx.createRadialGradient(
                this.width / 2, this.height / 2, 0,
                this.width / 2, this.height / 2, Math.max(this.width, this.height)
            );
            gradient.addColorStop(0, '#1a2a1a');
            gradient.addColorStop(0.5, '#0d1a0d');
            gradient.addColorStop(1, '#050a05');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.width, this.height);

            // Vignette sutil
            const vignette = ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.fieldWidth * 0.3,
                this.width / 2, this.height / 2, this.fieldWidth * 0.9
            );
            vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // ============================================================
        // 7. RENDERIZAÇÃO DO GRAMADO
        // ============================================================

        _renderGrass(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight, scale } = this;
            const config = this.config;

            // Cria pattern de grama se não existir
            if (!this._cache.grassPattern) {
                this._cache.grassPattern = this._createGrassPattern();
            }

            // Gradiente base do gramado
            const gradient = ctx.createLinearGradient(
                fieldX, fieldY,
                fieldX, fieldY + fieldHeight
            );

            // Listras do campo (efeito de gramado cortado)
            const stripeHeight = fieldHeight / 8;
            for (let i = 0; i < 8; i++) {
                const y = fieldY + i * stripeHeight;
                const t = i / 8;
                const color = t % 2 < 0.5 ? 
                    config.grassColors.primary : 
                    config.grassColors.secondary;
                gradient.addColorStop(t, color);
                gradient.addColorStop(t + 0.125, color);
            }

            // Preenche o fundo com o gradiente
            ctx.fillStyle = gradient;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);

            // Aplica textura de grama (pattern)
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = this._cache.grassPattern;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);
            ctx.restore();

            // Destaque central (gradiente radial sutil)
            const centerX = fieldX + fieldWidth / 2;
            const centerY = fieldY + fieldHeight / 2;
            const glow = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, fieldWidth * 0.6
            );
            glow.addColorStop(0, 'rgba(80, 180, 80, 0.06)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = glow;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);
        }

        // ============================================================
        // 8. CRIAÇÃO DA TEXTURA DE GRAMA
        // ============================================================

        _createGrassPattern() {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Fundo transparente
            ctx.clearRect(0, 0, size, size);

            // Desenha "folhas" de grama
            const colors = [
                'rgba(45, 125, 58, 0.6)',
                'rgba(52, 138, 66, 0.5)',
                'rgba(60, 150, 75, 0.4)',
                'rgba(40, 110, 50, 0.7)',
            ];

            for (let i = 0; i < 300; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const height = 2 + Math.random() * 6;
                const width = 0.5 + Math.random() * 1.5;
                const angle = (Math.random() - 0.5) * 0.8;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3 + Math.random() * 0.4;

                // Folha de grama
                ctx.beginPath();
                ctx.moveTo(-width / 2, 0);
                ctx.quadraticCurveTo(0, -height * 0.7, width / 2, 0);
                ctx.fill();

                ctx.restore();
            }

            // Pequenas manchas de solo
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = 1 + Math.random() * 3;
                ctx.fillStyle = `rgba(30, 70, 30, ${0.05 + Math.random() * 0.1})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }

            const pattern = ctx.createPattern(canvas, 'repeat');
            return pattern;
        }

        // ============================================================
        // 9. SOMBRAS DO CAMPO
        // ============================================================

        _renderFieldShadows(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight } = this;

            // Sombra nas bordas do campo
            const shadow = ctx.createRadialGradient(
                fieldX + fieldWidth / 2, fieldY + fieldHeight / 2, fieldWidth * 0.3,
                fieldX + fieldWidth / 2, fieldY + fieldHeight / 2, fieldWidth * 0.7
            );
            shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            shadow.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
            shadow.addColorStop(0.85, 'rgba(0, 0, 0, 0.05)');
            shadow.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

            ctx.fillStyle = shadow;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);
        }

        // ============================================================
        // 10. LINHAS DO CAMPO
        // ============================================================

        _renderFieldLines(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight, scale } = this;
            const config = this.config;
            const lineColor = config.lineColors.main;
            const shadowColor = config.lineColors.shadow;

            // Função auxiliar para desenhar linha com sombra
            const drawLine = (x1, y1, x2, y2, width, color = lineColor, shadow = true) => {
                ctx.save();
                
                if (shadow) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                }

                ctx.strokeStyle = color;
                ctx.lineWidth = width * scale;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                ctx.restore();
            };

            // Linhas principais (bordas do campo)
            const padding = 0;
            drawLine(
                fieldX + padding, fieldY + padding,
                fieldX + fieldWidth - padding, fieldY + padding,
                2, lineColor
            );
            drawLine(
                fieldX + fieldWidth - padding, fieldY + padding,
                fieldX + fieldWidth - padding, fieldY + fieldHeight - padding,
                2, lineColor
            );
            drawLine(
                fieldX + fieldWidth - padding, fieldY + fieldHeight - padding,
                fieldX + padding, fieldY + fieldHeight - padding,
                2, lineColor
            );
            drawLine(
                fieldX + padding, fieldY + fieldHeight - padding,
                fieldX + padding, fieldY + padding,
                2, lineColor
            );

            // Linha do meio
            const midX = fieldX + fieldWidth / 2;
            drawLine(
                midX, fieldY + padding,
                midX, fieldY + fieldHeight - padding,
                2, lineColor
            );

            // Linha central (meio do campo)
            drawLine(
                fieldX + padding, fieldY + fieldHeight / 2,
                fieldX + fieldWidth - padding, fieldY + fieldHeight / 2,
                1.5, config.lineColors.secondary
            );
        }

        // ============================================================
        // 11. ÁREAS (GRANDE E PEQUENA)
        // ============================================================

        _renderAreas(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight, scale } = this;
            const config = this.config;

            // Dimensões das áreas (em unidades de jogo)
            const goalWidth = config.goal.width;
            const goalDepth = config.goal.depth;
            const penaltyWidth = goalWidth * 1.6;
            const penaltyDepth = goalDepth * 2.5;
            const goalAreaWidth = goalWidth * 1.2;
            const goalAreaDepth = goalDepth * 1.2;

            // Função auxiliar para desenhar área retangular
            const drawArea = (x, y, w, h, isGoalArea = false) => {
                const color = isGoalArea ? 
                    'rgba(255, 255, 255, 0.4)' : 
                    'rgba(255, 255, 255, 0.25)';
                const borderColor = isGoalArea ? 
                    'rgba(255, 255, 255, 0.7)' : 
                    'rgba(255, 255, 255, 0.5)';

                ctx.save();
                
                // Preenchimento
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);

                // Borda
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1.5 * scale;
                ctx.strokeRect(x, y, w, h);

                ctx.restore();
            };

            // Área grande (penalty) - lado esquerdo
            const penaltyX = fieldX + goalDepth * scale;
            const penaltyY = fieldY + (fieldHeight - penaltyWidth * scale) / 2;
            drawArea(
                penaltyX, penaltyY,
                penaltyDepth * scale, penaltyWidth * scale,
                false
            );

            // Área grande (penalty) - lado direito
            const penaltyX2 = fieldX + fieldWidth - goalDepth * scale - penaltyDepth * scale;
            drawArea(
                penaltyX2, penaltyY,
                penaltyDepth * scale, penaltyWidth * scale,
                false
            );

            // Área pequena (goal area) - lado esquerdo
            const goalAreaX = fieldX + goalDepth * scale * 0.3;
            const goalAreaY = fieldY + (fieldHeight - goalAreaWidth * scale) / 2;
            drawArea(
                goalAreaX, goalAreaY,
                goalAreaDepth * scale, goalAreaWidth * scale,
                true
            );

            // Área pequena (goal area) - lado direito
            const goalAreaX2 = fieldX + fieldWidth - goalDepth * scale * 0.3 - goalAreaDepth * scale;
            drawArea(
                goalAreaX2, goalAreaY,
                goalAreaDepth * scale, goalAreaWidth * scale,
                true
            );
        }

        // ============================================================
        // 12. CÍRCULO CENTRAL
        // ============================================================

        _renderCenterCircle(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight, scale } = this;
            const config = this.config;
            const centerX = fieldX + fieldWidth / 2;
            const centerY = fieldY + fieldHeight / 2;
            const radius = Math.min(fieldWidth, fieldHeight) * 0.08;

            ctx.save();

            // Sombra do círculo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Círculo central
            ctx.strokeStyle = config.lineColors.main;
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Ponto central
            ctx.shadowBlur = 15;
            ctx.fillStyle = config.lineColors.main;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Marcação do círculo central (traços decorativos)
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1 * scale;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r1 = radius * 0.85;
                const r2 = radius * 0.95;
                const x1 = centerX + Math.cos(angle) * r1;
                const y1 = centerY + Math.sin(angle) * r1;
                const x2 = centerX + Math.cos(angle) * r2;
                const y2 = centerY + Math.sin(angle) * r2;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ============================================================
        // 13. GOLEIRAS
        // ============================================================

        _renderGoals(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight, scale } = this;
            const config = this.config;
            const goalWidth = config.goal.width * scale;
            const goalDepth = config.goal.depth * scale;
            const goalHeight = goalWidth * 0.35;

            // Posição das goleiras
            const goalY = fieldY + (fieldHeight - goalWidth) / 2;

            // Goleira esquerda
            this._renderSingleGoal(ctx,
                fieldX, goalY,
                goalDepth, goalWidth, goalHeight,
                true
            );

            // Goleira direita
            this._renderSingleGoal(ctx,
                fieldX + fieldWidth - goalDepth, goalY,
                goalDepth, goalWidth, goalHeight,
                false
            );
        }

        _renderSingleGoal(ctx, x, y, depth, width, height, isLeft) {
            ctx.save();

            const color = this.config.goal.color;
            const shadow = this.config.goal.shadow;

            // Sombra da goleira
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = isLeft ? -5 : 5;
            ctx.shadowOffsetY = 5;

            // Corpo da goleira (trapézio 3D)
            const gradient = ctx.createLinearGradient(
                x, y,
                x + depth, y
            );
            gradient.addColorStop(0, 'rgba(200, 200, 200, 0.5)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(200, 200, 200, 0.3)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, depth, width);

            // Traves
            const postWidth = 3 * this.scale;
            const crossbarY = y + height;

            // Postes verticais
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            
            // Poste esquerdo
            ctx.fillRect(x, y, postWidth, width);
            // Poste direito
            ctx.fillRect(x + depth - postWidth, y, postWidth, width);
            
            // Travessão (parte de cima)
            ctx.fillRect(x, y, depth, postWidth);
            
            // Travessão (parte de baixo - linha do chão)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x, y + width - postWidth, depth, postWidth);

            // Rede (efeito visual)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 0.5 * this.scale;
            
            // Linhas verticais da rede
            const netSpacing = 8 * this.scale;
            for (let i = 0; i < depth; i += netSpacing) {
                const nx = x + i;
                ctx.beginPath();
                ctx.moveTo(nx, y + postWidth);
                ctx.lineTo(nx, y + width - postWidth);
                ctx.stroke();
            }

            // Linhas horizontais da rede
            for (let i = 0; i < width; i += netSpacing) {
                const ny = y + i;
                ctx.beginPath();
                ctx.moveTo(x + postWidth, ny);
                ctx.lineTo(x + depth - postWidth, ny);
                ctx.stroke();
            }

            // Brilho/reflexo na goleira
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            const glowX = isLeft ? x + depth * 0.7 : x + depth * 0.3;
            const glow = ctx.createRadialGradient(
                glowX, y + width / 2, 0,
                glowX, y + width / 2, depth
            );
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x, y, depth, width);

            ctx.restore();
        }

        // ============================================================
        // 14. ILUMINAÇÃO
        // ============================================================

        _renderLighting(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight } = this;
            const config = this.config;
            const lighting = config.lighting;

            // Efeito de luz direcional
            const angle = lighting.angle;
            const intensity = lighting.intensity;
            const color = lighting.color;

            // Cria gradiente de luz
            const cx = fieldX + fieldWidth / 2 + Math.cos(angle) * fieldWidth * 0.3;
            const cy = fieldY + fieldHeight / 2 + Math.sin(angle) * fieldHeight * 0.3;
            
            const gradient = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, Math.max(fieldWidth, fieldHeight) * 0.8
            );
            
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.3, 'rgba(255, 240, 200, 0.03)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');

            ctx.fillStyle = gradient;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);

            // Reflexos de luz (specular highlights)
            ctx.save();
            ctx.globalAlpha = 0.02;
            const highlightX = fieldX + fieldWidth * 0.3;
            const highlightY = fieldY + fieldHeight * 0.3;
            const highlight = ctx.createRadialGradient(
                highlightX, highlightY, 0,
                highlightX, highlightY, fieldWidth * 0.4
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);
            ctx.restore();
        }

        // ============================================================
        // 15. BORDA ARREDONDADA
        // ============================================================

        _renderRoundedBorder(ctx) {
            const { fieldX, fieldY, fieldWidth, fieldHeight } = this;
            const radius = 8 * this.scale;

            ctx.save();

            // Sombra da borda
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Borda externa (estilo moderno)
            const gradient = ctx.createLinearGradient(
                fieldX, fieldY,
                fieldX + fieldWidth, fieldY + fieldHeight
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2 * this.scale;
            
            // Desenha retângulo arredondado
            this._roundRect(ctx, fieldX, fieldY, fieldWidth, fieldHeight, radius);
            ctx.stroke();

            // Borda interna (brilho)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 4 * this.scale;
            this._roundRect(ctx, fieldX + 3, fieldY + 3, fieldWidth - 6, fieldHeight - 6, radius - 2);
            ctx.stroke();

            ctx.restore();
        }

        _roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        // ============================================================
        // 16. PARTÍCULAS E EFEITOS
        // ============================================================

        _renderParticles(ctx) {
            // Placeholder para partículas (futuro)
            // Pequenos brilhos no campo
            ctx.save();
            ctx.globalAlpha = 0.2;
            
            const time = Date.now() / 10000;
            const { fieldX, fieldY, fieldWidth, fieldHeight } = this;
            
            for (let i = 0; i < 15; i++) {
                const seed = i * 137.508;
                const x = fieldX + (Math.sin(seed + time) * 0.5 + 0.5) * fieldWidth;
                const y = fieldY + (Math.cos(seed * 1.3 + time * 0.7) * 0.5 + 0.5) * fieldHeight;
                const size = 1 + Math.sin(seed + time * 2) * 0.5 + 0.5;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }

        // ============================================================
        // 17. RENDERIZAÇÃO DE OBJETOS DO JOGO
        // ============================================================

        renderObjects(ctx) {
            // Desenha jogadores
            for (const player of this.players) {
                this.renderPlayer(ctx, player);
            }

            // Desenha bolas
            for (const ball of this.balls) {
                this.renderBall(ctx, ball);
            }
        }

        renderPlayer(ctx, player) {
            if (!player || !player.position) return;

            const pos = this.worldToScreen(player.position.x, player.position.y);
            const radius = (player.radius || 15) * this.scale;

            ctx.save();

            // Sombra do jogador
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 3;

            // Corpo do jogador (círculo)
            const gradient = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
                pos.x, pos.y, radius
            );
            gradient.addColorStop(0, player.color || '#4a90d9');
            gradient.addColorStop(0.7, player.color || '#2c6ba0');
            gradient.addColorStop(1, (player.color || '#1a4a6e'));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Brilho no jogador
            ctx.shadowBlur = 0;
            const highlight = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
                pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.5
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Número ou identificador
            if (player.number) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${radius * 0.8}px system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(player.number, pos.x, pos.y + 1);
            }

            ctx.restore();
        }

        renderBall(ctx, ball) {
            if (!ball || !ball.position) return;

            const pos = this.worldToScreen(ball.position.x, ball.position.y);
            const radius = (ball.radius || 8) * this.scale;

            ctx.save();

            // Sombra da bola
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 4;

            // Corpo da bola (gradiente 3D)
            const gradient = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
                pos.x, pos.y, radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#f0f0f0');
            gradient.addColorStop(0.7, '#e0e0e0');
            gradient.addColorStop(1, '#b0b0b0');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Padrão da bola (hexágonos simplificados)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 0.5 * this.scale;

            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + ball.rotation || 0;
                const x1 = pos.x + Math.cos(angle) * radius * 0.5;
                const y1 = pos.y + Math.sin(angle) * radius * 0.5;
                const x2 = pos.x + Math.cos(angle + Math.PI / 6) * radius * 0.7;
                const y2 = pos.y + Math.sin(angle + Math.PI / 6) * radius * 0.7;
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(x1, y1);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Brilho da bola
            const highlight = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.4, 0,
                pos.x - radius * 0.3, pos.y - radius * 0.4, radius * 0.4
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // ============================================================
        // 18. RESET E LIMPEZA
        // ============================================================

        reset() {
            this.balls = [];
            this.players = [];
            this.particles = [];
            this._cache.grassPattern = null;
            this._cache.shadowMap = null;
            this._cache.gradients = {};
            return this;
        }

        // ============================================================
        // 19. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                width: this.width,
                height: this.height,
                fieldWidth: this.fieldWidth,
                fieldHeight: this.fieldHeight,
                scale: this.scale,
                balls: this.balls.length,
                players: this.players.length,
                particles: this.particles.length,
            };
        }
    }

    // ============================================================
    // 20. EXPORTAÇÃO
    // ============================================================

    const Renderer = {
        FieldRenderer: FieldRenderer,
        FieldConfig: FieldConfig,
        
        createRenderer: (options) => new FieldRenderer(options),
    };

    // ============================================================
    // 21. EXPORTA PARA O GLOBAL
    // ============================================================

    global.Renderer = Renderer;
    global.FieldRenderer = FieldRenderer;

    console.log('[Renderer] Módulo de renderização carregado.');

})(typeof window !== 'undefined' ? window : this);
