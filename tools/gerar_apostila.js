'use strict';
/**
 * Gera docs/apostila-lpa2v.docx.
 *
 *   npm run doc:apostila
 *
 * A regra que sustenta a apostila: nenhum número é escrito à mão. Cada exemplo
 * resolvido e cada gabarito sai de src/renderer/js/ui_reticulado.js — as mesmas
 * funções que rodam na aba Reticulado, cobertas por tools/ui_test.js e
 * conferidas contra o C++ compilado. Gabarito errado é pior que gabarito
 * ausente, porque o aluno confia.
 *
 * Aqui se extrai o conteúdo; tools/gerar_apostila.py monta o .docx.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { carregar, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;
const Toolbox = amb.Toolbox;

/* O módulo do reticulado é do renderer; aqui roda no mesmo truque do harness. */
(0, eval)(fs.readFileSync(
    path.join(RAIZ, 'src/renderer/js/ui_reticulado.js'), 'utf8'));
const R = global.UIReticulado;
R.el = {};

Boards.selecionar('uno');

/* ------------------------------------------------------------------ */
/* Formatação em português                                             */
/* ------------------------------------------------------------------ */

const n = (v, casas) => {
    const d = casas === undefined ? 3 : casas;
    return Number(v).toFixed(d).replace('.', ',');
};
const ns = (v, casas) => (v >= 0 ? '+' : '−') + n(Math.abs(v), casas);

/* ------------------------------------------------------------------ */
/* Resolução de uma anotação, com os passos escritos                    */
/* ------------------------------------------------------------------ */

/**
 * Resolve P(μ, λ) e devolve os passos prontos para virar texto.
 * `mu2` presente significa que a segunda fonte veio favorável e foi
 * convertida pelo complemento.
 */
function resolver(mu, lam, mu2) {
    const gc = R.gc(mu, lam);
    const gct = R.gct(mu, lam);
    const a = R.analise(gc, gct);
    const est = R.estado(gc, gct);
    const inv = { mu: (gc + gct + 1) / 2, lam: (-gc + gct + 1) / 2 };

    const passos = [];
    if (mu2 !== undefined) {
        passos.push('λ = 1 − μ₂ = 1 − ' + n(mu2) + ' = ' + n(lam));
    }
    passos.push('anotação (μ, λ) = (' + n(mu) + '; ' + n(lam) + ')  →  ' +
        'Sinal Paraconsistente P(' + n(mu) + '; ' + n(lam) + ')');
    passos.push('Gc = μ − λ = ' + n(mu) + ' − ' + n(lam) + ' = ' + ns(gc));
    passos.push('Gct = μ + λ − 1 = ' + n(mu) + ' + ' + n(lam) + ' − 1 = ' + ns(gct));
    passos.push('estado lógico ετ = (' + ns(gc) + '; ' + ns(gct) + ')  →  ' +
        est + ' (' + R.nomeEstado(est) + ')');
    passos.push('φ = 1 − |Gct| = ' + n(a.phi));
    passos.push('D = √((1 − |Gc|)² + Gct²) = ' + n(a.d, 4));
    if (a.indefinido) {
        passos.push('como ' + (a.phi <= 0.25 ? 'φ ≤ 0,25' : 'D > 1') +
            ', a análise NÃO conclui: Gcr = 0 e μEr = 0,5');
    } else {
        passos.push('Gcr = ' + (gc > 0 ? '1 − D' : 'D − 1') + ' = ' + ns(a.gcr, 4));
        passos.push('μEr = (Gcr + 1) / 2 = ' + n(a.muEr, 4));
    }
    return {
        mu: mu, lambda: lam, mu2: mu2 === undefined ? null : mu2,
        gc: gc, gct: gct, phi: a.phi, d: a.d,
        indefinido: a.indefinido, gcr: a.gcr, muEr: a.muEr,
        estado: est, nomeEstado: R.nomeEstado(est),
        inversaOk: Math.abs(inv.mu - mu) < 1e-9 && Math.abs(inv.lam - lam) < 1e-9,
        passos: passos,
        resumo: 'Gc = ' + ns(gc) + ' · Gct = ' + ns(gct) + ' · ' + est +
            (a.indefinido ? ' · INDEFINIÇÃO' : ' · Gcr = ' + ns(a.gcr, 4))
    };
}

