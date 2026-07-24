// REMB ESTUDOS - MOTOR CENTRAL SPA, SELEÇÃO DE TEXTO, TAGS CUSTOMIZADAS E AGENTE PEDAGÓGICO DE CORREÇÃO COM GSAP

// ==========================================================================
// ESTADO GLOBAL E ESTRUTURA DO LOCALSTORAGE
// ==========================================================================
let questaoAtualFocoIndex = 0;
let questoesFiltradasFoco = [];
let timerInterval = null;
let timerSegundos = 0;
let timerPausado = false;

// Ferramenta de Caneta Ativa
let canetaAtiva = null; // null | 'yellow' | 'green' | 'blue' | 'pink' | 'eraser'

// Estado de progresso padrão (tagsCustomizadas incluído para evitar erros de leitura)
let progressoUsuario = {
    respondidas: {},     // { questionId: { selecionada: 'B', correta: true/false } }
    riscadas: {},        // { questionId: ['A', 'C', ...] }
    favoritas: [],       // [ questionId, ... ]
    anotacoes: {},       // { questionId: "minha nota pessoal" }
    comentariosForum: {},// { questionId: [ {usuario, data, texto} ] }
    baloesSalvos: {},    // { questionId: [ "texto do balao 1", ... ] }
    tagsCustomizadas: {} // { questionId: [ "minha tag", ... ] }
};

// Dados para o Modo Correção
let activePedagogicalSteps = [];
let activePedagogicalStepIdx = 0;
let activePedagogicalQuestionId = null;
let emModoCorrecao = false;

// Estado de Paginação leve (20 itens por página padrão)
const paginacaoEstadual = {
    sala: { paginaAtual: 1, itensPorPagina: 20 },
    laboratorio: { paginaAtual: 1, itensPorPagina: 20 },
    caderno: { paginaAtual: 1, itensPorPagina: 20 },
    favoritas: { paginaAtual: 1, itensPorPagina: 20 }
};

window.irParaPagina = function(key, pagina) {
    if (paginacaoEstadual[key]) {
        paginacaoEstadual[key].paginaAtual = pagina;
        atualizarVisualizacaoPaginada(key);
        // Scroll suave de volta para o topo da lista
        const containerId = key === 'sala' ? 'questoesContainer' : 
                            key === 'laboratorio' ? 'validacaoContainer' : 
                            key === 'caderno' ? 'errosContainer' : 'favoritasContainer';
        const elem = document.getElementById(containerId);
        if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
};

window.alterarItensPorPagina = function(key, quantidade) {
    if (paginacaoEstadual[key]) {
        paginacaoEstadual[key].itensPorPagina = parseInt(quantidade, 10);
        paginacaoEstadual[key].paginaAtual = 1;
        atualizarVisualizacaoPaginada(key);
    }
};

function atualizarVisualizacaoPaginada(key) {
    if (key === "sala") {
        aplicarFiltros();
    } else if (key === "laboratorio") {
        aplicarFiltrosVal();
    } else if (key === "caderno") {
        renderizarCadernoErros();
    } else if (key === "favoritas") {
        renderizarFavoritas();
    }
}

// Tags selecionadas para o filtro
let tagsFiltroAtivas = [];
let globalGhostTag = null; // Guarda a tag autocompletada ativa para o autocomplete inline

// Cores HSL correspondentes às canetas para o estilo de seleção
const coresSelecaoRGB = {
    'yellow': 'rgba(254, 240, 138, 0.65)',
    'green': 'rgba(187, 247, 208, 0.65)',
    'blue': 'rgba(191, 219, 254, 0.65)',
    'pink': 'rgba(251, 207, 232, 0.65)',
    'orange': 'rgba(254, 215, 170, 0.65)'
};


// Banco de dados Piloto MVP
const PILOT_METADATA = {
    "Q_1___100_questoes_ALUNO_2": {
        "tipo_resolucao": "timeline",
        "linha_tempo": [
            { "data": "Jan/2025", "titulo": "Compra de Produtos", "descricao": "Gastos da entidade com produtos de uso diário.", "cor": "orange" },
            { "data": "Fevereiro/2025", "titulo": "Reconhecimento Incorreto", "descricao": "Reconhecimento como despesa direta, em vez de ativo de almoxarifado (inconsistência de competência).", "cor": "pink" },
            { "data": "Dez/2025", "titulo": "Prestação de Contas", "descricao": "Prestação de contas e responsabilização afetadas pela omissão do ativo patrimonial.", "cor": "blue" }
        ],
        "conectores": [
            {
                "origem_word": "despesa",
                "destino_letra": "B",
                "destino_word": "material"
            }
        ],
        "termos_incorretos_alternativas": [
            {
                "letra": "A",
                "termo": "tempestiva",
                "justificativa": "Incorreto. A tempestividade refere-se a ter a informação disponível a tempo para influenciar decisões."
            },
            {
                "letra": "C",
                "termo": "comparável",
                "justificativa": "Incorreto. A comparabilidade permite aos usuários identificar semelhanças e diferenças entre itens."
            }
        ]
    },
    "Q_1___100_questoes_ALUNO_3": {
        "tipo_resolucao": "calculo",
        "calculo_passos": [
            "De acordo com o Art. 173, § 1º, II da Constituição Federal:",
            "\\[\\text{Estatais (Atividade Econômica)} \\Longrightarrow \\text{Regime das Empresas Privadas}\\]",
            "Isso inclui obrigações civis, comerciais, trabalhistas e tributárias:",
            "\\[\\text{Imunidade Tributária Recíproca} = \\text{Não Aplicável}\\]"
        ],
        "linha_tempo": [
            { "data": "Etapa 1", "titulo": "Autorização Legislativa", "descricao": "Lei específica institui/autoriza a criação da sociedade de economia mista.", "cor": "blue" },
            { "data": "Etapa 2", "titulo": "Livre Concorrência", "descricao": "A empresa atua no mercado em igualdade com a iniciativa privada.", "cor": "green" },
            { "data": "Regra Geral", "titulo": "Regime Privado", "descricao": "Sujeição integral aos direitos civis e obrigações tributárias comuns.", "cor": "orange" }
        ],
        "conectores": [
            {
                "origem_word": "economia mista",
                "destino_letra": "D",
                "destino_word": "sociedade de economia mista"
            }
        ],
        "termos_incorretos_alternativas": [
            {
                "letra": "A",
                "termo": "integralmente ao regime jurídico de direito público",
                "justificativa": "Errado. Sujeitam-se ao regime jurídico próprio das empresas privadas."
            }
        ]
    }
};

function obterQuestaoPorId(id) {
    let q = BANCO_QUESTOES.find(item => item.id === id);
    if (!q && typeof QUESTOES_CESPE_TRATADAS !== 'undefined') {
        q = QUESTOES_CESPE_TRATADAS.find(item => item.id === id);
    }
    
    if (q) {
        // Garantir que as questões do laboratório possuam a banca CESPE por padrão se não possuírem
        if (q.labId && !q.origem_questao) {
            q.origem_questao = { banca: "CESPE" };
        }
        
        // Aplicar dados de curação se existirem no progressoUsuario
        if (q.labId && progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[id]) {
            const curado = progressoUsuario.curacaoVal[id];
            q = {
                ...q,
                enunciado: curado.enunciado !== undefined ? curado.enunciado : q.enunciado,
                gabarito: curado.gabarito !== undefined ? curado.gabarito : q.gabarito,
                disciplina: curado.disciplina !== undefined ? curado.disciplina : q.disciplina,
                assunto: curado.assunto !== undefined ? curado.assunto : q.assunto
            };
            if (curado.banca !== undefined) {
                q.origem_questao = { ...q.origem_questao, banca: curado.banca };
            }
        }

        // Injetar dados do teste piloto MVP se existirem
        if (typeof PILOT_METADATA !== 'undefined' && PILOT_METADATA[id]) {
            q = {
                ...q,
                ...PILOT_METADATA[id]
            };
        }
    }
    return q;
}

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarConfiguracoesLocais();
    autoSemearTags(); // Adicionar tags dinâmicas nas questões
    iniciarCronometro();
    inicializarFiltros();
    inicializarTagsInput();
    inicializarArrastoHighlighter();
    navegarPara('dashboard'); // Abrir no dashboard (barra de canetas oculta inicialmente)
    configurarEventosTecladoFoco();
    configurarMarcadorTexto();
    aplicarGlowButtons(); // Aplicar micro-animações GSAP nos botões
    if (typeof atualizarContagemCuracaoHeader === 'function') {
        atualizarContagemCuracaoHeader();
    }
});

// Auto-semeia tags para teste com base em palavras-chave das questões
function autoSemearTags() {
    BANCO_QUESTOES.forEach((q, idx) => {
        q.tags = q.tags || [];
        const text = ((q.enunciado || '') + ' ' + (q.assunto || '') + ' ' + (q.disciplina || '')).toLowerCase();
        
        // Adiciona banca e ano como tags
        if (q.origem_questao?.banca) q.tags.push(q.origem_questao.banca.toLowerCase());
        if (q.origem_questao?.ano) q.tags.push(String(q.origem_questao.ano));
        
        // Tags temáticas
        if (text.includes("loa") || text.includes("orçamentária")) q.tags.push("loa", "orçamento");
        if (text.includes("improbidade") || text.includes("8.429")) q.tags.push("improbidade", "lei-seca");
        if (text.includes("tributo") || text.includes("imposto")) q.tags.push("tributário");
        if (text.includes("receita") || text.includes("despesa")) q.tags.push("mcasp", "contabilidade");
        if (text.includes("balanço") || text.includes("patrimonial")) q.tags.push("demonstrações");
        if (text.includes("princípio")) q.tags.push("princípios");
        
        if (idx % 8 === 0) q.tags.push("pegadinha");
        if (idx % 12 === 0) q.tags.push("jurisprudência");
        if (idx % 15 === 0) q.tags.push("2026");

        q.tags = [...new Set(q.tags)];
    });
}

// Carrega as configurações do LocalStorage
function carregarConfiguracoesLocais() {
    const dadosSalvos = localStorage.getItem("remb_estudos_progresso");
    if (dadosSalvos) {
        try {
            const parsed = JSON.parse(dadosSalvos);
            progressoUsuario = {
                respondidas: parsed.respondidas || {},
                riscadas: parsed.riscadas || {},
                favoritas: parsed.favoritas || [],
                anotacoes: parsed.anotacoes || {},
                comentariosForum: parsed.comentariosForum || {},
                baloesSalvos: parsed.baloesSalvos || {},
                tagsCustomizadas: parsed.tagsCustomizadas || {}
            };
        } catch (e) {
            console.error("Erro ao carregar dados do LocalStorage", e);
        }
    }

    const tempoSalvo = localStorage.getItem("remb_estudos_tempo");
    if (tempoSalvo) {
        timerSegundos = parseInt(tempoSalvo, 10) || 0;
        atualizarCronometroTela();
    }
    
    // Tema Claro/Escuro
    const temaSalvo = localStorage.getItem("remb_estudos_tema") || "light";
    document.documentElement.setAttribute("data-theme", temaSalvo);
    atualizarIconeTema(temaSalvo);
}

// Salva o progresso no LocalStorage e atualiza todas as telas
function salvarProgressoLocal() {
    localStorage.setItem("remb_estudos_progresso", JSON.stringify(progressoUsuario));
    atualizarEstatisticasDashboard();
    atualizarBadgesMenu();
}

// Micro-animações GSAP nos botões principais
function aplicarGlowButtons() {
    const mainBtns = document.querySelectorAll(".btn-primary, .menu-item");
    mainBtns.forEach(btn => {
        btn.addEventListener("mouseenter", () => {
            gsap.to(btn, { scale: 1.03, duration: 0.2, ease: "power1.out" });
        });
        btn.addEventListener("mouseleave", () => {
            gsap.to(btn, { scale: 1, duration: 0.2, ease: "power1.out" });
        });
    });
}

