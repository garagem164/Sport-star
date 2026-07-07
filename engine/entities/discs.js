/**
 * Disco do jogo com visual premium
 * @class Disc
 */
class Disc {
    /**
     * @param {Object} options
     * @param {string} options.team - 'blue' | 'red' | 'neutral'
     * @param {Vec2} options.position - Posição inicial
     * @param {number} options.radius - Raio do disco
     */
    constructor(options = {}) {
        this.id = Disc._nextId++;
        this.team = options.team || 'neutral';
        this.position = options.position || new Vec2(0, 0);
        this.velocity = options.velocity || new Vec2(0, 0);
        this.radius = options.radius || 18;
        this.mass = options.mass || 1;
        this.restitution = options.restitution || 0.7;
        this.friction = options.friction || 0.3;
        
        this.isActive = true;
        this.isMovable = true;
        this.isStatic = false;
        
        this.rotation = 0;
        this.rotationSpeed = 0;
        
        // Cores baseadas no time
        const colors = this._getTeamColors();
        this.colors = colors;
        
        // Smooth para animação
        this.smoothPosition = this.position.clone();
        this.smoothVelocity = this.velocity.clone();
    }

    static _nextId = 1;

    _getTeamColors() {
        const teams = {
            blue: {
                primary: '#4A90D9',
                secondary: '#2C6BA0',
                highlight: '#6BB5FF',
                shadow: 'rgba(26, 74, 110, 0.5)',
                glow: 'rgba(74, 144, 217, 0.3)',
            },
            red: {
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
            }
        };
        return teams[this.team] || teams.neutral;
    }

    /**
     * Atualiza o disco
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (this.isStatic) return;

        // Aplica atrito
        this.velocity.scaleSelf(Math.pow(0.985, deltaTime * 60));
        
        // Para se estiver muito lento
        if (this.velocity.magSq() < 0.01) {
            this.velocity.set(0, 0);
        }

        // Atualiza posição
        this.position.addSelf(this.velocity.scale(deltaTime));
        
        // Smooth para renderização suave
        this.smoothPosition.lerpSelf(this.position, 0.85);
        this.smoothVelocity.lerpSelf(this.velocity, 0.85);

        // Rotação baseada no movimento
        if (this.velocity.mag() > 0.5) {
            this.rotationSpeed = this.velocity.cross(new Vec2(1, 0)) * 0.005;
            this.rotation += this.rotationSpeed * deltaTime * 60;
        } else {
            this.rotationSpeed *= 0.95;
            this.rotation += this.rotationSpeed * deltaTime * 60;
        }
    }

    /**
     * Renderiza o disco
     * @param {CanvasRenderingContext2D} ctx 
     * @param {FieldRenderer} renderer 
     */
    render(ctx, renderer) {
        const pos = renderer ? 
            renderer.worldToScreen(this.smoothPosition.x, this.smoothPosition.y) :
            { x: this.smoothPosition.x, y: this.smoothPosition.y };

        const radius = this.radius * (renderer?.scale || 1);
        const isActive = this.isActive && this.isMovable;

        ctx.save();

        // Sombra
        ctx.shadowColor = this.colors.shadow;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Glow se estiver ativo
        if (isActive) {
            const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2);
            glow.addColorStop(0, this.colors.glow);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Corpo do disco (gradiente 3D)
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

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Borda metálica
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2);
        ctx.stroke();

        // Reflexo
        const reflection = ctx.createRadialGradient(
            pos.x - radius * 0.25,
            pos.y - radius * 0.35,
            0,
            pos.x - radius * 0.25,
            pos.y - radius * 0.35,
            radius * 0.6
        );
        reflection.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        reflection.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = reflection;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Brilho especular
        const specular = ctx.createRadialGradient(
            pos.x - radius * 0.3,
            pos.y - radius * 0.4,
            0,
            pos.x - radius * 0.3,
            pos.y - radius * 0.4,
            radius * 0.25
        );
        specular.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        specular.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = specular;
        ctx.beginPath();
        ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.4, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Indicador de seleção (borda dourada)
        if (isActive) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    _darkenColor(color, amount) {
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);
        r = Math.floor(r * (1 - amount));
        g = Math.floor(g * (1 - amount));
        b = Math.floor(b * (1 - amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Aplica uma força ao disco
     * @param {Vec2} force 
     */
    applyForce(force) {
        if (this.isStatic) return;
        this.velocity.addSelf(force.scale(1 / this.mass));
    }

    /**
     * Aplica um impulso ao disco
     * @param {Vec2} impulse 
     */
    applyImpulse(impulse) {
        if (this.isStatic) return;
        this.velocity.addSelf(impulse.scale(1 / this.mass));
    }

    /** @returns {Object} Estatísticas do disco */
    getStats() {
        return {
            id: this.id,
            team: this.team,
            position: this.position,
            velocity: this.velocity,
            speed: this.velocity.mag(),
            isActive: this.isActive,
            isMovable: this.isMovable,
        };
    }
}
