// engine/physics.js — Sistema de Física 2D otimizado
// Massa, velocidade, aceleração, atrito, inércia, impulso,
// conservação de momento, colisões elásticas/inelásticas
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONSTANTES DE FÍSICA
    // ============================================================
    const PhysicsConst = {
        GRAVITY: 9.8,
        FRICTION_AIR: 0.999,
        FRICTION_GROUND: 0.85,
        RESTITUTION: 0.8,
        DAMPING: 0.98,
        MAX_VELOCITY: 1000,
        MIN_VELOCITY: 0.001,
        EPSILON: 1e-8,
        SUBSTEPS: 4,
        POSITION_CORRECTION: 0.4,
    };

    // ============================================================
    // 2. CORPO FÍSICO (Classe principal)
    // ============================================================
    class PhysicsBody {
        constructor(options = {}) {
            // Propriedades físicas
            this.mass = options.mass || 1.0;
            this.invMass = this.mass > 0 ? 1 / this.mass : 0;
            
            // Vetores de movimento
            this.position = options.position || new Vec2(0, 0);
            this.velocity = options.velocity || new Vec2(0, 0);
            this.acceleration = options.acceleration || new Vec2(0, 0);
            this.force = options.force || new Vec2(0, 0);
            
            // Propriedades de rotação (inércia)
            this.angle = options.angle || 0;
            this.angularVelocity = options.angularVelocity || 0;
            this.angularAcceleration = options.angularAcceleration || 0;
            this.torque = options.torque || 0;
            this.inertia = options.inertia || 1.0;
            this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
            
            // Atrito e amortecimento
            this.friction = options.friction || 0.5;
            this.restitution = options.restitution || 0.5;
            this.damping = options.damping || 0.99;
            this.airFriction = options.airFriction || 0.999;
            
            // Limites
            this.maxVelocity = options.maxVelocity || 1000;
            this.maxAngularVelocity = options.maxAngularVelocity || 50;
            
            // Estado
            this.isStatic = options.isStatic || false;
            this.isKinematic = options.isKinematic || false;
            this.isSleeping = options.isSleeping || false;
            this.sleepThreshold = options.sleepThreshold || 0.01;
            this.sleepTimer = 0;
            
            // Colisão
            this.collisionRadius = options.collisionRadius || 0;
            this.shape = options.shape || 'circle';
            this.width = options.width || 0;
            this.height = options.height || 0;
            
            // Dados do corpo
            this.id = PhysicsBody._nextId++;
            this.userData = options.userData || {};
            this.lastPosition = this.position.clone();
            this.prevVelocity = this.velocity.clone();
            
            // Forças acumuladas
            this._accumulatedForces = new Vec2(0, 0);
            this._accumulatedTorque = 0;
        }

        // --- Gerenciamento de ID ---
        static _nextId = 1;

        // --- Massa ---
        setMass(mass) {
            this.mass = Math.max(0.001, mass);
            this.invMass = this.mass > 0 ? 1 / this.mass : 0;
            return this;
        }

        // --- Inércia ---
        setInertia(inertia) {
            this.inertia = Math.max(0.001, inertia);
            this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
            return this;
        }

        // --- Forças ---
        addForce(force) {
            if (this.isStatic || this.isKinematic) return this;
            this._accumulatedForces.addSelf(force);
            return this;
        }

        addForceAt(force, point) {
            if (this.isStatic || this.isKinematic) return this;
            this._accumulatedForces.addSelf(force);
            
            // Calcula torque a partir do ponto de aplicação
            const r = point.sub(this.position);
            this._accumulatedTorque += r.cross(force);
            return this;
        }

        addTorque(torque) {
            if (this.isStatic || this.isKinematic) return this;
            this._accumulatedTorque += torque;
            return this;
        }

        // --- Impulso ---
        applyImpulse(impulse, contactPoint) {
            if (this.isStatic) return this;
            
            // Impulso linear
            if (this.invMass > 0) {
                this.velocity.addSelf(impulse.scale(this.invMass));
            }
            
            // Impulso angular
            if (contactPoint) {
                const r = contactPoint.sub(this.position);
                const torque = r.cross(impulse);
                if (this.invInertia > 0) {
                    this.angularVelocity += torque * this.invInertia;
                }
            }
            
            return this;
        }

        // --- Reset ---
        reset() {
            this.velocity.set(0, 0);
            this.acceleration.set(0, 0);
            this.force.set(0, 0);
            this.angularVelocity = 0;
            this.angularAcceleration = 0;
            this.torque = 0;
            this._accumulatedForces.set(0, 0);
            this._accumulatedTorque = 0;
            return this;
        }

        // --- Clone ---
        clone() {
            return new PhysicsBody({
                mass: this.mass,
                position: this.position.clone(),
                velocity: this.velocity.clone(),
                acceleration: this.acceleration.clone(),
                force: this.force.clone(),
                angle: this.angle,
                angularVelocity: this.angularVelocity,
                angularAcceleration: this.angularAcceleration,
                torque: this.torque,
                inertia: this.inertia,
                friction: this.friction,
                restitution: this.restitution,
                damping: this.damping,
                airFriction: this.airFriction,
                maxVelocity: this.maxVelocity,
                maxAngularVelocity: this.maxAngularVelocity,
                isStatic: this.isStatic,
                isKinematic: this.isKinematic,
                collisionRadius: this.collisionRadius,
                shape: this.shape,
                width: this.width,
                height: this.height,
                userData: { ...this.userData }
            });
        }

        // --- Utilitários ---
        getSpeed() {
            return this.velocity.magnitude();
        }

        getKineticEnergy() {
            const linear = 0.5 * this.mass * this.velocity.magnitudeSq();
            const angular = 0.5 * this.inertia * this.angularVelocity * this.angularVelocity;
            return linear + angular;
        }

        getMomentum() {
            return this.velocity.scale(this.mass);
        }

        getAngularMomentum() {
            return this.inertia * this.angularVelocity;
        }

        isMoving(threshold = 0.001) {
            return this.velocity.magnitudeSq() > threshold * threshold ||
                   Math.abs(this.angularVelocity) > threshold;
        }
    }

    // ============================================================
    // 3. SISTEMA DE FÍSICA
    // ============================================================
    class PhysicsSystem {
        constructor(options = {}) {
            // Configuração
            this.gravity = options.gravity || new Vec2(0, PhysicsConst.GRAVITY);
            this.damping = options.damping || PhysicsConst.DAMPING;
            this.airFriction = options.airFriction || PhysicsConst.FRICTION_AIR;
            this.substeps = options.substeps || PhysicsConst.SUBSTEPS;
            this.positionCorrection = options.positionCorrection || PhysicsConst.POSITION_CORRECTION;
            this.sleepEnabled = options.sleepEnabled !== undefined ? options.sleepEnabled : true;
            this.sleepThreshold = options.sleepThreshold || 0.01;
            
            // Coleções
            this.bodies = [];
            this.collisions = [];
            this.gravityEnabled = true;
            this.useSubstepping = true;
            
            // Estado
            this.time = 0;
            this.frameCount = 0;
            this.isPaused = false;
        }

        // --- Gerenciamento de corpos ---
        addBody(body) {
            this.bodies.push(body);
            return body;
        }

        removeBody(body) {
            const index = this.bodies.indexOf(body);
            if (index !== -1) {
                this.bodies.splice(index, 1);
                return true;
            }
            return false;
        }

        clear() {
            this.bodies = [];
            this.collisions = [];
            return this;
        }

        // --- Busca ---
        getBody(id) {
            return this.bodies.find(b => b.id === id) || null;
        }

        getBodiesInRadius(position, radius) {
            const radiusSq = radius * radius;
            return this.bodies.filter(body => {
                const distSq = body.position.distanceSq(position);
                return distSq <= radiusSq;
            });
        }

        // --- Atualização principal ---
        update(deltaTime) {
            if (this.isPaused) return;
            
            const dt = Math.min(deltaTime, 0.05);
            
            if (this.useSubstepping && this.substeps > 1) {
                const subDt = dt / this.substeps;
                for (let i = 0; i < this.substeps; i++) {
                    this._updateStep(subDt);
                }
            } else {
                this._updateStep(dt);
            }
            
            this.time += dt;
            this.frameCount++;
        }

        // --- Passo de atualização ---
        _updateStep(deltaTime) {
            // 1. Aplica forças (incluindo gravidade)
            this._applyForces(deltaTime);
            
            // 2. Integra velocidades
            this._integrateVelocities(deltaTime);
            
            // 3. Aplica atrito e amortecimento
            this._applyDamping(deltaTime);
            
            // 4. Integra posições
            this._integratePositions(deltaTime);
            
            // 5. Detecta e resolve colisões
            this._resolveCollisions();
            
            // 6. Atualiza estados de sono
            if (this.sleepEnabled) {
                this._updateSleep(deltaTime);
            }
            
            // 7. Limpa forças acumuladas
            this._clearForces();
        }

        // --- Aplicação de forças ---
        _applyForces(deltaTime) {
            for (const body of this.bodies) {
                if (body.isStatic) continue;
                
                // Gravidade
                if (this.gravityEnabled && !body.isKinematic) {
                    const gravForce = this.gravity.scale(body.mass);
                    body._accumulatedForces.addSelf(gravForce);
                }
                
                // Aplica forças acumuladas
                if (body.invMass > 0) {
                    body.acceleration.copy(body._accumulatedForces.scale(body.invMass));
                } else {
                    body.acceleration.set(0, 0);
                }
                
                // Aceleração angular
                if (body.invInertia > 0) {
                    body.angularAcceleration = body._accumulatedTorque * body.invInertia;
                } else {
                    body.angularAcceleration = 0;
                }
            }
        }

        // --- Integração de velocidades (Verlet-like com semi-implicit Euler) ---
        _integrateVelocities(deltaTime) {
            for (const body of this.bodies) {
                if (body.isStatic || body.isKinematic) continue;
                
                // Guarda velocidade anterior para detecção de colisão
                body.prevVelocity.copy(body.velocity);
                
                // Atualiza velocidade linear
                body.velocity.addSelf(body.acceleration.scale(deltaTime));
                
                // Atualiza velocidade angular
                body.angularVelocity += body.angularAcceleration * deltaTime;
                
                // Aplica limites de velocidade
                this._clampVelocity(body);
            }
        }

        // --- Integração de posições ---
        _integratePositions(deltaTime) {
            for (const body of this.bodies) {
                if (body.isStatic) continue;
                
                body.lastPosition.copy(body.position);
                
                if (!body.isKinematic) {
                    // Movimento normal
                    body.position.addSelf(body.velocity.scale(deltaTime));
                    body.angle += body.angularVelocity * deltaTime;
                } else {
                    // Movimento cinemático (posição é controlada externamente)
                    // Apenas atualiza ângulo se houver velocidade angular
                    body.angle += body.angularVelocity * deltaTime;
                }
            }
        }

        // --- Amortecimento e atrito ---
        _applyDamping(deltaTime) {
            const dampingFactor = Math.pow(this.damping, deltaTime);
            const airFrictionFactor = Math.pow(this.airFriction, deltaTime);
            
            for (const body of this.bodies) {
                if (body.isStatic) continue;
                
                if (!body.isKinematic) {
                    // Amortecimento linear
                    body.velocity.scaleSelf(dampingFactor);
                    
                    // Atrito do ar
                    body.velocity.scaleSelf(airFrictionFactor);
                    
                    // Amortecimento angular
                    body.angularVelocity *= dampingFactor;
                    body.angularVelocity *= airFrictionFactor;
                    
                    // Atrito de superfície (se estiver em contato com o chão)
                    if (body._groundContact) {
                        const groundFriction = 1 - (1 - body.friction) * deltaTime * 10;
                        body.velocity.scaleSelf(Math.max(0, groundFriction));
                    }
                }
                
                // Clamp final
                this._clampVelocity(body);
            }
        }

        // --- Clamp de velocidade ---
        _clampVelocity(body) {
            const speedSq = body.velocity.magnitudeSq();
            const maxSpeedSq = body.maxVelocity * body.maxVelocity;
            
            if (speedSq > maxSpeedSq) {
                const scale = Math.sqrt(maxSpeedSq / speedSq);
                body.velocity.scaleSelf(scale);
            }
            
            // Clamp angular
            if (Math.abs(body.angularVelocity) > body.maxAngularVelocity) {
                body.angularVelocity = Math.sign(body.angularVelocity) * body.maxAngularVelocity;
            }
        }

        // --- Resolução de colisões ---
        _resolveCollisions() {
            this.collisions = [];
            
            // Detecção simples: círculo-círculo
            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const a = this.bodies[i];
                    const b = this.bodies[j];
                    
                    if (a.isStatic && b.isStatic) continue;
                    if (a.isKinematic && b.isKinematic) continue;
                    
                    // Verifica colisão círculo-círculo
                    const result = this._circleCircleCollision(a, b);
                    if (result.hit) {
                        this.collisions.push(result);
                        this._resolveCollision(a, b, result);
                    }
                }
            }
            
            // Limpa flag de contato com o chão
            for (const body of this.bodies) {
                body._groundContact = false;
            }
        }

        // --- Detecção círculo-círculo ---
        _circleCircleCollision(a, b) {
            const radiusA = a.collisionRadius || 0;
            const radiusB = b.collisionRadius || 0;
            
            if (radiusA <= 0 || radiusB <= 0) return { hit: false };
            
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const distSq = dx * dx + dy * dy;
            const minDist = radiusA + radiusB;
            
            if (distSq >= minDist * minDist) return { hit: false };
            
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            
            // Normal de colisão
            let nx, ny;
            if (dist < 1e-8) {
                nx = 1;
                ny = 0;
            } else {
                nx = dx / dist;
                ny = dy / dist;
            }
            
            // Ponto de contato (média das posições na direção da normal)
            const contactX = (a.position.x + b.position.x) / 2;
            const contactY = (a.position.y + b.position.y) / 2;
            
            return {
                hit: true,
                a: a,
                b: b,
                normal: new Vec2(nx, ny),
                overlap: overlap,
                contact: new Vec2(contactX, contactY),
                dist: dist,
                radiusA: radiusA,
                radiusB: radiusB
            };
        }

        // --- Resolução de colisão (elástica/inelástica) ---
        _resolveCollision(a, b, collision) {
            const normal = collision.normal;
            const overlap = collision.overlap;
            
            // 1. Correção de posição (resolver sobreposição)
            if (this.positionCorrection > 0 && !a.isStatic && !b.isStatic) {
                const totalMass = a.mass + b.mass;
                const correctionA = overlap * (b.mass / totalMass) * this.positionCorrection;
                const correctionB = overlap * (a.mass / totalMass) * this.positionCorrection;
                
                if (!a.isStatic && !a.isKinematic) {
                    a.position.subSelf(normal.scale(correctionA));
                }
                if (!b.isStatic && !b.isKinematic) {
                    b.position.addSelf(normal.scale(correctionB));
                }
            }
            
            // 2. Cálculo da velocidade relativa
            const relVelocity = a.velocity.sub(b.velocity);
            const relVelocityNormal = relVelocity.dot(normal);
            
            // Se os corpos estão se afastando, não resolve
            if (relVelocityNormal > 0 && !a.isKinematic && !b.isKinematic) return;
            
            // 3. Coeficiente de restituição (média ponderada)
            const restitution = Math.min(a.restitution, b.restitution);
            
            // 4. Cálculo do impulso
            const totalMass = a.invMass + b.invMass;
            if (totalMass < 1e-8) return;
            
            const j = -(1 + restitution) * relVelocityNormal / totalMass;
            
            // 5. Aplica impulso
            const impulse = normal.scale(j);
            
            if (!a.isStatic && !a.isKinematic) {
                a.velocity.addSelf(impulse.scale(a.invMass));
            }
            if (!b.isStatic && !b.isKinematic) {
                b.velocity.subSelf(impulse.scale(b.invMass));
            }
            
            // 6. Aplica atrito (tangencial)
            const tangent = new Vec2(-normal.y, normal.x);
            const relVelocityTangent = relVelocity.dot(tangent);
            const friction = Math.min(a.friction, b.friction);
            const frictionImpulse = tangent.scale(-friction * relVelocityTangent);
            
            if (!a.isStatic && !a.isKinematic) {
                a.velocity.addSelf(frictionImpulse.scale(a.invMass));
            }
            if (!b.isStatic && !b.isKinematic) {
                b.velocity.subSelf(frictionImpulse.scale(b.invMass));
            }
            
            // 7. Flag de contato com o chão (para atrito)
            if (normal.y < -0.5) {
                a._groundContact = true;
                b._groundContact = true;
            }
        }

        // --- Atualização de sono ---
        _updateSleep(deltaTime) {
            for (const body of this.bodies) {
                if (body.isStatic || body.isKinematic) {
                    body.isSleeping = false;
                    continue;
                }
                
                const isMoving = body.isMoving(this.sleepThreshold);
                
                if (isMoving) {
                    body.sleepTimer = 0;
                    body.isSleeping = false;
                } else {
                    body.sleepTimer += deltaTime;
                    if (body.sleepTimer > 1.0) {
                        body.isSleeping = true;
                        // Congela o corpo quando dormindo
                        if (body.isSleeping) {
                            body.velocity.set(0, 0);
                            body.angularVelocity = 0;
                        }
                    }
                }
            }
        }

        // --- Limpeza de forças ---
        _clearForces() {
            for (const body of this.bodies) {
                body._accumulatedForces.set(0, 0);
                body._accumulatedTorque = 0;
            }
        }

        // --- Debug: visualização ---
        debugDraw(ctx) {
            for (const body of this.bodies) {
                // Desenha círculo de colisão
                if (body.collisionRadius > 0) {
                    ctx.strokeStyle = body.isStatic ? '#ff6b6b' : '#88c0ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(body.position.x, body.position.y, body.collisionRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Desenha vetor de velocidade
                    const vel = body.velocity;
                    const scale = 10;
                    ctx.strokeStyle = '#ffd93d';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(body.position.x, body.position.y);
                    ctx.lineTo(body.position.x + vel.x * scale, body.position.y + vel.y * scale);
                    ctx.stroke();
                    
                    // Ponto central
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(body.position.x, body.position.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // --- Estatísticas ---
        getStats() {
            return {
                bodyCount: this.bodies.length,
                collisionCount: this.collisions.length,
                time: this.time,
                frameCount: this.frameCount,
                isPaused: this.isPaused,
                sleepCount: this.bodies.filter(b => b.isSleeping).length
            };
        }
    }

    // ============================================================
    // 4. EXPORTAÇÃO
    // ============================================================
    const Physics = {
        // Constantes
        Const: PhysicsConst,
        
        // Classes
        Body: PhysicsBody,
        System: PhysicsSystem,
        
        // Funções utilitárias
        createBody: (options) => new PhysicsBody(options),
        createSystem: (options) => new PhysicsSystem(options),
        
        // Utilitários de colisão
        circleCircleCollision: (a, b) => {
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const distSq = dx * dx + dy * dy;
            const minDist = a.collisionRadius + b.collisionRadius;
            
            if (distSq >= minDist * minDist) return null;
            
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = dist > 0 ? dx / dist : 1;
            const ny = dist > 0 ? dy / dist : 0;
            
            return {
                hit: true,
                normal: new Vec2(nx, ny),
                overlap: overlap,
                dist: dist
            };
        },
        
        // Conversão de unidades
        kgToMass: (kg) => kg,
        massToKg: (mass) => mass,
        mToPixels: (m, scale = 100) => m * scale,
        pixelsToM: (px, scale = 100) => px / scale,
    };

    // ============================================================
    // 5. EXPORTA PARA O GLOBAL
    // ============================================================
    global.Physics = Physics;
    global.PhysicsBody = PhysicsBody;
    global.PhysicsSystem = PhysicsSystem;

    console.log('[Physics] Módulo de física 2D carregado.');

})(typeof window !== 'undefined' ? window : this);
