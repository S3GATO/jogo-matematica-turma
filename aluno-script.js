let nome = "";
let sala = "";
let perguntas = [];
let idxAtual = -1;
let timerInterval = null;
let tempoInicio = null;

function entrarNaSala() {
  nome = document.getElementById("nome-aluno").value.trim();
  sala = document.getElementById("senha-sala").value.trim().toUpperCase();

  const loading = document.getElementById("loading-message");
  loading.textContent = "Verificando sala... Aguarde.";

  if (!nome || !sala) {
    loading.textContent = "";
    alert("Preencha nome e senha da aula corretamente.");
    return;
  }

  db.ref("salas/" + sala).once("value").then(snap => {
    if (!snap.exists()) {
      loading.textContent = "";
      alert("Senha inválida! Verifique se digitou exatamente a senha gerada pela professora.");
      return;
    }

    // Registra o aluno na lista de alunos conectados
    db.ref("salas/" + sala + "/alunos/" + nome).set({
      conectado: true
    });
    
    document.getElementById("entrada").style.display = "none";
    document.getElementById("jogo").style.display = "block";
    carregarJogo();
  }).catch(err => {
    loading.textContent = "";
    alert("Erro ao conectar com a aula.");
  });
}

function carregarJogo() {
  // Escuta ativa para carregar perguntas caso a professora gere dinamicamente
  db.ref(`salas/${sala}/perguntas`).on("value", snap => {
    perguntas = Object.values(snap.val() || {});
  });

  // Escuta o controle de rodadas da professora
  db.ref(`salas/${sala}/atual`).on("value", snap => {
    idxAtual = snap.val();

    // Se a professora resetou ou ainda não iniciou a partida
    if (idxAtual === null) {
      document.getElementById("status").textContent = "Aguardando a professora iniciar...";
      document.getElementById("pergunta").textContent = "Prepare-se!";
      document.getElementById("opcoes").innerHTML = "";
      if (timerInterval) clearInterval(timerInterval);
      document.getElementById("timer").textContent = "";
      return;
    }

    // Se o índice estourou o número de perguntas, encerra visualmente pro aluno
    if (idxAtual >= perguntas.length) {
      mostrarFim();
      return;
    }

    // Limpa feedbacks visuais antigos para receber a nova pergunta
    const resDiv = document.getElementById("resultado");
    if (resDiv) resDiv.textContent = "";

    mostrarPergunta(idxAtual);
  });
}

function mostrarPergunta(idx) {
  idxAtual = idx;
  const q = perguntas[idx];
  
  if (!q) return;

  document.getElementById("pergunta").textContent = q.pergunta;
  document.getElementById("status").textContent = `Pergunta ${idx + 1} de ${perguntas.length}`;

  const opcoesDiv = document.getElementById("opcoes");
  opcoesDiv.innerHTML = ""; 

  const correta = q.resposta;
  let alternativas = [correta];
  
  while (alternativas.length < 4) {
    let errada = correta + Math.floor(Math.random() * 11 - 5);
    if (errada < 0) errada = 0;
    if (!alternativas.includes(errada)) alternativas.push(errada);
  }
  alternativas.sort(() => Math.random() - 0.5);

  alternativas.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opcao";
    btn.textContent = val;
    btn.onclick = () => responder(val, correta, btn);
    opcoesDiv.appendChild(btn);
  });

  // O cronômetro oficial roda no painel projetado da professora (30s)
  // Mantemos esse timer visual local apenas como referência rápida para o aluno saber que deve correr
  tempoInicio = Date.now();
  let tempoVisual = 30;
  document.getElementById("timer").textContent = `Tempo: ${tempoVisual}s`;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    tempoVisual = 30 - Math.floor((Date.now() - tempoInicio) / 1000);
    if (tempoVisual < 0) tempoVisual = 0;
    document.getElementById("timer").textContent = `Tempo: ${tempoVisual}s`;

    if (tempoVisual <= 0) {
      clearInterval(timerInterval);
      desabilitarOpcoes();
      
      // Se o tempo esgotou e o aluno não clicou em nada, avisa o Firebase da professora 
      // para que a sala saiba que ele concluiu (mesmo zerando) e não trave o avanço do grupo
      db.ref(`salas/${sala}/alunos/${nome}`).update({
        respondeuAtual: true,
        ultimaPerguntaRespondida: idxAtual
      });
    }
  }, 1000);
}

function responder(escolhida, correta, btnClicado) {
  if (timerInterval) clearInterval(timerInterval);

  const acertou = escolhida === correta;

  // Desabilita todas as opções imediatamente para evitar múltiplos cliques
  document.querySelectorAll(".opcao").forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
  });

  // Aplica estilos visuais de feedback
  document.querySelectorAll(".opcao").forEach(btn => {
    const val = parseInt(btn.textContent.trim());
    if (val === correta) {
      btn.classList.add("correta");
    }
    if (val === escolhida) {
      if (acertou) {
        btn.classList.add("correta");
      } else {
        btn.classList.add("errada");
      }
    }
    if (val !== correta && val !== escolhida) {
      btn.classList.add("desabilitada");
    }
  });

  // Pontuação baseada no tempo de resposta (máximo 30 segundos)
  const tempoDecorrido = (Date.now() - tempoInicio) / 1000;
  const pontos = acertou ? Math.max(100, 1000 * (1 - tempoDecorrido / 30)) : 0;

  // Envia relatório de desempenho para a nuvem
  db.ref(`salas/${sala}/respostas/${nome}`).update({
    acertos: firebase.database.ServerValue.increment(acertou ? 1 : 0),
    pontos: firebase.database.ServerValue.increment(Math.round(pontos)),
    ultima: escolhida,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  // SINALIZADOR CRUCIAL: Notifica a professora que este aluno terminou a rodada atual
  db.ref(`salas/${sala}/alunos/${nome}`).update({
    respondeuAtual: true,
    ultimaPerguntaRespondida: idxAtual
  });

  const resDiv = document.getElementById("resultado");
  if (resDiv) {
    resDiv.style.color = acertou ? "#66bb6a" : "#e53935";
    resDiv.textContent = acertou ? `Correto! +${Math.round(pontos)} pontos` : `Errado • Resposta: ${correta}`;
  }
}

function desabilitarOpcoes() {
  document.querySelectorAll(".opcao").forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
  });
}

function mostrarFim() {
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById("jogo").style.display = "none";
  document.getElementById("fim").style.display = "block";

  db.ref(`salas/${sala}/respostas/${nome}`).once("value").then(snap => {
    const data = snap.val() || {acertos: 0, pontos: 0};
    const campoFim = document.getElementById("resultado-final");
    if (campoFim) {
      campoFim.textContent = `Fim de jogo! Você acertou ${data.acertos} perguntas e acumulou ${data.pontos} pontos.`;
    }
  });
}
