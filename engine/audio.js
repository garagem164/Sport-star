// engine/audio.js — Sistema de áudio com Web Audio API
// Efeitos: Gol, Colisão, Parede, Clique, Apito, Vitória
(function(global) {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÕES DE ÁUDIO
    // ============================================================
    const AudioConfig = {
        // Volume global
        masterVolume: 0.8,
        
        // Volumes individuais
        volumes: {
            goal: 0.9,
            collision: 0.6,
            wall: 0.5,
            click: 0.4,
            whistle: 0.7,
            victory: 0.8,
            ambient: 0.2,
        },

        // Frequências base
        frequencies: {
            goal: [523, 659, 784, 1047], // C5, E5, G5, C6
            collision: [200, 150, 100],
            wall: [120, 80],
            click: [800, 1000],
            whistle: [1000, 1200],
            victory: [523, 587, 659, 784, 880, 988, 1047],
        },

        // Durações (em segundos)
        durations: {
            goal: 0.8,
            collision: 0.15,
            wall: 0.1,
            click: 0.05,
            whistle: 0.3,
            victory: 1.5,
        },

        // Efeitos
        effects: {
            reverb: true,
            delay: true,
            distortion: false,
        },
    };

    // ============================================================
    // 2. CLASSE PRINCIPAL DE ÁUDIO
    // ============================================================
    class AudioManager {
        constructor(options = {}) {
            this.config = { ...AudioConfig, ...options };
            
            // Estado
            this.initialized = false;
            this.enabled = true;
            this.masterGain = null;
            this.audioContext = null;
            this.sounds = {};
            this.playingSounds = [];
            
            // Bind
            this._init = this._init.bind(this);
        }

        // ============================================================
        // 3. INICIALIZAÇÃO
        // ============================================================

        init() {
            if (this.initialized) return this;
            
            try {
                // Cria AudioContext
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Master gain
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this.config.masterVolume;
                this.masterGain.connect(this.audioContext.destination);
                
                // Configura sons
                this._setupSounds();
                
                this.initialized = true;
                console.log('[Audio] Sistema de áudio inicializado');
            } catch (error) {
                console.warn('[Audio] Erro ao inicializar:', error);
                this.enabled = false;
            }
            
            return this;
        }

        // ============================================================
        // 4. CONFIGURAÇÃO DE SONS
        // ============================================================

        _setupSounds() {
            this.sounds = {
                goal: this._createGoalSound.bind(this),
                collision: this._createCollisionSound.bind(this),
                wall: this._createWallSound.bind(this),
                click: this._createClickSound.bind(this),
                whistle: this._createWhistleSound.bind(this),
                victory: this._createVictorySound.bind(this),
            };
        }

        // ============================================================
        // 5. CRIAÇÃO DE SONS COM WEB AUDIO API
        // ============================================================

        // --- GOL ---
        _createGoalSound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.goal;
            const frequencies = this.config.frequencies.goal;
            
            // Cria um nó de ganho mestre para este som
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.goal * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Toque uma melodia ascendente
            const notes = frequencies.length;
            const noteDuration = duration / notes;
            
            for (let i = 0; i < notes; i++) {
                const osc = context.createOscillator();
                const noteGain = context.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = frequencies[i];
                
                // Envelope de volume
                noteGain.gain.setValueAtTime(0, now + i * noteDuration);
                noteGain.gain.linearRampToValueAtTime(0.5, now + i * noteDuration + 0.02);
                noteGain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * noteDuration);
                
                osc.connect(noteGain);
                noteGain.connect(gainNode);
                
                osc.start(now + i * noteDuration);
                osc.stop(now + (i + 1) * noteDuration);
            }
            
            // Efeito de reverberação (delay simples)
            if (this.config.effects.reverb) {
                const delay = context.createDelay(0.5);
                const delayGain = context.createGain();
                
                delay.delayTime.value = 0.15;
                delayGain.gain.value = 0.15;
                
                gainNode.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(this.masterGain);
            }
            
            // Finaliza o som
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 100);
            
            return gainNode;
        }

        // --- COLISÃO ---
        _createCollisionSound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.collision;
            const frequencies = this.config.frequencies.collision;
            
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.collision * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Som de impacto com ruído e tons
            // Ruído de impacto
            const bufferSize = context.sampleRate * duration;
            const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const decay = Math.exp(-i / (bufferSize * 0.3));
                data[i] = (Math.random() * 2 - 1) * decay;
            }
            
            const noise = context.createBufferSource();
            noise.buffer = buffer;
            
            const noiseGain = context.createGain();
            noiseGain.gain.value = 0.3;
            
            noise.connect(noiseGain);
            noiseGain.connect(gainNode);
            noise.start(now);
            noise.stop(now + duration);
            
            // Tons de impacto
            for (let i = 0; i < frequencies.length; i++) {
                const osc = context.createOscillator();
                const oscGain = context.createGain();
                
                osc.type = i === 0 ? 'square' : 'sine';
                osc.frequency.value = frequencies[i];
                
                oscGain.gain.setValueAtTime(0.2 / (i + 1), now);
                oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
                
                osc.connect(oscGain);
                oscGain.connect(gainNode);
                
                osc.start(now);
                osc.stop(now + duration);
            }
            
            // Efeito de distorção (opcional)
            if (this.config.effects.distortion) {
                const distortion = context.createWaveShaper();
                distortion.curve = this._createDistortionCurve(10);
                gainNode.connect(distortion);
                distortion.connect(this.masterGain);
            }
            
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 50);
            
            return gainNode;
        }

        // --- PAREDE ---
        _createWallSound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.wall;
            
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.wall * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Som de impacto mais suave
            const osc = context.createOscillator();
            const oscGain = context.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 150 + Math.random() * 100;
            
            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            
            osc.start(now);
            osc.stop(now + duration);
            
            // Pequeno ruído
            const bufferSize = context.sampleRate * duration * 0.5;
            const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const decay = Math.exp(-i / (bufferSize * 0.2));
                data[i] = (Math.random() * 2 - 1) * decay * 0.3;
            }
            
            const noise = context.createBufferSource();
            noise.buffer = buffer;
            
            const noiseGain = context.createGain();
            noiseGain.gain.value = 0.2;
            
            noise.connect(noiseGain);
            noiseGain.connect(gainNode);
            noise.start(now);
            noise.stop(now + duration);
            
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 50);
            
            return gainNode;
        }

        // --- CLIQUE ---
        _createClickSound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.click;
            
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.click * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Clique curto e agudo
            const osc = context.createOscillator();
            const oscGain = context.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 800 + Math.random() * 400;
            
            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            
            osc.start(now);
            osc.stop(now + duration);
            
            // Ruído curto
            const bufferSize = context.sampleRate * duration;
            const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const decay = Math.exp(-i / (bufferSize * 0.3));
                data[i] = (Math.random() * 2 - 1) * decay * 0.5;
            }
            
            const noise = context.createBufferSource();
            noise.buffer = buffer;
            
            const noiseGain = context.createGain();
            noiseGain.gain.value = 0.2;
            
            noise.connect(noiseGain);
            noiseGain.connect(gainNode);
            noise.start(now);
            noise.stop(now + duration);
            
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 50);
            
            return gainNode;
        }

        // --- APITO ---
        _createWhistleSound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.whistle;
            
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.whistle * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Apito com frequência modulada
            const osc = context.createOscillator();
            const oscGain = context.createGain();
            
            osc.type = 'sawtooth';
            
            // Modulação de frequência (efeito de apito)
            const freqMod = context.createOscillator();
            const freqGain = context.createGain();
            
            freqMod.type = 'sine';
            freqMod.frequency.value = 8;
            
            freqGain.gain.value = 50;
            
            freqMod.connect(freqGain);
            freqGain.connect(osc.frequency);
            
            osc.frequency.value = 1000;
            
            oscGain.gain.setValueAtTime(0.4, now);
            oscGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            
            osc.start(now);
            osc.stop(now + duration);
            
            freqMod.start(now);
            freqMod.stop(now + duration);
            
            // Harmônicos para enriquecer o som
            const osc2 = context.createOscillator();
            const osc2Gain = context.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.value = 2000;
            
            osc2Gain.gain.setValueAtTime(0.15, now);
            osc2Gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc2.connect(osc2Gain);
            osc2Gain.connect(gainNode);
            
            osc2.start(now);
            osc2.stop(now + duration);
            
            // Efeito de delay
            if (this.config.effects.delay) {
                const delay = context.createDelay(0.3);
                const delayGain = context.createGain();
                
                delay.delayTime.value = 0.08;
                delayGain.gain.value = 0.2;
                
                gainNode.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(this.masterGain);
            }
            
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 100);
            
            return gainNode;
        }

        // --- VITÓRIA ---
        _createVictorySound() {
            const context = this.audioContext;
            const now = context.currentTime;
            const duration = this.config.durations.victory;
            const frequencies = this.config.frequencies.victory;
            
            const gainNode = context.createGain();
            gainNode.gain.value = this.config.volumes.victory * this.config.masterVolume;
            gainNode.connect(this.masterGain);
            
            // Melodia de vitória (escala ascendente)
            const noteDuration = duration / frequencies.length;
            
            for (let i = 0; i < frequencies.length; i++) {
                const osc = context.createOscillator();
                const noteGain = context.createGain();
                const startTime = now + i * noteDuration;
                
                osc.type = i % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.value = frequencies[i];
                
                // Envelope
                noteGain.gain.setValueAtTime(0, startTime);
                noteGain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
                noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 0.9);
                
                osc.connect(noteGain);
                noteGain.connect(gainNode);
                
                osc.start(startTime);
                osc.stop(startTime + noteDuration);
            }
            
            // Harmônicos para enriquecer
            const oscHarm = context.createOscillator();
            const harmGain = context.createGain();
            
            oscHarm.type = 'sine';
            oscHarm.frequency.value = 1047 * 2;
            
            harmGain.gain.setValueAtTime(0.05, now);
            harmGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            oscHarm.connect(harmGain);
            harmGain.connect(gainNode);
            
            oscHarm.start(now);
            oscHarm.stop(now + duration);
            
            // Efeito de reverb
            if (this.config.effects.reverb) {
                const delay = context.createDelay(0.8);
                const delayGain = context.createGain();
                
                delay.delayTime.value = 0.2;
                delayGain.gain.value = 0.15;
                
                gainNode.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(this.masterGain);
            }
            
            setTimeout(() => {
                gainNode.disconnect();
            }, duration * 1000 + 200);
            
            return gainNode;
        }

        // ============================================================
        // 6. UTILITÁRIOS DE ÁUDIO
        // ============================================================

        _createDistortionCurve(amount) {
            const samples = 44100;
            const curve = new Float32Array(samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < samples; i++) {
                const x = (i / samples) * 2 - 1;
                curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
            }
            
            return curve;
        }

        // ============================================================
        // 7. MÉTODOS PÚBLICOS PARA REPRODUÇÃO
        // ============================================================

        play(soundName, options = {}) {
            if (!this.enabled || !this.initialized) {
                console.warn('[Audio] Áudio desabilitado ou não inicializado');
                return null;
            }

            // Resumo do AudioContext se estiver suspenso
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const soundFn = this.sounds[soundName];
            if (!soundFn) {
                console.warn(`[Audio] Som "${soundName}" não encontrado`);
                return null;
            }

            try {
                const sound = soundFn.call(this);
                if (sound) {
                    this.playingSounds.push(sound);
                    
                    // Limpa sons finalizados
                    setTimeout(() => {
                        this.playingSounds = this.playingSounds.filter(s => s !== sound);
                    }, 2000);
                }
                return sound;
            } catch (error) {
                console.warn(`[Audio] Erro ao tocar "${soundName}":`, error);
                return null;
            }
        }

        // --- Atalhos para cada som ---
        playGoal() {
            return this.play('goal');
        }

        playCollision() {
            return this.play('collision');
        }

        playWall() {
            return this.play('wall');
        }

        playClick() {
            return this.play('click');
        }

        playWhistle() {
            return this.play('whistle');
        }

        playVictory() {
            return this.play('victory');
        }

        // ============================================================
        // 8. CONTROLE DE VOLUME
        // ============================================================

        setMasterVolume(volume) {
            this.config.masterVolume = Math.max(0, Math.min(1, volume));
            if (this.masterGain) {
                this.masterGain.gain.value = this.config.masterVolume;
            }
            return this;
        }

        setVolume(soundName, volume) {
            if (this.config.volumes[soundName] !== undefined) {
                this.config.volumes[soundName] = Math.max(0, Math.min(1, volume));
            }
            return this;
        }

        getVolume(soundName) {
            return this.config.volumes[soundName] || 0;
        }

        // ============================================================
        // 9. CONTROLE DE ESTADO
        // ============================================================

        enable() {
            this.enabled = true;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return this;
        }

        disable() {
            this.enabled = false;
            if (this.audioContext) {
                this.audioContext.suspend();
            }
            return this;
        }

        toggle() {
            this.enabled = !this.enabled;
            if (this.enabled && this.audioContext) {
                this.audioContext.resume();
            } else if (this.audioContext) {
                this.audioContext.suspend();
            }
            return this.enabled;
        }

        // ============================================================
        // 10. LIMPEZA
        // ============================================================

        cleanup() {
            // Para todos os sons em reprodução
            for (const sound of this.playingSounds) {
                try {
                    sound.disconnect();
                } catch (e) {
                    // Ignora erros
                }
            }
            this.playingSounds = [];

            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }

            this.initialized = false;
            console.log('[Audio] Sistema de áudio limpo');
            return this;
        }

        // ============================================================
        // 11. STATUS
        // ============================================================

        getStatus() {
            return {
                initialized: this.initialized,
                enabled: this.enabled,
                contextState: this.audioContext ? this.audioContext.state : 'none',
                masterVolume: this.config.masterVolume,
                playingSounds: this.playingSounds.length,
                sounds: Object.keys(this.sounds),
            };
        }
    }

    // ============================================================
    // 12. EXPORTAÇÃO
    // ============================================================

    const AudioModule = {
        Config: AudioConfig,
        AudioManager: AudioManager,

        create: (options) => new AudioManager(options),
    };

    // ============================================================
    // 13. EXPORTA PARA O GLOBAL
    // ============================================================

    global.AudioModule = AudioModule;
    global.AudioManager = AudioManager;

    console.log('[Audio] Módulo de áudio carregado');

})(typeof window !== 'undefined' ? window : this);
