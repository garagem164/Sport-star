// ============================================
// ESTADO DO JOGO (IDLE VERSION)
// ============================================
let jogo = {
    dinheiro: 100,
    dinheiroPorSegundo: 1,
    trofeus: 0,
    nivel: 1,
    esporteAtual: "futebol",
    partidasTotais: 0,
    tempoJogado: 0,
    estatisticas: {
        gols: 0,
        assistencias: 0,
        partidas: 0,
        vitorias: 0,
        golsSofridos: 0,
        torneiosVencidos: 0,
        finalizacoes: 0,
        cartoes: 0
    },
    inventario: {
        chuteira: false,
        bola: false,
        uniforme: false,
        tecnico: false
    },
    time: {
        atacante: { nivel: 1, habilidade: 0, custo: 8, nome: "Atacante" },
        meio: { nivel: 1, habilidade: 0, custo: 8, nome: "Meio-campo" },
        defensor: { nivel: 1, habilidade: 0, custo: 8, nome: "Defensor" },
        goleiro: { nivel: 1, habilidade: 0, custo: 8, nome: "Goleiro" }
    },
    esportes: {
        futebol: { 
            nomeAtleta: "Jogador de Futebol", 
            nivel: 1, 
            custoTreino: 10, 
            habilidade: 5, 
            rivalNome: "Bot F.C.", 
            rivalHabilidade: 8, 
            desbloqueado: true,
            rivalVitorias: 0,
            vitoriasConsecutivas: 0
        },
        basquete: { 
            nomeAtleta: "Cestinha de Basquete", 
            nivel: 1, 
            custoTreino: 50, 
            habilidade: 10, 
            rivalNome: "Robo Bulls", 
            rivalHabilidade: 18, 
            desbloqueado: false,
            rivalVitorias: 0,
            vitoriasConsecutivas: 0
        }
    },
    ultimoResultado: null
};

// ============================================
// CONFIGURAÇÕES
// ============================================
const CONFIG = {
    intervaloPartida: 30000, // 30 segundos entre partidas
    intervaloSimulacao: 1500, // 1.5 segundos entre lances
    maxGolsPorPartida: 5,
    tempoPartidaFutebol: 90,
    tempoPartidaBasquete: 40
};

const torneios = {
    futebol: {
        amador: { premio: 50, trofeus: 1, partidas: 3, nivelMin: 5, nome: "Amador" },
        profissional: { premio: 200, trofeus: 3, partidas: 5, nivelMin: 15, nome: "Profissional" },
        elite: { premio: 500, trofeus: 5, partidas: 7, nivelMin: 30, nome: "Elite" }
    },
    basquete: {
        amador: { premio: 100, trofeus: 1, partidas: 3, nivelMin: 10, nome: "Amador" },
        profissional: { premio: 500, trofeus: 3, partidas: 5, nivelMin: 25, nome: "Profissional" },
        elite: { premio: 1000, trofeus: 5, partidas: 7, nivelMin: 40, nome: "Elite" }
    }
};

const itensLoja = {
    chuteira: { nome: "Chuteira Pro", bonus: 5, custo: 150, icone: "👟" },
    bola: { nome: "Bola Oficial", bonus: 3, custo: 200, icone: "⚽" },
    uniforme: { nome: "Kit Elite", bonus: 7, custo: 300, icone: "👕" },
    tecnico: { nome: "Técnico Experiente", bonus: 10, custo: 500, icone: "📋" }
};

// ============================================
// VARIÁVEIS DE CONTROLE
// ============================================
let emPartida = false;
let torneioAtivo = false;
let loopSimulador = null;
let intervaloTorneio = null;
let ultimaPartida = null;
let tempoSimulacao = 0;
let golsSimuladosJogador = 0;
let golsSimuladosRival = 0;

// ============================================
// LOOP PRINCIPAL (IDLE)
// ============================================

// Loop de dinheiro passivo
setInterval(() => {
    jogo.dinheiro += jogo.dinheiroPorSegundo;
    jogo.tempoJogado += 1;
    atualizarInterface();
}, 1000);

// Loop de partidas automáticas (IDLE)
setInterval(() => {
    if (!emPartida && !torneioAtivo) {
        executarPartidaAutomatica();
    }
}, CONFIG.intervaloPartida);