// ==========================================================================
// ROTEAMENTO SPA (Single Page Application)
// ==========================================================================
function navegarPara(sectionId) {
    fecharModoCorrecao();

    // Fechar menu mobile se estiver aberto
    const sidebar = document.querySelector(".app-sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar && sidebar.classList.contains("sidebar-open")) {
        sidebar.classList.remove("sidebar-open");
        if (backdrop) backdrop.classList.remove("active");
    }

    // Esconder todas as seções
    const sections = document.querySelectorAll(".content-section");
    sections.forEach(sec => sec.classList.remove("active"));
    
    // Mostrar a seção alvo
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) targetSection.classList.add("active");
    
    // Atualizar menu ativo na sidebar
    const menuButtons = document.querySelectorAll(".sidebar-menu .menu-item");
    menuButtons.forEach(btn => btn.classList.remove("active"));
    
    const activeBtn = document.getElementById(`btn-nav-${sectionId}`);
    if (activeBtn) activeBtn.classList.add("active");

    // Caneta de marcações: Mostrar somente na Sala de Questões
    const bar = document.getElementById("stickyHighlighterBar");
    if (bar) {
        if (sectionId === "questoes") {
            bar.style.display = "flex";
        } else {
            bar.style.display = "none";
        }
    }

    if (sectionId === 'dashboard') {
        atualizarEstatisticasDashboard();
    } else if (sectionId === 'questoes') {
        aplicarFiltros();
    } else if (sectionId === 'validacao') {
        inicializarFiltrosVal();
        aplicarFiltrosVal();
    } else if (sectionId === 'caderno-erros') {
        renderizarCadernoErros();
    } else if (sectionId === 'favoritas') {
        renderizarFavoritas();
    } else if (sectionId === 'minhas-notas') {
        renderizarMinhasNotas();
    }
    
    atualizarBadgesMenu();
    aplicarGlowButtons();
}

// Atualizar contadores vermelhos (badges) do menu lateral
function atualizarBadgesMenu() {
    let totalErros = 0;
    BANCO_QUESTOES.forEach(q => {
        const resp = progressoUsuario.respondidas[q.id];
        if (resp && !resp.correta) {
            totalErros++;
        }
    });
    
    const badgeErros = document.getElementById("badge-erros");
    if (badgeErros) {
        badgeErros.innerText = totalErros;
        badgeErros.style.display = totalErros > 0 ? "block" : "none";
    }

    const totalFavoritas = progressoUsuario.favoritas.length;
    const badgeFavoritas = document.getElementById("badge-favoritas");
    if (badgeFavoritas) {
        badgeFavoritas.innerText = totalFavoritas;
        badgeFavoritas.style.display = totalFavoritas > 0 ? "block" : "none";
    }
}

// ==========================================================================
// CRONÔMETRO
// ==========================================================================
function iniciarCronometro() {
    timerInterval = setInterval(() => {
        if (!timerPausado) {
            timerSegundos++;
            atualizarCronometroTela();
            localStorage.setItem("remb_estudos_tempo", timerSegundos);
        }
    }, 1000);
}

function atualizarCronometroTela() {
    const min = String(Math.floor(timerSegundos / 60)).padStart(2, '0');
    const seg = String(timerSegundos % 60).padStart(2, '0');
    const display = document.getElementById("timerDisplay");
    if (display) display.innerText = `${min}:${seg}`;
}

function toggleTimer() {
    timerPausado = !timerPausado;
    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.innerHTML = timerPausado ? "▶️" : "⏸️";
}

function resetTimer() {
    timerSegundos = 0;
    localStorage.setItem("remb_estudos_tempo", 0);
    atualizarCronometroTela();
}

// ==========================================================================
// FILTROS DINÂMICOS
// ==========================================================================
function inicializarFiltros() {
    const disciplinas = new Set();
    const assuntos = new Set();
    const listas = new Set();

    BANCO_QUESTOES.forEach(q => {
        if (q.disciplina) disciplinas.add(q.disciplina);
        if (q.assunto) assuntos.add(q.assunto);
        if (q.origem_importacao?.arquivo) listas.add(q.origem_importacao.arquivo);
    });

    const selectDisc = document.getElementById("filterDisciplina");
    if (selectDisc) {
        selectDisc.innerHTML = '<option value="todas">Todas as Disciplinas</option>';
        disciplinas.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.innerText = d;
            selectDisc.appendChild(opt);
        });
    }

    const selectAssunto = document.getElementById("filterAssunto");
    if (selectAssunto) {
        selectAssunto.innerHTML = '<option value="todos">Todos os Assuntos</option>';
        assuntos.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.innerText = a;
            selectAssunto.appendChild(opt);
        });
    }

    const selectLista = document.getElementById("filterListaOrigem");
    if (selectLista) {
        selectLista.innerHTML = '<option value="todas">Todas as Listas de Origem</option>';
        listas.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l;
            opt.innerText = l;
            selectLista.appendChild(opt);
        });
    }
}

// Filtra questões por disciplina, assunto, banca, lista de origem, status e tags do Tags-Input
function aplicarFiltros() {
    const disc = document.getElementById("filterDisciplina").value;
    const assunto = document.getElementById("filterAssunto").value;
    const banca = document.getElementById("filterBanca").value;
    const listaOrigem = document.getElementById("filterListaOrigem").value;
    const status = document.getElementById("filterStatus").value;

    const filtradas = BANCO_QUESTOES.filter(q => {
        if (disc !== "todas" && q.disciplina !== disc) return false;
        if (assunto !== "todos" && q.assunto !== assunto) return false;
        if (banca !== "todas" && q.origem_questao?.banca !== banca) return false;
        if (listaOrigem !== "todas" && q.origem_importacao?.arquivo !== listaOrigem) return false;
        
        const resp = progressoUsuario.respondidas[q.id];
        if (status === "nao_respondidas" && resp) return false;
        if (status === "acertadas" && (!resp || !resp.correta)) return false;
        if (status === "erradas" && (!resp || resp.correta)) return false;

        // Filtro por múltiplos blocos de tags ativos
        if (tagsFiltroAtivas.length > 0) {
            const tagsQuestao = [
                ...(q.tags || []),
                ...(progressoUsuario.tagsCustomizadas[q.id] || [])
            ].map(t => t.toLowerCase());

            const atendeTodasAsTags = tagsFiltroAtivas.every(tag => {
                const tagLower = tag.toLowerCase();
                // Busca especial por número da questão (ex: "Questão 1")
                if (tagLower.startsWith("questão ")) {
                    const num = tagLower.replace("questão ", "").trim();
                    return String(q.numero) === num;
                }
                return tagsQuestao.some(qTag => qTag.includes(tagLower)) ||
                       (q.disciplina || "").toLowerCase().includes(tagLower) ||
                       (q.assunto || "").toLowerCase().includes(tagLower) ||
                       (q.origem_questao?.banca || "").toLowerCase().includes(tagLower);
            });
            if (!atendeTodasAsTags) return false;
        }

        return true;
    });

    const container = document.getElementById("questoesContainer");
    renderizarListaQuestoes(filtradas, container, false, "sala");
}

// Roteia a renderização de listas genéricas
function renderizarListaQuestoes(lista, container, isFoco = false, key = "sala") {
    if (!container) return;
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary); width: 100%;">
                <p>Nenhuma questão encontrada com os filtros selecionados.</p>
            </div>
        `;
        return;
    }

    // Inicializar estado de paginação se não existir para a chave
    if (!paginacaoEstadual[key]) {
        paginacaoEstadual[key] = { paginaAtual: 1, itensPorPagina: 20 };
    }
    const config = paginacaoEstadual[key];
    const totalItens = lista.length;
    const totalPaginas = Math.ceil(totalItens / config.itensPorPagina) || 1;

    // Resetar para página 1 caso mude o filtro e a página atual fique órfã
    if (config.paginaAtual > totalPaginas) {
        config.paginaAtual = 1;
    }

    // Fatiar a lista para renderizar apenas a página ativa
    const inicio = (config.paginaAtual - 1) * config.itensPorPagina;
    const fim = inicio + config.itensPorPagina;
    const itensPagina = lista.slice(inicio, fim);

    // Renderizar os itens fatiados
    itensPagina.forEach(q => {
        const card = criarQuestaoCard(q, isFoco);
        container.appendChild(card);
    });

    // Adicionar os controles de paginação
    const pagDiv = document.createElement("div");
    pagDiv.className = "pagination-controls";
    pagDiv.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; margin-top:20px; width:100%; padding:15px 0; border-top:1px solid var(--border);">
            <button class="btn-pag" ${config.paginaAtual === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="irParaPagina('${key}', 1)">«</button>
            <button class="btn-pag" ${config.paginaAtual === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="irParaPagina('${key}', ${config.paginaAtual - 1})">Anterior</button>
            <span class="pag-info" style="font-size:0.9rem; color:var(--text-primary); font-weight:600;">
                Página <strong>${config.paginaAtual}</strong> de <strong>${totalPaginas}</strong> 
                <span style="font-weight:normal; color:var(--text-secondary); margin-left:5px;">(${totalItens} itens)</span>
            </span>
            <button class="btn-pag" ${config.paginaAtual === totalPaginas ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="irParaPagina('${key}', ${config.paginaAtual + 1})">Próxima</button>
            <button class="btn-pag" ${config.paginaAtual === totalPaginas ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="irParaPagina('${key}', ${totalPaginas})">»</button>
            
            <select class="select-itens-pagina" onchange="alterarItensPorPagina('${key}', this.value)" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background-color: var(--bg-card); color: var(--text-primary); cursor:pointer; font-size:0.85rem;">
                <option value="10" ${config.itensPorPagina === 10 ? 'selected' : ''}>10 / pág</option>
                <option value="20" ${config.itensPorPagina === 20 ? 'selected' : ''}>20 / pág</option>
                <option value="50" ${config.itensPorPagina === 50 ? 'selected' : ''}>50 / pág</option>
                <option value="100" ${config.itensPorPagina === 100 ? 'selected' : ''}>100 / pág</option>
            </select>
        </div>
    `;
    container.appendChild(pagDiv);

    aplicarGlowButtons();
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise();
    }
}

