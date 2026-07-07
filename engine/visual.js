// engine/visual.js — Sistema de efeitos visuais premium
// Sombras, Brilho, Reflexos, Animações, Transições
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES VISUAIS
    // ============================================================
    const VisualConfig = {
        // Sombras
        shadows: {
            enabled: true,
            quality: 'high', // 'low', 'medium', 'high', 'ultra'
            blur: 20,
            offset: { x: 2, y: 4 },
            opacity: 0.3,
            color: 'rgba(0, 0, 0, 0.2)',
        },

        // Brilho
        glow: {
            enabled: true,
            intensity: 0.5,
            blur: 30,
            color: 'rgba(255, 255, 255, 0.1)',
        },

        // Reflexos
        reflections: {
            enabled: true,
            intensity: 0.6,
            blur: 8,
            opacity: 0.3,
        },

        // Animações
        animations: {
            enabled: true,
            duration: 0.5,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            spring: {
                damping: 0.8,
                stiffness: 120,
                mass: 1,
            },
        },

        // Transições
        transitions: {
            enabled: true,
            duration: 0.3,
            easing: 'ease-in-out',
            fade: {
                duration: 0.4,
                easing: 'ease-out',
            },
            slide: {
                duration: 0.5,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
        },

        // Qualidade
        quality: {
            shadowSamples: 8,
            glowSamples: 12,
            reflectionSamples: 6,
            antialiasing: true,
        },
    };

    // ============================================================
    // 2. GESTOR DE SOMBRAS
    // ============================================================
    class ShadowManager {
        constructor(options = {}) {
            this.config = { ...VisualConfig.shadows, ...options };
            this.cache = new Map();
            this.enabled = this.config.enabled;
        }

        // Aplica sombra a um contexto
        applyShadow(ctx, x, y, blur, color) {
            if (!this.enabled) return;

            const b = blur || this.config.blur;
            const c = color || this.config.color;
            const ox = this.config.offset.x;
            const oy = this.config.offset.y;

            ctx.shadowColor = c;
            ctx.shadowBlur = b;
            ctx.shadowOffsetX = ox;
            ctx.shadowOffsetY = oy;
        }

        // Remove sombra
        removeShadow(ctx) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Cria sombra de caixa (box shadow)
        createBoxShadow(ctx, x, y, width, height, radius = 0) {
            if (!this.enabled) return;

            const b = this.config.blur * 0.5;
            const ox = this.config.offset.x;
            const oy = this.config.offset.y;
            const color = this.config.color;

            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = b;
            ctx.shadowOffsetX = ox;
            ctx.shadowOffsetY = oy;

            if (radius > 0) {
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, radius);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, width, height);
            }

            ctx.restore();
        }

        // Cria sombra projetada para objeto
        createDropShadow(ctx, x, y, radius, color = null) {
            if (!this.enabled) return;

            const b = radius * 1.5 || this.config.blur;
            const c = color || this.config.color;
            const ox = this.config.offset.x;
            const oy = this.config.offset.y;

            ctx.shadowColor = c;
            ctx.shadowBlur = b;
            ctx.shadowOffsetX = ox;
            ctx.shadowOffsetY = oy;
        }

        // Qualidade
        setQuality(quality) {
            this.config.quality = quality;
            switch (quality) {
                case 'low':
                    this.config.blur = 10;
                    this.config.offset = { x: 1, y: 2 };
                    break;
                case 'medium':
                    this.config.blur = 15;
                    this.config.offset = { x: 2, y: 3 };
                    break;
                case 'high':
                    this.config.blur = 20;
                    this.config.offset = { x: 2, y: 4 };
                    break;
                case 'ultra':
                    this.config.blur = 30;
                    this.config.offset = { x: 3, y: 5 };
                    break;
            }
            return this;
        }

        destroy() {
            this.cache.clear();
        }
    }

    // ============================================================
    // 3. GESTOR DE BRILHO (GLOW)
    // ============================================================
    class GlowManager {
        constructor(options = {}) {
            this.config = { ...VisualConfig.glow, ...options };
            this.cache = new Map();
            this.enabled = this.config.enabled;
        }

        // Cria brilho ao redor de um objeto
        createGlow(ctx, x, y, radius, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity;
            const b = radius * 2 || this.config.blur;
            const c = color || this.config.color;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, b);
            gradient.addColorStop(0, c);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.globalAlpha = i;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, b, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Cria brilho interno (inner glow)
        createInnerGlow(ctx, x, y, radius, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity * 0.5;
            const c = color || this.config.color;

            const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
            gradient.addColorStop(0, c);
            gradient.addColorStop(0.7, c);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.globalAlpha = i;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Cria brilho direcional (como luz)
        createDirectionalGlow(ctx, x, y, angle, length, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity * 0.6;
            const c = color || this.config.color;

            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;

            const gradient = ctx.createLinearGradient(x, y, endX, endY);
            gradient.addColorStop(0, c);
            gradient.addColorStop(0.5, c);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.globalAlpha = i;
            ctx.fillStyle = gradient;
            ctx.fillRect(x - length * 0.2, y - length * 0.2, length * 0.4, length * 0.4);
            ctx.restore();
        }

        // Aplica glow a um caminho
        applyPathGlow(ctx, pathFn, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity;

            ctx.save();
            ctx.globalAlpha = i;
            ctx.shadowColor = color;
            ctx.shadowBlur = this.config.blur;
            pathFn();
            ctx.restore();
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.blur = 15;
                    this.config.intensity = 0.3;
                    break;
                case 'medium':
                    this.config.blur = 25;
                    this.config.intensity = 0.5;
                    break;
                case 'high':
                    this.config.blur = 35;
                    this.config.intensity = 0.6;
                    break;
                case 'ultra':
                    this.config.blur = 50;
                    this.config.intensity = 0.8;
                    break;
            }
            return this;
        }

        destroy() {
            this.cache.clear();
        }
    }

    // ============================================================
    // 4. GESTOR DE REFLEXOS
    // ============================================================
    class ReflectionManager {
        constructor(options = {}) {
            this.config = { ...VisualConfig.reflections, ...options };
            this.cache = new Map();
            this.enabled = this.config.enabled;
        }

        // Cria reflexo esférico (como em uma bola)
        createSphericalReflection(ctx, x, y, radius, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity;
            const c = color || 'rgba(255, 255, 255, 0.3)';

            const rx = x - radius * 0.3;
            const ry = y - radius * 0.35;
            const r = radius * 0.5;

            const gradient = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
            gradient.addColorStop(0, c);
            gradient.addColorStop(0.5, c);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.globalAlpha = i;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Cria reflexo de superfície (como em água ou metal)
        createSurfaceReflection(ctx, x, y, width, height, color, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity * 0.5;
            const c = color || 'rgba(255, 255, 255, 0.15)';

            const gradient = ctx.createLinearGradient(x, y, x, y + height);
            gradient.addColorStop(0, c);
            gradient.addColorStop(0.3, c);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.globalAlpha = i;
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, height);
            ctx.restore();
        }

        // Cria reflexo de ambiente (como em uma janela)
        createAmbientReflection(ctx, x, y, width, height, intensity = null) {
            if (!this.enabled) return;

            const i = intensity || this.config.intensity * 0.3;

            const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${i * 0.2})`);
            gradient.addColorStop(0.3, `rgba(255, 255, 255, ${i * 0.05})`);
            gradient.addColorStop(0.7, `rgba(255, 255, 255, ${i * 0.05})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, ${i * 0.2})`);

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, height);
            ctx.restore();
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.intensity = 0.3;
                    this.config.blur = 4;
                    break;
                case 'medium':
                    this.config.intensity = 0.5;
                    this.config.blur = 6;
                    break;
                case 'high':
                    this.config.intensity = 0.6;
                    this.config.blur = 8;
                    break;
                case 'ultra':
                    this.config.intensity = 0.8;
                    this.config.blur = 12;
                    break;
            }
            return this;
        }

        destroy() {
            this.cache.clear();
        }
    }

    // ============================================================
    // 5. SISTEMA DE ANIMAÇÃO
    // ============================================================
    class AnimationSystem {
        constructor(options = {}) {
            this.config = { ...VisualConfig.animations, ...options };
            this.animations = [];
            this.springs = new Map();
            this.enabled = this.config.enabled;
        }

        // Cria uma animação
        create(target, props, duration, easing = null) {
            if (!this.enabled) return null;

            const anim = {
                target: target,
                props: props,
                duration: duration || this.config.duration,
                easing: easing || this.config.easing,
                startTime: performance.now(),
                startValues: {},
                currentValues: {},
                completed: false,
                onUpdate: null,
                onComplete: null,
            };

            // Captura valores iniciais
            for (const [key, value] of Object.entries(props)) {
                if (typeof target[key] !== 'undefined') {
                    anim.startValues[key] = target[key];
                } else {
                    anim.startValues[key] = 0;
                }
                anim.currentValues[key] = anim.startValues[key];
            }

            this.animations.push(anim);
            return anim;
        }

        // Cria animação de mola (spring)
        createSpring(target, props, stiffness = null, damping = null) {
            if (!this.enabled) return null;

            const s = stiffness || this.config.spring.stiffness;
            const d = damping || this.config.spring.damping;

            const spring = {
                target: target,
                props: props,
                stiffness: s,
                damping: d,
                mass: this.config.spring.mass,
                velocity: {},
                current: {},
                completed: false,
                onUpdate: null,
                onComplete: null,
            };

            for (const [key, value] of Object.entries(props)) {
                spring.velocity[key] = 0;
                if (typeof target[key] !== 'undefined') {
                    spring.current[key] = target[key];
                } else {
                    spring.current[key] = 0;
                }
            }

            const id = Date.now() + Math.random();
            this.springs.set(id, spring);
            return id;
        }

        // Atualiza animações
        update(deltaTime) {
            if (!this.enabled) return;

            const now = performance.now();

            // Atualiza animações
            for (let i = this.animations.length - 1; i >= 0; i--) {
                const anim = this.animations[i];
                const elapsed = (now - anim.startTime) / 1000;
                const progress = Math.min(1, elapsed / anim.duration);

                const eased = this._ease(progress, anim.easing);

                // Interpola valores
                for (const [key, endValue] of Object.entries(anim.props)) {
                    const start = anim.startValues[key];
                    const current = start + (endValue - start) * eased;
                    anim.currentValues[key] = current;
                    anim.target[key] = current;
                }

                if (anim.onUpdate) {
                    anim.onUpdate(anim.currentValues, progress);
                }

                if (progress >= 1) {
                    anim.completed = true;
                    if (anim.onComplete) anim.onComplete();
                    this.animations.splice(i, 1);
                }
            }

            // Atualiza molas (springs)
            for (const [id, spring] of this.springs) {
                if (spring.completed) {
                    this.springs.delete(id);
                    continue;
                }

                let allComplete = true;

                for (const [key, targetValue] of Object.entries(spring.props)) {
                    const current = spring.current[key];
                    const diff = targetValue - current;
                    const force = diff * spring.stiffness;
                    const dampingForce = -spring.velocity[key] * spring.damping;
                    const acceleration = (force + dampingForce) / spring.mass;

                    spring.velocity[key] += acceleration * deltaTime;
                    spring.current[key] += spring.velocity[key] * deltaTime;

                    // Verifica se chegou perto do alvo
                    if (Math.abs(diff) > 0.001 || Math.abs(spring.velocity[key]) > 0.001) {
                        allComplete = false;
                    } else {
                        spring.current[key] = targetValue;
                        spring.velocity[key] = 0;
                    }

                    spring.target[key] = spring.current[key];
                }

                if (spring.onUpdate) {
                    spring.onUpdate(spring.current);
                }

                if (allComplete) {
                    spring.completed = true;
                    if (spring.onComplete) spring.onComplete();
                    this.springs.delete(id);
                }
            }
        }

        _ease(t, easing) {
            switch (easing) {
                case 'linear': return t;
                case 'ease-in': return t * t;
                case 'ease-out': return t * (2 - t);
                case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                case 'cubic-bezier(0.34, 1.56, 0.64, 1)':
                    return this._cubicBezier(t, 0.34, 1.56, 0.64, 1);
                case 'cubic-bezier(0.22, 1, 0.36, 1)':
                    return this._cubicBezier(t, 0.22, 1, 0.36, 1);
                default:
                    if (easing && easing.startsWith('cubic-bezier')) {
                        const params = easing.match(/[\d.]+/g);
                        if (params) {
                            return this._cubicBezier(t, 
                                parseFloat(params[0]), parseFloat(params[1]),
                                parseFloat(params[2]), parseFloat(params[3])
                            );
                        }
                    }
                    return t;
            }
        }

        _cubicBezier(t, p1x, p1y, p2x, p2y) {
            // Implementação simplificada de cubic-bezier
            const cx = 3 * p1x;
            const bx = 3 * (p2x - p1x) - cx;
            const ax = 1 - cx - bx;

            const cy = 3 * p1y;
            const by = 3 * (p2y - p1y) - cy;
            const ay = 1 - cy - by;

            const x = ((ax * t + bx) * t + cx) * t;
            return ((ay * x + by) * x + cy) * x;
        }

        // Cancela animação
        cancel(animation) {
            const index = this.animations.indexOf(animation);
            if (index !== -1) {
                this.animations.splice(index, 1);
            }
            return this;
        }

        // Cancela spring
        cancelSpring(id) {
            this.springs.delete(id);
            return this;
        }

        // Cancela todas as animações
        cancelAll() {
            this.animations = [];
            this.springs.clear();
            return this;
        }

        // Pausa todas as animações
        pauseAll() {
            this.enabled = false;
            return this;
        }

        // Retoma todas as animações
        resumeAll() {
            this.enabled = true;
            return this;
        }

        getActiveAnimations() {
            return this.animations.length + this.springs.size;
        }
    }

    // ============================================================
    // 6. GESTOR DE TRANSIÇÕES
    // ============================================================
    class TransitionManager {
        constructor(options = {}) {
            this.config = { ...VisualConfig.transitions, ...options };
            this.transitions = [];
            this.enabled = this.config.enabled;
        }

        // Cria transição de fade
        fade(element, from = 0, to = 1, duration = null) {
            if (!this.enabled) return;

            const d = duration || this.config.fade.duration;
            const easing = this.config.fade.easing;

            return this._createTransition(element, 'opacity', from, to, d, easing);
        }

        // Cria transição de deslize
        slide(element, from, to, duration = null, property = 'transform') {
            if (!this.enabled) return;

            const d = duration || this.config.slide.duration;
            const easing = this.config.slide.easing;

            if (property === 'transform') {
                const fromStr = typeof from === 'string' ? from : `translate(${from.x || 0}px, ${from.y || 0}px)`;
                const toStr = typeof to === 'string' ? to : `translate(${to.x || 0}px, ${to.y || 0}px)`;
                return this._createTransition(element, 'transform', fromStr, toStr, d, easing);
            }

            return this._createTransition(element, property, from, to, d, easing);
        }

        // Cria transição de escala
        scale(element, from = 0, to = 1, duration = null) {
            if (!this.enabled) return;

            const d = duration || this.config.duration;
            return this._createTransition(element, 'transform', `scale(${from})`, `scale(${to})`, d, this.config.easing);
        }

        // Cria transição de rotação
        rotate(element, from = 0, to = 360, duration = null) {
            if (!this.enabled) return;

            const d = duration || this.config.duration;
            return this._createTransition(element, 'transform', `rotate(${from}deg)`, `rotate(${to}deg)`, d, this.config.easing);
        }

        _createTransition(element, property, from, to, duration, easing) {
            const transition = {
                element: element,
                property: property,
                from: from,
                to: to,
                duration: duration || this.config.duration,
                easing: easing || this.config.easing,
                startTime: performance.now(),
                completed: false,
                onUpdate: null,
                onComplete: null,
            };

            // Aplica estilo inicial
            if (element.style) {
                element.style.transition = 'none';
                if (property === 'transform') {
                    element.style.transform = from;
                } else {
                    element.style[property] = from;
                }
            }

            this.transitions.push(transition);

            // Força reflow
            if (element.offsetHeight) {}

            // Aplica transição
            if (element.style) {
                element.style.transition = `${property} ${duration}s ${easing}`;
                if (property === 'transform') {
                    element.style.transform = to;
                } else {
                    element.style[property] = to;
                }
            }

            setTimeout(() => {
                transition.completed = true;
                if (transition.onComplete) transition.onComplete();
            }, duration * 1000);

            return transition;
        }

        // Atualiza transições
        update(deltaTime) {
            if (!this.enabled) return;

            for (let i = this.transitions.length - 1; i >= 0; i--) {
                const t = this.transitions[i];
                if (t.completed) {
                    this.transitions.splice(i, 1);
                }
            }
        }

        // Cancela transição
        cancel(transition) {
            const index = this.transitions.indexOf(transition);
            if (index !== -1) {
                this.transitions.splice(index, 1);
                if (transition.element && transition.element.style) {
                    transition.element.style.transition = 'none';
                }
            }
            return this;
        }

        // Cancela todas as transições
        cancelAll() {
            for (const t of this.transitions) {
                if (t.element && t.element.style) {
                    t.element.style.transition = 'none';
                }
            }
            this.transitions = [];
            return this;
        }

        getActiveTransitions() {
            return this.transitions.length;
        }
    }

    // ============================================================
    // 7. SISTEMA VISUAL COMPLETO
    // ============================================================
    class VisualEffects {
        constructor(options = {}) {
            this.config = { ...VisualConfig, ...options };

            this.shadows = new ShadowManager(this.config.shadows);
            this.glow = new GlowManager(this.config.glow);
            this.reflections = new ReflectionManager(this.config.reflections);
            this.animations = new AnimationSystem(this.config.animations);
            this.transitions = new TransitionManager(this.config.transitions);

            this.quality = 'high';
            this.enabled = true;

            console.log('[Visual] Sistema de efeitos visuais inicializado');
        }

        // Aplica qualidade
        setQuality(quality) {
            this.quality = quality;
            this.shadows.setQuality(quality);
            this.glow.setQuality(quality);
            this.reflections.setQuality(quality);

            // Ajusta configurações globais
            switch (quality) {
                case 'low':
                    this.config.shadows.enabled = false;
                    this.config.glow.enabled = false;
                    this.config.reflections.enabled = false;
                    this.config.animations.enabled = true;
                    this.config.transitions.enabled = true;
                    break;
                case 'medium':
                    this.config.shadows.enabled = true;
                    this.config.glow.enabled = true;
                    this.config.reflections.enabled = true;
                    this.config.animations.enabled = true;
                    this.config.transitions.enabled = true;
                    break;
                case 'high':
                case 'ultra':
                    this.config.shadows.enabled = true;
                    this.config.glow.enabled = true;
                    this.config.reflections.enabled = true;
                    this.config.animations.enabled = true;
                    this.config.transitions.enabled = true;
                    break;
            }

            return this;
        }

        // Habilita/desabilita
        setEnabled(enabled) {
            this.enabled = enabled;
            this.shadows.enabled = enabled && this.config.shadows.enabled;
            this.glow.enabled = enabled && this.config.glow.enabled;
            this.reflections.enabled = enabled && this.config.reflections.enabled;
            this.animations.enabled = enabled && this.config.animations.enabled;
            this.transitions.enabled = enabled && this.config.transitions.enabled;
            return this;
        }

        // Atualiza todos os sistemas
        update(deltaTime) {
            if (!this.enabled) return;
            this.animations.update(deltaTime);
            this.transitions.update(deltaTime);
        }

        // Aplica todos os efeitos a um objeto renderizado
        applyEffects(ctx, x, y, radius, options = {}) {
            if (!this.enabled) return;

            const { shadow = true, glow = true, reflection = true } = options;

            if (shadow && this.shadows.enabled) {
                this.shadows.createDropShadow(ctx, x, y, radius);
            }

            if (glow && this.glow.enabled && options.glowColor) {
                this.glow.createGlow(ctx, x, y, radius * 1.5, options.glowColor);
            }

            if (reflection && this.reflections.enabled) {
                this.reflections.createSphericalReflection(ctx, x, y, radius);
            }
        }

        // Remove todos os efeitos
        removeEffects(ctx) {
            this.shadows.removeShadow(ctx);
        }

        // Estatísticas
        getStats() {
            return {
                quality: this.quality,
                enabled: this.enabled,
                shadows: this.shadows.enabled,
                glow: this.glow.enabled,
                reflections: this.reflections.enabled,
                animations: this.animations.getActiveAnimations(),
                transitions: this.transitions.getActiveTransitions(),
            };
        }

        // Destruição
        destroy() {
            this.shadows.destroy();
            this.glow.destroy();
            this.reflections.destroy();
            this.animations.cancelAll();
            this.transitions.cancelAll();
        }
    }

    // ============================================================
    // 8. EXPORTAÇÃO
    // ============================================================

    const VisualModule = {
        Config: VisualConfig,
        ShadowManager: ShadowManager,
        GlowManager: GlowManager,
        ReflectionManager: ReflectionManager,
        AnimationSystem: AnimationSystem,
        TransitionManager: TransitionManager,
        VisualEffects: VisualEffects,

        create: (options) => new VisualEffects(options),
    };

    // ============================================================
    // 9. EXPORTA PARA O GLOBAL
    // ============================================================

    global.VisualModule = VisualModule;
    global.VisualEffects = VisualEffects;
    global.ShadowManager = ShadowManager;
    global.GlowManager = GlowManager;
    global.ReflectionManager = ReflectionManager;
    global.AnimationSystem = AnimationSystem;
    global.TransitionManager = TransitionManager;

    console.log('[Visual] Módulo de efeitos visuais carregado');

})(typeof window !== 'undefined' ? window : this);
