// engine/collisions.js — Sistema de Colisões 2D otimizado
// Disco x Disco, Disco x Bola, Bola x Parede, Disco x Parede
// Correção de sobreposição, colisão elástica, sem atravessar objetos, sem vibração
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONSTANTES DE COLISÃO
    // ============================================================
    const CollisionConst = {
        EPSILON: 1e-8,
        POSITION_CORRECTION: 0.6, // Fator de correção de sobreposição (0-1)
        SLOP: 0.01, // Tolerância para evitar vibração
        BAUMGARTE: 0.2, // Fator de correção de posição (Baumgarte stabilization)
        MAX_CORRECTION: 0.5, // Correção máxima por frame
        ITERATIONS: 3, // Iterações para resolução de colisões
    };

    // ============================================================
    // 2. TIPOS DE CORPO PARA COLISÃO
    // ============================================================
    const BodyType = {
        CIRCLE: 'circle',
        DISC: 'disc', // Círculo com massa (disco)
        BALL: 'ball', // Bola (círculo menor, mais leve)
        WALL: 'wall', // Parede (infinita ou segmento)
        RECT: 'rect', // Retângulo (futuro)
    };

    // ============================================================
    // 3. ESTRUTURA DE COLISÃO
    // ============================================================
    class Collision {
        constructor() {
            this.hit = false;
            this.a = null;
            this.b = null;
            this.normal = new Vec2(0, 0);
            this.contact = new Vec2(0, 0);
            this.overlap = 0;
            this.restitution = 0.5;
            this.friction = 0.3;
            this.massA = 1;
            this.massB = 1;
            this.invMassA = 1;
            this.invMassB = 1;
            this.impulse = 0;
            this.tangent = new Vec2(0, 0);
        }

        reset() {
            this.hit = false;
            this.a = null;
            this.b = null;
            this.normal.set(0, 0);
            this.contact.set(0, 0);
            this.overlap = 0;
            this.restitution = 0.5;
            this.friction = 0.3;
            this.impulse = 0;
            this.tangent.set(0, 0);
            return this;
        }
    }

    // ============================================================
    // 4. SISTEMA DE COLISÕES
    // ============================================================
    class CollisionSystem {
        constructor(options = {}) {
            this.positionCorrection = options.positionCorrection || CollisionConst.POSITION_CORRECTION;
            this.slop = options.slop || CollisionConst.SLOP;
            this.baumgarte = options.baumgarte || CollisionConst.BAUMGARTE;
            this.iterations = options.iterations || CollisionConst.ITERATIONS;
            this.maxCorrection = options.maxCorrection || CollisionConst.MAX_CORRECTION;
            
            // Cache para otimização
            this._collisionCache = new Map();
            this._tempVec = new Vec2(0, 0);
            this._tempVec2 = new Vec2(0, 0);
            
            // Estatísticas
            this.collisionCount = 0;
            this.iterationCount = 0;
        }

        // ============================================================
        // 5. DETECÇÃO DE COLISÕES
        // ============================================================

        // --- Disco x Disco (Círculo x Círculo) ---
        circleCircle(a, b, result = null) {
            if (!result) result = new Collision();
            result.reset();

            const radiusA = a.collisionRadius || 0;
            const radiusB = b.collisionRadius || 0;

            if (radiusA <= 0 || radiusB <= 0) return result;

            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const distSq = dx * dx + dy * dy;
            const minDist = radiusA + radiusB;

            if (distSq >= minDist * minDist || distSq < 1e-12) {
                return result;
            }

            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;

            result.hit = true;
            result.a = a;
            result.b = b;
            result.overlap = overlap;
            result.restitution = Math.min(a.restitution || 0.5, b.restitution || 0.5);
            result.friction = Math.min(a.friction || 0.3, b.friction || 0.3);
            result.massA = a.mass || 1;
            result.massB = b.mass || 1;
            result.invMassA = a.invMass || (result.massA > 0 ? 1 / result.massA : 0);
            result.invMassB = b.invMass || (result.massB > 0 ? 1 / result.massB : 0);

            // Normal de colisão
            result.normal.set(dx / dist, dy / dist);

            // Ponto de contato (média dos centros na direção da normal)
            const totalMass = result.massA + result.massB;
            if (totalMass > 0) {
                const ratioA = result.massB / totalMass;
                const ratioB = result.massA / totalMass;
                result.contact.x = a.position.x + result.normal.x * radiusA * ratioA + 
                                   b.position.x - result.normal.x * radiusB * ratioB;
                result.contact.y = a.position.y + result.normal.y * radiusA * ratioA + 
                                   b.position.y - result.normal.y * radiusB * ratioB;
            } else {
                result.contact.set(
                    (a.position.x + b.position.x) * 0.5,
                    (a.position.y + b.position.y) * 0.5
                );
            }

            // Tangente
            result.tangent.set(-result.normal.y, result.normal.x);

            return result;
        }

        // --- Disco x Bola (Círculo x Círculo com massas diferentes) ---
        discBall(disc, ball, result = null) {
            // Disc é mais pesado, Ball é mais leve
            return this.circleCircle(disc, ball, result);
        }

        // --- Bola x Parede (Círculo x Segmento/Plano) ---
        ballWall(ball, wall, result = null) {
            if (!result) result = new Collision();
            result.reset();

            const radius = ball.collisionRadius || 0;
            if (radius <= 0) return result;

            // Parede definida por ponto e normal (plano infinito)
            // wall.position = ponto na parede, wall.normal = normal da parede (apontando para fora)
            const wallPos = wall.position || new Vec2(0, 0);
            const wallNormal = wall.normal || new Vec2(0, -1);
            
            // Distância do centro da bola à parede
            const d = ball.position.sub(wallPos).dot(wallNormal);
            
            // Se a bola está além da parede (d > radius) ou muito perto
            if (d > radius - CollisionConst.EPSILON) {
                return result;
            }

            const overlap = radius - d;

            result.hit = true;
            result.a = ball;
            result.b = wall;
            result.overlap = overlap;
            result.restitution = Math.min(ball.restitution || 0.5, wall.restitution || 0.8);
            result.friction = Math.min(ball.friction || 0.3, wall.friction || 0.5);
            result.massA = ball.mass || 1;
            result.massB = Infinity; // Parede tem massa infinita
            result.invMassA = ball.invMass || (result.massA > 0 ? 1 / result.massA : 0);
            result.invMassB = 0;

            // Normal da parede (apontando para a bola)
            result.normal.copy(wallNormal);

            // Ponto de contato na parede
            const contactOffset = result.normal.scale(radius);
            result.contact.copy(ball.position);
            result.contact.subSelf(contactOffset);

            // Tangente
            result.tangent.set(-result.normal.y, result.normal.x);

            return result;
        }

        // --- Disco x Parede (Círculo x Segmento/Plano) ---
        discWall(disc, wall, result = null) {
            // Disc é mais pesado, mas mesma lógica da bola
            const temp = this.ballWall(disc, wall, result);
            if (temp.hit) {
                temp.massA = disc.mass || 1;
                temp.invMassA = disc.invMass || (temp.massA > 0 ? 1 / temp.massA : 0);
                temp.restitution = Math.min(disc.restitution || 0.5, wall.restitution || 0.6);
            }
            return temp;
        }

        // --- Bola x Parede com segmento (para paredes finitas) ---
        ballWallSegment(ball, wallStart, wallEnd, result = null) {
            if (!result) result = new Collision();
            result.reset();

            const radius = ball.collisionRadius || 0;
            if (radius <= 0) return result;

            // Encontra o ponto mais próximo no segmento
            const closest = this._closestPointOnSegment(
                ball.position.x, ball.position.y,
                wallStart.x, wallStart.y,
                wallEnd.x, wallEnd.y
            );

            const dx = ball.position.x - closest.x;
            const dy = ball.position.y - closest.y;
            const distSq = dx * dx + dy * dy;

            if (distSq >= radius * radius) return result;

            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;

            result.hit = true;
            result.a = ball;
            result.overlap = overlap;
            result.restitution = ball.restitution || 0.5;
            result.friction = ball.friction || 0.3;
            result.massA = ball.mass || 1;
            result.invMassA = ball.invMass || (result.massA > 0 ? 1 / result.massA : 0);
            result.massB = Infinity;
            result.invMassB = 0;

            // Normal (apontando do ponto mais próximo para a bola)
            if (dist < CollisionConst.EPSILON) {
                result.normal.set(0, -1);
            } else {
                result.normal.set(dx / dist, dy / dist);
            }

            result.contact.copy(closest);
            result.tangent.set(-result.normal.y, result.normal.x);

            return result;
        }

        // --- Disco x Parede com segmento ---
        discWallSegment(disc, wallStart, wallEnd, result = null) {
            const temp = this.ballWallSegment(disc, wallStart, wallEnd, result);
            if (temp.hit) {
                temp.massA = disc.mass || 1;
                temp.invMassA = disc.invMass || (temp.massA > 0 ? 1 / temp.massA : 0);
                temp.restitution = Math.min(disc.restitution || 0.5, 0.6);
            }
            return temp;
        }

        // ============================================================
        // 6. RESOLUÇÃO DE COLISÕES (com correção de sobreposição)
        // ============================================================

        resolveCollision(collision) {
            if (!collision || !collision.hit) return;

            const { a, b, normal, tangent, overlap, restitution, friction, invMassA, invMassB } = collision;

            // --- 1. Correção de posição (sobreposição) ---
            this._correctPosition(a, b, normal, overlap, invMassA, invMassB);

            // --- 2. Resolução de velocidade (impulso) ---
            this._resolveVelocity(a, b, normal, tangent, restitution, friction, invMassA, invMassB);

            // --- 3. Correção de posição adicional (Baumgarte) ---
            this._baumgarteCorrection(a, b, normal, overlap, invMassA, invMassB);
        }

        // --- Correção de posição (evita sobreposição) ---
        _correctPosition(a, b, normal, overlap, invMassA, invMassB) {
            const totalMass = invMassA + invMassB;
            if (totalMass < CollisionConst.EPSILON) return;

            const correction = overlap * this.positionCorrection;
            const maxCorrection = this.maxCorrection;

            const correctionA = Math.min(correction * (invMassA / totalMass), maxCorrection);
            const correctionB = Math.min(correction * (invMassB / totalMass), maxCorrection);

            if (invMassA > 0 && !a.isStatic && !a.isKinematic) {
                a.position.subSelf(normal.scale(correctionA));
            }
            if (invMassB > 0 && !b.isStatic && !b.isKinematic) {
                b.position.addSelf(normal.scale(correctionB));
            }
        }

        // --- Resolução de velocidade (impulso elástico/inelástico) ---
        _resolveVelocity(a, b, normal, tangent, restitution, friction, invMassA, invMassB) {
            if (invMassA === 0 && invMassB === 0) return;

            const totalMass = invMassA + invMassB;
            if (totalMass < CollisionConst.EPSILON) return;

            // Velocidade relativa
            const velA = a.velocity || new Vec2(0, 0);
            const velB = b.velocity || new Vec2(0, 0);
            const relVelocity = velA.sub(velB);

            // Velocidade normal
            const relVelNormal = relVelocity.dot(normal);

            // Se corpos estão se afastando, não resolve (exceto se for parede)
            if (relVelNormal > 0 && invMassA > 0 && invMassB > 0) return;

            // Cálculo do impulso normal
            const j = -(1 + restitution) * relVelNormal / totalMass;
            const impulse = normal.scale(j);

            // Aplica impulso normal
            if (invMassA > 0 && !a.isStatic) {
                a.velocity.addSelf(impulse.scale(invMassA));
            }
            if (invMassB > 0 && !b.isStatic) {
                b.velocity.subSelf(impulse.scale(invMassB));
            }

            // --- Impulso tangencial (atrito) ---
            const relVelTangent = relVelocity.dot(tangent);
            const jt = -friction * relVelTangent / totalMass;
            const tangentImpulse = tangent.scale(jt);

            if (invMassA > 0 && !a.isStatic) {
                a.velocity.addSelf(tangentImpulse.scale(invMassA));
            }
            if (invMassB > 0 && !b.isStatic) {
                b.velocity.subSelf(tangentImpulse.scale(invMassB));
            }

            // --- Amortecimento para evitar vibração ---
            const damping = 0.95;
            if (invMassA > 0 && !a.isStatic) {
                a.velocity.scaleSelf(damping);
            }
            if (invMassB > 0 && !b.isStatic) {
                b.velocity.scaleSelf(damping);
            }
        }

        // --- Correção Baumgarte (estabilização adicional) ---
        _baumgarteCorrection(a, b, normal, overlap, invMassA, invMassB) {
            if (overlap < CollisionConst.SLOP) return;

            const totalMass = invMassA + invMassB;
            if (totalMass < CollisionConst.EPSILON) return;

            const correction = overlap * this.baumgarte;
            const maxCorrection = this.maxCorrection * 0.5;

            const correctionA = Math.min(correction * (invMassA / totalMass), maxCorrection);
            const correctionB = Math.min(correction * (invMassB / totalMass), maxCorrection);

            if (invMassA > 0 && !a.isStatic) {
                a.position.subSelf(normal.scale(correctionA));
            }
            if (invMassB > 0 && !b.isStatic) {
                b.position.addSelf(normal.scale(correctionB));
            }
        }

        // ============================================================
        // 7. UTILITÁRIOS
        // ============================================================

        // --- Ponto mais próximo em um segmento ---
        _closestPointOnSegment(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;

            if (lenSq < CollisionConst.EPSILON) {
                return new Vec2(x1, y1);
            }

            let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));

            return new Vec2(x1 + t * dx, y1 + t * dy);
        }

        // --- Verifica se dois círculos se sobrepõem (rápido) ---
        circleOverlap(a, b) {
            const radiusA = a.collisionRadius || 0;
            const radiusB = b.collisionRadius || 0;
            const distSq = a.position.distanceSq(b.position);
            const minDist = radiusA + radiusB;
            return distSq < minDist * minDist;
        }

        // --- Calcula a profundidade de penetração (overlap) ---
        penetrationDepth(a, b) {
            const radiusA = a.collisionRadius || 0;
            const radiusB = b.collisionRadius || 0;
            const dist = a.position.distance(b.position);
            const minDist = radiusA + radiusB;
            return Math.max(0, minDist - dist);
        }

        // ============================================================
        // 8. SISTEMA COMPLETO DE COLISÃO (múltiplas iterações)
        // ============================================================

        solveCollisions(bodies, collisions) {
            this.collisionCount = 0;
            this.iterationCount = 0;

            if (!collisions) {
                collisions = this.detectCollisions(bodies);
            }

            // Múltiplas iterações para estabilidade
            for (let iter = 0; iter < this.iterations; iter++) {
                this.iterationCount++;
                let resolved = 0;

                for (const collision of collisions) {
                    if (!collision.hit) continue;
                    this.resolveCollision(collision);
                    resolved++;
                }

                this.collisionCount += resolved;

                // Se poucas colisões, podemos parar mais cedo
                if (resolved < 5 && iter > 0) break;
            }

            return collisions;
        }

        // --- Detecção de todas as colisões (batch) ---
        detectCollisions(bodies) {
            const collisions = [];

            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const a = bodies[i];
                    const b = bodies[j];

                    // Pula corpos estáticos ou dormindo
                    if ((a.isStatic && b.isStatic) || (a.isSleeping && b.isSleeping)) continue;

                    // Detecta colisão baseado nos tipos
                    let collision = null;

                    const typeA = a.bodyType || BodyType.CIRCLE;
                    const typeB = b.bodyType || BodyType.CIRCLE;

                    // Ambos círculos
                    if ((typeA === BodyType.CIRCLE || typeA === BodyType.DISC || typeA === BodyType.BALL) &&
                        (typeB === BodyType.CIRCLE || typeB === BodyType.DISC || typeB === BodyType.BALL)) {
                        collision = this.circleCircle(a, b);
                    }

                    if (collision && collision.hit) {
                        collisions.push(collision);
                    }
                }
            }

            return collisions;
        }

        // --- Detecta colisões com paredes ---
        detectWallCollisions(bodies, walls) {
            const collisions = [];

            for (const body of bodies) {
                if (body.isStatic || body.isSleeping) continue;

                for (const wall of walls) {
                    let collision = null;

                    // Wall pode ser plano ou segmento
                    if (wall.start && wall.end) {
                        // Segmento
                        if (body.bodyType === BodyType.BALL || body.bodyType === BodyType.DISC || body.bodyType === BodyType.CIRCLE) {
                            collision = this.ballWallSegment(body, wall.start, wall.end);
                        }
                    } else {
                        // Plano infinito
                        if (body.bodyType === BodyType.BALL || body.bodyType === BodyType.DISC || body.bodyType === BodyType.CIRCLE) {
                            collision = this.ballWall(body, wall);
                        }
                    }

                    if (collision && collision.hit) {
                        collisions.push(collision);
                    }
                }
            }

            return collisions;
        }

        // ============================================================
        // 9. RESET E LIMPEZA
        // ============================================================

        reset() {
            this._collisionCache.clear();
            this.collisionCount = 0;
            this.iterationCount = 0;
            return this;
        }

        // ============================================================
        // 10. DEBUG VISUAL
        // ============================================================

        debugDraw(ctx, collisions) {
            if (!collisions) return;

            for (const collision of collisions) {
                if (!collision.hit) continue;

                // Desenha normal
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(collision.contact.x, collision.contact.y);
                ctx.lineTo(
                    collision.contact.x + collision.normal.x * 30,
                    collision.contact.y + collision.normal.y * 30
                );
                ctx.stroke();
                ctx.setLineDash([]);

                // Desenha ponto de contato
                ctx.fillStyle = '#ffd93d';
                ctx.beginPath();
                ctx.arc(collision.contact.x, collision.contact.y, 4, 0, Math.PI * 2);
                ctx.fill();

                // Desenha overlap
                ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(
                    (collision.a.position.x + collision.b.position.x) * 0.5,
                    (collision.a.position.y + collision.b.position.y) * 0.5,
                    collision.overlap * 10,
                    0, Math.PI * 2
                );
                ctx.stroke();
            }
        }
    }

    // ============================================================
    // 11. EXPORTAÇÃO
    // ============================================================

    const Collisions = {
        // Constantes
        Const: CollisionConst,
        BodyType: BodyType,

        // Classes
        Collision: Collision,
        System: CollisionSystem,

        // Funções utilitárias
        createSystem: (options) => new CollisionSystem(options),
        createCollision: () => new Collision(),

        // Funções de detecção rápidas (estáticas)
        circleCircle: (a, b) => {
            const system = new CollisionSystem();
            return system.circleCircle(a, b);
        },

        ballWall: (ball, wall) => {
            const system = new CollisionSystem();
            return system.ballWall(ball, wall);
        },

        ballWallSegment: (ball, start, end) => {
            const system = new CollisionSystem();
            return system.ballWallSegment(ball, start, end);
        },

        closestPointOnSegment: (px, py, x1, y1, x2, y2) => {
            const system = new CollisionSystem();
            return system._closestPointOnSegment(px, py, x1, y1, x2, y2);
        },

        circleOverlap: (a, b) => {
            return new CollisionSystem().circleOverlap(a, b);
        },

        penetrationDepth: (a, b) => {
            return new CollisionSystem().penetrationDepth(a, b);
        },
    };

    // ============================================================
    // 12. EXPORTA PARA O GLOBAL
    // ============================================================

    global.Collisions = Collisions;
    global.CollisionSystem = CollisionSystem;
    global.Collision = Collision;
    global.BodyType = BodyType;

    console.log('[Collisions] Módulo de colisões 2D carregado.');

})(typeof window !== 'undefined' ? window : this);