/** Normalização linear no Universo de Discurso, com o passo escrito. */
function normalizar(x, a1, a2) {
    let t = (x - a1) / (a2 - a1);
    t = Math.max(0, Math.min(1, t));
    return {
        x: x, a1: a1, a2: a2, mu: t,
        passo: 'μ(' + n(x, 1) + ') = (' + n(x, 1) + ' − ' + n(a1, 0) + ') / (' +
            n(a2, 0) + ' − ' + n(a1, 0) + ') = ' + n(t)
    };
}

/* ------------------------------------------------------------------ */
/* Exemplos resolvidos                                                 */
/* ------------------------------------------------------------------ */

const exemplos = [
    {
        cap: 5,
        titulo: 'Dois especialistas opinam sobre a mesma proposição',
        enunciado: 'Dois técnicos avaliam a proposição "o motor está desgastado". ' +
            'O primeiro atribui 0,78 de evidência a favor. O segundo, olhando o ' +
            'mesmo motor, atribui 0,39. Monte a anotação e o Sinal Paraconsistente, ' +
            'tomando o segundo como fonte de evidência desfavorável.',
        r: resolver(0.78, 1 - 0.39, 0.39),
        ate: 2
    },
    {
        cap: 7,
        titulo: 'Do Sinal Paraconsistente aos dois graus',
        enunciado: 'Para o Sinal P(0,78; 0,61) do exemplo anterior, calcule o Grau ' +
            'de Certeza e o Grau de Contradição, e diga em que região do reticulado ' +
            'o estado cai.',
        r: resolver(0.78, 0.61),
        ate: 5
    },
    {
        cap: 10,
        titulo: 'Uma análise que conclui',
        enunciado: 'Duas fontes enviam 0,86 e 0,72 de evidência favorável à ' +
            'proposição. Calcule tudo, até o Grau de Evidência Resultante Real.',
        r: resolver(0.86, 1 - 0.72, 0.72),
        ate: 99
    },
    {
        cap: 10,
        titulo: 'Uma análise que NÃO conclui',
        enunciado: 'Agora as fontes enviam 0,90 e 0,10 — discordância quase total. ' +
            'Repita a conta e observe onde ela para.',
        r: resolver(0.90, 1 - 0.10, 0.10),
        ate: 99
    },
    {
        cap: 11,
        titulo: 'Normalizando uma medida de IMC',
        enunciado: 'A Organização Mundial da Saúde considera obesidade grave a ' +
            'partir de IMC 40, e a faixa de interesse começa em 25. Um paciente ' +
            'mede 37 kg/m². Qual o Grau de Evidência favorável à proposição "o ' +
            'paciente tem obesidade grave", com valoração linear crescente?',
        norm: normalizar(37, 25, 40),
        ate: 0
    },
    {
        cap: 11,
        titulo: 'Normalizando duas distâncias',
        enunciado: 'Na esteira, o Universo de Discurso vai de 25 cm (peça rasa) a ' +
            '12 cm (peça alta) — decrescente, porque quanto mais alta a peça, menor ' +
            'a distância medida. Os sensores leem 13 cm e 14 cm. Calcule μ e λ e ' +
            'analise.',
        norm2: [normalizar(13, 25, 12), normalizar(14, 25, 12)],
        ate: 0
    }
];
// o exemplo 6 depende dos dois μ recém-normalizados
exemplos[5].r = resolver(exemplos[5].norm2[0].mu,
    1 - exemplos[5].norm2[1].mu, exemplos[5].norm2[1].mu);