// ==========================================================================
// CONSTRUÇÃO E LÓGICA DO CARD DE QUESTÃO (INCLUI X TAXATIVO E TAGS DO USUÁRIO)
// ==========================================================================
function criarQuestaoCard(q, isModoFoco = false) {
    const card = document.createElement("div");
    card.className = "questao-card";
    const prefixId = isModoFoco ? "foco-card" : "card";
    card.id = `${prefixId}-${q.id}`;

    // Aplicar dados curados do localStorage se existirem
    if (q.labId && progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[q.id]) {
        const curado = progressoUsuario.curacaoVal[q.id];
        q = {
            ...q,
            enunciado: curado.enunciado !== undefined ? curado.enunciado : q.enunciado,
            gabarito: curado.gabarito !== undefined ? curado.gabarito : q.gabarito,
            disciplina: curado.disciplina !== undefined ? curado.disciplina : q.disciplina,
            assunto: curado.assunto !== undefined ? curado.assunto : q.assunto
        };
        if (curado.banca !== undefined) {
            q.origem_questao = { ...q.origem_questao, banca: curado.banca };
        }
    } else if (q.labId && !q.origem_questao) {
        q.origem_questao = { banca: "CESPE" };
    }

    const isAprovada = q.labId && progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[q.id]?.aprovada;
    if (isAprovada) {
        card.style.border = "2px solid var(--correta)";
        card.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.2)";
    }

    if (questaoEmEdicaoId === q.id) {
        card.innerHTML = `
            <div class="questao-header">
                <h2>Editar Questão ${q.labId}</h2>
            </div>
            <div style="padding: 15px; display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">Enunciado:</label>
                    <textarea id="edit-enunciado-${q.id}" style="width:100%; min-height:120px; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-family:inherit; font-size:0.95rem; resize:vertical;">${q.enunciado}</textarea>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:15px;">
                    <div style="flex:1; min-width:120px;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">Gabarito:</label>
                        <select id="edit-gabarito-${q.id}" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); cursor:pointer;">
                            <option value="" ${q.gabarito === "" ? "selected" : ""}>Sem Gabarito (null)</option>
                            <option value="C" ${q.gabarito === "C" ? "selected" : ""}>Certo (C)</option>
                            <option value="E" ${q.gabarito === "E" ? "selected" : ""}>Errado (E)</option>
                        </select>
                    </div>
                    <div style="flex:1; min-width:120px;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">Banca:</label>
                        <input type="text" id="edit-banca-${q.id}" value="${q.origem_questao?.banca || 'CESPE'}" placeholder="Ex: CESPE" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary);">
                    </div>
                    <div style="flex:1; min-width:150px;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">Disciplina:</label>
                        <input type="text" id="edit-disciplina-${q.id}" value="${q.disciplina || ''}" placeholder="Ex: Direito Administrativo" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary);">
                    </div>
                    <div style="flex:1; min-width:150px;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px; color:var(--text-secondary);">Assunto:</label>
                        <input type="text" id="edit-assunto-${q.id}" value="${q.assunto || ''}" placeholder="Ex: Atos Administrativos" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary);">
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button class="btn-pag" onclick="cancelarEdicaoQuestao('${q.id}')">Cancelar</button>
                    <button class="btn-pag" onclick="salvarEdicaoQuestao('${q.id}')" style="background-color:var(--accent); color:#fff; border-color:var(--accent);">Salvar</button>
                </div>
            </div>
        `;
        return card;
    }

    const respondida = progressoUsuario.respondidas[q.id];
    const isFavorita = progressoUsuario.favoritas.includes(q.id);
    const alternativasRiscadas = progressoUsuario.riscadas[q.id] || [];

    // Mesclar tags pré-definidas com as customizadas do usuário
    const tagsQuestao = [
        ...(q.tags || []),
        ...(progressoUsuario.tagsCustomizadas[q.id] || [])
    ];

    // Tags visualizadas no topo com botão + Tag
    let tagsHTML = `<div style="margin-top: 8px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">`;
    tagsQuestao.forEach(t => {
        const isCustom = (progressoUsuario.tagsCustomizadas[q.id] || []).includes(t);
        if (isCustom) {
            tagsHTML += `
                <span class="custom-tag-badge" style="font-size:0.65rem; background-color:var(--accent-light); color:var(--accent); padding:2px 8px; border-radius:4px; font-weight:600; border: 1px solid var(--border); display:inline-flex; align-items:center; gap:4px;">
                    #${t}
                    <span onclick="removerTagUsuario('${q.id}', '${t}')" style="cursor:pointer; font-weight:bold; color:var(--errada); font-size:0.8rem; line-height:1; display:inline-block;" title="Excluir tag">×</span>
                </span>
            `;
        } else {
            tagsHTML += `<span style="font-size:0.65rem; background-color:var(--bg-card); color:var(--text-secondary); padding:2px 8px; border-radius:4px; font-weight:600; border: 1px solid var(--border);">#${t}</span>`;
        }
    });
    
    // Elementos de inserção de tags do usuário
    tagsHTML += `
        <button class="btn-add-tag-trigger" id="btn-tag-trigger-${q.id}" onclick="mostrarInputTag('${q.id}')">+ Tag</button>
        <input type="text" class="input-add-tag" id="input-tag-${q.id}" onkeydown="checkAddTag(event, '${q.id}')" onblur="ocultarInputTag('${q.id}')" style="display:none;">
    `;
    tagsHTML += `</div>`;

    // Metadados badges
    let labBadgeHTML = "";
    if (q.labId) {
        const fileNames = q.origens ? q.origens.join(', ') : (q.origem_importacao?.arquivo || '');
        labBadgeHTML = `<span class="meta-badge" style="background-color: var(--accent-light); color: var(--accent); font-weight: 700; border: none;">Questão ${q.origem_importacao?.numero_original || q.numero} - Lista: ${fileNames}</span>`;
    }

    let aprovadaBadgeHTML = "";
    if (isAprovada) {
        aprovadaBadgeHTML = `<span class="meta-badge" style="background-color: var(--correta-light); color: var(--correta); font-weight: 700; border: 1px solid var(--correta);">✓ Consistente</span>`;
    }

    let metaHTML = `
        <div class="questao-meta">
            <span class="meta-badge banca">${q.origem_questao?.banca || "FGV"}</span>
            ${q.disciplina ? `<span class="meta-badge">${q.disciplina}</span>` : ""}
            ${q.assunto ? `<span class="meta-badge">${q.assunto}</span>` : ""}
            ${labBadgeHTML}
            ${aprovadaBadgeHTML}
            ${respondida ? `<span class="meta-badge ${respondida.correta ? 'banca' : 'errada'}">${respondida.correta ? '🟢 Correta' : '🔴 Errada'}</span>` : ""}
        </div>
        ${tagsHTML}
    `;

    // Botões de favoritos
    let headerActionsHTML = `
        <div class="card-header-actions">
            <button class="btn-favoritar" onclick="toggleFavorito('${q.id}')" title="Favoritar questão">
                ${isFavorita ? "⭐" : "☆"}
            </button>
        </div>
    `;

    // Cabeçalho
    const titleText = q.labId ? `Identificação: ${q.labId}` : `Questão ${q.numero}`;
    const headerHTML = `
        <div class="questao-header">
            <h2>${titleText}</h2>
        </div>
    `;

    // Enunciado
    let enunciadoTexto = q.enunciado;
    if (q.conectores) {
        q.conectores.forEach((c, idx) => {
            const escapedWord = c.origem_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            enunciadoTexto = enunciadoTexto.replace(regex, `<span class="connector-origin" id="conn-origin-${q.id}-${idx}" data-idx="${idx}" style="cursor: pointer; font-weight: 700; border-bottom: 2px dotted var(--accent);">$1</span>`);
        });
    }

    const enunciadoHTML = `
        <div class="enunciado-texto">${enunciadoTexto}</div>
    `;

    // Alternativas
    let alternativasHTML = `<div class="alternativas-container" style="position:relative;">`;
    if (q.conectores) {
        alternativasHTML += `<svg class="keyword-connector-overlay" id="connector-svg-${q.id}"></svg>`;
    }

    q.alternativas.forEach(alt => {
        let classes = "alternativa-item";
        const isTachada = alternativasRiscadas.includes(alt.letra);
        if (isTachada) classes += " tachada";
        
        if (respondida) {
            if (alt.letra === q.gabarito) {
                classes += " correta";
            } else if (respondida.selecionada === alt.letra) {
                classes += " incorreta";
            }
        }

        let textoAlternativa = alt.texto;
        if (respondida && q.termos_incorretos_alternativas) {
            const regrasTachar = q.termos_incorretos_alternativas.filter(r => r.letra === alt.letra);
            regrasTachar.forEach(regra => {
                const escapedTerm = regra.termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedTerm})`, 'gi');
                textoAlternativa = textoAlternativa.replace(regex, `<span class="termo-erro-tachado" data-tooltip="${regra.justificativa}">$1</span>`);
            });
        }

        if (q.conectores) {
            q.conectores.forEach((c, idx) => {
                if (c.destino_letra === alt.letra) {
                    const escapedDest = c.destino_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedDest})`, 'gi');
                    textoAlternativa = textoAlternativa.replace(regex, `<span class="connector-dest" id="conn-dest-${q.id}-${idx}">$1</span>`);
                }
            });
        }

        alternativasHTML += `
            <div class="${classes}" data-letra="${alt.letra}">
                <div class="alternativa-letter">${alt.letra}</div>
                <div class="alternativa-texto">${textoAlternativa}</div>
                ${!respondida ? `
                    <button class="btn-eliminar" onclick="riscarAlternativa(event, '${q.id}', '${alt.letra}')" title="x taxativo">
                        ${isTachada ? '👁️' : '✖'}
                    </button>
                ` : ''}
            </div>
        `;
    });
    alternativasHTML += `</div>`;

    // Rodapé de Ações
    let footerHTML = "";
    if (!respondida) {
        footerHTML = `
            <div class="questao-footer">
                ${!isModoFoco ? `
                    <button class="btn-secundario" onclick="entrarModoFoco('${q.id}')">
                        🔍 Modo Foco
                    </button>
                ` : '<div></div>'}
                <button class="btn-primary" onclick="responderQuestao('${q.id}')">
                    ✔️ Responder
                </button>
            </div>
        `;
    } else {
        footerHTML = `
            <div class="questao-footer" style="border: none; padding-top: 0;">
                ${!isModoFoco ? `
                    <button class="btn-secundario" onclick="entrarModoFoco('${q.id}')">
                        🔍 Modo Foco
                    </button>
                ` : '<div></div>'}
                <div style="display:flex; gap: 10px; align-items:center;">
                    <button class="btn btn-outline-primary btn-sm" onclick="iniciarCorrecaoPedagogica('${q.id}')" style="border-radius:8px; font-weight:600;">
                        🎓 Correção Interativa
                    </button>
                    <span class="meta-badge" style="background-color: var(--accent-light); color: var(--accent); font-weight: 700; border: none; padding: 8px 16px;">
                        Resolução Concluída
                    </span>
                </div>
            </div>
        `;
    }

    let posResolucaoHTML = "";
    if (respondida) {
        posResolucaoHTML = criarBlocoPosResolucao(q);
    }

    let curacaoFooterHTML = "";
    if (q.labId) {
        curacaoFooterHTML = `
            <div class="curacao-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px; padding-top:12px; border-top:1px dashed var(--border);">
                <button class="btn-pag" onclick="alternarAprovacaoQuestao('${q.id}')" style="margin-right:auto; border-color:${isAprovada ? 'var(--correta)' : 'var(--border)'}; background-color:${isAprovada ? 'var(--correta-light)' : 'transparent'}; color:${isAprovada ? 'var(--correta)' : 'var(--text-secondary)'};">
                    ${isAprovada ? '✓ Consistente' : '◯ Marcar Consistente'}
                </button>
                <button class="btn-pag" onclick="editarQuestaoInline('${q.id}')">
                    🛠️ Editar
                </button>
            </div>
        `;
    }

    card.innerHTML = metaHTML + headerActionsHTML + headerHTML + enunciadoHTML + alternativasHTML + footerHTML + posResolucaoHTML + curacaoFooterHTML;

    // Vincular eventos de clique e animações 3D às alternativas (GSAP)
    const items = card.querySelectorAll(".alternativa-item");
    items.forEach(item => {
        item.addEventListener("mousedown", (e) => {
            if (e.target.closest(".btn-eliminar")) return;
            if (item.classList.contains("tachada")) return;
            
            // Animação 3D de clique (botão pressionado)
            gsap.to(item, { scale: 0.97, y: 2, duration: 0.1, ease: "power1.out" });
        });

        item.addEventListener("mouseup", (e) => {
            if (e.target.closest(".btn-eliminar")) return;
            if (item.classList.contains("tachada")) return;
            
            // Retorna ao tamanho normal com elasticidade
            gsap.to(item, { scale: 1, y: 0, duration: 0.2, ease: "back.out(1.7)" });

            if (!respondida) {
                items.forEach(i => i.classList.remove("selecionada"));
                item.classList.add("selecionada");
            }
        });
    });

    if (q.conectores) {
        setTimeout(() => {
            const origins = card.querySelectorAll(".connector-origin");
            origins.forEach(el => {
                const idx = el.getAttribute("data-idx");
                el.addEventListener("mouseenter", () => window.desenharConexao(q.id, idx));
                el.addEventListener("mouseleave", () => window.limparConexao(q.id, idx));
            });
        }, 150);
    }

    return card;
}

