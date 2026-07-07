// engine/device.js — Sistema de adaptação para múltiplos dispositivos e orientações
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE DISPOSITIVO
    // ============================================================
    const DeviceConfig = {
        // Breakpoints
        breakpoints: {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            largeDesktop: 1440,
        },

        // Orientação
        orientation: {
            portrait: 'portrait',
            landscape: 'landscape',
            square: 'square',
        },

        // Proporções
        aspectRatios: {
            mobile: {
                portrait: 0.45,
                landscape: 1.5,
            },
            tablet: {
                portrait: 0.65,
                landscape: 1.3,
            },
            desktop: {
                portrait: 0.7,
                landscape: 1.6,
            },
        },

        // Tamanhos
        sizes: {
            safeArea: 20,
            minTouchTarget: 44,
            maxTouchTarget: 60,
            fontSize: {
                mobile: 14,
                tablet: 16,
                desktop: 18,
            },
        },

        // Features
        features: {
            touch: true,
            mouse: true,
            vibration: true,
            gyroscope: true,
            accelerometer: true,
            webgl: true,
        },
    };

    // ============================================================
    // 2. CLASSE DE DETECÇÃO DE DISPOSITIVO
    // ============================================================
    class DeviceDetector {
        constructor() {
            this.platform = 'desktop';
            this.os = 'unknown';
            this.browser = 'unknown';
            this.isMobile = false;
            this.isTablet = false;
            this.isDesktop = true;
            this.isAndroid = false;
            this.isiOS = false;
            this.isWindows = false;
            this.isMac = false;
            this.isChrome = false;
            this.isSafari = false;
            this.isFirefox = false;
            this.isEdge = false;
            this.touchSupport = false;
            this.pointerSupport = false;
            this.hasVibration = false;
            this.hasGyroscope = false;
            this.pixelRatio = 1;

            this._detect();
        }

        _detect() {
            const ua = navigator.userAgent;
            const platform = navigator.platform || '';

            // OS
            if (/Android/i.test(ua)) {
                this.isAndroid = true;
                this.os = 'android';
                this.isMobile = true;
            } else if (/iPhone|iPad|iPod/i.test(ua)) {
                this.isiOS = true;
                this.os = 'ios';
                this.isMobile = true;
                if (/iPad/i.test(ua)) {
                    this.isTablet = true;
                    this.isMobile = false;
                }
            } else if (/Windows/i.test(platform)) {
                this.isWindows = true;
                this.os = 'windows';
            } else if (/Mac/i.test(platform)) {
                this.isMac = true;
                this.os = 'mac';
            }

            // Navegador
            if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
                this.isChrome = true;
                this.browser = 'chrome';
            } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
                this.isSafari = true;
                this.browser = 'safari';
            } else if (/Firefox/i.test(ua)) {
                this.isFirefox = true;
                this.browser = 'firefox';
            } else if (/Edge/i.test(ua)) {
                this.isEdge = true;
                this.browser = 'edge';
            }

            // Touch
            this.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            this.pointerSupport = 'PointerEvent' in window;

            // Vibration
            this.hasVibration = 'vibrate' in navigator;

            // Gyroscope
            this.hasGyroscope = 'DeviceOrientationEvent' in window;

            // Pixel Ratio
            this.pixelRatio = window.devicePixelRatio || 1;

            // Dispositivo
            if (this.isMobile) {
                this.platform = 'mobile';
                this.isDesktop = false;
                if (this.isTablet) {
                    this.platform = 'tablet';
                }
            } else {
                this.platform = 'desktop';
                this.isMobile = false;
                this.isTablet = false;
            }
        }

        getInfo() {
            return {
                platform: this.platform,
                os: this.os,
                browser: this.browser,
                isMobile: this.isMobile,
                isTablet: this.isTablet,
                isDesktop: this.isDesktop,
                isAndroid: this.isAndroid,
                isiOS: this.isiOS,
                touchSupport: this.touchSupport,
                pointerSupport: this.pointerSupport,
                hasVibration: this.hasVibration,
                hasGyroscope: this.hasGyroscope,
                pixelRatio: this.pixelRatio,
            };
        }
    }

    // ============================================================
    // 3. GESTOR DE ORIENTAÇÃO
    // ============================================================
    class OrientationManager {
        constructor() {
            this.current = 'landscape';
            this.previous = 'landscape';
            this.isPortrait = false;
            this.isLandscape = true;
            this.isSquare = false;
            this.angle = 0;
            this.width = 0;
            this.height = 0;
            this.aspectRatio = 0;

            this._listeners = [];
            this._boundHandler = this._handleOrientation.bind(this);

            this._detect();
            this._setupListeners();
        }

        _detect() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.width = w;
            this.height = h;
            this.aspectRatio = w / h;

            if (w > h) {
                this.current = 'landscape';
                this.isPortrait = false;
                this.isLandscape = true;
                this.isSquare = false;
            } else if (w < h) {
                this.current = 'portrait';
                this.isPortrait = true;
                this.isLandscape = false;
                this.isSquare = false;
            } else {
                this.current = 'square';
                this.isPortrait = false;
                this.isLandscape = false;
                this.isSquare = true;
            }

            // Detects screen orientation API
            if (screen.orientation) {
                this.angle = screen.orientation.angle || 0;
            }
        }

        _setupListeners() {
            // Resize
            window.addEventListener('resize', this._boundHandler);
            window.addEventListener('orientationchange', this._boundHandler);

            // Screen Orientation API
            if (screen.orientation) {
                screen.orientation.addEventListener('change', this._boundHandler);
            }
        }

        _handleOrientation() {
            const previous = this.current;
            this._detect();

            if (this.current !== previous) {
                for (const listener of this._listeners) {
                    listener(this.current, previous);
                }
            }
        }

        onOrientationChange(callback) {
            this._listeners.push(callback);
            return () => {
                const index = this._listeners.indexOf(callback);
                if (index !== -1) this._listeners.splice(index, 1);
            };
        }

        getOrientation() {
            return this.current;
        }

        getDimensions() {
            return { width: this.width, height: this.height, aspectRatio: this.aspectRatio };
        }

        destroy() {
            window.removeEventListener('resize', this._boundHandler);
            window.removeEventListener('orientationchange', this._boundHandler);
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', this._boundHandler);
            }
            this._listeners = [];
        }
    }

    // ============================================================
    // 4. ADAPTADOR DE LAYOUT
    // ============================================================
    class LayoutAdapter {
        constructor(options = {}) {
            this.config = { ...DeviceConfig, ...options };

            this.device = new DeviceDetector();
            this.orientation = new OrientationManager();

            this.layout = 'mobile-portrait';
            this.scale = 1;
            this.safeArea = this.config.sizes.safeArea;
            this.touchTargetSize = this.config.sizes.minTouchTarget;
            this.fontSize = this.config.sizes.fontSize.mobile;

            this._adapt();
            this._setupListeners();
        }

        _adapt() {
            const device = this.device;
            const orientation = this.orientation;
            const width = orientation.width;
            const height = orientation.height;

            // Determina layout base
            let platform = device.platform;
            let orient = orientation.current;

            this.layout = `${platform}-${orient}`;

            // Ajusta escala
            const baseWidth = platform === 'mobile' ? 375 : platform === 'tablet' ? 768 : 1024;
            this.scale = Math.min(1, width / baseWidth);

            // Ajusta touch targets
            if (device.isMobile) {
                this.touchTargetSize = Math.max(
                    this.config.sizes.minTouchTarget,
                    Math.min(this.config.sizes.maxTouchTarget, 48 * this.scale)
                );
            } else {
                this.touchTargetSize = this.config.sizes.minTouchTarget;
            }

            // Ajusta font size
            if (device.isMobile) {
                this.fontSize = this.config.sizes.fontSize.mobile * this.scale;
            } else if (device.isTablet) {
                this.fontSize = this.config.sizes.fontSize.tablet * this.scale;
            } else {
                this.fontSize = this.config.sizes.fontSize.desktop * this.scale;
            }

            // Safe area
            if (device.isiOS && parseFloat(device.osVersion || '0') >= 11) {
                // iOS safe area
                this.safeArea = Math.max(20, 44 * this.scale);
            }
        }

        _setupListeners() {
            this.orientation.onOrientationChange(() => {
                this._adapt();
                if (this.onLayoutChange) {
                    this.onLayoutChange(this.layout, this.scale);
                }
            });

            // Resize com debounce
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this._adapt();
                    if (this.onLayoutChange) {
                        this.onLayoutChange(this.layout, this.scale);
                    }
                }, 200);
            });
        }

        getLayout() {
            return this.layout;
        }

        getScale() {
            return this.scale;
        }

        getTouchTargetSize() {
            return this.touchTargetSize;
        }

        getFontSize() {
            return this.fontSize;
        }

        getSafeArea() {
            return this.safeArea;
        }

        getMetrics() {
            return {
                layout: this.layout,
                scale: this.scale,
                touchTargetSize: this.touchTargetSize,
                fontSize: this.fontSize,
                safeArea: this.safeArea,
                width: this.orientation.width,
                height: this.orientation.height,
                aspectRatio: this.orientation.aspectRatio,
                device: this.device.getInfo(),
                orientation: this.orientation.getOrientation(),
            };
        }

        destroy() {
            this.orientation.destroy();
        }
    }

    // ============================================================
    // 5. GESTOR DE RESPONSIVIDADE
    // ============================================================
    class ResponsiveManager {
        constructor(options = {}) {
            this.config = { ...DeviceConfig, ...options };

            this.device = new DeviceDetector();
            this.orientation = new OrientationManager();
            this.layout = new LayoutAdapter();

            // Configurações responsivas
            this.responsive = {
                canvas: { width: 0, height: 0, scale: 1 },
                hud: { size: 0, padding: 0, fontSize: 0 },
                controls: { size: 0, spacing: 0, touch: true },
                field: { width: 0, height: 0, scale: 1 },
                elements: { size: 0, spacing: 0 },
            };

            this._updateResponsive();
            this._setupListeners();

            console.log('[Device] Sistema responsivo inicializado');
        }

        _updateResponsive() {
            const metrics = this.layout.getMetrics();
            const device = this.device;
            const orientation = this.orientation;
            const w = orientation.width;
            const h = orientation.height;
            const scale = this.layout.getScale();

            // Canvas
            this.responsive.canvas = {
                width: w,
                height: h,
                scale: scale,
                pixelRatio: device.pixelRatio,
            };

            // HUD
            const hudSize = device.isMobile ? 32 * scale : 40 * scale;
            this.responsive.hud = {
                size: hudSize,
                padding: this.layout.getSafeArea(),
                fontSize: this.layout.getFontSize(),
            };

            // Controles
            const touchSize = this.layout.getTouchTargetSize();
            this.responsive.controls = {
                size: touchSize,
                spacing: touchSize * 0.4,
                touch: device.isMobile || device.touchSupport,
                mouse: !device.isMobile,
            };

            // Campo
            const fieldAspect = 1.6;
            let fieldWidth, fieldHeight;
            const padding = this.layout.getSafeArea() * 2;

            if (orientation.isLandscape) {
                fieldHeight = h - padding - hudSize * 1.2;
                fieldWidth = fieldHeight * fieldAspect;
                if (fieldWidth > w - padding) {
                    fieldWidth = w - padding;
                    fieldHeight = fieldWidth / fieldAspect;
                }
            } else {
                fieldWidth = w - padding;
                fieldHeight = fieldWidth / fieldAspect;
                if (fieldHeight > h - padding - hudSize * 1.5) {
                    fieldHeight = h - padding - hudSize * 1.5;
                    fieldWidth = fieldHeight * fieldAspect;
                }
            }

            this.responsive.field = {
                width: fieldWidth,
                height: fieldHeight,
                scale: fieldWidth / 800,
            };

            // Elementos
            const elementSize = device.isMobile ? 30 * scale : 40 * scale;
            this.responsive.elements = {
                size: elementSize,
                spacing: elementSize * 0.3,
                fontSize: this.layout.getFontSize(),
            };
        }

        _setupListeners() {
            this.orientation.onOrientationChange(() => {
                this._updateResponsive();
                if (this.onUpdate) {
                    this.onUpdate(this.responsive);
                }
            });

            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this._updateResponsive();
                    if (this.onUpdate) {
                        this.onUpdate(this.responsive);
                    }
                }, 150);
            });
        }

        getResponsive() {
            return this.responsive;
        }

        getCanvasSize() {
            return this.responsive.canvas;
        }

        getHUDSize() {
            return this.responsive.hud;
        }

        getControlSize() {
            return this.responsive.controls;
        }

        getFieldSize() {
            return this.responsive.field;
        }

        getElementSize() {
            return this.responsive.elements;
        }

        getMetrics() {
            return {
                responsive: this.responsive,
                device: this.device.getInfo(),
                orientation: this.orientation.getOrientation(),
                layout: this.layout.getMetrics(),
            };
        }

        isMobile() {
            return this.device.isMobile;
        }

        isTablet() {
            return this.device.isTablet;
        }

        isDesktop() {
            return this.device.isDesktop;
        }

        isPortrait() {
            return this.orientation.isPortrait;
        }

        isLandscape() {
            return this.orientation.isLandscape;
        }

        destroy() {
            this.orientation.destroy();
            this.layout.destroy();
        }
    }

    // ============================================================
    // 6. UTILITÁRIOS DE ADAPTAÇÃO
    // ============================================================
    const DeviceUtils = {
        // Converte unidades responsivas
        responsiveUnit(value, scale) {
            return value * scale;
        },

        // Ajusta tamanho para touch
        touchSize(size, isMobile, scale = 1) {
            const minSize = isMobile ? 44 : 32;
            return Math.max(minSize, size * scale);
        },

        // Verifica se é dispositivo móvel
        isMobileDevice() {
            return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        },

        // Verifica se é iOS
        isiOSDevice() {
            return /iPhone|iPad|iPod/i.test(navigator.userAgent);
        },

        // Verifica se é Android
        isAndroidDevice() {
            return /Android/i.test(navigator.userAgent);
        },

        // Obtém tamanho seguro para área de notch
        getSafeAreaInsets() {
            const style = getComputedStyle(document.documentElement);
            return {
                top: parseFloat(style.getPropertyValue('--safe-area-inset-top')) || 0,
                bottom: parseFloat(style.getPropertyValue('--safe-area-inset-bottom')) || 0,
                left: parseFloat(style.getPropertyValue('--safe-area-inset-left')) || 0,
                right: parseFloat(style.getPropertyValue('--safe-area-inset-right')) || 0,
            };
        },

        // Obtém preferência de redução de movimento
        prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        // Obtém preferência de esquema de cores
        prefersDarkMode() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        },

        // Obtém preferência de contraste
        prefersHighContrast() {
            return window.matchMedia('(prefers-contrast: high)').matches;
        },
    };

    // ============================================================
    // 7. CSS ADAPTATIVO (injetado dinamicamente)
    // ============================================================
    class AdaptiveStyles {
        constructor() {
            this.styles = {};
            this.sheet = null;
            this._createSheet();
        }

        _createSheet() {
            const style = document.createElement('style');
            style.id = 'adaptive-styles';
            document.head.appendChild(style);
            this.sheet = style.sheet;
        }

        addStyle(selector, rules, mediaQuery = null) {
            let css = `${selector} { ${rules} }`;
            if (mediaQuery) {
                css = `@media ${mediaQuery} { ${css} }`;
            }

            try {
                this.sheet.insertRule(css, this.sheet.cssRules.length);
            } catch (e) {
                console.warn('[Device] Erro ao adicionar estilo:', e);
            }

            return this;
        }

        applyResponsive(device, orientation) {
            const isMobile = device.isMobile;
            const isTablet = device.isTablet;
            const isPortrait = orientation.isPortrait;

            // Aplica estilos baseados no dispositivo
            this.addStyle('body', `
                touch-action: ${isMobile ? 'none' : 'auto'};
                user-select: ${isMobile ? 'none' : 'auto'};
                -webkit-user-select: ${isMobile ? 'none' : 'auto'};
            `);

            if (isMobile) {
                this.addStyle('.touch-area', `
                    min-width: 44px;
                    min-height: 44px;
                    padding: 8px;
                `);
            }

            if (isPortrait) {
                this.addStyle('.game-container', `
                    flex-direction: column;
                `);
            } else {
                this.addStyle('.game-container', `
                    flex-direction: row;
                `);
            }

            return this;
        }

        destroy() {
            if (this.sheet) {
                while (this.sheet.cssRules.length > 0) {
                    this.sheet.deleteRule(0);
                }
            }
            const style = document.getElementById('adaptive-styles');
            if (style) style.remove();
        }
    }

    // ============================================================
    // 8. EXPORTAÇÃO
    // ============================================================

    const DeviceModule = {
        Config: DeviceConfig,
        DeviceDetector: DeviceDetector,
        OrientationManager: OrientationManager,
        LayoutAdapter: LayoutAdapter,
        ResponsiveManager: ResponsiveManager,
        AdaptiveStyles: AdaptiveStyles,
        DeviceUtils: DeviceUtils,

        create: (options) => new ResponsiveManager(options),
        detect: () => new DeviceDetector(),
        orientation: () => new OrientationManager(),
        layout: () => new LayoutAdapter(),
        styles: () => new AdaptiveStyles(),
    };

    // ============================================================
    // 9. EXPORTA PARA O GLOBAL
    // ============================================================

    global.DeviceModule = DeviceModule;
    global.DeviceDetector = DeviceDetector;
    global.OrientationManager = OrientationManager;
    global.LayoutAdapter = LayoutAdapter;
    global.ResponsiveManager = ResponsiveManager;
    global.DeviceUtils = DeviceUtils;

    console.log('[Device] Módulo de adaptação para dispositivos carregado');

})(typeof window !== 'undefined' ? window : this);
