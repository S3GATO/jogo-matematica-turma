// professora-script.js

let salaAtual = null;
let totalPerguntas = 0;
let listaChavesPerguntas = [];

// Variáveis para o controle automatizado de fluxo
let tempoRestante = 30; // Tempo padrão em segundos por pergunta
let cronometro = null;
let totalAlunosConectados = 0;

window.addEventListener('load', () => {
  console.log("Página da professora carregada. Criando nova sala...");
  criarNovaSala();
});

function criarNovaSala() {
  salaAtual = Math.random().toString(36).substring(2, 8).toUpperCase();
  console.log("Senha gerada:", salaAtual);
  document.getElementById("senha-sala").textContent = salaAtual;

  db.ref(`salas/${salaAtual}`).set({
    perguntas: {},
    atual: null,
    respostas: {},
    alunos: {},
    totalPerguntas: 0,
    finalizada: false
  }).then(() => {
    console.log("Sala criada com sucesso!");
    monitorarSala();
  }).catch(error => {
    console.error("Erro ao criar sala:", error);
    document.getElementById("senha-sala").textContent = "Erro ao criar sala";
    alert("Erro ao criar aula: " + error.message);
  });
}

function monitorarSala() {
  // 1. Monitorar as perguntas da sala (carrega chaves para mapear os índices)
  db.ref(`salas/${salaAtual}/perguntas`).on("value", snap => {
    const perguntas = snap.val() || {};
    listaChavesPerguntas = Object.keys(perguntas);
    totalPerguntas = listaChavesPerguntas.length;
  });

  // 2. Monitorar Alunos Conectados e processar respostas em tempo real
  db.ref(`salas/${salaAtual}/alunos`).on("value", snap => {
    const div = document.getElementById("listaAlunos");
    div.innerHTML = "";
    const alunos = snap.val() || {};
    
    totalAlunosConectados = Object.keys(alunos).length;

    if (totalAlunosConectados === 0) {
      div.innerHTML = '<span class="sem-alunos">Nenhum aluno entrou ainda...</span>';
    } else {
      Object.keys(alunos).forEach(nome => {
        const p = document.createElement("p");
        p.textContent = nome;
        div.appendChild(p);
      });
    }

    // Verifica automatizada a cada mudança na coleção de alunos
    verificarSeTodosResponderam(alunos);
  });

  // 3. Monitorar o estado do índice da pergunta atual para disparar o Timer
  db.ref(`salas/${salaAtual}/atual`).on("value", snap => {
    const idx = snap.val();
    const btnIniciar = document.getElementById("btnIniciar");

    if (idx === null) {
      if (btnIniciar) btnIniciar.disabled = false;
      clearInterval(cronometro);
    } else {
      if (btnIniciar) btnIniciar.disabled = true;
      // Inicia a contagem sempre que o índice da rodada muda no banco
      iniciarCronometroPergunta();
    }
  });

  // 4. Sincronizar logs e tabela interna de respostas
  db.ref(`salas/${salaAtual}/respostas`).on("value", snap => {
    const tbody = document.getElementById("tabelaRespostas");
    if (!tbody) return;
    tbody.innerHTML = "";
    const respostas = snap.val() || {};
    Object.entries(respostas).forEach(([nome, data]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${nome}</td><td>${data.acertos || 0}</td><td>${data.ultima ?? "-"}</td>`;
      tbody.appendChild(tr);
    });
  });
}

// ==========================================
//    LÓGICA DE AUTOMAÇÃO E CONTROLE DE FLUXO
// ==========================================

function iniciarRodada() {
  // Se nenhuma pergunta foi atribuída ainda pela nova aba ou professor, o sistema cria uma automática para iniciar o fluxo.
  if (totalPerguntas === 0) {
    gerarPerguntaDoSistemaAutomatica();
  }

  setTimeout(() => {
    db.ref(`salas/${salaAtual}`).update({ 
      atual: 0, 
      respostas: {},
      totalPerguntas: totalPerguntas,
      finalizada: false
    });

    db.ref(`salas/${salaAtual}/alunos`).once("value").then(snapAlunos => {
      const alunos = snapAlunos.val() || {};
      Object.keys(alunos).forEach(aluno => {
        db.ref(`salas/${salaAtual}/alunos/${aluno}/ultimaPerguntaRespondida`).remove();
        db.ref(`salas/${salaAtual}/alunos/${aluno}/respondeuAtual`).remove();
      });
    });
  }, 350);
}

// CASO 1: Controla o Timer Regressivo por Pergunta (30 segundos)
function iniciarCronometroPergunta() {
  clearInterval(cronometro);
  tempoRestante = 30; 

  cronometro = setInterval(() => {
    tempoRestante--;
    
    const displayTempo = document.getElementById("tempo-cronometro");
    if (displayTempo) displayTempo.textContent = `Tempo: ${tempoRestante}s`;

    // Tempo esgotado -> Avança pro fluxo seguinte
    if (tempoRestante <= 0) {
      clearInterval(cronometro);
      proximaPerguntaAutomatica();
    }
  }, 1000);
}

// CASO 2: Monitora respostas e pula imediatamente se todos responderem
function verificarSeTodosResponderam(alunos) {
  if (totalAlunosConectados === 0) return;

  let responderam = 0;
  Object.values(alunos).forEach(aluno => {
    if (aluno.respondeuAtual === true) {
      responderam++;
    }
  });

  // Se o número de respostas recebidas bate com o total de alunos ativos na partida
  if (responderam >= totalAlunosConectados) {
    db.ref(`salas/${salaAtual}/atual`).once("value").then(snap => {
      if (snap.val() !== null) { 
        console.log("Todos os alunos responderam! Avançando sem esperar o cronômetro...");
        clearInterval(cronometro);
        proximaPerguntaAutomatica();
      }
    });
  }
}

function proximaPerguntaAutomatica() {
  db.ref(`salas/${salaAtual}/atual`).once("value").then(snap => {
    const atualIdx = snap.val();
    if (atualIdx === null) return;

    if (atualIdx + 1 < totalPerguntas) {
      limparSinalizadoresAlunos();
      db.ref(`salas/${salaAtual}/atual`).set(atualIdx + 1);
    } else {
      finalizarRodadaAutomatica();
    }
  });
}

function limparSinalizadoresAlunos() {
  db.ref(`salas/${salaAtual}/alunos`).once("value").then(snap => {
    const alunos = snap.val() || {};
    Object.keys(alunos).forEach(aluno => {
      db.ref(`salas/${salaAtual}/alunos/${aluno}/respondeuAtual`).remove();
    });
  });
}

function finalizarRodadaAutomatica() {
  clearInterval(cronometro);

  db.ref(`salas/${salaAtual}/alunos`).once("value").then(snap => {
    const alunos = snap.val() || {};
    Object.keys(alunos).forEach(aluno => {
      db.ref(`salas/${salaAtual}/alunos/${aluno}/ultimaPerguntaRespondida`).remove();
      db.ref(`salas/${salaAtual}/alunos/${aluno}/respondeuAtual`).remove();
    });
  });

  db.ref(`salas/${salaAtual}`).update({ 
    atual: null,
    finalizada: true 
  });

  window.location.href = `podio.html?sala=${salaAtual}`;
}

function gerarPerguntaDoSistemaAutomatica() {
  const tipos = [
    () => { let a=Math.floor(Math.random()*20)+1, b=Math.floor(Math.random()*20)+1; return {p:`${a} + ${b} =`, r:a+b} },
    () => { let a=Math.floor(Math.random()*25)+5, b=Math.floor(Math.random()*a)+1; return {p:`${a} - ${b} =`, r:a-b} },
    () => { let a=Math.floor(Math.random()*12)+1, b=Math.floor(Math.random()*12)+1; return {p:`${a} × ${b} =`, r:a*b} },
    () => { let d=Math.floor(Math.random()*9)+2, q=Math.floor(Math.random()*8)+2; return {p:`${d*q} ÷ ${d} =`, r:q} }
  ];
  const q = tipos[Math.floor(Math.random()*tipos.length)]();
  db.ref(`salas/${salaAtual}/perguntas`).push({ pergunta: q.p, resposta: q.r });
}