// Lógica para mostrar/ocultar campos de inserção de tag customizada
function mostrarInputTag(qId) {
    document.getElementById(`btn-tag-trigger-${qId}`).style.display = "none";
    const input = document.getElementById(`input-tag-${qId}`);
    input.style.display = "inline-block";
    input.focus();
}

function ocultarInputTag(qId) {
    setTimeout(() => {
        const input = document.getElementById(`input-tag-${qId}`);
        if (input) {
            input.style.display = "none";
            input.value = "";
        }
        const trigger = document.getElementById(`btn-tag-trigger-${qId}`);
        if (trigger) trigger.style.display = "inline-block";
    }, 200);
}

function checkAddTag(event, qId) {
    if (event.key === "Enter") {
        const input = document.getElementById(`input-tag-${qId}`);
        const text = input.value.trim().toLowerCase();
        
        if (text) {
            if (!progressoUsuario.tagsCustomizadas[qId]) {
                progressoUsuario.tagsCustomizadas[qId] = [];
            }
            if (!progressoUsuario.tagsCustomizadas[qId].includes(text)) {
                progressoUsuario.tagsCustomizadas[qId].push(text);
                salvarProgressoLocal();
                
                // Re-renderizar o card correspondente para mostrar a nova tag
                const qObj = obterQuestaoPorId(qId);
                const card = document.getElementById(`card-${qId}`);
                if (card) {
                    const newCard = criarQuestaoCard(qObj, false);
                    card.replaceWith(newCard);
                }
                
                const focoCard = document.getElementById(`foco-card-${qId}`);
                if (focoCard) {
                    const newFoco = criarQuestaoCard(qObj, true);
                    focoCard.replaceWith(newFoco);
                }
            }
        }
        ocultarInputTag(qId);
    }
}

function removerTagUsuario(qId, tag) {
    if (progressoUsuario.tagsCustomizadas[qId]) {
        progressoUsuario.tagsCustomizadas[qId] = progressoUsuario.tagsCustomizadas[qId].filter(t => t !== tag);
        if (progressoUsuario.tagsCustomizadas[qId].length === 0) {
            delete progressoUsuario.tagsCustomizadas[qId];
        }
        salvarProgressoLocal();
        
        // Re-renderizar o card correspondente de forma dinâmica no DOM
        const qObj = obterQuestaoPorId(qId);
        const card = document.getElementById(`card-${qId}`);
        if (card) {
            const newCard = criarQuestaoCard(qObj, false);
            card.replaceWith(newCard);
        }
        
        const focoCard = document.getElementById(`foco-card-${qId}`);
        if (focoCard) {
            const newFoco = criarQuestaoCard(qObj, true);
            focoCard.replaceWith(newFoco);
        }
    }
}
window.removerTagUsuario = removerTagUsuario;

// Lógica de Riscar/Tachar alternativa (x taxativo com GSAP)
function riscarAlternativa(event, questionId, letra) {
    if (event) event.stopPropagation();
    if (progressoUsuario.respondidas[questionId]) return;

    if (!progressoUsuario.riscadas[questionId]) {
        progressoUsuario.riscadas[questionId] = [];
    }

    const idx = progressoUsuario.riscadas[questionId].indexOf(letra);
    const riscar = (idx === -1);

    if (riscar) {
        progressoUsuario.riscadas[questionId].push(letra);
    } else {
        progressoUsuario.riscadas[questionId].splice(idx, 1);
    }

    salvarProgressoLocal();

    const ids = [`card-${questionId}`, `foco-card-${questionId}`];
    ids.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            const item = card.querySelector(`.alternativa-item[data-letra="${letra}"]`);
            if (item) {
                if (riscar) {
                    item.classList.add("tachada");
                    const btnX = item.querySelector(".btn-eliminar");
                    if (btnX) btnX.innerHTML = "👁️";
                    
                    // Animação GSAP: Balanço horizontal de negação + esvanecimento
                    gsap.fromTo(item, 
                        { x: -5 }, 
                        { x: 0, duration: 0.35, ease: "rough({template: none, strength: 2, points: 5, taper: none, randomize: true})", clearProps: "x" }
                    );
                    gsap.to(item, { opacity: 0.35, duration: 0.3 });
                    item.classList.remove("selecionada");
                } else {
                    item.classList.remove("tachada");
                    const btnX = item.querySelector(".btn-eliminar");
                    if (btnX) btnX.innerHTML = "✖";
                    gsap.to(item, { opacity: 1, duration: 0.2 });
                }
            }
        }
    });
}

// Alternar status de favorita
function toggleFavorito(questionId) {
    const idx = progressoUsuario.favoritas.indexOf(questionId);
    if (idx > -1) {
        progressoUsuario.favoritas.splice(idx, 1);
    } else {
        progressoUsuario.favoritas.push(questionId);
    }
    
    salvarProgressoLocal();

    const cards = document.querySelectorAll(`[id$="-card-${questionId}"]`);
    cards.forEach(card => {
        const btn = card.querySelector(".btn-favoritar");
        if (btn) {
            btn.innerHTML = progressoUsuario.favoritas.includes(questionId) ? "⭐" : "☆";
        }
    });

    const activeSection = document.querySelector(".content-section.active");
    if (activeSection && activeSection.id === "section-favoritas") {
        renderizarFavoritas();
    }
}

// Responde a questão
function responderQuestao(questionId) {
    const activeSection = document.querySelector(".content-section.active");
    let containerEl = activeSection ? activeSection.querySelector(`[id$="-card-${questionId}"]`) : null;
    
    if (!containerEl) {
        containerEl = document.getElementById(`foco-card-${questionId}`) || document.getElementById(`card-${questionId}`);
    }

    if (!containerEl) return;

    const selecionadaEl = containerEl.querySelector(".alternativa-item.selecionada");
    if (!selecionadaEl) {
        alert("Selecione uma alternativa antes de responder!");
        return;
    }

    const letraSelecionada = selecionadaEl.getAttribute("data-letra");
    const qObj = obterQuestaoPorId(questionId);
    const correta = (letraSelecionada === qObj.gabarito);

    // Efeito de pulso GSAP no botão de responder
    const btnResp = containerEl.querySelector(".btn-primary");
    if (btnResp) {
        gsap.to(btnResp, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
    }

    progressoUsuario.respondidas[questionId] = {
        selecionada: letraSelecionada,
        correta: correta
    };

    salvarProgressoLocal();

    const mainCard = document.getElementById(`card-${questionId}`);
    if (mainCard) {
        const newCard = criarQuestaoCard(qObj, false);
        mainCard.replaceWith(newCard);
    }

    const focoCard = document.getElementById(`foco-card-${questionId}`);
    if (focoCard) {
        const newFocoCard = criarQuestaoCard(qObj, true);
        focoCard.replaceWith(newFocoCard);
    }

    atualizarBadgesMenu();
}

// ==========================================================================
// BLOCO PÓS-RESOLUÇÃO (TABS)
// ==========================================================================
function criarBlocoPosResolucao(q) {
    const totalComentarios = (q.comentarios_alunos?.length || 0) + (progressoUsuario.comentariosForum[q.id]?.length || 0);
    const anotacaoSalva = progressoUsuario.anotacoes[q.id] || "";

    let calculoHTML = "";
    if (q.calculo_passos) {
        calculoHTML = `
            <div class="quadro-calculo-container">
                <div class="quadro-calculo-title">📐 Quadro de Resolução Matemática</div>
                <div style="font-family: inherit; font-size: 0.92rem; display: flex; flex-direction: column; gap: 8px; color: var(--text-primary);">
                    ${q.calculo_passos.map(step => `<div>${step}</div>`).join('')}
                </div>
            </div>
        `;
    }

    let timelineHTML = "";
    if (q.linha_tempo) {
        timelineHTML = `
            <div class="timeline-wrapper">
                ${q.linha_tempo.map(node => `
                    <div class="timeline-node ${node.cor || 'blue'}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-date">${node.data}</div>
                        <div class="timeline-content-title">${node.titulo}</div>
                        <div class="timeline-desc">${node.descricao}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let html = `
        <div class="pos-resolucao-container">
            <div class="pos-tabs">
                <button class="tab-btn ativo" onclick="alternarTab(event, 'prof-${q.id}')">👨‍🏫 Explicação</button>
                <button class="tab-btn" onclick="alternarTab(event, 'fontes-${q.id}')">📜 Base Legal</button>
                ${q.mnemonico ? `<button class="tab-btn" onclick="alternarTab(event, 'mnem-${q.id}')">💡 Mnemônico</button>` : ""}
                <button class="tab-btn" onclick="alternarTab(event, 'forum-${q.id}')">💬 Fórum (${totalComentarios})</button>
                <button class="tab-btn" onclick="alternarTab(event, 'notas-${q.id}')">✏️ Minhas Notas</button>
            </div>
            
            <div id="prof-${q.id}" class="pos-content-panel ativo">
                <div class="markdown-body">
                    ${calculoHTML}
                    ${timelineHTML}
                    ${renderizarMarkdown(q.comentarios_professor || "Ainda sem explicações do professor para esta questão.")}
                </div>
            </div>
            
            <div id="fontes-${q.id}" class="pos-content-panel">
                <div class="markdown-body">
                    ${renderizarMarkdown(q.fonte_resposta || "Sem normas ou artigos específicos vinculados.")}
                </div>
            </div>
            
            ${q.mnemonico ? `
                <div id="mnem-${q.id}" class="pos-content-panel">
                    <div class="mnemonico-box markdown-body">
                        ${renderizarMarkdown(q.mnemonico)}
                    </div>
                </div>
            ` : ""}
            
            <div id="forum-${q.id}" class="pos-content-panel">
                <div class="forum-comentarios" id="lista-forum-${q.id}">
                    ${obterComentariosForumHTML(q)}
                </div>
                <div class="novo-comentario-box">
                    <textarea id="texto-comentario-${q.id}" placeholder="Deixe um comentário..."></textarea>
                    <button class="btn-primary" style="padding: 8px 16px; font-size: 0.85rem;" onclick="enviarComentarioForum('${q.id}')">
                        Postar no Fórum
                    </button>
                </div>
            </div>

            <div id="notas-${q.id}" class="pos-content-panel">
                <div class="novo-comentario-box">
                    <textarea id="texto-notas-${q.id}" oninput="salvarNotaEstudo(event, '${q.id}', this.value)" placeholder="Escreva aqui suas anotações pessoais...">${anotacaoSalva}</textarea>
                    <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">Salvo automaticamente ao digitar.</p>
                </div>
            </div>
        </div>
    `;
    return html;
}

function alternarTab(event, panelId) {
    const tabBtn = event.currentTarget;
    const tabsContainer = tabBtn.closest(".pos-tabs");
    const container = tabsContainer.closest(".pos-resolucao-container");
    
    tabsContainer.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("ativo"));
    container.querySelectorAll(".pos-content-panel").forEach(panel => {
        panel.classList.remove("ativo");
    });
    
    tabBtn.classList.add("ativo");
    const target = document.getElementById(panelId);
    if (target) {
        target.classList.add("ativo");
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise([target]);
        }
    }
}

function salvarNotaEstudo(event, questionId, valor) {
    progressoUsuario.anotacoes[questionId] = valor;
    localStorage.setItem("remb_estudos_progresso", JSON.stringify(progressoUsuario));
}

function enviarComentarioForum(questionId) {
    const textarea = document.getElementById(`texto-comentario-${questionId}`);
    const texto = textarea.value.trim();
    
    if (!texto) {
        alert("Digite algo para postar no fórum!");
        return;
    }
    
    if (!progressoUsuario.comentariosForum[questionId]) {
        progressoUsuario.comentariosForum[questionId] = [];
    }
    
    const novoCom = {
        usuario: "Você (Estudante)",
        data: "Agora mesmo",
        texto: texto
    };
    
    progressoUsuario.comentariosForum[questionId].push(novoCom);
    salvarProgressoLocal();
    
    textarea.value = "";
    const qObj = obterQuestaoPorId(questionId);
    
    const forumList = document.getElementById(`lista-forum-${questionId}`);
    if (forumList) forumList.innerHTML = obterComentariosForumHTML(qObj);
}

