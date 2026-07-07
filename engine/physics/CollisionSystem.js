/**
 * Sistema de detecção e resolução de colisões
 * @class CollisionSystem
 */
class CollisionSystem {
    constructor() {
        this.collisions = [];
        this.iterationCount = 0;
    }

    /**
     * Detecta e resolve colisões entre todos os objetos
     * @param {Array} discs - Lista de discos
     * @param {Ball} ball - Bola
     * @param {Object} field - Configurações do campo
     */
    resolveAll(discs, ball, field) {
        this.collisions = [];
        this.iterationCount = 0;

        // Resolve colisões com múltiplas iterações para estabilidade
        for (let iter = 0; iter < 3; iter++) {
            this.iterationCount++;

            // Disco x Disco
            for (let i = 0; i < discs.length; i++) {
                for (let j = i + 1; j < discs.length; j++) {
                    this._resolveDiscDisc(discs[i], discs[j]);
                }
            }

            // Disco x Bola
            for (const disc of discs) {
                this._resolveDiscBall(disc, ball);
            }

            // Disco x Parede
            for (const disc of discs) {
                this._resolveDiscWall(disc, field);
            }

            // Bola x Parede
            this._resolveBallWall(ball, field);
        }

        return this.collisions;
    }

    /**
     * Resolve colisão Disco x Disco
     * @private
     */
    _resolveDiscDisc(a, b) {
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;

        if (distSq >= minDist * minDist || distSq < 1e-12) return;

        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Correção de posição
        const totalMass = a.mass + b.mass;
        const correctionA = overlap * (b.mass / totalMass) * 0.6;
        const correctionB = overlap * (a.mass / totalMass) * 0.6;

        if (!a.isStatic) {
            a.position.x -= nx * correctionA;
            a.position.y -= ny * correctionA;
        }
        if (!b.isStatic) {
            b.position.x += nx * correctionB;
            b.position.y += ny * correctionB;
        }

        // Velocidade relativa
        const relVx = a.velocity.x - b.velocity.x;
        const relVy = a.velocity.y - b.velocity.y;
        const relVn = relVx * nx + relVy * ny;

        if (relVn > 0) return;

        // Impulso
        const restitution = Math.min(a.restitution || 0.7, b.restitution || 0.7);
        const j = -(1 + restitution) * relVn / (a.invMass + b.invMass);

        const impulseX = j * nx;
        const impulseY = j * ny;

        if (!a.isStatic) {
            a.velocity.x += impulseX * a.invMass;
            a.velocity.y += impulseY * a.invMass;
        }
        if (!b.isStatic) {
            b.velocity.x -= impulseX * b.invMass;
            b.velocity.y -= impulseY * b.invMass;
        }

        // Atrito
        const tx = -ny;
        const ty = nx;
        const relVt = relVx * tx + relVy * ty;
        const friction = Math.min(a.friction || 0.3, b.friction || 0.3);
        const jt = -friction * relVt / (a.invMass + b.invMass);

        if (!a.isStatic) {
            a.velocity.x += jt * tx * a.invMass;
            a.velocity.y += jt * ty * a.invMass;
        }
        if (!b.isStatic) {
            b.velocity.x -= jt * tx * b.invMass;
            b.velocity.y -= jt * ty * b.invMass;
        }

        this.collisions.push({ type: 'disc-disc', a, b, overlap });
    }

