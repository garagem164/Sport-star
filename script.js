// ============================================
// ESTADO DO JOGO (VERSÃO COMPLETA)
// ============================================
let jogo = {
    dinheiro: 100,
    dinheiroPorSegundo: 1,
    trofeus: 0,
    nivel: 1,
    esporteAtual: "futebol",
    estatisticas: {
        gols: 0,
        assistencias: 0,
        partidas: 0,
        vitorias: 0,
        golsSofridos: 0
    },
    inventario: {
        chuteira: false,
        bola: false,
        uniforme: false,
        tecnico: false
    },
    time: {
        atacante: { nivel: 1, habilidade: 0, custo: 8 },
        meio: { nivel: 1, habilidade: 0, custo: 8 },
        defensor: { nivel: 1, habilidade: 0, custo: 8 },
        goleiro: { nivel: 1, habilidade: 0, custo: 8 }
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
            rivalVitorias: 0
        },
        basquete: { 
            nomeAtleta: "Cestinha de Basquete", 
            nivel: 1, 
            custoTreino: 50, 
            habilidade: 10, 
            rivalNome: "Robo Bulls", 
            rivalHabilidade: 18, 
            desbloqueado: false,
            rivalVitorias: 0
        }
    }
};

let emPartida = false;
let torneioAtivo = false;
let loopPartida = null;

// ============================================
// CONFIGURAÇÕES DOS TORNEIOS
// ============================================
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

// ============================================
// ITENS DA LOJA
// ============================================
const itensLoja = {
    chuteira: { nome: "Chuteira Pro", bonus: 5, custo: 150, icone: "👟" },
    bola: { nome: "Bola Oficial", bonus: 3, custo: 200, icone: "⚽" },
    uniforme: { nome: "Kit Elite", bonus: 7, custo: 300, icone: "👕" },
    tecnico: { nome: "Técnico Experiente", bonus: 10, custo: 500, icone: "📋" }
};

// ============================================
// LOOP PASSIVO (DINHEIRO)
// ============================================
setInterval(() => {
    if (!emPartida && !torneioAtivo) {
        jogo.dinheiro += jogo.dinheiroPorSegundo;
    }
    atualizarInterface();
}, 1000);

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

// Selecionar Esporte
function selecionarEsporte(esporte) {
    if (emPartida || torneioAtivo) return;
    
    if (esporte === "basquete" && !jogo.esportes.basquete.desbloqueado) {
        if (jogo.trofeus >= 5) {
            jogo.esportes.basquete.desbloqueado = true;
            alert("🏀 Parabéns! Você desbloqueou a Franquia de Basquete!");
        } else {
            alert("❌ Você precisa de pelo menos 5 Troféus para desbloquear o Basquete!");
            return;
        }
    }
    jogo.esporteAtual = esporte;
    atualizarInterface();
}

// Treinar Atleta Principal
function treinarAtleta() {
    if (emPartida || torneioAtivo) return;
    
    let esp = jogo.esportes[jogo.esporteAtual];
    if (jogo.dinheiro >= esp.custoTreino) {
        jogo.dinheiro -= esp.custoTreino;
        esp.nivel++;
        esp.habilidade += 3;
        jogo.dinheiroPorSegundo += (jogo.esporteAtual === "basquete") ? 3 : 1;
        esp.custoTreino = Math.floor(esp.custoTreino * 1.6);
        jogo.nivel = Math.max(jogo.nivel, esp.nivel);
        atualizarInterface();
    } else {
        alert("💰 Grana curta! Ganhe mais dinheiro jogando partidas.");
    }
}

// Treinar Posição Específica
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
        alert("💰 Dinheiro insuficiente para treinar esta posição!");
    }
}

// ============================================
// SISTEMA DE PARTIDAS (SIMULADOR AO VIVO)
// ============================================

