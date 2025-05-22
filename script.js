const API_KEY = "AIzaSyDjz5igdlvwiNE1hBBIFq04Kbb7q0dthws";

const form = document.getElementById("form");
const resultado = document.getElementById("resultado");
const historicoContainer = document.getElementById("historico-container");
const historicoList = document.getElementById("historico");
const limparHistorico = document.getElementById("limparHistorico");
const btnDownload = document.getElementById("btnDownload");
const downloadContainer = document.getElementById("download-container");
const btnLimparResposta = document.getElementById("btnLimparResposta");
const botoesOpcoes = document.getElementById("botoes-opcoes");

window.onload = () => {
  // Ativa modo escuro automático conforme preferência do sistema
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  resultado.classList.remove("hidden");
  resultado.innerHTML = `
    <p class="text-green-600 dark:text-green-400 font-medium">
      👋 Oi! Eu sou o <strong>Luca</strong>, seu assistente de nutrição. Tudo bem com você? Como posso ajudar hoje?
    </p>`;
  renderizarHistorico();
};

function salvarPrompt(perfil) {
  const historico = JSON.parse(localStorage.getItem("prompts") || "[]");
  historico.unshift({ perfil, data: new Date().toLocaleString() });
  localStorage.setItem("prompts", JSON.stringify(historico));
  renderizarHistorico();
}

function renderizarHistorico() {
  const historico = JSON.parse(localStorage.getItem("prompts") || "[]");
  historicoList.innerHTML = "";

  if (historico.length === 0) {
    historicoContainer.classList.add("hidden");
    return;
  }

  historico.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("border-b", "pb-1", "border-gray-300", "dark:border-gray-600");
    li.innerHTML = `<span class="font-medium">🕒 ${item.data}</span><br><span>${sanitize(item.perfil)}</span>`;
    historicoList.appendChild(li);
  });

  historicoContainer.classList.remove("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const perfil = document.getElementById("perfil").value.trim();
  if (!perfil) return;

  resultado.classList.remove("hidden");
  resultado.innerHTML = `<p class='text-gray-500 dark:text-gray-300 animate-pulse'>🍳 Opa! Estou preparando um cardápio saudável pra você...</p>`;
  salvarPrompt(perfil);
  downloadContainer.classList.add("hidden");
  botoesOpcoes.classList.add("hidden");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Crie um cardápio saudável detalhado baseado no perfil: ${perfil}.
Formate a resposta com:
- Título para cada refeição (Ex: Café da Manhã ☕)
- Lista com alimentos
- Modo de preparo com subtítulo

Seja direto e bem organizado, como um nutricionista faria.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar um cardápio. 😕";

    const outputHTML = parseCardapio(output);

    resultado.innerHTML = `
      <h2 class="text-xl font-bold text-green-600 dark:text-green-400 mb-2 mt-4">✅ Aqui está o seu cardápio!</h2>
      <div id="conteudoCardapio" contenteditable="true" class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded-lg text-sm max-h-[60vh] overflow-y-auto text-gray-900 dark:text-gray-100 whitespace-pre-wrap">${outputHTML}</div>
    `;

    downloadContainer.classList.remove("hidden");
    botoesOpcoes.classList.remove("hidden");

  } catch (error) {
    resultado.innerHTML = `<p class='text-red-600 dark:text-red-400 mt-4'>⚠️ Opa! Deu erro ao gerar o cardápio. Tente de novo mais tarde.</p>`;
    console.error(error);
  }
});

btnDownload.addEventListener("click", () => {
  const conteudoDiv = document.getElementById("conteudoCardapio");
  const texto = conteudoDiv?.innerText || "";
  if (!texto) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 10;
  const maxLineWidth = 180;

  const lines = doc.splitTextToSize(texto, maxLineWidth);
  let y = margin;

  lines.forEach(line => {
    if (y > doc.internal.pageSize.height - 10) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 7;
  });

  doc.save("cardapio.pdf");
});

btnLimparResposta.addEventListener("click", () => {
  resultado.innerHTML = `
    <p class="text-green-600 dark:text-green-400 font-medium">
      👋 Oi! Eu sou o <strong>Luca</strong>. Prontinho! Se quiser, posso criar outro cardápio para você.
    </p>`;
  downloadContainer.classList.add("hidden");
  botoesOpcoes.classList.add("hidden");
});

limparHistorico.addEventListener("click", () => {
  localStorage.removeItem("prompts");
  historicoList.innerHTML = "";
  historicoContainer.classList.add("hidden");
});

function parseCardapio(texto) {
  const linhas = texto.split('\n');
  let html = '';
  let listaAberta = false;

  linhas.forEach(linha => {
    linha = linha.trim();
    if (!linha) return;

    if (/^[A-Za-zÀ-ú\s]+[☕🍽️🥗🍎🍽️]$/.test(linha)) {
      if (listaAberta) {
        html += '</ul>';
        listaAberta = false;
      }
      html += `<h3 class="text-lg font-semibold text-green-600 dark:text-green-400 mt-4 mb-2">${linha}</h3>`;
    }
    else if (linha.startsWith('-')) {
      if (!listaAberta) {
        html += '<ul class="list-disc list-inside mb-2">';
        listaAberta = true;
      }
      html += `<li>${linha.substring(1).trim()}</li>`;
    }
    else if (/modo de preparo[:]?/i.test(linha)) {
      if (listaAberta) {
        html += '</ul>';
        listaAberta = false;
      }
      html += `<h4 class="font-semibold mt-2 mb-1 text-green-700 dark:text-green-300">${linha}</h4>`;
    }
    else {
      if (listaAberta) {
        html += '</ul>';
        listaAberta = false;
      }
      html += `<p class="mb-2">${linha}</p>`;
    }
  });

  if (listaAberta) {
    html += '</ul>';
  }

  return html;
}

// Sanitiza texto simples (remove tags perigosas)
function sanitize(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
