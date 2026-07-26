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
let activeQuestionId = null;

// Estado de progresso padrão (tagsCustomizadas incluído para evitar erros de leitura)
let progressoUsuario = {
    respondidas: {},     // { questionId: { selecionada: 'B', correta: true/false } }
    riscadas: {},        // { questionId: ['A', 'C', ...] }
    favoritas: [],       // [ questionId, ... ]
    anotacoes: {},       // { questionId: "minha nota pessoal" }
    comentariosForum: {},// { questionId: [ {usuario, data, texto} ] }
    baloesSalvos: {},    // { questionId: [ "texto do balao 1", ... ] }
    tagsCustomizadas: {},// { questionId: [ "minha tag", ... ] }
    planner: { cicloAtivo: false, config: {}, progresso: { totalRealizado: 0, historicoDias: {}, questoesCiclo: [] } },
    weeklyTemplate: null,
    overrideDays: {},
    plannerHistory: []
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
let globalGhostTag = null;
let globalProvaAtiva = null; // Guarda a tag autocompletada ativa para o autocomplete inline

const BANCO_PROVAS = [
    // Cebraspe
    { id: "cebraspe-tcu-2026", banca: "Cebraspe", ano: "2026", orgao: "TCU", cargo: "Auditor Federal de Controle Externo (TI)", nivel: "Superior", file: "cespe-cebraspe-2026-tcu-auditor-federal-de-controle-externo-area-de-controle-externo-orientacao-auditoria-de-tecnologia-da-informacao-prova.pdf" },
    { id: "cebraspe-tcepr-2026", banca: "Cebraspe", ano: "2026", orgao: "TCE-PR", cargo: "Auditor de Controle Externo", nivel: "Superior", file: "tce_pr_2026.json" },
    { id: "cebraspe-bnb-2025", banca: "Cebraspe", ano: "2025", orgao: "Banco do Nordeste (BNB)", cargo: "Analista Bancário", nivel: "Médio / Superior", file: "bnb_2025.json" },
    { id: "cebraspe-caixa-2024", banca: "Cebraspe", ano: "2024", orgao: "Caixa Econômica Federal (T.I.)", cargo: "Engenheiro de Segurança / Médico", nivel: "Superior", file: "caixa_2024_cespe.json" },
    { id: "cebraspe-agu-2023", banca: "Cebraspe", ano: "2023", orgao: "Advocacia-Geral da União (AGU)", cargo: "Advogado da União / Procurador", nivel: "Superior", file: "agu_2023.json" },
    { id: "cebraspe-inss-2022", banca: "Cebraspe", ano: "2022", orgao: "INSS", cargo: "Técnico do Seguro Social", nivel: "Médio", file: "inss_2022.json" },
    { id: "cebraspe-pf-2021", banca: "Cebraspe", ano: "2021", orgao: "Polícia Federal (PF)", cargo: "Agente, Escrivão e Delegado", nivel: "Superior", file: "ALUNO_2_100_questoes_ALUNO.json" },
    { id: "cebraspe-prf-2021", banca: "Cebraspe", ano: "2021", orgao: "Polícia Rodoviária Federal (PRF)", cargo: "Policial Rodoviário Federal", nivel: "Superior", file: "prf_2021.json" },
    { id: "cebraspe-tcdf-2020", banca: "Cebraspe", ano: "2020", orgao: "TCDF (Tribunal de Contas)", cargo: "Auditor de Controle Externo", nivel: "Superior", file: "tcdf_2020.json" },
    { id: "cebraspe-pf-2018", banca: "Cebraspe", ano: "2018", orgao: "Polícia Federal (PF)", cargo: "Agente e Escrivão", nivel: "Superior", file: "pf_2018.json" },
    { id: "cebraspe-abin-2018", banca: "Cebraspe", ano: "2018", orgao: "ABIN", cargo: "Oficial de Inteligência", nivel: "Superior", file: "abin_2018.json" },
    { id: "cebraspe-inss-2016", banca: "Cebraspe", ano: "2016", orgao: "INSS", cargo: "Técnico e Analista", nivel: "Médio / Superior", file: "inss_2016.json" },

    // FGV
    { id: "fgv-dataprev-2026", banca: "FGV", ano: "2026", orgao: "DATAPREV", cargo: "Analista de Tecnologia da Informação", nivel: "Superior", file: "dataprev_2026.json" },
    { id: "fgv-enam-2025", banca: "FGV", ano: "2025", orgao: "Exame Nacional da Magistratura (ENAM)", cargo: "Juiz Substituto (Habilitação)", nivel: "Superior", file: "enam_2025.json" },
    { id: "fgv-tjms-2024", banca: "FGV", ano: "2024", orgao: "Tribunal de Justiça de MS (TJ-MS)", cargo: "Analista Judiciário", nivel: "Superior", file: "tjms_2024.json" },
    { id: "fgv-rfb-2023", banca: "FGV", ano: "2023", orgao: "Receita Federal do Brasil (RFB)", cargo: "Auditor-Fiscal e Analista-Tributário", nivel: "Superior", file: "rfb_2023.json" },
    { id: "fgv-cgu-2022", banca: "FGV", ano: "2022", orgao: "Controladoria-Geral da União (CGU)", cargo: "Auditor Federal de Finanças", nivel: "Superior", file: "cgu_2022.json" },
    { id: "fgv-senado-2022", banca: "FGV", ano: "2022", orgao: "Senado Federal", cargo: "Consultor, Analista e Policial", nivel: "Superior", file: "senado_2022.json" },
    { id: "fgv-tcu-2022", banca: "FGV", ano: "2022", orgao: "Tribunal de Contas da União (TCU)", cargo: "Auditor Federal de Controle Externo", nivel: "Superior", file: "tcu_2022.json" },
    { id: "fgv-sefazmg-2022", banca: "FGV", ano: "2022", orgao: "SEFAZ-MG", cargo: "Auditor Fiscal da Receita Estadual", nivel: "Superior", file: "1___100_questoes_ALUNO_1.json" },
    { id: "fgv-tjrj-2021", banca: "FGV", ano: "2021", orgao: "Tribunal de Justiça do RJ (TJRJ)", cargo: "Técnico e Analista Judiciário", nivel: "Médio / Superior", file: "tjrj_2021.json" },
    { id: "fgv-mpsp-2018", banca: "FGV", ano: "2018", orgao: "Ministério Público de SP (MPSP)", cargo: "Analista Científico", nivel: "Superior", file: "mpsp_2018.json" },
    { id: "fgv-compesa-2016", banca: "FGV", ano: "2016", orgao: "COMPESA (Pernambuco)", cargo: "Engenheiro e Assistente", nivel: "Médio / Superior", file: "compesa_2016.json" },

    // Cesgranrio
    { id: "cesgranrio-bndes-2025", banca: "Cesgranrio", ano: "2025", orgao: "BNDES", cargo: "Analista (Especialidades)", nivel: "Superior", file: "bndes_2025.json" },
    { id: "cesgranrio-cnu-2024", banca: "Cesgranrio", ano: "2024", orgao: "Concurso Nacional Unificado (CNU)", cargo: "Blocos 1 a 8 (Vários Cargos)", nivel: "Médio / Superior", file: "cnu_2024.json" },
    { id: "cesgranrio-caixa-2024", banca: "Cesgranrio", ano: "2024", orgao: "Caixa Econômica Federal", cargo: "Técnico Bancário Novo", nivel: "Médio", file: "caixa_2024.json" },
    { id: "cesgranrio-bb-2023", banca: "Cesgranrio", ano: "2023", orgao: "Banco do Brasil (BB)", cargo: "Escriturário (Agente Comercial e T.I.)", nivel: "Médio", file: "bb_2023.json" },
    { id: "cesgranrio-transpetro-2023", banca: "Cesgranrio", ano: "2023", orgao: "Transpetro", cargo: "Engenheiro, Técnico e Marinha", nivel: "Médio / Superior", file: "transpetro_2023.json" },
    { id: "cesgranrio-petrobras-2022", banca: "Cesgranrio", ano: "2022", orgao: "Petrobras", cargo: "Técnico de Operações / Manutenção", nivel: "Médio / Técnico", file: "petrobras_2022.json" },
    { id: "cesgranrio-bb-2021", banca: "Cesgranrio", ano: "2021", orgao: "Banco do Brasil (BB)", cargo: "Escriturário", nivel: "Médio", file: "bb_2021.json" },
    { id: "cesgranrio-liquigas-2018", banca: "Cesgranrio", ano: "2018", orgao: "LIQUIGÁS", cargo: "Oficial de Produção e Assistente", nivel: "Médio / Superior", file: "liquigas_2018.json" },
    { id: "cesgranrio-anp-2016", banca: "Cesgranrio", ano: "2016", orgao: "ANP (Agência do Petróleo)", cargo: "Técnico e Especialista", nivel: "Médio / Superior", file: "anp_2016.json" },

    // FCC
    { id: "fcc-trt15-2025", banca: "FCC", ano: "2025", orgao: "TRT-15 (Campinas/SP)", cargo: "Técnico e Analista Judiciário", nivel: "Superior", file: "trt15_2025.json" },
    { id: "fcc-trt11-2024", banca: "FCC", ano: "2024", orgao: "TRT-11 (AM/RR)", cargo: "Técnico e Analista Judiciário", nivel: "Superior", file: "trt11_2024.json" },
    { id: "fcc-tresp-2023", banca: "FCC", ano: "2023", orgao: "TRE-SP", cargo: "Técnico e Analista Judiciário", nivel: "Superior", file: "trt_sp_2023.json" },
    { id: "fcc-trt4-2022", banca: "FCC", ano: "2022", orgao: "TRT-4 (RS) / TRT-5 / TRT-9", cargo: "Técnico e Analista Judiciário", nivel: "Superior", file: "trt4_2022.json" },
    { id: "fcc-cldf-2018", banca: "FCC", ano: "2018", orgao: "CLDF (Câmara Legislativa DF)", cargo: "Consultor e Técnico Legislativo", nivel: "Médio / Superior", file: "cldf_2018.json" },
    { id: "fcc-sabesp-2018", banca: "FCC", ano: "2018", orgao: "Sabesp", cargo: "Técnico, Engenheiro e Assistente", nivel: "Médio / Superior", file: "sabesp_2018.json" },
    { id: "fcc-tst-2017", banca: "FCC", ano: "2017", orgao: "TST (Tribunal Superior)", cargo: "Técnico e Analista Judiciário", nivel: "Médio / Superior", file: "tst_2017.json" },
    { id: "fcc-trt20-2016", banca: "FCC", ano: "2016", orgao: "TRT-20 (SE) / TRT-11", cargo: "Técnico e Analista Judiciário", nivel: "Médio / Superior", file: "trt20_2016.json" },

    // Vunesp (Magistratura, Promotor e Delegado)
    { id: "vunesp-tjsp-juiz-2025", banca: "Vunesp", ano: "2025", orgao: "Tribunal de Justiça de SP (TJ-SP)", cargo: "Juiz Substituto (191º Concurso)", nivel: "Superior", file: "tjsp_juiz_2025.json" },
    { id: "vunesp-tjsp-juiz-2023", banca: "Vunesp", ano: "2023", orgao: "Tribunal de Justiça de SP (TJ-SP)", cargo: "Juiz Substituto (190º Concurso)", nivel: "Superior", file: "tjsp_juiz_2023.json" },
    { id: "vunesp-tjsp-juiz-2021", banca: "Vunesp", ano: "2021", orgao: "Tribunal de Justiça de SP (TJ-SP)", cargo: "Juiz Substituto (189º Concurso)", nivel: "Superior", file: "tjsp_juiz_2021.json" },
    { id: "vunesp-mpsp-promotor-2026", banca: "Vunesp", ano: "2026", orgao: "Ministério Público de SP (MP-SP)", cargo: "Promotor de Justiça Substituto (96º Concurso)", nivel: "Superior", file: "mpsp_promotor_2026.json" },
    { id: "vunesp-mpsp-promotor-2023", banca: "Vunesp", ano: "2023", orgao: "Ministério Público de SP (MP-SP)", cargo: "Promotor de Justiça Substituto (95º Concurso)", nivel: "Superior", file: "mpsp_promotor_2023.json" },
    { id: "vunesp-mpsc-promotor-2025", banca: "Vunesp", ano: "2025", orgao: "Ministério Público de SC (MP-SC)", cargo: "Promotor de Justiça Substituto (45º Concurso)", nivel: "Superior", file: "mpsc_promotor_2025.json" },
    { id: "vunesp-pcsp-delegado-2023", banca: "Vunesp", ano: "2023", orgao: "Polícia Civil de SP (PC-SP)", cargo: "Delegado de Polícia", nivel: "Superior", file: "pcsp_delegado_2023.json" },
    { id: "vunesp-pcsp-delegado-2022", banca: "Vunesp", ano: "2022", orgao: "Polícia Civil de SP (PC-SP)", cargo: "Delegado de Polícia", nivel: "Superior", file: "pcsp_delegado_2022.json" },
    { id: "vunesp-pcsp-delegado-2018", banca: "Vunesp", ano: "2018", orgao: "Polícia Civil de SP (PC-SP)", cargo: "Delegado de Polícia", nivel: "Superior", file: "pcsp_delegado_2018.json" }
];

let emModoSimulado = false;
let simuladoFinalizado = false;

let opacidadeCanetas = {
    'yellow': 45,
    'green': 45,
    'blue': 45,
    'pink': 45,
    'orange': 45
};

try {
    const storedOpacidades = localStorage.getItem("remb_opacidades_canetas");
    if (storedOpacidades) {
        opacidadeCanetas = { ...opacidadeCanetas, ...JSON.parse(storedOpacidades) };
    }
} catch (e) {
    console.warn("Erro ao ler opacidades das canetas:", e);
}

// Gerador determinístico de relevância para fins de teste
function obterRelevanciaQuestao(q) {
    let hash = 0;
    const idStr = q.id || '';
    for (let i = 0; i < idStr.length; i++) {
        hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pct = 55 + Math.abs(hash % 41); // Entre 55% e 95%
    return pct;
}

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

    // Ocultar Laboratório se estiver em modo de publicação direcionada Luciana
    const isLucianaMode = window.location.pathname.includes('/luciana') || window.location.href.includes('luciana');
    if (isLucianaMode) {
        const labBtn = document.getElementById("btn-nav-validacao");
        if (labBtn) labBtn.style.display = "none";
    }
    
    // Rastrear clique em cards para marcar activeQuestionId
    document.addEventListener("click", (e) => {
        const card = e.target.closest(".questao-card");
        if (card) {
            const match = card.id.match(/(card|foco-card)-(.+)/);
            if (match) {
                activeQuestionId = match[2];
            }
        }
    });

    inicializarFiltros();
    inicializarTagsInput();
    inicializarArrastoHighlighter();
    
    // Restaurar estado de recolhimento da sidebar
    const collapsed = localStorage.getItem("remb_sidebar_collapsed") === "true";
    const layout = document.querySelector(".app-layout");
    const arrow = document.querySelector(".btn-collapse-sidebar .icon-arrow");
    if (collapsed && layout) {
        layout.classList.add("sidebar-collapsed");
        if (arrow) arrow.innerText = "▶";
    }

    // Carregar configurações de opacidade e hover corretivo
    const storedOpacity = localStorage.getItem("remb_highlight_opacity") || "45";
    const slider = document.getElementById("opacitySlider");
    if (slider) slider.value = storedOpacity;
    window.alterarOpacidadeGrifos(storedOpacity);
    
    // Inicializar slider de opacidade flutuante na barra móvel
    window.inicializarSliderOpacidadeFlutuante();

    const storedHover = localStorage.getItem("remb_hover_corretivo") !== "false";
    const toggleHover = document.getElementById("toggleHoverCorretivo");
    if (toggleHover) toggleHover.checked = storedHover;
    window.alternarHoverCorretivo(storedHover);

    navegarPara('dashboard'); // Abrir no dashboard (barra de canetas oculta inicialmente)
    configurarEventosTecladoFoco();
    configurarMarcadorTexto();
    window.configurarAtalhosTecladoCaneta();
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
            const defaultWeeklyTemplate = {
                0: Array(24).fill('empty'), // Seg
                1: Array(24).fill('empty'), // Ter
                2: Array(24).fill('empty'), // Qua
                3: Array(24).fill('empty'), // Qui
                4: Array(24).fill('empty'), // Sex
                5: Array(24).fill('empty'), // Sáb
                6: Array(24).fill('empty')  // Dom
            };
            for (let day = 0; day < 5; day++) {
                for (let h = 0; h <= 6; h++) defaultWeeklyTemplate[day][h] = 'rest';
                defaultWeeklyTemplate[day][23] = 'rest';
                for (let h = 8; h <= 11; h++) defaultWeeklyTemplate[day][h] = 'work';
                for (let h = 13; h <= 16; h++) defaultWeeklyTemplate[day][h] = 'work';
                if (day === 0 || day === 2 || day === 4) {
                    defaultWeeklyTemplate[day][18] = 'gym';
                    defaultWeeklyTemplate[day][19] = 'gym';
                } else {
                    defaultWeeklyTemplate[day][18] = 'random';
                }
            }
            for (let day = 5; day <= 6; day++) {
                for (let h = 0; h <= 7; h++) defaultWeeklyTemplate[day][h] = 'rest';
                for (let h = 22; h <= 23; h++) defaultWeeklyTemplate[day][h] = 'rest';
            }

            progressoUsuario = {
                respondidas: parsed.respondidas || {},
                riscadas: parsed.riscadas || {},
                favoritas: parsed.favoritas || [],
                anotacoes: parsed.anotacoes || {},
                comentariosForum: parsed.comentariosForum || {},
                baloesSalvos: parsed.baloesSalvos || {},
                tagsCustomizadas: parsed.tagsCustomizadas || {},
                curacaoVal: parsed.curacaoVal || {},
                questoesLaboratorioAdicionais: parsed.questoesLaboratorioAdicionais || [],
                planner: parsed.planner || { cicloAtivo: false, config: {}, progresso: { totalRealizado: 0, historicoDias: {}, questoesCiclo: [] } },
                weeklyTemplate: parsed.weeklyTemplate || defaultWeeklyTemplate,
                overrideDays: parsed.overrideDays || {},
                plannerHistory: parsed.plannerHistory || []
            };

            // Injetar questões copiadas da sala ao array global do laboratório
            if (typeof QUESTOES_CESPE_TRATADAS !== 'undefined' && progressoUsuario.questoesLaboratorioAdicionais) {
                progressoUsuario.questoesLaboratorioAdicionais.forEach(q => {
                    if (!QUESTOES_CESPE_TRATADAS.some(ext => ext.id === q.id)) {
                        QUESTOES_CESPE_TRATADAS.unshift(q); // Coloca no topo
                    }
                });
            }
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
    } else if (sectionId === 'provas') {
        window.renderizarBibliotecaProvas();
    } else if (sectionId === 'estatisticas') {
        window.renderizarEstatisticasDetalhadas();
    } else if (sectionId === 'planner') {
        window.renderizarPlanner();
    } else if (sectionId === 'validacao') {
        inicializarFiltrosVal();
        aplicarFiltrosVal();
    } else if (sectionId === 'caderno-erros') {
        renderizarCadernoErros();
    } else if (sectionId === 'favoritas') {
        renderizarFavoritas();
    } else if (sectionId === 'minhas-notas') {
        renderizarMinhasNotas();
    } else if (sectionId === 'admin') {
        window.renderizarAdminPanel();
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

            // Incrementa o tempo total na Sala de Questões
            const isNaSala = document.getElementById("section-questoes")?.classList.contains("active");
            if (isNaSala) {
                progressoUsuario.tempoTotalSala = (progressoUsuario.tempoTotalSala || 0) + 1;
            }

            // Incrementa o tempo gasto na questão ativa
            if (activeQuestionId) {
                if (!progressoUsuario.temposQuestoes) {
                    progressoUsuario.temposQuestoes = {};
                }
                progressoUsuario.temposQuestoes[activeQuestionId] = (progressoUsuario.temposQuestoes[activeQuestionId] || 0) + 1;
            }
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

    // Se o usuário selecionou uma lista manualmente ou trocou a banca para algo incompatível, limpamos a prova ativa
    if (globalProvaAtiva) {
        if (listaOrigem !== "todas" || (banca !== "todas" && banca.toLowerCase() !== globalProvaAtiva.banca.toLowerCase())) {
            globalProvaAtiva = null;
        }
    }

    const filtradas = BANCO_QUESTOES.filter(q => {
        if (globalProvaAtiva) {
            // Filtra exclusivamente pela prova selecionada
            if (q.origem_importacao?.arquivo !== globalProvaAtiva.file) return false;
        } else {
            // Filtros de banca e lista originais
            if (banca !== "todas") {
                const qBanca = (q.origem_questao?.banca || "").toLowerCase();
                const selBanca = banca.toLowerCase();
                const isCebraspeMatch = (selBanca === "cebraspe" || selBanca === "cespe") && (qBanca === "cebraspe" || qBanca === "cespe");
                if (!isCebraspeMatch && qBanca !== selBanca) return false;
            }
            if (listaOrigem !== "todas" && q.origem_importacao?.arquivo !== listaOrigem) return false;
        }
        if (disc !== "todas" && q.disciplina !== disc) return false;
        if (assunto !== "todos" && q.assunto !== assunto) return false;
        
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

        // Filtro de Relevância (Assuntos mais cobrados)
        const toggleRelevancia = document.getElementById("toggleAssuntosCobrados");
        if (toggleRelevancia && toggleRelevancia.checked) {
            const rel = obterRelevanciaQuestao(q);
            if (rel < 80) return false;
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


function isCodeBlockContext(text) {
    if (!text) return false;
    const trimmed = text.trim();
    return /^0\d\s+/.test(trimmed) || trimmed.startsWith('pipeline {') || trimmed.includes('agent any');
}


function obterAbstractStepsDefault(q) {
    const isCebraspe = q.origem_questao?.banca?.toLowerCase() === 'cebraspe' || q.origem_questao?.banca?.toLowerCase() === 'cespe';
    const gabarito = q.gabarito || (isCebraspe ? "C" : "A");
    
    if (isCebraspe) {
        return [
            {
                titulo: "Foco da Questão",
                texto: `Esta questão aborda ${q.disciplina || "a matéria"} no tema ${q.assunto || "Geral"}.`,
                target: "header",
                cor_destaque: "none"
            },
            {
                titulo: "Análise do Enunciado",
                texto: "Analise atentamente as afirmações contidas no enunciado para julgar o item.",
                target: "enunciado",
                cor_destaque: "none"
            },
            {
                titulo: "Gabarito Oficial",
                texto: `O gabarito oficial da banca é ${gabarito === 'C' ? 'Certo' : 'Errado'}.`,
                target: "gabarito",
                cor_destaque: "none"
            }
        ];
    } else {
        const incorretas = ["A", "B", "C", "D", "E"].filter(l => l !== gabarito).slice(0, 2);
        return [
            {
                titulo: "Classificação",
                texto: `Esta questão aborda ${q.disciplina || "a matéria"} no tema ${q.assunto || "Geral"}.`,
                target: "header",
                cor_destaque: "none"
            },
            {
                titulo: "Eliminação",
                texto: `A alternativa (${incorretas[0]}) pode ser eliminada.`,
                target: incorretas[0],
                cor_destaque: "tachar"
            },
            {
                titulo: "Gabarito",
                texto: `A alternativa correta é a (${gabarito}).`,
                target: "gabarito",
                cor_destaque: "none"
            }
        ];
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
            assunto: curado.assunto !== undefined ? curado.assunto : q.assunto,
            passos_correcao: curado.passos_correcao !== undefined ? curado.passos_correcao : q.passos_correcao
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
        const temProvaIdentificada = !!(q.prova_id || q.prova_nome || q.prova_vinculada);
        const infoProvaHTML = temProvaIdentificada ? `
            <div style="font-size:0.75rem; color:var(--accent); font-weight:700; margin-top:2px;">
                📋 Prova Vinculada: ${q.prova_nome || q.prova_id || q.prova_vinculada}
            </div>
        ` : "";

        const disableBancaAttr = temProvaIdentificada ? "readonly style='width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--border); color:var(--text-secondary); cursor:not-allowed; opacity:0.85;' title='Banca vinculada à Prova (Não editável)'" : "style='width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary);'";

        card.innerHTML = `
            <div class="questao-header" style="display:flex; flex-direction:column; align-items:flex-start;">
                <h2>Editar Questão ${q.labId}</h2>
                ${infoProvaHTML}
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
                        <input type="text" id="edit-banca-${q.id}" value="${q.origem_questao?.banca || 'CESPE'}" placeholder="Ex: CESPE" ${disableBancaAttr}>
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
                <div style="margin-top:15px; border-top:1.5px solid var(--border); padding-top:15px; text-align: left;">
                    <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-primary); margin-bottom:12px;">🛠️ Fluxo da Correção Interativa (Passos)</h3>
                    <div id="visual-steps-container-${q.id}" style="display:flex; flex-direction:column; gap:12px; margin-bottom:15px;"></div>
                    <button class="btn btn-outline-primary btn-sm" onclick="window.adicionarPassoVisual('${q.id}')" style="font-weight:700; border-radius:6px; font-size:0.75rem; padding:6px 12px; cursor:pointer;">
                        ➕ Adicionar Novo Passo
                    </button>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button class="btn-pag" onclick="cancelarEdicaoQuestao('${q.id}')">Cancelar</button>
                    <button class="btn-pag" onclick="window.gerarPreviewCorrecao('${q.id}')" style="background-color:var(--correta); color:#fff; border-color:var(--correta);">🧪 Gerar Preview</button>
                    <button class="btn-pag" onclick="salvarEdicaoQuestao('${q.id}')" style="background-color:var(--accent); color:#fff; border-color:var(--accent);">Salvar</button>
                </div>
            </div>
        `;
        return card;
    }

    let respondida = progressoUsuario.respondidas[q.id];
    const isPreviewMode = (window.emPreviewCuracaoId === q.id);
    if (isPreviewMode) {
        respondida = respondida || { selecionada: q.gabarito || "C", correta: true };
    }
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

    let metaHTML = "";
    const relevanc = obterRelevanciaQuestao(q);
    const fireBadge = relevanc >= 80 ? `<span class="meta-badge" style="background-color:#fffbeb; color:#d97706; border:1px solid #fde68a; font-weight:700;">🔥 Relevância: ${relevanc}%</span>` : '';
    const emSimuladoOculto = emModoSimulado && !simuladoFinalizado;

    const idBadgeHTML = `<span class="meta-badge" style="background-color: var(--border); color: var(--text-secondary); font-family: monospace; font-size: 0.68rem; font-weight: 700; border: none; letter-spacing: 0.2px;">ID: ${q.id}</span>`;
    if (emSimuladoOculto) {
        metaHTML = `
            <div class="questao-meta">
                ${idBadgeHTML}
                <span class="meta-badge" style="background-color: var(--accent-light); color: var(--accent); font-weight: 700; border: none;">📝 Modo Simulado Ativo</span>
                ${respondida ? `<span class="meta-badge" style="background-color: var(--border); color: var(--text-secondary); font-weight: 700; border: none;">Respondida</span>` : ""}
            </div>
        `;
    } else {
        metaHTML = `
            <div class="questao-meta">
                ${idBadgeHTML}
                <span class="meta-badge banca">${q.origem_questao?.banca || "FGV"}</span>
                ${q.disciplina ? `<span class="meta-badge">${q.disciplina}</span>` : ""}
                ${q.assunto ? `<span class="meta-badge">${q.assunto}</span>` : ""}
                ${labBadgeHTML}
                ${aprovadaBadgeHTML}
                ${fireBadge}
                ${respondida ? `<span class="meta-badge ${respondida.correta ? 'banca' : 'errada'}">${respondida.correta ? '🟢 Correta' : '🔴 Errada'}</span>` : ""}
            </div>
            ${tagsHTML}
        `;
    }

    // Botões de favoritos e curação
    let headerActionsHTML = "";
    if (!emSimuladoOculto) {
        const isLucianaMode = window.location.pathname.includes('/luciana') || window.location.href.includes('luciana');
        const labBtnHTML = (!q.labId && !isLucianaMode) ? `
            <button class="btn btn-outline-secondary btn-sm" onclick="enviarParaLaboratorio('${q.id}')" title="Enviar cópia para curação no Laboratório" style="border-radius:6px; font-size:0.72rem; padding:3px 8px; font-weight:700; border:1.5px solid var(--border); background:transparent; color:var(--text-secondary); cursor:pointer;">
                🧪 Enviar ao Lab
            </button>
        ` : "";
        headerActionsHTML = `
            <div class="card-header-actions" style="display:flex; align-items:center; gap:8px;">
                ${labBtnHTML}
                <button class="btn-favoritar" onclick="toggleFavorito('${q.id}')" title="Favoritar questão">
                    ${isFavorita ? "⭐" : "☆"}
                </button>
            </div>
        `;
    }

    // Cabeçalho
    let previewToolbarHTML = "";
    if (isPreviewMode) {
        previewToolbarHTML = `
            <div class="preview-curacao-toolbar" style="width:100%; border:1.5px solid var(--correta); background-color:var(--correta-light); color:var(--correta); margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-radius:10px;">
                <div style="font-weight:800; display:flex; align-items:center; gap:6px; font-size:0.85rem;">🧪 Preview da Correção Interativa</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-sm btn-light" onclick="window.voltarAoEditor('${q.id}')" style="font-weight:700; border-radius:6px; font-size:0.75rem; padding:4px 8px;">Voltar ao Editor</button>
                    <button class="btn btn-sm btn-primary" onclick="window.salvarEdicaoQuestao('${q.id}')" style="font-weight:750; border-radius:6px; background-color:var(--accent); border-color:var(--accent); font-size:0.75rem; padding:4px 8px; color:#fff;">Salvar e Concluir</button>
                </div>
            </div>
        `;
    }

    const titleText = q.labId ? `Identificação: ${q.labId}` : `Questão ${q.numero}`;
    const headerHTML = `
        ${previewToolbarHTML}
        <div class="questao-header">
            <h2>${titleText}</h2>
        </div>
    `;

    // Enunciado
    let enunciadoTexto = q.enunciado;
    if (q.conectores && !emSimuladoOculto) {
        q.conectores.forEach((c, idx) => {
            const escapedWord = c.origem_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            enunciadoTexto = enunciadoTexto.replace(regex, `<span class="connector-origin" id="conn-origin-${q.id}-${idx}" data-idx="${idx}" style="cursor: pointer; font-weight: 700; border-bottom: 2px dotted var(--accent);">$1</span>`);
        });
    }

    let contextoHTML = "";
    if (q.contexto) {
        const isCode = isCodeBlockContext(q.contexto);
        const fontStyle = isCode 
            ? "font-family: Consolas, 'Courier New', Courier, monospace; font-size: 0.85rem; background-color: #1e1e1e; color: #d4d4d4; padding: 14px; border-radius: 8px; border-left: 4px solid #007acc; overflow-x: auto; white-space: pre; text-align: left;" 
            : "font-family: inherit; font-size: 0.92rem; background-color: var(--bg-app); color: var(--text-secondary); padding: 12px 16px; border-radius: 6px; border-left: 4px solid var(--accent); line-height: 1.5; white-space: pre-wrap; text-align: left;";
        
        const labelStyle = isCode
            ? "font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: #007acc; margin-bottom: 8px; user-select: none;"
            : "font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent); margin-bottom: 8px; user-select: none;";

        contextoHTML = `
            <div class="questao-contexto" style="margin: 12px 0;">
                <div style="${labelStyle}">Contexto / Texto Associado</div>
                <div style="${fontStyle}">${q.contexto}</div>
            </div>
        `;
    }

    let comandoHTML = "";
    if (q.comando) {
        comandoHTML = `
            <div class="questao-comando" style="margin: 10px 0 14px 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.4; border-bottom: 1.5px dashed var(--border); padding-bottom: 8px; text-align: left;">
                <span style="font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); display: block; margin-bottom: 4px; user-select: none;">Instrução / Comando</span>
                ${q.comando}
            </div>
        `;
    }

    const enunciadoHTML = `
        <div class="enunciado-texto" style="text-align: left;">${enunciadoTexto}</div>
    `;

    // Alternativas
    let alternativasHTML = `<div class="alternativas-container" style="position:relative;">`;
    if (q.conectores && !emSimuladoOculto) {
        alternativasHTML += `<svg class="keyword-connector-overlay" id="connector-svg-${q.id}"></svg>`;
    }

    q.alternativas.forEach(alt => {
        let classes = "alternativa-item";
        const isTachada = alternativasRiscadas.includes(alt.letra);
        if (isTachada) classes += " tachada";
        
        if (respondida && !emSimuladoOculto) {
            if (alt.letra === q.gabarito) {
                classes += " correta";
            } else if (respondida.selecionada === alt.letra) {
                classes += " incorreta";
            }
        } else if (respondida && emSimuladoOculto) {
            if (respondida.selecionada === alt.letra) {
                classes += " selecionada";
            }
        }

        let textoAlternativa = alt.texto;
        if (respondida && q.termos_incorretos_alternativas && !emSimuladoOculto) {
            const regrasTachar = q.termos_incorretos_alternativas.filter(r => r.letra === alt.letra);
            regrasTachar.forEach(regra => {
                const escapedTerm = regra.termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedTerm})`, 'gi');
                textoAlternativa = textoAlternativa.replace(regex, `<span class="termo-erro-tachado" data-tooltip="${regra.justificativa}">$1</span>`);
            });
        }

        if (q.conectores && !emSimuladoOculto) {
            q.conectores.forEach((c, idx) => {
                if (c.destino_letra === alt.letra) {
                    const escapedDest = c.destino_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedDest})`, 'gi');
                    textoAlternativa = textoAlternativa.replace(regex, `<span class="connector-dest" id="conn-dest-${q.id}-${idx}">$1</span>`);
                }
            });
        }

        let letterContent = alt.letra;
        if (q.tipo === 'certo_errado') {
            if (respondida && !emSimuladoOculto) {
                if (alt.letra === q.gabarito) {
                    letterContent = '✓';
                } else if (respondida.selecionada === alt.letra) {
                    letterContent = '✗';
                } else {
                    letterContent = '&nbsp;';
                }
            } else if (respondida && emSimuladoOculto) {
                if (respondida.selecionada === alt.letra) {
                    letterContent = '●';
                } else {
                    letterContent = '&nbsp;';
                }
            } else {
                letterContent = '&nbsp;';
            }
        }

        alternativasHTML += `
            <div class="${classes}" data-letra="${alt.letra}">
                <div class="alternativa-letter" style="${q.tipo === 'certo_errado' ? 'font-size:1.1rem; font-weight:800;' : ''}">${letterContent}</div>
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
        if (emSimuladoOculto) {
            footerHTML = `
                <div class="questao-footer" style="border: none; padding-top: 0;">
                    <span class="meta-badge" style="background-color: var(--border); color: var(--text-secondary); font-weight: 700; padding: 8px 16px;">
                        Questão Respondida (Modo Simulado)
                    </span>
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
    }

    let posResolucaoHTML = "";
    if (respondida && !emSimuladoOculto) {
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

    card.innerHTML = metaHTML + headerActionsHTML + headerHTML + contextoHTML + comandoHTML + enunciadoHTML + alternativasHTML + footerHTML + posResolucaoHTML + curacaoFooterHTML;

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

    const tempoGasto = (progressoUsuario.temposQuestoes && progressoUsuario.temposQuestoes[questionId]) || 0;
    progressoUsuario.respondidas[questionId] = {
        selecionada: letraSelecionada,
        correta: correta,
        tempoGasto: tempoGasto
    };

    // Registrar progresso no Planner se houver um ciclo ativo
    if (progressoUsuario.planner && progressoUsuario.planner.cicloAtivo) {
        const p = progressoUsuario.planner;
        if (!p.progresso.questoesCiclo) p.progresso.questoesCiclo = [];
        
        if (!p.progresso.questoesCiclo.includes(questionId)) {
            p.progresso.questoesCiclo.push(questionId);
            
            // Se o objetivo do ciclo for resolver questões, incrementa a realização geral
            if (p.config.objetivo === "questoes") {
                p.progresso.totalRealizado = (p.progresso.totalRealizado || 0) + 1;
            }
            
            // Incrementar progresso do dia atual se a matéria coincidir
            const hojeKey = new Date().toISOString().split('T')[0];
            if (!p.progresso.historicoDias) p.progresso.historicoDias = {};
            if (!p.progresso.historicoDias[hojeKey]) {
                p.progresso.historicoDias[hojeKey] = { planejado: 0, realizado: 0, concluido: false, materia: "" };
            }
            
            const diaMeta = p.progresso.historicoDias[hojeKey];
            // Se a matéria coincidir com a matéria da meta do dia (ou se não houver matéria definida para o dia)
            if (diaMeta && (!diaMeta.materia || diaMeta.materia === qObj.disciplina)) {
                if (p.config.objetivo === "questoes") {
                    diaMeta.realizado = (diaMeta.realizado || 0) + 1;
                    if (diaMeta.realizado >= diaMeta.planejado) {
                        diaMeta.concluido = true;
                    }
                }
            }
        }
    }

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
    
    // Se há um texto selecionado no navegador, aplicamos o destaque imediatamente
    const selection = window.getSelection();
    const textoSelecionado = selection ? selection.toString().trim() : "";
    
    if (textoSelecionado.length > 0) {
        const range = selection.getRangeAt(0);
        const parentCard = range.commonAncestorContainer.parentElement.closest(".questao-card");
        if (parentCard) {
            if (cor === 'eraser') {
                limparDestaquesSelecao(range);
                activeHighlightSpan = null;
                justHighlighted = true;
            } else {
                aplicarDestaque(cor, range);
            }
            selection.removeAllRanges();
        }
    }

    if (canetaAtiva === cor) {
        canetaAtiva = null;
        btn.classList.remove("active");
        atualizarSelecaoCSS(null);
        atualizarDicaSemantica(null);
        return;
    }

    canetaAtiva = cor;
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    atualizarSelecaoCSS(cor);
    atualizarDicaSemantica(cor);

    // Carregar a opacidade memorizada para esta caneta específica
    if (cor !== 'eraser') {
        const savedOpacity = opacidadeCanetas[cor] || 45;
        window.alterarOpacidadeGrifos(savedOpacity);
    }
}

function atualizarDicaSemantica(cor) {
    const tipEl = document.getElementById("highlighterSemanticTip");
    if (!tipEl) return;
    switch (cor) {
        case 'yellow':
            tipEl.innerText = "Palavra-chave / Exceção";
            tipEl.style.color = "var(--accent)";
            break;
        case 'green':
            tipEl.innerText = "Comando de Ação";
            tipEl.style.color = "#10b981";
            break;
        case 'blue':
            tipEl.innerText = "Normas e Leis";
            tipEl.style.color = "#3b82f6";
            break;
        case 'pink':
            tipEl.innerText = "Prazos / Datas";
            tipEl.style.color = "#ec4899";
            break;
        case 'orange':
            tipEl.innerText = "Situação Fática";
            tipEl.style.color = "#f97316";
            break;
        case 'eraser':
            tipEl.innerText = "Borracha";
            tipEl.style.color = "var(--text-secondary)";
            break;
        default:
            tipEl.innerText = "Selecione uma Caneta";
            tipEl.style.color = "var(--text-secondary)";
    }
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

let activeHighlightSpan = null;

function obterRGBACorCaneta(cor, opacityPercent) {
    const op = opacityPercent / 100;
    switch (cor) {
        case 'blue': return `rgba(59, 130, 246, ${op})`;
        case 'green': return `rgba(16, 185, 129, ${op})`;
        case 'pink': return `rgba(236, 72, 153, ${op})`;
        case 'orange': return `rgba(249, 115, 22, ${op})`;
        case 'yellow':
        default: return `rgba(234, 179, 8, ${op})`;
    }
}

let justHighlighted = false;

// Desmarca a marcação ativa atual e desativa a caneta ativa ao clicar fora (sem selecionar texto)
document.addEventListener("mouseup", (e) => {
    if (e.target.closest("#verticalOpacitySliderContainer") || e.target.closest("#opacitySlider") || e.target.closest("#stickyHighlighterBar")) {
        return;
    }
    
    // Se acabamos de grifar um texto neste mouseup, não cancelamos a caneta
    if (justHighlighted) {
        justHighlighted = false;
        return;
    }
    
    const selection = window.getSelection();
    const textoSelecionado = selection ? selection.toString().trim() : "";
    
    // Se foi apenas um clique limpo fora da barra (sem arrastar/selecionar texto)
    if (textoSelecionado.length === 0) {
        // Concluir e fixar a marcação ativa atual
        activeHighlightSpan = null;
        
        // Desativar a caneta/marca-texto ativo se houver
        if (typeof canetaAtiva !== 'undefined' && canetaAtiva !== null) {
            canetaAtiva = null;
            const buttons = document.querySelectorAll(".sticky-highlighter-bar button");
            buttons.forEach(b => b.classList.remove("active"));
            if (typeof atualizarSelecaoCSS === 'function') {
                atualizarSelecaoCSS(null);
            }
        }
    }
});

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
                    activeHighlightSpan = null;
                    justHighlighted = true;
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
    
    // Pegar a opacidade atual das configurações
    const storedOpacity = localStorage.getItem("remb_highlight_opacity") || "45";
    const opacityVal = parseInt(storedOpacity);
    
    // Aplicar a cor inline como !important para sobressair ao CSS de classe padrão
    span.style.setProperty("background-color", obterRGBACorCaneta(cor, opacityVal), "important");
    span.setAttribute("data-color", cor);
    span.setAttribute("data-opacity", opacityVal);
    
    try {
        range.surroundContents(span);
    } catch (e) {
        console.warn("Seleção complexa: aplicando método segmentado");
        const docFragment = range.extractContents();
        span.appendChild(docFragment);
        range.insertNode(span);
    }
    
    // Armazenar referência ativa para permitir ajustes de opacidade antes de desmarcar
    activeHighlightSpan = span;
    justHighlighted = true;
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
    const passos = q.passos_correcao || obterAbstractStepsDefault(q);
    const useRigidoOriginal = !q.passos_correcao && (q.id === "Q_1___100_questoes_ALUNO_2" || q.id === "Q_1___100_questoes_ALUNO_3" || q.id === "Q_2___100_questoes_ALUNO_1" || q.numero === 1);
    
    if (!useRigidoOriginal) {
        return passos.map(step => {
            let targetSelector = `#card-${q.id} .enunciado-texto, #foco-card-${q.id} .enunciado-texto`;
            if (step.target === 'header') {
                targetSelector = `#card-${q.id} .questao-header, #foco-card-${q.id} .questao-header`;
            } else if (step.target === 'gabarito') {
                targetSelector = `#card-${q.id} [data-letra="${q.gabarito || 'A'}"], #foco-card-${q.id} [data-letra="${q.gabarito || 'A'}"]`;
            } else if (['A', 'B', 'C', 'D', 'E'].includes(step.target)) {
                targetSelector = `#card-${q.id} [data-letra="${step.target}"], #foco-card-${q.id} [data-letra="${step.target}"]`;
            }
            
            return {
                titulo: step.titulo,
                texto: step.texto,
                targetSelector: targetSelector,
                pos: "seta-baixo",
                action: () => {
                    if (step.cor_destaque && step.cor_destaque !== 'none' && step.termo_destaque) {
                        destacarTermoEnunciado(q.id, step.termo_destaque, step.cor_destaque);
                    } else if (step.target === 'gabarito') {
                        destacarGabaritoCorreto(q.id, q.gabarito || 'A');
                    } else if (['A', 'B', 'C', 'D', 'E'].includes(step.target) && step.cor_destaque === 'tachar') {
                        forcarRiscadoAlternativa(q.id, step.target);
                    }
                }
            };
        });
    }

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

    // MODO PREVIEW DA CURAÇÃO INTERATIVA
    const isPreview = (window.emPreviewCuracaoId !== undefined && window.emPreviewCuracaoId !== null);
    if (isPreview) {
        conteudo.setAttribute("contenteditable", "true");
        conteudo.style.outline = "none";
        conteudo.style.border = "1.5px dashed var(--accent)";
        conteudo.style.borderRadius = "8px";
        conteudo.style.padding = "6px";
        conteudo.style.cursor = "text";
        conteudo.style.minHeight = "40px";
        conteudo.title = "Clique e digite para editar este texto diretamente";
        
        conteudo.onblur = () => {
            let cleanText = conteudo.innerHTML;
            // Remover a marcação do título do passo para salvar apenas a descrição
            const titleMatch = cleanText.match(/<strong>(.*?)<\/strong><br>/i);
            if (titleMatch) {
                cleanText = cleanText.substring(titleMatch[0].length);
            }
            // Decodificar entidades e remover tags extras inseridas pelo contenteditable
            cleanText = cleanText.replace(/&nbsp;/g, ' ').trim();
            passo.texto = cleanText;
            const qId = window.emPreviewCuracaoId;
            const savedSteps = progressoUsuario.curacaoVal[qId]?.passos_correcao;
            if (savedSteps && savedSteps[activePedagogicalStepIdx]) {
                savedSteps[activePedagogicalStepIdx].texto = cleanText;
            }
        };

        // Drag Bar para Reposicionar
        let dragBar = document.getElementById("balao-drag-bar");
        if (!dragBar) {
            dragBar = document.createElement("div");
            dragBar.id = "balao-drag-bar";
            dragBar.style = "background-color: var(--border); font-size: 0.6rem; text-align: center; color: var(--text-secondary); padding: 4px; border-bottom: 1.5px solid var(--border); font-weight: 850; cursor: move; user-select: none; border-top-left-radius: 18px; border-top-right-radius: 18px;";
            dragBar.innerText = "✥ ARRASTE PARA REPOSICIONAR";
            popup.prepend(dragBar);
        }
        dragBar.style.display = "block";

        let isDragging = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;

        dragBar.onmousedown = function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(popup.style.left) || 0;
            startTop = parseFloat(popup.style.top) || 0;
            document.body.style.cursor = "move";
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = startLeft + dx;
            const newTop = startTop + dy;

            popup.style.left = `${newLeft}px`;
            popup.style.top = `${newTop}px`;
            popup.style.transform = "none";

            // Guardar no passo
            passo.customLeft = `${newLeft}px`;
            passo.customTop = `${newTop}px`;
            
            const qId = window.emPreviewCuracaoId;
            const savedSteps = progressoUsuario.curacaoVal[qId]?.passos_correcao;
            if (savedSteps && savedSteps[activePedagogicalStepIdx]) {
                savedSteps[activePedagogicalStepIdx].customLeft = `${newLeft}px`;
                savedSteps[activePedagogicalStepIdx].customTop = `${newTop}px`;
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = "";
            }
        };

        document.removeEventListener("mousemove", window.currentBalaoDragMove);
        document.removeEventListener("mouseup", window.currentBalaoDragUp);

        window.currentBalaoDragMove = onMouseMove;
        window.currentBalaoDragUp = onMouseUp;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

        // Botão Vincular Termo Selecionado
        let btnVincular = document.getElementById("btn-balao-vincular-destaque");
        if (!btnVincular) {
            btnVincular = document.createElement("button");
            btnVincular.id = "btn-balao-vincular-destaque";
            btnVincular.className = "btn-balao-action";
            btnVincular.style = "background-color: var(--bg-app); border: 2px solid var(--accent); border-radius: 10px; padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: var(--accent); cursor: pointer; margin-right: 6px;";
            btnVincular.innerText = "✨ Linkar Seleção";
            btnVincular.onclick = () => {
                const selText = window.getSelection().toString().trim();
                if (!selText) {
                    alert("Selecione um trecho de texto no enunciado da questão primeiro!");
                    return;
                }
                passo.cor_destaque = "orange"; // grifa com laranja por default no preview
                passo.termo_destaque = selText;

                const qId = window.emPreviewCuracaoId;
                const savedSteps = progressoUsuario.curacaoVal[qId]?.passos_correcao;
                if (savedSteps && savedSteps[activePedagogicalStepIdx]) {
                    savedSteps[activePedagogicalStepIdx].cor_destaque = "orange";
                    savedSteps[activePedagogicalStepIdx].termo_destaque = selText;
                }
                
                // Re-renderizar o balão para refletir a marcação
                mostrarPassoBalao();
                alert(`O termo "${selText}" foi vinculado como destaque para este passo!`);
            };
            const footer = popup.querySelector(".balao-footer-comic");
            if (footer) {
                footer.insertBefore(btnVincular, footer.firstChild);
            }
        }
        btnVincular.style.display = "block";
    } else {
        conteudo.removeAttribute("contenteditable");
        conteudo.style.border = "none";
        conteudo.style.padding = "0";
        conteudo.style.cursor = "default";
        conteudo.title = "";
        conteudo.onblur = null;

        const dragBar = document.getElementById("balao-drag-bar");
        if (dragBar) dragBar.style.display = "none";

        const btnVincular = document.getElementById("btn-balao-vincular-destaque");
        if (btnVincular) btnVincular.style.display = "none";
    }

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

    if (passo.customLeft !== undefined && passo.customTop !== undefined) {
        popup.style.left = passo.customLeft;
        popup.style.top = passo.customTop;
        popup.style.transform = "none";
        popup.className = "balao-explicativo-popup"; // no arrow if custom dragged
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    } else if (targetEl) {
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
        popup.style.transform = "none";

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
        { opacity: 0, scale: 0, transformOrigin: "center center" }, 
        { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" }
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
    
    // Apply current curado values first if any
    let mergedQ = { ...qObj };
    if (progressoUsuario.curacaoVal && progressoUsuario.curacaoVal[qId]) {
        const curado = progressoUsuario.curacaoVal[qId];
        mergedQ = {
            ...mergedQ,
            enunciado: curado.enunciado !== undefined ? curado.enunciado : mergedQ.enunciado,
            gabarito: curado.gabarito !== undefined ? curado.gabarito : mergedQ.gabarito,
            disciplina: curado.disciplina !== undefined ? curado.disciplina : mergedQ.disciplina,
            assunto: curado.assunto !== undefined ? curado.assunto : mergedQ.assunto,
            passos_correcao: curado.passos_correcao !== undefined ? curado.passos_correcao : mergedQ.passos_correcao
        };
    }

    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(mergedQ, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(mergedQ, true);
        focoCard.replaceWith(newFoco);
    }
    
    // Render the steps visually in the editor container
    const steps = mergedQ.passos_correcao || obterAbstractStepsDefault(mergedQ);
    window.atualizarVisualStepsEditor(qId, steps);
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
    
    const passosVal = window.coletarPassosSalvosVisual(qId);

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
    progressoUsuario.curacaoVal[qId].passos_correcao = passosVal;

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

window.toggleSidebarCollapse = function() {
    const layout = document.querySelector(".app-layout");
    const arrow = document.querySelector(".btn-collapse-sidebar .icon-arrow");
    if (layout) {
        const isCollapsed = layout.classList.contains("sidebar-collapsed");
        if (isCollapsed) {
            layout.classList.remove("sidebar-collapsed");
            if (arrow) arrow.innerText = "◀";
            localStorage.setItem("remb_sidebar_collapsed", "false");
        } else {
            layout.classList.add("sidebar-collapsed");
            if (arrow) arrow.innerText = "▶";
            localStorage.setItem("remb_sidebar_collapsed", "true");
        }
    }
};

window.alternarModoSimulado = function() {
    const isChecked = document.getElementById("toggleModoSimulado").checked;
    emModoSimulado = isChecked;
    simuladoFinalizado = false;
    
    const btnFinalizar = document.getElementById("btnFinalizarSimulado");
    if (btnFinalizar) {
        btnFinalizar.style.display = isChecked ? "block" : "none";
    }

    aplicarFiltros();
};

window.finalizarSimulado = function() {
    simuladoFinalizado = true;
    
    let respondidasSimulado = 0;
    let acertosSimulado = 0;
    
    const visibleCards = document.querySelectorAll(".questao-card");
    visibleCards.forEach(card => {
        const qId = card.id.replace("card-", "").replace("foco-card-", "");
        const resp = progressoUsuario.respondidas[qId];
        if (resp) {
            respondidasSimulado++;
            if (resp.correta) acertosSimulado++;
        }
    });

    if (respondidasSimulado === 0) {
        alert("Você não respondeu nenhuma questão neste simulado!");
        simuladoFinalizado = false;
        return;
    }

    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(0,0,0,0.6)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.zIndex = "2000";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.id = "simuladoResultModal";

    const percent = Math.round((acertosSimulado / respondidasSimulado) * 100);

    modal.innerHTML = `
        <div class="result-box" style="background-color: var(--bg-card); padding: 30px; border-radius: 16px; border: 3px solid #000; box-shadow: 6px 6px 0px #000; width: 90%; max-width: 500px; text-align: center; font-family: var(--font-heading);">
            <div style="font-size: 3rem; margin-bottom: 15px;">🏆</div>
            <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary); margin-bottom: 10px;">Simulado Concluído!</h2>
            <p style="font-size: 1.05rem; color: var(--text-secondary); margin-bottom: 25px;">
                Você resolveu <strong>${respondidasSimulado}</strong> questões e obteve <strong>${acertosSimulado}</strong> acertos.
            </p>
            
            <div style="font-size: 2.2rem; font-weight: 800; color: ${percent >= 70 ? 'var(--correta)' : 'var(--errada)'}; margin-bottom: 20px;">
                ${percent}% de Aproveitamento
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
                <button class="btn btn-primary" onclick="window.imprimirRelatorioSimulado()" style="border-radius:10px; font-weight:700; width:100%; box-shadow:2px 2px 0px #000; border:2.5px solid #000; color:#fff;">
                    🖨️ Imprimir / Gerar PDF de Gabarito
                </button>
                <button class="btn btn-outline-secondary" onclick="window.fecharModalSimulado()" style="border-radius:10px; font-weight:600; width:100%;">
                    Ver Detalhes das Resoluções
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    gsap.from("#simuladoResultModal .result-box", { scale: 0.8, opacity: 0, duration: 0.3, ease: "back.out(1.7)" });

    aplicarFiltros();
};

window.fecharModalSimulado = function() {
    const modal = document.getElementById("simuladoResultModal");
    if (modal) {
        gsap.to("#simuladoResultModal .result-box", { scale: 0.8, opacity: 0, duration: 0.25, onComplete: () => modal.remove() });
    }
};

window.imprimirRelatorioSimulado = function() {
    window.fecharModalSimulado();
    setTimeout(() => {
        window.print();
    }, 300);
};

window.alterarOpacidadeGrifos = function(val) {
    const opacity = val / 100;
    document.documentElement.style.setProperty('--highlight-opacity', opacity);
    const display = document.getElementById("opacityDisplay");
    if (display) display.innerText = `${val}%`;
    localStorage.setItem("remb_highlight_opacity", val);
    
    // Salvar no dicionário de memórias de opacidade por caneta
    if (typeof canetaAtiva !== 'undefined' && canetaAtiva && canetaAtiva !== 'eraser') {
        opacidadeCanetas[canetaAtiva] = parseInt(val);
        localStorage.setItem("remb_opacidades_canetas", JSON.stringify(opacidadeCanetas));
    }
    
    if (typeof window.atualizarVisualSliderFlutuante === 'function') {
        window.atualizarVisualSliderFlutuante(parseInt(val));
    }

    // Se houver uma marcação ativa selecionada agora, atualiza especificamente ela
    if (activeHighlightSpan) {
        const cor = activeHighlightSpan.getAttribute("data-color");
        if (cor) {
            activeHighlightSpan.style.setProperty("background-color", obterRGBACorCaneta(cor, val), "important");
            activeHighlightSpan.setAttribute("data-opacity", val);
        }
    }
};

window.alternarHoverCorretivo = function(checked) {
    const sheet = document.getElementById("dynamic-selection-style");
    if (sheet) {
        if (checked) {
            sheet.innerHTML = `
                .em-correcao .termo-erro-tachado[data-tooltip]:hover::after {
                    content: ' (' attr(data-tooltip) ')';
                    color: var(--correta) !important;
                    font-weight: bold;
                    text-decoration: none;
                    display: inline;
                }
            `;
        } else {
            sheet.innerHTML = "";
        }
    }
    localStorage.setItem("remb_hover_corretivo", checked ? "true" : "false");
};

window.inicializarSliderOpacidadeFlutuante = function() {
    const container = document.getElementById("verticalOpacitySliderContainer");
    const handle = document.getElementById("highlighterOpacityHandle");
    const fill = document.getElementById("highlighterOpacityFill");
    
    if (!container || !handle || !fill) return;

    let isDragging = false;

    function atualizarOpacidadeDeY(yRelative) {
        const height = container.clientHeight;
        let pct = 1 - (yRelative / height); // 0 na base, 1 no topo
        pct = Math.max(0, Math.min(1, pct)); // Clampar entre 0 e 1
        
        // Mapear de 15% a 75%
        const opacityVal = Math.round(15 + pct * 60);
        
        window.alterarOpacidadeGrifos(opacityVal);
        
        const sliderAjustes = document.getElementById("opacitySlider");
        if (sliderAjustes) {
            sliderAjustes.value = opacityVal;
            const display = document.getElementById("opacityDisplay");
            if (display) display.innerText = `${opacityVal}%`;
        }
    }

    window.atualizarVisualSliderFlutuante = function(opacityVal) {
        const pct = (opacityVal - 15) / 60;
        const bottomPct = pct * 100;
        
        handle.style.bottom = `calc(${bottomPct}% - 7px)`;
        fill.style.height = `${bottomPct}%`;
    };

    container.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        atualizarOpacidadeDeY(y);
        
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        atualizarOpacidadeDeY(y);
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }

    // Suporte a Toque (Mobile/Tablet)
    container.addEventListener("touchstart", (e) => {
        isDragging = true;
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        const y = touch.clientY - rect.top;
        atualizarOpacidadeDeY(y);
        
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd);
    });

    function onTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        const y = touch.clientY - rect.top;
        atualizarOpacidadeDeY(y);
    }

    function onTouchEnd() {
        isDragging = false;
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
    }
    
    const stored = localStorage.getItem("remb_highlight_opacity") || "45";
    window.atualizarVisualSliderFlutuante(parseInt(stored));
};

window.configurarAtalhosTecladoCaneta = function() {
    document.addEventListener("keydown", (e) => {
        // Ignorar atalhos de teclado se estiver digitando em formulários
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        
        const key = e.key;
        let corTarget = null;
        let btnClass = null;
        
        if (key === '1') { corTarget = 'yellow'; btnClass = '.btn-amarelo'; }
        else if (key === '2') { corTarget = 'green'; btnClass = '.btn-verde'; }
        else if (key === '3') { corTarget = 'blue'; btnClass = '.btn-azul'; }
        else if (key === '4') { corTarget = 'pink'; btnClass = '.btn-rosa'; }
        else if (key === '5') { corTarget = 'orange'; btnClass = '.btn-laranja'; }
        else if (key === '0' || key.toLowerCase() === 'e') { corTarget = 'eraser'; btnClass = '.highlighter-eraser'; }
        else if (key === 'Escape') {
            if (canetaAtiva) {
                const activeBtn = document.querySelector(".sticky-highlighter-bar button.active");
                if (activeBtn) activeBtn.classList.remove("active");
                canetaAtiva = null;
                atualizarSelecaoCSS(null);
                atualizarDicaSemantica(null);
            }
            activeHighlightSpan = null;
            return;
        }
        
        if (corTarget && btnClass) {
            const btnEl = document.querySelector(`.sticky-highlighter-bar ${btnClass}`);
            if (btnEl) {
                setCanetaAtiva(corTarget, btnEl);
            }
        }
    });
};

window.enviarParaLaboratorio = function(qId) {
    const qObj = obterQuestaoPorId(qId);
    if (!qObj) {
        alert("Questão não encontrada!");
        return;
    }

    // Garantir que o array do laboratório exista
    if (typeof QUESTOES_CESPE_TRATADAS === 'undefined') {
        window.QUESTOES_CESPE_TRATADAS = [];
    }

    // Verificar se já existe no laboratório
    const jaExiste = QUESTOES_CESPE_TRATADAS.some(q => q.id === qId);
    if (jaExiste) {
        alert("Esta questão já se encontra no Laboratório de Curação!");
        navegarPara('validacao');
        return;
    }

    // Criar uma cópia isolada da questão
    const copia = JSON.parse(JSON.stringify(qObj));
    
    // Configurar metadados do laboratório
    copia.labId = `LAB-${copia.numero || copia.id.replace(/\D/g, "") || 'ADD'}`;
    if (!copia.origem_importacao) {
        copia.origem_importacao = {
            arquivo: "Importado da Sala",
            numero_original: copia.numero || 1
        };
    }

    // Colocar no início do laboratório
    QUESTOES_CESPE_TRATADAS.unshift(copia);

    // Persistir localmente no progresso do usuário
    if (!progressoUsuario.questoesLaboratorioAdicionais) {
        progressoUsuario.questoesLaboratorioAdicionais = [];
    }
    progressoUsuario.questoesLaboratorioAdicionais.push(copia);
    salvarProgressoLocal();

    // Recarregar os filtros do laboratório
    if (typeof inicializarFiltrosVal === 'function') {
        inicializarFiltrosVal();
    }

    alert(`Questão ${qObj.numero || ''} enviada com sucesso para o Laboratório de Curação!`);
    navegarPara('validacao');
};

let bancaSelecionadaTab = 'todas';

window.selecionarBancaTab = function(banca) {
    bancaSelecionadaTab = banca;
    
    // Atualizar visual das abas
    const tabs = document.querySelectorAll(".banca-tab");
    tabs.forEach(t => {
        if (t.getAttribute("data-banca") === banca) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });

    // Renderizar
    window.renderizarBibliotecaProvas();
};

window.renderizarBibliotecaProvas = function() {
    const container = document.getElementById("provasGridContainer");
    if (!container) return;

    const filterAno = document.getElementById("filterAnoProvas").value;
    const searchVal = document.getElementById("searchProva").value.trim().toLowerCase();

    // Filtrar provas
    const filtradas = BANCO_PROVAS.filter(p => {
        if (bancaSelecionadaTab !== "todas" && p.banca !== bancaSelecionadaTab) return false;
        if (filterAno !== "todos" && p.ano !== filterAno) return false;
        if (searchVal) {
            const matchesSearch = p.orgao.toLowerCase().includes(searchVal) ||
                                  p.cargo.toLowerCase().includes(searchVal) ||
                                  p.banca.toLowerCase().includes(searchVal) ||
                                  p.ano.includes(searchVal);
            if (!matchesSearch) return false;
        }
        return true;
    });

    container.innerHTML = "";

    // Atualizar contador total no primeiro card de estatística
    const totalCountEl = document.getElementById("stats-total-provas");
    if (totalCountEl) {
        totalCountEl.innerText = filtradas.length;
    }

    if (filtradas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary); width: 100%;">
                <p style="font-size: 1.1rem; font-weight: 600;">Nenhuma prova localizada com os filtros ativos.</p>
            </div>
        `;
        return;
    }

    filtradas.forEach(p => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";
        col.style.display = "flex";
        col.style.marginBottom = "20px";

        // Cores específicas por banca para uma estética premium
        let badgeColor = "var(--accent)";
        let badgeBg = "var(--accent-light)";
        let cardBancaClass = "banca-padrao";
        if (p.banca === "Cebraspe") { badgeColor = "#3b82f6"; badgeBg = "rgba(59,130,246,0.1)"; cardBancaClass = "banca-cebraspe"; }
        else if (p.banca === "FGV") { badgeColor = "#f59e0b"; badgeBg = "rgba(245,158,11,0.1)"; cardBancaClass = "banca-fgv"; }
        else if (p.banca === "Cesgranrio") { badgeColor = "#10b981"; badgeBg = "rgba(16,185,129,0.1)"; cardBancaClass = "banca-cesgranrio"; }
        else if (p.banca === "FCC") { badgeColor = "#ec4899"; badgeBg = "rgba(236,72,153,0.1)"; cardBancaClass = "banca-fcc"; }
        else if (p.banca === "Vunesp") { badgeColor = "#a855f7"; badgeBg = "rgba(168,85,247,0.1)"; cardBancaClass = "banca-vunesp"; }

        // Verificar se temos questões associadas a este arquivo localmente
        let hasQuestions = false;
        if (typeof BANCO_QUESTOES !== 'undefined') {
            hasQuestions = BANCO_QUESTOES.some(q => q.origem_importacao?.arquivo === p.file);
        }
        let hasLabQuestions = false;
        if (typeof QUESTOES_CESPE_TRATADAS !== 'undefined') {
            hasLabQuestions = QUESTOES_CESPE_TRATADAS.some(q => q.origem_importacao?.arquivo === p.file);
        }

        col.innerHTML = `
            <div class="premium-prova-card ${cardBancaClass}" style="transition: all 0.25s ease;">
                <div>
                    <!-- Header do Card -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span class="meta-badge" style="background-color: ${badgeBg}; color: ${badgeColor}; font-weight: 800; border: none; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px;">
                            ${p.banca.toUpperCase()}
                        </span>
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">
                            📅 ${p.ano}
                        </span>
                    </div>

                    <!-- Corpo do Card -->
                    <h3 style="font-size:1.08rem; font-weight:800; color:var(--text-primary); margin:0 0 6px 0; line-height:1.35;">
                        ${p.orgao}
                    </h3>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin:0 0 12px 0; font-weight:500;">
                        💼 Cargo: ${p.cargo}
                    </p>
                    
                    <div style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap;">
                        <span style="font-size:0.7rem; background-color:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:2px 8px; color:var(--text-secondary); font-weight:600;">
                            🎓 ${p.nivel}
                        </span>
                        ${hasQuestions ? `
                            <span style="font-size:0.7rem; background-color:var(--correta-light); border:1px solid var(--correta); border-radius:6px; padding:2px 8px; color:var(--correta); font-weight:700;">
                                📝 Simulável (Pilot)
                            </span>
                        ` : ""}
                    </div>
                </div>

                <!-- Ações do Card -->
                <div style="display:flex; gap:10px; border-top: 1px dashed var(--border); padding-top:12px; margin-top:10px;">
                    <button class="btn btn-outline-primary btn-sm" onclick="window.abrirProvaNaSala('${p.id}', '${p.file}', '${p.banca}')" style="flex:1; border-radius:8px; font-size:0.75rem; font-weight:700; padding:6px 8px; border-width:1.5px;">
                        📥 Resolver Sala
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="window.abrirProvaNoLaboratorio('${p.id}', '${p.file}')" style="flex:1; border-radius:8px; font-size:0.75rem; font-weight:700; padding:6px 8px; border-width:1.5px; dots ${hasLabQuestions ? '' : 'opacity:0.6;'}">
                        🧪 Curação Lab
                    </button>
                </div>

                <!-- Arquivos para Download -->
                <div style="display:flex; justify-content:space-between; gap:4px; margin-top:12px; padding-top:8px; border-top: 1px solid var(--border); font-size:0.68rem; font-weight:600; flex-wrap:wrap; user-select:none;">
                    <span style="color:var(--text-secondary); margin-right:4px;">Downloads:</span>
                    <a href="#" onclick="window.baixarArquivoProva(event, '${p.id}', '${p.banca}', '${p.orgao}', '${p.ano}', '${p.cargo}', 'prova')" style="color:var(--accent); text-decoration:none; margin-right:6px;" title="Baixar Caderno de Prova">📄 Prova</a>
                    <a href="#" onclick="window.baixarArquivoProva(event, '${p.id}', '${p.banca}', '${p.orgao}', '${p.ano}', '${p.cargo}', 'gabarito')" style="color:var(--accent); text-decoration:none; margin-right:6px;" title="Baixar Gabarito Oficial">✅ Gabarito</a>
                    <a href="#" onclick="window.baixarArquivoProva(event, '${p.id}', '${p.banca}', '${p.orgao}', '${p.ano}', '${p.cargo}', 'edital')" style="color:var(--accent); text-decoration:none; margin-right:6px;" title="Baixar Edital do Concurso">📘 Edital</a>
                    <a href="#" onclick="window.baixarArquivoProva(event, '${p.id}', '${p.banca}', '${p.orgao}', '${p.ano}', '${p.cargo}', 'recurso')" style="color:var(--accent); text-decoration:none;" title="Baixar Recursos / Pareceres">⚖️ Recurso</a>
                </div>
            </div>
        `;

        // Aplicar micro-animações GSAP
        const cardEl = col.querySelector(".premium-prova-card");
        cardEl.addEventListener("mouseenter", () => {
            gsap.to(cardEl, { y: -4, borderColor: badgeColor, boxShadow: `0 8px 20px rgba(0,0,0,0.06)`, duration: 0.25 });
        });
        cardEl.addEventListener("mouseleave", () => {
            gsap.to(cardEl, { y: 0, borderColor: "var(--border)", boxShadow: "0 4px 10px rgba(0,0,0,0.02)", duration: 0.25 });
        });

        container.appendChild(col);
    });
};

window.aplicarFiltrosProvas = function() {
    window.renderizarBibliotecaProvas();
};

window.abrirProvaNaSala = function(provaId, file, banca) {
    const provaObj = BANCO_PROVAS.find(p => p.id === provaId);
    
    // 1. Achar se há questões desta lista no BANCO_QUESTOES
    let hasQuestions = false;
    if (typeof BANCO_QUESTOES !== 'undefined') {
        hasQuestions = BANCO_QUESTOES.some(q => q.origem_importacao?.arquivo === file);
    }

    if (hasQuestions) {
        globalProvaAtiva = provaObj;
        
        // Ajustar os filtros da Sala de Questões
        const filterLista = document.getElementById("filterListaOrigem");
        if (filterLista) {
            filterLista.value = "todas"; // Não seleciona nenhuma lista de origem (pois veio de prova)
        }
        
        // Segue a banca da prova selecionada
        const filterBanca = document.getElementById("filterBanca");
        if (filterBanca && provaObj) {
            if (provaObj.banca.toLowerCase() === "cebraspe" || provaObj.banca.toLowerCase() === "cespe") {
                filterBanca.value = "Cebraspe";
            } else {
                filterBanca.value = provaObj.banca;
            }
        }
        const filterDisc = document.getElementById("filterDisciplina");
        if (filterDisc) {
            filterDisc.value = "todas";
        }
        const filterAssunto = document.getElementById("filterAssunto");
        if (filterAssunto) {
            filterAssunto.value = "todos";
        }
        
        // Aplicar filtros e navegar para a sala de questões
        aplicarFiltros();
        navegarPara('questoes');
        
        // Avisar ao usuário
        alert(`Filtro aplicado: mostrando as questões do caderno da prova.`);
    } else {
        // Se for uma das provas que levantamos mas cujas questões ainda não foram importadas
        alert(`A prova selecionada está cadastrada no levantamento histórico da Biblioteca, mas o arquivo de questões (${file}) ainda não foi processado pelo pipeline da API da Biblioteca de Concursos (Sister Project).\n\nMocking: Redirecionando para as questões da banca ${banca} na Sala.`);
        
        const filterBanca = document.getElementById("filterBanca");
        if (filterBanca) {
            if (banca === "Cebraspe") filterBanca.value = "CESPE";
            else if (banca === "FGV") filterBanca.value = "FGV";
            else filterBanca.value = "todas";
        }
        
        const filterLista = document.getElementById("filterListaOrigem");
        if (filterLista) filterLista.value = "todas";
        
        aplicarFiltros();
        navegarPara('questoes');
    }
};

window.abrirProvaNoLaboratorio = function(provaId, file) {
    let hasLabQuestions = false;
    if (typeof QUESTOES_CESPE_TRATADAS !== 'undefined') {
        hasLabQuestions = QUESTOES_CESPE_TRATADAS.some(q => q.origem_importacao?.arquivo === file);
    }

    if (hasLabQuestions) {
        const filterVal = document.getElementById("filterListaVal");
        if (filterVal) {
            filterVal.value = file;
        }
        
        aplicarFiltrosVal();
        navegarPara('validacao');
        
        alert(`Fila do Laboratório filtrada pelo arquivo da Prova selecionada.`);
    } else {
        alert(`Não há questões pendentes de curação no Laboratório para este arquivo de prova (${file}). Todas as questões já foram integradas à base oficial de produção.`);
    }
};

/* =====================================
   FUNÇÃO DE DOWNLOAD DE ARQUIVOS DE PROVAS
===================================== */
window.baixarArquivoProva = function(event, provaId, banca, orgao, ano, cargo, tipo) {
    if (event) event.preventDefault();
    
    // Se for a prova do TCU 2026, servimos do backend
    if (provaId === 'cebraspe-tcu-2026') {
        if (tipo === 'prova') {
            window.open('http://localhost:3001/arquivos-provas/cespe-cebraspe-2026-tcu-auditor-federal-de-controle-externo-area-de-controle-externo-orientacao-auditoria-de-tecnologia-da-informacao-prova.pdf', '_blank');
            return;
        }
        if (tipo === 'gabarito') {
            window.open('http://localhost:3001/arquivos-gabaritos/cespe-cebraspe-2026-tcu-auditor-federal-de-controle-externo-area-de-controle-externo-orientacao-auditoria-de-tecnologia-da-informacao-gabarito.pdf', '_blank');
            return;
        }
    }
    
    // Fallback: faz busca no Google pelo PDF do arquivo de origem
    const query = `${banca} ${orgao} ${ano} ${cargo} ${tipo} pdf`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
};

/* =====================================
   FUNÇÕES DO EDITOR VISUAL DE CORREÇÃO
===================================== */
window.atualizarVisualStepsEditor = function(qId, steps) {
    const container = document.getElementById(`visual-steps-container-${qId}`);
    if (!container) return;
    container.innerHTML = "";

    if (steps.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-secondary); font-size:0.85rem; border:1px dashed var(--border); border-radius:8px;">Nenhum passo cadastrado. Adicione um novo passo para configurar.</div>`;
        return;
    }

    steps.forEach((step, idx) => {
        const stepCard = document.createElement("div");
        stepCard.className = "visual-step-card";
        stepCard.style = "background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; position: relative;";
        
        const isGrifar = step.cor_destaque && step.cor_destaque !== 'none' && step.cor_destaque !== 'tachar';
        const isTachar = step.cor_destaque === 'tachar';

        let effectVal = "none";
        if (isGrifar) effectVal = "grifar";
        if (isTachar) effectVal = "tachar";

        stepCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:6px;">
                <span style="font-size:0.8rem; font-weight:800; color:var(--accent);">Passo #${idx + 1}</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.moverPassoVisual('${qId}', ${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="padding:2px 6px; font-size:0.7rem; cursor:pointer;">▲</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.moverPassoVisual('${qId}', ${idx}, 1)" ${idx === steps.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="padding:2px 6px; font-size:0.7rem; cursor:pointer;">▼</button>
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="window.removerPassoVisual('${qId}', ${idx})" style="padding:2px 6px; font-size:0.7rem; color:var(--errada); border-color:var(--errada); cursor:pointer;">Excluir</button>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Título do Passo:</label>
                        <input type="text" class="step-title-${qId}" value="${step.titulo || ''}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem;">
                    </div>
                    <div style="width:140px;">
                        <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Foco / Alvo:</label>
                        <select class="step-target-${qId}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem; cursor:pointer;">
                            <option value="header" ${step.target === 'header' ? 'selected' : ''}>Cabeçalho</option>
                            <option value="enunciado" ${step.target === 'enunciado' ? 'selected' : ''}>Enunciado</option>
                            <option value="gabarito" ${step.target === 'gabarito' ? 'selected' : ''}>Gabarito</option>
                            <option value="A" ${step.target === 'A' ? 'selected' : ''}>Alternativa A</option>
                            <option value="B" ${step.target === 'B' ? 'selected' : ''}>Alternativa B</option>
                            <option value="C" ${step.target === 'C' ? 'selected' : ''}>Alternativa C</option>
                            <option value="D" ${step.target === 'D' ? 'selected' : ''}>Alternativa D</option>
                            <option value="E" ${step.target === 'E' ? 'selected' : ''}>Alternativa E</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Texto do Balão:</label>
                    <textarea class="step-text-${qId}" style="width:100%; min-height:50px; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem; font-family:inherit; resize:vertical; line-height:1.3;">${step.texto || ''}</textarea>
                </div>
                
                <div style="display:flex; gap:10px; align-items:flex-end;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Efeito Visual:</label>
                        <select class="step-effect-${qId}" onchange="window.toggleStepEffectFields('${qId}', dots ${idx}, this.value)" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem; cursor:pointer;">
                            <option value="none" ${effectVal === 'none' ? 'selected' : ''}>Nenhum</option>
                            <option value="grifar" ${effectVal === 'grifar' ? 'selected' : ''}>Grifar Termo do Enunciado</option>
                            <option value="tachar" ${effectVal === 'tachar' ? 'selected' : ''}>Tachar Alternativa</option>
                        </select>
                    </div>
                    
                    <div id="step-highlight-inputs-${qId}-dots ${idx}" style="flex:2; display:dots ${effectVal === 'grifar' ? 'flex' : 'none'}; gap:6px;">
                        <div style="flex:2;">
                            <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Termo a ser Grifado:</label>
                            <input type="text" class="step-term-${qId}" value="${step.termo_destaque || ''}" placeholder="Ex: desvio de poder" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.72rem; font-weight:600; margin-bottom:2px; color:var(--text-secondary);">Cor:</label>
                            <select class="step-color-${qId}" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--border); background-color:var(--bg-app); color:var(--text-primary); font-size:0.82rem; cursor:pointer;">
                                <option value="orange" ${step.cor_destaque === 'orange' ? 'selected' : ''}>Laranja (Fato)</option>
                                <option value="green" ${step.cor_destaque === 'green' ? 'selected' : ''}>Verde (Comando)</option>
                                <option value="blue" ${step.cor_destaque === 'blue' ? 'selected' : ''}>Azul (Norma)</option>
                                <option value="pink" ${step.cor_destaque === 'pink' ? 'selected' : ''}>Rosa (Dados)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(stepCard);
    });
};

window.toggleStepEffectFields = function(qId, idx, value) {
    const fieldsDiv = document.getElementById(`step-highlight-inputs-${qId}-${idx}`);
    if (fieldsDiv) {
        fieldsDiv.style.display = value === 'grifar' ? 'flex' : 'none';
    }
};

window.adicionarPassoVisual = function(qId) {
    const steps = window.coletarPassosSalvosVisual(qId);
    steps.push({
        titulo: "Novo Passo",
        texto: "",
        target: "header",
        cor_destaque: "none",
        termo_destaque: ""
    });
    window.atualizarVisualStepsEditor(qId, steps);
};

window.removerPassoVisual = function(qId, idx) {
    const steps = window.coletarPassosSalvosVisual(qId);
    steps.splice(idx, 1);
    window.atualizarVisualStepsEditor(qId, steps);
};

window.moverPassoVisual = function(qId, idx, direcao) {
    const steps = window.coletarPassosSalvosVisual(qId);
    const targetIdx = idx + direcao;
    if (targetIdx >= 0 && targetIdx < steps.length) {
        const temp = steps[idx];
        steps[idx] = steps[targetIdx];
        steps[targetIdx] = temp;
        window.atualizarVisualStepsEditor(qId, steps);
    }
};

window.coletarPassosSalvosVisual = function(qId) {
    const container = document.getElementById(`visual-steps-container-${qId}`);
    if (!container) return [];
    
    const cards = container.querySelectorAll(".visual-step-card");
    const steps = [];
    
    cards.forEach((card) => {
        const title = card.querySelector(`.step-title-${qId}`).value.trim();
        const target = card.querySelector(`.step-target-${qId}`).value;
        const text = card.querySelector(`.step-text-${qId}`).value.trim();
        const effect = card.querySelector(`.step-effect-${qId}`).value;
        
        let cor_destaque = "none";
        let termo_destaque = "";
        
        if (effect === 'grifar') {
            cor_destaque = card.querySelector(`.step-color-${qId}`).value;
            termo_destaque = card.querySelector(`.step-term-${qId}`).value.trim();
        } else if (effect === 'tachar') {
            cor_destaque = "tachar";
        }
        
        steps.push({
            titulo: title,
            texto: text,
            target: target,
            cor_destaque: cor_destaque,
            termo_destaque: termo_destaque
        });
    });
    
    return steps;
};

/* ==========================================================================
   MELHORIAS: PREVIEW DA CORREÇÃO & PAINEL DE ESTATÍSTICAS
   ========================================================================== */
window.emPreviewCuracaoId = null;

window.gerarPreviewCorrecao = function(qId) {
    // 1. Coletar os valores do editor
    const enunciadoVal = document.getElementById(`edit-enunciado-${qId}`).value.trim();
    const gabaritoVal = document.getElementById(`edit-gabarito-${qId}`).value;
    const bancaVal = document.getElementById(`edit-banca-${qId}`).value.trim();
    const disciplinaVal = document.getElementById(`edit-disciplina-${qId}`).value.trim();
    const assuntoVal = document.getElementById(`edit-assunto-${qId}`).value.trim();
    const passosVal = window.coletarPassosSalvosVisual(qId);

    // 2. Salvar temporariamente no progressoUsuario para que o card renderizado leia as alterações
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
    progressoUsuario.curacaoVal[qId].passos_correcao = passosVal;

    // 3. Ativar flag de preview
    window.emPreviewCuracaoId = qId;
    questaoEmEdicaoId = null; // para que criarQuestaoCard não renderize a tela de edição

    // 4. Forçar re-renderização do card em modo solved normal (com a barra de preview)
    const qObj = obterQuestaoPorId(qId);
    
    // Mesclar temporariamente no objeto qObj para visualização correta
    const mergedQ = {
        ...qObj,
        enunciado: enunciadoVal,
        gabarito: gabaritoVal,
        disciplina: disciplinaVal,
        assunto: assuntoVal,
        passos_correcao: passosVal,
        origem_questao: { ...qObj.origem_questao, banca: bancaVal }
    };

    const card = document.getElementById(`card-${qId}`);
    if (card) {
        const newCard = criarQuestaoCard(mergedQ, false);
        card.replaceWith(newCard);
    }
    const focoCard = document.getElementById(`foco-card-${qId}`);
    if (focoCard) {
        const newFoco = criarQuestaoCard(mergedQ, true);
        focoCard.replaceWith(newFoco);
    }

    // 5. Iniciar a correção pedagógica automaticamente
    setTimeout(() => {
        iniciarCorrecaoPedagogica(qId);
    }, 100);
};

window.voltarAoEditor = function(qId) {
    // Fechar o balão pedagógico se estiver aberto
    fecharModoCorrecao();

    // Limpar flag de preview
    window.emPreviewCuracaoId = null;
    
    // Abrir editor inline novamente
    window.editarQuestaoInline(qId);
};

// Formata segundos em HH:MM:SS
function formatarTempoHHMMSS(segundos) {
    if (!segundos || segundos < 0) return "00:00:00";
    const h = String(Math.floor(segundos / 3600)).padStart(2, '0');
    const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
    const s = String(segundos % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

window.renderizarEstatisticasDetalhadas = function() {
    // 1. Tempo na Sala & Tempo Médio
    const tempoTotalSala = progressoUsuario.tempoTotalSala || 0;
    const statsTempoEstudo = document.getElementById("stats-tempo-estudo");
    if (statsTempoEstudo) {
        statsTempoEstudo.innerText = formatarTempoHHMMSS(tempoTotalSala);
    }

    const respondidas = progressoUsuario.respondidas || {};
    const keys = Object.keys(respondidas);
    const totalResolvidas = keys.length;

    let somaTempos = 0;
    let acertos = 0;
    let erros = 0;
    const temposValidos = [];

    keys.forEach(k => {
        const r = respondidas[k];
        if (r.correta) acertos++;
        else erros++;

        const t = r.tempoGasto || 0;
        somaTempos += t;
        if (t > 0) {
            temposValidos.push(t);
        }
    });

    const taxaAcerto = totalResolvidas > 0 ? Math.round((acertos / totalResolvidas) * 100) : 0;
    const tempoMedio = totalResolvidas > 0 ? Math.round(somaTempos / totalResolvidas) : 0;

    const statsTempoMedio = document.getElementById("stats-tempo-medio");
    if (statsTempoMedio) {
        statsTempoMedio.innerText = `${tempoMedio}s`;
    }

    // Aproveitamento
    const statsTaxaAcerto = document.getElementById("stats-taxa-acerto");
    if (statsTaxaAcerto) {
        statsTaxaAcerto.innerText = `${taxaAcerto}%`;
    }
    const statsNumAcertos = document.getElementById("stats-num-acertos");
    if (statsNumAcertos) {
        statsNumAcertos.innerText = `${acertos} acertos`;
    }
    const statsNumErros = document.getElementById("stats-num-erros");
    if (statsNumErros) {
        statsNumErros.innerText = `${erros} erros`;
    }

    // Min / Max Tempo
    const statsMaxTempo = document.getElementById("stats-max-tempo");
    const statsMinTempo = document.getElementById("stats-min-tempo");
    if (temposValidos.length > 0) {
        const maxT = Math.max(...temposValidos);
        const minT = Math.min(...temposValidos);
        if (statsMaxTempo) statsMaxTempo.innerText = `${maxT}s`;
        if (statsMinTempo) statsMinTempo.innerText = `${minT}s`;
    } else {
        if (statsMaxTempo) statsMaxTempo.innerText = "0s";
        if (statsMinTempo) statsMinTempo.innerText = "0s";
    }

    // 2. Agrupamentos de Subdivisão
    const dadosBancas = {};
    const dadosCargos = {};
    const dadosDisciplinas = {};
    const dadosAssuntos = {};

    keys.forEach(k => {
        const q = obterQuestaoPorId(k);
        if (!q) return;

        const r = respondidas[k];
        const tempo = r.tempoGasto || 0;
        const correto = !!r.correta;

        // Metadados
        const banca = q.origem_questao?.banca || "CESPE";
        const cargo = q.origem_questao?.cargo || "Não Informado";
        const disciplina = q.disciplina || "Geral";
        const assunto = q.assunto || "Geral";

        const updateGrupo = (grupo, chave) => {
            if (!grupo[chave]) {
                grupo[chave] = { acertos: 0, erros: 0, tempoTotal: 0, total: 0 };
            }
            grupo[chave].total++;
            grupo[chave].tempoTotal += tempo;
            if (correto) grupo[chave].acertos++;
            else grupo[chave].erros++;
        };

        updateGrupo(dadosBancas, banca);
        updateGrupo(dadosCargos, cargo);
        updateGrupo(dadosDisciplinas, disciplina);
        updateGrupo(dadosAssuntos, assunto);
    });

    // Função interna para preencher as tabelas no HTML
    const renderListaCategoria = (dados, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        const subKeys = Object.keys(dados);
        if (subKeys.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-secondary); font-size:0.82rem;">Nenhum dado de resolução registrado.</div>`;
            return;
        }

        // Ordenar por volume de resoluções decrescente
        subKeys.sort((a, b) => dados[b].total - dados[a].total);

        subKeys.forEach(sk => {
            const item = dados[sk];
            const accRate = Math.round((item.acertos / item.total) * 100);
            const avgT = Math.round(item.tempoTotal / item.total);

            const row = document.createElement("div");
            row.className = "category-stat-row";
            row.innerHTML = `
                <div class="category-stat-meta">
                    <span class="category-stat-label-text" title="${sk}">${sk}</span>
                    <span class="category-stat-count">${item.total} res. | ${accRate}% acerto</span>
                </div>
                <div class="category-stat-bar-container" style="margin-top: 4px;">
                    <div class="category-stat-bar-fill" style="width: ${accRate}%; background-color: ${accRate >= 70 ? 'var(--correta)' : accRate >= 50 ? '#f59e0b' : 'var(--errada)'};"></div>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-secondary); display:flex; justify-content:space-between; margin-top:2px;">
                    <span>🟢 ${item.acertos} acertos | 🔴 ${item.erros} erros</span>
                    <span>⏱️ Média: ${avgT}s</span>
                </div>
            `;
            container.appendChild(row);
        });
    };

    renderListaCategoria(dadosBancas, "stats-bancas-list");
    renderListaCategoria(dadosCargos, "stats-cargos-list");
    renderListaCategoria(dadosDisciplinas, "stats-disciplinas-list");
    renderListaCategoria(dadosAssuntos, "stats-assuntos-list");
};

// ==========================================================================
// IMPORTAÇÃO DE QUESTÕES VUNESP (PILOTO) PARA A SALA
// ==========================================================================
const QUESTOES_NOVAS_VUNESP = [
    {
        "id": "Q_VUNESP_TJSP_2025_01",
        "numero": 1,
        "tipo": "multipla_escolha",
        "disciplina": "Direito Civil",
        "assunto": "LINDB",
        "subassunto": "",
        "contexto": "",
        "enunciado": "De acordo com a Lei de Introdução às Normas do Direito Brasileiro (LINDB), na interpretação das normas sobre gestão pública, serão considerados os obstáculos e as dificuldades reais do gestor e as exigências das políticas públicas a seu cargo, sem prejuízo dos direitos dos administrados. À luz dessas regras, assinale a opção correta.",
        "imagem": "",
        "alternativas": [
            { "letra": "A", "texto": "A decisão que decretar a invalidação de ato, contrato, ajuste, processo ou norma administrativa deverá indicar de modo expresso suas consequências jurídicas e administrativas." },
            { "letra": "B", "texto": "A decisão judicial poderá impor obrigações novas sem considerar as circunstâncias práticas do caso." },
            { "letra": "C", "texto": "A invalidação do ato dispensa a análise da regularização proporcional e equânime." },
            { "letra": "D", "texto": "Na declaração de invalidação de ato administrativo, a motivação pode ser genérica ou abstrata." },
            { "letra": "E", "texto": "As regras de direito público aplicam-se sem qualquer ponderação de custos e benefícios." }
        ],
        "gabarito": "A",
        "comentarios_professor": "",
        "fonte_resposta": "",
        "mnemonico": "",
        "comentarios_alunos": [],
        "dificuldade": "Difícil",
        "tags": ["LINDB", "Gestão Pública"],
        "favorita": false,
        "errada_pelo_usuario": false,
        "anotacoes": "",
        "origem_questao": { "banca": "Vunesp", "orgao": "TJ-SP", "cargo": "Juiz Substituto", "ano": "2025", "prova": "191º Concurso" },
        "origem_importacao": { "nome": "Biblioteca", "arquivo": "tjsp_juiz_2025.json", "numero_original": 1, "data_importacao": "2026-07-26T12:15:00Z" }
    },
    {
        "id": "Q_VUNESP_TJSP_2023_01",
        "numero": 1,
        "tipo": "multipla_escolha",
        "disciplina": "Direito Penal",
        "assunto": "Crimes contra a Administração Pública",
        "subassunto": "",
        "contexto": "",
        "enunciado": "O funcionário público que, antes de assumir a função, mas em razão dela, exige para si vantagem indevida, comete o crime de:",
        "imagem": "",
        "alternativas": [
            { "letra": "A", "texto": "Concussão." },
            { "letra": "B", "texto": "Corrupção passiva." },
            { "letra": "C", "texto": "Prevaricação." },
            { "letra": "D", "texto": "Peculato." },
            { "letra": "E", "texto": "Excesso de exação." }
        ],
        "gabarito": "A",
        "comentarios_professor": "",
        "fonte_resposta": "",
        "mnemonico": "",
        "comentarios_alunos": [],
        "dificuldade": "Média",
        "tags": ["Dos Crimes", "Funcionário Público"],
        "favorita": false,
        "errada_pelo_usuario": false,
        "anotacoes": "",
        "origem_questao": { "banca": "Vunesp", "orgao": "TJ-SP", "cargo": "Juiz Substituto", "ano": "2023", "prova": "190º Concurso" },
        "origem_importacao": { "nome": "Biblioteca", "arquivo": "tjsp_juiz_2023.json", "numero_original": 1, "data_importacao": "2026-07-26T12:15:00Z" }
    },
    {
        "id": "Q_VUNESP_MPSP_2026_01",
        "numero": 1,
        "tipo": "multipla_escolha",
        "disciplina": "Direito Constitucional",
        "assunto": "Ministério Público",
        "subassunto": "",
        "contexto": "",
        "enunciado": "Assinale a opção correta a respeito das funções institucionais do Ministério Público previstas na Constituição Federal de 1988:",
        "imagem": "",
        "alternativas": [
            { "letra": "A", "texto": "Promover, privativamente, a ação penal pública, na forma da lei." },
            { "letra": "B", "texto": "Exercer a representação judicial de entidades públicas de direito privado." },
            { "letra": "C", "texto": "Exercer a advocacia pública no âmbito dos poderes estaduais." },
            { "letra": "D", "texto": "Impedir a instauração de inquérito civil para proteção do patrimônio público." },
            { "letra": "E", "texto": "Promover a defense de direitos individuais." }
        ],
        "gabarito": "A",
        "comentarios_professor": "",
        "fonte_resposta": "",
        "mnemonico": "",
        "comentarios_alunos": [],
        "dificuldade": "Média",
        "tags": ["MP", "Funções Institucionais"],
        "favorita": false,
        "errada_pelo_usuario": false,
        "anotacoes": "",
        "origem_questao": { "banca": "Vunesp", "orgao": "MP-SP", "cargo": "Promotor de Justiça", "ano": "2026", "prova": "96º Concurso" },
        "origem_importacao": { "nome": "Biblioteca", "arquivo": "mpsp_promotor_2026.json", "numero_original": 1, "data_importacao": "2026-07-26T12:15:00Z" }
    },
    {
        "id": "Q_VUNESP_PCSP_2023_01",
        "numero": 1,
        "tipo": "multipla_escolha",
        "disciplina": "Direito Processual Penal",
        "assunto": "Inquérito Policial",
        "subassunto": "",
        "contexto": "",
        "enunciado": "O inquérito policial, instrumento de investigação de caráter administrativo, possui como característica a indisponibilidade. Isso significa que:",
        "imagem": "",
        "alternativas": [
            { "letra": "A", "texto": "A autoridade policial não poderá mandar arquivar autos de inquérito." },
            { "letra": "B", "texto": "O inquérito não pode ser iniciado de ofício pelo delegado de polícia." },
            { "letra": "C", "texto": "A investigação deve ser mantida em sigilo absoluto para o defensor do investigado." },
            { "letra": "D", "texto": "O Ministério Público é obrigado a oferecer denúncia com base exclusiva no inquérito." },
            { "letra": "E", "texto": "O juiz pode requisitar o prosseguimento das investigações após a manifestação de arquivamento do MP." }
        ],
        "gabarito": "A",
        "comentarios_professor": "",
        "fonte_resposta": "",
        "mnemonico": "",
        "comentarios_alunos": [],
        "dificuldade": "Difícil",
        "tags": ["Inquérito Policial", "CPP"],
        "favorita": false,
        "errada_pelo_usuario": false,
        "anotacoes": "",
        "origem_questao": { "banca": "Vunesp", "orgao": "PC-SP", "cargo": "Delegado de Polícia", "ano": "2023", "prova": "Prova Regular" },
        "origem_importacao": { "nome": "Biblioteca", "arquivo": "pcsp_delegado_2023.json", "numero_original": 1, "data_importacao": "2026-07-26T12:15:00Z" }
    }
];

if (typeof BANCO_QUESTOES !== 'undefined' && Array.isArray(BANCO_QUESTOES)) {
    QUESTOES_NOVAS_VUNESP.forEach(q => {
        if (!BANCO_QUESTOES.some(bq => bq.id === q.id)) {
            BANCO_QUESTOES.unshift(q);
        }
    });
}

/* ==========================================================================
   MÓDULO: PLANNER DE ESTUDOS & CICLOS DE ESTUDOS (REATIVIDADE COMPLETA)
   ========================================================================== */

// Variáveis Globais de Controle de Aba e Grade
window.plannerSubTabAtiva = 'ciclo'; // 'ciclo' | 'horarios' | 'acompanhamento'
window.currentDayIndexPlanner = 0;   // 0 (Seg) a 6 (Dom)
window.legendTypePlanner = 'empty';  // pincel ativo
window.dragMouseDownPlanner = false;

window.materiaSelecionadasPlanner = ["Direito Constitucional", "Direito Penal", "Direito Administrativo"];
window.frequenciaSelecionadaPlanner = 3; // default: 3x na semana
window.plannerObjetivo = "horas";

// Listener global para o arrastar da grade
document.addEventListener('mouseup', () => {
    window.dragMouseDownPlanner = false;
});

// Garante que o template e variáveis persistentes existam no estado do usuário
function verificarEstruturaEstadoPlanner() {
    if (!progressoUsuario.planner) {
        progressoUsuario.planner = {
            cicloAtivo: false,
            emExibicaoRelatorio: false,
            config: {},
            progresso: { totalRealizado: 0, historicoDias: {}, questoesCiclo: [] }
        };
    }
    const defaultWeeklyTemplate = {
        0: Array(24).fill('empty'), // Seg
        1: Array(24).fill('empty'),
        2: Array(24).fill('empty'),
        3: Array(24).fill('empty'),
        4: Array(24).fill('empty'),
        5: Array(24).fill('empty'),
        6: Array(24).fill('empty')  // Dom
    };
    for (let day = 0; day < 5; day++) {
        for (let h = 0; h <= 6; h++) defaultWeeklyTemplate[day][h] = 'rest';
        defaultWeeklyTemplate[day][23] = 'rest';
        for (let h = 8; h <= 11; h++) defaultWeeklyTemplate[day][h] = 'work';
        for (let h = 13; h <= 16; h++) defaultWeeklyTemplate[day][h] = 'work';
        if (day === 0 || day === 2 || day === 4) {
            defaultWeeklyTemplate[day][18] = 'gym';
            defaultWeeklyTemplate[day][19] = 'gym';
        } else {
            defaultWeeklyTemplate[day][18] = 'random';
        }
    }
    for (let day = 5; day <= 6; day++) {
        for (let h = 0; h <= 7; h++) defaultWeeklyTemplate[day][h] = 'rest';
        for (let h = 22; h <= 23; h++) defaultWeeklyTemplate[day][h] = 'rest';
    }

    if (!progressoUsuario.weeklyTemplate) {
        progressoUsuario.weeklyTemplate = defaultWeeklyTemplate;
    }
    if (!progressoUsuario.overrideDays) {
        progressoUsuario.overrideDays = {};
    }
    if (!progressoUsuario.plannerHistory) {
        progressoUsuario.plannerHistory = [];
    }
}

// 0. CONTROLADOR DE NAVEGAÇÃO DE SUB-ABAS
window.renderizarPlanner = function() {
    const container = document.getElementById("section-planner");
    if (!container) return;

    verificarEstruturaEstadoPlanner();

    // Injetar cabeçalho de sub-abas e contêiner dinâmico
    container.innerHTML = `
        <div class="planner-subtabs">
            <button class="planner-subtab ${window.plannerSubTabAtiva === 'ciclo' ? 'active' : ''}" onclick="window.renderizarSubTabPlanner('ciclo')">📅 Ciclo de Estudos</button>
            <button class="planner-subtab ${window.plannerSubTabAtiva === 'horarios' ? 'active' : ''}" onclick="window.renderizarSubTabPlanner('horarios')">🕒 Quadro de Horários</button>
            <button class="planner-subtab ${window.plannerSubTabAtiva === 'acompanhamento' ? 'active' : ''}" onclick="window.renderizarSubTabPlanner('acompanhamento')">📈 Acompanhamento & Metas</button>
        </div>
        <div id="planner-subtab-content"></div>
    `;

    const subContainer = document.getElementById("planner-subtab-content");
    const p = progressoUsuario.planner;

    if (window.plannerSubTabAtiva === 'ciclo') {
        if (p.emExibicaoRelatorio) {
            window.renderizarRelatorioPlanner(subContainer);
        } else if (!p.cicloAtivo) {
            window.renderizarFormConfigPlanner(subContainer);
        } else {
            window.renderizarDashboardCicloPlanner(subContainer);
        }
    } else if (window.plannerSubTabAtiva === 'horarios') {
        window.renderizarQuadroHorarios(subContainer);
    } else if (window.plannerSubTabAtiva === 'acompanhamento') {
        window.renderizarAcompanhamentoMetas(subContainer);
    }
};

window.renderizarSubTabPlanner = function(tabName) {
    window.plannerSubTabAtiva = tabName;
    window.renderizarPlanner();
};

// 1. SUB-ABA 1: ONBOARDING CONFIG
window.renderizarFormConfigPlanner = function(container) {
    const materiasDisponiveis = [
        "Direito Administrativo",
        "Direito Constitucional",
        "Direito Penal",
        "Direito Processual Penal",
        "Direito Civil",
        "Contabilidade Pública",
        "Criminologia",
        "Língua Portuguesa"
    ];

    let materiasHTML = "";
    materiasDisponiveis.forEach(m => {
        const checked = window.materiaSelecionadasPlanner.includes(m) ? "checked" : "";
        const pesoId = `peso-${m.replace(/\s+/g, '-')}`;
        materiasHTML += `
            <div class="planner-materia-row" style="margin-bottom: 10px;">
                <label style="font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                    <input type="checkbox" id="chk-${m.replace(/\s+/g, '-')}" value="${m}" ${checked} onchange="window.toggleMateriaSelecao('${m}')">
                    ${m}
                </label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: bold;">Peso:</span>
                    <input type="range" id="${pesoId}" min="1" max="5" value="3" style="width: 70px; cursor: pointer;" oninput="document.getElementById('lbl-${pesoId}').innerText = this.value">
                    <span id="lbl-${pesoId}" style="font-weight: bold; font-size: 0.8rem; min-width: 12px; color: var(--text-primary);">3</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="planner-banner">
            <h1 class="planner-banner-title">📅 Planner de Estudos</h1>
            <p class="planner-banner-desc">Monte seu Ciclo de Estudos personalizado. Organize matérias, pesos e defina a sua carga horária de forma dinâmica.</p>
        </div>

        <div class="planner-grid-config">
            <!-- Coluna 1: Metas e Frequência -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h2 style="font-size: 1.25rem; font-weight: 850; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; color: var(--text-primary);">⚙️ Configurações Gerais</h2>
                
                <!-- Objetivo -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.85rem; font-weight: 750; color: var(--text-secondary); display: block; margin-bottom: 8px;">Objetivo Principal do Ciclo</label>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline-primary active" id="btn-obj-horas" onclick="window.setObjetivoPlanner('horas')" style="flex:1; font-weight: 750;">⏱️ Horas de Estudo</button>
                        <button class="btn btn-outline-primary" id="btn-obj-questoes" onclick="window.setObjetivoPlanner('questoes')" style="flex:1; font-weight: 750;">📝 Questões Resolvidas</button>
                    </div>
                </div>

                <!-- Meta Total -->
                <div style="margin-bottom: 20px;">
                    <label for="metaTotalInput" id="lblMetaTotal" style="font-size: 0.85rem; font-weight: 750; color: var(--text-secondary); display: block; margin-bottom: 8px;">Meta Total: 40 horas</label>
                    <input type="range" id="metaTotalInput" min="10" max="200" value="40" step="5" style="width: 100%; cursor: pointer;" oninput="window.atualizarLabelMetaTotal(this.value)">
                </div>

                <!-- Frequência -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.85rem; font-weight: 750; color: var(--text-secondary); display: block; margin-bottom: 8px;">Frequência Semanal de Estudos</label>
                    <div class="planner-freq-group">
                        <div class="planner-freq-card ${window.frequenciaSelecionadaPlanner === 2 ? 'active' : ''}" onclick="window.setFrequenciaPlanner(2)">2x / semana</div>
                        <div class="planner-freq-card ${window.frequenciaSelecionadaPlanner === 3 ? 'active' : ''}" onclick="window.setFrequenciaPlanner(3)">3x / semana</div>
                        <div class="planner-freq-card ${window.frequenciaSelecionadaPlanner === 5 ? 'active' : ''}" onclick="window.setFrequenciaPlanner(5)">5x / semana</div>
                        <div class="planner-freq-card ${window.frequenciaSelecionadaPlanner === 7 ? 'active' : ''}" onclick="window.setFrequenciaPlanner(7)">Diário (7x)</div>
                    </div>
                </div>

                <!-- Finais de semana e Feriados -->
                <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                    <label for="chkFinaisDeSemana" style="font-size: 0.88rem; font-weight: 750; color: var(--text-secondary); cursor: pointer;">Estudar Finais de Semana e Feriados?</label>
                    <input type="checkbox" id="chkFinaisDeSemana" checked style="width: 18px; height: 18px; cursor: pointer;">
                </div>

                <!-- Carga Diária -->
                <div style="margin-bottom: 20px;">
                    <label for="cargaDiariaInput" id="lblCargaDiaria" style="font-size: 0.85rem; font-weight: 750; color: var(--text-secondary); display: block; margin-bottom: 8px;">Carga por Sessão: 2 horas</label>
                    <input type="range" id="cargaDiariaInput" min="1" max="8" value="2" style="width: 100%; cursor: pointer;" oninput="document.getElementById('lblCargaDiaria').innerText = 'Carga por Sessão: ' + this.value + ' horas'">
                </div>
            </div>

            <!-- Coluna 2: Seleção de Disciplinas -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 850; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; color: var(--text-primary);">📚 Disciplinas e Distribuição</h2>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 15px;">Selecione as disciplinas que deseja estudar e configure o peso de prioridade de cada uma (pesos maiores terão mais espaço no ciclo).</p>
                    
                    <div style="max-height: 310px; overflow-y: auto; padding-right: 8px;">
                        ${materiasHTML}
                    </div>
                </div>

                <div style="margin-top: 25px;">
                    <button class="btn btn-primary" onclick="window.iniciarNovoCiclo()" style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 800; border-radius: 10px; background-color: var(--accent); border-color: var(--accent); color: #fff;">
                        🚀 Iniciar Ciclo de Estudos
                    </button>
                </div>
            </div>
        </div>
    `;
    window.setObjetivoPlanner(window.plannerObjetivo);
};

window.setObjetivoPlanner = function(obj) {
    window.plannerObjetivo = obj;
    const btnHoras = document.getElementById("btn-obj-horas");
    const btnQuestoes = document.getElementById("btn-obj-questoes");
    const sliderMeta = document.getElementById("metaTotalInput");

    if (btnHoras && btnQuestoes && sliderMeta) {
        if (obj === "horas") {
            btnHoras.classList.add("active");
            btnQuestoes.classList.remove("active");
            sliderMeta.min = "10";
            sliderMeta.max = "200";
            sliderMeta.value = "40";
            window.atualizarLabelMetaTotal(40);
        } else {
            btnHoras.classList.remove("active");
            btnQuestoes.classList.add("active");
            sliderMeta.min = "50";
            sliderMeta.max = "1000";
            sliderMeta.value = "200";
            window.atualizarLabelMetaTotal(200);
        }
    }
};

window.atualizarLabelMetaTotal = function(val) {
    const lbl = document.getElementById("lblMetaTotal");
    if (lbl) {
        if (window.plannerObjetivo === "horas") {
            lbl.innerText = `Meta Total: ${val} horas`;
        } else {
            lbl.innerText = `Meta Total: ${val} questões`;
        }
    }
};

window.setFrequenciaPlanner = function(freq) {
    window.frequenciaSelecionadaPlanner = freq;
    const container = document.getElementById("planner-subtab-content");
    if (container) window.renderizarFormConfigPlanner(container);
};

window.toggleMateriaSelecao = function(materia) {
    const idx = window.materiaSelecionadasPlanner.indexOf(materia);
    if (idx >= 0) {
        window.materiaSelecionadasPlanner.splice(idx, 1);
    } else {
        window.materiaSelecionadasPlanner.push(materia);
    }
};

// 2. TELA DE CONFIGURAÇÃO: INICIAR CICLO
window.iniciarNovoCiclo = function() {
    if (window.materiaSelecionadasPlanner.length === 0) {
        alert("Por favor, selecione ao menos uma disciplina para o ciclo!");
        return;
    }

    const metaVal = parseInt(document.getElementById("metaTotalInput").value);
    const cargaVal = parseInt(document.getElementById("cargaDiariaInput").value);
    const finaisDeSemana = document.getElementById("chkFinaisDeSemana").checked;

    const materiasConfig = [];
    window.materiaSelecionadasPlanner.forEach(m => {
        const pesoEl = document.getElementById(`peso-${m.replace(/\s+/g, '-')}`);
        const peso = pesoEl ? parseInt(pesoEl.value) : 3;
        materiasConfig.push({ nome: m, peso: peso });
    });

    const materiasPool = [];
    materiasConfig.forEach(m => {
        for (let i = 0; i < m.peso; i++) {
            materiasPool.push(m.nome);
        }
    });

    let poolIndex = 0;
    const historicoDias = {};
    const hoje = new Date();
    const diasSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let i = 0; i < 7; i++) {
        const diaSimulado = new Date(hoje);
        diaSimulado.setDate(hoje.getDate() + i);
        const key = diaSimulado.toISOString().split('T')[0];

        const diaDaSemanaIdx = diaSimulado.getDay();
        const isFimDeSemana = (diaDaSemanaIdx === 0 || diaDaSemanaIdx === 6);

        let planejado = 0;
        let realizado = 0;
        let materia = "";
        let eDiaEstudo = true;

        if (isFimDeSemana && !finaisDeSemana) {
            eDiaEstudo = false;
        } else {
            const frequenciaMeta = window.frequenciaSelecionadaPlanner;
            if (frequenciaMeta === 2 && (i % 3 !== 0)) eDiaEstudo = false;
            else if (frequenciaMeta === 3 && (i % 2 !== 0)) eDiaEstudo = false;
            else if (frequenciaMeta === 5 && (i === 3 || i === 6)) eDiaEstudo = false;
        }

        if (eDiaEstudo) {
            materia = materiasPool[poolIndex % materiasPool.length];
            poolIndex++;
            if (window.plannerObjetivo === "horas") {
                planejado = cargaVal * 60; // em minutos
            } else {
                planejado = Math.ceil(metaVal / 10);
            }
        }

        historicoDias[key] = {
            materia: materia,
            planejado: planejado,
            realizado: realizado,
            concluido: false,
            eDiaEstudo: eDiaEstudo,
            diaNome: diasSemanaNomes[diaDaSemanaIdx]
        };
    }

    progressoUsuario.planner = {
        cicloAtivo: true,
        emExibicaoRelatorio: false,
        config: {
            objetivo: window.plannerObjetivo,
            metaTotal: metaVal,
            frequencia: window.frequenciaSelecionadaPlanner,
            finaisDeSemana: finaisDeSemana,
            cargaDiaria: cargaVal,
            disciplinas: materiasConfig
        },
        progresso: {
            totalRealizado: 0,
            historicoDias: historicoDias,
            questoesCiclo: []
        }
    };

    salvarProgressoLocal();
    window.renderizarPlanner();
};

// 3. SUB-ABA 1: DASHBOARD DO CICLO ATIVO
window.renderizarDashboardCicloPlanner = function(container) {
    const p = progressoUsuario.planner;
    const meta = p.config.metaTotal;
    const realizado = p.progresso.totalRealizado || 0;

    const percent = Math.min(100, Math.round((realizado / meta) * 100));
    const hojeKey = new Date().toISOString().split('T')[0];

    if (!p.progresso.historicoDias[hojeKey]) {
        const diaDaSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const d = new Date();
        p.progresso.historicoDias[hojeKey] = {
            materia: p.config.disciplinas.length > 0 ? p.config.disciplinas[Math.floor(Math.random() * p.config.disciplinas.length)].nome : "Direito Constitucional",
            planejado: p.config.objetivo === "horas" ? p.config.cargaDiaria * 60 : Math.ceil(meta / 10),
            realizado: 0,
            concluido: false,
            eDiaEstudo: true,
            diaNome: diaDaSemanaNomes[d.getDay()]
        };
    }

    const diaHoje = p.progresso.historicoDias[hojeKey];

    let weekHTML = "";
    const sortedKeys = Object.keys(p.progresso.historicoDias).sort().slice(-7);

    sortedKeys.forEach(k => {
        const dia = p.progresso.historicoDias[k];
        const isHoje = (k === hojeKey);
        
        let cardClass = "planner-day-card";
        let statusText = "Pendente";

        if (dia.concluido) {
            cardClass += " completed";
            statusText = "🟢 Concluído";
        } else if (isHoje) {
            cardClass += " today";
            statusText = "⏳ Hoje";
        } else if (!dia.eDiaEstudo) {
            cardClass += " rest";
            statusText = "☕ Folga";
        }

        const details = dia.eDiaEstudo 
            ? `<div class="day-subject" title="${dia.materia}">${dia.materia.split(' ')[0]}...</div>` 
            : `<div class="day-subject" style="color:var(--text-secondary); font-style:italic;">Descanso</div>`;

        weekHTML += `
            <div class="${cardClass}">
                <div class="day-num">${dia.diaNome}</div>
                ${details}
                <div class="day-status" style="font-size: 0.65rem;">${statusText}</div>
            </div>
        `;
    });

    const displayRealizado = p.config.objetivo === "horas" 
        ? `${Math.floor(realizado / 60)}h ${realizado % 60}m` 
        : `${realizado} questões`;
        
    const displayMeta = p.config.objetivo === "horas" 
        ? `${meta} horas` 
        : `${meta} questões`;

    let metaHojeTexto = "";
    if (!diaHoje.eDiaEstudo) {
        metaHojeTexto = `
            <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">☕ Dia de Folga e Descanso</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary);">Aproveite hoje para descansar a mente ou revisar anotações de ciclos anteriores de forma leve.</p>
        `;
    } else {
        const hojeMetaText = p.config.objetivo === "horas" 
            ? `${Math.floor(diaHoje.planejado / 60)} horas` 
            : `${diaHoje.planejado} questões`;
        
        const hojeRealizadoText = p.config.objetivo === "horas" 
            ? `${Math.floor(diaHoje.realizado)} min` 
            : `${diaHoje.realizado} quest.`;

        metaHojeTexto = `
            <span class="meta-badge" style="background-color: var(--accent-light); color: var(--accent); font-weight: bold; margin-bottom: 12px; display: inline-block; padding: 4px 8px; border-radius: 6px;">Foco do Dia</span>
            <h3 style="font-size: 1.5rem; font-weight: 850; color: var(--text-primary); margin-bottom: 6px;">${diaHoje.materia}</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">
                Meta de hoje: realizar <strong>${hojeMetaText}</strong> de estudos. Progresso atual: <strong>${hojeRealizadoText}</strong>
            </p>
            
            <div style="display:flex; flex-wrap:wrap; gap:12px;">
                <button class="btn btn-primary" onclick="window.resolverMetaHoje('${diaHoje.materia}')" style="font-weight: 750;">🚀 Resolver na Sala</button>
                <button class="btn btn-outline-secondary" onclick="window.abrirModalManualPlanner()" style="font-weight: 700; border: 1.5px solid var(--border); color: var(--text-primary);">⏱️ Registrar Estudo Manual</button>
                <button class="btn btn-outline-success" onclick="window.concluirMetaDoDia()" style="font-weight: 700; border: 1.5px solid var(--correct); color: var(--correct);">✔️ Meta Concluída</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="planner-banner">
            <h1 class="planner-banner-title">📅 Seu Ciclo de Estudos Ativo</h1>
            <p class="planner-banner-desc">Mantenha a constância! Realize a meta do dia e visualize a evolução do seu cronograma.</p>
        </div>

        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:25px; margin-bottom: 25px;">
            <!-- Painel de Progresso Global -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">📈 Progresso Geral do Ciclo</h2>
                    <div style="display:flex; align-items:center; gap:20px; margin-bottom: 15px;">
                        <div style="font-size: 2.5rem; font-weight: 900; color: var(--accent);">${percent}%</div>
                        <div style="flex:1;">
                            <div style="font-size: 0.88rem; color: var(--text-secondary); font-weight: bold; display:flex; justify-content:space-between; margin-bottom: 4px;">
                                <span>${displayRealizado} concluídas</span>
                                <span>Meta: ${displayMeta}</span>
                            </div>
                            <div style="height: 10px; background-color: var(--border); border-radius:5px; overflow:hidden;">
                                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--accent) 0%, #a855f7 100%); transition: width 0.5s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content: space-between; border-top: 1.5px solid var(--border); padding-top: 15px; margin-top: 15px;">
                    <button class="btn btn-outline-danger btn-sm" onclick="window.abandonarCiclo()" style="font-weight:700;">Abandonar Ciclo</button>
                    <button class="btn btn-success" onclick="window.finalizarCicloEGerarRelatorio()" style="font-weight:750; background-color: var(--correct); border-color: var(--correct); color: white;">🏁 Concluir Ciclo e Ver Relatório</button>
                </div>
            </div>

            <!-- Calendário Semanal -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">📆 Cronograma do Ciclo</h2>
                <div class="planner-week-container">
                    ${weekHTML}
                </div>
            </div>
        </div>

        <!-- Meta do Dia -->
        <div class="planner-today-target-card" style="background-color: var(--bg-card); border-color: var(--border);">
            ${metaHojeTexto}
        </div>

        <!-- Modal de registro manual -->
        <div id="plannerManualModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
            <div class="card-base" style="background-color:var(--bg-card); border-radius:16px; width:350px; padding:25px; border: 2px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:15px; color:var(--text-primary);">⏱️ Registrar Estudo</h3>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:15px;">Quantos minutos você estudou esta disciplina hoje?</p>
                <input type="number" id="manualMinutosInput" placeholder="Minutos (ex: 60, 120)" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:1rem; margin-bottom:20px;">
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-outline-secondary" onclick="window.fecharModalManualPlanner()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.salvarEstudoManual()">Confirmar</button>
                </div>
            </div>
        </div>
    `;
};

window.resolverMetaHoje = function(materia) {
    navegarPara('questoes');
    const filterInput = document.getElementById("searchFiltroGlobal");
    if (filterInput) {
        filterInput.value = materia;
        aplicarFiltros();
    }
};

window.abrirModalManualPlanner = function() {
    const m = document.getElementById("plannerManualModal");
    if (m) m.style.display = "flex";
};

window.fecharModalManualPlanner = function() {
    const m = document.getElementById("plannerManualModal");
    if (m) m.style.display = "none";
};

window.salvarEstudoManual = function() {
    const input = document.getElementById("manualMinutosInput");
    if (!input || !input.value) return;
    const mins = parseInt(input.value);
    
    if (mins > 0) {
        const p = progressoUsuario.planner;
        const hojeKey = new Date().toISOString().split('T')[0];
        const diaHoje = p.progresso.historicoDias[hojeKey];

        if (p.config.objetivo === "horas") {
            diaHoje.realizado += mins;
            p.progresso.totalRealizado += mins;
            if (diaHoje.realizado >= diaHoje.planejado) {
                diaHoje.concluido = true;
            }
        } else {
            const questaoEquivalente = Math.ceil(mins / 20);
            diaHoje.realizado += questaoEquivalente;
            p.progresso.totalRealizado += questaoEquivalente;
            if (diaHoje.realizado >= diaHoje.planejado) {
                diaHoje.concluido = true;
            }
        }

        salvarProgressoLocal();
        window.fecharModalManualPlanner();
        window.renderizarPlanner();
    }
};

window.concluirMetaDoDia = function() {
    const p = progressoUsuario.planner;
    const hojeKey = new Date().toISOString().split('T')[0];
    const diaHoje = p.progresso.historicoDias[hojeKey];

    if (diaHoje) {
        diaHoje.concluido = true;
        const diferenca = Math.max(0, diaHoje.planejado - diaHoje.realizado);
        diaHoje.realizado = diaHoje.planejado;
        p.progresso.totalRealizado += diferenca;

        salvarProgressoLocal();
        window.renderizarPlanner();
    }
};

window.abandonarCiclo = function() {
    if (confirm("Tem certeza que deseja abandonar o ciclo atual? Todo o progresso deste cronograma será resetado!")) {
        progressoUsuario.planner = {
            cicloAtivo: false,
            emExibicaoRelatorio: false,
            config: {},
            progresso: { totalRealizado: 0, historicoDias: {}, questoesCiclo: [] }
        };
        salvarProgressoLocal();
        window.renderizarPlanner();
    }
};

// 4. SUB-ABA 1: RELATÓRIO DO FIM DO CICLO
window.finalizarCicloEGerarRelatorio = function() {
    const p = progressoUsuario.planner;
    const meta = p.config.metaTotal;
    const realizado = p.progresso.totalRealizado || 0;

    const questoesCicloIds = p.progresso.questoesCiclo || [];
    const totalQuestoesCiclo = questoesCicloIds.length;

    let acertos = 0;
    let erros = 0;
    const performanceMateria = {};

    questoesCicloIds.forEach(qId => {
        const q = obterQuestaoPorId(qId);
        const resp = progressoUsuario.respondidas[qId];
        if (q && resp) {
            const correta = !!resp.correta;
            if (correta) acertos++;
            else erros++;

            const mat = q.disciplina || "Geral";
            if (!performanceMateria[mat]) {
                performanceMateria[mat] = { acertos: 0, total: 0 };
            }
            performanceMateria[mat].total++;
            if (correta) performanceMateria[mat].acertos++;
        }
    });

    const taxaAcerto = totalQuestoesCiclo > 0 ? Math.round((acertos / totalQuestoesCiclo) * 100) : 0;
    const percentConclusao = Math.min(100, Math.round((realizado / meta) * 100));

    // Salvar no histórico antes de mostrar relatório
    const consolidadoDisciplinas = p.config.disciplinas.map(d => {
        const matName = d.nome;
        const perf = performanceMateria[matName] || { acertos: 0, total: 0 };
        // Estimar tempo estudado nas metas diárias
        let tempoMin = 0;
        Object.keys(p.progresso.historicoDias).forEach(k => {
            const day = p.progresso.historicoDias[k];
            if (day.materia === matName) {
                tempoMin += day.realizado;
            }
        });
        return {
            nome: matName,
            peso: d.peso,
            horasEstudadas: p.config.objetivo === "horas" ? (tempoMin / 60) : 0,
            questoesResolvidas: perf.total,
            questoesAcertadas: perf.acertos
        };
    });

    const cicloRecord = {
        id: 'cycle_' + Date.now(),
        name: `Ciclo ${progressoUsuario.plannerHistory.length + 1} - ${p.config.objetivo === 'horas' ? 'Horas' : 'Questões'}`,
        start: Object.keys(p.progresso.historicoDias).sort()[0] || new Date().toISOString().split('T')[0],
        end: Object.keys(p.progresso.historicoDias).sort().slice(-1)[0] || new Date().toISOString().split('T')[0],
        objetivo: p.config.objetivo,
        metaTotal: meta,
        totalRealizado: realizado,
        percentConclusao: percentConclusao,
        totalQuestoes: totalQuestoesCiclo,
        totalAcertos: acertos,
        taxaAcerto: taxaAcerto,
        disciplinesPerformance: consolidadoDisciplinas
    };

    // Prevenir duplicidade no histórico se o usuário atualizar a página no relatório
    if (!progressoUsuario.plannerHistory.some(h => h.name === cicloRecord.name)) {
        progressoUsuario.plannerHistory.unshift(cicloRecord);
    }

    p.emExibicaoRelatorio = true;
    salvarProgressoLocal();
    window.renderizarPlanner();
};

window.renderizarRelatorioPlanner = function(container) {
    const p = progressoUsuario.planner;
    const meta = p.config.metaTotal;
    const realizado = p.progresso.totalRealizado || 0;

    const questoesCicloIds = p.progresso.questoesCiclo || [];
    const totalQuestoesCiclo = questoesCicloIds.length;

    let acertos = 0;
    let erros = 0;
    const performanceMateria = {};

    questoesCicloIds.forEach(qId => {
        const q = obterQuestaoPorId(qId);
        const resp = progressoUsuario.respondidas[qId];
        if (q && resp) {
            const correta = !!resp.correta;
            if (correta) acertos++;
            else erros++;

            const mat = q.disciplina || "Geral";
            if (!performanceMateria[mat]) {
                performanceMateria[mat] = { acertos: 0, total: 0 };
            }
            performanceMateria[mat].total++;
            if (correta) performanceMateria[mat].acertos++;
        }
    });

    const taxaAcerto = totalQuestoesCiclo > 0 ? Math.round((acertos / totalQuestoesCiclo) * 100) : 0;

    let consultoriaHTML = "";
    const materiasLidas = Object.keys(performanceMateria);
    if (materiasLidas.length > 0) {
        materiasLidas.sort((a, b) => {
            const taxaA = (performanceMateria[a].acertos / performanceMateria[a].total);
            const taxaB = (performanceMateria[b].acertos / performanceMateria[b].total);
            return taxaA - taxaB;
        });

        const piorMateria = materiasLidas[0];
        const taxaPior = Math.round((performanceMateria[piorMateria].acertos / performanceMateria[piorMateria].total) * 100);

        consultoriaHTML = `
            <div class="card-base" style="border: 2px solid var(--accent); border-radius: 16px; padding: 25px; background-color: var(--accent-light); color: var(--accent); margin-bottom: 25px;">
                <h3 style="font-size: 1.15rem; font-weight: 850; margin-bottom: 8px;">🎓 Orientação Pedagógica REMB</h3>
                <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-primary);">
                    Identificamos que seu aproveitamento em <strong>${piorMateria}</strong> foi de apenas <strong>${taxaPior}%</strong> no ciclo de estudos.
                    Para equilibrar sua performance global nas provas, sugerimos <strong>aumentar o peso</strong> desta matéria no seu próximo Ciclo de Estudos e dedicar pelo menos 30 minutos a mais de leitura de doutrina e resumos direcionados antes das sessões de Engenharia Reversa.
                </p>
            </div>
        `;
    } else {
        consultoriaHTML = `
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); color: var(--text-secondary); margin-bottom: 25px; text-align: center;">
                <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 8px; color: var(--text-primary);">🎓 Orientação Pedagógica</h3>
                <p style="font-size: 0.9rem;">Resolva questões na sala de estudos durante o ciclo para habilitar os conselhos da inteligência de curação.</p>
            </div>
        `;
    }

    let tabelaHTML = "";
    materiasLidas.forEach(mat => {
        const item = performanceMateria[mat];
        const rate = Math.round((item.acertos / item.total) * 100);
        tabelaHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding: 10px 0;">
                <span style="font-weight: 750; font-size:0.9rem; color:var(--text-primary);">${mat}</span>
                <span style="font-weight: bold; font-size:0.9rem; color: ${rate >= 70 ? 'var(--correct)' : 'var(--incorrect)'};">${rate}% de acertos (${item.total} q.)</span>
            </div>
        `;
    });

    if (tabelaHTML === "") {
        tabelaHTML = `<div style="text-align:center; padding:15px; color:var(--text-secondary); font-size:0.85rem;">Nenhum dado estatístico disponível.</div>`;
    }

    const tempoConclusaoText = p.config.objetivo === "horas"
        ? `${Math.floor(realizado / 60)}h / ${meta}h`
        : `${realizado} / ${meta} questões`;

    const percentConclusao = Math.min(100, Math.round((realizado / meta) * 100));

    container.innerHTML = `
        <div class="planner-banner">
            <h1 class="planner-banner-title">🏁 Relatório de Conclusão do Ciclo</h1>
            <p class="planner-banner-desc">Parabéns pelo esforço! Veja as estatísticas consolidadas do seu cronograma de estudos finalizado.</p>
        </div>

        ${consultoriaHTML}

        <div class="planner-report-grid">
            <!-- Aproveitamento Global -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h3 style="font-size: 1.2rem; font-weight: 850; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; color: var(--text-primary);">📈 Aproveitamento Geral</h3>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; color: var(--text-primary);">
                    <span style="font-weight:700; color:var(--text-secondary);">Metas Executadas:</span>
                    <span style="font-weight:bold;">${percentConclusao}% da meta batida</span>
                </div>
                <div style="height:10px; background-color:var(--border); border-radius:5px; overflow:hidden; margin-bottom:25px;">
                    <div style="width:${percentConclusao}%; height:100%; background-color:var(--accent); border-radius:5px;"></div>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem; color: var(--text-primary);">
                    <span>Volume Planejado vs Executado:</span>
                    <span style="font-weight:800;">${tempoConclusaoText}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem; color: var(--text-primary);">
                    <span>Taxa de Acertos Geral do Ciclo:</span>
                    <span style="font-weight:800; color:var(--correct);">${taxaAcerto}% acerto (${totalQuestoesCiclo} res.)</span>
                </div>
            </div>

            <!-- Detalhe por Disciplinas -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h3 style="font-size: 1.2rem; font-weight: 850; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; color: var(--text-primary);">📊 Desempenho por Matéria</h3>
                <div>
                    ${tabelaHTML}
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:25px; border-top:1.5px solid var(--border); padding-top:20px;">
            <button class="btn btn-outline-secondary" onclick="window.print()" style="font-weight:700; border: 1.5px solid var(--border); color: var(--text-primary);">🖨️ Imprimir Relatório</button>
            <button class="btn btn-primary" onclick="window.limparRelatorioPlanner()" style="font-weight:750;">🆕 Iniciar Novo Ciclo</button>
        </div>
    `;
};

window.limparRelatorioPlanner = function() {
    progressoUsuario.planner = {
        cicloAtivo: false,
        emExibicaoRelatorio: false,
        config: {},
        progresso: { totalRealizado: 0, historicoDias: {}, questoesCiclo: [] }
    };
    salvarProgressoLocal();
    window.renderizarPlanner();
};

// ==================== SUB-ABA 2: QUADRO DE HORÁRIOS GERAL ====================

window.renderizarQuadroHorarios = function(container) {
    const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    const activeDayName = dayNames[window.currentDayIndexPlanner];
    const weeklyData = progressoUsuario.weeklyTemplate;
    
    // Cálculo dos totais da semana
    const totals = { work: 0, gym: 0, rest: 0, random: 0, study: 0, empty: 0 };
    for (let day = 0; day < 7; day++) {
        const sched = weeklyData[day] || Array(24).fill('empty');
        sched.forEach(h => {
            if (totals[h] !== undefined) totals[h]++;
        });
    }
    const weeklyStudyHours = totals.empty + totals.study;

    // Cálculo das horas livres de hoje
    const todaySched = weeklyData[window.currentDayIndexPlanner] || Array(24).fill('empty');
    let todayFree = 0;
    todaySched.forEach(slot => {
        if (slot === 'empty' || slot === 'study') todayFree++;
    });

    // Renderizando a linha de blocos de 24h
    let hoursHTML = "";
    const translations = {
        empty: 'Livre (Potencial de Estudo)',
        work: 'Trabalho / Emprego',
        gym: 'Academia',
        rest: 'Descanso / Sono',
        random: 'Compromissos',
        study: 'Foco Estudo Direto'
    };

    for (let hour = 0; hour < 24; hour++) {
        const type = todaySched[hour] || 'empty';
        hoursHTML += `
            <div class="hour-row" style="margin-bottom: 5px;">
                <div class="hour-label">${String(hour).padStart(2, '0')}:00</div>
                <div class="hour-block ${type}" data-hour="${hour}" 
                     onmousedown="event.preventDefault(); window.dragMouseDownPlanner = true; window.pintarBlocoHorario(${hour})"
                     onmouseenter="if(window.dragMouseDownPlanner) window.pintarBlocoHorario(${hour})">
                     ${translations[type]}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="planner-banner" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
            <h1 class="planner-banner-title">🕒 Quadro de Horários Geral</h1>
            <p class="planner-banner-desc">Planeje sua rotina diária. Marque seus compromissos para encontrar suas janelas reais livres para estudar.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 25px; margin-bottom: 25px;">
            <!-- Quadro Interativo -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; margin-bottom: 15px; flex-wrap:wrap; gap:10px;">
                    <h2 style="font-size: 1.15rem; font-weight: 850; color: var(--text-primary); margin:0;">🗓️ Agenda de Rotina: ${activeDayName}</h2>
                    
                    <div class="day-selector">
                        <button class="day-btn ${window.currentDayIndexPlanner === 0 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 0; window.renderizarPlanner()">Seg</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 1 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 1; window.renderizarPlanner()">Ter</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 2 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 2; window.renderizarPlanner()">Qua</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 3 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 3; window.renderizarPlanner()">Qui</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 4 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 4; window.renderizarPlanner()">Sex</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 5 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 5; window.renderizarPlanner()">Sáb</button>
                        <button class="day-btn ${window.currentDayIndexPlanner === 6 ? 'active' : ''}" onclick="window.currentDayIndexPlanner = 6; window.renderizarPlanner()">Dom</button>
                    </div>
                </div>

                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">
                    💡 Selecione a atividade na legenda abaixo e clique ou arraste o cursor sobre as horas para colorir o quadro.
                </p>

                <div class="hours-timeline" style="margin-top:0;">
                    ${hoursHTML}
                </div>

                <div class="schedule-legend">
                    <div class="legend-item ${window.legendTypePlanner === 'empty' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('empty')">
                        <div class="legend-color empty"></div>
                        <span>Janela Livre (Estudo)</span>
                    </div>
                    <div class="legend-item ${window.legendTypePlanner === 'work' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('work')">
                        <div class="legend-color work"></div>
                        <span>Trabalho</span>
                    </div>
                    <div class="legend-item ${window.legendTypePlanner === 'gym' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('gym')">
                        <div class="legend-color gym"></div>
                        <span>Academia</span>
                    </div>
                    <div class="legend-item ${window.legendTypePlanner === 'rest' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('rest')">
                        <div class="legend-color rest"></div>
                        <span>Descanso / Sono</span>
                    </div>
                    <div class="legend-item ${window.legendTypePlanner === 'random' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('random')">
                        <div class="legend-color random"></div>
                        <span>Compromissos</span>
                    </div>
                    <div class="legend-item ${window.legendTypePlanner === 'study' ? 'selected' : ''}" onclick="window.setLegendTypePlanner('study')">
                        <div class="legend-color study"></div>
                        <span>Estudo Direto</span>
                    </div>
                </div>
            </div>

            <!-- Resumo e Métricas Semanais -->
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                    <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">📊 Resumo da Rotina Semanal</h2>
                    <div style="display:flex; flex-direction:column; gap:10px; font-size: 0.9rem; color:var(--text-primary);">
                        <div style="display:flex; justify-content:space-between;">
                            <span>💼 Trabalho:</span>
                            <strong>${totals.work}h / semana</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>💪 Academia:</span>
                            <strong>${totals.gym}h / semana</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>💤 Descanso/Sono:</span>
                            <strong>${totals.rest}h / semana</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>🎈 Compromissos/Outros:</span>
                            <strong>${totals.random}h / semana</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:10px; margin-top:5px; font-size:1.05rem;">
                            <span>🎯 Potencial de Estudo:</span>
                            <span style="color:var(--accent); font-weight:bold;">${weeklyStudyHours}h / semana</span>
                        </div>
                    </div>
                </div>

                <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); flex:1;">
                    <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">💡 Janelas para ${activeDayName}</h2>
                    <p style="font-size:0.92rem; line-height:1.6; color:var(--text-secondary);">
                        Neste dia, você possui um total de <strong style="color:var(--accent); font-size:1.1rem;">${todayFree}h</strong> livres para se preparar. 
                    </p>
                    <p style="font-size:0.85rem; margin-top:10px; color:var(--text-secondary);">
                        *Você pode registrar sessões de estudo a qualquer momento. Se estudar durante o trabalho, use o registro manual na aba do ciclo para consolidar o tempo!
                    </p>
                </div>
            </div>
        </div>
    `;
};

window.setLegendTypePlanner = function(type) {
    window.legendTypePlanner = type;
    window.renderizarPlanner();
};

window.pintarBlocoHorario = function(hour) {
    progressoUsuario.weeklyTemplate[window.currentDayIndexPlanner][hour] = window.legendTypePlanner;
    salvarProgressoLocal();
    window.renderizarPlanner();
};

// ==================== SUB-ABA 3: ACOMPANHAMENTO & METAS ====================

window.renderizarAcompanhamentoMetas = function(container) {
    const p = progressoUsuario.planner;
    const history = progressoUsuario.plannerHistory || [];
    
    let activeCycleHTML = "";
    
    if (p.cicloAtivo) {
        const metaVal = p.config.metaTotal;
        const realizadoVal = p.progresso.totalRealizado || 0;
        
        // Histórico de questões do ciclo ativo
        const questoesCicloIds = p.progresso.questoesCiclo || [];
        let acertos = 0;
        const perfMateria = {};
        
        // Inicializar com matérias do ciclo
        p.config.disciplinas.forEach(d => {
            perfMateria[d.nome] = { acertos: 0, total: 0, tempoMinutos: 0 };
        });

        // Contabilizar desempenho
        questoesCicloIds.forEach(qId => {
            const q = obterQuestaoPorId(qId);
            const resp = progressoUsuario.respondidas[qId];
            if (q && resp) {
                const correta = !!resp.correta;
                if (correta) acertos++;
                
                const mat = q.disciplina || "Geral";
                if (!perfMateria[mat]) {
                    perfMateria[mat] = { acertos: 0, total: 0, tempoMinutos: 0 };
                }
                perfMateria[mat].total++;
                if (correta) perfMateria[mat].acertos++;
            }
        });

        // Contabilizar tempos das metas diárias do ciclo
        Object.keys(p.progresso.historicoDias).forEach(k => {
            const day = p.progresso.historicoDias[k];
            if (day.materia && perfMateria[day.materia]) {
                perfMateria[day.materia].tempoMinutos += day.realizado;
            }
        });

        const taxaAcertoGeral = questoesCicloIds.length > 0 ? Math.round((acertos / questoesCicloIds.length) * 100) : 0;
        
        // 1. Checklist Inteligente (Checks)
        const checklist = [];
        
        // Meta 1: Concluir Horas Totais
        const displayRealizado = p.config.objetivo === "horas" ? Math.floor(realizadoVal/60) : realizadoVal;
        const checkedMetas = displayRealizado >= metaVal;
        checklist.push({
            label: `Bater meta geral: ${displayRealizado} de ${metaVal} ${p.config.objetivo === "horas" ? "horas" : "questões"}`,
            meta: "Geral",
            checked: checkedMetas
        });

        // Meta 2: Rendimento > 70%
        checklist.push({
            label: `Rendimento acima de 70% (Atual: ${taxaAcertoGeral}%)`,
            meta: "Qualidade",
            checked: taxaAcertoGeral >= 70 && questoesCicloIds.length >= 5
        });

        // Metas individuais baseadas nos pesos alocados no ciclo
        const cargaDiariaHoras = p.config.cargaDiaria;
        
        // Contar quantos dias planejados cada matéria recebeu no cronograma
        const slotsMateria = {};
        p.config.disciplinas.forEach(d => { slotsMateria[d.nome] = 0; });
        Object.keys(p.progresso.historicoDias).forEach(k => {
            const day = p.progresso.historicoDias[k];
            if (day.eDiaEstudo && day.materia && slotsMateria[day.materia] !== undefined) {
                slotsMateria[day.materia]++;
            }
        });

        p.config.disciplinas.forEach(d => {
            const plannedSlots = slotsMateria[d.nome] || 0;
            const metaHorasMateria = plannedSlots * cargaDiariaHoras;
            
            const matPerf = perfMateria[d.nome] || { acertos: 0, total: 0, tempoMinutos: 0 };
            const horasEstudadas = matPerf.tempoMinutos / 60;
            
            checklist.push({
                label: `Estudar ${d.nome}: ${horasEstudadas.toFixed(1)}h de ${metaHorasMateria}h planejadas`,
                meta: `Peso ${d.peso}`,
                checked: horasEstudadas >= metaHorasMateria && metaHorasMateria > 0
            });
        });

        let checklistHTML = "";
        checklist.forEach(item => {
            checklistHTML += `
                <div class="checklist-item ${item.checked ? 'checked' : ''}">
                    <div class="checklist-checkbox">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span class="checklist-text">${item.label}</span>
                    <span class="checklist-meta">${item.meta}</span>
                </div>
            `;
        });

        // 2. Tabela de Desempenho por Matéria
        let tableRowsHTML = "";
        p.config.disciplinas.forEach(d => {
            const matPerf = perfMateria[d.nome] || { acertos: 0, total: 0, tempoMinutos: 0 };
            const acc = matPerf.total > 0 ? Math.round((matPerf.acertos / matPerf.total) * 100) : 0;
            const tempoTexto = `${Math.floor(matPerf.tempoMinutos/60)}h ${matPerf.tempoMinutos%60}m`;
            
            tableRowsHTML += `
                <tr>
                    <td style="font-weight:bold; color:var(--text-primary); padding:10px 5px;">${d.nome}</td>
                    <td style="color:var(--text-secondary); text-align:center; font-weight:bold;">P${d.peso}</td>
                    <td style="color:var(--text-secondary); text-align:center;">${tempoTexto}</td>
                    <td style="color:var(--text-secondary); text-align:center;">${matPerf.total}</td>
                    <td style="color:var(--correct); text-align:center; font-weight:bold;">${matPerf.acertos}</td>
                    <td style="color:var(--incorrect); text-align:center; font-weight:bold;">${matPerf.total - matPerf.acertos}</td>
                    <td style="color: ${acc >= 70 ? 'var(--correct)' : 'var(--warning)'}; text-align:right; font-weight:bold;">${acc}%</td>
                </tr>
            `;
        });

        // Preparar Arrays para Gráficos
        const chartLabels = [];
        const chartGoalData = [];
        const chartActualData = [];
        const chartAccuracyData = [];

        p.config.disciplinas.forEach(d => {
            chartLabels.push(d.nome.split(' ').slice(0, 2).join(' ')); // Abreviar nome da matéria
            
            const plannedSlots = slotsMateria[d.nome] || 0;
            chartGoalData.push(plannedSlots * cargaDiariaHoras);
            
            const matPerf = perfMateria[d.nome] || { acertos: 0, total: 0, tempoMinutos: 0 };
            chartActualData.push(parseFloat((matPerf.tempoMinutos / 60).toFixed(1)));
            
            const acc = matPerf.total > 0 ? Math.round((matPerf.acertos / matPerf.total) * 100) : 0;
            chartAccuracyData.push(acc);
        });

        activeCycleHTML = `
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); margin-bottom: 25px;">
                <h2 style="font-size:1.2rem; font-weight:850; color:var(--text-primary); margin-bottom:15px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">📋 Quadro de Verificação (Ciclo Ativo)</h2>
                
                <div class="checklist-container">
                    ${checklistHTML}
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:25px; margin-bottom:25px;">
                <!-- Tabela Analítica de Disciplinas -->
                <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                    <h2 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">📚 Andamento das Disciplinas</h2>
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead>
                            <tr style="border-bottom: 1.5px solid var(--border); text-align:left; color:var(--text-secondary);">
                                <th style="padding-bottom:8px;">Matéria</th>
                                <th style="padding-bottom:8px; text-align:center;">Peso</th>
                                <th style="padding-bottom:8px; text-align:center;">Tempo</th>
                                <th style="padding-bottom:8px; text-align:center;">Res.</th>
                                <th style="padding-bottom:8px; text-align:center;">Acertos</th>
                                <th style="padding-bottom:8px; text-align:center;">Erros</th>
                                <th style="padding-bottom:8px; text-align:right;">Aproveit.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHTML}
                        </tbody>
                    </table>
                </div>

                <!-- Gráficos de Apoio -->
                <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display:flex; flex-direction:column; gap:20px;">
                    <div>
                        <h2 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:5px;">Meta vs Realizado (Horas)</h2>
                        <div class="chart-container-planner" style="height:120px;">
                            <canvas id="planner-hours-chart"></canvas>
                        </div>
                    </div>
                    <div>
                        <h2 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:5px;">Rendimento (%)</h2>
                        <div class="chart-container-planner" style="height:120px;">
                            <canvas id="planner-acc-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Renderizar os gráficos logo após a injeção do HTML
        setTimeout(() => {
            window.renderizarGraficosPlanner(chartLabels, chartGoalData, chartActualData, chartAccuracyData);
        }, 100);
    } else {
        activeCycleHTML = `
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); text-align:center; color:var(--text-secondary); margin-bottom:25px;">
                <h3>Nenhum Ciclo Ativo</h3>
                <p style="font-size:0.9rem; margin-top:5px;">Inicie um ciclo de estudos na primeira aba para habilitar o quadro de verificação de metas.</p>
            </div>
        `;
    }

    // Histórico de Ciclos Concluídos
    let historyHTML = "";
    if (history.length === 0) {
        historyHTML = `
            <div style="text-align:center; color:var(--text-secondary); padding:20px; font-size:0.9rem;">
                Nenhum ciclo consolidado no histórico. Finalize um ciclo ativo para visualizar os registros passados.
            </div>
        `;
    } else {
        history.forEach(c => {
            let detailsRows = "";
            c.disciplinesPerformance.forEach(d => {
                const dAcc = d.questoesResolvidas > 0 ? Math.round((d.questoesAcertadas / d.questoesResolvidas) * 100) : 0;
                const dTempo = d.horasEstudadas > 0 ? `${d.horasEstudadas.toFixed(1)}h` : '0h';
                
                detailsRows += `
                    <div style="background-color:var(--bg-primary); border:1px solid var(--border); padding:8px 12px; border-radius:8px; display:flex; flex-direction:column; gap:2px;">
                        <span style="font-weight:bold; font-size:0.8rem; color:var(--text-primary);">${d.nome}</span>
                        <span style="font-size:0.75rem; color:var(--text-secondary);">
                            Tempo: ${dTempo} | Questões: ${d.questoesResolvidas} (Acertos: ${d.questoesAcertadas}) | Rendimento: <strong style="color:var(--correct)">${dAcc}%</strong>
                        </span>
                    </div>
                `;
            });

            historyHTML += `
                <div class="history-cycle-card" style="margin-bottom: 15px;">
                    <div class="history-cycle-header">
                        <span class="history-cycle-title">${c.name}</span>
                        <span class="history-cycle-date">De ${c.start.split('-').reverse().join('/')} a ${c.end.split('-').reverse().join('/')}</span>
                    </div>
                    <div class="history-cycle-stats" style="margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                        <div class="history-cycle-stat-item">
                            <span class="history-cycle-stat-label">Meta Batida</span>
                            <span class="history-cycle-stat-value">${c.percentConclusao}%</span>
                        </div>
                        <div class="history-cycle-stat-item">
                            <span class="history-cycle-stat-label">Total Realizado</span>
                            <span class="history-cycle-stat-value">${c.objetivo === 'horas' ? Math.floor(c.totalRealizado / 60) + 'h' : c.totalRealizado + ' q.'}</span>
                        </div>
                        <div class="history-cycle-stat-item">
                            <span class="history-cycle-stat-label">Questões</span>
                            <span class="history-cycle-stat-value">${c.totalQuestoes} resolvidas</span>
                        </div>
                        <div class="history-cycle-stat-item">
                            <span class="history-cycle-stat-label">Acertos</span>
                            <span class="history-cycle-stat-value" style="color:var(--correct)">${c.totalAcertos} acertos (${c.taxaAcerto}%)</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <h4 style="font-size:0.8rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Detalhamento das Disciplinas:</h4>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
                            ${detailsRows}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="planner-banner" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h1 class="planner-banner-title">📈 Acompanhamento & Metas do Ciclo</h1>
            <p class="planner-banner-desc">Monitore o alcance dos objetivos estabelecidos no ciclo e analise os históricos consolidados dos ciclos passados.</p>
        </div>

        ${activeCycleHTML}

        <!-- Histórico Consolidados -->
        <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
            <h2 style="font-size: 1.25rem; font-weight: 850; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; color: var(--text-primary);">📁 Ciclos Anteriores (Histórico Sintético)</h2>
            <div class="history-cycles-list">
                ${historyHTML}
            </div>
        </div>
    `;
};

window.renderizarGraficosPlanner = function(labels, goalData, actualData, accuracyData) {
    const rootStyle = getComputedStyle(document.documentElement);
    const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#3b82f6';
    const correctColor = rootStyle.getPropertyValue('--correct').trim() || '#10b981';
    const borderColor = rootStyle.getPropertyValue('--border').trim() || '#cbd5e1';
    const textSecColor = rootStyle.getPropertyValue('--text-secondary').trim() || '#475569';

    // 1. Horas Chart
    const hoursCtx = document.getElementById('planner-hours-chart')?.getContext('2d');
    if (hoursCtx) {
        new Chart(hoursCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Meta',
                        data: goalData,
                        backgroundColor: 'rgba(100, 116, 139, 0.15)',
                        borderColor: borderColor,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Realizado',
                        data: actualData,
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.03)' },
                        ticks: { color: textSecColor, font: { size: 9 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textSecColor, font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 9 } }
                    }
                }
            }
        });
    }

    // 2. Rendimento Chart
    const accCtx = document.getElementById('planner-acc-chart')?.getContext('2d');
    if (accCtx) {
        new Chart(accCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Acertos',
                    data: accuracyData,
                    backgroundColor: correctColor,
                    borderColor: correctColor,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.03)' },
                        ticks: { color: textSecColor, font: { size: 9 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textSecColor, font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
};

// ==========================================================================
// CONTROLES DE PORTAIS (ALUNO vs ADMIN)
// ==========================================================================
window.currentPortalMode = 'student';

window.setPortalMode = function(mode) {
    window.currentPortalMode = mode;
    
    // Atualizar classes do body
    if (mode === 'admin') {
        document.body.classList.remove('portal-student');
        document.body.classList.add('portal-admin');
        
        // Ativar botão no portal selector
        document.getElementById('portal-btn-admin')?.classList.add('active');
        document.getElementById('portal-btn-student')?.classList.remove('active');
        
        // Ir para painel admin status
        window.navegarAdminTab('geral');
    } else {
        document.body.classList.remove('portal-admin');
        document.body.classList.add('portal-student');
        
        // Ativar botão no portal selector
        document.getElementById('portal-btn-student')?.classList.add('active');
        document.getElementById('portal-btn-admin')?.classList.remove('active');
        
        // Ir para dashboard do estudante
        navegarPara('dashboard');
    }
};

window.navegarAdminTab = function(tabName) {
    window.adminSubTabAtiva = tabName;
    navegarPara('admin');
    
    // Atualizar botão ativo na barra lateral para as guias do admin
    const adminButtons = document.querySelectorAll(".sidebar-menu .menu-item");
    adminButtons.forEach(btn => btn.classList.remove("active"));
    
    let btnId = 'btn-nav-admin-status';
    if (tabName === 'usuarios') btnId = 'btn-nav-admin-users';
    else if (tabName === 'acessos') btnId = 'btn-nav-admin-access';
    else if (tabName === 'financeiro') btnId = 'btn-nav-admin-finance';
    
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) activeBtn.classList.add("active");
};

// ==========================================================================
// MÓDULO: PAINEL ADMINISTRATIVO (SIMULAÇÃO E VISUALIZAÇÃO)
// ==========================================================================

// Inicialização de Dados Mockados do Painel Admin
if (!window.mockAdminUsers) {
    window.mockAdminUsers = [
        { id: 1, nome: "Carlos Eduardo Silva", email: "carlos.edu@gmail.com", plano: "VIP", status: "Ativo", data: "12/03/2026" },
        { id: 2, nome: "Luciana Maria Souza", email: "lu.maria@outlook.com", plano: "Premium", status: "Ativo", data: "28/04/2026" },
        { id: 3, nome: "Roberto Ramos", email: "roberto.ramos@uol.com.br", plano: "Gratuito", status: "Suspenso", data: "05/05/2026" },
        { id: 4, nome: "Juliana Mendes", email: "ju.mendes@gmail.com", plano: "Premium", status: "Ativo", data: "15/06/2026" },
        { id: 5, nome: "Felipe Almeida", email: "felipe.almeida@hotmail.com", plano: "VIP", status: "Inativo", data: "01/07/2026" }
    ];
}
if (!window.mockAdminTransactions) {
    window.mockAdminTransactions = [
        { id: "TX_9901", usuario: "Carlos Eduardo Silva", valor: 149.90, data: "25/07/2026", status: "Pago", metodo: "Cartão" },
        { id: "TX_9902", usuario: "Luciana Maria Souza", valor: 79.90, data: "26/07/2026", status: "Pago", metodo: "Pix" },
        { id: "TX_9903", usuario: "Juliana Mendes", valor: 79.90, data: "26/07/2026", status: "Pendente", metodo: "Cartão" },
        { id: "TX_9904", usuario: "Felipe Almeida", valor: 149.90, data: "20/07/2026", status: "Falhou", metodo: "Boleto" },
        { id: "TX_9905", usuario: "Gustavo Santos", valor: 79.90, data: "18/07/2026", status: "Pago", metodo: "Pix" }
    ];
}
if (!window.mockAdminApiKeys) {
    window.mockAdminApiKeys = [
        { id: 1, nome: "Assistente REMB Web", key: "sk-proj-4a...f39b", limite: "50k reqs", uso: "12,431", status: "Ativa" },
        { id: 2, nome: "Laboratório OCR", key: "sk-proj-d9...88a2", limite: "10k reqs", uso: "3,212", status: "Ativa" },
        { id: 3, nome: "Integração Mobile", key: "sk-proj-aa...11c4", limite: "100k reqs", uso: "0", status: "Inativa" }
    ];
}
if (!window.assistantActiveLogs) {
    window.assistantActiveLogs = [
        { hora: "17:02:15", acao: "Mnemônico gerado para Direito Constitucional (Art. 5º)" },
        { hora: "17:03:44", acao: "Engenharia Reversa ativada para Inquérito Policial" },
        { hora: "17:04:12", acao: "Transcrição de áudio enviada pelo usuário 12" },
        { hora: "17:05:01", acao: "Curadoria automática aprovou 5 afirmativas no Lab" }
    ];
}
if (!window.adminSubTabAtiva) {
    window.adminSubTabAtiva = 'geral';
}
if (window.assistantSystemOnline === undefined) {
    window.assistantSystemOnline = true;
}

window.renderizarAdminPanel = function() {
    const container = document.getElementById("admin-panel-content");
    if (!container) return;

    // Cabeçalho e Sub-abas segmentadas
    container.innerHTML = `
        <div class="planner-banner" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); margin-bottom: 25px;">
            <h1 class="planner-banner-title">👑 Painel Administrativo REMB</h1>
            <p class="planner-banner-desc">Centro de comando para gerenciamento de usuários, chaves de acesso, faturamento e auditoria do assistente pessoal.</p>
        </div>

        <div class="planner-subtabs">
            <button class="planner-subtab ${window.adminSubTabAtiva === 'geral' ? 'active' : ''}" onclick="window.renderizarSubTabAdmin('geral')">🤖 Status do REMB</button>
            <button class="planner-subtab ${window.adminSubTabAtiva === 'usuarios' ? 'active' : ''}" onclick="window.renderizarSubTabAdmin('usuarios')">👥 Usuários</button>
            <button class="planner-subtab ${window.adminSubTabAtiva === 'acessos' ? 'active' : ''}" onclick="window.renderizarSubTabAdmin('acessos')">🔑 Acessos & APIs</button>
            <button class="planner-subtab ${window.adminSubTabAtiva === 'financeiro' ? 'active' : ''}" onclick="window.renderizarSubTabAdmin('financeiro')">💰 Financeiro</button>
        </div>

        <div id="admin-subtab-container"></div>
    `;

    const subContainer = document.getElementById("admin-subtab-container");
    
    if (window.adminSubTabAtiva === 'geral') {
        window.renderizarAdminTabGeral(subContainer);
    } else if (window.adminSubTabAtiva === 'usuarios') {
        window.renderizarAdminTabUsuarios(subContainer);
    } else if (window.adminSubTabAtiva === 'acessos') {
        window.renderizarAdminTabAcessos(subContainer);
    } else if (window.adminSubTabAtiva === 'financeiro') {
        window.renderizarAdminTabFinanceiro(subContainer);
    }
};

window.renderizarSubTabAdmin = function(tabName) {
    window.adminSubTabAtiva = tabName;
    window.renderizarAdminPanel();
};

// 1. ABA GERAL: STATUS DO ASSISTENTE E MOCK LOGS
window.renderizarAdminTabGeral = function(container) {
    let logsHTML = "";
    window.assistantActiveLogs.forEach(l => {
        logsHTML += `
            <div style="font-family: monospace; font-size: 0.82rem; background-color: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 10px; color: var(--text-primary); display:flex; gap:10px;">
                <span style="color: var(--accent); font-weight: bold;">[${l.hora}]</span>
                <span>${l.acao}</span>
            </div>
        `;
    });

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
            <!-- Controle do Assistente -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h2 style="font-size:1.2rem; font-weight:850; color:var(--text-primary); margin-bottom:15px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">🤖 Estado do Assistente Pessoal</h2>
                    <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:20px;">
                        Gerencie a disponibilidade geral do assistente de inteligência de curação e engenharia reversa para os estudantes.
                    </p>
                    
                    <div style="display:flex; align-items:center; justify-content:space-between; background-color:var(--bg-primary); border:1px solid var(--border); padding:15px; border-radius:12px; margin-bottom:20px;">
                        <div>
                            <span style="font-weight:bold; font-size:0.95rem; display:block; color:var(--text-primary);">Status Operacional</span>
                            <span style="font-size:0.8rem; color:${window.assistantSystemOnline ? 'var(--correct)' : 'var(--incorrect)'}; font-weight:bold;">
                                ${window.assistantSystemOnline ? '● Sistema Online' : '● Em Manutenção / Offline'}
                            </span>
                        </div>
                        <button class="btn ${window.assistantSystemOnline ? 'btn-danger' : 'btn-success'}" onclick="window.toggleAssistantStatus()" style="font-weight:bold;">
                            ${window.assistantSystemOnline ? 'Desativar Assistente' : 'Ativar Assistente'}
                        </button>
                    </div>

                    <h3 style="font-size:0.9rem; font-weight:800; color:var(--text-secondary); margin-bottom:10px;">Módulos Adicionais Habilitados:</h3>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-primary); cursor:pointer;">
                            <input type="checkbox" checked style="width:16px; height:16px;"> Transcrição de Áudio
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-primary); cursor:pointer;">
                            <input type="checkbox" checked style="width:16px; height:16px;"> Leitor de PDF e Engenharia Reversa Automática
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-primary); cursor:pointer;">
                            <input type="checkbox" checked style="width:16px; height:16px;"> Mnemônicos e Resumos por IA
                        </label>
                    </div>
                </div>

                <div style="border-top:1.5px solid var(--border); padding-top:15px; margin-top:20px; font-size:0.8rem; color:var(--text-secondary);">
                    *A desativação do assistente interrompe temporariamente as respostas do robô de suporte na sala de questões.
                </div>
            </div>

            <!-- Logs de Atividade Real -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display:flex; flex-direction:column; justify-content:space-between; min-height:360px;">
                <div>
                    <h2 style="font-size:1.2rem; font-weight:850; color:var(--text-primary); margin-bottom:15px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">📋 Logs Recentes do Assistente</h2>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:5px;">
                        ${logsHTML}
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:15px; border-top:1.5px solid var(--border); padding-top:15px;">
                    <button class="btn btn-outline-secondary btn-sm" onclick="window.limparLogsMock()" style="font-weight:bold;">Limpar Logs</button>
                </div>
            </div>
        </div>
    `;
};

window.toggleAssistantStatus = function() {
    window.assistantSystemOnline = !window.assistantSystemOnline;
    window.assistantActiveLogs.unshift({
        hora: new Date().toTimeString().split(' ')[0],
        acao: `Status do Assistente alterado para: ${window.assistantSystemOnline ? 'ONLINE' : 'OFFLINE'}`
    });
    window.renderizarAdminPanel();
};

window.limparLogsMock = function() {
    window.assistantActiveLogs = [];
    window.renderizarAdminPanel();
};

// 2. ABA USUÁRIOS: GERENCIAMENTO DE CADASTROS MOCKADOS
window.renderizarAdminTabUsuarios = function(container) {
    let rowsHTML = "";
    window.mockAdminUsers.forEach(u => {
        let planoBadgeColor = "var(--text-secondary)";
        if (u.plano === "VIP") planoBadgeColor = "#a855f7";
        else if (u.plano === "Premium") planoBadgeColor = "var(--accent)";

        let statusText = "🟢 Ativo";
        if (u.status === "Suspenso") statusText = "🔴 Suspenso";
        else if (u.status === "Inativo") statusText = "⚪ Inativo";

        rowsHTML += `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px 8px; font-weight:bold; color:var(--text-primary);">${u.nome}</td>
                <td style="padding:12px 8px; color:var(--text-secondary);">${u.email}</td>
                <td style="padding:12px 8px; text-align:center; font-weight:bold; color:${planoBadgeColor};">${u.plano}</td>
                <td style="padding:12px 8px; text-align:center; font-weight:700;">${statusText}</td>
                <td style="padding:12px 8px; text-align:center; color:var(--text-secondary);">${u.data}</td>
                <td style="padding:12px 8px; text-align:right;">
                    <button class="btn btn-outline-secondary btn-sm" onclick="window.toggleUserStatusMock(${u.id})" style="font-size:0.75rem; padding:4px 8px; font-weight:700;">Alternar Status</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="window.deletarUserMock(${u.id})" style="font-size:0.75rem; padding:4px 8px; font-weight:700; margin-left:5px;">✕</button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding-bottom:15px; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                <h2 style="font-size: 1.2rem; font-weight: 850; color: var(--text-primary); margin:0;">👥 Gestão de Usuários Cadastrados</h2>
                <button class="btn btn-primary btn-sm" onclick="window.abrirModalNovoUserMock()" style="font-weight:750;">+ Novo Usuário</button>
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); text-align:left; color:var(--text-secondary); font-weight:700;">
                        <th style="padding-bottom:10px;">Nome</th>
                        <th style="padding-bottom:10px;">E-mail</th>
                        <th style="padding-bottom:10px; text-align:center;">Plano</th>
                        <th style="padding-bottom:10px; text-align:center;">Status</th>
                        <th style="padding-bottom:10px; text-align:center;">Ingresso</th>
                        <th style="padding-bottom:10px; text-align:right;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
        </div>

        <!-- Modal Novo Usuário -->
        <div id="adminNewUserModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
            <div class="card-base" style="background-color:var(--bg-card); border-radius:16px; width:360px; padding:25px; border: 2px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:15px; color:var(--text-primary);">👥 Cadastrar Usuário</h3>
                
                <input type="text" id="mockUserName" placeholder="Nome Completo" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:12px;">
                <input type="email" id="mockUserEmail" placeholder="E-mail" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:12px;">
                
                <select id="mockUserPlano" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:20px;">
                    <option value="Gratuito">Gratuito</option>
                    <option value="Premium">Premium</option>
                    <option value="VIP">VIP</option>
                </select>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-outline-secondary" onclick="window.fecharModalNovoUserMock()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.adicionarUserMock()">Cadastrar</button>
                </div>
            </div>
        </div>
    `;
};

window.abrirModalNovoUserMock = function() {
    const m = document.getElementById("adminNewUserModal");
    if (m) m.style.display = "flex";
};

window.fecharModalNovoUserMock = function() {
    const m = document.getElementById("adminNewUserModal");
    if (m) m.style.display = "none";
};

window.adicionarUserMock = function() {
    const nameEl = document.getElementById("mockUserName");
    const emailEl = document.getElementById("mockUserEmail");
    const planEl = document.getElementById("mockUserPlano");

    if (nameEl && nameEl.value && emailEl && emailEl.value) {
        const u = {
            id: Date.now(),
            nome: nameEl.value,
            email: emailEl.value,
            plano: planEl.value,
            status: "Ativo",
            data: new Date().toLocaleDateString('pt-BR')
        };
        window.mockAdminUsers.unshift(u);
        window.fecharModalNovoUserMock();
        window.renderizarAdminPanel();
    }
};

window.toggleUserStatusMock = function(userId) {
    const u = window.mockAdminUsers.find(x => x.id === userId);
    if (u) {
        u.status = u.status === "Ativo" ? "Suspenso" : "Ativo";
        window.renderizarAdminPanel();
    }
};

window.deletarUserMock = function(userId) {
    window.mockAdminUsers = window.mockAdminUsers.filter(x => x.id !== userId);
    window.renderizarAdminPanel();
};

// 3. ABA ACESSOS: CONFIGURAÇÃO DE CHAVES E MATRIZ
window.renderizarAdminTabAcessos = function(container) {
    let keysHTML = "";
    window.mockAdminApiKeys.forEach(k => {
        keysHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:10px 0;">
                <div>
                    <span style="font-weight:bold; font-size:0.9rem; color:var(--text-primary); display:block;">${k.nome}</span>
                    <code style="font-size:0.75rem; color:var(--text-secondary);">${k.key}</code>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">Uso: ${k.uso} / ${k.limite}</span>
                    <span style="font-weight:bold; font-size:0.8rem; color:${k.status === 'Ativa' ? 'var(--correct)' : 'var(--text-secondary)'};">${k.status}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:25px;">
            <!-- Chaves de API -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h2 style="font-size:1.2rem; font-weight:850; color:var(--text-primary); margin-bottom:15px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">🔑 Credenciais de API (Integrações)</h2>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    ${keysHTML}
                </div>
            </div>

            <!-- Matriz de Acessos -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h2 style="font-size:1.2rem; font-weight:850; color:var(--text-primary); margin-bottom:15px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">🛡️ Permissões por Grupo</h2>
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem; color:var(--text-primary);">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border); text-align:left; color:var(--text-secondary);">
                            <th style="padding-bottom:5px;">Recurso</th>
                            <th style="text-align:center; padding-bottom:5px;">Estudante</th>
                            <th style="text-align:center; padding-bottom:5px;">Tutor</th>
                            <th style="text-align:center; padding-bottom:5px;">Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 0;">Resolver Questões</td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                        </tr>
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 0;">Modo Laboratório</td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                        </tr>
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 0;">Aprovar Questões (Curadoria)</td>
                            <td style="text-align:center;"><input type="checkbox" disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                        </tr>
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 0;">Configurações Globais</td>
                            <td style="text-align:center;"><input type="checkbox" disabled></td>
                            <td style="text-align:center;"><input type="checkbox" disabled></td>
                            <td style="text-align:center;"><input type="checkbox" checked disabled></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// 4. ABA FINANCEIRO: RECEITAS MOCKADAS E GRÁFICOS
window.renderizarAdminTabFinanceiro = function(container) {
    let billingRows = "";
    let totalMRR = 0;
    
    window.mockAdminTransactions.forEach(t => {
        if (t.status === "Pago") {
            totalMRR += t.valor;
        }

        let statusColor = "var(--text-secondary)";
        if (t.status === "Pago") statusColor = "var(--correct)";
        else if (t.status === "Pendente") statusColor = "var(--warning)";
        else if (t.status === "Falhou") statusColor = "var(--incorrect)";

        billingRows += `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 5px; font-weight:bold; color:var(--text-primary);">${t.id}</td>
                <td style="padding:10px 5px; color:var(--text-primary);">${t.usuario}</td>
                <td style="padding:10px 5px; text-align:center; color:var(--text-secondary);">${t.metodo}</td>
                <td style="padding:10px 5px; text-align:center; font-weight:bold; color:var(--text-primary);">R$ ${t.valor.toFixed(2)}</td>
                <td style="padding:10px 5px; text-align:center; font-weight:bold; color:${statusColor};">${t.status}</td>
                <td style="padding:10px 5px; text-align:right; color:var(--text-secondary);">${t.data}</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <!-- Métricas KPI -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:25px;">
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius:12px; padding:18px; background-color:var(--bg-card);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Faturamento Mensal (MRR)</span>
                <strong style="display:block; font-size:1.5rem; font-weight:850; color:var(--accent); margin-top:4px;">R$ ${totalMRR.toFixed(2)}</strong>
            </div>
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius:12px; padding:18px; background-color:var(--bg-card);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">ARPU (Ticket Médio)</span>
                <strong style="display:block; font-size:1.5rem; font-weight:850; color:var(--text-primary); margin-top:4px;">R$ 93,88</strong>
            </div>
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius:12px; padding:18px; background-color:var(--bg-card);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Churn Rate (Cancelamento)</span>
                <strong style="display:block; font-size:1.5rem; font-weight:850; color:var(--incorrect); margin-top:4px;">2,4%</strong>
            </div>
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius:12px; padding:18px; background-color:var(--bg-card);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Transações Concluídas</span>
                <strong style="display:block; font-size:1.5rem; font-weight:850; color:var(--correct); margin-top:4px;">${window.mockAdminTransactions.filter(x => x.status === 'Pago').length}</strong>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:25px; margin-bottom:25px;">
            <!-- Gráfico de Receita -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card);">
                <h2 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:15px;">📈 Evolução de Faturamento</h2>
                <div class="chart-container-planner" style="height:210px;">
                    <canvas id="admin-finance-chart"></canvas>
                </div>
            </div>

            <!-- Tabela de Transações -->
            <div class="card-base" style="border: 1.5px solid var(--border); border-radius: 16px; padding: 25px; background-color: var(--bg-card); display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:12px;">
                        <h2 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin:0;">💳 Transações Recentes</h2>
                        <button class="btn btn-outline-primary btn-sm" onclick="window.abrirModalVendaMock()" style="font-weight:750; font-size:0.8rem;">+ Registrar Faturamento</button>
                    </div>

                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                        <thead>
                            <tr style="border-bottom:1.5px solid var(--border); text-align:left; color:var(--text-secondary);">
                                <th style="padding-bottom:5px;">ID</th>
                                <th style="padding-bottom:5px;">Usuário</th>
                                <th style="padding-bottom:5px; text-align:center;">Método</th>
                                <th style="padding-bottom:5px; text-align:center;">Valor</th>
                                <th style="padding-bottom:5px; text-align:center;">Status</th>
                                <th style="padding-bottom:5px; text-align:right;">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billingRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal Nova Venda -->
        <div id="adminNewSaleModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
            <div class="card-base" style="background-color:var(--bg-card); border-radius:16px; width:350px; padding:25px; border: 2px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:15px; color:var(--text-primary);">💰 Registrar Venda</h3>
                
                <input type="text" id="mockSaleUser" placeholder="Nome do Comprador" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:12px;">
                <input type="number" id="mockSaleValor" placeholder="Valor (ex: 79.90)" step="0.01" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:12px;">
                
                <select id="mockSaleMetodo" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); font-size:0.9rem; margin-bottom:20px;">
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão de Crédito</option>
                    <option value="Boleto">Boleto Bancário</option>
                </select>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-outline-secondary" onclick="window.fecharModalVendaMock()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.adicionarVendaMock()">Confirmar Venda</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.renderizarGraficoFinanceiro();
    }, 100);
};