function jogarPartida() {
    if (emPartida || torneioAtivo) return;
    emPartida = true;

    document.getElementById("btn-jogar").disabled = true;
    document.getElementById("simulador-ao-vivo").classList.remove("oculta");
    document.getElementById("resultado-partida").innerText = "";
    
    let esp = jogo.esportes[jogo.esporteAtual];
    document.getElementById("nome-rival-placar").innerText = esp.rivalNome;

    let golsJogador = 0;
    let golsRival = 0;
    let tempo = 0;
    let maxTempo = (jogo.esporteAtual === "futebol") ? 90 : 40;
    let passoTempo = Math.floor(maxTempo / 6);
    let lances = 0;

    let pAzul = document.getElementById("player-azul");
    let pVermelho = document.getElementById("player-vermelho");
    let bola = document.getElementById("bola-jogo");
    let golEfeito = document.getElementById("gol-efeito");

    // Habilidade total do time (inclui itens e posições)
    function getHabilidadeTotal() {
        let base = esp.habilidade;
        // Bônus de itens
        if (jogo.inventario.chuteira) base += 5;
        if (jogo.inventario.bola) base += 3;
        if (jogo.inventario.uniforme) base += 7;
        if (jogo.inventario.tecnico) base += 10;
        // Bônus das posições
        for (let pos in jogo.time) {
            base += jogo.time[pos].habilidade * 0.2;
        }
        return Math.floor(base);
    }

    let habilidadeTotal = getHabilidadeTotal();

    if (loopPartida) clearInterval(loopPartida);
    
    loopPartida = setInterval(() => {
        tempo += passoTempo;
        if (tempo > maxTempo) tempo = maxTempo;
        document.getElementById("tempo-jogo").innerText = `${tempo}'`;
        lances++;

        // Movimentação dos jogadores
        let posXAzul = Math.floor(Math.random() * 40) + 10;
        let posYAzul = Math.floor(Math.random() * 120) + 40;
        let posXVermelho = Math.floor(Math.random() * 40) + 50;
        let posYVermelho = Math.floor(Math.random() * 120) + 40;

        pAzul.style.left = `${posXAzul}%`;
        pAzul.style.top = `${posYAzul}px`;
        pVermelho.style.left = `${posXVermelho}%`;
        pVermelho.style.top = `${posYVermelho}px`;

        // Cálculo do lance
        let chanceJogador = habilidadeTotal + Math.floor(Math.random() * 15);
        let chanceRival = esp.rivalHabilidade + Math.floor(Math.random() * 15);

        let lanceTexto = "";
        let golMarcado = false;

        if (chanceJogador > chanceRival + 3) {
            // Seu time ataca
            bola.style.left = "90%";
            bola.style.top = `${posYVermelho}px`;
            let pontos = (jogo.esporteAtual === "basquete") ? 2 : 1;
            golsJogador += pontos;
            lanceTexto = "⚡ Grande jogada do seu time... GOL!!";
            golMarcado = true;
            jogo.estatisticas.gols += pontos;
        } else if (chanceRival > chanceJogador + 3) {
            // Rival ataca
            bola.style.left = "5%";
            bola.style.top = `${posYAzul}px`;
            let pontos = (jogo.esporteAtual === "basquete") ? 2 : 1;
            golsRival += pontos;
            lanceTexto = "😰 O rival pressionou e marcou!";
            jogo.estatisticas.golsSofridos += pontos;
        } else {
            // Disputa no meio
            bola.style.left = "48%";
            bola.style.top = "85px";
            lanceTexto = "⚔️ Disputa intensa pela posse de bola!";
        }

        // Efeito visual de gol
        if (golMarcado) {
            golEfeito.classList.remove("oculta");
            setTimeout(() => {
                golEfeito.classList.add("oculta");
            }, 1000);
        }

        document.getElementById("lance-atual").innerText = lanceTexto;
        document.getElementById("gols-jogador").innerText = golsJogador;
        document.getElementById("gols-rival").innerText = golsRival;

        // Fim da partida
        if (tempo >= maxTempo || lances >= 10) {
            clearInterval(loopPartida);
            loopPartida = null;
            finalizarPartida(golsJogador, golsRival, habilidadeTotal);
        }
    }, 1200);
}

