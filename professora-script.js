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

  db.ref(`salas/${salaAtual}/alunos`).on("value", snap => {
    const div = document.getElementById("listaAlunos");
    div.innerHTML = "";
    const alunos = snap.val() || {};
    if (Object.keys(alunos).length === 0) {
      div.textContent = "Nenhum aluno entrou ainda...";
    } else {
      Object.keys(alunos).forEach(nome => {
        const p = document.createElement("p");
        p.textContent = nome;
        p.style.margin = "10px 0";
        p.style.fontSize = "1.2rem";
        div.appendChild(p);
      });
    }
  });

  db.ref(`salas/${salaAtual}/atual`).on("value", snap => {
    const idx = snap.val();
    document.getElementById("pergunta-atual").textContent = idx === null ? "—" : `Pergunta ${idx + 1}`;
    document.getElementById("btnProxima").disabled = idx === null;
    document.getElementById("btnFinalizar").disabled = idx === null;
    document.getElementById("btnIniciar").disabled = idx !== null;
  });

  db.ref(`salas/${salaAtual}/respostas`).on("value", snap => {
    const tbody = document.getElementById("tabelaRespostas");
    tbody.innerHTML = "";
    const respostas = snap.val() || {};
    Object.entries(respostas).forEach(([nome, data]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${nome}</td><td>${data.acertos || 0}</td><td>${data.ultima ?? "-"}</td>`;
      tbody.appendChild(tr);
    });
  });
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
    () => { let a=Math.floor(Math.random()*10)+1, b=Math.floor(Math.random()*10)+1, c=Math.floor(Math.random()*5)+1; return {p:`${a} × ${b} - ${c} + ${Math.floor(Math.random()*5)+1} =`, r: a*b - c + Math.floor(Math.random()*5)+1} }
  ];
  const q = tipos[Math.floor(Math.random()*tipos.length)]();
  db.ref(`salas/${salaAtual}/perguntas`).push({ pergunta: q.p, resposta: q.r });
}

function limparPerguntas() {
  if (!confirm("Limpar todas as perguntas?")) return;
  db.ref(`salas/${salaAtual}/perguntas`).remove();
}

function iniciarRodada() {
  db.ref(`salas/${salaAtual}/perguntas`).once("value").then(snap => {
    const perguntas = snap.val() || {};
    const total = Object.keys(perguntas).length;
    if (total === 0) return alert("Adicione pelo menos uma pergunta");

    db.ref(`salas/${salaAtual}`).update({ 
      atual: 0, 
      respostas: {},
      totalPerguntas: total,
      finalizada: false
    });

    db.ref(`salas/${salaAtual}/alunos`).once("value").then(snapAlunos => {
      const alunos = snapAlunos.val() || {};
      Object.keys(alunos).forEach(aluno => {
        db.ref(`salas/${salaAtual}/alunos/${aluno}/ultimaPerguntaRespondida`).remove();
        db.ref(`salas/${salaAtual}/alunos/${aluno}/respondeuAtual`).remove();
      });
    });
  });
}

function proximaPergunta() {
  db.ref(`salas/${salaAtual}/atual`).transaction(n => (n || 0) + 1);
}

function finalizarRodada() {
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
