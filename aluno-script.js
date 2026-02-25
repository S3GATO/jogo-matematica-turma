// aluno-script.js – Toda a lógica da página do aluno

let nome = "";
let sala = "";
let perguntas = [];

function entrarNaSala() {
  nome = document.getElementById("nome-aluno").value.trim();
  sala = document.getElementById("senha-sala").value.trim().toUpperCase();

  const loading = document.getElementById("loading-message");
  loading.textContent = "Verificando sala... Aguarde.";

  console.log("=== Início da tentativa de entrada ===");
  console.log("Nome digitado:", nome);
  console.log("Senha digitada:", sala);

  if (!nome || !sala) {
    loading.textContent = "";
    alert("Preencha nome e senha da aula corretamente.");
    console.log("Campos vazios");
    return;
  }

  console.log("Consultando Firebase no caminho: salas/" + sala);

  db.ref("salas/" + sala).once("value").then(snap => {
    console.log("Resposta completa do Firebase:");
    console.log("Existe a sala?", snap.exists());
    console.log("Dados da sala:", snap.val());

    if (!snap.exists()) {
      loading.textContent = "";
      alert("Senha inválida!\n" +
            "Verifique se digitou exatamente a senha gerada pela professora\n" +
            "(maiúsculas, sem espaços ou erros de digitação).\n" +
            "Dica: copie e cole a senha para evitar erros.");
      console.log("Motivo: Sala não existe no Firebase");
      return;
    }

    console.log("Sala encontrada! Registrando aluno...");
    loading.textContent = "Entrada confirmada! Carregando jogo...";

    db.ref("salas/" + sala + "/alunos/" + nome).set(true).then(() => {
      console.log("Aluno registrado com sucesso! Avançando para o jogo...");
      setTimeout(() => {
        document.getElementById("entrada").style.display = "none";
        document.getElementById("jogo").style.display = "block";
        carregarJogo();
      }, 800); // pequeno delay para o usuário ver a mensagem
    }).catch(err => {
      loading.textContent = "";
      console.error("Erro ao registrar aluno:", err);
      alert("Erro ao registrar sua presença. Tente novamente.");
    });
  }).catch(err => {
    loading.textContent = "";
    console.error("Erro ao consultar sala:", err);
    alert("Erro ao conectar com a aula. Verifique sua internet ou o console (F12).");
  });
}

function carregarJogo() {
  console.log("Carregando jogo da sala:", sala);
  db.ref(`salas/${sala}/perguntas`).once("value").then(snap => {
    perguntas = Object.values(snap.val() || {});
    console.log("Perguntas carregadas:", perguntas.length);
  });

  db.ref(`salas/${sala}/atual`).on("value", snap => {
    const idx = snap.val();
    console.log("Pergunta atual:", idx);

    if (idx === null) {
      document.getElementById("status").textContent = "Aguardando a professora iniciar...";
      document.getElementById("pergunta").textContent = "";
      document.getElementById("opcoes").innerHTML = "";
      return;
    }

    if (idx >= perguntas.length) {
      mostrarFim();
      return;
    }

    mostrarPergunta(idx);
  });
}

function mostrarPergunta(idx) {
  const q = perguntas[idx];
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
    btn.onclick = () => responder(val, correta);
    opcoesDiv.appendChild(btn);
  });
}

function responder(escolhida, correta) {
  const acertou = escolhida === correta;

  db.ref(`salas/${sala}/respostas/${nome}`).update({
    acertos: firebase.database.ServerValue.increment(acertou ? 1 : 0),
    ultima: escolhida,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  const resDiv = document.getElementById("resultado");
  resDiv.style.color = acertou ? "#66bb6a" : "#e53935";
  resDiv.textContent = acertou ? "Correto! ✓" : `Errado • Era ${correta}`;
  setTimeout(() => resDiv.textContent = "", 3000);
}

function mostrarFim() {
  document.getElementById("jogo").style.display = "none";
  document.getElementById("fim").style.display = "block";

  db.ref(`salas/${sala}/respostas/${nome}`).once("value").then(snap => {
    const data = snap.val() || {acertos: 0};
    document.getElementById("resultado-final").textContent = 
      `Você acertou ${data.acertos} de ${perguntas.length} perguntas!`;
  });
}