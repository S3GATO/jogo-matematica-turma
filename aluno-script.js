// aluno-script.js

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

    db.ref("salas/" + sala + "/alunos/" + nome).set(true);
    document.getElementById("entrada").style.display = "none";
    document.getElementById("jogo").style.display = "block";
    carregarJogo();
  }).catch(err => {
    loading.textContent = "";
    alert("Erro ao conectar com a aula.");
  });
}

function carregarJogo() {
  db.ref(`salas/${sala}/perguntas`).once("value").then(snap => {
    perguntas = Object.values(snap.val() || {});
  });

  db.ref(`salas/${sala}/atual`).on("value", snap => {
    idxAtual = snap.val();

    if (idxAtual === null) {
      document.getElementById("status").textContent = "Aguardando a professora iniciar...";
      return;
    }

    if (idxAtual >= perguntas.length) {
      mostrarFim();
      return;
    }

    mostrarPergunta(idxAtual);
  });
}

function mostrarPergunta(idx) {
  idxAtual = idx;
  const q = perguntas[idx];
  document.getElementById("pergunta").textContent = q.pergunta;
  document.getElementById("status").textContent = `Pergunta ${idx + 1} de ${perguntas.length}`;

  const opcoesDiv = document.getElementById("opcoes");
  opcoesDiv.innerHTML = ""; // Limpa opções anteriores (remove qualquer feedback antigo)

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

  // Inicia timer de 16 segundos
  tempoInicio = Date.now();
  let tempoRestante = 16;
  document.getElementById("timer").textContent = `Tempo: ${tempoRestante}s`;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    tempoRestante = 16 - Math.floor((Date.now() - tempoInicio) / 1000);
    document.getElementById("timer").textContent = `Tempo: ${tempoRestante}s`;

    if (tempoRestante <= 0) {
      clearInterval(timerInterval);
      desabilitarOpcoes();
      setTimeout(() => proximaPergunta(), 2000); // avança automaticamente
    }
  }, 1000);
}

function responder(escolhida, correta, btnClicado) {
  clearInterval(timerInterval);

  const acertou = escolhida === correta;

  // Desabilita todas as opções imediatamente
  document.querySelectorAll(".opcao").forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
  });

  // Feedback visual persistente até a próxima pergunta
  document.querySelectorAll(".opcao").forEach(btn => {
    const val = btn.textContent.trim();
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

  // Registra resposta e pontos
  const tempoDecorrido = (Date.now() - tempoInicio) / 1000;
  const pontos = acertou ? Math.max(100, 1000 * (1 - tempoDecorrido / 16)) : 0;

  db.ref(`salas/${sala}/respostas/${nome}`).update({
    acertos: firebase.database.ServerValue.increment(acertou ? 1 : 0),
    pontos: firebase.database.ServerValue.increment(Math.round(pontos)),
    ultima: escolhida,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  // Marca que respondeu esta pergunta
  db.ref(`salas/${sala}/alunos/${nome}`).update({
    ultimaPerguntaRespondida: idxAtual
  });

  const resDiv = document.getElementById("resultado");
  resDiv.style.color = acertou ? "#66bb6a" : "#e53935";
  resDiv.textContent = acertou ? `Correto! +${Math.round(pontos)} pontos` : `Errado • Era ${correta}`;
  setTimeout(() => resDiv.textContent = "", 3000);
}

function desabilitarOpcoes() {
  document.querySelectorAll(".opcao").forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
  });
}

function mostrarFim() {
  document.getElementById("jogo").style.display = "none";
  document.getElementById("fim").style.display = "block";

  db.ref(`salas/${sala}/respostas/${nome}`).once("value").then(snap => {
    const data = snap.val() || {acertos: 0, pontos: 0};
    document.getElementById("resultado-final").textContent = 
      `Você acertou ${data.acertos} perguntas e fez ${data.pontos} pontos!`;
  });
}