window.abrirModalVendaMock = function() {
    const m = document.getElementById("adminNewSaleModal");
    if (m) m.style.display = "flex";
};

window.fecharModalVendaMock = function() {
    const m = document.getElementById("adminNewSaleModal");
    if (m) m.style.display = "none";
};

window.adicionarVendaMock = function() {
    const userEl = document.getElementById("mockSaleUser");
    const valorEl = document.getElementById("mockSaleValor");
    const metodoEl = document.getElementById("mockSaleMetodo");

    if (userEl && userEl.value && valorEl && valorEl.value) {
        const val = parseFloat(valorEl.value);
        const t = {
            id: "TX_" + (9900 + window.mockAdminTransactions.length + 1),
            usuario: userEl.value,
            valor: val,
            data: new Date().toLocaleDateString('pt-BR'),
            status: "Pago",
            metodo: metodoEl.value
        };
        window.mockAdminTransactions.unshift(t);
        window.fecharModalVendaMock();
        window.renderizarAdminPanel();
    }
};

window.renderizarGraficoFinanceiro = function() {
    const ctx = document.getElementById('admin-finance-chart')?.getContext('2d');
    if (!ctx) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#3b82f6';
    const textSecColor = rootStyle.getPropertyValue('--text-secondary').trim() || '#475569';
    
    // Obter dados recentes baseados no totalMRR atual
    let totalMRRPago = 0;
    window.mockAdminTransactions.forEach(t => {
        if (t.status === "Pago") totalMRRPago += t.valor;
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
            datasets: [{
                label: 'Receita Mensal (R$)',
                data: [1200, 1850, 2400, 3100, 4250, totalMRRPago],
                borderColor: accentColor,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.03)' },
                    ticks: { color: textSecColor, font: { size: 9 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textSecColor, font: { size: 9 } }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
};