function obterComentariosForumHTML(q) {
    const originais = q.comentarios_alunos || [];
    const usuarios = progressoUsuario.comentariosForum[q.id] || [];
    const todos = [...originais, ...usuarios];
    
    if (todos.length === 0) {
        return `<p style="font-size: 0.9rem; color: var(--text-secondary); text-align: center; padding: 15px 0;">Sem comentários.</p>`;
    }
    
    let html = "";
    todos.forEach(com => {
        html += `
            <div class="comentario-item">
                <div class="comentario-meta">
                    <span class="comentario-autor">${com.usuario}</span>
                    <span>${com.data}</span>
                </div>
                <div class="comentario-texto">${com.texto}</div>
            </div>
        `;
    });
    return html;
}

function renderizarMarkdown(texto) {
    if (!texto) return "";
    let html = texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^>\s?(.*?)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^\s*-\s?(.*?)$/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
        
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    return html;
}

// ==========================================================================
// SEÇÃO 3: CADERNO DE ERROS
// ==========================================================================
function renderizarCadernoErros() {
    const container = document.getElementById("cadernoErrosContainer");
    if (!container) return;

    const erradas = BANCO_QUESTOES.filter(q => {
        const resp = progressoUsuario.respondidas[q.id];
        return resp && !resp.correta;
    });

    renderizarListaQuestoes(erradas, container, false, "caderno");
}

// ==========================================================================
// SEÇÃO 4: FAVORITAS
// ==========================================================================
function renderizarFavoritas() {
    const container = document.getElementById("favoritasContainer");
    if (!container) return;

    const favoritas = BANCO_QUESTOES.filter(q => {
        return progressoUsuario.favoritas.includes(q.id);
    });

    renderizarListaQuestoes(favoritas, container, false, "favoritas");
}

// ==========================================================================
// SEÇÃO 5: MINHAS NOTAS & BALÕES SALVOS
// ==========================================================================
function renderizarMinhasNotas() {
    const container = document.getElementById("minhasNotasContainer");
    if (!container) return;
    container.innerHTML = "";

    const idsComNotas = new Set([
        ...Object.keys(progressoUsuario.anotacoes).filter(id => progressoUsuario.anotacoes[id]?.trim().length > 0),
        ...Object.keys(progressoUsuario.baloesSalvos).filter(id => progressoUsuario.baloesSalvos[id]?.length > 0)
    ]);

    if (idsComNotas.size === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-secondary">
                <p>Nenhuma nota ou balão explicativo salvo ainda. Clique em "Salvar Nota" dentro dos balões de correção interativa ou digite anotações nas abas das questões.</p>
            </div>
        `;
        return;
    }

    idsComNotas.forEach(qId => {
        const qObj = obterQuestaoPorId(qId);
        if (!qObj) return;

        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";

        const textNota = progressoUsuario.anotacoes[qId] || "";
        const baloes = progressoUsuario.baloesSalvos[qId] || [];

        let baloesHTML = "";
        if (baloes.length > 0) {
            baloesHTML = `
                <div class="nota-card-saved-balloons">
                    <h5>💬 Balões Explicativos Salvos:</h5>
                    ${baloes.map((bal, idx) => `
                        <div class="saved-balloon-item">
                            <button class="btn-remover-nota-balao" onclick="removerBalaoNota('${qId}', ${idx})">✕</button>
                            <p class="m-0">${renderizarMarkdown(bal)}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        col.innerHTML = `
            <div class="nota-item-card">
                <div>
                    <div class="nota-card-header">
                        <div>
                            <div class="nota-card-title">Questão ${qObj.numero}</div>
                            <div class="nota-card-meta">${qObj.disciplina}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary" onclick="irParaQuestaoID('${qId}')">Ver Questão</button>
                    </div>
                    <div class="nota-card-body">
                        <textarea oninput="salvarNotaEstudo(null, '${qId}', this.value)" placeholder="Minhas anotações sobre esta questão...">${textNota}</textarea>
                    </div>
                    ${baloesHTML}
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function irParaQuestaoID(questionId) {
    navegarPara('questoes');
    const qObj = obterQuestaoPorId(questionId);
    if (qObj) {
        document.getElementById("filterDisciplina").value = "todas";
        document.getElementById("filterAssunto").value = "todos";
        document.getElementById("filterBanca").value = "todas";
        document.getElementById("filterListaOrigem").value = "todas";
        document.getElementById("filterStatus").value = "todos";
        
        tagsFiltroAtivas = [`Questão ${qObj.numero}`];
        atualizarTagsPills();
        aplicarFiltros();
        
        setTimeout(() => {
            const card = document.getElementById(`card-${questionId}`);
            if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
    }
}

function removerBalaoNota(questionId, idx) {
    if (progressoUsuario.baloesSalvos[questionId]) {
        progressoUsuario.baloesSalvos[questionId].splice(idx, 1);
        salvarProgressoLocal();
        renderizarMinhasNotas();
    }
}

// ==========================================================================
// SEÇÃO 1: PAINEL PRINCIPAL (DASHBOARD)
// ==========================================================================
function atualizarEstatisticasDashboard() {
    let total = 0;
    let acertos = 0;
    let erros = 0;
    const estatisticasPorDisciplina = {};

    BANCO_QUESTOES.forEach(q => {
        const disc = q.disciplina || "Sem Disciplina";
        if (!estatisticasPorDisciplina[disc]) {
            estatisticasPorDisciplina[disc] = { total: 0, respondidas: 0, acertos: 0 };
        }
        estatisticasPorDisciplina[disc].total++;

        const resp = progressoUsuario.respondidas[q.id];
        if (resp) {
            total++;
            estatisticasPorDisciplina[disc].respondidas++;
            if (resp.correta) {
                acertos++;
                estatisticasPorDisciplina[disc].acertos++;
            } else {
                erros++;
            }
        }
    });

    const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;

    const dashTotalEl = document.getElementById("dashTotal");
    const dashAcertosEl = document.getElementById("dashAcertos");
    const dashErrosEl = document.getElementById("dashErros");
    const dashAprovEl = document.getElementById("dashAproveitamento");

    if (dashTotalEl) dashTotalEl.innerText = total;
    if (dashAcertosEl) dashAcertosEl.innerText = acertos;
    if (dashErrosEl) dashErrosEl.innerText = erros;
    if (dashAprovEl) dashAprovEl.innerText = `${aproveitamento}%`;

    const progressContainer = document.getElementById("disciplinesProgressList");
    if (progressContainer) {
        progressContainer.innerHTML = "";
        
        const discList = Object.keys(estatisticasPorDisciplina);
        if (discList.length === 0 || total === 0) {
            progressContainer.innerHTML = `<p style="font-size:0.9rem; color:var(--text-secondary); text-align:center; padding: 20px 0;">Resolva questões para visualizar suas estatísticas.</p>`;
            return;
        }

        discList.forEach(disc => {
            const stats = estatisticasPorDisciplina[disc];
            const percAcerto = stats.respondidas > 0 ? Math.round((stats.acertos / stats.respondidas) * 100) : 0;
            
            const progressItem = document.createElement("div");
            progressItem.className = "discipline-progress-item";
            progressItem.innerHTML = `
                <div class="discipline-info-row">
                    <span>${disc}</span>
                    <span>${percAcerto}% acerto (${stats.respondidas}/${stats.total} quest.)</span>
                </div>
                <div class="discipline-progress-bar-bg">
                    <div class="discipline-progress-bar-fill" style="width: ${percAcerto}%;"></div>
                </div>
            `;
            progressContainer.appendChild(progressItem);
        });
    }
}

function resetarDadosGerais() {
    if (confirm("ATENÇÃO: Deseja resetar todo o histórico?")) {
        progressoUsuario = {
            respondidas: {},
            riscadas: {},
            favoritas: [],
            anotacoes: {},
            comentariosForum: {},
            baloesSalvos: {},
            tagsCustomizadas: {}
        };
        localStorage.removeItem("remb_estudos_progresso");
        resetTimer();
        alert("Reset concluído!");
        navegarPara('dashboard');
    }
}

// Tema Claro/Escuro
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("remb_estudos_tema", newTheme);
    atualizarIconeTema(newTheme);
}

function atualizarIconeTema(tema) {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        btn.innerHTML = tema === "light" ? "🌙 Modo Escuro" : "☀️ Modo Claro";
    }
}

// ==========================================================================
// MODO FOCO (MODAL FULLSCREEN)
// ==========================================================================
function entrarModoFoco(questionId) {
    const activeSection = document.querySelector(".content-section.active");
    
    if (activeSection.id === "section-caderno-erros") {
        questoesFiltradasFoco = BANCO_QUESTOES.filter(q => {
            const resp = progressoUsuario.respondidas[q.id];
            return resp && !resp.correta;
        });
    } else if (activeSection.id === "section-favoritas") {
        questoesFiltradasFoco = BANCO_QUESTOES.filter(q => progressoUsuario.favoritas.includes(q.id));
    } else {
        const disc = document.getElementById("filterDisciplina").value;
        const assunto = document.getElementById("filterAssunto").value;
        const banca = document.getElementById("filterBanca").value;
        const listaOrigem = document.getElementById("filterListaOrigem").value;
        const status = document.getElementById("filterStatus").value;

        questoesFiltradasFoco = BANCO_QUESTOES.filter(q => {
            if (disc !== "todas" && q.disciplina !== disc) return false;
            if (assunto !== "todos" && q.assunto !== assunto) return false;
            if (banca !== "todas" && q.origem_questao?.banca !== banca) return false;
            if (listaOrigem !== "todas" && q.origem_importacao?.arquivo !== listaOrigem) return false;
            
            const resp = progressoUsuario.respondidas[q.id];
            if (status === "nao_respondidas" && resp) return false;
            if (status === "acertadas" && (!resp || !resp.correta)) return false;
            if (status === "erradas" && (!resp || resp.correta)) return false;

            if (tagsFiltroAtivas.length > 0) {
                const tagsQuestao = [
                    ...(q.tags || []),
                    ...(progressoUsuario.tagsCustomizadas[q.id] || [])
                ].map(t => t.toLowerCase());

                return tagsFiltroAtivas.every(tag => tagsQuestao.some(qTag => qTag.includes(tag.toLowerCase())));
            }
            return true;
        });
    }

    const index = questoesFiltradasFoco.findIndex(q => q.id === questionId);
    if (index === -1) return;
    
    questaoAtualFocoIndex = index;
    renderizarQuestaoFocoAtiva();

    document.getElementById("focoOverlay").style.display = "block";
    document.getElementById("focoModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function renderizarQuestaoFocoAtiva() {
    const qObj = questoesFiltradasFoco[questaoAtualFocoIndex];
    const container = document.getElementById("focoModalConteudo");
    if (!container) return;

    container.innerHTML = "";
    const cardEl = criarQuestaoCard(qObj, true);
    container.appendChild(cardEl);

    atualizarBotoesNavegacaoFoco();
}

function fecharModoFoco() {
    fecharBalaoExplicativo();
    document.getElementById("focoOverlay").style.display = "none";
    document.getElementById("focoModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    const activeSection = document.querySelector(".content-section.active");
    if (activeSection) {
        const id = activeSection.id.replace("section-", "");
        navegarPara(id);
    }
}

function proximaQuestaoFoco() {
    fecharBalaoExplicativo();
    if (questaoAtualFocoIndex < questoesFiltradasFoco.length - 1) {
        questaoAtualFocoIndex++;
        renderizarQuestaoFocoAtiva();
    }
}

function anteriorQuestaoFoco() {
    fecharBalaoExplicativo();
    if (questaoAtualFocoIndex > 0) {
        questaoAtualFocoIndex--;
        renderizarQuestaoFocoAtiva();
    }
}

function atualizarBotoesNavegacaoFoco() {
    const btnAnt = document.getElementById("btnFocoAnterior");
    const btnProx = document.getElementById("btnFocoProximo");
    
    if (btnAnt) btnAnt.disabled = (questaoAtualFocoIndex === 0);
    if (btnProx) btnProx.disabled = (questaoAtualFocoIndex === questoesFiltradasFoco.length - 1);
}

function configurarEventosTecladoFoco() {
    document.addEventListener("keydown", (e) => {
        const modal = document.getElementById("focoModal");
        if (modal && modal.style.display === "block") {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) return;
            
            const qObj = questoesFiltradasFoco[questaoAtualFocoIndex];
            const respondida = progressoUsuario.respondidas[qObj.id];

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                anteriorQuestaoFoco();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                proximaQuestaoFoco();
            } else if (e.key === "Escape") {
                e.preventDefault();
                fecharModoFoco();
            } else if (!respondida) {
                const letra = e.key.toUpperCase();
                if (["A", "B", "C", "D", "E"].includes(letra)) {
                    const cardFoco = document.getElementById(`foco-card-${qObj.id}`);
                    if (cardFoco) {
                        const itemAlt = cardFoco.querySelector(`.alternativa-item[data-letra="${letra}"]`);
                        if (itemAlt && !itemAlt.classList.contains("tachada")) {
                            e.preventDefault();
                            cardFoco.querySelectorAll(".alternativa-item").forEach(i => i.classList.remove("selecionada"));
                            itemAlt.classList.add("selecionada");
                        }
                    }
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    responderQuestao(qObj.id);
                }
            }
        }
    });
}

// ==========================================================================
// CANETA ATIVA (SELEÇÃO PERSONALIZADA, ERASER CIRÚRGICO, DRAG & DROP SEGURO)
// ==========================================================================
function setCanetaAtiva(cor, btn) {
    const buttons = document.querySelectorAll(".sticky-highlighter-bar button");
    
    if (canetaAtiva === cor) {
        canetaAtiva = null;
        btn.classList.remove("active");
        atualizarSelecaoCSS(null);
        return;
    }

    canetaAtiva = cor;
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    atualizarSelecaoCSS(cor);
}

// Injeta folhas de estilos de seleção dinâmica
function atualizarSelecaoCSS(cor) {
    const styleEl = document.getElementById("dynamic-selection-style");
    if (!styleEl) return;

    if (!cor || cor === 'eraser') {
        styleEl.innerText = "";
    } else {
        const rgb = coresSelecaoRGB[cor] || 'rgba(254, 240, 138, 0.65)';
        styleEl.innerText = `
            ::selection { background-color: ${rgb} !important; color: #000000 !important; }
            ::-moz-selection { background-color: ${rgb} !important; color: #000000 !important; }
        `;
    }
}

// Drag and drop da barra de canetas
function inicializarArrastoHighlighter() {
    const bar = document.getElementById("stickyHighlighterBar");
    const handle = document.getElementById("highlighterDragHandle");
    if (!bar || !handle) return;

    let offsetX = 0, offsetY = 0;

    handle.addEventListener("mousedown", dragMouseDown);

    function dragMouseDown(e) {
        e.preventDefault();
        
        bar.classList.add("dragging");

        const rect = bar.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.addEventListener("mouseup", closeDragElement);
        document.addEventListener("mousemove", elementDrag);
    }

    function elementDrag(e) {
        e.preventDefault();
        
        bar.style.right = "auto";
        bar.style.transform = "none";
        bar.style.left = (e.clientX - offsetX) + "px";
        bar.style.top = (e.clientY - offsetY) + "px";
    }

    function closeDragElement() {
        document.removeEventListener("mouseup", closeDragElement);
        document.removeEventListener("mousemove", elementDrag);
        
        bar.classList.remove("dragging");
    }
}

function configurarMarcadorTexto() {
    document.addEventListener("mouseup", (e) => {
        if (e.target.closest(".sticky-highlighter-bar") || e.target.closest(".balao-explicativo-popup") || e.target.closest(".btn-sair-correcao-flutuante")) return;
        if (!canetaAtiva) return;

        const selection = window.getSelection();
        const textoSelecionado = selection.toString().trim();
        
        if (textoSelecionado.length > 0) {
            const range = selection.getRangeAt(0);
            const parentCard = range.commonAncestorContainer.parentElement.closest(".questao-card");
            if (parentCard) {
                if (canetaAtiva === 'eraser') {
                    limparDestaquesSelecao(range);
                } else {
                    aplicarDestaque(canetaAtiva, range);
                }
                selection.removeAllRanges();
            }
        }
    });
}

function aplicarDestaque(cor, range) {
    const span = document.createElement("span");
    span.className = `highlight-${cor}`;
    
    try {
        range.surroundContents(span);
    } catch (e) {
        console.warn("Seleção complexa: aplicando método segmentado");
        const docFragment = range.extractContents();
        span.appendChild(docFragment);
        range.insertNode(span);
    }
}

function limparDestaquesSelecao(range) {
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === 3 ? container.parentNode : container;
    
    const highlights = parent.querySelectorAll('[class^="highlight-"]');
    highlights.forEach(hl => {
        const hlRange = document.createRange();
        hlRange.selectNode(hl);
        
        const intersects = (
            range.compareBoundaryPoints(Range.END_TO_START, hlRange) < 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, hlRange) > 0
        );
        
        if (intersects) {
            hl.replaceWith(document.createTextNode(hl.textContent));
        }
    });
}

// ==========================================================================
// FILTROS AVANÇADOS COM TAGS-INPUT E GHOST AUTOCOMPLETE
// ==========================================================================
function inicializarTagsInput() {
    const input = document.getElementById("searchTags");
    const wrapper = document.getElementById("tagsPillWrapper");
    const dropdown = document.getElementById("autocompleteTagsDropdown");
    const ghost = document.getElementById("ghostSuggestion");
    if (!input || !wrapper || !dropdown || !ghost) return;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && globalGhostTag) {
            e.preventDefault();
            input.value = globalGhostTag;
            ghost.innerHTML = "";
            globalGhostTag = null;
            
            input.dispatchEvent(new Event("input"));
        } else if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = input.value.replace(/,/g, "").trim().toLowerCase();
            if (val && !tagsFiltroAtivas.includes(val)) {
                tagsFiltroAtivas.push(val);
                atualizarTagsPills();
                aplicarFiltros();
            }
            input.value = "";
            ghost.innerHTML = "";
            globalGhostTag = null;
            dropdown.style.display = "none";
        }
    });

    // Autocompletar dinâmico com efeito de texto fantasma (ghost text)
    input.addEventListener("input", () => {
        const text = input.value.trim().toLowerCase();
        if (!text) {
            ghost.innerHTML = "";
            globalGhostTag = null;
            return;
        }

        // Reunir todas as tags
        let todasAsTags = new Set();
        BANCO_QUESTOES.forEach(q => {
            (q.tags || []).forEach(t => todasAsTags.add(t));
            (progressoUsuario.tagsCustomizadas[q.id] || []).forEach(t => todasAsTags.add(t));
            if (q.disciplina) todasAsTags.add(q.disciplina.toLowerCase());
            if (q.origem_questao?.banca) todasAsTags.add(q.origem_questao.banca.toLowerCase());
        });

        // 1. Achar a melhor sugestão para autocompletar inline (Ghost text)
        const sugestaoInline = Array.from(todasAsTags).find(tag => {
            return tag.startsWith(text) && !tagsFiltroAtivas.includes(tag);
        });

        if (sugestaoInline) {
            globalGhostTag = sugestaoInline;
            
            const typedTextEscaped = input.value.replace(/ /g, "&nbsp;");
            const restText = sugestaoInline.slice(text.length);
            ghost.innerHTML = `<span style="color: transparent;">${typedTextEscaped}</span>${restText}`;
        } else {
            ghost.innerHTML = "";
            globalGhostTag = null;
        }
    });
}

