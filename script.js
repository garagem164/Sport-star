// Estado do Jogo (Dados expandidos para múltiplos esportes)
let jogo = {
    dinheiro: 100,
    dinheiroPorSegundo: 1,
    trofeus: 0,
    esporteAtual: "futebol",
    esportes: {
        futebol: {
            nomeAtleta: "Jogador de Futebol",
            nivel: 1,
            custoTreino: 10,
            habilidade: 5,
            rivalNome: "Bot F.C.",
            rivalHabilidade: 8,
            desbloqueado: true
        },
        basquete: {
            nomeAtleta: "Cestinha de Basquete",
            nivel: 1,
            custoTreino: 50,
            habilidade: 10,
            rivalNome: "Robo Bulls",
            rivalHabilidade: 18,
            desbloqueado: false
        }
    }
};

// Loop Idle (Ganha dinheiro de forma passiva)
setInterval(() => {
    jogo.dinheiro += jogo.dinheiroPorSegundo;
    atualizarInterface();
}, 1000);

// Trocar o esporte que está sendo visualizado/jogado
function selecionarEsporte(esporte) {
    if (esporte === "basquete" && !jogo.esportes.basquete.desbloqueado) {
        if (jogo.trofeus >= 5) {
            jogo.esportes.basquete.desbloqueado = true;
            alert("Parabéns! Você desbloqueou a Franquia de Basquete!");
        } else {
            alert("Você precisa de pelo menos 5 Troféus para desbloquear o Basquete!");
            return;
        }
    }
    
    jogo.esporteAtual = esporte;
    atualizarInterface();
}

// Treinar o Atleta do Esporte Atual
function treinarAtleta() {
    let esp = jogo.esportes[jogo.esporteAtual];
    
    if (jogo.dinheiro >= esp.custoTreino) {
        jogo.dinheiro -= esp.custoTreino;
        esp.nivel++;
        esp.habilidade += 3;
        
        // Basquete dá mais grana por segundo que o futebol!
        let bonusGps = (jogo.esporteAtual === "basquete") ? 3 : 1;
        jogo.dinheiroPorSegundo += bonusGps;
        
        esp.custoTreino = Math.floor(esp.custoTreino * 1.6);
        atualizarInterface();
    } else {
        alert("Grana curta! Aguarde os lucros passivos.");
    }
}

// Partida baseada no Esporte Selecionado
function jogarPartida() {
    let esp = jogo.esportes[jogo.esporteAtual];
    let output = document.getElementById("resultado-partida");
    
    let sorteJogador = Math.floor(Math.random() * 6) + 1;
    let sorteRival = Math.floor(Math.random() * 6) + 1;

    let poderTotalJogador = esp.habilidade + sorteJogador;
    let poderTotalRival = esp.rivalHabilidade + sorteRival;

    if (poderTotalJogador > poderTotalRival) {
        jogo.trofeus += 1;
        let premio = (jogo.esporteAtual === "basquete") ? 200 : 50;
        jogo.dinheiro += premio;
        
        output.style.color = "#00b37e";
        output.innerText = `Vitória no ${jogo.esporteAtual}! Placar: ${poderTotalJogador}x${poderTotalRival}. Ganhou $${premio} e +1 🏆!`;
        
        esp.rivalHabilidade += 4;
    } else {
        output.style.color = "#f75a68";
        output.innerText = `Derrota! O rival fez ${poderTotalRival} pontos contra seus ${poderTotalJogador}. Treine mais seu time!`;
    }
    atualizarInterface();
}

// Navegação de Abas
function mudarAba(idAba) {
    document.querySelectorAll('.tela-aba').forEach(aba => aba.classList.add('oculta'));
    document.querySelectorAll('.btn-menu').forEach(btn => btn.classList.remove('ativo'));
    document.getElementById(idAba).classList.remove('oculta');
    event.currentTarget.classList.add('ativo');
}

// Atualizar a Tela com os dados do esporte ativo
function atualizarInterface() {
    let esp = jogo.esportes[jogo.esporteAtual];

    // Recursos Globais
    document.getElementById("dinheiro-display").innerText = `Dinheiro: $${jogo.dinheiro}`;
    document.getElementById("gps-display").innerText = `Ganhos: $${jogo.dinheiroPorSegundo}/s`;
    document.getElementById("trofeus-display").innerText = `Troféus: ${jogo.trofeus}`;
    
    // Área de Treino dinamicamente atualizada
    document.getElementById("atleta-info").innerText = `${esp.nomeAtleta} (Nível ${esp.nivel})`;
    document.getElementById("atleta-status").innerText = `Habilidade: ${esp.habilidade}`;
    document.getElementById("btn-treinar").innerText = `Treinar ($${esp.custoTreino})`;
    
    // Área de Partidas dinamicamente atualizada
    document.getElementById("campeonato-actual").innerText = `(${jogo.esporteAtual.toUpperCase()})`;
    document.getElementById("rival-nome").innerText = `Próximo Adversário: ${esp.rivalNome}`;
    document.getElementById("rival-status").innerText = `Poder do Rival: ${esp.rivalHabilidade}`;

    // Estilo dos botões de esporte
    if (jogo.esporteAtual === "futebol") {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#00b37e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#29292e";
    } else {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#29292e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#00b37e";
    }

    // Atualiza o texto do botão do basquete caso já esteja liberado
    if (jogo.esportes.basquete.desbloqueado) {
        document.getElementById("btn-esporte-basquete").innerText = "Basquete";
    }
}

// === SISTEMA DE SALVAMENTO AUTOMÁTICO ===
function salvarJogo() {
    localStorage.setItem("sportManager_save_v2", JSON.stringify(jogo));
}

function carregarJogo() {
    let savegame = localStorage.getItem("sportManager_save_v2");
    if (savegame !== null) {
        jogo = JSON.parse(savegame);
        atualizarInterface();
    }
}

window.onload = function() {
    carregarJogo();
};

setInterval(() => {
    salvarJogo();
}, 5000);
