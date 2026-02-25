// podio-script.js – Lógica da página do pódio

window.addEventListener('load', () => {
  console.log("Página do pódio carregada. Monitorando ranking...");
  monitorarPodio();
});

function monitorarPodio() {
  // Substitua "salaAtual" pelo caminho correto ou por uma sala fixa para teste
  // Para produção, você pode pegar a sala da URL ou localStorage
  const salaAtual = "salaAtual"; // ← ajuste conforme necessário

  db.ref(`salas/${salaAtual}/respostas`).on("value", snap => {
    const respostas = snap.val() || {};
    const ranking = Object.entries(respostas)
      .map(([nome, data]) => ({ nome, acertos: data.acertos || 0 }))
      .sort((a, b) => b.acertos - a.acertos);

    const podium = document.getElementById("podium");
    podium.innerHTML = "";
    for (let i = 0; i < Math.min(3, ranking.length); i++) {
      const div = document.createElement("div");
      div.className = `lugar lugar${i+1}`;
      div.innerHTML = `
        <h2>${i+1}º lugar</h2>
        <p style="font-size:1.8rem; margin:15px 0;">${ranking[i].nome}</p>
        <p style="font-size:3rem;">${ranking[i].acertos}</p>
      `;
      podium.appendChild(div);
    }

    const tbody = document.getElementById("tabela");
    tbody.innerHTML = "";
    ranking.forEach((item, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${idx+1}º</td><td>${item.nome}</td><td>${item.acertos}</td>`;
      tbody.appendChild(tr);
    });

    if (ranking.length === 0) {
      podium.innerHTML = "<p style='font-size:1.6rem; color:#bbb;'>Nenhuma pontuação registrada ainda.</p>";
    }
  });
}