function atualizarTagsPills() {
    const wrapper = document.getElementById("tagsPillWrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    tagsFiltroAtivas.forEach(tag => {
        const pill = document.createElement("div");
        pill.className = "tag-pill";
        pill.innerHTML = `
            <span>${tag}</span>
            <button class="btn-remove-tag" onclick="removerTagFiltro('${tag}')">✕</button>
        `;
        wrapper.appendChild(pill);
    });
}

function removerTagFiltro(tag) {
    tagsFiltroAtivas = tagsFiltroAtivas.filter(t => t !== tag);
    atualizarTagsPills();
    aplicarFiltros();
}

// ==========================================================================
// MODO CORREÇÃO COM ANIMAÇÕES GSAP E BALÕES DIRECIONADOS EXATAMENTE AO ITEM
// ==========================================================================
function iniciarCorrecaoPedagogica(questionId) {
    fecharBalaoExplicativo();
    
    activePedagogicalQuestionId = questionId;
    emModoCorrecao = true;

    // 1. Escurecimento do fundo (Modo Correção Ativo)
    document.body.classList.add("modo-correcao-ativo");
    
    // 2. Destacar o card em foco (Animação GSAP de entrada com zoom)
    const card = document.getElementById(`card-${questionId}`) || document.getElementById(`foco-card-${questionId}`);
    if (card) {
        card.classList.add("em-correcao");
        gsap.fromTo(card, 
            { scale: 1 }, 
            { scale: 1.02, duration: 0.35, ease: "back.out(1.5)" }
        );
    }

    document.getElementById("btn-sair-correcao").style.display = "block";

    const qObj = obterQuestaoPorId(questionId);
    if (!qObj) return;

    activePedagogicalSteps = obterPassosPedagogicosGerais(qObj);
    activePedagogicalStepIdx = 0;
    
    mostrarPassoBalao();
}

function fecharModoCorrecao() {
    document.body.classList.remove("modo-correcao-ativo");
    
    const cards = document.querySelectorAll(".questao-card");
    cards.forEach(c => {
        if (c.classList.contains("em-correcao")) {
            gsap.to(c, { scale: 1, duration: 0.3, ease: "power1.out" });
            c.classList.remove("em-correcao");
        }
    });

    const btnSair = document.getElementById("btn-sair-correcao");
    if (btnSair) btnSair.style.display = "none";

    fecharBalaoExplicativo();
    emModoCorrecao = false;
}

