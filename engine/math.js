// engine/math.js — Matemática 2D otimizada (versão unificada)
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONSTANTES
    // ============================================================
    const PI = Math.PI;
    const TWO_PI = PI * 2;
    const HALF_PI = PI / 2;
    const DEG2RAD = PI / 180;
    const RAD2DEG = 180 / PI;
    const EPSILON = 1e-10;

    // ============================================================
    // 2. VETOR 2D
    // ============================================================
    class Vec2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        // Criação
        static zero() { return new Vec2(0, 0); }
        static one() { return new Vec2(1, 1); }
        static fromAngle(angle, length = 1) {
            return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
        }

        // Clonagem
        clone() { return new Vec2(this.x, this.y); }
        copy(v) { this.x = v.x; this.y = v.y; return this; }
        set(x, y) { this.x = x; this.y = y; return this; }

        // Operações
        add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
        addSelf(v) { this.x += v.x; this.y += v.y; return this; }
        sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
        subSelf(v) { this.x -= v.x; this.y -= v.y; return this; }
        scale(s) { return new Vec2(this.x * s, this.y * s); }
        scaleSelf(s) { this.x *= s; this.y *= s; return this; }
        div(s) { 
            if (Math.abs(s) < EPSILON) return new Vec2(0, 0);
            const inv = 1 / s;
            return new Vec2(this.x * inv, this.y * inv);
        }

        // Magnitude
        mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
        magSq() { return this.x * this.x + this.y * this.y; }

        // Normalização
        normalize() {
            const m = this.mag();
            if (m < EPSILON) return new Vec2(0, 0);
            const inv = 1 / m;
            return new Vec2(this.x * inv, this.y * inv);
        }
        normalizeSelf() {
            const m = this.mag();
            if (m < EPSILON) { this.x = 0; this.y = 0; return this; }
            const inv = 1 / m;
            this.x *= inv; this.y *= inv;
            return this;
        }

        // Distância
        dist(v) {
            const dx = this.x - v.x, dy = this.y - v.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        distSq(v) {
            const dx = this.x - v.x, dy = this.y - v.y;
            return dx * dx + dy * dy;
        }

        // Produtos
        dot(v) { return this.x * v.x + this.y * v.y; }
        cross(v) { return this.x * v.y - this.y * v.x; }

        // Rotação
        rotate(angle) {
            const c = Math.cos(angle), s = Math.sin(angle);
            return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
        }
        rotateSelf(angle) {
            const c = Math.cos(angle), s = Math.sin(angle);
            const x = this.x, y = this.y;
            this.x = x * c - y * s;
            this.y = x * s + y * c;
            return this;
        }

        // Interpolação
        lerp(v, t) {
            const tc = Math.max(0, Math.min(1, t));
            return new Vec2(this.x + (v.x - this.x) * tc, this.y + (v.y - this.y) * tc);
        }
        lerpSelf(v, t) {
            const tc = Math.max(0, Math.min(1, t));
            this.x += (v.x - this.x) * tc;
            this.y += (v.y - this.y) * tc;
            return this;
        }

        // Ângulo
        angle() { return Math.atan2(this.y, this.x); }

        // Utilitários
        equals(v, e = EPSILON) {
            const dx = this.x - v.x, dy = this.y - v.y;
            return (dx * dx + dy * dy) < (e * e);
        }
        isZero() { return Math.abs(this.x) < EPSILON && Math.abs(this.y) < EPSILON; }
        toString() { return `Vec2(${this.x.toFixed(4)}, ${this.y.toFixed(4)})`; }
        toArray() { return [this.x, this.y]; }
        toObject() { return { x: this.x, y: this.y }; }

        // Estáticos
        static add(a, b) { return new Vec2(a.x + b.x, a.y + b.y); }
        static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
        static scale(v, s) { return new Vec2(v.x * s, v.y * s); }
        static dot(a, b) { return a.x * b.x + a.y * b.y; }
        static cross(a, b) { return a.x * b.y - a.y * b.x; }
        static dist(a, b) { return a.dist(b); }
        static lerp(a, b, t) { return a.lerp(b, t); }
    }

    // ============================================================
    // 3. FUNÇÕES UTILITÁRIAS
    // ============================================================
    function lerp(a, b, t) {
        const tc = Math.max(0, Math.min(1, t));
        return a + (b - a) * tc;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function degToRad(deg) { return deg * DEG2RAD; }
    function radToDeg(rad) { return rad * RAD2DEG; }

    function distance(x1, y1, x2, y2) {
        const dx = x1 - x2, dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ============================================================
    // 4. EXPORTAÇÃO
    // ============================================================
    const Math2D = {
        PI, TWO_PI, HALF_PI, DEG2RAD, RAD2DEG, EPSILON,
        Vec2,
        lerp, clamp, degToRad, radToDeg, distance,
        v2: (x, y) => new Vec2(x, y),
        zero: () => Vec2.zero(),
        one: () => Vec2.one(),
        fromAngle: Vec2.fromAngle,
    };

    global.Math2D = Math2D;
    global.Vec2 = Vec2;
    global.V = (x, y) => new Vec2(x, y);

    console.log('[Math2D] Carregado');

})(typeof window !== 'undefined' ? window : this);