function finalizarPartida(golsJogador, golsRival, habilidadeTotal) {
    let esp = jogo.esportes[jogo.esporteAtual];
    let output = document.getElementById("resultado-partida");
    jogo.estatisticas.partidas++;
    
    if (golsJogador > golsRival) {
        jogo.trofeus += 1;
        let premio = (jogo.esporteAtual === "basquete") ? 200 : 50;
        jogo.dinheiro += premio;
        jogo.estatisticas.vitorias++;
        esp.rivalVitorias = 0;
        output.style.color = "#00b37e";
        output.innerText = `🏆 VITÓRIA! Você faturou $${premio} e +1 🏆!`;
        esp.rivalHabilidade += 3;
        
        // Bônus de experiência
        let xpBonus = Math.floor(golsJogador * 2);
        esp.habilidade += Math.floor(xpBonus / 5);
        
    } else if (golsJogador < golsRival) {
        esp.rivalVitorias++;
        output.style.color = "#f75a68";
        output.innerText = "💔 Derrota! Treine mais seu atleta para superar o rival.";
        
        // Rival fica mais forte se vencer
        if (esp.rivalVitorias >= 3) {
            esp.rivalHabilidade += 5;
            esp.rivalNome = `${esp.rivalNome} (⭐ Evoluído)`;
            esp.rivalVitorias = 0;
            output.innerText += " ⚠️ O rival evoluiu!";
        }
    } else {
        output.style.color = "#e1b12c";
        output.innerText = "🤝 Empate dramático! Nenhum troféu foi distribuído.";
    }

    // Atualiza habilidade total e nível
    let habilidadeFinal = habilidadeTotal + Math.floor(golsJogador * 0.5);
    esp.habilidade = Math.max(esp.habilidade, Math.floor(habilidadeFinal * 0.8));
    jogo.nivel = Math.max(jogo.nivel, esp.nivel);

    emPartida = false;
    document.getElementById("btn-jogar").disabled = false;
    atualizarInterface();
}

// ============================================
// SISTEMA DE TORNEIOS
// ============================================

function iniciarTorneio(nivel) {
    if (torneioAtivo || emPartida) {
        alert("❌ Já há uma partida ou torneio em andamento!");
        return;
    }
    
    const esp = jogo.esportes[jogo.esporteAtual];
    const config = torneios[jogo.esporteAtual][nivel];
    
    if (!config) {
        alert("❌ Nível de torneio inválido!");
        return;
    }
    
    if (esp.habilidade < config.nivelMin) {
        alert(`❌ Habilidade mínima para ${config.nome}: ${config.nivelMin}\nSua habilidade atual: ${esp.habilidade}`);
        return;
    }
    
    torneioAtivo = true;
    document.getElementById("btn-jogar").disabled = true;
    
    let vitorias = 0;
    let partidasJogadas = 0;
    let totalGols = 0;
    
    alert(`🏅 Torneio ${config.nome} iniciado!\nSerão ${config.partidas} partidas. Boa sorte!`);
    
    const intervalo = setInterval(() => {
        if (partidasJogadas >= config.partidas) {
            clearInterval(intervalo);
            finalizarTorneio(vitorias, config, totalGols);
            return;
        }
        
        // Simula cada partida
        const resultado = simularPartidaTorneio();
        if (resultado === 'vitoria') {
            vitorias++;
            totalGols += Math.floor(Math.random() * 3) + 1;
        } else if (resultado === 'empate') {
            totalGols += Math.floor(Math.random() * 2);
        }
        partidasJogadas++;
        
        atualizarInterface();
        document.getElementById("lance-atual").innerText = 
            `🏟️ Torneio: ${partidasJogadas}/${config.partidas} - Vitórias: ${vitorias}`;
            
    }, 1500);
}

function simularPartidaTorneio() {
    const esp = jogo.esportes[jogo.esporteAtual];
    const habilidadeTotal = esp.habilidade + (jogo.trofeus * 0.5);
    
    // Bônus de itens no torneio
    let bonus = 0;
    if (jogo.inventario.chuteira) bonus += 5;
    if (jogo.inventario.bola) bonus += 3;
    if (jogo.inventario.uniforme) bonus += 7;
    if (jogo.inventario.tecnico) bonus += 10;
    
    const chance = Math.random() * 100;
    const forcaTotal = habilidadeTotal + bonus;
    
    if (chance < forcaTotal * 0.8) {
        return 'vitoria';
    } else if (chance < forcaTotal * 0.8 + 15) {
        return 'empate';
    } else {
        return 'derrota';
    }
}

function finalizarTorneio(vitorias, config, totalGols) {
    torneioAtivo = false;
    document.getElementById("btn-jogar").disabled = false;
    
    const premio = vitorias >= config.partidas / 2 ? config.premio + (vitorias * 10) : 0;
    const trofeus = vitorias === config.partidas ? config.trofeus : Math.floor(vitorias / 2);
    
    jogo.dinheiro += premio;
    jogo.trofeus += trofeus;
    jogo.estatisticas.vitorias += vitorias;
    jogo.estatisticas.partidas += config.partidas;
    jogo.estatisticas.gols += totalGols;
    
    let mensagem = `🏆 TORNEIO FINALIZADO!\n`;
    mensagem += `📊 Vitórias: ${vitorias}/${config.partidas}\n`;
    mensagem += `💰 Prêmio: $${premio}\n`;
    mensagem += `🏅 Troféus: ${trofeus}\n`;
    mensagem += `⚽ Gols: ${totalGols}`;
    
    alert(mensagem);
    
    // Bônus de experiência
    if (vitorias >= config.partidas / 2) {
        const esp = jogo.esportes[jogo.esporteAtual];
        esp.habilidade += Math.floor(vitorias * 0.5);
        jogo.nivel = Math.max(jogo.nivel, esp.nivel);
    }
    
    document.getElementById("lance-atual").innerText = "🏟️ Torneio finalizado!";
    atualizarInterface();
}

