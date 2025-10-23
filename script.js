// ===== Importações do Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    startAfter,
    startAt,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";

// ===== Configuração Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyBvhXaKpJDT3SJ_n-qebBbdjhjFmX-cyXI",
    authDomain: "db-irriga.firebaseapp.com",
    projectId: "db-irriga",
    storageBucket: "db-irriga.firebasestorage.app",
    messagingSenderId: "740522790741",
    appId: "1:740522790741:web:cd2b14007c61ef0fd469dc"
};

// ===== Inicializa Firebase =====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== Elementos =====
const tableBody = document.getElementById("tableBody");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

// ===== Controle de Paginação =====
const PAGE_SIZE = 5;
let currentPage = 1;
let pageCursors = []; // guarda último doc de cada página
let firstDocs = [];   // guarda primeiro doc de cada página
let lastVisible = null;

// ===== Função: carregar página =====
async function loadPage(direction = "first") {
    tableBody.innerHTML = "<tr><td colspan='2'>Carregando...</td></tr>";
    let q;

    if (direction === "next" && lastVisible) {
        q = query(
            collection(db, "umidade"),
            orderBy("data", "desc"),
            startAfter(lastVisible),
            limit(PAGE_SIZE)
        );
        currentPage++;
    } else if (direction === "prev" && currentPage > 1) {
        currentPage--;
        const prevFirst = firstDocs[currentPage - 1];
        q = query(
            collection(db, "umidade"),
            orderBy("data", "desc"),
            startAt(prevFirst),
            limit(PAGE_SIZE)
        );
    } else {
        // Primeira página
        q = query(collection(db, "umidade"), orderBy("data", "desc"), limit(PAGE_SIZE));
        currentPage = 1;
        pageCursors = [];
        firstDocs = [];
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        tableBody.innerHTML = "<tr><td colspan='2'>Sem dados</td></tr>";
        nextBtn.disabled = true;
        prevBtn.disabled = currentPage === 1;
        pageInfo.textContent = `Página ${currentPage}`;
        return;
    }

    // Atualiza cursores
    const firstVisible = snapshot.docs[0];
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    pageCursors[currentPage - 1] = lastVisible;
    firstDocs[currentPage - 1] = firstVisible;

    renderTable(snapshot);

    // Atualiza UI
    pageInfo.textContent = `Página ${currentPage}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = snapshot.size < PAGE_SIZE;
}

// ===== Renderizar tabela =====
function renderTable(snapshot) {
    tableBody.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        const dataFormatada = data.data?.seconds
            ? new Date(data.data.seconds * 1000).toLocaleString("pt-BR")
            : data.data;
        tableBody.innerHTML += `
            <tr>
                <td>${dataFormatada || "-"}</td>
                <td>${data.umidade ?? "-"}%</td>
            </tr>
        `;
    });
}

// ===== Última leitura e status da planta =====
async function atualizarStatusPlanta() {
    try {
        const q = query(collection(db, "umidade"), orderBy("data", "desc"), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0].data();
            const umidade = doc.umidade;

            const moodEl = document.getElementById("plantMood");
            const textEl = document.getElementById("statusText");

            let emoji = "🪴";
            let texto = "Planta neutra";

            if (umidade >= 70) {
                emoji = "🌱";
                texto = "Planta feliz! Solo úmido 😄";
            } else if (umidade >= 40) {
                emoji = "🪴";
                texto = "Planta neutra. Solo moderado 🌤️";
            } else {
                emoji = "🥀";
                texto = "Planta triste... solo seco 😢";
            }

            moodEl.textContent = emoji;
            textEl.textContent = `${texto} (${umidade}%)`;
        } else {
            document.getElementById("statusText").textContent = "Sem dados disponíveis.";
        }
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        document.getElementById("statusText").textContent = "Erro ao carregar dados.";
    }
}

// ===== Importações RTDB =====
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-database.js";

// Inicializa o RTDB
const database = getDatabase(app);

// Referência para o campo da bomba
const bombaRef = ref(database, "controle/bomba");

// Botão de irrigação manual
document.getElementById("manualIrrigation").addEventListener("click", () => {
    // Define true no RTDB
    set(bombaRef, true)
        .then(() => {
            alert("Irrigação manual acionada!");
        })
        .catch((error) => {
            console.error("Erro ao acionar a bomba:", error);
            alert("Falha ao acionar a irrigação.");
        });
});


// ===== Eventos =====
nextBtn.addEventListener("click", () => loadPage("next"));
prevBtn.addEventListener("click", () => loadPage("prev"));

// ===== Inicial =====
loadPage();
atualizarStatusPlanta();
setInterval(atualizarStatusPlanta, 10000);
