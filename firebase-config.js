// firebase-config.js
// Configuração do Firebase – altere apenas aqui quando necessário

const firebaseConfig = {
  apiKey: "AIzaSyAvxTI0k3k66GGRsQ6p5kKjDmldzjVUC",  // ← sua chave real
  authDomain: "jogo-matematica-27c29.firebaseapp.com",
  databaseURL: "https://jogo-matematica-27c29-default-rtdb.firebaseio.com",
  projectId: "jogo-matematica-27c29",
  storageBucket: "jogo-matematica-27c29.appspot.com",
  messagingSenderId: "201540072957",
  appId: "1:201540072957:web:bc6fb2314a7a965969d594",
  measurementId: "G-TK1935BSBM"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

console.log("Firebase inicializado com sucesso.");