    /**
     * Resolve colisão Disco x Bola
     * @private
     */
    _resolveDiscBall(disc, ball) {
        if (!ball) return;

        const dx = ball.position.x - disc.position.x;
        const dy = ball.position.y - disc.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = disc.radius + ball.radius;

        if (distSq >= minDist * minDist || distSq < 1e-12) return;

        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Correção de posição
        const totalMass = disc.mass + ball.mass;
        const correctionDisc = overlap * (ball.mass / totalMass) * 0.6;
        const correctionBall = overlap * (disc.mass / totalMass) * 0.6;

        if (!disc.isStatic) {
            disc.position.x -= nx * correctionDisc;
            disc.position.y -= ny * correctionDisc;
        }
        if (!ball.isStatic) {
            ball.position.x += nx * correctionBall;
            ball.position.y += ny * correctionBall;
        }

        // Velocidade relativa
        const relVx = disc.velocity.x - ball.velocity.x;
        const relVy = disc.velocity.y - ball.velocity.y;
        const relVn = relVx * nx + relVy * ny;

        if (relVn > 0) return;

        // Impulso
        const restitution = Math.min(disc.restitution || 0.7, ball.restitution || 0.8);
        const j = -(1 + restitution) * relVn / (disc.invMass + ball.invMass);

        const impulseX = j * nx;
        const impulseY = j * ny;

        if (!disc.isStatic) {
            disc.velocity.x += impulseX * disc.invMass;
            disc.velocity.y += impulseY * disc.invMass;
        }
        if (!ball.isStatic) {
            ball.velocity.x -= impulseX * ball.invMass;
            ball.velocity.y -= impulseY * ball.invMass;
        }

        this.collisions.push({ type: 'disc-ball', disc, ball, overlap });
    }

    /**
     * Resolve colisão Disco x Parede
     * @private
     */
    _resolveDiscWall(disc, field) {
        const radius = disc.radius;
        const margin = 0;

        // Parede esquerda
        if (disc.position.x - radius < margin) {
            disc.position.x = margin + radius;
            if (disc.velocity.x < 0) {
                disc.velocity.x *= -disc.restitution;
                disc.velocity.y *= 0.98;
            }
        }

        // Parede direita
        if (disc.position.x + radius > field.width - margin) {
            disc.position.x = field.width - margin - radius;
            if (disc.velocity.x > 0) {
                disc.velocity.x *= -disc.restitution;
                disc.velocity.y *= 0.98;
            }
        }

        // Parede superior
        if (disc.position.y - radius < margin) {
            disc.position.y = margin + radius;
            if (disc.velocity.y < 0) {
                disc.velocity.y *= -disc.restitution;
                disc.velocity.x *= 0.98;
            }
        }

        // Parede inferior
        if (disc.position.y + radius > field.height - margin) {
            disc.position.y = field.height - margin - radius;
            if (disc.velocity.y > 0) {
                disc.velocity.y *= -disc.restitution;
                disc.velocity.x *= 0.98;
            }
        }
    }

    /**
     * Resolve colisão Bola x Parede
     * @private
     */
    _resolveBallWall(ball, field) {
        if (!ball) return;

        const radius = ball.radius;
        const margin = 0;

        // Parede esquerda
        if (ball.position.x - radius < margin) {
            ball.position.x = margin + radius;
            if (ball.velocity.x < 0) {
                ball.velocity.x *= -ball.restitution;
                ball.velocity.y *= 0.98;
            }
        }

        // Parede direita
        if (ball.position.x + radius > field.width - margin) {
            ball.position.x = field.width - margin - radius;
            if (ball.velocity.x > 0) {
                ball.velocity.x *= -ball.restitution;
                ball.velocity.y *= 0.98;
            }
        }

        // Parede superior
        if (ball.position.y - radius < margin) {
            ball.position.y = margin + radius;
            if (ball.velocity.y < 0) {
                ball.velocity.y *= -ball.restitution;
                ball.velocity.x *= 0.98;
            }
        }

        // Parede inferior
        if (ball.position.y + radius > field.height - margin) {
            ball.position.y = field.height - margin - radius;
            if (ball.velocity.y > 0) {
                ball.velocity.y *= -ball.restitution;
                ball.velocity.x *= 0.98;
            }
        }
    }

    /** @returns {Array} Lista de colisões detectadas */
    getCollisions() {
        return this.collisions;
    }
}
