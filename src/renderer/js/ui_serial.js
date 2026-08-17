'use strict';
/**
 * Monitor e plotter serial.
 *
 * O plotter entende o mesmo formato do Serial Plotter oficial: números
 * separados por vírgula/espaço/tab viram séries anônimas, e "rotulo:valor"
 * vira série com nome. Linha que não tem número nenhum é só texto e não
 * entra no gráfico.
 */
(function (global) {

    const MAX_LINHAS = 3000;

    const UISerial = {

        conectada: false,
        autoScroll: true,
        janela: 100,
        _series: new Map(),
        _grafico: null,
        _amostras: 0,

        iniciar(refs) {
            this.el = refs;
            this._montarGrafico();
        },

        /* ---------------- console ---------------- */

        linha(texto, classe) {
            const box = this.el.console;
            const div = document.createElement('div');
            if (classe) div.className = classe;

            const t = document.createElement('span');
            t.className = 'l-tempo';
            const agora = new Date();
            t.textContent = String(agora.getHours()).padStart(2, '0') + ':' +
                String(agora.getMinutes()).padStart(2, '0') + ':' +
                String(agora.getSeconds()).padStart(2, '0');

            div.appendChild(t);
            div.appendChild(document.createTextNode(texto));
            box.appendChild(div);

            while (box.childElementCount > MAX_LINHAS) box.removeChild(box.firstChild);
            if (this.autoScroll) box.scrollTop = box.scrollHeight;
        },

        limpar() {
            this.el.console.textContent = '';
        },

        textoCompleto() {
            return Array.from(this.el.console.children)
                .map(d => d.textContent).join('\n');
        },

        /* ---------------- plotter ---------------- */

        /**
         * Extrai pares série→valor de uma linha.
         * "temp:23.5 umid:60"  → [{nome:'temp',valor:23.5},{nome:'umid',valor:60}]
         * "512, 480"           → [{nome:'serie 1',valor:512},{nome:'serie 2',valor:480}]
         */
        interpretar(texto) {
            const saida = [];
            const partes = String(texto).trim().split(/[\s,;\t]+/).filter(Boolean);
            let anonimos = 0;

            partes.forEach(parte => {
                const comRotulo = parte.match(/^([^:=]+)[:=](-?\d+(?:\.\d+)?)$/);
                if (comRotulo) {
                    saida.push({ nome: comRotulo[1], valor: Number(comRotulo[2]) });
                    return;
                }
                if (/^-?\d+(?:\.\d+)?$/.test(parte)) {
                    anonimos++;
                    saida.push({ nome: 'série ' + anonimos, valor: Number(parte) });
                }
            });
            return saida;
        },

        plotar(texto) {
            const pontos = this.interpretar(texto);
            if (!pontos.length || !this._grafico) return;

            this._amostras++;
            const g = this._grafico;
            g.data.labels.push(this._amostras);

            pontos.forEach(p => {
                let ds = this._series.get(p.nome);
                if (!ds) {
                    ds = {
                        label: p.nome,
                        data: new Array(g.data.labels.length - 1).fill(null),
                        borderColor: this._cor(this._series.size),
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: .2
                    };
                    this._series.set(p.nome, ds);
                    g.data.datasets.push(ds);
                }
                ds.data.push(p.valor);
            });

            // séries que não vieram nesta linha ficam com buraco
            g.data.datasets.forEach(ds => {
                while (ds.data.length < g.data.labels.length) ds.data.push(null);
            });

            while (g.data.labels.length > this.janela) {
                g.data.labels.shift();
                g.data.datasets.forEach(ds => ds.data.shift());
            }
            g.update('none');
        },

        limparPlotter() {
            this._series.clear();
            this._amostras = 0;
            if (this._grafico) {
                this._grafico.data.labels = [];
                this._grafico.data.datasets = [];
                this._grafico.update();
            }
        },

        _cor(i) {
            const cores = ['#2f81f7', '#3fb950', '#d29922', '#f85149', '#a371f7', '#39c5cf', '#db61a2'];
            return cores[i % cores.length];
        },

        /** Cor de uma variável do CSS, para o gráfico seguir o tema da interface. */
        _corCss(nome, padrao) {
            if (typeof global.getComputedStyle !== 'function' || !global.document) return padrao;
            const v = global.getComputedStyle(global.document.documentElement)
                .getPropertyValue(nome);
            return (v || '').trim() || padrao;
        },

        /** Reaplica as cores dos eixos e da legenda depois de trocar o tema. */
        repintar() {
            const g = this._grafico;
            if (!g) return;
            const texto = this._corCss('--texto-fraco', '#8b98a9');
            const grade = this._corCss('--borda', '#232b39');
            const rotulo = this._corCss('--texto', '#e6edf3');
            g.options.scales.x.ticks.color = texto;
            g.options.scales.y.ticks.color = texto;
            g.options.scales.x.grid.color = grade;
            g.options.scales.y.grid.color = grade;
            g.options.plugins.legend.labels.color = rotulo;
            g.update('none');
        },

        _montarGrafico() {
            if (typeof Chart === 'undefined' || !this.el.canvas) return;
            const texto = this._corCss('--texto-fraco', '#8b98a9');
            const grade = this._corCss('--borda', '#232b39');
            const rotulo = this._corCss('--texto', '#e6edf3');
            this._grafico = new Chart(this.el.canvas.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: { intersect: false, mode: 'index' },
                    scales: {
                        x: { ticks: { color: texto, maxTicksLimit: 8 }, grid: { color: grade } },
                        y: { ticks: { color: texto }, grid: { color: grade } }
                    },
                    plugins: { legend: { labels: { color: rotulo } } }
                }
            });
        }
    };

    global.UISerial = UISerial;

})(typeof window !== 'undefined' ? window : global);