// ============================================
// SISTEMA DE LOJA
// ============================================

function comprarItem(itemId) {
    if (emPartida || torneioAtivo) return;
    
    if (jogo.inventario[itemId]) {
        alert("❌ Você já possui este item!");
        return;
    }
    
    const item = itensLoja[itemId];
    if (!item) return;
    
    if (jogo.dinheiro >= item.custo) {
        jogo.dinheiro -= item.custo;
        jogo.inventario[itemId] = true;
        
        // Aplica bônus imediato
        const esp = jogo.esportes[jogo.esporteAtual];
        esp.habilidade += item.bonus;
        
        alert(`✅ ${item.icone} ${item.nome} adquirido com sucesso!\n+${item.bonus} de habilidade!`);
        atualizarInterface();
    } else {
        alert(`💰 Dinheiro insuficiente! Faltam $${item.custo - jogo.dinheiro}`);
    }
}

// ============================================
// NAVEGAÇÃO ENTRE ABAS
// ============================================

function mudarAba(idAba) {
    if (emPartida && idAba !== 'aba-partidas') {
        alert("⏳ Você está em uma partida! Aguarde terminar.");
        return;
    }
    
    if (torneioAtivo && idAba !== 'aba-partidas') {
        alert("🏟️ Torneio em andamento! Acompanhe na aba Partidas.");
        return;
    }
    
    document.querySelectorAll('.tela-aba').forEach(aba => {
        aba.classList.add('oculta');
    });
    
    document.querySelectorAll('.btn-menu').forEach(btn => {
        btn.classList.remove('ativo');
    });
    
    document.getElementById(idAba).classList.remove('oculta');
    
    // Ativa o botão correspondente
    const botoes = document.querySelectorAll('.btn-menu');
    const mapaAbas = {
        'aba-treino': 0,
        'aba-partidas': 1,
        'aba-loja': 2,
        'aba-estatisticas': 3
    };
    if (mapaAbas[idAba] !== undefined) {
        botoes[mapaAbas[idAba]].classList.add('ativo');
    }
}

// ============================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================

