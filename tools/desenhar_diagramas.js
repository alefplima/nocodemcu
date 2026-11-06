'use strict';
/**
 * Diagramas e ilustração do artigo do carro 4x4, em SVG e PNG (2x).
 *
 *   npx electron tools/desenhar_diagramas.js
 *
 * Saída em docs/img_artigo_tarefas/:
 *   diag-contexto       visão de alto nível: quem programa, a placa, o ambiente,
 *                       a rede e o operador;
 *   diag-lpa2v          a função de que o carro depende para andar sozinho,
 *                       "dirigir pela LPA2v", com o "conferir se está preso";
 *   ilustracao-preso    o carro travado na barreira, a câmera no celular.
 *
 * As cores são as das categorias de blocos da IDE (matiz do Blockly com
 * saturação 0,45 e brilho 0,65), para o diagrama conversar com os prints.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SAIDA = path.join(__dirname, '..', 'docs', 'img_artigo_tarefas');
const FONTE = 'Segoe UI, Arial, Helvetica, sans-serif';

/* ------------------------------------------------------------------ */
/* Cores                                                               */
/* ------------------------------------------------------------------ */

function hsv(h, s = 0.45, v = 0.65) {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(k => Math.round((k + m) * 255).toString(16).padStart(2, '0')).join('');
}
function claro(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16, (n >> 8) & 255, n & 255].map(k => Math.round(k + (255 - k) * t));
    return '#' + ch.map(k => k.toString(16).padStart(2, '0')).join('');
}

const COR = {
    estrutura: hsv(260), tarefa: hsv(160), io: hsv(20), rede: hsv(100), lp: hsv(290),
    ctrl: hsv(210), percepcao: hsv(45), neutro: '#7b8494', texto: '#1f2430', fraco: '#5a6170'
};
const ESTADO = {
    V: '#3f9a5a', QVT: '#7f9f3a', F: '#c95454', T: '#cf9a1e', PC: '#5a68c8', demais: '#7b8494'
};