/* ------------------------------------------------------------------ */
/* Exercícios com gabarito                                             */
/* ------------------------------------------------------------------ */

function ex(cap, enunciado, r, comentario) {
    return { cap: cap, enunciado: enunciado, r: r, comentario: comentario || '' };
}

const exercicios = [
    ex(5, 'Uma fonte informa 0,725 e outra 0,834, ambas favoráveis à proposição. ' +
        'Tomando a segunda como desfavorável, escreva a anotação e o Sinal ' +
        'Paraconsistente.', resolver(0.725, 1 - 0.834, 0.834),
        'Repare que a segunda fonte, mais confiante que a primeira, puxa λ para ' +
        'baixo — e é isso que faz o Grau de Certeza subir.'),
    ex(5, 'Idem, para 0,325 e 0,422.', resolver(0.325, 1 - 0.422, 0.422),
        'Aqui as duas fontes são fracas: o estado fica do lado negativo, mas longe ' +
        'do vértice F.'),
    ex(7, 'Calcule Gc e Gct para P(0,90; 0,20) e identifique o estado.',
        resolver(0.90, 0.20),
        'Gc alto e Gct perto de zero: é o caso confortável, as duas fontes ' +
        'concordam e afirmam.'),
    ex(7, 'Calcule Gc e Gct para P(0,20; 0,90) e identifique o estado.',
        resolver(0.20, 0.90),
        'Espelho do anterior: mesma intensidade, sentido oposto.'),
    ex(9, 'Classifique P(0,675423; 0,2876433) nas 12 regiões, com os valores de ' +
        'controle no padrão ±0,5.', resolver(0.675423, 0.2876433),
        'Gc não chega a 0,5, então não é V. Como Gc ≥ |Gct| e Gct é negativo, cai ' +
        'em Qv→⊥.'),
    ex(9, 'Classifique P(0,90; 0,90).', resolver(0.90, 0.90),
        'As duas evidências no alto: contradição máxima. É o caso em que a análise ' +
        'avisa em vez de responder.'),
    ex(9, 'Classifique P(0,10; 0,10).', resolver(0.10, 0.10),
        'As duas evidências no chão: ninguém sabe de nada. Indeterminado, não falso.'),
    ex(10, 'Para P(0,525; 0,525), calcule D e diga se a análise conclui.',
        resolver(0.525, 0.525),
        'Gc = 0 exato. Sempre que Gc é zero, D ≥ 1 e a análise não conclui — não ' +
        'existe certeza nenhuma a extrair.'),
    ex(10, 'Para P(0,18; 0,64), calcule Gcr.', resolver(0.18, 0.64),
        'Gc é negativo, então Gcr = D − 1 e o resultado sai negativo. Sinal ' +
        'negativo em Gcr quer dizer certeza de que a proposição é falsa.'),
    ex(11, 'Um segundo método mede o mesmo paciente e encontra IMC 33,9. Com o ' +
        'Universo de Discurso de 25 a 40 e valoração linear decrescente, qual o ' +
        'Grau de Evidência desfavorável?',
        null, 'Pela linear decrescente, μ(33,9) = (33,9 − 40) / (25 − 40) = 0,407. ' +
        'Como essa fonte já foi modelada como desfavorável, esse valor é o próprio λ.',
        null),
    ex(11, 'Os sensores da esteira leem 23 cm e 24 cm, no Universo de 25 a 12 cm. ' +
        'Normalize, monte a anotação e classifique.',
        null, null)
];
exercicios[9].norm = normalizar(33.9, 40, 25);
{
    const a = normalizar(23, 25, 12);
    const b = normalizar(24, 25, 12);
    exercicios[10].norm2 = [a, b];
    exercicios[10].r = resolver(a.mu, 1 - b.mu, b.mu);
    exercicios[10].comentario = 'Peça rasa: as duas fontes concordam que não é ' +
        'grande, e o estado cai do lado de F.';
}

