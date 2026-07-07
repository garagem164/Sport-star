// engine/performance.js — Sistema de Otimização de Renderização
// Pool de objetos, redução de memória, 60 FPS
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE PERFORMANCE
    // ============================================================
    const PerformanceConfig = {
        // Pool
        pool: {
            maxSize: 1000,
            preallocate: 100,
            cleanupThreshold: 0.8,
        },

        // Renderização
        render: {
            culling: true,
            cullingMargin: 50,
            batchSize: 100,
            useCanvasCache: true,
            maxCacheSize: 50,
        },

        // Memória
        memory: {
            maxParticles: 500,
            maxTrails: 200,
            cleanupInterval: 3000,
            gcThreshold: 0.9,
        },

        // Frame
        frame: {
            targetFPS: 60,
            maxDeltaTime: 0.05,
            smoothing: 0.1,
        },

        // Otimizações
        optimizations: {
            useRequestAnimationFrame: true,
            useOffscreenCanvas: true,
            useImageData: false,
            useWebGL: false,
        },
    };

    // ============================================================
    // 2. POOL DE OBJETOS
    // ============================================================
    class ObjectPool {
        constructor(options = {}) {
            this.config = { ...PerformanceConfig.pool, ...options };
            this.pool = [];
            this.active = [];
            this.factory = null;
            this.resetFn = null;
            this.totalCreated = 0;
            this.totalReused = 0;
        }

        init(factory, resetFn) {
            this.factory = factory;
            this.resetFn = resetFn;

            // Pré-aloca objetos
            for (let i = 0; i < this.config.preallocate; i++) {
                const obj = this.factory();
                this.pool.push(obj);
            }

            return this;
        }

        acquire() {
            let obj;

            if (this.pool.length > 0) {
                obj = this.pool.pop();
                this.totalReused++;
            } else {
                obj = this.factory();
                this.totalCreated++;
            }

            if (this.resetFn) {
                this.resetFn(obj);
            }

            this.active.push(obj);
            return obj;
        }

        release(obj) {
            const index = this.active.indexOf(obj);
            if (index !== -1) {
                this.active.splice(index, 1);
                if (this.pool.length < this.config.maxSize) {
                    this.pool.push(obj);
                }
            }
            return this;
        }

        releaseAll() {
            for (const obj of this.active) {
                if (this.pool.length < this.config.maxSize) {
                    this.pool.push(obj);
                }
            }
            this.active = [];
            return this;
        }

        getActiveCount() {
            return this.active.length;
        }

        getPoolCount() {
            return this.pool.length;
        }

        getStats() {
            return {
                active: this.active.length,
                pool: this.pool.length,
                created: this.totalCreated,
                reused: this.totalReused,
                total: this.totalCreated + this.totalReused,
            };
        }

        cleanup() {
            if (this.pool.length > this.config.maxSize * this.config.cleanupThreshold) {
                const excess = this.pool.length - this.config.maxSize;
                this.pool.splice(0, excess);
            }
            return this;
        }
    }

    // ============================================================
    // 3. GESTOR DE RENDERIZAÇÃO
    // ============================================================
    class RenderManager {
        constructor(options = {}) {
            this.config = { ...PerformanceConfig.render, ...options };

            // Cache de canvas
            this.canvasCache = new Map();
            this.imageCache = new Map();

            // Estado de renderização
            this.batch = [];
            this.batchSize = this.config.batchSize;
            this.cullingEnabled = this.config.culling;

            // Estatísticas
            this.stats = {
                drawCalls: 0,
                batchedCalls: 0,
                culledObjects: 0,
                cacheHits: 0,
                cacheMisses: 0,
            };
        }

        // ============================================================
        // 4. CACHE DE CANVAS
        // ============================================================

        getCachedCanvas(key, width, height, drawFn) {
            if (!this.config.useCanvasCache) {
                return drawFn();
            }

            let cached = this.canvasCache.get(key);

            if (!cached || cached.width !== width || cached.height !== height) {
                // Cria novo canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Desenha no canvas
                drawFn(ctx, width, height);

                cached = {
                    canvas: canvas,
                    ctx: ctx,
                    width: width,
                    height: height,
                    lastUsed: Date.now(),
                };

                this.canvasCache.set(key, cached);
                this.stats.cacheMisses++;

                // Gerencia tamanho do cache
                this._cleanupCache();
            } else {
                this.stats.cacheHits++;
                cached.lastUsed = Date.now();
            }

            return cached.canvas;
        }

        _cleanupCache() {
            if (this.canvasCache.size > this.config.maxCacheSize) {
                // Remove os menos usados
                const entries = Array.from(this.canvasCache.entries());
                entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

                const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
                for (const [key] of toRemove) {
                    this.canvasCache.delete(key);
                }
            }
        }

        // ============================================================
        // 5. CULLING (Occlusão)
        // ============================================================

        isVisible(obj, viewport) {
            if (!this.cullingEnabled) return true;

            const margin = this.config.cullingMargin;

            // Verifica se o objeto está dentro da viewport
            const x = obj.x || obj.position?.x || 0;
            const y = obj.y || obj.position?.y || 0;
            const radius = obj.radius || obj.size || 10;

            return x + radius + margin > viewport.minX &&
                   x - radius - margin < viewport.maxX &&
                   y + radius + margin > viewport.minY &&
                   y - radius - margin < viewport.maxY;
        }

        // ============================================================
        // 6. BATCHING (Agrupamento de desenhos)
        // ============================================================

        beginBatch() {
            this.batch = [];
            this.stats.drawCalls = 0;
            this.stats.batchedCalls = 0;
            return this;
        }

        addToBatch(drawFn, priority = 0) {
            this.batch.push({ drawFn, priority });
            if (this.batch.length >= this.batchSize) {
                this.flushBatch();
            }
            return this;
        }

        flushBatch() {
            if (this.batch.length === 0) return;

            // Ordena por prioridade
            this.batch.sort((a, b) => a.priority - b.priority);

            // Executa todos os desenhos
            for (const item of this.batch) {
                item.drawFn();
                this.stats.batchedCalls++;
            }

            this.batch = [];
            this.stats.drawCalls++;
            return this;
        }

        // ============================================================
        // 7. OTIMIZAÇÕES DE DESENHO
        // ============================================================

        // Desenho circular otimizado
        drawCircle(ctx, x, y, radius, color, segments = 16) {
            if (radius <= 0) return;

            ctx.fillStyle = color;
            ctx.beginPath();

            // Usa menos segmentos para círculos pequenos
            if (radius < 5) segments = 8;
            else if (radius < 15) segments = 12;

            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Desenho de retângulo arredondado otimizado
        drawRoundRect(ctx, x, y, width, height, radius) {
            if (radius === 0) {
                ctx.fillRect(x, y, width, height);
                return;
            }

            const r = Math.min(radius, Math.min(width, height) / 2);

            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        }

        // ============================================================
        // 8. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                ...this.stats,
                cacheSize: this.canvasCache.size,
                imageCacheSize: this.imageCache.size,
                batchSize: this.batch.length,
            };
        }

        // ============================================================
        // 9. LIMPEZA
        // ============================================================

        clearCache() {
            this.canvasCache.clear();
            this.imageCache.clear();
            this.stats.cacheHits = 0;
            this.stats.cacheMisses = 0;
            return this;
        }

        destroy() {
            this.clearCache();
            this.batch = [];
            return this;
        }
    }

    // ============================================================
    // 10. GESTOR DE MEMÓRIA
    // ============================================================
    class MemoryManager {
        constructor(options = {}) {
            this.config = { ...PerformanceConfig.memory, ...options };

            this.objects = {
                particles: [],
                trails: [],
                effects: [],
            };

            this.maxParticles = this.config.maxParticles;
            this.maxTrails = this.config.maxTrails;

            this.cleanupTimer = 0;
            this.cleanupInterval = this.config.cleanupInterval;

            this.stats = {
                totalAllocated: 0,
                totalFreed: 0,
                gcCalls: 0,
            };
        }

        // ============================================================
        // 11. GERENCIAMENTO DE OBJETOS
        // ============================================================

        registerObject(type, obj) {
            if (this.objects[type]) {
                this.objects[type].push(obj);
                this.stats.totalAllocated++;
                return true;
            }
            return false;
        }

        unregisterObject(type, obj) {
            if (this.objects[type]) {
                const index = this.objects[type].indexOf(obj);
                if (index !== -1) {
                    this.objects[type].splice(index, 1);
                    this.stats.totalFreed++;
                    return true;
                }
            }
            return false;
        }

        // ============================================================
        // 12. LIMPEZA AUTOMÁTICA
        // ============================================================

        cleanup(deltaTime) {
            this.cleanupTimer += deltaTime * 1000;

            if (this.cleanupTimer >= this.cleanupInterval) {
                this.cleanupTimer = 0;
                this._performCleanup();
            }
        }

        _performCleanup() {
            // Limpa partículas mortas
            this.objects.particles = this.objects.particles.filter(p => p.alive !== false);
            if (this.objects.particles.length > this.maxParticles) {
                this.objects.particles.splice(0, this.objects.particles.length - this.maxParticles);
            }

            // Limpa rastros
            if (this.objects.trails.length > this.maxTrails) {
                this.objects.trails.splice(0, this.objects.trails.length - this.maxTrails);
            }

            // Limpa efeitos
            this.objects.effects = this.objects.effects.filter(e => e.active !== false);

            this.stats.gcCalls++;

            // Força GC se necessário (apenas em browsers que suportam)
            if (this.objects.particles.length > this.maxParticles * this.config.gcThreshold) {
                if (window.gc) {
                    window.gc();
                }
            }
        }

        // ============================================================
        // 13. OBTENÇÃO DE OBJETOS
        // ============================================================

        getObjects(type) {
            return this.objects[type] || [];
        }

        getCount(type) {
            return this.objects[type]?.length || 0;
        }

        // ============================================================
        // 14. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                ...this.stats,
                particles: this.objects.particles.length,
                trails: this.objects.trails.length,
                effects: this.objects.effects.length,
                total: this.objects.particles.length + this.objects.trails.length + this.objects.effects.length,
                memoryUsage: this._estimateMemoryUsage(),
            };
        }

        _estimateMemoryUsage() {
            // Estimativa simples de uso de memória
            let total = 0;
            for (const key of Object.keys(this.objects)) {
                total += this.objects[key].length * 100; // Estimativa por objeto
            }
            return total;
        }

        // ============================================================
        // 15. RESET
        // ============================================================

        reset() {
            for (const key of Object.keys(this.objects)) {
                this.objects[key] = [];
            }
            this.cleanupTimer = 0;
            this.stats.totalAllocated = 0;
            this.stats.totalFreed = 0;
            this.stats.gcCalls = 0;
            return this;
        }
    }

    // ============================================================
    // 16. GESTOR DE PERFORMANCE (SISTEMA PRINCIPAL)
    // ============================================================
    class PerformanceManager {
        constructor(options = {}) {
            this.config = { ...PerformanceConfig, ...options };

            // Sub-sistemas
            this.pool = new ObjectPool(this.config.pool);
            this.render = new RenderManager(this.config.render);
            this.memory = new MemoryManager(this.config.memory);

            // Frame
            this.fps = 0;
            this.frameCount = 0;
            this.frameTime = 0;
            this.lastFrameTime = 0;
            this.deltaTime = 0;
            this.smoothDelta = 0;

            // Throttle
            this.throttle = 0;
            this.maxDeltaTime = this.config.frame.maxDeltaTime;

            // Estatísticas
            this.stats = {
                fps: 0,
                frameTime: 0,
                renderTime: 0,
                updateTime: 0,
                poolStats: null,
                renderStats: null,
                memoryStats: null,
            };
        }

        // ============================================================
        // 17. INICIALIZAÇÃO
        // ============================================================

        init() {
            console.log('[Performance] Sistema de performance inicializado');
            return this;
        }

        // ============================================================
        // 18. ATUALIZAÇÃO
        // ============================================================

        beginFrame() {
            const now = performance.now();

            // Cálculo do delta time
            if (this.lastFrameTime === 0) {
                this.lastFrameTime = now;
                this.deltaTime = 1 / 60;
            } else {
                this.deltaTime = (now - this.lastFrameTime) / 1000;
                this.lastFrameTime = now;
            }

            // Limita delta time
            if (this.deltaTime > this.maxDeltaTime) {
                this.deltaTime = this.maxDeltaTime;
            }

            // Smooth delta
            this.smoothDelta = this.smoothDelta * (1 - this.config.frame.smoothing) +
                              this.deltaTime * this.config.frame.smoothing;

            // FPS
            this.frameTime += this.deltaTime;
            this.frameCount++;

            if (this.frameTime >= 1) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.frameTime = 0;
            }

            // Limpeza de memória
            this.memory.cleanup(this.deltaTime);

            // Inicia batch de renderização
            this.render.beginBatch();

            return this.deltaTime;
        }

        endFrame() {
            // Finaliza batch de renderização
            this.render.flushBatch();

            // Atualiza estatísticas
            this.stats.fps = this.fps;
            this.stats.frameTime = this.deltaTime * 1000;
            this.stats.poolStats = this.pool.getStats();
            this.stats.renderStats = this.render.getStats();
            this.stats.memoryStats = this.memory.getStats();
        }

        // ============================================================
        // 19. GERENCIAMENTO DE RECURSOS
        // ============================================================

        acquireObject() {
            return this.pool.acquire();
        }

        releaseObject(obj) {
            return this.pool.release(obj);
        }

        releaseAllObjects() {
            return this.pool.releaseAll();
        }

        // ============================================================
        // 20. CACHE DE RENDERIZAÇÃO
        // ============================================================

        cacheCanvas(key, width, height, drawFn) {
            return this.render.getCachedCanvas(key, width, height, drawFn);
        }

        clearCache() {
            this.render.clearCache();
            return this;
        }

        // ============================================================
        // 21. CONTROLE DE PERFORMANCE
        // ============================================================

        setTargetFPS(fps) {
            this.config.frame.targetFPS = fps;
            return this;
        }

        setMaxParticles(max) {
            this.memory.maxParticles = max;
            return this;
        }

        setCulling(enabled) {
            this.render.cullingEnabled = enabled;
            return this;
        }

        // ============================================================
        // 22. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                fps: this.fps,
                deltaTime: this.deltaTime,
                smoothDelta: this.smoothDelta,
                frameTime: this.deltaTime * 1000,
                pool: this.pool.getStats(),
                render: this.render.getStats(),
                memory: this.memory.getStats(),
                totalObjects: this.memory.getCount('particles') +
                             this.memory.getCount('trails') +
                             this.memory.getCount('effects'),
            };
        }

        getPoolStats() {
            return this.pool.getStats();
        }

        getRenderStats() {
            return this.render.getStats();
        }

        getMemoryStats() {
            return this.memory.getStats();
        }

        // ============================================================
        // 23. RESET
        // ============================================================

        reset() {
            this.pool.releaseAll();
            this.pool.cleanup();
            this.render.clearCache();
            this.memory.reset();
            this.lastFrameTime = 0;
            this.fps = 0;
            this.frameCount = 0;
            this.frameTime = 0;
            return this;
        }

        // ============================================================
        // 24. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.pool.releaseAll();
            this.render.destroy();
            this.memory.reset();
            return this;
        }
    }

    // ============================================================
    // 25. UTILITÁRIOS DE PERFORMANCE
    // ============================================================

    const PerformanceUtils = {
        // Mede tempo de execução
        measure(fn, label = '') {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            const time = end - start;
            if (label) {
                console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
            }
            return { result, time };
        },

        // Throttle de função
        throttle(fn, limit) {
            let inThrottle = false;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Debounce de função
        debounce(fn, delay) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        // Memoização
        memoize(fn) {
            const cache = new Map();
            return function(...args) {
                const key = JSON.stringify(args);
                if (cache.has(key)) {
                    return cache.get(key);
                }
                const result = fn.apply(this, args);
                cache.set(key, result);
                return result;
            };
        },

        // Pool de reuso
        createPool(factory, resetFn, maxSize = 100) {
            const pool = [];
            return {
                acquire() {
                    let obj;
                    if (pool.length > 0) {
                        obj = pool.pop();
                    } else {
                        obj = factory();
                    }
                    if (resetFn) resetFn(obj);
                    return obj;
                },
                release(obj) {
                    if (pool.length < maxSize) {
                        pool.push(obj);
                    }
                },
                clear() {
                    pool.length = 0;
                },
                size() {
                    return pool.length;
                },
            };
        },
    };

    // ============================================================
    // 26. EXPORTAÇÃO
    // ============================================================

    const PerformanceModule = {
        Config: PerformanceConfig,
        ObjectPool: ObjectPool,
        RenderManager: RenderManager,
        MemoryManager: MemoryManager,
        PerformanceManager: PerformanceManager,
        PerformanceUtils: PerformanceUtils,

        create: (options) => new PerformanceManager(options),
    };

    // ============================================================
    // 27. EXPORTA PARA O GLOBAL
    // ============================================================

    global.PerformanceModule = PerformanceModule;
    global.PerformanceManager = PerformanceManager;
    global.ObjectPool = ObjectPool;
    global.RenderManager = RenderManager;
    global.MemoryManager = MemoryManager;
    global.PerformanceUtils = PerformanceUtils;

    console.log('[Performance] Módulo de performance carregado');

})(typeof window !== 'undefined' ? window : this);
