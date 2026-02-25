// firebase-config.js
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_NUMERO",
  appId: "1:SEU_NUMERO:web:SUA_CHAVE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

console.log("Firebase configurado com sucesso");