// Loop do simulador visual (sempre rodando)
setInterval(() => {
    if (!document.getElementById('aba-partidas').classList.contains('oculta')) {
        atualizarSimuladorVisual();
    }
}, CONFIG.intervaloSimulacao);

// ============================================
// SISTEMA DE PARTIDAS AUTOMÁTICAS (IDLE)
// ============================================

function executarPartidaAutomatica() {
    const esp = jogo.esportes[jogo.esporteAtual];
    const habilidadeTotal = getHabilidadeTotal();
    
    // Simula resultado
    const resultado = simularPartida(habilidadeTotal, esp.rivalHabilidade);
    
    // Aplica resultado
    aplicarResultadoPartida(resultado, esp);
    
    // Atualiza o simulador visual
    ultimaPartida = resultado;
    golsSimuladosJogador = resultado.golsJogador;
    golsSimuladosRival = resultado.golsRival;
    tempoSimulacao = 0;
    
    atualizarInterface();
}

function simularPartida(habilidadeJogador, habilidadeRival) {
    const sorte = Math.random() * 20;
    const forcaJogador = habilidadeJogador + sorte;
    const forcaRival = habilidadeRival + (Math.random() * 15);
    
    const golsJogador = Math.floor((forcaJogador / 15) * (Math.random() * 3 + 1));
    const golsRival = Math.floor((forcaRival / 15) * (Math.random() * 3 + 1));
    
    const maxGols = CONFIG.maxGolsPorPartida;
    const golsJ = Math.min(golsJogador, maxGols);
    const golsR = Math.min(golsRival, maxGols);
    
    let resultado;
    if (golsJ > golsR) resultado = 'vitoria';
    else if (golsJ < golsR) resultado = 'derrota';
    else resultado = 'empate';
    
    return {
        resultado: resultado,
        golsJogador: golsJ,
        golsRival: golsR,
        finalizacoes: Math.floor(habilidadeJogador / 5) + Math.floor(Math.random() * 5),
        cartoes: Math.floor(Math.random() * 3)
    };
}

function aplicarResultadoPartida(resultado, esp) {
    jogo.partidasTotais++;
    jogo.estatisticas.partidas++;
    jogo.estatisticas.gols += resultado.golsJogador;
    jogo.estatisticas.golsSofridos += resultado.golsRival;
    jogo.estatisticas.finalizacoes += resultado.finalizacoes || 0;
    jogo.estatisticas.cartoes += resultado.cartoes || 0;
    
    if (resultado.golsJogador > 0) {
        jogo.estatisticas.assistencias += Math.floor(Math.random() * resultado.golsJogador) + 1;
    }
    
    if (resultado.resultado === 'vitoria') {
        jogo.estatisticas.vitorias++;
        esp.vitoriasConsecutivas++;
        esp.rivalVitorias = 0;
        
        const premio = (jogo.esporteAtual === "basquete") ? 200 : 50;
        const bonus = Math.floor(esp.vitoriasConsecutivas * 5);
        jogo.dinheiro += premio + bonus;
        jogo.trofeus += 1;
        
        if (esp.vitoriasConsecutivas >= 5) {
            esp.rivalHabilidade += 5;
            esp.rivalNome = `${esp.rivalNome} ⭐`;
            esp.vitoriasConsecutivas = 0;
        }
        
        const xp = Math.floor(resultado.golsJogador * 2);
        esp.habilidade += Math.floor(xp / 3);
        jogo.nivel = Math.max(jogo.nivel, esp.nivel);
        
    } else if (resultado.resultado === 'derrota') {
        esp.rivalVitorias++;
        esp.vitoriasConsecutivas = 0;
        
        if (esp.rivalVitorias >= 3) {
            esp.rivalHabilidade += 3;
            esp.rivalNome = `${esp.rivalNome} 🔥`;
            esp.rivalVitorias = 0;
        }
    } else {
        esp.vitoriasConsecutivas = 0;
    }
    
    jogo.ultimoResultado = resultado;
    ultimaPartida = resultado;
}

// ============================================
// CÁLCULO DE HABILIDADE TOTAL
// ============================================

