// engine/settings.js — Menu de Configurações com controles premium
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DO MENU
    // ============================================================
    const SettingsConfig = {
        // Cores
        colors: {
            background: 'rgba(10, 15, 25, 0.92)',
            backgroundSecondary: 'rgba(20, 30, 45, 0.7)',
            surface: 'rgba(30, 45, 65, 0.5)',
            surfaceHover: 'rgba(40, 60, 85, 0.6)',
            border: 'rgba(255, 255, 255, 0.08)',
            text: {
                primary: '#FFFFFF',
                secondary: 'rgba(255, 255, 255, 0.7)',
                tertiary: 'rgba(255, 255, 255, 0.4)',
            },
            accent: '#4A90D9',
            accentHover: '#6BB5FF',
            success: '#4CAF50',
            danger: '#E74C3C',
            warning: '#FFD93D',
        },

        // Layout
        layout: {
            width: 480,
            maxHeight: 560,
            padding: 24,
            spacing: 16,
            borderRadius: 20,
        },

        // Controles
        controls: {
            toggleSize: 48,
            toggleHeight: 28,
            sliderHeight: 6,
            sliderKnob: 18,
            optionHeight: 44,
        },

        // Animações
        animations: {
            duration: 0.3,
            delay: 0.05,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },

        // Opções
        graphicsOptions: ['Baixa', 'Média', 'Alta', 'Ultra'],
        fpsOptions: ['30', '60', '120', '144', 'Desbloqueado'],
    };

    // ============================================================
    // 2. CLASSE MENU DE CONFIGURAÇÕES
    // ============================================================
    class SettingsMenu {
        constructor(options = {}) {
            this.config = { ...SettingsConfig, ...options };

            // Estado
            this.visible = false;
            this.animating = false;
            this.animationProgress = 0;
            this.selectedIndex = -1;
            this.hoveredIndex = -1;
            this.focusedControl = null;

            // Configurações
            this.settings = {
                sound: true,
                music: true,
                vibration: true,
                fps: '60',
                graphics: 'Alta',
                soundVolume: 80,
                musicVolume: 70,
            };

            // Opções
            this.graphicsOptions = this.config.graphicsOptions;
            this.fpsOptions = this.config.fpsOptions;

            // Controles UI
            this.controls = [];
            this._setupControls();

            // Callbacks
            this.onClose = null;
            this.onSave = null;
            this.onSettingsChange = null;

            // Referências
            this.renderer = null;
            this.game = null;
            this.audio = null;

            // Bind
            this._render = this._render.bind(this);
            this._animate = this._animate.bind(this);

            // Inicializa
            this._setupDefaultSettings();
        }

        // ============================================================
        // 3. CONFIGURAÇÃO DOS CONTROLES
        // ============================================================

        _setupControls() {
            this.controls = [
                {
                    id: 'sound',
                    label: '🔊 Som',
                    type: 'toggle',
                    value: this.settings.sound,
                    description: 'Ativar/Desativar efeitos sonoros',
                },
                {
                    id: 'music',
                    label: '🎵 Música',
                    type: 'toggle',
                    value: this.settings.music,
                    description: 'Ativar/Desativar música de fundo',
                },
                {
                    id: 'vibration',
                    label: '📳 Vibração',
                    type: 'toggle',
                    value: this.settings.vibration,
                    description: 'Ativar/Desativar feedback háptico',
                },
                {
                    id: 'soundVolume',
                    label: 'Volume do Som',
                    type: 'slider',
                    value: this.settings.soundVolume,
                    min: 0,
                    max: 100,
                    step: 1,
                    description: 'Nível de volume dos efeitos sonoros',
                },
                {
                    id: 'musicVolume',
                    label: 'Volume da Música',
                    type: 'slider',
                    value: this.settings.musicVolume,
                    min: 0,
                    max: 100,
                    step: 1,
                    description: 'Nível de volume da música de fundo',
                },
                {
                    id: 'fps',
                    label: '🎮 Taxa de FPS',
                    type: 'select',
                    value: this.settings.fps,
                    options: this.fpsOptions,
                    description: 'Limite de quadros por segundo',
                },
                {
                    id: 'graphics',
                    label: '🎨 Qualidade Gráfica',
                    type: 'select',
                    value: this.settings.graphics,
                    options: this.graphicsOptions,
                    description: 'Qualidade dos gráficos e efeitos visuais',
                },
            ];
        }

        // ============================================================
        // 4. INICIALIZAÇÃO
        // ============================================================

        init(renderer, game, audio = null) {
            this.renderer = renderer;
            this.game = game;
            this.audio = audio;

            // Carrega configurações salvas
            this._loadSettings();

            console.log('[Settings] Menu de configurações inicializado');
            return this;
        }

        // ============================================================
        // 5. CARREGAMENTO/SALVAMENTO
        // ============================================================

        _setupDefaultSettings() {
            // Verifica localStorage
            this._loadSettings();
        }

        _loadSettings() {
            try {
                const saved = localStorage.getItem('gameSettings');
                if (saved) {
                    const data = JSON.parse(saved);
                    for (const key of Object.keys(this.settings)) {
                        if (data[key] !== undefined) {
                            this.settings[key] = data[key];
                        }
                    }
                    this._updateControls();
                }
            } catch (e) {
                console.warn('[Settings] Erro ao carregar configurações:', e);
            }
        }

        saveSettings() {
            try {
                localStorage.setItem('gameSettings', JSON.stringify(this.settings));
                if (this.onSave) {
                    this.onSave(this.settings);
                }
                console.log('[Settings] Configurações salvas');
            } catch (e) {
                console.warn('[Settings] Erro ao salvar configurações:', e);
            }
        }

        _updateControls() {
            for (const control of this.controls) {
                if (this.settings[control.id] !== undefined) {
                    control.value = this.settings[control.id];
                }
            }
        }

        // ============================================================
        // 6. GERENCIAMENTO DE VISIBILIDADE
        // ============================================================

        show() {
            this.visible = true;
            this.animating = true;
            this.animationProgress = 0;
            this.selectedIndex = -1;
            this.hoveredIndex = -1;
            this.focusedControl = null;

            // Atualiza controles com valores atuais
            this._updateControls();

            // Anima entrada
            const animate = () => {
                this.animationProgress += 0.04;
                if (this.animationProgress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animationProgress = 1;
                    this.animating = false;
                }
            };
            animate();

            return this;
        }

        hide() {
            this.visible = false;
            this.animating = false;

            // Salva configurações ao fechar
            this.saveSettings();

            if (this.onClose) {
                this.onClose();
            }

            return this;
        }

        toggle() {
            if (this.visible) {
                this.hide();
            } else {
                this.show();
            }
            return this;
        }

        // ============================================================
        // 7. RENDERIZAÇÃO
        // ============================================================

        render(ctx) {
            if (!this.visible) return;

            const width = this.renderer?.width || ctx.canvas.width;
            const height = this.renderer?.height || ctx.canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            const boxWidth = this.config.layout.width;
            const boxHeight = Math.min(this.config.layout.maxHeight, this.controls.length * 60 + 160);
            const boxX = centerX - boxWidth / 2;
            const boxY = centerY - boxHeight / 2;

            const progress = this.animationProgress;
            const scale = 0.8 + progress * 0.2;
            const alpha = progress;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-centerX, -centerY);

            // Fundo escuro
            ctx.fillStyle = this.config.colors.background;
            ctx.fillRect(0, 0, width, height);

            // Sombra
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 50;
            ctx.shadowOffsetY = 10;

            // Container principal
            ctx.shadowBlur = 0;
            ctx.fillStyle = this.config.colors.background;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, this.config.layout.borderRadius);
            ctx.fill();

            // Borda com glow
            ctx.strokeStyle = this.config.colors.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, this.config.layout.borderRadius);
            ctx.stroke();

            // Brilho do glass
            const glassGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + 60);
            glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
            glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glassGradient;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, 60, this.config.layout.borderRadius);
            ctx.fill();

            // Título
            const titleY = boxY + 45;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.config.colors.text.primary;
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.fillText('⚙️ Configurações', centerX, titleY);

            // Linha separadora
            ctx.fillStyle = this.config.colors.border;
            ctx.fillRect(boxX + 30, boxY + 65, boxWidth - 60, 1);

            // Lista de controles
            const startY = boxY + 85;
            const padding = this.config.layout.padding;
            const spacing = this.config.layout.spacing;

            for (let i = 0; i < this.controls.length; i++) {
                const control = this.controls[i];
                const y = startY + i * (50 + spacing);
                const isHovered = this.hoveredIndex === i;
                const isSelected = this.selectedIndex === i;

                // Fundo do item
                if (isHovered || isSelected) {
                    ctx.fillStyle = this.config.colors.surfaceHover;
                    ctx.beginPath();
                    ctx.roundRect(boxX + 16, y - 4, boxWidth - 32, 50, 10);
                    ctx.fill();
                }

                // Label
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isSelected ? this.config.colors.text.primary : this.config.colors.text.secondary;
                ctx.font = '14px system-ui, sans-serif';
                ctx.fillText(control.label, boxX + 30, y + 21);

                // Controle
                const controlX = boxX + boxWidth - 30;

                switch (control.type) {
                    case 'toggle':
                        this._renderToggle(ctx, controlX, y, control);
                        break;
                    case 'slider':
                        this._renderSlider(ctx, controlX, y, control);
                        break;
                    case 'select':
                        this._renderSelect(ctx, controlX, y, control);
                        break;
                }
            }

            // Botões de ação
            const btnY = boxY + boxHeight - 55;
            const btnWidth = 120;
            const btnHeight = 38;
            const btnSpacing = 16;

            // Botão Salvar
            const saveX = centerX - btnWidth - btnSpacing / 2;
            const gradient = ctx.createLinearGradient(saveX, btnY, saveX + btnWidth, btnY + btnHeight);
            gradient.addColorStop(0, this.config.colors.accent);
            gradient.addColorStop(1, '#357ABD');

            ctx.shadowColor = 'rgba(74, 144, 217, 0.3)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(saveX, btnY, btnWidth, btnHeight, 10);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💾 Salvar', saveX + btnWidth / 2, btnY + btnHeight / 2);

            // Botão Fechar
            const closeX = centerX + btnSpacing / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.roundRect(closeX, btnY, btnWidth, btnHeight, 10);
            ctx.fill();

            ctx.fillStyle = this.config.colors.text.secondary;
            ctx.fillText('✕ Fechar', closeX + btnWidth / 2, btnY + btnHeight / 2);

            // Salva posições dos botões para interação
            this._saveButtonPositions(saveX, closeX, btnY, btnWidth, btnHeight);

            ctx.restore();
        }

        // ============================================================
        // 8. RENDERIZAÇÃO DE CONTROLES
        // ============================================================

        _renderToggle(ctx, x, y, control) {
            const toggleWidth = this.config.controls.toggleSize;
            const toggleHeight = this.config.controls.toggleHeight;
            const value = control.value;

            // Fundo do toggle
            const bgColor = value ? this.config.colors.accent : 'rgba(255, 255, 255, 0.15)';
            ctx.fillStyle = bgColor;
            ctx.shadowColor = value ? 'rgba(74, 144, 217, 0.3)' : 'rgba(0, 0, 0, 0)';
            ctx.shadowBlur = value ? 15 : 0;
            ctx.beginPath();
            ctx.roundRect(x - toggleWidth, y - toggleHeight / 2, toggleWidth, toggleHeight, 14);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Knob
            const knobSize = this.config.controls.toggleHeight - 4;
            const knobX = value ? x - 4 : x - toggleWidth + 4;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(knobX, y, knobSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        _renderSlider(ctx, x, y, control) {
            const sliderWidth = 140;
            const sliderHeight = this.config.controls.sliderHeight;
            const knobSize = this.config.controls.sliderKnob;
            const min = control.min || 0;
            const max = control.max || 100;
            const value = control.value || 50;
            const progress = (value - min) / (max - min);

            // Fundo do slider
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(x - sliderWidth, y - sliderHeight / 2, sliderWidth, sliderHeight, 3);
            ctx.fill();

            // Progresso
            const progressWidth = sliderWidth * progress;
            ctx.fillStyle = this.config.colors.accent;
            ctx.shadowColor = 'rgba(74, 144, 217, 0.3)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(x - sliderWidth, y - sliderHeight / 2, progressWidth, sliderHeight, 3);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Knob
            const knobX = x - sliderWidth + progressWidth;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(knobX, y, knobSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Valor
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(value)}%`, x - sliderWidth - 10, y);
        }

        _renderSelect(ctx, x, y, control) {
            const selectWidth = 120;
            const selectHeight = 32;
            const value = control.value;
            const options = control.options || [];

            // Fundo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.strokeStyle = this.config.colors.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x - selectWidth, y - selectHeight / 2, selectWidth, selectHeight, 8);
            ctx.fill();
            ctx.stroke();

            // Texto da opção atual
            ctx.fillStyle = this.config.colors.text.primary;
            ctx.font = '13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value || options[0] || '', x - selectWidth / 2, y + 1);

            // Seta
            ctx.fillStyle = this.config.colors.text.tertiary;
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('▼', x - 8, y + 1);
        }

        // ============================================================
        // 9. POSIÇÕES DOS BOTÕES
        // ============================================================

        _saveButtonPositions(saveX, closeX, btnY, btnWidth, btnHeight) {
            this._saveBtn = { x: saveX, y: btnY, width: btnWidth, height: btnHeight };
            this._closeBtn = { x: closeX, y: btnY, width: btnWidth, height: btnHeight };
        }

        // ============================================================
        // 10. INTERAÇÃO
        // ============================================================

        handleMouseMove(x, y) {
            if (!this.visible) return -1;

            let hovered = -1;

            // Verifica controles
            const boxWidth = this.config.layout.width;
            const boxHeight = Math.min(this.config.layout.maxHeight, this.controls.length * 60 + 160);
            const boxX = (this.renderer?.width || 800) / 2 - boxWidth / 2;
            const boxY = (this.renderer?.height || 600) / 2 - boxHeight / 2;

            const startY = boxY + 85;
            const spacing = this.config.layout.spacing;

            for (let i = 0; i < this.controls.length; i++) {
                const cy = startY + i * (50 + spacing);
                if (x >= boxX + 16 && x <= boxX + boxWidth - 16 &&
                    y >= cy - 4 && y <= cy + 46) {
                    hovered = i;
                    break;
                }
            }

            this.hoveredIndex = hovered;

            // Verifica botões
            if (this._saveBtn && x >= this._saveBtn.x && x <= this._saveBtn.x + this._saveBtn.width &&
                y >= this._saveBtn.y && y <= this._saveBtn.y + this._saveBtn.height) {
                hovered = 'save';
            } else if (this._closeBtn && x >= this._closeBtn.x && x <= this._closeBtn.x + this._closeBtn.width &&
                       y >= this._closeBtn.y && y <= this._closeBtn.y + this._closeBtn.height) {
                hovered = 'close';
            }

            return hovered;
        }

        handleClick(x, y) {
            if (!this.visible) return null;

            // Verifica botões
            if (this._saveBtn && x >= this._saveBtn.x && x <= this._saveBtn.x + this._saveBtn.width &&
                y >= this._saveBtn.y && y <= this._saveBtn.y + this._saveBtn.height) {
                this.saveSettings();
                this.hide();
                return 'save';
            }

            if (this._closeBtn && x >= this._closeBtn.x && x <= this._closeBtn.x + this._closeBtn.width &&
                y >= this._closeBtn.y && y <= this._closeBtn.y + this._closeBtn.height) {
                this.hide();
                return 'close';
            }

            // Verifica controles
            const boxWidth = this.config.layout.width;
            const boxHeight = Math.min(this.config.layout.maxHeight, this.controls.length * 60 + 160);
            const boxX = (this.renderer?.width || 800) / 2 - boxWidth / 2;
            const boxY = (this.renderer?.height || 600) / 2 - boxHeight / 2;

            const startY = boxY + 85;
            const spacing = this.config.layout.spacing;

            for (let i = 0; i < this.controls.length; i++) {
                const control = this.controls[i];
                const cy = startY + i * (50 + spacing);

                if (x >= boxX + 16 && x <= boxX + boxWidth - 16 &&
                    y >= cy - 4 && y <= cy + 46) {

                    this.selectedIndex = i;
                    this.focusedControl = control.id;

                    // Ação baseada no tipo
                    switch (control.type) {
                        case 'toggle':
                            control.value = !control.value;
                            this.settings[control.id] = control.value;
                            this._applySetting(control.id, control.value);
                            break;
                        case 'slider': {
                            const controlX = boxX + boxWidth - 30;
                            const sliderWidth = 140;
                            const min = control.min || 0;
                            const max = control.max || 100;
                            const relX = x - (controlX - sliderWidth);
                            const progress = Math.max(0, Math.min(1, relX / sliderWidth));
                            const value = min + progress * (max - min);
                            control.value = Math.round(value);
                            this.settings[control.id] = control.value;
                            this._applySetting(control.id, control.value);
                            break;
                        }
                        case 'select': {
                            const options = control.options || [];
                            const currentIndex = options.indexOf(control.value);
                            const nextIndex = (currentIndex + 1) % options.length;
                            control.value = options[nextIndex];
                            this.settings[control.id] = control.value;
                            this._applySetting(control.id, control.value);
                            break;
                        }
                    }

                    // Notifica mudança
                    if (this.onSettingsChange) {
                        this.onSettingsChange(this.settings);
                    }

                    return control.id;
                }
            }

            return null;
        }

        // ============================================================
        // 11. APLICAÇÃO DE CONFIGURAÇÕES
        // ============================================================

        _applySetting(id, value) {
            switch (id) {
                case 'sound':
                    if (this.audio) {
                        this.audio.enabled = value;
                    }
                    break;
                case 'soundVolume':
                    if (this.audio) {
                        this.audio.setVolume('master', value / 100);
                    }
                    break;
                case 'musicVolume':
                    if (this.audio) {
                        this.audio.setVolume('music', value / 100);
                    }
                    break;
                case 'fps':
                    // Aplica limite de FPS (será usado pelo loop principal)
                    if (this.game) {
                        this.game.config.targetFPS = value === 'Desbloqueado' ? 0 : parseInt(value);
                    }
                    break;
                case 'graphics':
                    // Aplica qualidade gráfica
                    if (this.renderer) {
                        const quality = value.toLowerCase();
                        this.renderer.quality = quality;
                        // Ajusta configurações de renderização
                        this._applyGraphicsQuality(quality);
                    }
                    break;
                case 'vibration':
                    // Vibração (navegador)
                    if (value && 'vibrate' in navigator) {
                        navigator.vibrate(10);
                    }
                    break;
            }
        }

        _applyGraphicsQuality(quality) {
            const settings = {
                'baixa': { shadows: false, particles: 0.3, antialiasing: false, textures: 'low' },
                'média': { shadows: true, particles: 0.6, antialiasing: true, textures: 'medium' },
                'alta': { shadows: true, particles: 0.9, antialiasing: true, textures: 'high' },
                'ultra': { shadows: true, particles: 1.0, antialiasing: true, textures: 'ultra' },
            };

            const config = settings[quality] || settings['média'];

            // Aplica configurações ao renderer
            if (this.renderer) {
                this.renderer.shadows = config.shadows;
                this.renderer.particleQuality = config.particles;
                this.renderer.antialiasing = config.antialiasing;
            }

            // Aplica ao sistema de partículas
            if (this.game && this.game.particleSystem) {
                const maxParticles = Math.round(1000 * config.particles);
                this.game.particleSystem.maxParticles = maxParticles;
            }
        }

        // ============================================================
        // 12. NAVEGAÇÃO POR TECLADO
        // ============================================================

        handleKeyDown(key) {
            if (!this.visible) return false;

            switch (key) {
                case 'ArrowUp':
                case 'ArrowDown': {
                    const dir = key === 'ArrowUp' ? -1 : 1;
                    const newIndex = (this.selectedIndex + dir + this.controls.length) % this.controls.length;
                    this.selectedIndex = newIndex;
                    this.hoveredIndex = newIndex;
                    return true;
                }
                case 'Enter':
                case ' ':
                    if (this.selectedIndex >= 0 && this.selectedIndex < this.controls.length) {
                        const control = this.controls[this.selectedIndex];
                        // Simula clique
                        const boxWidth = this.config.layout.width;
                        const boxX = (this.renderer?.width || 800) / 2 - boxWidth / 2;
                        const clickX = boxX + boxWidth / 2;
                        const clickY = 0; // Será calculado
                        return this.handleClick(clickX, clickY) !== null;
                    }
                    return false;
                case 'Escape':
                    this.hide();
                    return true;
                default:
                    return false;
            }
        }

        // ============================================================
        // 13. OBTENÇÃO DE VALORES
        // ============================================================

        getSetting(id) {
            return this.settings[id];
        }

        getAllSettings() {
            return { ...this.settings };
        }

        // ============================================================
        // 14. RESET PARA PADRÃO
        // ============================================================

        resetToDefaults() {
            this.settings = {
                sound: true,
                music: true,
                vibration: true,
                fps: '60',
                graphics: 'Alta',
                soundVolume: 80,
                musicVolume: 70,
            };
            this._updateControls();
            this.saveSettings();

            // Aplica configurações
            for (const [key, value] of Object.entries(this.settings)) {
                this._applySetting(key, value);
            }

            return this;
        }

        // ============================================================
        // 15. ESTATÍSTICAS
        // ============================================================

        getStats() {
            return {
                visible: this.visible,
                animating: this.animating,
                progress: this.animationProgress,
                selectedIndex: this.selectedIndex,
                hoveredIndex: this.hoveredIndex,
                controls: this.controls.length,
                settings: { ...this.settings },
            };
        }

        // ============================================================
        // 16. DESTRUIÇÃO
        // ============================================================

        destroy() {
            this.controls = [];
            this.renderer = null;
            this.game = null;
            this.audio = null;
            this.onClose = null;
            this.onSave = null;
            this.onSettingsChange = null;
            return this;
        }
    }

    // ============================================================
    // 17. EXPORTAÇÃO
    // ============================================================

    const SettingsModule = {
        Config: SettingsConfig,
        SettingsMenu: SettingsMenu,

        create: (options) => new SettingsMenu(options),
    };

    // ============================================================
    // 18. EXPORTA PARA O GLOBAL
    // ============================================================

    global.SettingsModule = SettingsModule;
    global.SettingsMenu = SettingsMenu;

    console.log('[Settings] Módulo de configurações carregado');

})(typeof window !== 'undefined' ? window : this);
