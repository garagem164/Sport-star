// engine/math.js — Matemática 2D otimizada para jogos
// Vetores, distância, normalização, produto escalar/vetorial,
// interpolação, rotação, magnitude e utilitários
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONSTANTES MATEMÁTICAS
    // ============================================================
    const MathConst = {
        PI: Math.PI,
        TWO_PI: Math.PI * 2,
        HALF_PI: Math.PI / 2,
        QUARTER_PI: Math.PI / 4,
        DEG2RAD: Math.PI / 180,
        RAD2DEG: 180 / Math.PI,
        EPSILON: 1e-10,
        SQRT2: Math.SQRT2,
        SQRT3: Math.sqrt(3),
    };

    // ============================================================
    // 2. VETOR 2D (Classe otimizada)
    // ============================================================
    class Vec2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        // --- Criação ---
        static zero() { return new Vec2(0, 0); }
        static one() { return new Vec2(1, 1); }
        static up() { return new Vec2(0, -1); }
        static down() { return new Vec2(0, 1); }
        static left() { return new Vec2(-1, 0); }
        static right() { return new Vec2(1, 0); }

        static fromAngle(angle, length = 1) {
            return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
        }

        static fromArray(arr) {
            return new Vec2(arr[0] || 0, arr[1] || 0);
        }

        static fromObject(obj) {
            return new Vec2(obj.x || 0, obj.y || 0);
        }

        // --- Clonagem ---
        clone() {
            return new Vec2(this.x, this.y);
        }

        copy(v) {
            this.x = v.x;
            this.y = v.y;
            return this;
        }

        // --- Atribuição ---
        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        }

        // --- Operações básicas ---
        add(v) {
            return new Vec2(this.x + v.x, this.y + v.y);
        }

        addSelf(v) {
            this.x += v.x;
            this.y += v.y;
            return this;
        }

        sub(v) {
            return new Vec2(this.x - v.x, this.y - v.y);
        }

        subSelf(v) {
            this.x -= v.x;
            this.y -= v.y;
            return this;
        }

        scale(scalar) {
            return new Vec2(this.x * scalar, this.y * scalar);
        }

        scaleSelf(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            return this;
        }

        div(scalar) {
            if (Math.abs(scalar) < MathConst.EPSILON) return new Vec2(0, 0);
            const inv = 1 / scalar;
            return new Vec2(this.x * inv, this.y * inv);
        }

        divSelf(scalar) {
            if (Math.abs(scalar) < MathConst.EPSILON) {
                this.x = 0;
                this.y = 0;
                return this;
            }
            const inv = 1 / scalar;
            this.x *= inv;
            this.y *= inv;
            return this;
        }

        // --- Magnitude ---
        magnitude() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        magnitudeSq() {
            return this.x * this.x + this.y * this.y;
        }

        // --- Normalização ---
        normalize() {
            const mag = this.magnitude();
            if (mag < MathConst.EPSILON) return new Vec2(0, 0);
            const invMag = 1 / mag;
            return new Vec2(this.x * invMag, this.y * invMag);
        }

        normalizeSelf() {
            const mag = this.magnitude();
            if (mag < MathConst.EPSILON) {
                this.x = 0;
                this.y = 0;
                return this;
            }
            const invMag = 1 / mag;
            this.x *= invMag;
            this.y *= invMag;
            return this;
        }

        // --- Distância ---
        distance(v) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        distanceSq(v) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            return dx * dx + dy * dy;
        }

        // --- Produtos ---
        dot(v) {
            return this.x * v.x + this.y * v.y;
        }

        cross(v) {
            return this.x * v.y - this.y * v.x;
        }

        // --- Rotação ---
        rotate(angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return new Vec2(
                this.x * cos - this.y * sin,
                this.x * sin + this.y * cos
            );
        }

        rotateSelf(angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x = this.x;
            const y = this.y;
            this.x = x * cos - y * sin;
            this.y = x * sin + y * cos;
            return this;
        }

        rotateAround(center, angle) {
            const dx = this.x - center.x;
            const dy = this.y - center.y;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return new Vec2(
                center.x + dx * cos - dy * sin,
                center.y + dx * sin + dy * cos
            );
        }

        rotateAroundSelf(center, angle) {
            const dx = this.x - center.x;
            const dy = this.y - center.y;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            this.x = center.x + dx * cos - dy * sin;
            this.y = center.y + dx * sin + dy * cos;
            return this;
        }

        // --- Interpolação ---
        lerp(v, t) {
            const tClamped = Math.max(0, Math.min(1, t));
            return new Vec2(
                this.x + (v.x - this.x) * tClamped,
                this.y + (v.y - this.y) * tClamped
            );
        }

        lerpSelf(v, t) {
            const tClamped = Math.max(0, Math.min(1, t));
            this.x += (v.x - this.x) * tClamped;
            this.y += (v.y - this.y) * tClamped;
            return this;
        }

        lerpUnclamped(v, t) {
            return new Vec2(
                this.x + (v.x - this.x) * t,
                this.y + (v.y - this.y) * t
            );
        }

        lerpUnclampedSelf(v, t) {
            this.x += (v.x - this.x) * t;
            this.y += (v.y - this.y) * t;
            return this;
        }

        // --- Interpolação suave (smoothstep) ---
        smoothLerp(v, t) {
            const tSmooth = t * t * (3 - 2 * t);
            return this.lerp(v, tSmooth);
        }

        smoothLerpSelf(v, t) {
            const tSmooth = t * t * (3 - 2 * t);
            return this.lerpSelf(v, tSmooth);
        }

        // --- Ângulo ---
        angle() {
            return Math.atan2(this.y, this.x);
        }

        angleTo(v) {
            return Math.atan2(v.y - this.y, v.x - this.x);
        }

        angleBetween(v) {
            return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / (this.magnitude() * v.magnitude()))));
        }

        // --- Projeção ---
        project(v) {
            const magSq = v.magnitudeSq();
            if (magSq < MathConst.EPSILON) return new Vec2(0, 0);
            const scalar = this.dot(v) / magSq;
            return new Vec2(v.x * scalar, v.y * scalar);
        }

        projectSelf(v) {
            const magSq = v.magnitudeSq();
            if (magSq < MathConst.EPSILON) {
                this.x = 0;
                this.y = 0;
                return this;
            }
            const scalar = this.dot(v) / magSq;
            this.x = v.x * scalar;
            this.y = v.y * scalar;
            return this;
        }

        reject(v) {
            const proj = this.project(v);
            return this.sub(proj);
        }

        rejectSelf(v) {
            const proj = this.project(v);
            this.x -= proj.x;
            this.y -= proj.y;
            return this;
        }

        // --- Perpendicular ---
        perpendicular() {
            return new Vec2(-this.y, this.x);
        }

        perpendicularSelf() {
            const x = this.x;
            this.x = -this.y;
            this.y = x;
            return this;
        }

        // --- Reflexão ---
        reflect(normal) {
            const dot = this.dot(normal);
            return new Vec2(
                this.x - 2 * dot * normal.x,
                this.y - 2 * dot * normal.y
            );
        }

        reflectSelf(normal) {
            const dot = this.dot(normal);
            this.x -= 2 * dot * normal.x;
            this.y -= 2 * dot * normal.y;
            return this;
        }

        // --- Limites ---
        clamp(min, max) {
            return new Vec2(
                Math.max(min, Math.min(max, this.x)),
                Math.max(min, Math.min(max, this.y))
            );
        }

        clampSelf(min, max) {
            this.x = Math.max(min, Math.min(max, this.x));
            this.y = Math.max(min, Math.min(max, this.y));
            return this;
        }

        clampMagnitude(maxMagnitude) {
            const mag = this.magnitude();
            if (mag > maxMagnitude) {
                const scale = maxMagnitude / mag;
                return this.scale(scale);
            }
            return this.clone();
        }

        clampMagnitudeSelf(maxMagnitude) {
            const mag = this.magnitude();
            if (mag > maxMagnitude) {
                const scale = maxMagnitude / mag;
                this.x *= scale;
                this.y *= scale;
            }
            return this;
        }

        // --- Round ---
        round() {
            return new Vec2(Math.round(this.x), Math.round(this.y));
        }

        roundSelf() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            return this;
        }

        floor() {
            return new Vec2(Math.floor(this.x), Math.floor(this.y));
        }

        floorSelf() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
        }

        ceil() {
            return new Vec2(Math.ceil(this.x), Math.ceil(this.y));
        }

        ceilSelf() {
            this.x = Math.ceil(this.x);
            this.y = Math.ceil(this.y);
            return this;
        }

        // --- Absoluto ---
        abs() {
            return new Vec2(Math.abs(this.x), Math.abs(this.y));
        }

        absSelf() {
            this.x = Math.abs(this.x);
            this.y = Math.abs(this.y);
            return this;
        }

        // --- Utilitários ---
        equals(v, epsilon = MathConst.EPSILON) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            return (dx * dx + dy * dy) < (epsilon * epsilon);
        }

        isZero() {
            return Math.abs(this.x) < MathConst.EPSILON && Math.abs(this.y) < MathConst.EPSILON;
        }

        toString() {
            return `Vec2(${this.x.toFixed(4)}, ${this.y.toFixed(4)})`;
        }

        toArray() {
            return [this.x, this.y];
        }

        toObject() {
            return { x: this.x, y: this.y };
        }

        // --- Estático: operações com vetores existentes ---
        static add(a, b) { return new Vec2(a.x + b.x, a.y + b.y); }
        static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
        static scale(v, s) { return new Vec2(v.x * s, v.y * s); }
        static div(v, s) { return v.div(s); }
        static dot(a, b) { return a.x * b.x + a.y * b.y; }
        static cross(a, b) { return a.x * b.y - a.y * b.x; }
        static dist(a, b) { return a.distance(b); }
        static distSq(a, b) { return a.distanceSq(b); }
        static lerp(a, b, t) { return a.lerp(b, t); }
        static angle(a) { return a.angle(); }
        static normalize(v) { return v.normalize(); }
        static perpendicular(v) { return v.perpendicular(); }
        static reflect(v, n) { return v.reflect(n); }
        static clampMagnitude(v, max) { return v.clampMagnitude(max); }
    }

    // ============================================================
    // 3. FUNÇÕES UTILITÁRIAS ADICIONAIS
    // ============================================================

    // --- Interpolações ---
    function lerp(a, b, t) {
        const tClamped = Math.max(0, Math.min(1, t));
        return a + (b - a) * tClamped;
    }

    function lerpUnclamped(a, b, t) {
        return a + (b - a) * t;
    }

    function smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    function smootherstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // --- Conversão de ângulos ---
    function degToRad(deg) {
        return deg * MathConst.DEG2RAD;
    }

    function radToDeg(rad) {
        return rad * MathConst.RAD2DEG;
    }

    // --- Normalização de ângulos ---
    function normalizeAngle(angle) {
        angle = angle % MathConst.TWO_PI;
        if (angle > Math.PI) angle -= MathConst.TWO_PI;
        if (angle < -Math.PI) angle += MathConst.TWO_PI;
        return angle;
    }

    function normalizeAnglePositive(angle) {
        angle = angle % MathConst.TWO_PI;
        if (angle < 0) angle += MathConst.TWO_PI;
        return angle;
    }

    // --- Distância entre pontos (otimizada) ---
    function distance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function distanceSq(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    // --- Clamp ---
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // --- Mapeamento ---
    function map(value, fromMin, fromMax, toMin, toMax) {
        const t = (value - fromMin) / (fromMax - fromMin);
        return toMin + (toMax - toMin) * t;
    }

    function mapClamped(value, fromMin, fromMax, toMin, toMax) {
        const t = clamp((value - fromMin) / (fromMax - fromMin), 0, 1);
        return toMin + (toMax - toMin) * t;
    }

    // --- Ponto mais próximo em um segmento ---
    function closestPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;

        if (lenSq < MathConst.EPSILON) {
            return { x: x1, y: y1, t: 0 };
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        return {
            x: x1 + t * dx,
            y: y1 + t * dy,
            t: t
        };
    }

    // --- Distância de um ponto a um segmento ---
    function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const closest = closestPointOnSegment(px, py, x1, y1, x2, y2);
        return distance(px, py, closest.x, closest.y);
    }

    // --- Interseção de círculo com segmento ---
    function circleSegmentIntersect(cx, cy, radius, x1, y1, x2, y2) {
        const closest = closestPointOnSegment(cx, cy, x1, y1, x2, y2);
        const distSq = (cx - closest.x) ** 2 + (cy - closest.y) ** 2;
        const radiusSq = radius * radius;

        if (distSq <= radiusSq) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            const nx = (cx - closest.x) / (dist || 1);
            const ny = (cy - closest.y) / (dist || 1);
            return { hit: true, overlap, nx, ny, closest };
        }
        return { hit: false };
    }

    // --- Interseção de dois círculos ---
    function circleCircleIntersect(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > r1 + r2 || dist < Math.abs(r1 - r2) || dist < MathConst.EPSILON) {
            return { hit: false };
        }

        const a = (r1 * r1 - r2 * r2 + distSq) / (2 * dist);
        const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

        const px = x1 + a * dx / dist;
        const py = y1 + a * dy / dist;

        const nx = -dy / dist;
        const ny = dx / dist;

        const overlap = r1 + r2 - dist;

        return {
            hit: true,
            point: { x: px, y: py },
            normal: { x: nx, y: ny },
            overlap: overlap,
            a: a,
            h: h,
            p1: { x: px + nx * h, y: py + ny * h },
            p2: { x: px - nx * h, y: py - ny * h }
        };
    }

    // --- Matriz 2x2 (para transformações) ---
    class Mat2 {
        constructor(a = 1, b = 0, c = 0, d = 1) {
            this.a = a;
            this.b = b;
            this.c = c;
            this.d = d;
        }

        static identity() { return new Mat2(1, 0, 0, 1); }
        static rotation(angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return new Mat2(cos, -sin, sin, cos);
        }
        static scale(sx, sy) { return new Mat2(sx, 0, 0, sy); }

        multiply(m) {
            return new Mat2(
                this.a * m.a + this.b * m.c,
                this.a * m.b + this.b * m.d,
                this.c * m.a + this.d * m.c,
                this.c * m.b + this.d * m.d
            );
        }

        transform(v) {
            return new Vec2(
                this.a * v.x + this.b * v.y,
                this.c * v.x + this.d * v.y
            );
        }

        transformSelf(v) {
            const x = v.x;
            const y = v.y;
            v.x = this.a * x + this.b * y;
            v.y = this.c * x + this.d * y;
            return v;
        }

        determinant() {
            return this.a * this.d - this.b * this.c;
        }

        inverse() {
            const det = this.determinant();
            if (Math.abs(det) < MathConst.EPSILON) return null;
            const invDet = 1 / det;
            return new Mat2(
                this.d * invDet,
                -this.b * invDet,
                -this.c * invDet,
                this.a * invDet
            );
        }
    }

    // ============================================================
    // 4. EXPORTAÇÃO
    // ============================================================
    const Math2D = {
        // Constantes
        ...MathConst,

        // Classes
        Vec2,
        Mat2,

        // Funções utilitárias
        lerp,
        lerpUnclamped,
        smoothstep,
        smootherstep,
        degToRad,
        radToDeg,
        normalizeAngle,
        normalizeAnglePositive,
        distance,
        distanceSq,
        clamp,
        map,
        mapClamped,
        closestPointOnSegment,
        pointToSegmentDistance,
        circleSegmentIntersect,
        circleCircleIntersect,

        // Aliases para funções estáticas do Vec2
        vec2: (x, y) => new Vec2(x, y),
        zero: () => Vec2.zero(),
        one: () => Vec2.one(),
        fromAngle: (angle, length) => Vec2.fromAngle(angle, length),
        add: Vec2.add,
        sub: Vec2.sub,
        scale: Vec2.scale,
        div: Vec2.div,
        dot: Vec2.dot,
        cross: Vec2.cross,
        dist: Vec2.dist,
        distSq: Vec2.distSq,
        lerpVec: Vec2.lerp,
        normalize: Vec2.normalize,
        perpendicular: Vec2.perpendicular,
        reflect: Vec2.reflect,
    };

    // ============================================================
    // 5. EXPORTA PARA O GLOBAL
    // ============================================================
    // Expõe as classes e funções globalmente
    global.Vec2 = Vec2;
    global.Mat2 = Mat2;
    global.Math2D = Math2D;

    // Alias para facilitar
    global.V = (x, y) => new Vec2(x, y);
    global.v2 = (x, y) => new Vec2(x, y);

    // ============================================================
    // 6. FREEZE PARA PERFORMANCE (opcional, evita alterações acidentais)
    // ============================================================
    if (Object.freeze) {
        Object.freeze(MathConst);
        Object.freeze(Math2D);
    }

    console.log('[Math] Módulo de matemática 2D carregado.');

})(typeof window !== 'undefined' ? window : this);