function getHabilidadeTotal() {
    const esp = jogo.esportes[jogo.esporteAtual];
    let total = esp.habilidade;
    
    if (jogo.inventario.chuteira) total += 5;
    if (jogo.inventario.bola) total += 3;
    if (jogo.inventario.uniforme) total += 7;
    if (jogo.inventario.tecnico) total += 10;
    
    for (let pos in jogo.time) {
        total += jogo.time[pos].habilidade * 0.2;
    }
    
    return Math.floor(total);
}

// ============================================
// SIMULADOR VISUAL (ATUALIZAÇÃO AUTOMÁTICA)
// ============================================

function atualizarSimuladorVisual() {
    const container = document.getElementById('simulador-container');
    if (!container) return;
    
    const esp = jogo.esportes[jogo.esporteAtual];
    const habilidadeTotal = getHabilidadeTotal();
    
    // Se não houver campo criado, cria
    if (document.getElementById('campo-jogo').children.length === 0) {
        criarCampo();
    }
    
    // Atualiza placar
    document.getElementById('gols-jogador').textContent = golsSimuladosJogador || 0;
    document.getElementById('gols-rival').textContent = golsSimuladosRival || 0;
    document.getElementById('nome-rival-placar').textContent = esp.rivalNome;
    document.getElementById('habilidade-atual').textContent = habilidadeTotal;
    
    // Atualiza tempo
    tempoSimulacao += CONFIG.intervaloSimulacao / 1000;
    const minutos = Math.floor(tempoSimulacao / 60);
    const segundos = Math.floor(tempoSimulacao % 60);
    document.getElementById('tempo-jogo').textContent = 
        `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    
    // Movimenta jogadores e bola
    moverJogadores(habilidadeTotal, esp.rivalHabilidade);
    
    // Atualiza estatísticas
    document.getElementById('finalizacoes').textContent = jogo.estatisticas.finalizacoes || 0;
    document.getElementById('cartoes').textContent = jogo.estatisticas.cartoes || 0;
    
    // Posse de bola
    const posse = Math.floor(50 + ((habilidadeTotal - esp.rivalHabilidade) / 2));
    document.getElementById('posse-bola').textContent = `${Math.min(Math.max(posse, 20), 80)}%`;
    
    // Mensagem do lance
    const msg = document.getElementById('lance-atual');
    if (ultimaPartida) {
        if (ultimaPartida.resultado === 'vitoria') {
            msg.innerText = '🏆 VITÓRIA! Seu time está arrasando!';
            msg.style.color = '#00b37e';
        } else if (ultimaPartida.resultado === 'derrota') {
            msg.innerText = '💔 Derrota! O rival está forte hoje.';
            msg.style.color = '#f75a68';
        } else if (ultimaPartida.resultado === 'empate') {
            msg.innerText = '🤝 Empate! Jogo muito equilibrado.';
            msg.style.color = '#e1b12c';
        }
    } else {
        msg.innerText = '⏳ Aguardando primeira partida...';
        msg.style.color = '#a8a8b3';
    }
}

function criarCampo() {
    const campo = document.getElementById('campo-jogo');
    campo.innerHTML = '';
    campo.className = '';
    campo.classList.add(`campo-${jogo.esporteAtual}`);
    
    // Jogadores do time (azul) - 11 jogadores
    const posicoesTime = [
        { x: 10, y: 45, nome: 'GL' },  // Goleiro
        { x: 25, y: 25, nome: 'DF' },  // Defensores
        { x: 25, y: 45, nome: 'DF' },
        { x: 25, y: 65, nome: 'DF' },
        { x: 40, y: 15, nome: 'MC' },  // Meio-campo
        { x: 40, y: 35, nome: 'MC' },
        { x: 40, y: 55, nome: 'MC' },
        { x: 40, y: 75, nome: 'MC' },
        { x: 60, y: 25, nome: 'AT' },  // Atacantes
        { x: 60, y: 45, nome: 'AT' },
        { x: 60, y: 65, nome: 'AT' }
    ];
    
    posicoesTime.forEach((pos, i) => {
        const jogador = document.createElement('div');
        jogador.className = `jogador-campo jogador-time${i === 0 ? ' jogador-goleiro' : ''}`;
        jogador.id = `jogador-time-${i}`;
        jogador.style.left = `${pos.x}%`;
        jogador.style.top = `${pos.y}%`;
        jogador.textContent = pos.nome;
        campo.appendChild(jogador);
    });
    
    // Jogadores do rival (vermelho) - 11 jogadores
    const posicoesRival = [
        { x: 90, y: 45, nome: 'GL' },  // Goleiro
        { x: 75, y: 25, nome: 'DF' },  // Defensores
        { x: 75, y: 45, nome: 'DF' },
        { x: 75, y: 65, nome: 'DF' },
        { x: 60, y: 15, nome: 'MC' },  // Meio-campo
        { x: 60, y: 35, nome: 'MC' },
        { x: 60, y: 55, nome: 'MC' },
        { x: 60, y: 75, nome: 'MC' },
        { x: 40, y: 25, nome: 'AT' },  // Atacantes
        { x: 40, y: 45, nome: 'AT' },
        { x: 40, y: 65, nome: 'AT' }
    ];
    
    posicoesRival.forEach((pos, i) => {
        const jogador = document.createElement('div');
        jogador.className = `jogador-campo jogador-rival${i === 0 ? ' jogador-goleiro' : ''}`;
        jogador.id = `jogador-rival-${i}`;
        jogador.style.left = `${pos.x}%`;
        jogador.style.top = `${pos.y}%`;
        jogador.textContent = pos.nome;
        campo.appendChild(jogador);
    });
    
    // Bola
    const bola = document.createElement('div');
    bola.className = `bola-campo${jogo.esporteAtual === 'basquete' ? ' bola-basquete' : ''}`;
    bola.id = 'bola-campo';
    bola.style.left = '48%';
    bola.style.top = '48%';
    campo.appendChild(bola);
}

function moverJogadores(habilidadeJogador, habilidadeRival) {
    const jogadores = document.querySelectorAll('.jogador-campo');
    const fator = Math.random() * 20;
    
    jogadores.forEach((jogador, index) => {
        // Movimento mais realista: cada jogador se move em uma área
        const baseX = index % 11;
        const baseY = Math.floor(index / 11);
        
        let x = (baseX * 8) + 5 + (Math.random() * 10 - 5);
        let y = (baseY * 40) + 10 + (Math.random() * 15 - 7);
        
        // Jogadores do time se movem mais para frente se estiverem atacando
        if (jogador.classList.contains('jogador-time') && habilidadeJogador > habilidadeRival) {
            x += Math.random() * 10;
        }
        
        // Jogadores do rival se movem mais para frente se estiverem atacando
        if (jogador.classList.contains('jogador-rival') && habilidadeRival > habilidadeJogador) {
            x -= Math.random() * 10;
        }
        
        // Limita dentro do campo
        x = Math.min(Math.max(x, 3), 94);
        y = Math.min(Math.max(y, 3), 90);
        
        jogador.style.left = `${x}%`;
        jogador.style.top = `${y}%`;
    });
    
    // Move a bola
    const bola = document.getElementById('bola-campo');
    if (bola) {
        const forcaJogador = habilidadeJogador + (Math.random() * 15);
        const forcaRival = habilidadeRival + (Math.random() * 15);
        
        let x = 48 + (Math.random() * 10 - 5);
        let y = 48 + (Math.random() * 10 - 5);
        
        if (forcaJogador > forcaRival + 5) {
            x = 70 + Math.random() * 20;
            y = 30 + Math.random() * 40;
            
            // Chance de gol
            if (Math.random() > 0.85) {
                golsSimuladosJogador += (jogo.esporteAtual === 'basquete') ? 2 : 1;
                document.getElementById('gols-jogador').textContent = golsSimuladosJogador;
                document.getElementById('lance-atual').innerText = '⚽ GOL DO SEU TIME!';
                document.getElementById('lance-atual').style.color = '#00b37e';
            }
        } else if (forcaRival > forcaJogador + 5) {
            x = 10 + Math.random() * 20;
            y = 30 + Math.random() * 40;
            
            // Chance de gol do rival
            if (Math.random() > 0.85) {
                golsSimuladosRival += (jogo.esporteAtual === 'basquete') ? 2 : 1;
                document.getElementById('gols-rival').textContent = golsSimuladosRival;
                document.getElementById('lance-atual').innerText = '⚽ GOL DO RIVAL!';
                document.getElementById('lance-atual').style.color = '#f75a68';
            }
        }
        
        x = Math.min(Math.max(x, 5), 93);
        y = Math.min(Math.max(y, 5), 90);
        
        bola.style.left = `${x}%`;
        bola.style.top = `${y}%`;
    }
}

// ============================================
// TORNEIOS
// ============================================

function iniciarTorneio(nivel) {
    if (torneioAtivo || emPartida) {
        alert('❌ Já há um torneio em andamento!');
        return;
    }
    
    const esp = jogo.esportes[jogo.esporteAtual];
    const config = torneios[jogo.esporteAtual][nivel];
    
    if (!config) {
        alert('❌ Nível de torneio inválido!');
        return;
    }
    
    if (esp.habilidade < config.nivelMin) {
        alert(`❌ Habilidade mínima: ${config.nivelMin}\nSua habilidade: ${esp.habilidade}`);
        return;
    }
    
    torneioAtivo = true;
    let vitorias = 0;
    let partidasJogadas = 0;
    let totalGols = 0;
    
    alert(`🏅 Torneio ${config.nome} iniciado! ${config.partidas} partidas.`);
    
    intervaloTorneio = setInterval(() => {
        if (partidasJogadas >= config.partidas) {
            clearInterval(intervaloTorneio);
            finalizarTorneio(vitorias, config);
            return;
        }
        
        const habilidadeTotal = getHabilidadeTotal();
        const resultado = simularPartida(habilidadeTotal, esp.rivalHabilidade + (partidasJogadas * 2));
        
        if (resultado.resultado === 'vitoria') {
            vitorias++;
            totalGols += resultado.golsJogador;
        }
        
        partidasJogadas++;
        
        // Atualiza visual do torneio
        document.getElementById('lance-atual').innerText = 
            `🏟️ Torneio: ${partidasJogadas}/${config.partidas} | Vitórias: ${vitorias}`;
        document.getElementById('lance-atual').style.color = '#e1b12c';
        
        atualizarInterface();
            
    }, 3000);
}

function finalizarTorneio(vitorias, config) {
    torneioAtivo = false;
    
    const premio = vitorias >= config.partidas / 2 ? config.premio + (vitorias * 10) : 0;
    const trofeus = vitorias === config.partidas ? config.trofeus : Math.floor(vitorias / 2);
    
    jogo.dinheiro += premio;
    jogo.trofeus += trofeus;
    jogo.estatisticas.partidas += config.partidas;
    jogo.estatisticas.vitorias += vitorias;
    
    if (vitorias === config.partidas) {
        jogo.estatisticas.torneiosVencidos++;
    }
    
    let mensagem = `🏆 TORNEIO FINALIZADO!\n`;
    mensagem += `📊 Vitórias: ${vitorias}/${config.partidas}\n`;
    mensagem += `💰 Prêmio: $${premio}\n`;
    mensagem += `🏅 Troféus: ${trofeus}`;
    
    alert(mensagem);
    document.getElementById('lance-atual').innerText = `🏆 Torneio finalizado! ${vitorias} vitórias`;
    atualizarInterface();
}

// ============================================
// FUNÇÕES DE TREINO
// ============================================

function selecionarEsporte(esporte) {
    if (emPartida || torneioAtivo) return;
    
    if (esporte === 'basquete' && !jogo.esportes.basquete.desbloqueado) {
        if (jogo.trofeus >= 5) {
            jogo.esportes.basquete.desbloqueado = true;
            alert('🏀 Basquete desbloqueado!');
        } else {
            alert('❌ Precisa de 5 troféus para desbloquear o Basquete!');
            return;
        }
    }
    jogo.esporteAtual = esporte;
    
    // Recria o campo para o novo esporte
    criarCampo();
    atualizarInterface();
}

function treinarAtleta() {
    if (emPartida || torneioAtivo) return;
    
    const esp = jogo.esportes[jogo.esporteAtual];
    if (jogo.dinheiro >= esp.custoTreino) {
        jogo.dinheiro -= esp.custoTreino;
        esp.nivel++;
        esp.habilidade += 3;
        jogo.dinheiroPorSegundo += (jogo.esporteAtual === 'basquete') ? 3 : 1;
        esp.custoTreino = Math.floor(esp.custoTreino * 1.6);
        jogo.nivel = Math.max(jogo.nivel, esp.nivel);
        atualizarInterface();
    } else {
        alert('💰 Dinheiro insuficiente!');
    }
}

function treinarPosicao(posicao) {
    if (emPartida || torneioAtivo) return;
    
    const jogador = jogo.time[posicao];
    if (jogo.dinheiro >= jogador.custo) {
        jogo.dinheiro -= jogador.custo;
        jogador.nivel++;
        jogador.habilidade += 2;
        jogador.custo = Math.floor(jogador.custo * 1.5);
        atualizarInterface();
    } else {
        alert('💰 Dinheiro insuficiente!');
    }
}

// ============================================
// LOJA
// ============================================

function comprarItem(itemId) {
    if (emPartida || torneioAtivo) return;
    
    if (jogo.inventario[itemId]) {
        alert('❌ Você já possui este item!');
        return;
    }
    
    const item = itensLoja[itemId];
    if (!item) return;
    
    if (jogo.dinheiro >= item.custo) {
        jogo.dinheiro -= item.custo;
        jogo.inventario[itemId] = true;
        
        const esp = jogo.esportes[jogo.esporteAtual];
        esp.habilidade += item.bonus;
        
        alert(`✅ ${item.icone} ${item.nome} adquirido! +${item.bonus} de habilidade!`);
        atualizarInterface();
    } else {
        alert(`💰 Faltam $${item.custo - jogo.dinheiro}`);
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================

function mudarAba(idAba) {
    document.querySelectorAll('.tela-aba').forEach(aba => {
        aba.classList.add('oculta');
    });
    
    document.querySelectorAll('.btn-menu').forEach(btn => {
        btn.classList.remove('ativo');
    });
    
    document.getElementById(idAba).classList.remove('oculta');
    
    const botoes = document.querySelectorAll('.btn-menu');
    const mapa = { 'aba-treino': 0, 'aba-partidas': 1, 'aba-loja': 2, 'aba-estatisticas': 3 };
    if (mapa[idAba] !== undefined) {
        botoes[mapa[idAba]].classList.add('ativo');
    }
    
    // Se for a aba de partidas, garante que o campo está criado
    if (idAba === 'aba-partidas') {
        const campo = document.getElementById('campo-jogo');
        if (campo && campo.children.length === 0) {
            criarCampo();
        }
        // Atualiza o simulador imediatamente
        atualizarSimuladorVisual();
    }
}

// ============================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================

function atualizarInterface() {
    const esp = jogo.esportes[jogo.esporteAtual];
    
    // Recursos
    document.getElementById('dinheiro-display').innerText = `💰 Dinheiro: $${Math.floor(jogo.dinheiro)}`;
    document.getElementById('gps-display').innerText = `📈 Ganhos: $${jogo.dinheiroPorSegundo}/s`;
    document.getElementById('trofeus-display').innerText = `🏆 Troféus: ${jogo.trofeus}`;
    document.getElementById('nivel-display').innerText = `⭐ Nível: ${jogo.nivel}`;
    document.getElementById('partidas-display').innerText = `⚽ Partidas: ${jogo.partidasTotais}`;
    
    // Treino
    document.getElementById('atleta-info').innerText = `${esp.nomeAtleta} (Nível ${esp.nivel})`;
    document.getElementById('atleta-status').innerText = `Habilidade: ${esp.habilidade}`;
    document.getElementById('btn-treinar').innerText = `Treinar ($${esp.custoTreino})`;
    
    // Escalação
    for (let pos in jogo.time) {
        const jogador = jogo.time[pos];
        document.getElementById(`${pos}-nivel`).innerText = `Nv. ${jogador.nivel}`;
        document.getElementById(`${pos}-habilidade`).innerText = `Habilidade: ${jogador.habilidade}`;
        const btn = document.querySelector(`#jogadores-time .jogador-posicao button[onclick="treinarPosicao('${pos}')"]`);
        if (btn) btn.innerText = `Treinar ($${jogador.custo})`;
    }
    
    // Esportes
    document.getElementById('campeonato-atual').innerText = `(${jogo.esporteAtual.toUpperCase()})`;
    
    if (jogo.esporteAtual === 'futebol') {
        document.getElementById('btn-esporte-futebol').style.backgroundColor = '#00b37e';
        document.getElementById('btn-esporte-basquete').style.backgroundColor = '#29292e';
    } else {
        document.getElementById('btn-esporte-futebol').style.backgroundColor = '#29292e';
        document.getElementById('btn-esporte-basquete').style.backgroundColor = '#00b37e';
    }
    
    if (jogo.esportes.basquete.desbloqueado) {
        document.getElementById('btn-esporte-basquete').innerHTML = '🏀 Basquete';
    }
    
    // Torneios
    const configs = torneios[jogo.esporteAtual];
    for (let nivel in configs) {
        const btn = document.getElementById(`torneio-${nivel}`);
        if (btn) {
            const config = configs[nivel];
            btn.disabled = torneioAtivo || emPartida || esp.habilidade < config.nivelMin;
        }
    }
    
    // Estatísticas
    document.getElementById('gols-total').innerText = jogo.estatisticas.gols;
    document.getElementById('assistencias').innerText = jogo.estatisticas.assistencias;
    document.getElementById('partidas-jogadas').innerText = jogo.estatisticas.partidas;
    document.getElementById('vitorias-total').innerText = jogo.estatisticas.vitorias;
    document.getElementById('torneios-vencidos').innerText = jogo.estatisticas.torneiosVencidos;
    
    const aproveitamento = jogo.estatisticas.partidas > 0 
        ? Math.round((jogo.estatisticas.vitorias / jogo.estatisticas.partidas) * 100)
        : 0;
    document.getElementById('aproveitamento').innerText = `${aproveitamento}%`;
    
    const horas = Math.floor(jogo.tempoJogado / 3600);
    const minutos = Math.floor((jogo.tempoJogado % 3600) / 60);
    document.getElementById('tempo-jogado').innerText = `${horas}h ${minutos}m`;
    
    document.getElementById('habilidade-total').innerText = getHabilidadeTotal();
    
    // Loja
    for (let itemId in itensLoja) {
        const item = itensLoja[itemId];
        const divs = document.querySelectorAll('.item-loja');
        divs.forEach(div => {
            const h4 = div.querySelector('h4');
            if (h4 && h4.textContent.includes(item.nome)) {
                const btn = div.querySelector('.btn-comprar');
                if (btn) {
                    if (jogo.inventario[itemId]) {
                        btn.innerText = '✅ Adquirido';
                        btn.disabled = true;
                        btn.style.background = '#29292e';
                    } else if (jogo.dinheiro < item.custo) {
                        btn.innerText = `💰 $${item.custo}`;
                        btn.disabled = true;
                        btn.style.background = '#29292e';
                    } else {
                        btn.innerText = '🛒 Comprar';
                        btn.disabled = false;
                        btn.style.background = '#00875f';
                    }
                }
            }
        });
    }
}