function atualizarInterface() {
    let esp = jogo.esportes[jogo.esporteAtual];
    
    // Recursos
    document.getElementById("dinheiro-display").innerText = `💰 Dinheiro: $${Math.floor(jogo.dinheiro)}`;
    document.getElementById("gps-display").innerText = `📈 Ganhos: $${jogo.dinheiroPorSegundo}/s`;
    document.getElementById("trofeus-display").innerText = `🏆 Troféus: ${jogo.trofeus}`;
    document.getElementById("nivel-display").innerText = `⭐ Nível: ${jogo.nivel}`;
    
    // Treino
    document.getElementById("atleta-info").innerText = `${esp.nomeAtleta} (Nível ${esp.nivel})`;
    document.getElementById("atleta-status").innerText = `Habilidade: ${esp.habilidade}`;
    document.getElementById("btn-treinar").innerText = `Treinar ($${esp.custoTreino})`;
    
    // Escalação
    for (let pos in jogo.time) {
        const jogador = jogo.time[pos];
        document.getElementById(`${pos}-nivel`).innerText = `Nv. ${jogador.nivel}`;
        document.getElementById(`${pos}-habilidade`).innerText = `Habilidade: ${jogador.habilidade}`;
        // Atualiza botão de treino
        const btn = document.querySelector(`#jogadores-time .jogador-posicao button[onclick="treinarPosicao('${pos}')"]`);
        if (btn) btn.innerText = `Treinar ($${jogador.custo})`;
    }
    
    // Partidas
    document.getElementById("campeonato-atual").innerText = `(${jogo.esporteAtual.toUpperCase()})`;
    document.getElementById("rival-nome").innerText = `Próximo Adversário: ${esp.rivalNome}`;
    document.getElementById("rival-status").innerText = `Poder do Rival: ${esp.rivalHabilidade}`;
    
    // Campo de jogo
    let campo = document.getElementById("campo-jogo");
    if (campo) {
        campo.classList.remove("quadra-futebol", "quadra-basquete");
        campo.classList.add(`quadra-${jogo.esporteAtual}`);
    }
    
    // Botões de esporte
    if (jogo.esporteAtual === "futebol") {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#00b37e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#29292e";
    } else {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#29292e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#00b37e";
    }
    
    // Botão de basquete
    if (jogo.esportes.basquete.desbloqueado) {
        document.getElementById("btn-esporte-basquete").innerHTML = "🏀 Basquete";
    }
    
    // Botões de torneio
    const configs = torneios[jogo.esporteAtual];
    for (let nivel in configs) {
        const btn = document.getElementById(`torneio-${nivel}`);
        if (btn) {
            const config = configs[nivel];
            btn.disabled = torneioAtivo || emPartida || esp.habilidade < config.nivelMin;
            btn.innerText = `🏅 ${config.nome} (${config.partidas} partidas)`;
        }
    }
    
    // Estatísticas
    document.getElementById("gols-total").innerText = jogo.estatisticas.gols;
    document.getElementById("assistencias").innerText = jogo.estatisticas.assistencias;
    document.getElementById("partidas-jogadas").innerText = jogo.estatisticas.partidas;
    document.getElementById("vitorias-total").innerText = jogo.estatisticas.vitorias;
    
    let aproveitamento = jogo.estatisticas.partidas > 0 
        ? Math.round((jogo.estatisticas.vitorias / jogo.estatisticas.partidas) * 100)
        : 0;
    document.getElementById("aproveitamento").innerText = `${aproveitamento}%`;
    
    let habilidadeTotal = esp.habilidade;
    for (let pos in jogo.time) {
        habilidadeTotal += jogo.time[pos].habilidade * 0.2;
    }
    if (jogo.inventario.chuteira) habilidadeTotal += 5;
    if (jogo.inventario.bola) habilidadeTotal += 3;
    if (jogo.inventario.uniforme) habilidadeTotal += 7;
    if (jogo.inventario.tecnico) habilidadeTotal += 10;
    document.getElementById("habilidade-total").innerText = Math.floor(habilidadeTotal);
    
    // Loja - Atualiza botões
    for (let itemId in itensLoja) {
        const item = itensLoja[itemId];
        const divItem = document.querySelector(`.item-loja:has(h4:contains('${item.nome}'))`);
        if (divItem) {
            const btn = divItem.querySelector('.btn-comprar');
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
    }
}

// ============================================
// SALVAMENTO E CARREGAMENTO
// ============================================

function salvarJogo() {
    try {
        localStorage.setItem("sportManager_save_v4", JSON.stringify(jogo));
    } catch (e) {
        console.warn("Erro ao salvar:", e);
    }
}

function carregarJogo() {
    try {
        let savegame = localStorage.getItem("sportManager_save_v4");
        if (savegame !== null) {
            const dados = JSON.parse(savegame);
            // Mantém a estrutura, mas atualiza com os dados salvos
            jogo = { ...jogo, ...dados };
            // Garante que as estatísticas existam
            if (!jogo.estatisticas) {
                jogo.estatisticas = { gols: 0, assistencias: 0, partidas: 0, vitorias: 0, golsSofridos: 0 };
            }
            if (!jogo.inventario) {
                jogo.inventario = { chuteira: false, bola: false, uniforme: false, tecnico: false };
            }
            if (!jogo.time) {
                jogo.time = {
                    atacante: { nivel: 1, habilidade: 0, custo: 8 },
                    meio: { nivel: 1, habilidade: 0, custo: 8 },
                    defensor: { nivel: 1, habilidade: 0, custo: 8 },
                    goleiro: { nivel: 1, habilidade: 0, custo: 8 }
                };
            }
            atualizarInterface();
            return true;
        }
    } catch (e) {
        console.warn("Erro ao carregar:", e);
    }
    return false;
}

// ============================================
// INICIALIZAÇÃO
// ============================================

window.onload = function() {
    carregarJogo();
    atualizarInterface();
    
    // Auto-salvamento a cada 10 segundos
    setInterval(() => { salvarJogo(); }, 10000);
    
    console.log("🎮 Sport Club Manager Carregado!");
    console.log("📊 Dicas:");
    console.log("1. Treine seu atleta para aumentar habilidade");
    console.log("2. Partidas dão troféus e dinheiro");
    console.log("3. Torneios dão mais recompensas");
    console.log("4. Compre itens na loja para bônus permanentes");
};