/* ------------------------------------------------------------------ */
/* Primitivas                                                          */
/* ------------------------------------------------------------------ */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Svg {
    constructor(w, h, fundo) {
        this.w = w; this.h = h;
        this.partes = [];
        this.marcas = new Map();
        if (fundo !== null) this.partes.push(`<rect width="${w}" height="${h}" fill="${fundo || '#ffffff'}"/>`);
    }
    add(s) { this.partes.push(s); return this; }

    texto(x, y, s, o = {}) {
        const { tam = 18, peso = 400, cor = COR.texto, ancora = 'middle', italico = false } = o;
        return this.add(`<text x="${x}" y="${y}" text-anchor="${ancora}" font-family="${FONTE}" ` +
            `font-size="${tam}" font-weight="${peso}"${italico ? ' font-style="italic"' : ''} fill="${cor}">${esc(s)}</text>`);
    }

    /** Caixa com faixa de título colorida e linhas de texto embaixo. */
    caixa(x, y, w, h, cor, titulo, linhas = [], o = {}) {
        const { fundo = claro(cor, 0.88), faixa = 44, tamLinha = 16, raio = 12 } = o;
        this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${raio}" fill="${fundo}" stroke="${cor}" stroke-width="2.2"/>`);
        this.add(`<path d="M${x} ${y + raio} a${raio} ${raio} 0 0 1 ${raio} ${-raio} h${w - 2 * raio} a${raio} ${raio} 0 0 1 ${raio} ${raio} v${faixa - raio} h${-w} z" fill="${cor}"/>`);
        this.texto(x + w / 2, y + faixa / 2 + 6.5, titulo, { tam: 18, peso: 700, cor: '#ffffff' });
        const passo = tamLinha + 7;
        const y0 = y + faixa + (h - faixa - passo * linhas.length) / 2 + tamLinha;
        linhas.forEach((l, i) => this.texto(x + w / 2, y0 + i * passo, l, { tam: tamLinha, cor: COR.texto }));
        return this;
    }

    marca(cor) {
        if (!this.marcas.has(cor)) this.marcas.set(cor, 'm' + this.marcas.size);
        return this.marcas.get(cor);
    }

    /** Polilinha com ponta; `dupla` põe ponta nos dois lados. */
    seta(pts, o = {}) {
        const { cor = '#4a5160', tracejado = false, dupla = false, largura = 2.4, rotulo, rx, ry, rancora = 'middle' } = o;
        const id = this.marca(cor);
        const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
        this.add(`<path d="${d}" fill="none" stroke="${cor}" stroke-width="${largura}"` +
            `${tracejado ? ' stroke-dasharray="9 7"' : ''} marker-end="url(#${id})"${dupla ? ` marker-start="url(#${id})"` : ''}/>`);
        if (rotulo) this.rotulo(rx, ry, rotulo, rancora);
        return this;
    }

    /** Texto sobre fundo branco, para cruzar linhas sem sumir. */
    rotulo(x, y, s, ancora = 'middle', tam = 15) {
        const w = s.length * tam * 0.52 + 14;
        const x0 = ancora === 'middle' ? x - w / 2 : ancora === 'start' ? x - 7 : x - w + 7;
        this.add(`<rect x="${x0}" y="${y - tam}" width="${w}" height="${tam + 9}" rx="5" fill="#ffffff" fill-opacity="0.92"/>`);
        return this.texto(x, y, s, { tam, cor: COR.fraco, ancora, italico: true });
    }

    ator(x, y, nome, cor) {
        this.add(`<g stroke="${cor}" stroke-width="4" stroke-linecap="round" fill="none">` +
            `<circle cx="${x}" cy="${y - 52}" r="15" fill="${claro(cor, 0.8)}"/>` +
            `<path d="M${x} ${y - 37} v40 M${x - 26} ${y - 22} h52 M${x} ${y + 3} l-20 32 M${x} ${y + 3} l20 32"/></g>`);
        return this.texto(x, y + 62, nome, { tam: 16, peso: 600, cor });
    }

    losango(cx, cy, hw, hh, cor, linhas) {
        this.add(`<path d="M${cx} ${cy - hh} L${cx + hw} ${cy} L${cx} ${cy + hh} L${cx - hw} ${cy} Z" ` +
            `fill="${claro(cor, 0.85)}" stroke="${cor}" stroke-width="2.4"/>`);
        const passo = 23;
        linhas.forEach((l, i) => this.texto(cx, cy + 6 + (i - (linhas.length - 1) / 2) * passo, l,
            { tam: 17, peso: i === 0 ? 700 : 400 }));
        return this;
    }

    toString() {
        const defs = Array.from(this.marcas.entries()).map(([cor, id]) =>
            `<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
            `<path d="M0,1 L9,5 L0,9 z" fill="${cor}"/></marker>`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">` +
            `<defs>${defs}</defs>${this.partes.join('')}</svg>`;
    }
}

/* ------------------------------------------------------------------ */
/* 1. Contexto                                                         */
/* ------------------------------------------------------------------ */

function contexto() {
    const s = new Svg(1800, 1090);

    // Desenvolvimento
    s.add('<rect x="20" y="20" width="1760" height="240" rx="18" fill="#f3f4f8" stroke="#c9ced8" stroke-width="2" stroke-dasharray="10 7"/>');
    s.texto(44, 54, 'DESENVOLVIMENTO · no computador, sem digitar código', { tam: 17, peso: 700, cor: COR.fraco, ancora: 'start' });
    s.ator(110, 168, 'Projetista', COR.estrutura);
    s.caixa(220, 80, 470, 160, COR.estrutura, 'NoCodeMCU · Modo Abstrato',
        ['blocos só com parâmetros', 'tarefas com nome:', '“tarefa” e “fazer a tarefa”']);
    s.caixa(770, 80, 400, 160, COR.ctrl, 'Gerador de código',
        ['cada tarefa → uma função void', 'C++ completo, ao vivo', 'no painel ao lado']);
    s.caixa(1250, 80, 420, 160, COR.percepcao, 'arduino-cli embutido',
        ['compila para a ESP32-S3', 'grava pela USB', 'sem instalar a IDE do Arduino']);
    s.seta([[150, 160], [214, 160]]);
    s.seta([[690, 160], [764, 160]]);
    s.seta([[1170, 160], [1244, 160]]);

    // A placa
    s.add(`<rect x="470" y="330" width="860" height="470" rx="18" fill="#faf8fd" stroke="${COR.estrutura}" stroke-width="3"/>`);
    s.add(`<path d="M470 348 a18 18 0 0 1 18 -18 h824 a18 18 0 0 1 18 18 v30 h-860 z" fill="${COR.estrutura}"/>`);
    s.texto(900, 362, 'ESP32-S3 CAM · programa do exemplo 16', { tam: 19, peso: 700, cor: '#fff' });
    s.seta([[1460, 240], [1460, 295], [1180, 295], [1180, 324]], { rotulo: 'USB · gravação', rx: 1320, ry: 290 });

    s.caixa(500, 405, 250, 150, COR.estrutura, 'Ao iniciar', ['pinos da ponte H', 'parâmetros (caixas)', 'ligar rede e câmera']);
    s.texto(510, 610, '10 tarefas', { tam: 17, peso: 700, cor: COR.tarefa, ancora: 'start' });
    s.texto(510, 636, '230 blocos', { tam: 16, cor: COR.fraco, ancora: 'start' });
    s.texto(510, 660, '“Sempre” com 7 linhas', { tam: 16, cor: COR.fraco, ancora: 'start' });

    s.add(`<rect x="780" y="398" width="525" height="382" rx="14" fill="none" stroke="${COR.estrutura}" stroke-width="2" stroke-dasharray="8 6"/>`);
    s.texto(795, 424, 'Sempre · um ciclo a cada ~60 ms', { tam: 15, peso: 700, cor: COR.estrutura, ancora: 'start' });
    s.caixa(800, 440, 230, 140, COR.percepcao, '1 · Perceber', ['medir as distâncias', 'calcular as evidências']);
    s.caixa(1055, 440, 230, 140, COR.lp, '2 · Decidir', ['dirigir pela LPA2v', 'ou pelo operador', 'conferir se está preso'], { tamLinha: 15 });
    s.caixa(1055, 615, 230, 140, COR.io, '3 · Agir', ['frente, ré, giro', 'ou parar']);
    s.caixa(800, 615, 230, 140, COR.rede, '4 · Informar', ['reticulado e valores', 'na página; câmera', 'quando preso'], { tamLinha: 15 });
    s.seta([[750, 480], [774, 480]]);
    s.seta([[1030, 510], [1049, 510]]);
    s.seta([[1170, 580], [1170, 609]]);
    s.seta([[1055, 685], [1036, 685]]);
    s.seta([[915, 615], [915, 586]]);

    // Ambiente e sensores
    s.caixa(40, 380, 340, 150, COR.io, '2 × HC-SR04', ['esquerdo: disparo 14, eco 21', 'direito: disparo 47, eco 40', 'eco com divisor 1k/2k'], { tamLinha: 15 });
    s.caixa(40, 610, 340, 150, COR.neutro, 'Trajeto', ['paredes e obstáculos', 'barreira à frente']);
    s.seta([[210, 610], [210, 536]], { rotulo: 'eco ultrassônico', rx: 290, ry: 578 });
    s.seta([[380, 470], [450, 470], [450, 580], [770, 580], [770, 510], [794, 510]], { rotulo: 'distância (cm)', rx: 620, ry: 575 });

    // Atuadores e câmera
    s.caixa(1420, 380, 340, 150, COR.io, 'L298N + 4 motores', ['tração 4x4 (skid steer)', 'IN 1/2 direita · 42/41 esquerda'], { tamLinha: 15 });
    s.caixa(1420, 610, 340, 150, COR.rede, 'Câmera OV5640', ['dorme enquanto a LPA2v dirige', 'vídeo só quando preso'], { tamLinha: 15 });
    s.seta([[1285, 700], [1360, 700], [1360, 470], [1414, 470]], { rotulo: 'manobra + %', rx: 1360, ry: 595 });
    s.seta([[1330, 735], [1414, 735]], { rotulo: 'acorda / dorme', rx: 1375, ry: 785 });

    // Laço físico
    s.seta([[1760, 460], [1782, 460], [1782, 838], [20, 838], [20, 690], [34, 690]],
        { tracejado: true, cor: COR.neutro, rotulo: 'o carro se move e muda o que os sensores medem', rx: 470, ry: 844 });

    // Rede, celular e operador
    s.caixa(700, 895, 420, 165, COR.rede, 'Rede WiFi aberta “carro4x4”', ['ponto de acesso na própria placa', 'página: http://192.168.4.1', 'vídeo: porta 81'], { tamLinha: 15 });
    s.seta([[910, 806], [910, 889]], { dupla: true, cor: COR.rede, rotulo: 'HTTP', rx: 950, ry: 872, rancora: 'start' });
    s.caixa(1200, 895, 320, 165, COR.ctrl, 'Celular · navegador', ['reticulado ao vivo', 'assumir / liberar', 'analógico e vídeo'], { tamLinha: 15 });
    s.seta([[1126, 977], [1194, 977]], { dupla: true, cor: COR.rede });
    s.ator(1660, 965, 'Operador', COR.ctrl);
    s.seta([[1526, 977], [1610, 977]], { dupla: true, cor: COR.ctrl, rotulo: 'toques', rx: 1568, ry: 1010 });

    // Legenda
    const leg = [[COR.estrutura, 'estrutura do programa'], [COR.percepcao, 'percepção'], [COR.lp, 'decisão (LPA2v)'],
        [COR.io, 'sensores e atuadores'], [COR.rede, 'rede, página e câmera'], [COR.ctrl, 'operador e interface']];
    s.add('<rect x="40" y="895" width="600" height="165" rx="12" fill="#ffffff" stroke="#d5d9e0" stroke-width="1.5"/>');
    s.texto(60, 926, 'Cores das categorias de blocos da IDE', { tam: 16, peso: 700, cor: COR.fraco, ancora: 'start' });
    leg.forEach(([c, t], i) => {
        const x = 60 + (i % 2) * 290, y = 950 + Math.floor(i / 2) * 34;
        s.add(`<rect x="${x}" y="${y}" width="24" height="20" rx="4" fill="${c}"/>`);
        s.texto(x + 34, y + 16, t, { tam: 15, ancora: 'start' });
    });
    return s.toString();
}

/* ------------------------------------------------------------------ */
/* 2. Dirigir pela LPA2v                                               */
/* ------------------------------------------------------------------ */

function reticulado(s, cx, cy, r) {
    const P = (gc, gct) => [cx + gc * r, cy - gct * r];
    const poli = (pts, cor) => s.add(`<path d="M${pts.map(p => P(...p).join(' ')).join(' L')} Z" fill="${cor}"/>`);
    poli([[0.5, 0.5], [1, 0], [0.5, -0.5]], claro(ESTADO.V, 0.45));
    poli([[-0.5, 0.5], [-1, 0], [-0.5, -0.5]], claro(ESTADO.F, 0.45));
    poli([[-0.5, 0.5], [0, 1], [0.5, 0.5]], claro(ESTADO.T, 0.45));
    poli([[-0.5, -0.5], [0, -1], [0.5, -0.5]], claro(ESTADO.PC, 0.45));
    poli([[0.5, 0.5], [0.5, -0.5], [0, 0]], claro(ESTADO.V, 0.8));
    poli([[-0.5, 0.5], [-0.5, -0.5], [0, 0]], claro(ESTADO.F, 0.8));
    poli([[-0.5, 0.5], [0.5, 0.5], [0, 0]], claro(ESTADO.T, 0.8));
    poli([[-0.5, -0.5], [0.5, -0.5], [0, 0]], claro(ESTADO.PC, 0.8));
    s.add(`<path d="M${P(0, 1).join(' ')} L${P(1, 0).join(' ')} L${P(0, -1).join(' ')} L${P(-1, 0).join(' ')} Z" fill="none" stroke="#5a6170" stroke-width="2"/>`);
    s.add(`<path d="M${P(-0.5, 0.5).join(' ')} L${P(0.5, -0.5).join(' ')} M${P(0.5, 0.5).join(' ')} L${P(-0.5, -0.5).join(' ')}" stroke="#8a90a0" stroke-width="1.2" stroke-dasharray="5 4"/>`);
    s.texto(...P(0, 1.13), 'T', { tam: 20, peso: 700, cor: ESTADO.T });
    s.texto(...P(1.12, -0.03), 'V', { tam: 20, peso: 700, cor: ESTADO.V });
    s.texto(...P(0, -1.2), '⊥', { tam: 22, peso: 700, cor: ESTADO.PC });
    s.texto(...P(-1.12, -0.03), 'F', { tam: 20, peso: 700, cor: ESTADO.F });
    // ponto de exemplo: carro diante da barreira, os dois sensores perto
    s.add(`<circle cx="${P(0.86, 0.1)[0]}" cy="${P(0.86, 0.1)[1]}" r="8" fill="#1f2430" stroke="#fff" stroke-width="2.5"/>`);
}

function lpa2v() {
    const s = new Svg(1600, 1500);

    s.caixa(220, 30, 420, 110, COR.io, 'Sensor esquerdo', ['distEsq (cm)']);
    s.caixa(960, 30, 420, 110, COR.io, 'Sensor direito', ['distDir (cm)']);
    s.seta([[430, 140], [430, 194]]);
    s.seta([[1170, 140], [1170, 194]]);
    s.caixa(220, 200, 420, 130, COR.lp, 'Grau de evidência μ1', ['80 cm ou mais → 0 (livre)', '15 cm ou menos → 1 (obstáculo)']);
    s.caixa(960, 200, 420, 130, COR.lp, 'Grau de evidência μ2', ['80 cm ou mais → 0 (livre)', '15 cm ou menos → 1 (obstáculo)']);
    s.seta([[430, 330], [430, 365], [650, 365], [650, 394]]);
    s.seta([[1170, 330], [1170, 365], [950, 365], [950, 394]]);
    s.caixa(430, 400, 740, 140, COR.lp, 'Para-Analisador · bloco “analisar”',
        ['μ = μ1  λ = 1 − μ2', 'Gc = μ − λ  Gct = μ + λ − 1'], { tamLinha: 19 });

    reticulado(s, 300, 712, 140);
    s.seta([[800, 540], [800, 634]]);
    s.losango(800, 730, 170, 90, COR.ctrl, ['estado lógico', 'no reticulado']);
    s.seta([[630, 730], [488, 730]], { tracejado: true, rotulo: 'ponto (Gc, Gct)', rx: 560, ry: 718 });

    s.add('<rect x="1060" y="600" width="500" height="250" rx="12" fill="#ffffff" stroke="#d5d9e0" stroke-width="1.5"/>');
    s.texto(1080, 632, 'Regras do bloco (Vscc = Vscct = 0,5)', { tam: 17, peso: 700, cor: COR.fraco, ancora: 'start' });
    s.texto(1080, 834, 'reticulado: Gc na horizontal, Gct na vertical', { tam: 14, cor: COR.fraco, ancora: 'start', italico: true });
    [['Gc ≥ 0,5', 'V', ESTADO.V], ['Gc ≤ −0,5', 'F', ESTADO.F], ['Gct ≥ 0,5', 'T', ESTADO.T],
        ['Gct ≤ −0,5', '⊥', ESTADO.PC], ['senão', 'estados quase (Qv→T, …)', ESTADO.demais]].forEach(([c, e, cor], i) => {
        const y = 666 + i * 31;
        s.texto(1090, y, c, { tam: 17, ancora: 'start' });
        s.texto(1230, y, '→', { tam: 17, cor: COR.fraco, ancora: 'start' });
        s.texto(1262, y, e, { tam: 17, peso: 700, cor, ancora: 'start' });
    });
    s.seta([[970, 730], [1054, 730]], { tracejado: true });

    // um caso por estado
    const casos = [
        ['V', 'obstáculo dos dois lados', ['semDecidir = 0', 'fazer: desviar', '(conta, ré, gira)'], ESTADO.V],
        ['Qv→T', 'quase V, divergindo', ['girar à direita', '400 ms', 'parar'], ESTADO.QVT],
        ['F', 'caminho livre', ['zera os desvios', 'frente a', 'VELOCIDADE'], ESTADO.F],
        ['T', 'sensores discordam', ['fazer: arrancar', 'devagar', 'esperar 500 ms'], ESTADO.T],
        ['⊥', 'evidência fraca', ['desvios + 1', 'ré 300 ms', 'giro 400 ms'], ESTADO.PC],
        ['demais', 'regiões intermediárias', ['fazer: arrancar', 'devagar', 'esperar 200 ms'], ESTADO.demais]
    ];
    const W = 245, X0 = 30, PASSO = 260;
    s.add(`<path d="M${X0 + W / 2} 905 H${X0 + 5 * PASSO + W / 2}" stroke="#4a5160" stroke-width="2.4"/>`);
    s.add('<path d="M800 820 V905" stroke="#4a5160" stroke-width="2.4"/>');
    s.add(`<path d="M${X0 + W / 2} 1195 H${X0 + 5 * PASSO + W / 2}" stroke="#4a5160" stroke-width="2.4"/>`);
    casos.forEach(([titulo, sub, linhas, cor], i) => {
        const x = X0 + i * PASSO;
        s.seta([[x + W / 2, 905], [x + W / 2, 954]]);
        s.caixa(x, 960, W, 205, cor, titulo, [], { faixa: 44 });
        s.texto(x + W / 2, 1030, sub, { tam: 15, peso: 700, cor, italico: true });
        linhas.forEach((l, k) => s.texto(x + W / 2, 1068 + k * 26, l, { tam: 17 }));
        s.add(`<path d="M${x + W / 2} 1165 V1195" stroke="#4a5160" stroke-width="2.4"/>`);
    });
    s.seta([[800, 1195], [800, 1224]]);

    s.caixa(470, 1230, 660, 96, COR.tarefa, 'tarefa “conferir se está preso”',
        ['semDecidir ≥ 8 → desviar · semDecidir + 1'], { tamLinha: 17 });
    s.seta([[800, 1326], [800, 1360]]);
    s.losango(800, 1420, 165, 62, COR.ctrl, ['desvios ≥ 3 ?']);
    s.caixa(1080, 1370, 490, 110, '#c0504d', 'Preso', ['parar · preso = 1', 'câmera na página → operador dirige'], { tamLinha: 16 });
    s.seta([[965, 1420], [1074, 1420]], { rotulo: 'sim', rx: 1018, ry: 1408 });
    s.caixa(30, 1370, 490, 110, COR.estrutura, 'Próximo ciclo do “Sempre”', ['a LPA2v continua dirigindo'], { tamLinha: 16 });
    s.seta([[635, 1420], [526, 1420]], { rotulo: 'não', rx: 582, ry: 1408 });
    return s.toString();
}

/* ------------------------------------------------------------------ */
/* 3. Ilustração: carro travado, operador com o celular                */
/* ------------------------------------------------------------------ */

function listras(id, a, b, larg) {
    return `<pattern id="${id}" width="${larg * 2}" height="${larg * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
        `<rect width="${larg * 2}" height="${larg * 2}" fill="${a}"/><rect width="${larg}" height="${larg * 2}" fill="${b}"/></pattern>`;
}

function carroVistoDeCima(s, cx, cy) {
    // acrílico, rodas, protoboard, placa, ponte H, sensores — como na foto de cima
    const L = 400, A = 250, x = cx - L / 2, y = cy - A / 2;
    const roda = (rx, ry) => s.add(`<rect x="${rx}" y="${ry}" width="96" height="44" rx="12" fill="#22252b"/>` +
        `<path d="M${rx + 8} ${ry + 6} v32 M${rx + 24} ${ry + 6} v32 M${rx + 40} ${ry + 6} v32 M${rx + 56} ${ry + 6} v32 M${rx + 72} ${ry + 6} v32 M${rx + 88} ${ry + 6} v32" stroke="#3a3f48" stroke-width="5"/>`);
    roda(x + 40, y - 30); roda(x + L - 150, y - 30); roda(x + 40, y + A - 14); roda(x + L - 150, y + A - 14);
    s.add(`<rect x="${x}" y="${y}" width="${L}" height="${A}" rx="70" fill="#dff2fb" fill-opacity="0.85" stroke="#9cc9de" stroke-width="3"/>`);
    s.add(`<rect x="${x + 30}" y="${y + 70}" width="40" height="110" rx="6" fill="#ffd54a"/>`);
    // protoboard
    s.add(`<rect x="${x + 95}" y="${y + 50}" width="175" height="150" rx="6" fill="#fbfbf7" stroke="#d6d6cf" stroke-width="2"/>`);
    for (let i = 0; i < 9; i++) s.add(`<path d="M${x + 105 + i * 19} ${y + 60} v130" stroke="#e6e6de" stroke-width="5" stroke-dasharray="3 5"/>`);
    // ESP32-S3 com câmera
    s.add(`<rect x="${x + 120}" y="${y + 80}" width="125" height="72" rx="5" fill="#1d2027"/>`);
    s.add(`<rect x="${x + 192}" y="${y + 90}" width="44" height="52" rx="3" fill="#b9bec7"/>`);
    s.add(`<circle cx="${x + 172}" cy="${y + 116}" r="12" fill="#2d323c" stroke="#59606d" stroke-width="3"/><circle cx="${x + 172}" cy="${y + 116}" r="5" fill="#6aa7ff"/>`);
    // ponte H
    s.add(`<rect x="${x + 285}" y="${y + 70}" width="80" height="100" rx="5" fill="#c9303a"/><rect x="${x + 300}" y="${y + 92}" width="50" height="56" fill="#1d2027"/>`);
    // fios
    ['#e84545', '#2f7de1', '#2db36a', '#f2a03d', '#9b59d0'].forEach((c, i) =>
        s.add(`<path d="M${x + 245} ${y + 95 + i * 9} C${x + 270} ${y + 70 + i * 12} ${x + 275} ${y + 150 - i * 6} ${x + 300} ${y + 140 - i * 8}" stroke="${c}" stroke-width="3.5" fill="none"/>`));
    // dois HC-SR04 na frente
    [y + 40, y + 140].forEach(sy => {
        s.add(`<rect x="${x + L - 18}" y="${sy}" width="26" height="72" rx="4" fill="#1f4f9a"/>`);
        s.add(`<circle cx="${x + L + 20}" cy="${sy + 18}" r="15" fill="#d9dde3" stroke="#8f96a3" stroke-width="3"/><circle cx="${x + L + 20}" cy="${sy + 54}" r="15" fill="#d9dde3" stroke="#8f96a3" stroke-width="3"/>`);
    });
    return { frente: x + L + 36, antena: [x + 172, y + 116] };
}

function ilustracao() {
    const s = new Svg(1600, 1000, '#eef4fa');
    s.add('<defs>' + listras('barreira', '#ffffff', '#e2483d', 22) + listras('barreiraV', '#f6f6f6', '#e2483d', 9) +
        '<linearGradient id="chao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9dfcf"/><stop offset="1" stop-color="#ddcfb8"/></linearGradient>' +
        '<radialGradient id="cone" cx="0" cy="0.5" r="1"><stop offset="0" stop-color="#ffd54a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd54a" stop-opacity="0"/></radialGradient></defs>');

    // corredor visto de cima
    s.add('<rect x="40" y="250" width="1010" height="600" rx="24" fill="url(#chao)"/>');
    for (let i = 1; i < 10; i++) s.add(`<path d="M${40 + i * 101} 290 v520" stroke="#d3c4aa" stroke-width="2"/>`);
    s.add('<rect x="40" y="250" width="1010" height="44" rx="10" fill="#8d96a5"/><rect x="40" y="806" width="1010" height="44" rx="10" fill="#8d96a5"/>');
    s.texto(545, 279, 'parede', { tam: 17, peso: 600, cor: '#ffffff' });
    s.texto(545, 835, 'parede', { tam: 17, peso: 600, cor: '#ffffff' });
    // barreira
    s.add('<rect x="965" y="294" width="62" height="512" rx="10" fill="url(#barreira)" stroke="#a8312a" stroke-width="3"/>');
    s.add('<rect x="930" y="300" width="34" height="36" rx="6" fill="#ffb300"/><rect x="930" y="764" width="34" height="36" rx="6" fill="#ffb300"/>');
    s.texto(996, 890, 'barreira', { tam: 19, peso: 700, cor: '#a8312a' });

    // o caminho até aqui: três desvios sem achar saída
    s.add('<path d="M70 690 C190 690 210 470 300 430 C360 400 360 640 430 650" fill="none" stroke="#5a68c8" stroke-width="4" stroke-dasharray="12 9"/>');
    [[205, 560, '1'], [300, 430, '2'], [400, 640, '3']].forEach(([x, y, n]) =>
        s.add(`<circle cx="${x}" cy="${y}" r="17" fill="#5a68c8"/>`).texto(x, y + 6, n, { tam: 18, peso: 700, cor: '#fff' }));
    s.texto(150, 760, 'três desvios sem caminho livre', { tam: 16, peso: 600, cor: '#5a68c8', italico: true, ancora: 'start' });

    const carro = carroVistoDeCima(s, 650, 550);
    // ondas do ultrassom batendo na barreira
    [0, 1, 2].forEach(i => {
        const r = 22 + i * 18;
        s.add(`<path d="M${carro.frente + i * 14} ${505 - r} a${r} ${r} 0 0 1 0 ${2 * r}" fill="none" stroke="#e2483d" stroke-width="4" stroke-opacity="${0.9 - i * 0.25}"/>`);
        s.add(`<path d="M${carro.frente + i * 14} ${605 - r} a${r} ${r} 0 0 1 0 ${2 * r}" fill="none" stroke="#e2483d" stroke-width="4" stroke-opacity="${0.9 - i * 0.25}"/>`);
    });
    // aviso sobre o carro
    s.add('<rect x="455" y="722" width="390" height="54" rx="27" fill="#ffb02e" stroke="#e0901a" stroke-width="2"/>');
    s.texto(650, 757, 'PRESO · o operador assume', { tam: 21, peso: 700, cor: '#3a2600' });

    // WiFi da placa até o celular, passando pelo rótulo da rede
    const [ax, ay] = carro.antena;
    s.add(`<path d="M${ax - 30} ${ay - 70} C${ax - 30} 300 ${ax - 20} 230 ${ax + 30} 176" fill="none" stroke="${COR.rede}" stroke-width="4" stroke-dasharray="3 11" stroke-linecap="round"/>`);
    s.add(`<path d="M992 141 C1070 141 1120 170 1158 230" fill="none" stroke="${COR.rede}" stroke-width="4" stroke-dasharray="3 11" stroke-linecap="round"/>`);
    const wifi = (x, y, k) => [1, 2, 3].forEach(i => s.add(`<path d="M${x - 14 * i * k} ${y - 10 * i * k} a${20 * i * k} ${20 * i * k} 0 0 1 ${28 * i * k} 0" fill="none" stroke="${COR.rede}" stroke-width="${4.5 * k}" stroke-linecap="round"/>`));
    wifi(ax - 30, ay - 12, 1);
    s.add('<rect x="560" y="110" width="430" height="62" rx="14" fill="#ffffff" stroke="#cfe3c7" stroke-width="2"/>');
    s.texto(775, 138, 'WiFi “carro4x4” · ponto de acesso na placa', { tam: 17, peso: 700, cor: COR.rede });
    s.texto(775, 161, 'página http://192.168.4.1 · vídeo na porta 81', { tam: 15, cor: COR.fraco });

    // mão segurando o celular
    const pele = '#f1bf96', sombra = '#d99c74';
    s.add(`<path d="M1150 610 C1110 720 1120 880 1200 1000 L1520 1000 C1560 880 1560 760 1520 690 Z" fill="${pele}" stroke="${sombra}" stroke-width="3"/>`);
    s.add('<rect x="1160" y="120" width="340" height="680" rx="44" fill="#1b1f29"/>');
    s.add('<rect x="1176" y="150" width="308" height="620" rx="28" fill="#f3f4f7"/>');
    s.add('<rect x="1290" y="132" width="80" height="10" rx="5" fill="#3a3f4b"/>');
    // tela: página de pilotagem no modo operador
    s.texto(1196, 196, 'F', { tam: 26, peso: 700, ancora: 'start' });
    s.add('<rect x="1370" y="174" width="98" height="30" rx="15" fill="#fde3c1"/>');
    s.texto(1419, 195, 'operador', { tam: 15, peso: 600, cor: '#9a5a00' });
    s.add('<clipPath id="video"><rect x="1190" y="218" width="280" height="250" rx="16"/></clipPath>');
    s.add('<g clip-path="url(#video)"><rect x="1190" y="218" width="280" height="250" fill="#3a3530"/>' +
        '<rect x="1190" y="390" width="280" height="80" fill="#6b5d4c"/>' +
        '<rect x="1215" y="300" width="230" height="95" fill="url(#barreiraV)"/>' +
        '<rect x="1190" y="218" width="280" height="250" fill="#000" fill-opacity="0.12"/></g>');
    s.add('<rect x="1198" y="228" width="264" height="40" rx="9" fill="#ffb02e"/>');
    s.texto(1330, 254, 'PRESO: dirija e toque liberar', { tam: 14, peso: 700, cor: '#2b1d00' });
    // mini reticulado no canto do vídeo
    s.add('<rect x="1380" y="380" width="80" height="80" rx="8" fill="#eef0f3"/>');
    s.add('<path d="M1420 386 L1454 420 L1420 454 L1386 420 Z" fill="#f2cf74" fill-opacity="0.35" stroke="#7b8494" stroke-width="1.5"/>' +
        '<path d="M1437 403 L1454 420 L1437 437 Z" fill="#8fd19e"/><path d="M1403 403 L1386 420 L1403 437 Z" fill="#ef9a9a"/>' +
        '<circle cx="1447" cy="417" r="4" fill="#1f2430"/>');
    s.add('<rect x="1190" y="488" width="150" height="120" rx="16" fill="#2fa04f"/>');
    s.texto(1265, 556, 'Liberar', { tam: 24, peso: 700, cor: '#fff' });
    s.add('<circle cx="1410" cy="548" r="58" fill="#ffffff" stroke="#cfd4dc" stroke-width="3"/><circle cx="1410" cy="548" r="26" fill="#1f2430"/>');
    s.texto(1330, 640, 'μ 1.00 λ 0.00 · desvios 3 · preso 1', { tam: 13, cor: COR.fraco });
    wifi(1330, 700, 1.1);
    // polegar e dedos por cima da borda
    s.add(`<path d="M1150 880 C1110 780 1150 700 1210 725 C1250 742 1235 790 1205 812 C1185 830 1182 870 1185 910 Z" fill="${pele}" stroke="${sombra}" stroke-width="3"/>`);
    [330, 410, 490, 570].forEach((y, i) =>
        s.add(`<rect x="${1470 + (i === 0 ? 6 : 0)}" y="${y}" width="${62 - i * 2}" height="70" rx="32" fill="${pele}" stroke="${sombra}" stroke-width="3"/>`));
    s.texto(1330, 980, 'operador', { tam: 18, peso: 700, cor: COR.ctrl });
    return s.toString();
}

/* ------------------------------------------------------------------ */

async function rasterizar(janela, svg, escala) {
    return janela.webContents.executeJavaScript(`(async () => {
        const svg = ${JSON.stringify(svg)};
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth * ${escala};
        c.height = img.naturalHeight * ${escala};
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/png').split(',')[1];
    })()`, true);
}

app.whenReady().then(async () => {
    const janela = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await janela.loadURL('data:text/html,<html><body></body></html>');
    fs.mkdirSync(SAIDA, { recursive: true });
    for (const [nome, svg] of [['diag-contexto', contexto()], ['diag-lpa2v', lpa2v()], ['ilustracao-preso', ilustracao()]]) {
        fs.writeFileSync(path.join(SAIDA, nome + '.svg'), svg, 'utf8');
        fs.writeFileSync(path.join(SAIDA, nome + '.png'), Buffer.from(await rasterizar(janela, svg, 2), 'base64'));
        console.log('  ' + nome + '.svg / .png');
    }
    app.quit();
});
