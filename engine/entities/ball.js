/**
 * Bola do jogo com visual premium
 * @class Ball
 */
class Ball {
    /**
     * @param {Object} options
     * @param {Vec2} options.position - Posição inicial
     * @param {number} options.radius - Raio da bola
     */
    constructor(options = {}) {
        this.id = Ball._nextId++;
        this.position = options.position || new Vec2(0, 0);
        this.velocity = options.velocity || new Vec2(0, 0);
        this.radius = options.radius || 12;
        this.mass = options.mass || 0.5;
        this.restitution = options.restitution || 0.8;
        this.friction = options.friction || 0.2;
        
        this.isStatic = false;
        this.rotation = 0;
        this.rotationSpeed = 0;
        
        // Smooth para animação
        this.smoothPosition = this.position.clone();
        this.smoothVelocity = this.velocity.clone();
        
        // Cores
        this.colors = {
            primary: '#F5F5F5',
            secondary: '#E8E8E8',
            dark: '#CCCCCC',
            panel: '#D8D8D8',
            panelDark: '#B8B8B8',
            shadow: 'rgba(0, 0, 0, 0.25)',
        };
    }

    static _nextId = 1;

    /**
     * Atualiza a bola
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (this.isStatic) return;

        // Aplica atrito
        this.velocity.scaleSelf(Math.pow(0.99, deltaTime * 60));
        
        // Para se estiver muito lenta
        if (this.velocity.magSq() < 0.01) {
            this.velocity.set(0, 0);
        }

        // Atualiza posição
        this.position.addSelf(this.velocity.scale(deltaTime));
        
        // Smooth para renderização suave
        this.smoothPosition.lerpSelf(this.position, 0.9);
        this.smoothVelocity.lerpSelf(this.velocity, 0.9);

        // Rotação baseada no movimento
        if (this.velocity.mag() > 0.5) {
            this.rotationSpeed = this.velocity.mag() * 0.02;
            this.rotation += this.rotationSpeed * deltaTime * 60;
        } else {
            this.rotationSpeed *= 0.95;
            this.rotation += this.rotationSpeed * deltaTime * 60;
        }
    }

    /**
     * Renderiza a bola
     * @param {CanvasRenderingContext2D} ctx 
     * @param {FieldRenderer} renderer 
     */
    render(ctx, renderer) {
        const pos = renderer ? 
            renderer.worldToScreen(this.smoothPosition.x, this.smoothPosition.y) :
            { x: this.smoothPosition.x, y: this.smoothPosition.y };

        const radius = this.radius * (renderer?.scale || 1);

        ctx.save();

        // Sombra
        ctx.shadowColor = this.colors.shadow;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        // Corpo da bola (gradiente 3D)
        const gradient = ctx.createRadialGradient(
            pos.x - radius * 0.35,
            pos.y - radius * 0.35,
            radius * 0.05,
            pos.x,
            pos.y,
            radius
        );

        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, this.colors.primary);
        gradient.addColorStop(0.7, this.colors.secondary);
        gradient.addColorStop(0.9, this.colors.dark);
        gradient.addColorStop(1, '#B0B0B0');

        ctx.shadowBlur = 0;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Padrão da bola (hexágonos)
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(this.rotation);

        const panelRadius = radius * 0.7;
        const panels = 12;

        for (let i = 0; i < panels; i++) {
            const angle = (i / panels) * Math.PI * 2;
            const nextAngle = ((i + 1) / panels) * Math.PI * 2;

            const x1 = Math.cos(angle) * panelRadius;
            const y1 = Math.sin(angle) * panelRadius;
            const x2 = Math.cos(nextAngle) * panelRadius;
            const y2 = Math.sin(nextAngle) * panelRadius;

            const midAngle = (angle + nextAngle) / 2;
            const midX = Math.cos(midAngle) * panelRadius * 0.6;
            const midY = Math.sin(midAngle) * panelRadius * 0.6;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x1, y1);
            ctx.quadraticCurveTo(midX * 1.1, midY * 1.1, x2, y2);
            ctx.closePath();

            const shade = (i % 2 === 0) ? 0 : 0.1;
            ctx.fillStyle = i % 3 === 0 ? 
                `rgba(200, 200, 200, ${0.15 + shade})` :
                `rgba(180, 180, 180, ${0.1 + shade})`;
            ctx.fill();

            ctx.strokeStyle = 'rgba(60, 60, 60, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        ctx.restore();

        // Reflexo
        const reflection = ctx.createRadialGradient(
            pos.x - radius * 0.3,
            pos.y - radius * 0.35,
            0,
            pos.x - radius * 0.3,
            pos.y - radius * 0.35,
            radius * 0.6
        );
        reflection.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        reflection.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
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
            radius * 0.3
        );
        specular.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        specular.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = specular;
        ctx.beginPath();
        ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.4, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Aplica uma força à bola
     * @param {Vec2} force 
     */
    applyForce(force) {
        if (this.isStatic) return;
        this.velocity.addSelf(force.scale(1 / this.mass));
    }

    /**
     * Aplica um impulso à bola
     * @param {Vec2} impulse 
     */
    applyImpulse(impulse) {
        if (this.isStatic) return;
        this.velocity.addSelf(impulse.scale(1 / this.mass));
    }

    /** @returns {Object} Estatísticas da bola */
    getStats() {
        return {
            id: this.id,
            position: this.position,
            velocity: this.velocity,
            speed: this.velocity.mag(),
        };
    }
}
