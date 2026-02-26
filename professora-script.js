// professora-script.js

let salaAtual = null;
let totalPerguntas = 0;

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
  db.ref(`salas/${salaAtual}/perguntas`).on("value", snap => {
    const lista = document.getElementById("listaPerguntas");
    lista.innerHTML = "";
    const perguntas = snap.val() || {};
    totalPerguntas = Object.keys(perguntas).length;
    Object.entries(perguntas).forEach(([key, p]) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `${p.pergunta} = <strong>${p.resposta}</strong>`;
      const btn = document.createElement("button");
      btn.className = "delete";
      btn.textContent = "×";
      btn.onclick = () => db.ref(`salas/${salaAtual}/perguntas/${key}`).remove();
      div.appendChild(btn);
      lista.appendChild(div);
    });
  });

  // ... (manter monitoramento de alunos, atual, respostas como antes)
}

function addPerguntaManual() {
  const perg = document.getElementById("pergunta-manual").value.trim();
  const resp = parseFloat(document.getElementById("resposta-manual").value);
  if (!perg || isNaN(resp)) return alert("Preencha pergunta e resposta");
  db.ref(`salas/${salaAtual}/perguntas`).push({ pergunta: perg, resposta: resp });
  document.getElementById("pergunta-manual").value = "";
  document.getElementById("resposta-manual").value = "";
}

function gerarPerguntaAleatoria() {
  const tipos = [
    () => { let a=Math.floor(Math.random()*20)+1, b=Math.floor(Math.random()*20)+1; return {p:`${a} + ${b} =`, r:a+b} },
    () => { let a=Math.floor(Math.random()*25)+5, b=Math.floor(Math.random()*a)+1; return {p:`${a} - ${b} =`, r:a-b} },
    () => { let a=Math.floor(Math.random()*12)+1, b=Math.floor(Math.random()*12)+1; return {p:`${a} × ${b} =`, r:a*b} },
    () => { let d=Math.floor(Math.random()*9)+2, q=Math.floor(Math.random()*8)+2; return {p:`${d*q} ÷ ${d} =`, r:q} },
    // Expressões mais desafiadoras
    () => { let a=Math.floor(Math.random()*10)+1, b=Math.floor(Math.random()*10)+1, c=Math.floor(Math.random()*5)+1; return {p:`${a} × ${b} - ${c} + ${Math.floor(Math.random()*5)+1} =`, r: a*b - c + Math.floor(Math.random()*5)+1} }
  ];
  const q = tipos[Math.floor(Math.random()*tipos.length)]();
  db.ref(`salas/${salaAtual}/perguntas`).push({ pergunta: q.p, resposta: q.r });
}

// ... (manter limparPerguntas, iniciarRodada, proximaPergunta)

function iniciarRodada() {
  db.ref(`salas/${salaAtual}/perguntas`).once("value").then(snap => {
    const perguntas = snap.val() || {};
    const total = Object.keys(perguntas).length;
    if (total === 0) return alert("Adicione pelo menos uma pergunta");

    // Salva total de perguntas
    db.ref(`salas/${salaAtual}`).update({ 
      atual: 0, 
      respostas: {},
      totalPerguntas: total,
      finalizada: false
    });

    // Limpa bloqueio de respostas
    db.ref(`salas/${salaAtual}/alunos`).once("value").then(snapAlunos => {
      const alunos = snapAlunos.val() || {};
      Object.keys(alunos).forEach(aluno => {
        db.ref(`salas/${salaAtual}/alunos/${aluno}/ultimaPerguntaRespondida`).remove();
      });
    });
  });
}

function finalizarRodada() {
  // Limpa bloqueio
  db.ref(`salas/${salaAtual}/alunos`).once("value").then(snap => {
    const alunos = snap.val() || {};
    Object.keys(alunos).forEach(aluno => {
      db.ref(`salas/${salaAtual}/alunos/${aluno}/ultimaPerguntaRespondida`).remove();
    });
  });

  db.ref(`salas/${salaAtual}`).update({ 
    atual: null,
    finalizada: true 
  });

  // Redireciona para o pódio
  window.location.href = `podio.html?sala=${salaAtual}`;
}