function obterPassosPedagogicosGerais(q) {
    if (q.id === "Q_1___100_questoes_ALUNO_2") {
        return [
            {
                titulo: "Fato Fático (Laranja)",
                texto: "Primeiro, identificamos a premissa relevante em **Laranja**: a entidade reconheceu o gasto com produtos diretamente como despesa em vez de ativo patrimonial.",
                targetSelector: `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`,
                pos: "seta-baixo",
                action: () => {
                    destacarTermoEnunciado(q.id, "reconheceu os gastos com a compra de produtos utilizados em seu dia-a-dia diretamente como despesa, ao invés de realizar o reconhecimento como ativo", "orange");
                }
            },
            {
                titulo: "Comando da Questão (Verde)",
                texto: "A seguir, grifamos em **Verde** o comando da questão: o foco é saber qual característica qualitativa da informação foi afetada.",
                targetSelector: `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`,
                pos: "seta-baixo",
                action: () => {
                    destacarTermoEnunciado(q.id, "pode-se constatar que a informação não é", "green");
                }
            },
            {
                titulo: "Tachamento de Incorreções",
                texto: "Na alternativa **A**, a palavra **tempestiva** está incorreta (tachada em vermelho). O mesmo ocorre na alternativa **C** com **comparável** (pois a questão aborda materialidade).",
                targetSelector: `#card-${q.id} [data-letra="A"], #foco-card-${q.id} [data-letra="A"]`,
                pos: "seta-baixo",
                action: () => {
                    forcarRiscadoAlternativa(q.id, "A");
                    forcarRiscadoAlternativa(q.id, "C");
                }
            },
            {
                titulo: "Gabarito: Materialidade!",
                texto: "Como o erro de classificação (despesa direta) não alterou a prestação de contas de forma significativa, conclui-se que a informação não é **Material** para os usuários. **Gabarito B correto!**",
                targetSelector: `#card-${q.id} [data-letra="B"], #foco-card-${q.id} [data-letra="B"]`,
                pos: "seta-baixo",
                action: () => {
                    destacarGabaritoCorreto(q.id, "B");
                }
            }
        ];
    }

    if (q.id === "Q_1___100_questoes_ALUNO_3") {
        return [
            {
                titulo: "Base Normativa (Azul)",
                texto: "Grifamos o termo relacionado a normas/instituições em **Azul**: a sociedade de economia mista.",
                targetSelector: `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`,
                pos: "seta-baixo",
                action: () => {
                    destacarTermoEnunciado(q.id, "sociedade de economia mista", "blue");
                }
            },
            {
                titulo: "Comando da Questão (Verde)",
                texto: "Identificamos o comando de ação em **Verde**: pede-se para assinalar a afirmativa correta.",
                targetSelector: `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`,
                pos: "seta-baixo",
                action: () => {
                    destacarTermoEnunciado(q.id, "assinale a afirmativa correta.", "green");
                }
            },
            {
                titulo: "Tachamento Cirúrgico",
                texto: "Na alternativa **A**, a expressão **'integralmente ao regime jurídico de direito público'** está incorreta (tachada em vermelho), pois sociedades de economia mista de atividade econômica submetem-se ao regime de direito privado.",
                targetSelector: `#card-${q.id} [data-letra="A"], #foco-card-${q.id} [data-letra="A"]`,
                pos: "seta-baixo",
                action: () => {
                    forcarRiscadoAlternativa(q.id, "A");
                }
            },
            {
                titulo: "Gabarito: Regime Privado!",
                texto: "A alternativa **C** está correta: a sujeição ao regime privado alcança direitos e obrigações civis, comerciais, trabalhistas e tributárias. **Gabarito C correto!**",
                targetSelector: `#card-${q.id} [data-letra="C"], #foco-card-${q.id} [data-letra="C"]`,
                pos: "seta-baixo",
                action: () => {
                    destacarGabaritoCorreto(q.id, "C");
                }
            }
        ];
    }

    if (q.id === "Q_2___100_questoes_ALUNO_1" || q.numero === 1) {
        return [
            {
                titulo: "Foco Pedagógico",
                texto: "Esta questão exige conhecimento sobre **Princípios Orçamentários** (FGV). O foco é o princípio da Exclusividade.",
                targetSelector: `#card-${q.id} .questao-header, #foco-card-${q.id} .questao-header`,
                pos: "seta-baixo",
                action: () => {}
            },
            {
                titulo: "Destaque do Enunciado",
                texto: "Veja: **'novo tributo, cuja criação ainda dependia de aprovação legislativa'**. A LOA não pode prever a criação de tributo que depende de aprovação legal posterior.",
                targetSelector: `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`,
                pos: "seta-baixo",
                action: () => {
                    destacarTermoEnunciado(q.id, "novo tributo, cuja criação ainda dependia de aprovação legislativa");
                }
            },
            {
                titulo: "x taxativo: Eliminando a 'A'",
                texto: "O princípio da **Universalidade** exige que todas as despesas constem no orçamento, mas não impede a inserção de matérias estranhas. **Eliminamos a A!**",
                targetSelector: `#card-${q.id} [data-letra="A"], #foco-card-${q.id} [data-letra="A"]`,
                pos: "seta-baixo",
                action: () => {
                    forcarRiscadoAlternativa(q.id, "A");
                }
            },
            {
                titulo: "Gabarito: Exclusividade!",
                texto: "Conforme o **Art. 165, §8º da CF**, a LOA deve conter apenas a previsão da receita e fixação da despesa. Inclusão de tributos viola isso. **Gabarito B correto!**",
                targetSelector: `#card-${q.id} [data-letra="B"], #foco-card-${q.id} [data-letra="B"]`,
                pos: "seta-baixo",
                action: () => {
                    destacarGabaritoCorreto(q.id, "B");
                }
            }
        ];
    }

    const gabarito = q.gabarito || "A";
    const incorretas = ["A", "B", "C", "D", "E"].filter(l => l !== gabarito).slice(0, 2);

    return [
        {
            titulo: "Classificação",
            texto: `Esta questão aborda **${q.disciplina}** no tema **${q.assunto || "Estudos"}**. Vamos analisar as alternativas.`,
            targetSelector: `#card-${q.id} .questao-header, #foco-card-${q.id} .questao-header`,
            pos: "seta-baixo",
            action: () => {}
        },
        {
            titulo: "Descarte com x taxativo",
            texto: `A alternativa **(${incorretas[0]})** contraria os conceitos básicos da matéria. Eliminada!`,
            targetSelector: `#card-${q.id} [data-letra="${incorretas[0]}"], #foco-card-${q.id} [data-letra="${incorretas[0]}"]`,
            pos: "seta-baixo",
            action: () => {
                forcarRiscadoAlternativa(q.id, incorretas[0]);
            }
        },
        {
            titulo: "Gabarito Consolidado",
            texto: `A alternativa **(${gabarito})** atende perfeitamente aos requisitos do enunciado. Veja a base legal correspondente.`,
            targetSelector: `#card-${q.id} [data-letra="${gabarito}"], #foco-card-${q.id} [data-letra="${gabarito}"]`,
            pos: "seta-baixo",
            action: () => {
                destacarGabaritoCorreto(q.id, gabarito);
            }
        }
    ];
}

function mostrarPassoBalao() {
    const passo = activePedagogicalSteps[activePedagogicalStepIdx];
    if (!passo) return;

    passo.action();

    const popup = document.getElementById("balao-pedagogico");
    const conteudo = document.getElementById("balao-conteudo");
    const labelPasso = document.getElementById("balao-passo-label");
    
    conteudo.innerHTML = `<strong>${passo.titulo}</strong><br>${renderizarMarkdown(passo.texto)}`;
    labelPasso.innerText = `${activePedagogicalStepIdx + 1}/${activePedagogicalSteps.length}`;

    document.getElementById("btn-balao-voltar").disabled = (activePedagogicalStepIdx === 0);
    document.getElementById("btn-balao-avancar").innerText = (activePedagogicalStepIdx === activePedagogicalSteps.length - 1) ? "✕" : "▶";

    const cardId = activePedagogicalQuestionId;
    const card = document.getElementById(`card-${cardId}`) || document.getElementById(`foco-card-${cardId}`);
    if (!card) return;

    card.appendChild(popup);
    popup.style.display = "block";

    let targetEl = null;
    const selectors = passo.targetSelector.split(",");
    for (const sel of selectors) {
        const el = card.querySelector(sel.trim());
        if (el) {
            if (el.classList.contains("enunciado-texto")) {
                const hlSpan = el.querySelector(".highlight-yellow");
                targetEl = hlSpan || el;
            } else {
                targetEl = el;
            }
            break;
        }
    }

    if (targetEl) {
        const cardRect = card.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        let left = 0;
        let top = 0;
        let posSeta = "seta-baixo";

        const estHeight = popup.offsetHeight || 165;

        left = targetRect.left - cardRect.left + (targetRect.width / 2) - 160;
        
        if (targetRect.top - cardRect.top - estHeight - 20 > 0) {
            top = targetRect.top - cardRect.top - estHeight - 12;
            posSeta = "seta-baixo";
        } else {
            top = targetRect.bottom - cardRect.top + 12;
            posSeta = "seta-cima";
        }

        if (left < 10) left = 10;
        if (left + 330 > cardRect.width) left = cardRect.width - 340;

        popup.className = "balao-explicativo-popup " + posSeta;
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        const setaOffset = (targetRect.left - cardRect.left + (targetRect.width / 2)) - left - 9;
        
        let styleSeta = document.getElementById("dynamic-seta-style");
        if (!styleSeta) {
            styleSeta = document.createElement("style");
            styleSeta.id = "dynamic-seta-style";
            document.head.appendChild(styleSeta);
        }
        styleSeta.innerText = `.balao-explicativo-popup::after { left: ${Math.max(15, Math.min(290, setaOffset))}px !important; }`;

        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        popup.style.left = "50%";
        popup.style.top = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.className = "balao-explicativo-popup";
    }

    gsap.fromTo(popup, 
        { opacity: 0, scale: 0.6, transformOrigin: "center bottom" }, 
        { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.8)" }
    );
}

function avancarPassoBalao() {
    if (activePedagogicalStepIdx < activePedagogicalSteps.length - 1) {
        activePedagogicalStepIdx++;
        mostrarPassoBalao();
    } else {
        fecharModoCorrecao();
    }
}

// Voltar passo do balão
function voltarPassoBalao() {
    if (activePedagogicalStepIdx > 0) {
        activePedagogicalStepIdx--;
        mostrarPassoBalao();
    }
}

function fecharBalaoExplicativo() {
    const popup = document.getElementById("balao-pedagogico");
    if (popup) popup.style.display = "none";
    if (popup) document.body.appendChild(popup);
    
    if (activePedagogicalQuestionId) {
        const id = activePedagogicalQuestionId;
        const qObj = obterQuestaoPorId(id);
        if (qObj) {
            const elNormal = document.getElementById(`card-${id}`);
            if (elNormal) {
                const textNormal = elNormal.querySelector(".enunciado-texto");
                if (textNormal) textNormal.innerHTML = qObj.enunciado;
            }
            const elFoco = document.getElementById(`foco-card-${id}`);
            if (elFoco) {
                const textFoco = elFoco.querySelector(".enunciado-texto");
                if (textFoco) textFoco.innerHTML = qObj.enunciado;
            }
        }
    }
}

// Salva o texto explicativo do balão nas Minhas Notas
function salvarBalaoEmMinhasNotas() {
    if (!activePedagogicalQuestionId) return;
    
    const qId = activePedagogicalQuestionId;
    const passo = activePedagogicalSteps[activePedagogicalStepIdx];
    if (!passo) return;

    if (!progressoUsuario.baloesSalvos[qId]) {
        progressoUsuario.baloesSalvos[qId] = [];
    }

    const textoFormatado = `**${passo.titulo}**: ${passo.texto}`;
    
    if (!progressoUsuario.baloesSalvos[qId].includes(textoFormatado)) {
        progressoUsuario.baloesSalvos[qId].push(textoFormatado);
        salvarProgressoLocal();
        
        const btnSalvar = document.querySelector(".btn-salvar-nota");
        if (btnSalvar) {
            btnSalvar.innerText = "✔️ Salvo!";
            gsap.to(btnSalvar, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
            setTimeout(() => {
                btnSalvar.innerText = "💾 Salvar Nota";
            }, 1500);
        }
    }
}

// Destaque de termos do enunciado
function destacarTermoEnunciado(questionId, termo, cor = "yellow") {
    const ids = [`card-${questionId}`, `foco-card-${questionId}`];
    ids.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            const enunciadoEl = card.querySelector(".enunciado-texto");
            if (enunciadoEl) {
                const htmlOriginal = enunciadoEl.innerHTML;
                const textoLimpo = enunciadoEl.textContent.replace(/\s+/g, ' ');
                
                const idx = textoLimpo.toLowerCase().indexOf(termo.toLowerCase());
                if (idx !== -1) {
                    const originalTerm = textoLimpo.substring(idx, idx + termo.length);
                    const escaped = originalTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    enunciadoEl.innerHTML = htmlOriginal.replace(
                        new RegExp(escaped.replace(/\s+/g, '\\s+'), 'gi'),
                        `<span class="highlight-${cor}">${originalTerm}</span>`
                    );
                }
            }
        }
    });
}

