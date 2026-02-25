// common.js – Funções comuns usadas em todas as páginas

// Inicia os símbolos matemáticos caindo no fundo
function iniciarSimbolos() {
  const simbolos = ["+", "−", "×", "÷", "=", "²", "³", "√", "π", "∞", "%", "≈", "≠"];
  
  setInterval(() => {
    const s = document.createElement("div");
    s.className = "symbol";
    s.textContent = simbolos[Math.floor(Math.random() * simbolos.length)];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDuration = (8 + Math.random() * 15) + "s";
    document.getElementById("symbols").appendChild(s);
    setTimeout(() => s.remove(), 35000);
  }, 500);
}

// Executa ao carregar qualquer página que tenha #symbols
window.addEventListener('load', () => {
  if (document.getElementById("symbols")) {
    iniciarSimbolos();
  }
});