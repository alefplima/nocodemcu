'use strict';
/**
 * Reticulado da LPA2v em tempo real.
 *
 * A cada linha vinda da serial, procura uma anotação e marca o ponto no
 * reticulado. Dois formatos são aceitos, ambos no mesmo estilo de série do
 * plotter ("rotulo:valor"):
 *
 *   mu:0.86 lambda:0.28     → calcula Gc e Gct
 *   gc:0.58 gct:0.14        → usa direto
 *
 * Nomes alternativos: "u"/"μ" para mu, "l"/"lam"/"λ" para lambda.
 *
 * O desenho é o losango |Gc| + |Gct| ≤ 1, que é a região de verdade: fora
 * dele nenhum par (μ, λ) do quadrado unitário consegue chegar. As linhas de
 * corte em ±0,5 são os valores de controle Vscc, Vicc, Vscct e Vicct.
 */
(function (global) {

    /* Códigos e rótulos dos 12 estados, na mesma ordem do enum gerado no .ino */
    const ESTADOS = [
        { id: 'V', nome: 'Verdadeiro' },
        { id: 'F', nome: 'Falso' },
        { id: 'T', nome: 'Inconsistente' },
        { id: '⊥', nome: 'Indeterminado' },
        { id: 'Qv→T', nome: 'quase-verdadeiro tendendo ao inconsistente' },
        { id: 'Qv→⊥', nome: 'quase-verdadeiro tendendo ao indeterminado' },
        { id: 'Qf→T', nome: 'quase-falso tendendo ao inconsistente' },
        { id: 'Qf→⊥', nome: 'quase-falso tendendo ao indeterminado' },
        { id: 'T→v', nome: 'inconsistente tendendo ao verdadeiro' },
        { id: 'T→f', nome: 'inconsistente tendendo ao falso' },
        { id: '⊥→v', nome: 'indeterminado tendendo ao verdadeiro' },
        { id: '⊥→f', nome: 'indeterminado tendendo ao falso' }
    ];

    /* Cores vêm do CSS: assim o desenho segue o tema sem duplicar paleta.
       Os valores abaixo são só a rede de segurança de quando não há documento
       (harness headless) ou a variável não existe. */
    const PADRAO = {
        fundo: '#0d1117',
        borda: '#232b39',
        grade: '#1b2230',
        eixo: '#3d4757',
        texto: '#8b98a9',
        rotulo: '#e6edf3',
        rastro: '#2f81f7',
        ponto: '#3fb950',
        indef: '#d29922',
        limite: '#39414f'
    };

    const VAR_DE = {
        fundo: '--bg-fundo',
        borda: '--borda',
        grade: '--grade',
        eixo: '--eixo',
        texto: '--texto-fraco',
        rotulo: '--texto',
        rastro: '--acento',
        ponto: '--ok',
        indef: '--aviso',
        limite: '--scroll-polegar'
    };

    function cores() {
        if (typeof global.getComputedStyle !== 'function' || !global.document) return PADRAO;
        const cs = global.getComputedStyle(global.document.documentElement);
        const out = {};
        Object.keys(VAR_DE).forEach(k => {
            const v = (cs.getPropertyValue(VAR_DE[k]) || '').trim();
            out[k] = v || PADRAO[k];
        });
        return out;
    }

    const UIReticulado = {

        _pontos: [],
        _rastro: 60,
        _ultimo: null,

        iniciar(refs) {
            this.el = refs || {};
            if (this.el.canvas) {
                this._ro = new global.ResizeObserver(() => this.desenhar());
                this._ro.observe(this.el.canvas.parentElement || this.el.canvas);
            }
            this.desenhar();
        },

        /* ------------------------------------------------------------ */
        /* Análise                                                       */
        /* ------------------------------------------------------------ */

        /** Grau de Certeza e Grau de Contradição a partir da anotação. */
        gc(mu, lam) { return mu - lam; },
        gct(mu, lam) { return mu + lam - 1; },

        /**
         * Estado lógico nas 12 regiões. Mesma ordem de comparações do
         * Para-Analisador gerado em C++ (gen_lp.js): as faixas se tocam em
         * Gc = 0 e Gct = 0, e quem vem antes decide o empate.
         */
        estado(gc, gct, c1, c2, c3, c4) {
            c1 = c1 == null ? 0.5 : c1;
            c2 = c2 == null ? -0.5 : c2;
            c3 = c3 == null ? 0.5 : c3;
            c4 = c4 == null ? -0.5 : c4;

            if (gc >= c1) return 'V';
            if (gc <= c2) return 'F';
            if (gct >= c3) return 'T';
            if (gct <= c4) return '⊥';
            if (gc >= 0 && gct >= 0) return gc >= gct ? 'Qv→T' : 'T→v';
            if (gc >= 0 && gct <= 0) return gc >= Math.abs(gct) ? 'Qv→⊥' : '⊥→v';
            if (gc <= 0 && gct <= 0) return Math.abs(gc) >= Math.abs(gct) ? 'Qf→⊥' : '⊥→f';
            return Math.abs(gc) >= gct ? 'Qf→T' : 'T→f';
        },

        nomeEstado(id) {
            const e = ESTADOS.find(x => x.id === id);
            return e ? e.nome : '';
        },

        /** Grau de Certeza Real, com a guarda de indefinição do NAP. */
        analise(gc, gct) {
            const phi = 1 - Math.abs(gct);
            const d = Math.sqrt(Math.pow(1 - Math.abs(gc), 2) + gct * gct);
            const indefinido = phi <= 0.25 || d > 1;
            let gcr = 0;
            if (!indefinido) {
                if (gc > 0) gcr = 1 - d;
                else if (gc < 0) gcr = d - 1;
            }
            return { phi: phi, d: d, indefinido: indefinido, gcr: gcr, muEr: (gcr + 1) / 2 };
        },

        /* ------------------------------------------------------------ */
        /* Entrada de dados                                              */
        /* ------------------------------------------------------------ */

        /**
         * Procura uma anotação na linha. Devolve {gc, gct, mu, lambda} ou null
         * quando a linha não traz o par completo — linha de texto solto, ou só
         * uma das duas grandezas, não movem o ponto.
         */
        interpretar(texto) {
            const pares = {};
            String(texto).trim().split(/[\s,;\t]+/).filter(Boolean).forEach(parte => {
                const m = parte.match(/^([^:=]+)[:=](-?\d+(?:\.\d+)?)$/);
                if (m) pares[m[1].trim().toLowerCase()] = Number(m[2]);
            });

            const pega = nomes => {
                for (const n of nomes) if (pares[n] !== undefined) return pares[n];
                return undefined;
            };

            const mu = pega(['mu', 'u', 'μ', 'evidencia', 'evidência']);
            const lam = pega(['lambda', 'lam', 'l', 'λ']);
            if (mu !== undefined && lam !== undefined) {
                return { mu: mu, lambda: lam, gc: this.gc(mu, lam), gct: this.gct(mu, lam) };
            }

            const gc = pega(['gc', 'certeza']);
            const gct = pega(['gct', 'contradicao', 'contradição']);
            if (gc !== undefined && gct !== undefined) {
                return {
                    gc: gc, gct: gct,
                    mu: (gc + gct + 1) / 2,
                    lambda: (-gc + gct + 1) / 2
                };
            }
            return null;
        },

        alimentar(texto) {
            const p = this.interpretar(texto);
            if (!p) return false;
            this._pontos.push(p);
            while (this._pontos.length > this._rastro) this._pontos.shift();
            this._ultimo = p;
            this.desenhar();
            return true;
        },

        limpar() {
            this._pontos = [];
            this._ultimo = null;
            this.desenhar();
        },

        definirRastro(n) {
            this._rastro = Math.max(1, Number(n) || 60);
            while (this._pontos.length > this._rastro) this._pontos.shift();
            this.desenhar();
        },

        /* ------------------------------------------------------------ */
        /* Desenho                                                       */
        /* ------------------------------------------------------------ */

        desenhar() {
            const cv = this.el && this.el.canvas;
            if (!cv || !cv.getContext) return;

            const caixa = cv.parentElement || cv;
            const larg = Math.max(220, caixa.clientWidth || 400);
            const alt = Math.max(220, caixa.clientHeight || 400);
            const dpr = global.devicePixelRatio || 1;
            if (cv.width !== larg * dpr || cv.height !== alt * dpr) {
                cv.width = larg * dpr;
                cv.height = alt * dpr;
                cv.style.width = larg + 'px';
                cv.style.height = alt + 'px';
            }

            const CORES = cores();
            const c = cv.getContext('2d');
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, larg, alt);
            c.fillStyle = CORES.fundo;
            c.fillRect(0, 0, larg, alt);

            const margem = 46;
            const raio = Math.min(larg, alt) / 2 - margem;
            const cx = larg / 2;
            const cy = alt / 2;
            // Gc no eixo horizontal, Gct no vertical e crescendo para cima
            const X = gc => cx + gc * raio;
            const Y = gct => cy - gct * raio;

            /* grade de 0,25 dentro do losango */
            c.strokeStyle = CORES.grade;
            c.lineWidth = 1;
            for (let v = -0.75; v <= 0.75001; v += 0.25) {
                if (Math.abs(v) < 1e-9) continue;
                const meia = 1 - Math.abs(v);
                c.beginPath(); c.moveTo(X(-meia), Y(v)); c.lineTo(X(meia), Y(v)); c.stroke();
                c.beginPath(); c.moveTo(X(v), Y(-meia)); c.lineTo(X(v), Y(meia)); c.stroke();
            }

            /* losango: a fronteira do que é alcançável */
            c.strokeStyle = CORES.borda;
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(X(1), Y(0)); c.lineTo(X(0), Y(1));
            c.lineTo(X(-1), Y(0)); c.lineTo(X(0), Y(-1));
            c.closePath(); c.stroke();

            /* valores de controle em ±0,5 — as bordas dos estados extremos */
            c.strokeStyle = CORES.limite;
            c.setLineDash([4, 4]);
            [0.5, -0.5].forEach(v => {
                const meia = 1 - Math.abs(v);
                c.beginPath(); c.moveTo(X(v), Y(-meia)); c.lineTo(X(v), Y(meia)); c.stroke();
                c.beginPath(); c.moveTo(X(-meia), Y(v)); c.lineTo(X(meia), Y(v)); c.stroke();
            });
            c.setLineDash([]);

            /* diagonais que separam os não-extremos (|Gc| = |Gct|) */
            c.strokeStyle = CORES.limite;
            c.beginPath(); c.moveTo(X(-0.5), Y(-0.5)); c.lineTo(X(0.5), Y(0.5)); c.stroke();
            c.beginPath(); c.moveTo(X(-0.5), Y(0.5)); c.lineTo(X(0.5), Y(-0.5)); c.stroke();

            /* eixos */
            c.strokeStyle = CORES.eixo;
            c.lineWidth = 1;
            c.beginPath(); c.moveTo(X(-1), Y(0)); c.lineTo(X(1), Y(0)); c.stroke();
            c.beginPath(); c.moveTo(X(0), Y(-1)); c.lineTo(X(0), Y(1)); c.stroke();

            /* rótulos dos vértices */
            c.fillStyle = CORES.rotulo;
            c.font = '600 13px ui-monospace, monospace';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText('V', X(1) + 18, Y(0));
            c.fillText('F', X(-1) - 18, Y(0));
            c.fillText('T', X(0), Y(1) - 16);
            c.fillText('⊥', X(0), Y(-1) + 16);

            c.fillStyle = CORES.texto;
            c.font = '11px ui-monospace, monospace';
            c.fillText('Gc →', X(0.62), Y(0) + 14);
            c.save();
            c.translate(X(0) - 14, Y(0.62));
            c.rotate(-Math.PI / 2);
            c.fillText('Gct →', 0, 0);
            c.restore();
            c.fillText('+1', X(1) + 18, Y(0) + 15);
            c.fillText('-1', X(-1) - 18, Y(0) + 15);

            /* rastro */
            const n = this._pontos.length;
            this._pontos.forEach((p, i) => {
                const idade = (i + 1) / n;
                c.fillStyle = CORES.rastro;
                c.globalAlpha = 0.12 + 0.55 * idade;
                c.beginPath();
                c.arc(X(p.gc), Y(p.gct), 2.5, 0, Math.PI * 2);
                c.fill();
            });
            c.globalAlpha = 1;

            /* ponto atual */
            const u = this._ultimo;
            if (u) {
                const a = this.analise(u.gc, u.gct);
                const cor = a.indefinido ? CORES.indef : CORES.ponto;
                c.strokeStyle = cor;
                c.setLineDash([2, 3]);
                c.beginPath(); c.moveTo(X(u.gc), Y(0)); c.lineTo(X(u.gc), Y(u.gct)); c.stroke();
                c.beginPath(); c.moveTo(X(0), Y(u.gct)); c.lineTo(X(u.gc), Y(u.gct)); c.stroke();
                c.setLineDash([]);

                c.fillStyle = cor;
                c.beginPath(); c.arc(X(u.gc), Y(u.gct), 5.5, 0, Math.PI * 2); c.fill();
                c.strokeStyle = CORES.fundo; c.lineWidth = 2; c.stroke();
            }

            this._atualizarLeitura();
        },

        _atualizarLeitura() {
            const el = this.el || {};
            const u = this._ultimo;
            if (!el.leitura) return;

            if (!u) {
                el.leitura.textContent = 'aguardando dados da serial…';
                el.leitura.className = 'reticulado-leitura vazio';
                return;
            }
            const a = this.analise(u.gc, u.gct);
            const est = this.estado(u.gc, u.gct);
            const n3 = v => (v >= 0 ? '+' : '') + v.toFixed(3);

            el.leitura.className = 'reticulado-leitura' + (a.indefinido ? ' indefinido' : '');
            el.leitura.textContent =
                'μ ' + u.mu.toFixed(3) + '   λ ' + u.lambda.toFixed(3) +
                '   ·   Gc ' + n3(u.gc) + '   Gct ' + n3(u.gct) +
                '   ·   φ ' + a.phi.toFixed(3) +
                '   ·   ' + est + ' — ' + this.nomeEstado(est) +
                (a.indefinido
                    ? '   ·   INDEFINIÇÃO (' + (a.phi <= 0.25 ? 'φ ≤ 0,25' : 'D > 1') + ')'
                    : '   ·   Gcr ' + n3(a.gcr) + '   μEr ' + a.muEr.toFixed(3));
        }
    };

    global.UIReticulado = UIReticulado;
    if (typeof module !== 'undefined' && module.exports) module.exports = UIReticulado;

})(typeof window !== 'undefined' ? window : global);