/* ------------------------------------------------------------------ */
/* Guardas de coerência                                                */
/* ------------------------------------------------------------------ */

let erros = 0;
function checar(cond, msg) {
    if (!cond) { console.error('✗ ' + msg); erros++; }
}

exemplos.concat(exercicios).forEach((e, i) => {
    if (!e.r) return;
    checar(e.r.inversaOk, 'exemplo/exercício ' + i + ': a transformação inversa não fecha');
    checar(Math.abs(e.r.gc) + Math.abs(e.r.gct) <= 1 + 1e-9,
        'exemplo/exercício ' + i + ': estado fora do reticulado');
    checar(!!e.r.estado && e.r.estado !== '?',
        'exemplo/exercício ' + i + ': estado não classificado');
});

const categoria = Toolbox.construir().contents
    .find(c => c.name === 'Lógica Paraconsistente');
checar(!!categoria, 'categoria "Lógica Paraconsistente" fora da toolbox');

const tiposLp = Object.keys(Bk.Blocks).filter(t => t.indexOf('lp_') === 0).sort();

/* ------------------------------------------------------------------ */
/* Blocos: rótulo, tooltip e C++                                       */
/* ------------------------------------------------------------------ */

/** Rótulo visível e dica do bloco — os dois só existem no bloco instanciado. */
function rotuloEDica(tipo) {
    const ws = new Bk.Workspace();
    try {
        const b = ws.newBlock(tipo);
        b.initModel && b.initModel();
        const partes = [];
        (b.inputList || []).forEach(input => {
            (input.fieldRow || []).forEach(f => {
                const t = f.getText ? f.getText() : '';
                if (t) partes.push(t);
            });
            if (input.connection) partes.push('[ ]');
        });
        const dica = typeof b.getTooltip === 'function' ? b.getTooltip() : (b.tooltip || '');
        return {
            rotulo: partes.join(' ').replace(/\s+/g, ' ').trim(),
            dica: String(dica || '')
        };
    } finally { ws.dispose(); }
}

function cppDoBloco(tipo) {
    const ws = new Bk.Workspace();
    try {
        const setup = ws.newBlock('ard_setup');
        setup.initModel && setup.initModel();
        const b = ws.newBlock(tipo);
        b.initModel && b.initModel();
        if (b.outputConnection) {
            const pr = ws.newBlock('ard_serial_println');
            pr.initModel && pr.initModel();
            pr.getInput('VALOR').connection.connect(b.outputConnection);
            setup.getInput('BODY').connection.connect(pr.previousConnection);
        } else if (b.previousConnection) {
            setup.getInput('BODY').connection.connect(b.previousConnection);
        }
        const code = Gen.workspaceToCode(ws);
        const corpo = (code.split('void setup() {\n')[1] || '').split('\n}')[0];
        return corpo.split('\n').map(l => l.replace(/^ {2}/, '')).join('\n').trim();
    } catch (e) {
        return '';
    } finally { ws.dispose(); }
}

const GRUPOS = [
    {
        nome: 'Para transformar leitura em evidência',
        quando: 'Sempre no começo: o sensor fala em volts, centímetros ou kg/m², e a ' +
            'LPA2v só trabalha entre 0 e 1.',
        tipos: ['lp_evidencia', 'lp_complemento']
    },
    {
        nome: 'Para calcular e olhar os graus',
        quando: 'Quando você quer o número — para imprimir no monitor, alimentar o ' +
            'reticulado ou tomar uma decisão sua.',
        tipos: ['lp_grau', 'lp_estado', 'lp_estado_nome', 'lp_indefinicao', 'lp_nap']
    },
    {
        nome: 'Para decidir',
        quando: 'O coração da aplicação: um caminho de programa para cada região do ' +
            'reticulado.',
        tipos: ['lp_para_analisador', 'lp_para_analisador_simples', 'lp_caso', 'lp_senao']
    },
    {
        nome: 'Para combinar mais de duas fontes',
        quando: 'Quando há três ou mais evidências sobre a mesma proposição, ou ' +
            'quando se quer o máximo ou o mínimo entre duas.',
        tipos: ['lp_conectivo', 'lp_extractor']
    }
];

