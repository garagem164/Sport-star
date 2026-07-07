// engine/postprocessing.js — Sistema de pós-processamento avançado
// Motion Blur, Bloom leve, Glow, Reflexos dinâmicos
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE PÓS-PROCESSAMENTO
    // ============================================================
    const PostProcessingConfig = {
        // Motion Blur
        motionBlur: {
            enabled: true,
            intensity: 0.3,
            samples: 4,
            decay: 0.9,
            maxVelocity: 50,
        },

        // Bloom
        bloom: {
            enabled: true,
            intensity: 0.15,
            threshold: 0.3,
            blur: 0.4,
            samples: 6,
            radius: 8,
        },

        // Glow
        glow: {
            enabled: true,
            intensity: 0.4,
            blur: 20,
            color: 'rgba(255, 255, 255, 0.1)',
        },

        // Reflexos
        reflections: {
            enabled: true,
            intensity: 0.3,
            quality: 'high',
            fresnel: true,
            distortion: 0.1,
        },

        // Qualidade
        quality: {
            motionBlurSamples: 4,
            bloomSamples: 6,
            reflectionResolution: 0.5,
            antialiasing: true,
        },

        // Performance
        performance: {
            maxTextureSize: 2048,
            useOffscreenCanvas: true,
            frameSkip: 0,
        },
    };

    // ============================================================
    // 2. GESTOR DE MOTION BLUR
    // ============================================================
    class MotionBlurManager {
        constructor(options = {}) {
            this.config = { ...PostProcessingConfig.motionBlur, ...options };
            this.enabled = this.config.enabled;
            
            // Buffer de frames anteriores
            this.previousFrame = null;
            this.frameHistory = [];
            this.maxHistory = this.config.samples;
            
            // Dados de movimento
            this.velocityBuffer = null;
            this.lastPositions = new Map();
        }

        // Captura frame para motion blur
        captureFrame(ctx, width, height) {
            if (!this.enabled) return;

            try {
                const imageData = ctx.getImageData(0, 0, width, height);
                this.frameHistory.push(imageData);
                
                if (this.frameHistory.length > this.maxHistory) {
                    this.frameHistory.shift();
                }
            } catch (e) {
                // Fallback: não captura se houver erro (ex: canvas não suporta)
                this.frameHistory = [];
            }
        }

        // Aplica motion blur
        apply(ctx, width, height, velocityMap = null) {
            if (!this.enabled || this.frameHistory.length < 2) return;

            try {
                const history = this.frameHistory;
                const count = history.length;
                
                // Cria uma imagem composta com blur baseado no histórico
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Aplica decaimento exponencial
                let totalWeight = 0;
                const weights = [];
                
                for (let i = 0; i < count; i++) {
                    const weight = Math.pow(this.config.decay, count - 1 - i);
                    weights.push(weight);
                    totalWeight += weight;
                }
                
                // Normaliza pesos
                for (let i = 0; i < weights.length; i++) {
                    weights[i] /= totalWeight;
                }
                
                // Compõe frames
                tempCtx.clearRect(0, 0, width, height);
                
                for (let i = 0; i < count; i++) {
                    const imageData = history[i];
                    tempCtx.globalAlpha = weights[i] * this.config.intensity * 0.5;
                    
                    // Cria imagem temporária
                    const imgData = new ImageData(
                        new Uint8ClampedArray(imageData.data),
                        width, height
                    );
                    
                    tempCtx.putImageData(imgData, 0, 0);
                }
                
                tempCtx.globalAlpha = 1;
                
                // Aplica o blur composto sobre o frame atual
                ctx.globalAlpha = 0.7;
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.globalAlpha = 1;
                
                // Limpa histórico antigo para evitar memory leak
                if (this.frameHistory.length > this.maxHistory * 2) {
                    this.frameHistory = this.frameHistory.slice(-this.maxHistory);
                }
                
            } catch (e) {
                // Fallback: desabilita motion blur em erro
                this.enabled = false;
                console.warn('[MotionBlur] Desabilitado devido a erro:', e);
            }
        }

        // Registra posição de objeto para calcular velocidade
        trackObject(id, x, y) {
            if (!this.enabled) return;
            
            const key = id;
            const pos = this.lastPositions.get(key);
            
            if (pos) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const speed = Math.sqrt(dx * dx + dy * dy);
                
                // Armazena velocidade para uso no blur
                this.lastPositions.set(key, { x, y, speed, dx, dy });
            } else {
                this.lastPositions.set(key, { x, y, speed: 0, dx: 0, dy: 0 });
            }
        }

        // Limpa buffers
        clear() {
            this.frameHistory = [];
            this.lastPositions.clear();
            this.previousFrame = null;
            return this;
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.samples = 2;
                    this.config.intensity = 0.2;
                    this.maxHistory = 2;
                    break;
                case 'medium':
                    this.config.samples = 3;
                    this.config.intensity = 0.3;
                    this.maxHistory = 3;
                    break;
                case 'high':
                    this.config.samples = 4;
                    this.config.intensity = 0.4;
                    this.maxHistory = 4;
                    break;
                case 'ultra':
                    this.config.samples = 6;
                    this.config.intensity = 0.5;
                    this.maxHistory = 6;
                    break;
            }
            return this;
        }
    }

    // ============================================================
    // 3. GESTOR DE BLOOM
    // ============================================================
    class BloomManager {
        constructor(options = {}) {
            this.config = { ...PostProcessingConfig.bloom, ...options };
            this.enabled = this.config.enabled;
            this.blurCache = new Map();
        }

        // Aplica bloom leve
        apply(ctx, width, height) {
            if (!this.enabled || width < 10 || height < 10) return;

            try {
                // Captura imagem atual
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                // Encontra pixels brilhantes (threshold)
                const threshold = this.config.threshold;
                const brightPixels = [];
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i] / 255;
                    const g = data[i + 1] / 255;
                    const b = data[i + 2] / 255;
                    const luminance = r * 0.299 + g * 0.587 + b * 0.114;
                    
                    if (luminance > threshold) {
                        const x = (i / 4) % width;
                        const y = Math.floor((i / 4) / width);
                        brightPixels.push({ x, y, r, g, b, luminance });
                    }
                }
                
                if (brightPixels.length === 0) return;
                
                // Cria camada de bloom
                const bloomCanvas = document.createElement('canvas');
                bloomCanvas.width = width;
                bloomCanvas.height = height;
                const bloomCtx = bloomCanvas.getContext('2d');
                
                // Desenha brilhos
                const intensity = this.config.intensity;
                const blurRadius = this.config.radius;
                
                for (const pixel of brightPixels) {
                    const size = 2 + pixel.luminance * 8 * intensity;
                    const alpha = pixel.luminance * intensity * 0.5;
                    
                    const gradient = bloomCtx.createRadialGradient(
                        pixel.x, pixel.y, 0,
                        pixel.x, pixel.y, size * blurRadius * 0.5
                    );
                    
                    gradient.addColorStop(0, `rgba(${pixel.r * 255}, ${pixel.g * 255}, ${pixel.b * 255}, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(${pixel.r * 255}, ${pixel.g * 255}, ${pixel.b * 255}, ${alpha * 0.3})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                    
                    bloomCtx.fillStyle = gradient;
                    bloomCtx.beginPath();
                    bloomCtx.arc(pixel.x, pixel.y, size * blurRadius, 0, Math.PI * 2);
                    bloomCtx.fill();
                }
                
                // Suaviza o bloom
                this._applyGaussianBlur(bloomCtx, width, height, this.config.blur * 2);
                
                // Compõe sobre a imagem original
                ctx.globalAlpha = 0.7;
                ctx.drawImage(bloomCanvas, 0, 0);
                ctx.globalAlpha = 1;
                
            } catch (e) {
                // Fallback: desabilita bloom em erro
                this.enabled = false;
                console.warn('[Bloom] Desabilitado devido a erro:', e);
            }
        }

        // Aplica blur gaussiano simplificado
        _applyGaussianBlur(ctx, width, height, radius) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const temp = new Uint8ClampedArray(data);
            
            const samples = Math.min(this.config.samples, 8);
            const sigma = radius / 3;
            
            // Blur horizontal
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    let totalWeight = 0;
                    
                    for (let i = -samples; i <= samples; i++) {
                        const px = Math.max(0, Math.min(width - 1, x + i));
                        const idx = (px + y * width) * 4;
                        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
                        
                        r += temp[idx] * weight;
                        g += temp[idx + 1] * weight;
                        b += temp[idx + 2] * weight;
                        a += temp[idx + 3] * weight;
                        totalWeight += weight;
                    }
                    
                    const idx = (x + y * width) * 4;
                    data[idx] = r / totalWeight;
                    data[idx + 1] = g / totalWeight;
                    data[idx + 2] = b / totalWeight;
                    data[idx + 3] = a / totalWeight;
                }
            }
            
            // Blur vertical
            const temp2 = new Uint8ClampedArray(data);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    let totalWeight = 0;
                    
                    for (let i = -samples; i <= samples; i++) {
                        const py = Math.max(0, Math.min(height - 1, y + i));
                        const idx = (x + py * width) * 4;
                        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
                        
                        r += temp2[idx] * weight;
                        g += temp2[idx + 1] * weight;
                        b += temp2[idx + 2] * weight;
                        a += temp2[idx + 3] * weight;
                        totalWeight += weight;
                    }
                    
                    const idx = (x + y * width) * 4;
                    data[idx] = r / totalWeight;
                    data[idx + 1] = g / totalWeight;
                    data[idx + 2] = b / totalWeight;
                    data[idx + 3] = a / totalWeight;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.samples = 3;
                    this.config.intensity = 0.05;
                    this.config.blur = 0.2;
                    this.config.radius = 4;
                    break;
                case 'medium':
                    this.config.samples = 4;
                    this.config.intensity = 0.1;
                    this.config.blur = 0.3;
                    this.config.radius = 6;
                    break;
                case 'high':
                    this.config.samples = 6;
                    this.config.intensity = 0.15;
                    this.config.blur = 0.4;
                    this.config.radius = 8;
                    break;
                case 'ultra':
                    this.config.samples = 8;
                    this.config.intensity = 0.2;
                    this.config.blur = 0.5;
                    this.config.radius = 10;
                    break;
            }
            return this;
        }

        clear() {
            this.blurCache.clear();
            return this;
        }
    }

    // ============================================================
    // 4. GESTOR DE GLOW DINÂMICO
    // ============================================================
    class DynamicGlowManager {
        constructor(options = {}) {
            this.config = { ...PostProcessingConfig.glow, ...options };
            this.enabled = this.config.enabled;
            this.glowObjects = new Map();
            this.cache = new Map();
        }

        // Adiciona objeto com glow
        addGlowObject(id, x, y, radius, color, intensity = null) {
            if (!this.enabled) return;
            
            this.glowObjects.set(id, {
                x, y, radius,
                color: color || this.config.color,
                intensity: intensity || this.config.intensity,
                active: true,
                pulse: 0,
            });
        }

        // Remove objeto glow
        removeGlowObject(id) {
            this.glowObjects.delete(id);
            return this;
        }

        // Atualiza posição do glow
        updateGlowPosition(id, x, y) {
            const obj = this.glowObjects.get(id);
            if (obj) {
                obj.x = x;
                obj.y = y;
            }
            return this;
        }

        // Aplica glow dinâmico
        apply(ctx, width, height, deltaTime) {
            if (!this.enabled || this.glowObjects.size === 0) return;

            const intensity = this.config.intensity;
            const blur = this.config.blur;

            for (const [id, obj] of this.glowObjects) {
                if (!obj.active) continue;

                // Animação de pulso
                obj.pulse += deltaTime * 2;
                const pulseFactor = 0.8 + Math.sin(obj.pulse) * 0.2;

                const radius = obj.radius * pulseFactor;
                const alpha = obj.intensity * 0.4;

                // Cria glow
                const gradient = ctx.createRadialGradient(
                    obj.x, obj.y, 0,
                    obj.x, obj.y, radius * 2
                );

                const color = obj.color || this.config.color;
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.5, color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, radius * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Glow secundário (mais difuso)
                const gradient2 = ctx.createRadialGradient(
                    obj.x, obj.y, 0,
                    obj.x, obj.y, radius * 4
                );

                gradient2.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.1})`);
                gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = gradient2;
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, radius * 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Limpa objetos inativos
            for (const [id, obj] of this.glowObjects) {
                if (!obj.active) {
                    this.glowObjects.delete(id);
                }
            }
        }

        // Limpa todos os glows
        clear() {
            this.glowObjects.clear();
            this.cache.clear();
            return this;
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.intensity = 0.2;
                    this.config.blur = 10;
                    break;
                case 'medium':
                    this.config.intensity = 0.3;
                    this.config.blur = 15;
                    break;
                case 'high':
                    this.config.intensity = 0.4;
                    this.config.blur = 20;
                    break;
                case 'ultra':
                    this.config.intensity = 0.5;
                    this.config.blur = 30;
                    break;
            }
            return this;
        }
    }

    // ============================================================
    // 5. GESTOR DE REFLEXOS DINÂMICOS
    // ============================================================
    class DynamicReflectionManager {
        constructor(options = {}) {
            this.config = { ...PostProcessingConfig.reflections, ...options };
            this.enabled = this.config.enabled;
            this.reflectionObjects = new Map();
            this.reflectionMap = null;
        }

        // Adiciona objeto com reflexo
        addReflectionObject(id, x, y, radius, color = null, intensity = null) {
            if (!this.enabled) return;
            
            this.reflectionObjects.set(id, {
                x, y, radius,
                color: color || 'rgba(255, 255, 255, 0.3)',
                intensity: intensity || this.config.intensity,
                active: true,
                angle: Math.random() * Math.PI * 2,
            });
        }

        // Aplica reflexos dinâmicos
        apply(ctx, width, height, deltaTime, environmentMap = null) {
            if (!this.enabled || this.reflectionObjects.size === 0) return;

            for (const [id, obj] of this.reflectionObjects) {
                if (!obj.active) continue;

                // Animação do reflexo (rotação)
                obj.angle += deltaTime * 0.2;

                // Reflexo esférico (fresnel)
                const intensity = obj.intensity * 0.5;
                const radius = obj.radius;
                const x = obj.x;
                const y = obj.y;

                // Cria reflexo baseado em fresnel
                const fresnel = this.config.fresnel ? 
                    0.5 + 0.5 * Math.cos(obj.angle) : 1;

                // Reflexo principal
                const gradient = ctx.createRadialGradient(
                    x - radius * 0.3,
                    y - radius * 0.3,
                    0,
                    x,
                    y,
                    radius
                );

                const alpha = intensity * fresnel * 0.6;
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.5})`);
                gradient.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.1})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.save();
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Reflexo secundário (mais difuso)
                if (this.config.distortion > 0) {
                    const dist = this.config.distortion;
                    const gradient2 = ctx.createRadialGradient(
                        x - radius * 0.1 + Math.sin(obj.angle) * radius * 0.1,
                        y - radius * 0.1 + Math.cos(obj.angle) * radius * 0.1,
                        0,
                        x,
                        y,
                        radius * 1.2
                    );

                    gradient2.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`);
                    gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.save();
                    ctx.fillStyle = gradient2;
                    ctx.beginPath();
                    ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Reflexo de ambiente (se disponível)
                if (environmentMap) {
                    this._applyEnvironmentReflection(ctx, obj, environmentMap);
                }
            }
        }

        _applyEnvironmentReflection(ctx, obj, envMap) {
            // Aplica reflexo baseado no mapa de ambiente
            const size = Math.min(envMap.width, envMap.height) * 0.3;
            
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.drawImage(
                envMap,
                obj.x - size / 2,
                obj.y - size / 2,
                size,
                size
            );
            ctx.restore();
        }

        // Atualiza posição do reflexo
        updateReflectionPosition(id, x, y) {
            const obj = this.reflectionObjects.get(id);
            if (obj) {
                obj.x = x;
                obj.y = y;
            }
            return this;
        }

        // Remove reflexo
        removeReflectionObject(id) {
            this.reflectionObjects.delete(id);
            return this;
        }

        // Limpa todos os reflexos
        clear() {
            this.reflectionObjects.clear();
            return this;
        }

        setQuality(quality) {
            switch (quality) {
                case 'low':
                    this.config.intensity = 0.15;
                    this.config.distortion = 0;
                    this.config.fresnel = false;
                    break;
                case 'medium':
                    this.config.intensity = 0.2;
                    this.config.distortion = 0.05;
                    this.config.fresnel = true;
                    break;
                case 'high':
                    this.config.intensity = 0.3;
                    this.config.distortion = 0.1;
                    this.config.fresnel = true;
                    break;
                case 'ultra':
                    this.config.intensity = 0.4;
                    this.config.distortion = 0.15;
                    this.config.fresnel = true;
                    break;
            }
            return this;
        }
    }

    // ============================================================
    // 6. SISTEMA DE PÓS-PROCESSAMENTO COMPLETO
    // ============================================================
    class PostProcessingSystem {
        constructor(options = {}) {
            this.config = { ...PostProcessingConfig, ...options };

            this.motionBlur = new MotionBlurManager(this.config.motionBlur);
            this.bloom = new BloomManager(this.config.bloom);
            this.glow = new DynamicGlowManager(this.config.glow);
            this.reflections = new DynamicReflectionManager(this.config.reflections);

            this.quality = 'high';
            this.enabled = true;
            this.frameSkip = 0;
            this.frameCounter = 0;

            console.log('[PostProcessing] Sistema de pós-processamento inicializado');
        }

        // Aplica todos os efeitos
        apply(ctx, width, height, deltaTime, velocityMap = null, environmentMap = null) {
            if (!this.enabled) return;

            // Frame skip para performance
            this.frameCounter++;
            if (this.frameCounter % (this.frameSkip + 1) !== 0) {
                return;
            }

            // Salva estado do contexto
            ctx.save();

            // 1. Motion Blur
            if (this.motionBlur.enabled) {
                this.motionBlur.apply(ctx, width, height, velocityMap);
            }

            // 2. Bloom (leve)
            if (this.bloom.enabled) {
                this.bloom.apply(ctx, width, height);
            }

            // 3. Glow dinâmico
            if (this.glow.enabled) {
                this.glow.apply(ctx, width, height, deltaTime);
            }

            // 4. Reflexos dinâmicos
            if (this.reflections.enabled) {
                this.reflections.apply(ctx, width, height, deltaTime, environmentMap);
            }

            // Restaura estado
            ctx.restore();
        }

        // Captura frame para motion blur
        captureFrame(ctx, width, height) {
            if (this.motionBlur.enabled) {
                this.motionBlur.captureFrame(ctx, width, height);
            }
        }

        // Define qualidade
        setQuality(quality) {
            this.quality = quality;
            this.motionBlur.setQuality(quality);
            this.bloom.setQuality(quality);
            this.glow.setQuality(quality);
            this.reflections.setQuality(quality);

            // Ajusta frame skip baseado na qualidade
            switch (quality) {
                case 'low':
                    this.frameSkip = 2;
                    break;
                case 'medium':
                    this.frameSkip = 1;
                    break;
                case 'high':
                    this.frameSkip = 0;
                    break;
                case 'ultra':
                    this.frameSkip = 0;
                    break;
            }

            return this;
        }

        // Habilita/desabilita
        setEnabled(enabled) {
            this.enabled = enabled;
            this.motionBlur.enabled = enabled && this.config.motionBlur.enabled;
            this.bloom.enabled = enabled && this.config.bloom.enabled;
            this.glow.enabled = enabled && this.config.glow.enabled;
            this.reflections.enabled = enabled && this.config.reflections.enabled;
            return this;
        }

        // Adiciona glow a um objeto
        addGlow(id, x, y, radius, color, intensity = null) {
            return this.glow.addGlowObject(id, x, y, radius, color, intensity);
        }

        // Adiciona reflexo a um objeto
        addReflection(id, x, y, radius, color = null, intensity = null) {
            return this.reflections.addReflectionObject(id, x, y, radius, color, intensity);
        }

        // Atualiza posições
        updatePosition(id, x, y) {
            this.glow.updateGlowPosition(id, x, y);
            this.reflections.updateReflectionPosition(id, x, y);
            return this;
        }

        // Remove objetos
        removeObject(id) {
            this.glow.removeGlowObject(id);
            this.reflections.removeReflectionObject(id);
            return this;
        }

        // Limpa todos os efeitos
        clear() {
            this.motionBlur.clear();
            this.bloom.clear();
            this.glow.clear();
            this.reflections.clear();
            return this;
        }

        // Estatísticas
        getStats() {
            return {
                quality: this.quality,
                enabled: this.enabled,
                frameSkip: this.frameSkip,
                motionBlur: this.motionBlur.enabled,
                bloom: this.bloom.enabled,
                glow: this.glow.enabled,
                reflections: this.reflections.enabled,
                glowObjects: this.glow.glowObjects.size,
                reflectionObjects: this.reflections.reflectionObjects.size,
                frameCounter: this.frameCounter,
            };
        }

        // Destruição
        destroy() {
            this.motionBlur.clear();
            this.bloom.clear();
            this.glow.clear();
            this.reflections.clear();
        }
    }

    // ============================================================
    // 7. EXPORTAÇÃO
    // ============================================================

    const PostProcessingModule = {
        Config: PostProcessingConfig,
        MotionBlurManager: MotionBlurManager,
        BloomManager: BloomManager,
        DynamicGlowManager: DynamicGlowManager,
        DynamicReflectionManager: DynamicReflectionManager,
        PostProcessingSystem: PostProcessingSystem,

        create: (options) => new PostProcessingSystem(options),
    };

    // ============================================================
    // 8. EXPORTA PARA O GLOBAL
    // ============================================================

    global.PostProcessingModule = PostProcessingModule;
    global.PostProcessingSystem = PostProcessingSystem;

    console.log('[PostProcessing] Módulo de pós-processamento carregado');

})(typeof window !== 'undefined' ? window : this);
