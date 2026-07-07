// engine/ai.js — Sistema de Inteligência Artificial para oponentes
// Níveis: Fácil, Médio, Difícil, Especialista
// Cálculos: Força, Ângulo, Defesa, Ataque, Rebotes
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DA IA
    // ============================================================
    const AIConfig = {
        // Níveis
        levels: {
            easy: {
                name: 'Fácil',
                accuracy: 0.4,
                powerVariation: 0.4,
                angleVariation: 0.4,
                defensePriority: 0.3,
                attackPriority: 0.7,
                reactionTime: 1.0,
                predictionQuality: 0.3,
                riskTolerance: 0.2,
            },
            medium: {
                name: 'Médio',
                accuracy: 0.65,
                powerVariation: 0.25,
                angleVariation: 0.25,
                defensePriority: 0.45,
                attackPriority: 0.55,
                reactionTime: 0.6,
                predictionQuality: 0.6,
                riskTolerance: 0.4,
            },
            hard: {
                name: 'Difícil',
                accuracy: 0.85,
                powerVariation: 0.15,
                angleVariation: 0.15,
                defensePriority: 0.6,
                attackPriority: 0.4,
                reactionTime: 0.3,
                predictionQuality: 0.85,
                riskTolerance: 0.6,
            },
            expert: {
                name: 'Especialista',
                accuracy: 0.95,
                powerVariation: 0.08,
                angleVariation: 0.08,
                defensePriority: 0.7,
                attackPriority: 0.3,
                reactionTime: 0.15,
                predictionQuality: 0.95,
                riskTolerance: 0.8,
            },
        },

        // Física
        physics: {
            maxForce: 800,
            minForce: 50,
            friction: 0.985,
            restitution: 0.7,
        },

        // Estratégia
        strategy: {
            aimAtGoalWeight: 1.0,
            avoidFouls: true,
            useBounces: true,
            considerObstacles: true,
        },
    };

    // ============================================================
    // 2. CLASSE DE IA
    // ============================================================
    class AIPlayer {
        constructor(options = {}) {
            // Configuração
            this.config = { ...AIConfig, ...options };
            this.level = options.level || 'medium';
            this.params = { ...this.config.levels[this.level] };

            // Estado
            this.thinking = false;
            this.thinkingTime = 0;
            this.reactionDelay = 0;
            this.lastShot = null;
            this.aimTarget = null;
            this.strategy = 'balanced';

            // Referências
            this.game = null;
            this.physics = null;
            this.ball = null;
            this.discs = [];
            this.opponentDiscs = [];

            // Estatísticas
            this.stats = {
                shots: 0,
                goals: 0,
                blocks: 0,
                accuracy: 0,
                averagePower: 0,
            };

            // Bind
            this._calculateShot = this._calculateShot.bind(this);
            this._evaluatePosition = this._evaluatePosition.bind(this);
            this._predictBallMovement = this._predictBallMovement.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init(game, physics, ball, discs, opponentDiscs) {
            this.game = game;
            this.physics = physics;
            this.ball = ball;
            this.discs = discs;
            this.opponentDiscs = opponentDiscs;
            this.reactionDelay = this.params.reactionTime * (0.5 + Math.random() * 0.5);

            console.log(`[AI] IA ${this.params.name} inicializada`);
            return this;
        }

        // ============================================================
        // 4. MÉTODO PRINCIPAL - TOMADA DE DECISÃO
        // ============================================================

        takeTurn() {
            if (!this.game || this.game.phase !== 'idle') return null;

            this.thinking = true;
            this.thinkingTime = 0;

            // Encontra o melhor disco para jogar
            const bestDisc = this._findBestDisc();
            if (!bestDisc) return null;

            // Calcula o melhor chute
            const shot = this._calculateShot(bestDisc);
            if (!shot) return null;

            // Aplica variação baseada no nível
            const finalShot = this._applyVariation(shot);

            // Simula o tempo de reação
            setTimeout(() => {
                this.thinking = false;
                this._executeShot(bestDisc, finalShot);
            }, this.reactionDelay * 1000);

            return {
                disc: bestDisc,
                shot: finalShot,
                delay: this.reactionDelay,
            };
        }

        // ============================================================
        // 5. ENCONTRA O MELHOR DISCO
        // ============================================================

        _findBestDisc() {
            if (!this.discs || this.discs.length === 0) return null;

            // Filtra discos disponíveis
            const available = this.discs.filter(d => d.isActive && d.isMovable);
            if (available.length === 0) return null;

            let best = null;
            let bestScore = -Infinity;

            for (const disc of available) {
                const score = this._evaluateDisc(disc);
                if (score > bestScore) {
                    bestScore = score;
                    best = disc;
                }
            }

            return best;
        }

        _evaluateDisc(disc) {
            if (!disc) return -Infinity;

            let score = 0;

            // 1. Proximidade da bola
            const distToBall = disc.position.distance(this.ball.position);
            score += Math.max(0, 300 - distToBall) * 0.3;

            // 2. Proximidade do gol adversário
            const goalPos = this._getGoalPosition();
            const distToGoal = disc.position.distance(goalPos);
            score += Math.max(0, 400 - distToGoal) * 0.2;

            // 3. Posição defensiva (se necessário)
            if (this.params.defensePriority > 0.3) {
                const defensiveScore = this._evaluateDefensive(disc);
                score += defensiveScore * this.params.defensePriority;
            }

            // 4. Potencial de ataque
            const attackScore = this._evaluateAttack(disc);
            score += attackScore * (1 - this.params.defensePriority);

            // 5. Ângulo de chute
            const angleScore = this._evaluateAngle(disc);
            score += angleScore * 0.2;

            // 6. Aleatoriedade (para variar o jogo)
            score += (Math.random() - 0.5) * 20;

            return score;
        }

        // ============================================================
        // 6. CÁLCULO DO CHUTE
        // ============================================================

        _calculateShot(disc) {
            if (!disc) return null;

            const ballPos = this.ball.position;
            const discPos = disc.position;

            // Alvo: gol adversário
            const target = this._getAimTarget();

            // Calcula direção para o alvo
            const dx = target.x - discPos.x;
            const dy = target.y - discPos.y;
            const angle = Math.atan2(dy, dx);

            // Calcula força baseada na distância
            const distance = Math.sqrt(dx * dx + dy * dy);
            const baseForce = Math.min(
                this.config.physics.maxForce,
                distance * 0.8 + 50
            );

            // Ajusta força baseada no nível
            const power = baseForce * (0.8 + Math.random() * 0.4);

            // Considera rebotes
            let finalAngle = angle;
            if (this.params.useBounces) {
                const bounceInfo = this._calculateBounce(discPos, target, angle);
                if (bounceInfo) {
                    finalAngle = bounceInfo.angle;
                }
            }

            return {
                angle: finalAngle,
                force: Math.max(this.config.physics.minForce, Math.min(this.config.physics.maxForce, power)),
                target: target,
                distance: distance,
                prediction: this._predictBallMovement(discPos, finalAngle, power),
            };
        }

        // ============================================================
        // 7. ALVO DO CHUTE
        // ============================================================

        _getAimTarget() {
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;
            const goalWidth = this.game?.renderer?.config?.goal?.width || 120;

            // Alvo principal: centro do gol
            let target = {
                x: fieldWidth + 20,
                y: fieldHeight / 2,
            };

            // Verifica se é o time azul (joga para direita) ou vermelho (joga para esquerda)
            const isBlue = this.discs[0]?.team === 'blue';
            const goalSide = isBlue ? 1 : -1;

            target.x = isBlue ? fieldWidth + 20 : -20;

            // Adiciona variação baseada no nível
            const variation = this.params.accuracy * 0.5;
            const randomOffset = (Math.random() - 0.5) * goalWidth * (1 - variation) * 2;
            target.y = fieldHeight / 2 + randomOffset;

            // Às vezes mira nos cantos (especialista)
            if (this.params.accuracy > 0.7 && Math.random() < 0.4) {
                const corner = Math.random() > 0.5 ? -1 : 1;
                target.y = fieldHeight / 2 + corner * goalWidth * 0.4;
            }

            // Considera posição do goleiro (simplificado)
            if (this.params.accuracy > 0.8 && this.opponentDiscs.length > 0) {
                // Desvia do disco mais próximo do gol
                const nearestDefender = this._findNearestDefender(target);
                if (nearestDefender) {
                    const dx = target.x - nearestDefender.position.x;
                    const dy = target.y - nearestDefender.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        target.y += (dy / dist) * 40 * (1 - this.params.accuracy);
                    }
                }
            }

            return target;
        }

        // ============================================================
        // 8. AVALIAÇÃO DEFENSIVA
        // ============================================================

        _evaluateDefensive(disc) {
            let score = 0;

            // 1. Posição entre a bola e o gol
            const goalPos = this._getGoalPosition();
            const ballPos = this.ball.position;
            const discPos = disc.position;

            const toGoal = goalPos.sub(ballPos);
            const toDisc = discPos.sub(ballPos);

            const angleDiff = Math.abs(Math.atan2(toGoal.y, toGoal.x) - Math.atan2(toDisc.y, toDisc.x));
            score += Math.max(0, 0.5 - angleDiff / Math.PI) * 50;

            // 2. Distância da bola
            const distToBall = discPos.distance(ballPos);
            score += Math.max(0, 200 - distToBall) * 0.2;

            // 3. Cobertura de áreas
            const gridScore = this._evaluateGridCoverage(disc);
            score += gridScore * 0.3;

            return score;
        }

        // ============================================================
        // 9. AVALIAÇÃO DE ATAQUE
        // ============================================================

        _evaluateAttack(disc) {
            let score = 0;

            const discPos = disc.position;
            const ballPos = this.ball.position;
            const goalPos = this._getGoalPosition();

            // 1. Posição ofensiva
            const distToGoal = discPos.distance(goalPos);
            score += Math.max(0, 400 - distToGoal) * 0.3;

            // 2. Ângulo de ataque
            const angle = Math.atan2(goalPos.y - discPos.y, goalPos.x - discPos.x);
            const ballAngle = Math.atan2(ballPos.y - discPos.y, ballPos.x - discPos.x);
            const angleDiff = Math.abs(angle - ballAngle);
            score += Math.max(0, 0.5 - angleDiff / Math.PI) * 20;

            // 3. Espaço para chute
            const space = this._evaluateSpace(disc);
            score += space * 0.2;

            // 4. Potencial de rebote
            const bouncePotential = this._evaluateBouncePotential(disc);
            score += bouncePotential * 0.15;

            return score;
        }

        // ============================================================
        // 10. AVALIAÇÃO DE ÂNGULO
        // ============================================================

        _evaluateAngle(disc) {
            const discPos = disc.position;
            const ballPos = this.ball.position;

            // Ângulo ideal para chute
            const goalPos = this._getGoalPosition();
            const idealAngle = Math.atan2(goalPos.y - ballPos.y, goalPos.x - ballPos.x);
            const currentAngle = Math.atan2(discPos.y - ballPos.y, discPos.x - ballPos.x);

            // Quanto menor a diferença, melhor
            const angleDiff = Math.abs(idealAngle - currentAngle);
            return Math.max(0, 1 - angleDiff / Math.PI) * 30;
        }

        // ============================================================
        // 11. CÁLCULO DE REBOTES
        // ============================================================

        _calculateBounce(from, target, angle) {
            // Simula rebotes nas paredes
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;

            // Projeta a trajetória
            const steps = 30;
            let x = from.x;
            let y = from.y;
            let vx = Math.cos(angle);
            let vy = Math.sin(angle);
            let bounced = false;

            for (let i = 0; i < steps; i++) {
                x += vx * 20;
                y += vy * 20;

                // Rebote nas bordas
                if (x < 0 || x > fieldWidth) {
                    vx *= -1;
                    bounced = true;
                }
                if (y < 0 || y > fieldHeight) {
                    vy *= -1;
                    bounced = true;
                }

                // Verifica se chegou perto do alvo
                if (Math.abs(x - target.x) < 30 && Math.abs(y - target.y) < 30) {
                    if (bounced) {
                        return {
                            angle: Math.atan2(vy, vx),
                            bounceCount: this._countBounces(from, target, angle),
                        };
                    }
                    break;
                }
            }

            return null;
        }

        _countBounces(from, target, angle) {
            let count = 0;
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;

            let x = from.x;
            let y = from.y;
            let vx = Math.cos(angle);
            let vy = Math.sin(angle);

            for (let i = 0; i < 50; i++) {
                x += vx * 20;
                y += vy * 20;

                if (x < 0 || x > fieldWidth) {
                    vx *= -1;
                    count++;
                }
                if (y < 0 || y > fieldHeight) {
                    vy *= -1;
                    count++;
                }

                if (Math.abs(x - target.x) < 20 && Math.abs(y - target.y) < 20) {
                    break;
                }
            }

            return count;
        }

        // ============================================================
        // 12. PREDIÇÃO DE MOVIMENTO DA BOLA
        // ============================================================

        _predictBallMovement(position, angle, force) {
            const predictions = [];
            const steps = 20;
            const dt = 0.1;

            let x = position.x;
            let y = position.y;
            let vx = Math.cos(angle) * force * 0.1;
            let vy = Math.sin(angle) * force * 0.1;
            const friction = this.config.physics.friction;
            const gravity = 0;

            for (let i = 0; i < steps; i++) {
                x += vx * dt;
                y += vy * dt;
                vx *= friction;
                vy *= friction;
                vy += gravity * dt;

                predictions.push({ x, y });

                // Verifica se parou
                if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) break;
            }

            return predictions;
        }

        // ============================================================
        // 13. APLICA VARIAÇÃO BASEADA NO NÍVEL
        // ============================================================

        _applyVariation(shot) {
            if (!shot) return null;

            const accuracy = this.params.accuracy;
            const powerVar = this.params.powerVariation;
            const angleVar = this.params.angleVariation;

            // Variação de força
            const powerMultiplier = 1 + (Math.random() - 0.5) * powerVar * 0.3;
            const force = shot.force * powerMultiplier;

            // Variação de ângulo
            const angleOffset = (Math.random() - 0.5) * angleVar * 0.5;
            const angle = shot.angle + angleOffset;

            // Erro proposital baseado na dificuldade
            const errorChance = 1 - accuracy;
            let finalAngle = angle;
            let finalForce = force;

            if (Math.random() < errorChance) {
                // Erro aleatório
                const errorMagnitude = (1 - accuracy) * 0.3;
                finalAngle += (Math.random() - 0.5) * errorMagnitude;
                finalForce *= (0.8 + Math.random() * 0.4);
            }

            return {
                angle: finalAngle,
                force: Math.max(this.config.physics.minForce, Math.min(this.config.physics.maxForce, finalForce)),
                target: shot.target,
                distance: shot.distance,
                prediction: shot.prediction,
            };
        }

        // ============================================================
        // 14. EXECUTA O CHUTE
        // ============================================================

        _executeShot(disc, shot) {
            if (!disc || !shot) return;

            const impulseX = Math.cos(shot.angle) * shot.force * 0.1;
            const impulseY = Math.sin(shot.angle) * shot.force * 0.1;

            disc.velocity.set(impulseX, impulseY);
            disc.rotationSpeed = (Math.random() - 0.5) * 5;

            disc.isActive = false;
            disc.isMovable = false;

            this.stats.shots++;

            if (this.game) {
                this.game.phase = 'shooting';
                this.game.currentPlayer = this.game.players[this.discs[0]?.team || 'red'];
                this.game._onInputShoot({
                    disc: disc,
                    force: shot.force,
                    angle: shot.angle,
                });
            }

            console.log(`[AI] ${this.params.name} disparou! Força: ${shot.force.toFixed(0)}, Ângulo: ${(shot.angle * 180 / Math.PI).toFixed(1)}°`);
        }

        // ============================================================
        // 15. UTILITÁRIOS
        // ============================================================

        _getGoalPosition() {
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;
            const isBlue = this.discs[0]?.team === 'blue';

            return {
                x: isBlue ? fieldWidth + 20 : -20,
                y: fieldHeight / 2,
            };
        }

        _findNearestDefender(target) {
            let nearest = null;
            let minDist = Infinity;

            for (const disc of this.opponentDiscs) {
                if (!disc.isActive) continue;
                const dist = disc.position.distance(target);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = disc;
                }
            }

            return nearest;
        }

        _evaluateGridCoverage(disc) {
            // Avalia cobertura de áreas do campo
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;
            const discPos = disc.position;

            // Divide o campo em zonas
            const zones = [
                { x: fieldWidth * 0.25, y: fieldHeight * 0.25, weight: 0.3 },
                { x: fieldWidth * 0.25, y: fieldHeight * 0.75, weight: 0.3 },
                { x: fieldWidth * 0.5, y: fieldHeight * 0.5, weight: 0.2 },
                { x: fieldWidth * 0.75, y: fieldHeight * 0.25, weight: 0.1 },
                { x: fieldWidth * 0.75, y: fieldHeight * 0.75, weight: 0.1 },
            ];

            let score = 0;
            for (const zone of zones) {
                const dist = discPos.distance(zone);
                const proximity = Math.max(0, 150 - dist) / 150;
                score += proximity * zone.weight;
            }

            return score * 30;
        }

        _evaluateSpace(disc) {
            // Avalia espaço disponível para chute
            const discPos = disc.position;
            let score = 100;

            // Verifica obstáculos (discos adversários)
            for (const opponent of this.opponentDiscs) {
                if (!opponent.isActive) continue;
                const dist = discPos.distance(opponent.position);
                if (dist < 80) {
                    score -= (80 - dist) / 80 * 50;
                }
            }

            // Distância das paredes
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;
            const minDistToWall = Math.min(
                discPos.x,
                fieldWidth - discPos.x,
                discPos.y,
                fieldHeight - discPos.y
            );
            if (minDistToWall < 30) {
                score -= (30 - minDistToWall) / 30 * 30;
            }

            return Math.max(0, score / 100);
        }

        _evaluateBouncePotential(disc) {
            const discPos = disc.position;
            const goalPos = this._getGoalPosition();

            // Verifica se há ângulo para rebote
            const angle = Math.atan2(goalPos.y - discPos.y, goalPos.x - discPos.x);
            const fieldWidth = this.game?.renderer?.fieldWidth || 800;
            const fieldHeight = this.game?.renderer?.fieldHeight || 500;

            // Projeta trajetória
            let x = discPos.x;
            let y = discPos.y;
            let vx = Math.cos(angle);
            let vy = Math.sin(angle);
            let bounces = 0;

            for (let i = 0; i < 30; i++) {
                x += vx * 20;
                y += vy * 20;

                if (x < 0 || x > fieldWidth || y < 0 || y > fieldHeight) {
                    bounces++;
                    if (bounces > 2) break;
                }

                if (Math.abs(x - goalPos.x) < 50 && Math.abs(y - goalPos.y) < 50) {
                    return Math.min(1, bounces / 2) * 30;
                }
            }

            return 0;
        }

        // ============================================================
        // 16. MUDANÇA DE ESTRATÉGIA
        // ============================================================

        setStrategy(strategy) {
            this.strategy = strategy;

            // Ajusta parâmetros baseado na estratégia
            switch (strategy) {
                case 'aggressive':
                    this.params.attackPriority = 0.8;
                    this.params.defensePriority = 0.2;
                    break;
                case 'defensive':
                    this.params.attackPriority = 0.2;
                    this.params.defensePriority = 0.8;
                    break;
                case 'balanced':
                default:
                    this.params.attackPriority = 0.5;
                    this.params.defensePriority = 0.5;
                    break;
            }

            return this;
        }

        // ============================================================
        // 17. MUDANÇA DE NÍVEL
        // ============================================================

        setLevel(level) {
            if (this.config.levels[level]) {
                this.level = level;
                this.params = { ...this.config.levels[level] };
                this.reactionDelay = this.params.reactionTime * (0.5 + Math.random() * 0.5);
                return true;
            }
            return false;
        }

        // ============================================================
        // 18. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                level: this.level,
                name: this.params.name,
                shots: this.stats.shots,
                goals: this.stats.goals,
                blocks: this.stats.blocks,
                accuracy: this.stats.shots > 0 ? (this.stats.goals / this.stats.shots) : 0,
                averagePower: this.stats.averagePower,
                thinking: this.thinking,
                strategy: this.strategy,
                reactionDelay: this.reactionDelay,
            };
        }

        // ============================================================
        // 19. RESET
        // ============================================================

        reset() {
            this.thinking = false;
            this.thinkingTime = 0;
            this.lastShot = null;
            this.aimTarget = null;
            this.stats = {
                shots: 0,
                goals: 0,
                blocks: 0,
                accuracy: 0,
                averagePower: 0,
            };
            return this;
        }
    }

    // ============================================================
    // 20. FACTORY PARA CRIAÇÃO DE IA
    // ============================================================

    class AIFactory {
        static create(level, options = {}) {
            return new AIPlayer({
                ...options,
                level: level,
            });
        }

        static createEasy(options = {}) {
            return new AIPlayer({ ...options, level: 'easy' });
        }

        static createMedium(options = {}) {
            return new AIPlayer({ ...options, level: 'medium' });
        }

        static createHard(options = {}) {
            return new AIPlayer({ ...options, level: 'hard' });
        }

        static createExpert(options = {}) {
            return new AIPlayer({ ...options, level: 'expert' });
        }
    }

    // ============================================================
    // 21. EXPORTAÇÃO
    // ============================================================

    const AIModule = {
        Config: AIConfig,
        AIPlayer: AIPlayer,
        AIFactory: AIFactory,

        create: (level, options) => new AIPlayer({ ...options, level: level }),
    };

    // ============================================================
    // 22. EXPORTA PARA O GLOBAL
    // ============================================================

    global.AIModule = AIModule;
    global.AIPlayer = AIPlayer;
    global.AIFactory = AIFactory;

    console.log('[AI] Módulo de inteligência artificial carregado');

})(typeof window !== 'undefined' ? window : this);