function forcarRiscadoAlternativa(questionId, letra) {
    const ids = [`card-${questionId}`, `foco-card-${questionId}`];
    ids.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            const item = card.querySelector(`.alternativa-item[data-letra="${letra}"]`);
            if (item && !item.classList.contains("tachada")) {
                item.classList.add("tachada");
                gsap.fromTo(item, { opacity: 1 }, { opacity: 0.35, duration: 0.3 });
            }
        }
    });
}

function destacarGabaritoCorreto(questionId, letra) {
    const ids = [`card-${questionId}`, `foco-card-${questionId}`];
    ids.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            const item = card.querySelector(`.alternativa-item[data-letra="${letra}"]`);
            if (item) {
                item.classList.add("correta");
                gsap.fromTo(item, { scale: 1 }, { scale: 1.025, duration: 0.2, yoyo: true, repeat: 1 });
            }
        }
    });
}


// ==========================================================================
// LABORATÓRIO DE VALIDAÇÃO CESPE (TRATAMENTO DE INCONSISTÊNCIAS)
// ==========================================================================
function inicializarFiltrosVal() {
    const listasVal = new Set();
    if (typeof QUESTOES_CESPE_TRATADAS !== 'undefined') {
        QUESTOES_CESPE_TRATADAS.forEach(q => {
            if (q.origem_importacao?.arquivo) listasVal.add(q.origem_importacao.arquivo);
        });
    }

    const selectListaVal = document.getElementById("filterListaVal");
    if (selectListaVal) {
        selectListaVal.innerHTML = '<option value="todas">Todas as Listas</option>';
        listasVal.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l;
            opt.innerText = l;
            selectListaVal.appendChild(opt);
        });
    }
    
    // Atualizar o badge lateral do menu com o total de questões do laboratório
    const badgeVal = document.getElementById("badge-validacao");
    if (badgeVal && typeof QUESTOES_CESPE_TRATADAS !== 'undefined') {
        badgeVal.innerText = QUESTOES_CESPE_TRATADAS.length;
        badgeVal.style.display = QUESTOES_CESPE_TRATADAS.length > 0 ? "block" : "none";
    }
}

let cespeFiltradasVal = [];

function aplicarFiltrosVal() {
    if (typeof QUESTOES_CESPE_TRATADAS === 'undefined') return;

    const lista = document.getElementById("filterListaVal").value;
    const status = document.getElementById("filterStatusVal").value;

    cespeFiltradasVal = QUESTOES_CESPE_TRATADAS.filter(q => {
        if (lista !== "todas" && q.origem_importacao?.arquivo !== lista) return false;
        
        const resp = progressoUsuario.respondidas[q.id];
        if (status === "com_gabarito" && !q.gabarito) return false;
        if (status === "sem_gabarito" && q.gabarito) return false;
        
        const isAprov = !!(progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[q.id]?.aprovada);
        if (status === "aprovadas" && !isAprov) return false;
        if (status === "pendentes" && isAprov) return false;
        
        return true;
    });

    const container = document.getElementById("validacaoContainer");
    renderizarListaQuestoes(cespeFiltradasVal, container, false, "laboratorio");
    atualizarContagemCuracaoHeader();
}

// Estado e Ações do Editor Curação
let questaoEmEdicaoId = null;

window.editarQuestaoInline = function(qId) {
    questaoEmEdicaoId = qId;
    const qObj = obterQuestaoPorId(qId);
    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(qObj, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(qObj, true);
        focoCard.replaceWith(newFoco);
    }
};

window.cancelarEdicaoQuestao = function(qId) {
    questaoEmEdicaoId = null;
    const qObj = obterQuestaoPorId(qId);
    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(qObj, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(qObj, true);
        focoCard.replaceWith(newFoco);
    }
};

window.salvarEdicaoQuestao = function(qId) {
    const enunciadoVal = document.getElementById(`edit-enunciado-${qId}`).value.trim();
    const gabaritoVal = document.getElementById(`edit-gabarito-${qId}`).value;
    const bancaVal = document.getElementById(`edit-banca-${qId}`).value.trim();
    const disciplinaVal = document.getElementById(`edit-disciplina-${qId}`).value.trim();
    const assuntoVal = document.getElementById(`edit-assunto-${qId}`).value.trim();

    if (!progressoUsuario.curacaoVal) {
        progressoUsuario.curacaoVal = {};
    }
    if (!progressoUsuario.curacaoVal[qId]) {
        progressoUsuario.curacaoVal[qId] = {};
    }

    progressoUsuario.curacaoVal[qId].enunciado = enunciadoVal;
    progressoUsuario.curacaoVal[qId].gabarito = gabaritoVal;
    progressoUsuario.curacaoVal[qId].banca = bancaVal;
    progressoUsuario.curacaoVal[qId].disciplina = disciplinaVal;
    progressoUsuario.curacaoVal[qId].assunto = assuntoVal;

    salvarProgressoLocal();
    questaoEmEdicaoId = null;

    const qObj = obterQuestaoPorId(qId);
    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(qObj, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(qObj, true);
        focoCard.replaceWith(newFoco);
    }
};

window.alternarAprovacaoQuestao = function(qId) {
    if (!progressoUsuario.curacaoVal) {
        progressoUsuario.curacaoVal = {};
    }
    if (!progressoUsuario.curacaoVal[qId]) {
        progressoUsuario.curacaoVal[qId] = {};
    }

    const estadoAtual = !!progressoUsuario.curacaoVal[qId].aprovada;
    progressoUsuario.curacaoVal[qId].aprovada = !estadoAtual;

    salvarProgressoLocal();
    atualizarContagemCuracaoHeader();

    const qObj = obterQuestaoPorId(qId);
    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(qObj, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(qObj, true);
        focoCard.replaceWith(newFoco);
    }
};

window.atualizarContagemCuracaoHeader = function() {
    let aprovadasCount = 0;
    if (progressoUsuario.curacaoVal) {
        aprovadasCount = Object.values(progressoUsuario.curacaoVal).filter(q => q.aprovada).length;
    }
    
    const statusEl = document.getElementById("curacao-status");
    if (statusEl) {
        statusEl.innerHTML = `${aprovadasCount} aprovada(s) como consistente(s) para envio`;
        statusEl.style.color = aprovadasCount > 0 ? "var(--correta)" : "var(--text-secondary)";
    }
};

function integrarQuestoesCespeValidadas() {
    if (typeof QUESTOES_CESPE_TRATADAS === 'undefined') return;

    const aprovadas = QUESTOES_CESPE_TRATADAS.filter(q => progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[q.id]?.aprovada).map(q => {
        const curado = progressoUsuario.curacaoVal[q.id];
        return {
            ...q,
            enunciado: curado.enunciado !== undefined ? curado.enunciado : q.enunciado,
            gabarito: curado.gabarito !== undefined ? curado.gabarito : q.gabarito,
            disciplina: curado.disciplina !== undefined ? curado.disciplina : q.disciplina,
            assunto: curado.assunto !== undefined ? curado.assunto : q.assunto
        };
    });

    if (aprovadas.length === 0) {
        alert("Você não marcou nenhuma questão como 'Consistente' no Laboratório ainda. Marque os itens consistentes clicando em '◯ Marcar Consistente' nos cards antes de solicitar a integração.");
        return;
    }

    const jsonStr = JSON.stringify(aprovadas, null, 2);
    
    // Remover modal anterior se existir
    const anterior = document.getElementById("modal-integracao-curacao");
    if (anterior) anterior.remove();

    const modal = document.createElement("div");
    modal.id = "modal-integracao-curacao";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "10000";
    modal.style.padding = "20px";

    modal.innerHTML = `
        <div style="background-color: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px; max-width: 600px; width: 100%; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 15px; color: var(--text-primary); font-family:inherit;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:1.3rem; font-weight:700;">✓ Curadoria Concluída (${aprovadas.length} itens)</h3>
                <span onclick="fecharModalIntegracao()" style="cursor:pointer; font-size:1.5rem; font-weight:bold; color:var(--text-secondary);">&times;</span>
            </div>
            <p style="font-size:0.9rem; color:var(--text-secondary); margin:0; line-height:1.4;">
                Clique em <strong>Copiar Código</strong>, cole no chat do Antigravity e diga: <strong>"Colei as questões curadas, pode integrar"</strong>. Eu realizarei a consolidação física local no arquivo do seu computador!
            </p>
            <textarea readonly style="width:100%; height:200px; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-family:monospace; font-size:0.8rem; resize:none;">${jsonStr}</textarea>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-pag" onclick="fecharModalIntegracao()">Fechar</button>
                <button class="btn-pag" id="btn-copiar-json" onclick="copiarJsonCurado()" style="background-color:var(--accent); color:#fff; border-color:var(--accent);">Copiar Código</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    window.fecharModalIntegracao = function() {
        modal.remove();
    };

    window.copiarJsonCurado = function() {
        navigator.clipboard.writeText(jsonStr).then(() => {
            const btn = document.getElementById("btn-copiar-json");
            btn.innerText = "✓ Copiado!";
            setTimeout(() => {
                btn.innerText = "Copiar Código";
            }, 2000);
        });
    };
}

// ==========================================================================
// FUNÇÕES DO CONECTOR DE PALAVRAS-CHAVE (OVERLAY SVG BEZIER CURVES)
// ==========================================================================
window.desenharConexao = function(qId, idx) {
    const svg = document.getElementById(`connector-svg-${qId}`);
    const originEl = document.getElementById(`conn-origin-${qId}-${idx}`);
    const destEl = document.getElementById(`conn-dest-${qId}-${idx}`);
    if (!svg || !originEl || !destEl) return;

    const rectSVG = svg.getBoundingClientRect();
    const rectOrig = originEl.getBoundingClientRect();
    const rectDest = destEl.getBoundingClientRect();

    // Calcular coordenadas relativas ao container SVG
    const x1 = rectOrig.left - rectSVG.left + (rectOrig.width / 2);
    const y1 = rectOrig.bottom - rectSVG.top;
    const x2 = rectDest.left - rectSVG.left;
    const y2 = rectDest.top - rectSVG.top + (rectDest.height / 2);

    // Criar ou obter o elemento de linha do conector
    let path = document.getElementById(`path-${qId}-${idx}`);
    if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.id = `path-${qId}-${idx}`;
        path.setAttribute("class", "keyword-connector-line");
        svg.appendChild(path);
    }

    // Gerar uma curva Bezier cúbica suave apontando para a alternativa
    const controlX1 = x1;
    const controlY1 = y1 + (y2 - y1) * 0.4;
    const controlX2 = x2 - (x2 - x1) * 0.2;
    const controlY2 = y2;
    const d = `M ${x1} ${y1} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2}`;

    path.setAttribute("d", d);
    path.classList.add("active");

    // Destacar o termo correspondente na alternativa
    destEl.style.backgroundColor = "var(--correta-light)";
    destEl.style.color = "var(--correta)";
    destEl.style.fontWeight = "bold";
    destEl.style.borderRadius = "4px";
    destEl.style.padding = "2px 6px";
    destEl.style.transition = "all 0.2s ease";
};

window.limparConexao = function(qId, idx) {
    const path = document.getElementById(`path-${qId}-${idx}`);
    if (path) {
        path.classList.remove("active");
    }
    const destEl = document.getElementById(`conn-dest-${qId}-${idx}`);
    if (destEl) {
        destEl.style.backgroundColor = "transparent";
        destEl.style.color = "inherit";
        destEl.style.fontWeight = "normal";
        destEl.style.padding = "0";
    }
};

window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector(".app-sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar && backdrop) {
        const isOpen = sidebar.classList.contains("sidebar-open");
        if (isOpen) {
            sidebar.classList.remove("sidebar-open");
            backdrop.classList.remove("active");
        } else {
            sidebar.classList.add("sidebar-open");
            backdrop.classList.add("active");
        }
    }
};

