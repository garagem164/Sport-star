// Estado do Jogo
let jogo = {
    dinheiro: 100,
    dinheiroPorSegundo: 1,
    trofeus: 0,
    esporteAtual: "futebol",
    esportes: {
        futebol: { nomeAtleta: "Jogador de Futebol", nivel: 1, custoTreino: 10, habilidade: 5, rivalNome: "Bot F.C.", rivalHabilidade: 8, desbloqueado: true },
        basquete: { nomeAtleta: "Cestinha de Basquete", nivel: 1, custoTreino: 50, habilidade: 10, rivalNome: "Robo Bulls", rivalHabilidade: 18, desbloqueado: false }
    }
};

let emPartida = false; // Bloqueia ações durante o jogo ao vivo

// Loop Passivo (Dinheiro)
setInterval(() => {
    if (!emPartida) jogo.dinheiro += jogo.dinheiroPorSegundo;
    atualizarInterface();
}, 1000);

function selecionarEsporte(esporte) {
    if (emPartida) return;
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

function treinarAtleta() {
    if (emPartida) return;
    let esp = jogo.esportes[jogo.esporteAtual];
    if (jogo.dinheiro >= esp.custoTreino) {
        jogo.dinheiro -= esp.custoTreino;
        esp.nivel++;
        esp.habilidade += 3;
        jogo.dinheiroPorSegundo += (jogo.esporteAtual === "basquete") ? 3 : 1;
        esp.custoTreino = Math.floor(esp.custoTreino * 1.6);
        atualizarInterface();
    } else {
        alert("Grana curta!");
    }
}

// === NOVO SIMULADOR AO VIVO REALISTA ===
function jogarPartida() {
    if (emPartida) return;
    emPartida = true;

    // Desabilita botões e mostra a tela do simulador
    document.getElementById("btn-jogar").disabled = true;
    document.getElementById("simulador-ao-vivo").classList.remove("oculta");
    document.getElementById("resultado-partida").innerText = "";
    
    let esp = jogo.esportes[jogo.esporteAtual];
    document.getElementById("nome-rival-placar").innerText = esp.rivalNome;

    let golsJogador = 0;
    let golsRival = 0;
    let tempo = 0;
    let maxTempo = (jogo.esporteAtual === "futebol") ? 90 : 40; // Tempo real de cada esporte
    let passoTempo = Math.floor(maxTempo / 5); // 5 lances na partida

    // Pegando os elementos visuais dos atletas para mover via código
    let pAzul = document.getElementById("player-azul");
    let pVermelho = document.getElementById("player-vermelho");
    let bola = document.getElementById("bola-jogo");

    let loopPartida = setInterval(() => {
        tempo += passoTempo;
        if (tempo > maxTempo) tempo = maxTempo;
        document.getElementById("tempo-jogo").innerText = `${tempo}'`;

        // 1. Movimentação Aleatória dos Jogadores e Bola na tela
        let posXAzul = Math.floor(Math.random() * 40) + 10;
        let posYAzul = Math.floor(Math.random() * 120) + 30;
        let posXVermelho = Math.floor(Math.random() * 40) + 50;
        let posYVermelho = Math.floor(Math.random() * 120) + 30;

        pAzul.style.left = `${posXAzul}%`;
        pAzul.style.top = `${posYAzul}px`;
        pVermelho.style.left = `${posXVermelho}%`;
        pVermelho.style.top = `${posYVermelho}px`;

        // 2. Calcula quem fica com a bola e se sai gol/ponto no lance
        let chanceJogador = esp.habilidade + Math.floor(Math.random() * 10);
        let chanceRival = esp.rivalHabilidade + Math.floor(Math.random() * 10);

        if (chanceJogador > chanceRival + 2) {
            // Ataque do seu time! Bola vai para o lado direito (gol do rival)
            bola.style.left = "90%";
            bola.style.top = `${posYVermelho}px`;
            golsJogador += (jogo.esporteAtual === "basquete") ? 2 : 1;
            document.getElementById("lance-atual").innerText = "Grande jogada do seu time... PONTO!!";
        } else if (chanceRival > chanceJogador + 2) {
            // Ataque do rival! Bola vai para o lado esquerdo (seu gol)
            bola.style.left = "5%";
            bola.style.top = `${posYAzul}px`;
            golsRival += (jogo.esporteAtual === "basquete") ? 2 : 1;
            document.getElementById("lance-atual").innerText = "O rival pressionou e marcou!";
        } else {
            // Disputa no meio de campo
            bola.style.left = "48%";
            bola.style.top = "85px";
            document.getElementById("lance-atual").innerText = "Disputa intensa pela posse de bola!";
        }

        // Atualiza placar ao vivo
        document.getElementById("gols-jogador").innerText = golsJogador;
        document.getElementById("gols-rival").innerText = golsRival;

        // Fim da Partida
        if (tempo >= maxTempo) {
            clearInterval(loopPartida);
            finalizarPartida(golsJogador, golsRival);
        }
    }, 1500); // Cada lance dura 1.5 segundos na tela
}

function finalizarPartida(golsJogador, golsRival) {
    let esp = jogo.esportes[jogo.esporteAtual];
    let output = document.getElementById("resultado-partida");
    
    if (golsJogador > golsRival) {
        jogo.trofeus += 1;
        let premio = (jogo.esporteAtual === "basquete") ? 200 : 50;
        jogo.dinheiro += premio;
        output.style.color = "#00b37e";
        output.innerText = `Fim de Jogo! Vitória! Você faturou $${premio} e +1 🏆!`;
        esp.rivalHabilidade += 4;
    } else if (golsJogador < golsRival) {
        output.style.color = "#f75a68";
        output.innerText = "Fim de Jogo! Derrota. Treine mais seu atleta para superar o rival.";
    } else {
        output.style.color = "#e1b12c";
        output.innerText = "Fim de Jogo! Empate dramático. Nenhum troféu foi distribuído.";
    }

    // Libera os botões de volta
    emPartida = false;
    document.getElementById("btn-jogar").disabled = false;
    atualizarInterface();
}

function mudarAba(idAba) {
    if (emPartida) return; // Não deixa fugir da aba durante o jogo ao vivo!
    document.querySelectorAll('.tela-aba').forEach(aba => aba.classList.add('oculta'));
    document.querySelectorAll('.btn-menu').forEach(btn => btn.classList.remove('ativo'));
    document.getElementById(idAba).classList.remove('oculta');
    event.currentTarget.classList.add('ativo');
}

function atualizarInterface() {
    let esp = jogo.esportes[jogo.esporteAtual];
    document.getElementById("dinheiro-display").innerText = `Dinheiro: $${jogo.dinheiro}`;
    document.getElementById("gps-display").innerText = `Ganhos: $${jogo.dinheiroPorSegundo}/s`;
    document.getElementById("trofeus-display").innerText = `Troféus: ${jogo.trofeus}`;
    
    document.getElementById("atleta-info").innerText = `${esp.nomeAtleta} (Nível ${esp.nivel})`;
    document.getElementById("atleta-status").innerText = `Habilidade: ${esp.habilidade}`;
    document.getElementById("btn-treinar").innerText = `Treinar ($${esp.custoTreino})`;
    
    document.getElementById("campeonato-actual").innerText = `(${jogo.esporteAtual.toUpperCase()})`;
    document.getElementById("rival-nome").innerText = `Próximo Adversário: ${esp.rivalNome}`;
    document.getElementById("rival-status").innerText = `Poder do Rival: ${esp.rivalHabilidade}`;

    // Atualiza a cor de fundo do mini-campo do simulador dependendo do esporte ativo
    let campo = document.getElementById("campo-jogo");
    if (campo) {
        campo.classList.remove("quadra-futebol", "quadra-basquete");
        campo.classList.add(`quadra-${jogo.esporteAtual}`);
    }

    if (jogo.esporteAtual === "futebol") {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#00b37e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#29292e";
    } else {
        document.getElementById("btn-esporte-futebol").style.backgroundColor = "#29292e";
        document.getElementById("btn-esporte-basquete").style.backgroundColor = "#00b37e";
    }

    if (jogo.esportes.basquete.desbloqueado) {
        document.getElementById("btn-esporte-basquete").innerText = "Basquete";
    }
}

// === SALVAMENTO AUTOMÁTICO ===
function salvarJogo() { localStorage.setItem("sportManager_save_v3", JSON.stringify(jogo)); }
function carregarJogo() {
    let savegame = localStorage.getItem("sportManager_save_v3");
    if (savegame !== null) { jogo = JSON.parse(savegame); atualizarInterface(); }
}
window.onload = function() { carregarJogo(); };
setInterval(() => { salvarJogo(); }, 5000);
