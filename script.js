// ... (mantenha entrarSala e criarSala como estão)

function novaPergunta() {
  const a = Math.floor(Math.random() * 10) + 1; // Evita o zero para não ser fácil demais
  const b = Math.floor(Math.random() * 10) + 1;

  db.ref("salas/" + salaAtual).update({
    pergunta: `${a} + ${b}`,
    resposta: a + b
  }).then(() => {
     console.log("Pergunta enviada!");
  });
}

function responder() {
  const input = document.getElementById("resposta");
  const resposta = Number(input.value);
  const sala = localStorage.getItem("sala");
  const nome = localStorage.getItem("nome");

  if (!input.value) return;

  db.ref("salas/" + sala).once("value", snapshot => {
    const correta = snapshot.val().resposta;
    if (resposta === correta) {
      db.ref(`salas/${sala}/alunos/${nome}/pontos`)
        .transaction(p => (p || 0) + 10);
      input.value = ""; // Limpa campo
      input.focus();
    } else {
      alert("❌ Tente novamente!");
    }
  });
}