const cobertos = GRUPOS.reduce((a, g) => a.concat(g.tipos), []).sort();
checar(JSON.stringify(cobertos) === JSON.stringify(tiposLp),
    'os grupos da apostila não cobrem exatamente os blocos lp_\n' +
    '  definidos: ' + tiposLp.join(', ') + '\n' +
    '  na apostila: ' + cobertos.join(', '));

const grupos = GRUPOS.map(g => ({
    nome: g.nome,
    quando: g.quando,
    blocos: g.tipos.map(t => {
        const r = rotuloEDica(t);
        return { tipo: t, rotulo: r.rotulo, tooltip: r.dica, cpp: cppDoBloco(t) };
    })
}));

/* ------------------------------------------------------------------ */
/* Sketch do exemplo oficial                                           */
/* ------------------------------------------------------------------ */

const proj = JSON.parse(fs.readFileSync(
    path.join(RAIZ, 'exemplos', '08-lpa2v-esteira-braco.tbk'), 'utf8'));
Boards.selecionar(proj.placa);
const wsEx = new Bk.Workspace();
Bk.serialization.workspaces.load(proj.workspace, wsEx);
const codigoEx = Gen.workspaceToCode(wsEx);
checar((Gen.avisos_ || []).length === 0,
    'o exemplo oficial gera avisos: ' + JSON.stringify(Gen.avisos_));
wsEx.dispose();
Boards.selecionar('uno');

function trecho(marca, linhas) {
    const i = codigoEx.indexOf(marca);
    return i === -1 ? '' : codigoEx.slice(i).split('\n').slice(0, linhas).join('\n');
}

/* cenários da bancada, todos resolvidos de verdade */
const cenarios = [
    [13, 14, 'peça alta'],
    [23, 24, 'peça rasa'],
    [13, 24, 'peça atravessada'],
    [24, 13, 'atravessada ao contrário'],
    [18, 19, 'altura na fronteira']
].map(cc => {
    const a = normalizar(cc[0], 25, 12);
    const b = normalizar(cc[1], 25, 12);
    const r = resolver(a.mu, 1 - b.mu, b.mu);
    return {
        d1: cc[0], d2: cc[1], rotulo: cc[2],
        mu: n(a.mu), lambda: n(1 - b.mu),
        gc: ns(r.gc), gct: ns(r.gct), estado: r.estado,
        indefinido: r.indefinido
    };
});

if (erros) {
    console.error('\n' + erros + ' problema(s) de coerência — apostila não gerada.');
    process.exit(1);
}

/* ------------------------------------------------------------------ */

const dados = {
    gerado: new Date().toISOString(),
    contagens: { blocosLp: tiposLp.length },
    exemplos: exemplos,
    exercicios: exercicios,
    grupos: grupos,
    cenarios: cenarios,
    sketch: {
        medirSensores: trecho('void medirSensores() {', 22),
        loop: trecho('void loop() {', 30),
        depositar: trecho('void depositar() {', 16)
    }
};

const destino = path.join(os.tmpdir(), 'taskarduino-apostila.json');
fs.writeFileSync(destino, JSON.stringify(dados, null, 2), 'utf8');

console.log('conteúdo da apostila resolvido pelo código do aplicativo:');
console.log('  ' + exemplos.length + ' exemplos resolvidos');
console.log('  ' + exercicios.length + ' exercícios com gabarito');
console.log('  ' + tiposLp.length + ' blocos documentados');
console.log('  ' + cenarios.length + ' cenários da bancada');

const r = spawnSync('python3', [path.join(__dirname, 'gerar_apostila.py'), destino],
    { stdio: 'inherit', cwd: RAIZ });
process.exit(r.status === 0 ? 0 : 1);
