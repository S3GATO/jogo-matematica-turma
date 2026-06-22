// VARIÁVEIS DE CONTROLE DO JOGO
let tempoRestante = 30; // Tempo em segundos por pergunta
let cronometro;
let totalAlunosConectados = 0;
let totalRespostasRecebidas = 0;

// 1. Monitorar quantidade de alunos na sala (essencial para saber se todos responderam)
function monitorarAlunosDaSala(salaId) {
    // Exemplo usando Firebase Realtime Database
    firebase.database().ref(`salas/${salaId}/alunos`).on('value', (snapshot) => {
        const alunos = snapshot.val() || {};
        totalAlunosConectados = Object.keys(alunos).length;
        
        // Atualiza a interface visual dos alunos conectados
        atualizarListaAlunosInterface(alunos);
    });
}

// 2. Função chamada quando a professora clica em "Iniciar Jogo"
function avancarParaPainelPerguntas() {
    // Aqui você pode redirecionar para a nova aba/tela ou apenas ocultar a div atual
    console.log("Iniciando a partida e liberando as perguntas...");
    
    // Inicia a primeira rodada
    gerarEIniciarNovaPergunta();
}

// 3. Controla o início de cada pergunta e o Timer
function iniciarCronometroPergunta() {
    totalRespostasRecebidas = 0; // Reseta o contador para a nova pergunta
    tempoRestante = 30; // Reseta o tempo da rodada
    
    // Limpa qualquer cronômetro ativo anterior
    clearInterval(cronometro);

    cronometro = setInterval(() => {
        tempoRestante--;
        atualizarDisplayCronometro(tempoRestante); // Atualiza o contador na tela
        
        // CASO 1: O tempo acabou -> Passa para a próxima pergunta automaticamente
        if (tempoRestante <= 0) {
            clearInterval(cronometro);
            computarFimDoTempoOuAvancar();
        }
    }, 1000);
}

// 4. Ouvinte de respostas (Chame esta função toda vez que o Firebase detectar uma nova resposta de aluno)
function monitorarRespostasAlunos(salaId, perguntaIdAtual) {
    firebase.database().ref(`salas/${salaId}/respostas/${perguntaIdAtual}`).on('value', (snapshot) => {
        const respostas = snapshot.val() || {};
        totalRespostasRecebidas = Object.keys(respostas).length;

        // CASO 2: Todos os alunos responderam -> Passa para a próxima imediatamente
        if (totalAlunosConectados > 0 && totalRespostasRecebidas >= totalAlunosConectados) {
            clearInterval(cronometro);
            console.log("Todos os alunos responderam! Avançando...");
            computarFimDoTempoOuAvancar();
        }
    });
}

// 5. Função responsável por passar a pergunta no banco de dados
function computarFimDoTempoOuAvancar() {
    // Altera o estado da pergunta atual no banco para que o app do aluno também mude de tela
    console.log("Avançando rodada automaticamente...");
    
    // Lógica para carregar a próxima pergunta (seja manual ou gerada pelo sistema)
    // Enviar comando pro Firebase: firebase.database().ref(`salas/${salaId}/status`).set({ ... });
}
