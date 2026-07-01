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
    tempoJogado: 0, // em segundos
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
    intervaloSimulacao: 2000, // 2 segundos entre lances
    maxGolsPorPartida: 5,
    tempoPartidaFutebol: 90, // minutos
    tempoPartidaBasquete: 40 // minutos
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
let simuladorAtivo = false;
let loopSimulador = null;
let intervaloTorneio = null;
let partidaEmAndamento = null;
let ultimaPartida = null;

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

// ============================================
// SISTEMA DE PARTIDAS AUTOMÁTICAS (IDLE)
// ============================================

function executarPartidaAutomatica() {
    const esp = jogo.esportes[jogo.esporteAtual];
    
    // Calcula habilidade total
    const habilidadeTotal = getHabilidadeTotal();
    
    // Simula resultado
    const resultado = simularPartida(habilidadeTotal, esp.rivalHabilidade);
    
    // Aplica resultado
    aplicarResultadoPartida(resultado, esp);
    
    // Atualiza interface se estiver na aba de partidas
    if (!document.getElementById('aba-partidas').classList.contains('oculta')) {
        atualizarSimulador(resultado);
    }
    
    atualizarInterface();
}

function simularPartida(habilidadeJogador, habilidadeRival) {
    // Fator sorte
    const sorte = Math.random() * 20;
    const forcaJogador = habilidadeJogador + sorte;
    const forcaRival = habilidadeRival + (Math.random() * 15);
    
    // Gols baseados na força
    const golsJogador = Math.floor((forcaJogador / 15) * (Math.random() * 3 + 1));
    const golsRival = Math.floor((forcaRival / 15) * (Math.random() * 3 + 1));
    
    // Limita gols
    const maxGols = CONFIG.maxGolsPorPartida;
    const golsJ = Math.min(golsJogador, maxGols);
    const golsR = Math.min(golsRival, maxGols);
    
    // Determina resultado
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
    
    // Bônus aleatório de assistências
    if (resultado.golsJogador > 0) {
        jogo.estatisticas.assistencias += Math.floor(Math.random() * resultado.golsJogador) + 1;
    }
    
    if (resultado.resultado === 'vitoria') {
        jogo.estatisticas.vitorias++;
        esp.vitoriasConsecutivas++;
        esp.rivalVitorias = 0;
        
        // Ganhos
        const premio = (jogo.esporteAtual === "basquete") ? 200 : 50;
        const bonus = Math.floor(esp.vitoriasConsecutivas * 5);
        jogo.dinheiro += premio + bonus;
        jogo.trofeus += 1;
        
        // Evolui rival se tiver muitas vitórias consecutivas
        if (esp.vitoriasConsecutivas >= 5) {
            esp.rivalHabilidade += 5;
            esp.rivalNome = `${esp.rivalNome} ⭐`;
            esp.vitoriasConsecutivas = 0;
        }
        
        // Ganho de experiência
        const xp = Math.floor(resultado.golsJogador * 2);
        esp.habilidade += Math.floor(xp / 3);
        jogo.nivel = Math.max(jogo.nivel, esp.nivel);
        
    } else if (resultado.resultado === 'derrota') {
        esp.rivalVitorias++;
        esp.vitoriasConsecutivas = 0;
        
        // Rival evolui se ganhar muitas vezes
        if (esp.rivalVitorias >= 3) {
            esp.rivalHabilidade += 3;
            esp.rivalNome = `${esp.rivalNome} 🔥`;
            esp.rivalVitorias = 0;
        }
    } else {
        // Empate
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
    
    // Bônus de itens
    if (jogo.inventario.chuteira) total += 5;
    if (jogo.inventario.bola) total += 3;
    if (jogo.inventario.uniforme) total += 7;
    if (jogo.inventario.tecnico) total += 10;
    
    // Bônus das posições
    for (let pos in jogo.time) {
        total += jogo.time[pos].habilidade * 0.2;
    }
    
    return Math.floor(total);
}

// ============================================
// SIMULADOR VISUAL (ASSISTIR PARTIDA)
// ============================================

function alternarSimulador() {
    const container = document.getElementById('simulador-container');
    const btn = document.getElementById('btn-simulador');
    
    if (simuladorAtivo) {
        // Desliga simulador
        simuladorAtivo = false;
        container.classList.add('oculta');
        btn.innerText = '▶️ Assistir Partida';
        if (loopSimulador) {
            clearInterval(loopSimulador);
            loopSimulador = null;
        }
    } else {
        // Liga simulador
        simuladorAtivo = true;
        container.classList.remove('oculta');
        btn.innerText = '⏹️ Parar de Assistir';
        iniciarSimuladorVisual();
    }
}

function iniciarSimuladorVisual() {
    if (loopSimulador) clearInterval(loopSimulador);
    
    // Cria o campo
    criarCampo();
    
    // Inicia o loop de simulação visual
    loopSimulador = setInterval(() => {
        if (!emPartida) {
            // Busca última partida ou simula uma
            if (ultimaPartida) {
                atualizarSimulador(ultimaPartida);
                ultimaPartida = null;
            } else {
                // Simula um lance para visualização
                simularLanceVisual();
            }
        }
    }, CONFIG.intervaloSimulacao);
}

function criarCampo() {
    const campo = document.getElementById('campo-jogo');
    campo.innerHTML = '';
    campo.className = '';
    campo.classList.add(`campo-${jogo.esporteAtual}`);
    
    // Cria jogadores do time (azul)
    const posicoes = [
        { x: 15, y: 30, nome: 'AT' },
        { x: 15, y: 50, nome: 'MC' },
        { x: 15, y: 70, nome: 'DF' },
        { x: 8, y: 50, nome: 'GL' }
    ];
    
    posicoes.forEach((pos, i) => {
        const jogador = document.createElement('div');
        jogador.className = `jogador-campo jogador-time${i === 3 ? ' jogador-goleiro' : ''}`;
        jogador.id = `jogador-time-${i}`;
        jogador.style.left = `${pos.x}%`;
        jogador.style.top = `${pos.y}%`;
        jogador.textContent = pos.nome;
        campo.appendChild(jogador);
    });
    
    // Cria jogadores do rival (vermelho)
    const posicoesRival = [
        { x: 85, y: 30, nome: 'AT' },
        { x: 85, y: 50, nome: 'MC' },
        { x: 85, y: 70, nome: 'DF' },
        { x: 92, y: 50, nome: 'GL' }
    ];
    
    posicoesRival.forEach((pos, i) => {
        const jogador = document.createElement('div');
        jogador.className = `jogador-campo jogador-rival${i === 3 ? ' jogador-goleiro' : ''}`;
        jogador.id = `jogador-rival-${i}`;
        jogador.style.left = `${pos.x}%`;
        jogador.style.top = `${pos.y}%`;
        jogador.textContent = pos.nome;
        campo.appendChild(jogador);
    });
    
    // Cria bola
    const bola = document.createElement('div');
    bola.className = `bola-campo${jogo.esporteAtual === 'basquete' ? ' bola-basquete' : ''}`;
    bola.id = 'bola-campo';
    bola.style.left = '48%';
    bola.style.top = '48%';
    campo.appendChild(bola);
}

function simularLanceVisual() {
    const esp = jogo.esportes[jogo.esporteAtual];
    const habilidadeTotal = getHabilidadeTotal();
    
    // Movimentação aleatória dos jogadores
    const jogadores = document.querySelectorAll('.jogador-campo');
    jogadores.forEach(jogador => {
        const x = Math.floor(Math.random() * 70) + 10;
        const y = Math.floor(Math.random() * 70) + 10;
        jogador.style.left = `${x}%`;
        jogador.style.top = `${y}%`;
    });
    
    // Movimento da bola
    const bola = document.getElementById('bola-campo');
    const chance = Math.random() * 100;
    const forcaJogador = habilidadeTotal + (Math.random() * 10);
    const forcaRival = esp.rivalHabilidade + (Math.random() * 10);
    
    let lanceTexto = '';
    let posBolaX = 48;
    let posBolaY = 48;
    
    if (forcaJogador > forcaRival + 5) {
        // Ataque do time
        posBolaX = Math.floor(Math.random() * 30) + 70;
        posBolaY = Math.floor(Math.random() * 60) + 20;
        lanceTexto = '⚡ Seu time ataca com perigo!';
        if (Math.random() > 0.7) {
            lanceTexto = '⚽ GOL DO SEU TIME!';
            const gols = document.getElementById('gols-jogador');
            gols.textContent = parseInt(gols.textContent) + 1;
        }
    } else if (forcaRival > forcaJogador + 5) {
        // Ataque do rival
        posBolaX = Math.floor(Math.random() * 30) + 5;
        posBolaY = Math.floor(Math.random() * 60) + 20;
        lanceTexto = '🔥 Rival pressiona!';
        if (Math.random() > 0.7) {
            lanceTexto = '⚽ GOL DO RIVAL!';
            const gols = document.getElementById('gols-rival');
            gols.textContent = parseInt(gols.textContent) + 1;
        }
    } else {
        // Disputa
        posBolaX = Math.floor(Math.random() * 40) + 30;
        posBolaY = Math.floor(Math.random() * 60) + 20;
        lanceTexto = '⚔️ Disputa acirrada no meio!';
    }
    
    if (bola) {
        bola.style.left = `${posBolaX}%`;
        bola.style.top = `${posBolaY}%`;
    }
    
    document.getElementById('lance-atual').innerText = lanceTexto;
    
    // Atualiza posse de bola
    const posse = Math.floor(50 + (forcaJogador - forcaRival) / 2);
    document.getElementById('posse-bola').innerText = `${Math.min(Math.max(posse, 20), 80)}%`;
    
    // Atualiza tempo
    const tempo = document.getElementById('tempo-jogo');
    const partes = tempo.textContent.split(':');
    let minutos = parseInt(partes[0]);
    let segundos = parseInt(partes[1]) + 1;
    if (segundos >= 60) {
        segundos = 0;
        minutos++;
    }
    tempo.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function atualizarSimulador(resultado) {
    document.getElementById('gols-jogador').textContent = resultado.golsJogador || 0;
    document.getElementById('gols-rival').textContent = resultado.golsRival || 0;
    document.getElementById('finalizacoes').textContent = resultado.finalizacoes || 0;
    document.getElementById('cartoes').textContent = resultado.cartoes || 0;
    
    const esp = jogo.esportes[jogo.esporteAtual];
    document.getElementById('nome-rival-placar').textContent = esp.rivalNome;
    
    // Atualiza mensagem final
    const msg = document.getElementById('lance-atual');
    if (resultado.resultado === 'vitoria') {
        msg.innerText = '🏆 VITÓRIA! Seu time arrasou!';
        msg.style.color = '#00b37e';
    } else if (resultado.resultado === 'derrota') {
        msg.innerText = '💔 Derrota! O rival foi melhor hoje.';
        msg.style.color = '#f75a68';
    } else {
        msg.innerText = '🤝 Empate! Foi uma partida equilibrada.';
        msg.style.color = '#e1b12c';
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
        
        // Simula partida do torneio
        const habilidadeTotal = getHabilidadeTotal();
        const resultado = simularPartida(habilidadeTotal, esp.rivalHabilidade + (partidasJogadas * 2));
        
        if (resultado.resultado === 'vitoria') {
            vitorias++;
            totalGols += resultado.golsJogador;
        }
        
        partidasJogadas++;
        atualizarInterface();
        
        document.getElementById('lance-atual').innerText = 
            `🏟️ Torneio: ${partidasJogadas}/${config.partidas} | Vitórias: ${vitorias}`;
            
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
    
    // Se for a aba de partidas e tiver simulador ativo, atualiza
    if (idAba === 'aba-partidas' && simuladorAtivo) {
        atualizarSimulador(ultimaPartida || { resultado: 'aguardando', golsJogador: 0, golsRival: 0 });
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
    document.getElementById('rival-nome').innerText = `Próximo Adversário: ${esp.rivalNome}`;
    document.getElementById('rival-status').innerText = `Poder do Rival: ${esp.rivalHabilidade}`;
    
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
    
    // Auto-salvamento
    setInterval(salvarJogo, 10000);
    
    console.log('🎮 Sport Club Manager - Idle Mode');
    console.log('📊 O jogo roda automaticamente em background!');
    console.log('⚡ Partidas acontecem a cada 30 segundos');
};

// ============================================
// FUNÇÃO PARA DEBUG (OPCIONAL)
// ============================================

// Descomente para testar rapidamente
// setTimeout(() => {
//     jogo.dinheiro = 1000;
//     jogo.trofeus = 10;
//     atualizarInterface();
// }, 1000);
