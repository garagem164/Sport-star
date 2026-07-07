// engine/physics.js — Física otimizada (versão unificada)
(function(global) {
    'use strict';

    const { Vec2 } = global;

    // ============================================================
    // 1. CORPO FÍSICO
    // ============================================================
    class PhysicsBody {
        constructor(options = {}) {
            this.mass = options.mass || 1;
            this.invMass = this.mass > 0 ? 1 / this.mass : 0;
            
            this.position = options.position || new Vec2(0, 0);
            this.velocity = options.velocity || new Vec2(0, 0);
            this.acceleration = options.acceleration || new Vec2(0, 0);
            
            this.angle = options.angle || 0;
            this.angularVelocity = options.angularVelocity || 0;
            this.inertia = options.inertia || 1;
            this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
            
            this.friction = options.friction || 0.5;
            this.restitution = options.restitution || 0.5;
            this.damping = options.damping || 0.99;
            
            this.isStatic = options.isStatic || false;
            this.isKinematic = options.isKinematic || false;
            this.collisionRadius = options.collisionRadius || 0;
            
            this.id = PhysicsBody._nextId++;
            this.userData = options.userData || {};
            this._force = new Vec2(0, 0);
            this._torque = 0;
        }

        static _nextId = 1;

        addForce(force) {
            if (this.isStatic || this.isKinematic) return this;
            this._force.addSelf(force);
            return this;
        }

        addTorque(torque) {
            if (this.isStatic || this.isKinematic) return this;
            this._torque += torque;
            return this;
        }

        applyImpulse(impulse) {
            if (this.isStatic) return this;
            if (this.invMass > 0) {
                this.velocity.addSelf(impulse.scale(this.invMass));
            }
            return this;
        }

        reset() {
            this.velocity.set(0, 0);
            this.acceleration.set(0, 0);
            this.angularVelocity = 0;
            this._force.set(0, 0);
            this._torque = 0;
            return this;
        }

        getSpeed() { return this.velocity.mag(); }
        getMomentum() { return this.velocity.scale(this.mass); }
        isMoving(threshold = 0.001) {
            return this.velocity.magSq() > threshold * threshold;
        }
    }

    // ============================================================
    // 2. SISTEMA DE FÍSICA
    // ============================================================
    class PhysicsSystem {
        constructor(options = {}) {
            this.gravity = options.gravity || new Vec2(0, 9.8);
            this.damping = options.damping || 0.98;
            this.substeps = options.substeps || 4;
            this.bodies = [];
            this.gravityEnabled = true;
            this.isPaused = false;
        }

        addBody(body) {
            this.bodies.push(body);
            return body;
        }

        removeBody(body) {
            const idx = this.bodies.indexOf(body);
            if (idx !== -1) this.bodies.splice(idx, 1);
            return this;
        }

        clear() {
            this.bodies = [];
            return this;
        }

        update(deltaTime) {
            if (this.isPaused) return;
            
            const dt = Math.min(deltaTime, 0.05);
            const subDt = dt / this.substeps;
            
            for (let step = 0; step < this.substeps; step++) {
                this._step(subDt);
            }
        }

        _step(deltaTime) {
            // Aplica forças
            for (const body of this.bodies) {
                if (body.isStatic) continue;
                
                if (this.gravityEnabled && !body.isKinematic) {
                    const gravForce = this.gravity.scale(body.mass);
                    body._force.addSelf(gravForce);
                }
                
                if (body.invMass > 0) {
                    body.acceleration.copy(body._force.scale(body.invMass));
                } else {
                    body.acceleration.set(0, 0);
                }
            }

            // Integra velocidades
            for (const body of this.bodies) {
                if (body.isStatic || body.isKinematic) continue;
                
                body.velocity.addSelf(body.acceleration.scale(deltaTime));
                body.angularVelocity += body._torque * body.invInertia * deltaTime;
                
                // Aplica damping
                body.velocity.scaleSelf(Math.pow(this.damping, deltaTime * 60));
                body.angularVelocity *= Math.pow(this.damping, deltaTime * 60);
                
                // Clamp
                const maxV = 1000;
                if (body.velocity.magSq() > maxV * maxV) {
                    body.velocity.normalizeSelf().scaleSelf(maxV);
                }
            }

            // Integra posições
            for (const body of this.bodies) {
                if (body.isStatic) continue;
                
                if (!body.isKinematic) {
                    body.position.addSelf(body.velocity.scale(deltaTime));
                    body.angle += body.angularVelocity * deltaTime;
                }
            }

            // Limpa forças
            for (const body of this.bodies) {
                body._force.set(0, 0);
                body._torque = 0;
            }
        }

        getStats() {
            return {
                bodyCount: this.bodies.length,
                isPaused: this.isPaused,
            };
        }
    }

    // ============================================================
    // 3. EXPORTAÇÃO
    // ============================================================
    const Physics = {
        Body: PhysicsBody,
        System: PhysicsSystem,
        createBody: (o) => new PhysicsBody(o),
        createSystem: (o) => new PhysicsSystem(o),
    };

    global.Physics = Physics;
    global.PhysicsBody = PhysicsBody;
    global.PhysicsSystem = PhysicsSystem;

    console.log('[Physics] Carregado');

})(typeof window !== 'undefined' ? window : this);
