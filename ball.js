// engine/ball.js — Bola premium com rotação, sombra, reflexo, brilho e movimento suave
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DA BOLA
    // ============================================================
    const BallConfig = {
        // Cores da bola
        colors: {
            primary: '#F5F5F5',
            secondary: '#E8E8E8',
            dark: '#CCCCCC',
            shadow: 'rgba(0, 0, 0, 0.25)',
            glow: 'rgba(255, 255, 255, 0.15)',
            panel: '#D0D0D0',
            panelDark: '#B0B0B0',
            accent: '#2C3E50',
        },

        // Tamanhos
        sizes: {
            small: 6,
            medium: 10,
            large: 14,
            xlarge: 18,
        },

        // Efeitos
        effects: {
            shadowBlur: 25,
            shadowOffset: 4,
            reflectionIntensity: 0.7,
            specularIntensity: 0.8,
            glowIntensity: 0.3,
            rotationSpeed: 2.0,
            smoothFactor: 0.92,
        },

        // Padrão da bola (hexágonos)
        pattern: {
            panels: 12, // Número de painéis
            stitchColor: 'rgba(60, 60, 60, 0.2)',
            stitchWidth: 1,
        },
    };

    // ============================================================
    // 2. CLASSE BOLA
    // ============================================================
    class Ball {
        constructor(options = {}) {
            // Posição e movimento
            this.position = options.position || new Vec2(0, 0);
            this.velocity = options.velocity || new Vec2(0, 0);
            this.radius = options.radius || BallConfig.sizes.medium;
            this.mass = options.mass || 0.5;

            // Identidade
            this.id = Ball._nextId++;
            this.label = options.label || '';

            // Cores personalizadas
            this.colors = {
                primary: options.primaryColor || BallConfig.colors.primary,
                secondary: options.secondaryColor || BallConfig.colors.secondary,
                dark: options.darkColor || BallConfig.colors.dark,
                shadow: options.shadowColor || BallConfig.colors.shadow,
                glow: options.glowColor || BallConfig.colors.glow,
                panel: options.panelColor || BallConfig.colors.panel,
                panelDark: options.panelDarkColor || BallConfig.colors.panelDark,
                accent: options.accentColor || BallConfig.colors.accent,
            };

            // Estado de animação
            this.rotation = options.rotation || 0;
            this.rotationSpeed = options.rotationSpeed || BallConfig.effects.rotationSpeed;
            this.pulsePhase = Math.random() * Math.PI * 2;

            // Propriedades físicas
            this.friction = options.friction || 0.985;
            this.restitution = options.restitution || 0.9;
            this.isStatic = options.isStatic || false;
            this.isKinematic = options.isKinematic || false;

            // Efeitos visuais
            this.shadowBlur = options.shadowBlur || BallConfig.effects.shadowBlur;
            this.reflectionIntensity = options.reflectionIntensity || BallConfig.effects.reflectionIntensity;
            this.specularIntensity = options.specularIntensity || BallConfig.effects.specularIntensity;
            this.glowIntensity = options.glowIntensity || BallConfig.effects.glowIntensity;

            // Suavidade de movimento (interpolação)
            this.smoothPosition = this.position.clone();
            this.smoothVelocity = this.velocity.clone();
            this.smoothFactor = options.smoothFactor || BallConfig.effects.smoothFactor;

            // Dados do usuário
            this.userData = options.userData || {};

            // Estado interno
            this._isMoving = false;
            this._lastPosition = this.position.clone();
            this._speed = 0;
            this._prevPosition = this.position.clone();
            this._trailTimer = 0;
            this._bounceOffset = 0;
            this._bounceVelocity = 0;
            this._spin = 0;

            // Cache para performance
            this._cachedPositions = [];
        }

        static _nextId = 1;

        // ============================================================
        // 3. ATUALIZAÇÃO (física e animação)
        // ============================================================

        update(deltaTime) {
            if (this.isStatic) return;

            // Guarda posição anterior
            this._lastPosition.copy(this.position);
            this._prevPosition.copy(this.position);

            // Atualiza posição
            if (!this.isKinematic) {
                // Aplica atrito
                this.velocity.scaleSelf(Math.pow(this.friction, deltaTime * 60));

                // Move a bola
                this.position.addSelf(this.velocity.scale(deltaTime));

                // Se a velocidade for muito baixa, para
                if (this.velocity.magnitudeSq() < 0.001) {
                    this.velocity.set(0, 0);
                }
            }

            // Calcula velocidade atual
            this._speed = this.velocity.magnitude();

            // Determina se está se movendo
            this._isMoving = this._speed > 0.1;

            // Atualiza rotação baseado no movimento
            if (this._isMoving) {
                // Rotação baseada na direção do movimento
                const angle = this.velocity.angle();
                this.rotation += this.velocity.magnitude() * deltaTime * this.rotationSpeed * 0.1;

                // Efeito de "spin" baseado na curvatura
                const turnRate = this.velocity.cross(this.velocity) * deltaTime;
                this._spin += turnRate * 0.5;
                this._spin *= 0.95;
            } else {
                // Desacelera rotação quando parado
                this.rotation *= 0.98;
                this._spin *= 0.95;
            }

            // Suavização de movimento (interpolação)
            this.smoothPosition.lerpSelf(this.position, 1 - this.smoothFactor);
            this.smoothVelocity.lerpSelf(this.velocity, 1 - this.smoothFactor);

            // Atualiza pulso
            this.pulsePhase += deltaTime * 1.5;

            // Efeito de bounce suave (compressão/expansão)
            if (this._isMoving) {
                const speedFactor = Math.min(this._speed / 100, 0.15);
                this._bounceOffset = Math.sin(this.pulsePhase * 2) * speedFactor * 2;
                this._bounceVelocity = Math.cos(this.pulsePhase * 2) * speedFactor * 4;
            } else {
                this._bounceOffset *= 0.95;
                this._bounceVelocity *= 0.95;
            }

            // Atualiza cache de posições para suavidade
            this._cachedPositions.push({
                position: this.position.clone(),
                time: Date.now(),
            });
            if (this._cachedPositions.length > 10) {
                this._cachedPositions.shift();
            }
        }

        // ============================================================
        // 4. RENDERIZAÇÃO
        // ============================================================

        render(ctx, renderer) {
            if (!ctx) return;

            // Converte posição para tela (usando posição suavizada)
            const pos = renderer ?
                renderer.worldToScreen(this.smoothPosition.x, this.smoothPosition.y) :
                { x: this.smoothPosition.x, y: this.smoothPosition.y };

            const radius = this.radius * (1 + this._bounceOffset * 0.03);

            ctx.save();

            // --- 1. Sombra ---
            this._renderShadow(ctx, pos, radius);

            // --- 2. Brilho/Glow ---
            this._renderGlow(ctx, pos, radius);

            // --- 3. Corpo principal ---
            this._renderBody(ctx, pos, radius);

            // --- 4. Padrão da bola (hexágonos) ---
            this._renderPattern(ctx, pos, radius);

            // --- 5. Reflexo ---
            this._renderReflection(ctx, pos, radius);

            // --- 6. Brilho especular ---
            this._renderSpecular(ctx, pos, radius);

            // --- 7. Detalhes finos ---
            this._renderDetails(ctx, pos, radius);

            ctx.restore();
        }

        // ============================================================
        // 5. RENDERIZAÇÃO DA SOMBRA
        // ============================================================

        _renderShadow(ctx, pos, radius) {
            const shadowSize = radius * 1.3;
            const offsetY = this.shadowBlur * 0.12;

            ctx.save();
            ctx.shadowColor = this.colors.shadow;
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.min(offsetY + 2, 6);

            // Sombra elíptica (mais realista)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(
                pos.x + 1,
                pos.y + offsetY * 1.8,
                shadowSize * 0.85,
                shadowSize * 0.65,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            // Sombra secundária (difusa)
            ctx.shadowBlur = this.shadowBlur * 1.5;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.beginPath();
            ctx.ellipse(
                pos.x + 2,
                pos.y + offsetY * 2.5,
                shadowSize * 1.2,
                shadowSize * 0.8,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            ctx.restore();
        }

        // ============================================================
        // 6. RENDERIZAÇÃO DO GLOW
        // ============================================================

        _renderGlow(ctx, pos, radius) {
            const glowRadius = radius * 2.0;
            const glowAlpha = this.glowIntensity * 0.4;

            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, radius * 0.3,
                pos.x, pos.y, glowRadius
            );
            gradient.addColorStop(0, this.colors.glow);
            gradient.addColorStop(0.5, this.colors.glow);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.globalAlpha = glowAlpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 7. RENDERIZAÇÃO DO CORPO PRINCIPAL
        // ============================================================

        _renderBody(ctx, pos, radius) {
            // Gradiente 3D da bola
            const gradient = ctx.createRadialGradient(
                pos.x - radius * 0.35,
                pos.y - radius * 0.35,
                radius * 0.05,
                pos.x,
                pos.y,
                radius
            );

            gradient.addColorStop(0, this.colors.secondary);
            gradient.addColorStop(0.3, this.colors.primary);
            gradient.addColorStop(0.7, this.colors.secondary);
            gradient.addColorStop(0.9, this.colors.dark);
            gradient.addColorStop(1, this._darkenColor(this.colors.dark, 0.15));

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Contorno sutil da bola
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ============================================================
        // 8. RENDERIZAÇÃO DO PADRÃO (hexágonos)
        // ============================================================

        _renderPattern(ctx, pos, radius) {
            const panels = BallConfig.pattern.panels;
            const stitchColor = BallConfig.pattern.stitchColor;
            const stitchWidth = BallConfig.pattern.stitchWidth;

            ctx.save();

            // Rotação global do padrão
            ctx.translate(pos.x, pos.y);
            ctx.rotate(this.rotation);

            // Desenha painéis hexagonais
            const panelRadius = radius * 0.65;

            for (let i = 0; i < panels; i++) {
                const angle = (i / panels) * Math.PI * 2;
                const nextAngle = ((i + 1) / panels) * Math.PI * 2;

                const x1 = Math.cos(angle) * panelRadius;
                const y1 = Math.sin(angle) * panelRadius;
                const x2 = Math.cos(nextAngle) * panelRadius;
                const y2 = Math.sin(nextAngle) * panelRadius;

                // Ponto médio para o painel
                const midAngle = (angle + nextAngle) / 2;
                const midX = Math.cos(midAngle) * panelRadius * 0.6;
                const midY = Math.sin(midAngle) * panelRadius * 0.6;

                // Desenha painel
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(x1, y1);
                ctx.quadraticCurveTo(
                    midX * 1.1,
                    midY * 1.1,
                    x2, y2
                );
                ctx.closePath();

                // Preenchimento do painel
                const panelGradient = ctx.createRadialGradient(
                    midX * 0.3,
                    midY * 0.3,
                    0,
                    midX,
                    midY,
                    panelRadius * 0.5
                );

                const shade = (i % 2 === 0) ? 0 : 0.1;
                const light = (i % 3 === 0) ? 0.05 : 0;
                panelGradient.addColorStop(0, this._adjustBrightness(this.colors.panel, 0.1 + light));
                panelGradient.addColorStop(0.5, this._adjustBrightness(this.colors.panel, shade + light));
                panelGradient.addColorStop(1, this._adjustBrightness(this.colors.panelDark, shade + 0.05));

                ctx.fillStyle = panelGradient;
                ctx.fill();

                // Borda do painel (costura)
                ctx.strokeStyle = stitchColor;
                ctx.lineWidth = stitchWidth;
                ctx.stroke();
            }

            // Anel central (opcional)
            const centerRingRadius = radius * 0.12;
            ctx.strokeStyle = 'rgba(60, 60, 60, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, centerRingRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // ============================================================
        // 9. RENDERIZAÇÃO DO REFLEXO
        // ============================================================

        _renderReflection(ctx, pos, radius) {
            const reflectionRadius = radius * 0.7;
            const reflectionX = pos.x - radius * 0.28;
            const reflectionY = pos.y - radius * 0.38;

            const gradient = ctx.createRadialGradient(
                reflectionX, reflectionY, 0,
                reflectionX, reflectionY, reflectionRadius
            );

            const intensity = this.reflectionIntensity * 0.5;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.7})`);
            gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.4})`);
            gradient.addColorStop(0.6, `rgba(255, 255, 255, ${intensity * 0.15})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

            ctx.globalAlpha = 0.9;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 10. RENDERIZAÇÃO DO BRILHO ESPECULAR
        // ============================================================

        _renderSpecular(ctx, pos, radius) {
            // Brilho principal (destaque)
            const specularRadius = radius * 0.3;
            const specularX = pos.x - radius * 0.3;
            const specularY = pos.y - radius * 0.35;

            const gradient = ctx.createRadialGradient(
                specularX, specularY, 0,
                specularX, specularY, specularRadius
            );

            const intensity = this.specularIntensity * (0.8 + this._speed * 0.002);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(intensity, 0.95)})`);
            gradient.addColorStop(0.4, `rgba(255, 255, 255, ${Math.min(intensity * 0.6, 0.6)})`);
            gradient.addColorStop(0.7, `rgba(255, 255, 255, ${Math.min(intensity * 0.2, 0.2)})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(specularX, specularY, specularRadius, 0, Math.PI * 2);
            ctx.fill();

            // Brilho secundário (menor, mais intenso)
            if (this._isMoving && this._speed > 10) {
                const secRadius = radius * 0.12;
                const secX = pos.x + radius * 0.2;
                const secY = pos.y + radius * 0.15;

                const gradient2 = ctx.createRadialGradient(
                    secX, secY, 0,
                    secX, secY, secRadius
                );
                gradient2.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.4})`);
                gradient2.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.fillStyle = gradient2;
                ctx.beginPath();
                ctx.arc(secX, secY, secRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Brilho de movimento (rastro luminoso)
            if (this._isMoving && this._speed > 30) {
                const trailGlow = ctx.createRadialGradient(
                    pos.x - this.velocity.x * 0.02,
                    pos.y - this.velocity.y * 0.02,
                    0,
                    pos.x - this.velocity.x * 0.02,
                    pos.y - this.velocity.y * 0.02,
                    radius * 0.8
                );
                trailGlow.addColorStop(0, `rgba(255, 255, 255, ${this._speed * 0.0005})`);
                trailGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = trailGlow;
                ctx.beginPath();
                ctx.arc(pos.x - this.velocity.x * 0.02, pos.y - this.velocity.y * 0.02, radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ============================================================
        // 11. RENDERIZAÇÃO DE DETALHES FINOS
        // ============================================================

        _renderDetails(ctx, pos, radius) {
            // Anel de contorno (borda metálica sutil)
            const borderWidth = 0.8;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = borderWidth;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - borderWidth * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // Pequeno ponto central (efeito 3D)
            if (radius > 8) {
                const dotRadius = radius * 0.04;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.beginPath();
                ctx.arc(pos.x + 1, pos.y + 1, dotRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label se existir
            if (this.label) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${radius * 0.4}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.fillText(this.label, pos.x, pos.y + 1);
                ctx.restore();
            }
        }

        // ============================================================
        // 12. UTILITÁRIOS DE COR
        // ============================================================

        _darkenColor(color, amount) {
            return this._adjustBrightness(color, -amount);
        }

        _adjustBrightness(color, amount) {
            // Suporta cores hex e rgb
            let r, g, b;

            if (color.startsWith('#')) {
                const hex = color.slice(1);
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else {
                    r = parseInt(hex.slice(0, 2), 16);
                    g = parseInt(hex.slice(2, 4), 16);
                    b = parseInt(hex.slice(4, 6), 16);
                }
            } else if (color.startsWith('rgb')) {
                const match = color.match(/\d+/g);
                if (match) {
                    r = parseInt(match[0]);
                    g = parseInt(match[1]);
                    b = parseInt(match[2]);
                } else {
                    return color;
                }
            } else {
                return color;
            }

            r = Math.max(0, Math.min(255, r + amount * 255));
            g = Math.max(0, Math.min(255, g + amount * 255));
            b = Math.max(0, Math.min(255, b + amount * 255));

            return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
        }

        // ============================================================
        // 13. MÉTODOS DE CONTROLE
        // ============================================================

        setPosition(x, y) {
            this.position.set(x, y);
            this.smoothPosition.copy(this.position);
            return this;
        }

        setVelocity(x, y) {
            this.velocity.set(x, y);
            this.smoothVelocity.copy(this.velocity);
            return this;
        }

        applyForce(force) {
            if (this.isStatic) return this;
            this.velocity.addSelf(force.scale(1 / this.mass));
            return this;
        }

        applyImpulse(impulse) {
            if (this.isStatic) return this;
            this.velocity.addSelf(impulse.scale(1 / this.mass));
            return this;
        }

        reset() {
            this.velocity.set(0, 0);
            this.smoothVelocity.set(0, 0);
            this.rotation = 0;
            this._spin = 0;
            this._bounceOffset = 0;
            this._bounceVelocity = 0;
            this._cachedPositions = [];
            return this;
        }

        // ============================================================
        // 14. CLONAGEM
        // ============================================================

        clone() {
            return new Ball({
                position: this.position.clone(),
                velocity: this.velocity.clone(),
                radius: this.radius,
                mass: this.mass,
                label: this.label,
                primaryColor: this.colors.primary,
                secondaryColor: this.colors.secondary,
                darkColor: this.colors.dark,
                shadowColor: this.colors.shadow,
                glowColor: this.colors.glow,
                panelColor: this.colors.panel,
                panelDarkColor: this.colors.panelDark,
                accentColor: this.colors.accent,
                rotation: this.rotation,
                rotationSpeed: this.rotationSpeed,
                friction: this.friction,
                restitution: this.restitution,
                isStatic: this.isStatic,
                isKinematic: this.isKinematic,
                shadowBlur: this.shadowBlur,
                reflectionIntensity: this.reflectionIntensity,
                specularIntensity: this.specularIntensity,
                glowIntensity: this.glowIntensity,
                smoothFactor: this.smoothFactor,
                userData: { ...this.userData },
            });
        }

        // ============================================================
        // 15. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                id: this.id,
                position: this.position,
                velocity: this.velocity,
                smoothPosition: this.smoothPosition,
                speed: this._speed,
                isMoving: this._isMoving,
                radius: this.radius,
                mass: this.mass,
                rotation: this.rotation,
                spin: this._spin,
                bounceOffset: this._bounceOffset,
            };
        }
    }

    // ============================================================
    // 16. FACTORY PARA CRIAÇÃO DE BOLAS
    // ============================================================

    class BallFactory {
        static createStandard(options = {}) {
            return new Ball({
                ...options,
                primaryColor: options.primaryColor || BallConfig.colors.primary,
                secondaryColor: options.secondaryColor || BallConfig.colors.secondary,
                darkColor: options.darkColor || BallConfig.colors.dark,
                panelColor: options.panelColor || BallConfig.colors.panel,
                panelDarkColor: options.panelDarkColor || BallConfig.colors.panelDark,
            });
        }

        static createColored(color, options = {}) {
            return new Ball({
                ...options,
                primaryColor: color,
                secondaryColor: this._adjustColor(color, 0.1),
                darkColor: this._adjustColor(color, -0.2),
                panelColor: this._adjustColor(color, 0.05),
                panelDarkColor: this._adjustColor(color, -0.1),
            });
        }

        static _adjustColor(color, amount) {
            // Simples ajuste de cor (placeholder)
            return color;
        }

        static createSoccer(options = {}) {
            return new Ball({
                ...options,
                primaryColor: '#F5F5F5',
                secondaryColor: '#E8E8E8',
                darkColor: '#CCCCCC',
                panelColor: '#D8D8D8',
                panelDarkColor: '#B8B8B8',
                accentColor: '#2C3E50',
            });
        }

        static createTennis(options = {}) {
            return new Ball({
                ...options,
                primaryColor: '#F5F5DC',
                secondaryColor: '#E8E8C8',
                darkColor: '#C8C8A8',
                panelColor: '#DEDEC0',
                panelDarkColor: '#C0C0A0',
                accentColor: '#8B8B70',
            });
        }

        static createBasketball(options = {}) {
            return new Ball({
                ...options,
                primaryColor: '#D2691E',
                secondaryColor: '#C45A1A',
                darkColor: '#A04810',
                panelColor: '#C85A1A',
                panelDarkColor: '#A04010',
                accentColor: '#8B3508',
            });
        }
    }

    // ============================================================
    // 17. EXPORTAÇÃO
    // ============================================================

    const BallModule = {
        // Configuração
        Config: BallConfig,

        // Classes
        Ball: Ball,
        BallFactory: BallFactory,

        // Criação rápida
        create: (options) => new Ball(options),
        standard: (options) => BallFactory.createStandard(options),
        colored: (color, options) => BallFactory.createColored(color, options),
        soccer: (options) => BallFactory.createSoccer(options),
        tennis: (options) => BallFactory.createTennis(options),
        basketball: (options) => BallFactory.createBasketball(options),

        // Tamanhos predefinidos
        sizes: BallConfig.sizes,
    };

    // ============================================================
    // 18. EXPORTA PARA O GLOBAL
    // ============================================================

    global.BallModule = BallModule;
    global.Ball = Ball;
    global.BallFactory = BallFactory;

    console.log('[Ball] Módulo de bola premium carregado.');

})(typeof window !== 'undefined' ? window : this);
