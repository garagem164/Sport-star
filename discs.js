// engine/discs.js — Discos Premium com visual moderno para jogos mobile
// Gradiente, reflexo, sombra, brilho, borda metálica, animação durante movimento
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE VISUAL DOS DISCOS
    // ============================================================
    const DiscConfig = {
        // Cores padrão por time
        teamColors: {
            home: {
                primary: '#4A90D9',
                secondary: '#2C6BA0',
                highlight: '#6BB5FF',
                shadow: 'rgba(26, 74, 110, 0.5)',
                glow: 'rgba(74, 144, 217, 0.3)',
            },
            away: {
                primary: '#E74C3C',
                secondary: '#C0392B',
                highlight: '#FF6B5A',
                shadow: 'rgba(160, 50, 40, 0.5)',
                glow: 'rgba(231, 76, 60, 0.3)',
            },
            neutral: {
                primary: '#95A5A6',
                secondary: '#7F8C8D',
                highlight: '#BDC3C7',
                shadow: 'rgba(80, 90, 90, 0.5)',
                glow: 'rgba(149, 165, 166, 0.3)',
            },
        },

        // Tamanhos
        sizes: {
            small: 12,
            medium: 18,
            large: 24,
            xlarge: 32,
        },

        // Efeitos
        effects: {
            glowIntensity: 0.4,
            reflectionIntensity: 0.6,
            metallicIntensity: 0.3,
            shadowBlur: 20,
            shadowOffset: 4,
            borderWidth: 2,
            animationSpeed: 1.0,
            pulseSpeed: 0.5,
        },
    };

    // ============================================================
    // 2. CLASSE DISCO PREMIUM
    // ============================================================
    class PremiumDisc {
        constructor(options = {}) {
            // Posição e movimento
            this.position = options.position || new Vec2(0, 0);
            this.velocity = options.velocity || new Vec2(0, 0);
            this.radius = options.radius || DiscConfig.sizes.medium;
            this.mass = options.mass || 1.0;
            
            // Identidade
            this.id = PremiumDisc._nextId++;
            this.team = options.team || 'neutral';
            this.number = options.number || '';
            this.label = options.label || '';
            
            // Cores (personalizadas ou do time)
            const teamColors = DiscConfig.teamColors[this.team] || DiscConfig.teamColors.neutral;
            this.colors = {
                primary: options.primaryColor || teamColors.primary,
                secondary: options.secondaryColor || teamColors.secondary,
                highlight: options.highlightColor || teamColors.highlight,
                shadow: options.shadowColor || teamColors.shadow,
                glow: options.glowColor || teamColors.glow,
            };
            
            // Estado de animação
            this.rotation = options.rotation || 0;
            this.rotationSpeed = options.rotationSpeed || 0;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.movementTrail = [];
            this.maxTrailLength = 8;
            
            // Propriedades físicas
            this.friction = options.friction || 0.98;
            this.restitution = options.restitution || 0.8;
            this.isStatic = options.isStatic || false;
            this.isKinematic = options.isKinematic || false;
            
            // Efeitos visuais
            this.glowIntensity = options.glowIntensity || DiscConfig.effects.glowIntensity;
            this.reflectionIntensity = options.reflectionIntensity || DiscConfig.effects.reflectionIntensity;
            this.metallicIntensity = options.metallicIntensity || DiscConfig.effects.metallicIntensity;
            this.shadowBlur = options.shadowBlur || DiscConfig.effects.shadowBlur;
            this.borderWidth = options.borderWidth || DiscConfig.effects.borderWidth;
            
            // Animação personalizada
            this.bounceAnimation = options.bounceAnimation || false;
            this.pulseAnimation = options.pulseAnimation !== undefined ? options.pulseAnimation : true;
            this.rotationAnimation = options.rotationAnimation !== undefined ? options.rotationAnimation : true;
            
            // Dados do usuário
            this.userData = options.userData || {};
            
            // Estado interno
            this._isMoving = false;
            this._lastPosition = this.position.clone();
            this._speed = 0;
            this._prevSpeed = 0;
            this._trailTimer = 0;
        }

        static _nextId = 1;

        // ============================================================
        // 3. ATUALIZAÇÃO (física e animação)
        // ============================================================

        update(deltaTime) {
            if (this.isStatic) return;

            // Guarda posição anterior
            this._lastPosition.copy(this.position);
            
            // Atualiza posição
            if (!this.isKinematic) {
                this.position.addSelf(this.velocity.scale(deltaTime));
            }
            
            // Calcula velocidade atual
            this._speed = this.velocity.magnitude();
            
            // Determina se está se movendo
            this._isMoving = this._speed > 0.5;
            
            // Atualiza rotação baseado no movimento
            if (this.rotationAnimation && this._isMoving) {
                this.rotationSpeed = this.velocity.cross(new Vec2(1, 0)) * 0.01;
                this.rotation += this.rotationSpeed * deltaTime * 60;
            } else if (this.rotationAnimation) {
                // Desacelera rotação quando parado
                this.rotationSpeed *= 0.95;
                this.rotation += this.rotationSpeed * deltaTime * 60;
            }
            
            // Atualiza pulso
            if (this.pulseAnimation) {
                this.pulsePhase += deltaTime * DiscConfig.effects.pulseSpeed * 2;
            }
            
            // Atualiza rastro de movimento
            this._updateTrail(deltaTime);
            
            // Atualiza bounce animation
            if (this.bounceAnimation && this._isMoving) {
                this._updateBounce(deltaTime);
            }
            
            // Atualiza brilho baseado na velocidade
            this._updateGlow(deltaTime);
            
            // Aplica atrito se não for cinemático
            if (!this.isKinematic) {
                this.velocity.scaleSelf(Math.pow(this.friction, deltaTime * 60));
                if (this.velocity.magnitudeSq() < 0.01) {
                    this.velocity.set(0, 0);
                }
            }
        }

        // ============================================================
        // 4. ATUALIZAÇÃO DO RASTRO
        // ============================================================

        _updateTrail(deltaTime) {
            if (this._isMoving && this._speed > 0.5) {
                this._trailTimer += deltaTime;
                if (this._trailTimer > 0.05) {
                    this._trailTimer = 0;
                    this.movementTrail.push({
                        position: this.position.clone(),
                        speed: this._speed,
                        time: Date.now(),
                    });
                    
                    if (this.movementTrail.length > this.maxTrailLength) {
                        this.movementTrail.shift();
                    }
                }
            } else if (this.movementTrail.length > 0) {
                // Limpa rastro gradualmente
                const timeSinceLast = Date.now() - (this.movementTrail[this.movementTrail.length - 1]?.time || 0);
                if (timeSinceLast > 200) {
                    this.movementTrail = [];
                }
            }
        }

        // ============================================================
        // 5. ANIMAÇÃO DE BOUNCE
        // ============================================================

        _updateBounce(deltaTime) {
            // Efeito de compressão/expansão baseado na velocidade
            const speedFactor = Math.min(this._speed / 100, 0.3);
            const bounceOffset = Math.sin(this.pulsePhase) * speedFactor * 2;
            this._bounceScale = 1 + bounceOffset * 0.1;
        }

        // ============================================================
        // 6. ATUALIZAÇÃO DO BRILHO
        // ============================================================

        _updateGlow(deltaTime) {
            // Brilho intensifica com a velocidade
            const speedFactor = Math.min(this._speed / 200, 0.5);
            this._currentGlow = this.glowIntensity + speedFactor * 0.5;
            this._currentGlow = Math.min(this._currentGlow, 1.0);
        }

        // ============================================================
        // 7. RENDERIZAÇÃO
        // ============================================================

        render(ctx, renderer) {
            if (!ctx) return;

            // Converte posição para tela
            const screenPos = renderer ? 
                renderer.worldToScreen(this.position.x, this.position.y) : 
                { x: this.position.x, y: this.position.y };
            
            const radius = this.radius * (this._bounceScale || 1);
            
            ctx.save();
            
            // --- 1. Sombra ---
            this._renderShadow(ctx, screenPos, radius);
            
            // --- 2. Rastro de movimento ---
            this._renderTrail(ctx, screenPos, renderer);
            
            // --- 3. Brilho/Glow ---
            this._renderGlow(ctx, screenPos, radius);
            
            // --- 4. Corpo principal com gradiente ---
            this._renderBody(ctx, screenPos, radius);
            
            // --- 5. Borda metálica ---
            this._renderMetalBorder(ctx, screenPos, radius);
            
            // --- 6. Reflexo ---
            this._renderReflection(ctx, screenPos, radius);
            
            // --- 7. Brilho especular ---
            this._renderSpecular(ctx, screenPos, radius);
            
            // --- 8. Número/identificação ---
            this._renderLabel(ctx, screenPos, radius);
            
            ctx.restore();
        }

        // ============================================================
        // 8. RENDERIZAÇÃO DA SOMBRA
        // ============================================================

        _renderShadow(ctx, pos, radius) {
            const shadowSize = radius * 1.2;
            const offsetY = this.shadowBlur * 0.15;
            
            ctx.shadowColor = this.colors.shadow;
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.min(offsetY, 6);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(
                pos.x + 2,
                pos.y + offsetY * 1.5,
                shadowSize * 0.9,
                shadowSize * 0.7,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Reseta sombra para não afetar outros elementos
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // ============================================================
        // 9. RENDERIZAÇÃO DO RASTRO
        // ============================================================

        _renderTrail(ctx, pos, renderer) {
            if (this.movementTrail.length < 2) return;
            
            const alpha = 0.15;
            ctx.save();
            ctx.globalAlpha = alpha;
            
            for (let i = 1; i < this.movementTrail.length; i++) {
                const prev = this.movementTrail[i - 1];
                const curr = this.movementTrail[i];
                
                const prevPos = renderer ? 
                    renderer.worldToScreen(prev.position.x, prev.position.y) : 
                    { x: prev.position.x, y: prev.position.y };
                const currPos = renderer ? 
                    renderer.worldToScreen(curr.position.x, curr.position.y) : 
                    { x: curr.position.x, y: curr.position.y };
                
                const progress = i / this.movementTrail.length;
                const trailRadius = this.radius * (0.3 + progress * 0.7);
                const trailAlpha = (1 - progress) * 0.4;
                
                ctx.globalAlpha = trailAlpha * alpha;
                ctx.fillStyle = this.colors.primary;
                ctx.beginPath();
                ctx.arc(currPos.x, currPos.y, trailRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }

        // ============================================================
        // 10. RENDERIZAÇÃO DO GLOW
        // ============================================================

        _renderGlow(ctx, pos, radius) {
            const glowRadius = radius * (1.8 + (this._currentGlow || this.glowIntensity) * 0.5);
            const glowAlpha = (this._currentGlow || this.glowIntensity) * 0.3;
            
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, radius * 0.5,
                pos.x, pos.y, glowRadius
            );
            gradient.addColorStop(0, this.colors.glow);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.globalAlpha = glowAlpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 11. RENDERIZAÇÃO DO CORPO PRINCIPAL
        // ============================================================

        _renderBody(ctx, pos, radius) {
            // Gradiente principal
            const gradient = ctx.createRadialGradient(
                pos.x - radius * 0.3,
                pos.y - radius * 0.3,
                radius * 0.1,
                pos.x,
                pos.y,
                radius
            );
            
            gradient.addColorStop(0, this.colors.highlight);
            gradient.addColorStop(0.4, this.colors.primary);
            gradient.addColorStop(0.8, this.colors.secondary);
            gradient.addColorStop(1, this._darkenColor(this.colors.secondary, 0.3));
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // ============================================================
        // 12. RENDERIZAÇÃO DA BORDA METÁLICA
        // ============================================================

        _renderMetalBorder(ctx, pos, radius) {
            const borderWidth = this.borderWidth * (1 + this._bounceScale * 0.5 || 1);
            const innerRadius = radius - borderWidth;
            
            // Gradiente da borda
            const gradient = ctx.createLinearGradient(
                pos.x - radius, pos.y - radius,
                pos.x + radius, pos.y + radius
            );
            
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.6)');
            gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = borderWidth * 1.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - borderWidth * 0.3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Borda interna sutil
            if (innerRadius > 2) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, innerRadius * 0.9, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // ============================================================
        // 13. RENDERIZAÇÃO DO REFLEXO
        // ============================================================

        _renderReflection(ctx, pos, radius) {
            const reflectionRadius = radius * 0.6;
            const reflectionX = pos.x - radius * 0.25;
            const reflectionY = pos.y - radius * 0.35;
            
            const gradient = ctx.createRadialGradient(
                reflectionX, reflectionY, 0,
                reflectionX, reflectionY, reflectionRadius
            );
            
            const intensity = this.reflectionIntensity * 0.7;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.6})`);
            gradient.addColorStop(0.4, `rgba(255, 255, 255, ${intensity * 0.3})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ============================================================
        // 14. RENDERIZAÇÃO DO BRILHO ESPECULAR
        // ============================================================

        _renderSpecular(ctx, pos, radius) {
            // Brilho principal (destaque)
            const specularRadius = radius * 0.25;
            const specularX = pos.x - radius * 0.3;
            const specularY = pos.y - radius * 0.35;
            
            const gradient = ctx.createRadialGradient(
                specularX, specularY, 0,
                specularX, specularY, specularRadius
            );
            
            const intensity = 0.7 + (this._currentGlow || 0) * 0.3;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.9})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.4})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(specularX, specularY, specularRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Pequeno brilho secundário
            const secondaryX = pos.x + radius * 0.2;
            const secondaryY = pos.y + radius * 0.15;
            const secondaryRadius = radius * 0.1;
            
            const gradient2 = ctx.createRadialGradient(
                secondaryX, secondaryY, 0,
                secondaryX, secondaryY, secondaryRadius
            );
            gradient2.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.3})`);
            gradient2.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.fillStyle = gradient2;
            ctx.beginPath();
            ctx.arc(secondaryX, secondaryY, secondaryRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // ============================================================
        // 15. RENDERIZAÇÃO DO LABEL/NÚMERO
        // ============================================================

        _renderLabel(ctx, pos, radius) {
            if (!this.number && !this.label) return;
            
            const text = this.number || this.label;
            const fontSize = radius * 0.7;
            
            ctx.save();
            
            // Sombra do texto
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Ajusta tamanho do texto se necessário
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            if (textWidth > radius * 1.4) {
                const scale = (radius * 1.4) / textWidth;
                ctx.font = `bold ${fontSize * scale}px system-ui, -apple-system, sans-serif`;
            }
            
            ctx.fillText(text, pos.x, pos.y + 1);
            
            // Contorno sutil do texto
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeText(text, pos.x, pos.y + 1);
            
            ctx.restore();
        }

        // ============================================================
        // 16. UTILITÁRIOS
        // ============================================================

        _darkenColor(color, amount) {
            // Simples escurecimento de cor
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);
            
            r = Math.floor(r * (1 - amount));
            g = Math.floor(g * (1 - amount));
            b = Math.floor(b * (1 - amount));
            
            return `rgb(${r}, ${g}, ${b})`;
        }

        // ============================================================
        // 17. MÉTODOS DE CONTROLE
        // ============================================================

        setPosition(x, y) {
            this.position.set(x, y);
            return this;
        }

        setVelocity(x, y) {
            this.velocity.set(x, y);
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

        // ============================================================
        // 18. CLONAGEM
        // ============================================================

        clone() {
            return new PremiumDisc({
                position: this.position.clone(),
                velocity: this.velocity.clone(),
                radius: this.radius,
                mass: this.mass,
                team: this.team,
                number: this.number,
                label: this.label,
                primaryColor: this.colors.primary,
                secondaryColor: this.colors.secondary,
                highlightColor: this.colors.highlight,
                shadowColor: this.colors.shadow,
                glowColor: this.colors.glow,
                rotation: this.rotation,
                rotationSpeed: this.rotationSpeed,
                friction: this.friction,
                restitution: this.restitution,
                isStatic: this.isStatic,
                isKinematic: this.isKinematic,
                glowIntensity: this.glowIntensity,
                reflectionIntensity: this.reflectionIntensity,
                metallicIntensity: this.metallicIntensity,
                shadowBlur: this.shadowBlur,
                borderWidth: this.borderWidth,
                bounceAnimation: this.bounceAnimation,
                pulseAnimation: this.pulseAnimation,
                rotationAnimation: this.rotationAnimation,
                userData: { ...this.userData },
            });
        }

        // ============================================================
        // 19. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                id: this.id,
                team: this.team,
                position: this.position,
                velocity: this.velocity,
                speed: this._speed,
                isMoving: this._isMoving,
                radius: this.radius,
                mass: this.mass,
                rotation: this.rotation,
                trailLength: this.movementTrail.length,
            };
        }
    }

    // ============================================================
    // 20. FACTORY PARA CRIAÇÃO DE DISCOS
    // ============================================================

    class DiscFactory {
        static createHomeDisc(options = {}) {
            return new PremiumDisc({
                ...options,
                team: 'home',
                primaryColor: options.primaryColor || DiscConfig.teamColors.home.primary,
                secondaryColor: options.secondaryColor || DiscConfig.teamColors.home.secondary,
                highlightColor: options.highlightColor || DiscConfig.teamColors.home.highlight,
                shadowColor: options.shadowColor || DiscConfig.teamColors.home.shadow,
                glowColor: options.glowColor || DiscConfig.teamColors.home.glow,
            });
        }

        static createAwayDisc(options = {}) {
            return new PremiumDisc({
                ...options,
                team: 'away',
                primaryColor: options.primaryColor || DiscConfig.teamColors.away.primary,
                secondaryColor: options.secondaryColor || DiscConfig.teamColors.away.secondary,
                highlightColor: options.highlightColor || DiscConfig.teamColors.away.highlight,
                shadowColor: options.shadowColor || DiscConfig.teamColors.away.shadow,
                glowColor: options.glowColor || DiscConfig.teamColors.away.glow,
            });
        }

        static createNeutralDisc(options = {}) {
            return new PremiumDisc({
                ...options,
                team: 'neutral',
                primaryColor: options.primaryColor || DiscConfig.teamColors.neutral.primary,
                secondaryColor: options.secondaryColor || DiscConfig.teamColors.neutral.secondary,
                highlightColor: options.highlightColor || DiscConfig.teamColors.neutral.highlight,
                shadowColor: options.shadowColor || DiscConfig.teamColors.neutral.shadow,
                glowColor: options.glowColor || DiscConfig.teamColors.neutral.glow,
            });
        }

        static createCustomDisc(options = {}) {
            return new PremiumDisc(options);
        }

        static createTeam(team, count = 11, options = {}) {
            const discs = [];
            const teamColors = DiscConfig.teamColors[team] || DiscConfig.teamColors.neutral;
            
            for (let i = 0; i < count; i++) {
                const disc = new PremiumDisc({
                    ...options,
                    team: team,
                    number: `${i + 1}`,
                    primaryColor: options.primaryColor || teamColors.primary,
                    secondaryColor: options.secondaryColor || teamColors.secondary,
                    highlightColor: options.highlightColor || teamColors.highlight,
                    shadowColor: options.shadowColor || teamColors.shadow,
                    glowColor: options.glowColor || teamColors.glow,
                });
                discs.push(disc);
            }
            
            return discs;
        }
    }

    // ============================================================
    // 21. EXPORTAÇÃO
    // ============================================================

    const Discs = {
        // Configuração
        Config: DiscConfig,
        
        // Classes
        PremiumDisc: PremiumDisc,
        DiscFactory: DiscFactory,
        
        // Criação rápida
        create: (options) => new PremiumDisc(options),
        home: (options) => DiscFactory.createHomeDisc(options),
        away: (options) => DiscFactory.createAwayDisc(options),
        neutral: (options) => DiscFactory.createNeutralDisc(options),
        team: (team, count, options) => DiscFactory.createTeam(team, count, options),
        
        // Cores dos times
        teamColors: DiscConfig.teamColors,
        
        // Tamanhos predefinidos
        sizes: DiscConfig.sizes,
    };

    // ============================================================
    // 22. EXPORTA PARA O GLOBAL
    // ============================================================

    global.Discs = Discs;
    global.PremiumDisc = PremiumDisc;
    global.DiscFactory = DiscFactory;

    console.log('[Discs] Módulo de discos premium carregado.');

})(typeof window !== 'undefined' ? window : this);