// ============================================
// SALVAMENTO
// ============================================

function salvarJogo() {
    try {
        localStorage.setItem('sportManager_idle_v1', JSON.stringify(jogo));
    } catch (e) {
        console.warn('Erro ao salvar:', e);
    }
}

function carregarJogo() {
    try {
        const save = localStorage.getItem('sportManager_idle_v1');
        if (save) {
            const dados = JSON.parse(save);
            jogo = { ...jogo, ...dados };
            if (!jogo.estatisticas) {
                jogo.estatisticas = { gols: 0, assistencias: 0, partidas: 0, vitorias: 0, golsSofridos: 0, torneiosVencidos: 0, finalizacoes: 0, cartoes: 0 };
            }
            if (!jogo.inventario) {
                jogo.inventario = { chuteira: false, bola: false, uniforme: false, tecnico: false };
            }
            atualizarInterface();
            return true;
        }
    } catch (e) {
        console.warn('Erro ao carregar:', e);
    }
    return false;
}

// ============================================
// INICIALIZAÇÃO
// ============================================

window.onload = function() {
    carregarJogo();
    atualizarInterface();
    criarCampo();
    
    // Auto-salvamento
    setInterval(salvarJogo, 10000);
    
    console.log('🎮 Sport Club Manager - Idle Mode');
    console.log('📊 O jogo roda automaticamente em background!');
    console.log('⚡ Partidas acontecem a cada 30 segundos');
    console.log('👀 A aba "Partidas" mostra o simulador ao vivo');
};
