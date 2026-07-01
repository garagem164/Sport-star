// Estado do Jogo
let jogo = {
    dinheiro: 100,
    dinheiroPorSegundo: 1,
    trofeus: 0,
    atleta: {
        nome: "Recruta Inicial",
        nivel: 1,
        custoTreino: 10,
        habilidade: 5
    },
    rival: {
        nome: "Bot F.C.",
        habilidade: 8
    }
};

// Loop Idle (Ganha dinheiro a cada segundo)
setInterval(() => {
    jogo.dinheiro += jogo.dinheiroPorSegundo;
    atualizarInterface();
}, 1000);

// Função do Botão Treinar
function treinarAtleta() {
    if (jogo.dinheiro >= jogo.atleta.custoTreino) {
        jogo.dinheiro -= jogo.atleta.custoTreino;
        jogo.atleta.nivel++;
        jogo.atleta.habilidade += 3;
        
        // Aumenta o ganho passivo e o custo futuro
        jogo.dinheiroPorSegundo += 1;
        jogo.atleta.custoTreino = Math.floor(jogo.atleta.custoTreino * 1.6);
        
        atualizarInterface();
    } else {
        alert("Grana curta! Espere o tempo passar para juntar mais.");
    }
}

// Simulador de Partida (Mecânica de Jogo)
function jogarPartida() {
    let output = document.getElementById("resultado-partida");
    
    // Sorteia um fator aleatório (sorte) de 1 a 6 para cada lado
    let sorteJogador = Math.floor(Math.random() * 6) + 1;
    let sorteRival = Math.floor(Math.random() * 6) + 1;

    let poderTotalJogador = jogo.atleta.habilidade + sorteJogador;
    let poderTotalRival = jogo.rival.habilidade + sorteRival;

    if (poderTotalJogador > poderTotalRival) {
        // Vitória!
        jogo.trofeus += 1;
        jogo.dinheiro += 50; // Bônus de vitória
        output.style.color = "#00b37e";
        output.innerText = `Vitória! Seu time pontuou ${poderTotalJogador} contra ${poderTotalRival} do rival. Ganhou $50 e 1 Troféu!`;
        
        // Deixa o próximo rival ligeiramente mais difícil
        jogo.rival.habilidade += 4;
    } else {
        // Derrota
        output.style.color = "#f75a68";
        output.innerText = `Derrota! O rival fez ${poderTotalRival} pontos contra seus ${poderTotalJogador}. Treine mais!`;
    }
    atualizarInterface();
}

// Controle de Navegação das Abas
function mudarAba(idAba) {
    // Esconde todas as abas
    document.querySelectorAll('.tela-aba').forEach(aba => {
        aba.classList.add('oculta');
    });
    // Remove classe ativa de todos os botões do menu
    document.querySelectorAll('.btn-menu').forEach(btn => {
        btn.classList.remove('ativo');
    });

    // Mostra a aba clicada
    document.getElementById(idAba).classList.remove('oculta');
    
    // Destaca o botão clicado
    event.currentTarget.classList.add('ativo');
}

// Atualização Visual das Variáveis na Tela
function atualizarInterface() {
    document.getElementById("dinheiro-display").innerText = `Dinheiro: $${jogo.dinheiro}`;
    document.getElementById("gps-display").innerText = `Ganhos: $${jogo.dinheiroPorSegundo}/s`;
    document.getElementById("trofeus-display").innerText = `Troféus: ${jogo.trofeus}`;
    
    document.getElementById("atleta-info").innerText = `${jogo.atleta.nome} (Nível ${jogo.atleta.nivel})`;
    document.getElementById("atleta-status").innerText = `Habilidade: ${jogo.atleta.habilidade}`;
    document.getElementById("btn-treinar").innerText = `Treinar ($${jogo.atleta.custoTreino})`;
    
    // Atualiza info do rival na aba de partidas
    const cardPartida = document.querySelector(".card-partida p");
    if(cardPartida) cardPartida.innerText = `Poder do Rival: ${jogo.rival.habilidade}`;
}

// === SISTEMA DE SALVAMENTO AUTOMÁTICO ===

// 1. Função para SALVAR o progresso
function salvarJogo() {
    localStorage.setItem("sportManager_save", JSON.stringify(jogo));
    console.log("Jogo salvo automaticamente!");
}

// 2. Função para CARREGAR o progresso ao abrir o app
function carregarJogo() {
    let savegame = localStorage.getItem("sportManager_save");
    
    if (savegame !== null) {
        jogo = JSON.parse(savegame);
        atualizarInterface();
    }
}

// 3. Executar o carregamento assim que a página abrir
window.onload = function() {
    carregarJogo();
};

// 4. Salvar automaticamente a cada 5 segundos
setInterval(() => {
    salvarJogo();
}, 5000);

