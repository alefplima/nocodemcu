'use strict';
/**
 * Aplicação: injeta o Blockly, mantém código e placa em sincronia, e conduz
 * o caminho compilar → gravar → monitorar.
 */
(function () {

    const $ = id => document.getElementById(id);

    /** Nome de arquivo seguro sem perder as letras: "sem título" → "sem_titulo". */
    function nomeArquivo(texto) {
        const s = String(texto || 'sketch')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        return s || 'sketch';
    }

    const App = {
        ws: null,
        codigo: '',
        placa: 'uno',
        porta: null,
        prefs: {},
        projeto: { caminho: null, nome: 'sem título', sujo: false },
        compilando: false,

        /* ============================================================ */
        /* Inicialização                                                */
        /* ============================================================ */

        async iniciar() {
            this.prefs = await window.tb.prefs.ler();
            this.placa = this.prefs.placa || 'uno';
            Boards.selecionar(this.placa);

            // Antes de qualquer coisa desenhada: o tema define as variáveis do
            // CSS que o Blockly, o gráfico e o reticulado vão ler.
            this.tema = this.prefs.tema === 'claro' ? 'claro' : 'escuro';
            document.documentElement.setAttribute('data-tema', this.tema);
            this.modo = this.prefs.modo === 'abstrato' ? 'abstrato' : 'literal';
            Toolbox.modo = this.modo;

            this.montarSeletores();
            this.injetarBlockly();
            this.ligarEventos();
            this.ligarMenus();

            UISerial.iniciar({
                console: $('console-serial'),
                canvas: $('grafico')
            });
            UISerial.autoScroll = this.prefs.autoScroll !== false;
            $('chk-autoscroll').checked = UISerial.autoScroll;

            UIReticulado.iniciar({
                canvas: $('reticulado'),
                leitura: $('reticulado-leitura')
            });

            this.restaurarRascunho();
            this.atualizarCodigo();
            this.verificarToolchain();
            this.atualizarPortas();
            setInterval(() => this.atualizarPortas(true), 4000);
        },

        montarSeletores() {
            const sp = $('sel-placa');
            Boards.lista().forEach(p => {
                const o = document.createElement('option');
                o.value = p.id;
                o.textContent = p.nome;
                sp.appendChild(o);
            });
            sp.value = this.placa;

            const bauds = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 921600];
            const sb = $('sel-baud');
            bauds.forEach(b => {
                const o = document.createElement('option');
                o.value = String(b);
                o.textContent = b + ' baud';
                sb.appendChild(o);
            });
            sb.value = String(this.prefs.baud || 9600);
            $('sel-terminador').value = this.prefs.terminador || 'nl';
        },

        /** Valor de uma variável do CSS — a paleta dos dois temas mora lá. */
        cor(nome, padrao) {
            const v = getComputedStyle(document.documentElement).getPropertyValue(nome);
            return (v || '').trim() || padrao || '#000';
        },

        /**
         * Tema do Blockly montado a partir das mesmas variáveis do CSS, para
         * o canvas dos blocos não descolar do resto da interface.
         */
        temaBlockly() {
            return Blockly.Theme.defineTheme('taskarduino-' + this.tema, {
                base: Blockly.Themes.Classic,
                componentStyles: {
                    workspaceBackgroundColour: this.cor('--bg-fundo'),
                    toolboxBackgroundColour: this.cor('--bg-painel'),
                    toolboxForegroundColour: this.cor('--texto'),
                    flyoutBackgroundColour: this.cor('--bg'),
                    flyoutForegroundColour: this.cor('--texto-fraco'),
                    flyoutOpacity: 1,
                    scrollbarColour: this.cor('--scroll-polegar'),
                    insertionMarkerColour: this.cor('--acento'),
                    insertionMarkerOpacity: 0.4,
                    cursorColour: this.cor('--acento')
                }
            });
        },

        injetarBlockly() {
            Blockly.setLocale && Blockly.setLocale(Blockly.Msg);

            this.ws = Blockly.inject('blockly', {
                toolbox: Toolbox.construir(this.modo),
                theme: this.temaBlockly(),
                renderer: 'zelos',
                media: 'vendor/blockly/media/',
                grid: { spacing: 24, length: 3, colour: this.cor('--grade'), snap: true },
                zoom: { controls: true, wheel: true, startScale: 0.85, minScale: 0.4, maxScale: 2 },
                trashcan: true,
                // O Blockly 13 carrega os sons de clique e de lixeira por
                // fetch(), e o nosso CSP tem connect-src 'none' — cada partida
                // saía com oito promessas rejeitadas no console. Som de bloco
                // não serve para nada aqui; desligar é melhor que afrouxar o
                // CSP para deixar o renderer buscar arquivos.
                sounds: false,
                move: { scrollbars: true, drag: true, wheel: true }
            });

            this.ws.addChangeListener(e => {
                if (e.isUiEvent) return;
                this.marcarSujo();
                this.agendarAtualizacao();
            });
        },

        /**
         * Troca entre 'escuro' e 'claro'.
         *
         * O Blockly é reinjetado em vez de receber só setTheme: a cor da grade
         * e a das barras de rolagem do canvas entram no inject, não no tema, e
         * ficariam do tema anterior. Os blocos são preservados pela
         * serialização, então o aluno não perde nada — só o histórico de
         * desfazer, que é o preço de trocar o tema no meio do trabalho.
         */
        aplicarTema(nome, salvar) {
            this.tema = nome === 'claro' ? 'claro' : 'escuro';
            document.documentElement.setAttribute('data-tema', this.tema);

            if (this.ws) {
                const estado = Blockly.serialization.workspaces.save(this.ws);
                const sujoAntes = this.projeto.sujo;
                this.ws.dispose();
                this.injetarBlockly();
                Blockly.serialization.workspaces.load(estado, this.ws);
                this.projeto.sujo = sujoAntes;
                this.atualizarNome();
                Blockly.svgResize(this.ws);
            }

            UISerial.repintar();
            UIReticulado.desenhar();
            if (salvar !== false) window.tb.prefs.gravar({ tema: this.tema });
        },

        ligarEventos() {
            $('sel-placa').addEventListener('change', e => this.trocarPlaca(e.target.value));
            $('sel-porta').addEventListener('change', e => {
                this.porta = e.target.value || null;
                window.tb.prefs.gravar({ porta: this.porta });
            });
            $('btn-portas').addEventListener('click', () => this.atualizarPortas());
            $('btn-compilar').addEventListener('click', () => this.compilar(false));
            $('btn-gravar').addEventListener('click', () => this.compilar(true));

            document.querySelectorAll('.aba').forEach(aba => {
                aba.addEventListener('click', () => this.abrirAba(aba.dataset.aba));
            });

            $('btn-copiar').addEventListener('click', () => {
                navigator.clipboard.writeText(this.codigo);
                this.status('código copiado', 'ok');
            });
            $('btn-exportar').addEventListener('click', () => this.exportarIno());

            /* serial */
            $('btn-serial-abrir').addEventListener('click', () => this.alternarSerial());
            $('btn-serial-limpar').addEventListener('click', () => UISerial.limpar());
            $('btn-serial-exportar').addEventListener('click', async () => {
                const r = await window.tb.serial.exportarLog(UISerial.textoCompleto());
                if (r.ok) this.status('log salvo em ' + r.caminho, 'ok');
            });
            $('chk-autoscroll').addEventListener('change', e => {
                UISerial.autoScroll = e.target.checked;
                window.tb.prefs.gravar({ autoScroll: e.target.checked });
            });
            $('sel-baud').addEventListener('change', e => {
                window.tb.prefs.gravar({ baud: Number(e.target.value) });
                if (UISerial.conectada) this.reabrirSerial();
            });
            $('sel-terminador').addEventListener('change', e => {
                window.tb.prefs.gravar({ terminador: e.target.value });
            });
            $('btn-serial-enviar').addEventListener('click', () => this.enviarSerial());
            $('entrada-serial').addEventListener('keydown', e => {
                if (e.key === 'Enter') this.enviarSerial();
            });

            $('sel-janela').addEventListener('change', e => { UISerial.janela = Number(e.target.value); });
            $('btn-plotter-limpar').addEventListener('click', () => UISerial.limparPlotter());

            /* reticulado */
            $('btn-reticulado-limpar').addEventListener('click', () => UIReticulado.limpar());
            $('sel-rastro').addEventListener('change', e => UIReticulado.definirRastro(e.target.value));
            $('btn-recolher').addEventListener('click', () => this.alternarLateral());
            $('btn-saida-limpar').addEventListener('click', () => { $('console-saida').textContent = ''; });

            /* eventos vindos do processo principal */
            window.tb.ao('serial:linha', d => {
                UISerial.linha(d.texto);
                UISerial.plotar(d.texto);
                UIReticulado.alimentar(d.texto);
            });
            window.tb.ao('serial:erro', d => {
                UISerial.linha('erro: ' + d.erro, 'l-erro');
            });
            window.tb.ao('serial:estado', d => this.refletirSerial(d));
            window.tb.ao('build:log', d => this.logSaida(d.linha, d.canal));

            this.montarDivisor();
            window.addEventListener('resize', () => Blockly.svgResize(this.ws));
            window.addEventListener('beforeunload', () => this.salvarRascunho());
        },

        ligarMenus() {
            window.tb.ao('menu:novo', () => this.novo());
            window.tb.ao('menu:abrir', () => this.abrirProjeto());
            window.tb.ao('menu:salvar', () => this.salvarProjeto(false));
            window.tb.ao('menu:salvar-como', () => this.salvarProjeto(true));
            window.tb.ao('menu:exportar', () => this.exportarIno());
            window.tb.ao('menu:compilar', () => this.compilar(false));
            window.tb.ao('menu:gravar', () => this.compilar(true));
            window.tb.ao('menu:portas', () => this.atualizarPortas());
            window.tb.ao('menu:monitor', () => {
                this.abrirAba('serial');
                if (!UISerial.conectada) this.alternarSerial();
            });
            window.tb.ao('menu:diagnostico', () => this.diagnostico());
            window.tb.ao('menu:tema', d => this.aplicarTema(d && d.tema));
            window.tb.ao('menu:modo', d => this.aplicarModo(d && d.modo));
            window.tb.ao('app:abrir-arquivo', d => this.abrirProjeto(d && d.caminho));
        },

        /**
         * Recolhe o painel de abas para uma faixa de 38 px com só o botão de
         * voltar. A largura anterior é guardada para restaurar no mesmo lugar,
         * e o estado vai para as preferências: quem trabalha com o painel
         * fechado não quer reabri-lo a cada sessão.
         */
        alternarLateral(forcar) {
            const lateral = document.querySelector('.painel-lateral');
            const divisor = $('divisor');
            const recolher = forcar === undefined ? !lateral.classList.contains('recolhido') : !!forcar;

            if (recolher) {
                if (!lateral.classList.contains('recolhido')) {
                    this._larguraLateral = lateral.style.flexBasis || '';
                }
                lateral.classList.add('recolhido');
                divisor.classList.add('travado');
                $('btn-recolher').textContent = '❮';
                $('btn-recolher').title = 'Mostrar o painel';
            } else {
                lateral.classList.remove('recolhido');
                divisor.classList.remove('travado');
                if (this._larguraLateral) lateral.style.flexBasis = this._larguraLateral;
                $('btn-recolher').textContent = '❯';
                $('btn-recolher').title = 'Recolher o painel';
            }

            Blockly.svgResize(this.ws);
            UIReticulado.desenhar();
            window.tb.prefs.gravar({ lateralRecolhida: recolher });
        },

        /**
         * Troca entre Modo Literal e Modo Abstrato, convertendo o programa.
         *
         * A conversão é feita sobre o estado serializado por converter.js, que
         * garante C++ idêntico. O que não tem forma no modo de destino fica como
         * está e vai para um relatório na aba Saída — trocar de modo nunca perde
         * trabalho, e o aluno fica sabendo o que não foi simplificado.
         */
        aplicarModo(nome, salvar) {
            const novo = nome === 'abstrato' ? 'abstrato' : 'literal';
            if (novo === this.modo) return;

            const estado = Blockly.serialization.workspaces.save(this.ws);
            const r = novo === 'abstrato'
                ? Converter.paraAbstrato(estado)
                : Converter.paraLiteral(estado);

            this.modo = novo;
            Toolbox.modo = novo;
            this.ws.updateToolbox(Toolbox.construir(novo));

            Blockly.serialization.workspaces.load(r.estado, this.ws);
            Blockly.svgResize(this.ws);
            this.atualizarCodigo();
            this.marcarSujo();

            this.status('modo ' + (novo === 'abstrato' ? 'abstrato' : 'literal'), 'ok');
            this.relatarConversao(novo, r);
            if (salvar !== false) window.tb.prefs.gravar({ modo: novo });
        },

        relatarConversao(modo, r) {
            const alvo = modo === 'abstrato' ? 'Abstrato' : 'Literal';
            this.logSaida('> Modo ' + alvo + ': ' + r.convertidos + ' bloco(s) convertido(s)');
            if (!r.mantidos.length) {
                this.logSaida('  nada ficou de fora; o código gerado não mudou');
                return;
            }
            // Um motivo por tipo: dez digitalWrite dão a mesma explicação.
            const porTipo = {};
            r.mantidos.forEach(m => { porTipo[m.tipo] = m.motivo; });
            this.logSaida('  ficaram no formato anterior (o código gerado não mudou):');
            Object.keys(porTipo).sort().forEach(t => {
                this.logSaida('    ' + t + ' — ' + porTipo[t]);
            });
            this.abrirAba('saida');
        },

        montarDivisor() {
            const divisor = $('divisor');
            const lateral = document.querySelector('.painel-lateral');
            let arrastando = false;

            if (this.prefs.lateralRecolhida) this.alternarLateral(true);

            divisor.addEventListener('mousedown', () => { arrastando = true; document.body.style.cursor = 'col-resize'; });
            window.addEventListener('mouseup', () => {
                if (!arrastando) return;
                arrastando = false;
                document.body.style.cursor = '';
                Blockly.svgResize(this.ws);
            });
            window.addEventListener('mousemove', e => {
                if (!arrastando) return;
                const largura = Math.min(Math.max(window.innerWidth - e.clientX, 320), window.innerWidth - 380);
                lateral.style.flexBasis = largura + 'px';
                Blockly.svgResize(this.ws);
            });
        },

        /* ============================================================ */
        /* Código                                                       */
        /* ============================================================ */

        agendarAtualizacao() {
            clearTimeout(this._t);
            this._t = setTimeout(() => this.atualizarCodigo(), 120);
        },

        atualizarCodigo() {
            if (!this.ws) return;
            try {
                this.codigo = ArduinoGen.workspaceToCode(this.ws);
            } catch (e) {
                this.codigo = '// erro ao gerar o código: ' + e.message + '\n';
            }
            $('codigo').textContent = this.codigo;
            $('rotulo-ino').textContent = nomeArquivo(this.projeto.nome) + '.ino';

            const problemas = Validate.revalidar(this.ws);
            const avisosGen = (ArduinoGen.avisos_ || []).slice();
            avisosGen.forEach(a => {
                if (!a.blockId) return;
                const b = this.ws.getBlockById(a.blockId);
                if (b) b.setWarningText([b.warning && b.warning.getText(), a.mensagem].filter(Boolean).join('\n'));
            });

            const total = problemas.length + avisosGen.length;
            const el = $('status-avisos');
            el.textContent = total ? total + (total === 1 ? ' aviso' : ' avisos') : '';
            el.className = 'status-item ' + (problemas.length ? 'erro' : total ? 'aviso' : '');
            el.title = problemas.concat(avisosGen).map(p => p.mensagem).join('\n');

            this._problemasPlaca = problemas;
        },

        trocarPlaca(id) {
            this.placa = id;
            Boards.selecionar(id);
            window.tb.prefs.gravar({ placa: id });
            this.ws.updateToolbox(Toolbox.construir());
            this.atualizarCodigo();
            this.status('placa: ' + Boards.atual().nome);
        },

        /* ============================================================ */
        /* Portas e toolchain                                           */
        /* ============================================================ */

        async verificarToolchain() {
            const v = await window.tb.cli.versao();
            const el = $('status-toolchain');
            if (v.disponivel) {
                const cores = await window.tb.cli.cores();
                el.textContent = 'arduino-cli ' + (v.versao || '') + ' · ' + cores.length + ' core(s)';
                el.className = 'status-item ok';
                el.title = cores.map(c => c.id + ' ' + c.instalado).join('\n');
                this._cores = cores;
            } else {
                el.textContent = 'arduino-cli não encontrado';
                el.className = 'status-item erro';
                el.title = v.erro || '';
                this._cores = [];
            }
        },

        async atualizarPortas(silencioso) {
            const sel = $('sel-porta');
            // Não redesenhar a lista com ela aberta: fecharia o menu na cara do usuário.
            if (silencioso && document.activeElement === sel) return;

            const r = await window.tb.placas.portas();
            const anterior = this.porta || sel.value || this.prefs.porta;

            sel.innerHTML = '';
            if (!r.portas.length) {
                const o = document.createElement('option');
                o.value = '';
                o.textContent = 'nenhuma placa detectada';
                sel.appendChild(o);
                this.porta = null;
                return;
            }

            r.portas.forEach(p => {
                const o = document.createElement('option');
                o.value = p.porta;
                o.textContent = p.porta + (p.placaDetectada ? ' — ' + p.placaDetectada : '');
                sel.appendChild(o);
            });

            const achou = r.portas.find(p => p.porta === anterior);
            sel.value = achou ? anterior : r.portas[0].porta;
            this.porta = sel.value;

            // Placa reconhecida pelo VID/PID: oferece trocar o seletor
            const detectada = r.portas.find(p => p.porta === this.porta && p.fqbnDetectado);
            if (detectada && !silencioso) {
                const b = Boards.porFqbn(detectada.fqbnDetectado);
                if (b && b.id !== this.placa) {
                    this.status('placa detectada na porta: ' + b.nome + ' (troque no seletor se quiser)', 'aviso');
                }
            }
        },

        /* ============================================================ */
        /* Compilar e gravar                                            */
        /* ============================================================ */

        async compilar(gravarDepois) {
            if (this.compilando) return;

            // Regera antes de compilar: limpa avisos velhos do compilador e
            // garante que o mapa linha → bloco corresponde a este código.
            this.atualizarCodigo();

            if (this._problemasPlaca && this._problemasPlaca.length) {
                this.abrirAba('saida');
                this.logSaida('> a placa selecionada não aceita este programa:', 'erro');
                this._problemasPlaca.forEach(p => this.logSaida('  ' + p.mensagem, 'erro'));
                this.destacarBloco(this._problemasPlaca[0].blockId);
                this.status('corrija os avisos antes de compilar', 'erro');
                return;
            }

            if (gravarDepois && !this.porta) {
                this.status('nenhuma porta selecionada', 'erro');
                return;
            }

            // Numa instalação enxuta (só AVR) o core do ESP não está lá; melhor
            // dizer isso do que deixar o compilador reclamar em inglês.
            const core = Boards.atual().core;
            if (this._cores && this._cores.length && !this._cores.some(c => c.id === core)) {
                this.abrirAba('saida');
                this.logSaida('> o suporte à ' + Boards.atual().nome + ' (' + core +
                    ') não está instalado nesta versão do aplicativo.', 'erro');
                this.logSaida('  monte a toolchain completa: node tools/fetch_toolchain.mjs', 'info');
                this.status('core ' + core + ' ausente', 'erro');
                return;
            }

            this.compilando = true;
            $('btn-compilar').disabled = true;
            $('btn-gravar').disabled = true;
            this.abrirAba('saida');
            this.status('compilando…');

            const nome = nomeArquivo(this.projeto.nome);
            const fqbn = Boards.atual().fqbn;

            const r = await window.tb.build.compilar({ nome: nome, codigo: this.codigo, fqbn: fqbn });

            this.marcarErrosDeCompilacao(r.problemas || []);

            if (!r.ok) {
                this.status('compilação falhou', 'erro');
                this.finalizarCompilacao();
                return;
            }

            if (r.tamanho && r.tamanho.length) {
                const texto = r.tamanho.map(s =>
                    s.nome + ': ' + s.usado.toLocaleString('pt-BR') +
                    (s.max ? ' de ' + s.max.toLocaleString('pt-BR') + ' bytes (' + s.pct + '%)' : ' bytes')
                ).join('  ·  ');
                this.logSaida('  ' + texto, 'info');
            }

            if (!gravarDepois) {
                this.status('compilado com sucesso', 'ok');
                this.finalizarCompilacao();
                return;
            }

            this.status('gravando…');
            const g = await window.tb.build.gravar({ nome: nome, fqbn: fqbn, porta: this.porta });
            this.status(g.ok ? 'gravado na placa' : 'gravação falhou', g.ok ? 'ok' : 'erro');
            this.finalizarCompilacao();
        },

        finalizarCompilacao() {
            this.compilando = false;
            $('btn-compilar').disabled = false;
            $('btn-gravar').disabled = false;
        },

        /**
         * Liga o erro do compilador ao bloco: o gerador guardou linha → id.
         */
        marcarErrosDeCompilacao(problemas) {
            const mapa = ArduinoGen.mapaLinhas || {};
            let primeiro = null;

            problemas.forEach(p => {
                if (!p.noSketch) return;
                const id = mapa[p.linha];
                if (!id) return;
                const bloco = this.ws.getBlockById(id);
                if (!bloco) return;
                const anterior = bloco.warning && bloco.warning.getText();
                bloco.setWarningText([anterior, (p.nivel === 'erro' ? 'Erro: ' : 'Aviso: ') + p.mensagem]
                    .filter(Boolean).join('\n'));
                if (p.nivel === 'erro' && !primeiro) primeiro = id;
            });

            this.pintarLinhas(problemas);
            if (primeiro) this.destacarBloco(primeiro);
        },

        pintarLinhas(problemas) {
            const linhas = this.codigo.split('\n');
            const marca = {};
            problemas.forEach(p => { if (p.noSketch) marca[p.linha] = p.nivel; });

            const alvo = $('codigo');
            alvo.textContent = '';
            linhas.forEach((l, i) => {
                const n = i + 1;
                if (marca[n]) {
                    const span = document.createElement('span');
                    span.className = marca[n] === 'erro' ? 'ln-erro' : 'ln-aviso';
                    span.textContent = l + '\n';
                    alvo.appendChild(span);
                } else {
                    alvo.appendChild(document.createTextNode(l + '\n'));
                }
            });
        },

        destacarBloco(id) {
            const b = this.ws.getBlockById(id);
            if (!b) return;
            this.ws.centerOnBlock(id);
            b.select();
        },

        logSaida(linha, canal) {
            const box = $('console-saida');
            const div = document.createElement('div');
            div.className = canal === 'erro' || canal === 'err' ? 'l-erro'
                : canal === 'ok' ? 'l-ok' : canal === 'info' ? 'l-info' : '';
            div.textContent = linha;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        },

        /* ============================================================ */
        /* Serial                                                       */
        /* ============================================================ */

        async alternarSerial() {
            if (UISerial.conectada) {
                await window.tb.serial.fechar();
                return;
            }
            if (!this.porta) {
                this.status('nenhuma porta selecionada', 'erro');
                return;
            }
            const baud = Number($('sel-baud').value);
            const r = await window.tb.serial.abrir(this.porta, baud);
            if (!r.ok) {
                UISerial.linha('não foi possível abrir ' + this.porta + ': ' + r.erro, 'l-erro');
                this.status('falha ao abrir a porta', 'erro');
            }
        },

        async reabrirSerial() {
            await window.tb.serial.fechar();
            await this.alternarSerial();
        },

        refletirSerial(estado) {
            UISerial.conectada = !!estado.aberta;
            $('btn-serial-abrir').textContent = estado.aberta ? 'Desconectar' : 'Conectar';
            $('entrada-serial').disabled = !estado.aberta;
            $('btn-serial-enviar').disabled = !estado.aberta;
            if (estado.aberta) {
                UISerial.linha('— conectado em ' + estado.porta + ' a ' + estado.baud + ' baud —', 'l-ok');
            } else {
                UISerial.linha('— desconectado —', 'l-info');
            }
        },

        async enviarSerial() {
            const campo = $('entrada-serial');
            const texto = campo.value;
            if (!texto) return;
            const r = await window.tb.serial.enviar(texto, $('sel-terminador').value);
            if (r.ok) {
                UISerial.linha('» ' + texto, 'l-info');
                campo.value = '';
            } else {
                UISerial.linha('falha ao enviar: ' + r.erro, 'l-erro');
            }
        },

        /* ============================================================ */
        /* Projetos                                                     */
        /* ============================================================ */

        novo() {
            this.ws.clear();
            this.projeto = { caminho: null, nome: 'sem título', sujo: false };
            this.criarEsqueleto();
            this.marcarLimpo();
            this.atualizarCodigo();
        },

        criarEsqueleto() {
            // Um programa novo já nasce com setup e loop, como um .ino em branco.
            Blockly.serialization.workspaces.load({
                blocks: {
                    languageVersion: 0,
                    blocks: [
                        { type: 'ard_setup', x: 60, y: 60 },
                        { type: 'ard_loop', x: 60, y: 220 }
                    ]
                }
            }, this.ws);
        },

        async salvarProjeto(comoNovo) {
            const dados = {
                caminho: comoNovo ? null : this.projeto.caminho,
                nome: this.projeto.nome,
                placa: this.placa,
                modo: this.modo,
                workspace: Blockly.serialization.workspaces.save(this.ws)
            };
            const r = await window.tb.projeto.salvar(dados);
            if (r.cancelado) return;
            if (!r.ok) {
                this.status('não deu para salvar: ' + r.erro, 'erro');
                return;
            }
            this.projeto.caminho = r.caminho;
            this.projeto.nome = r.nome;
            this.projeto.sujo = false;
            this.atualizarNome();
            this.status('projeto salvo', 'ok');
        },

        async abrirProjeto(caminho) {
            const r = await window.tb.projeto.abrir(caminho ? { caminho: caminho } : undefined);
            if (r.cancelado) return;
            if (!r.ok) {
                this.status('não deu para abrir: ' + r.erro, 'erro');
                return;
            }
            if (r.placa && Boards.get(r.placa)) {
                $('sel-placa').value = r.placa;
                this.trocarPlaca(r.placa);
            }
            // O projeto reabre no modo em que foi salvo: um programa abstrato
            // com a paleta literal na tela confundiria mais do que ajudaria.
            if (r.modo && r.modo !== this.modo) {
                this.modo = r.modo === 'abstrato' ? 'abstrato' : 'literal';
                Toolbox.modo = this.modo;
                this.ws.updateToolbox(Toolbox.construir(this.modo));
                window.tb.prefs.gravar({ modo: this.modo });
            }
            Blockly.serialization.workspaces.load(r.workspace, this.ws);
            this.projeto = { caminho: r.caminho, nome: r.nome, sujo: false };
            this.marcarLimpo();
            this.atualizarCodigo();
            this.status('projeto aberto', 'ok');
        },

        async exportarIno() {
            const r = await window.tb.projeto.exportarIno({ nome: this.projeto.nome, codigo: this.codigo });
            if (r.cancelado) return;
            this.status(r.ok ? 'sketch exportado' : 'falha ao exportar', r.ok ? 'ok' : 'erro');
        },

        /** Carregar blocos dispara eventos de mudança; isso não é edição do usuário. */
        marcarLimpo() {
            setTimeout(() => {
                this.projeto.sujo = false;
                this.atualizarNome();
            }, 0);
        },

        marcarSujo() {
            if (this.projeto.sujo) return;
            this.projeto.sujo = true;
            this.atualizarNome();
        },

        atualizarNome() {
            const el = $('nome-projeto');
            el.textContent = this.projeto.nome;
            el.className = 'marca-projeto' + (this.projeto.sujo ? ' sujo' : '');
        },

        /** Rascunho local, para não perder trabalho ao fechar sem salvar. */
        salvarRascunho() {
            try {
                localStorage.setItem('taskarduino:rascunho', JSON.stringify({
                    placa: this.placa,
                    modo: this.modo,
                    nome: this.projeto.nome,
                    caminho: this.projeto.caminho,
                    workspace: Blockly.serialization.workspaces.save(this.ws)
                }));
            } catch (e) { /* sem rascunho é melhor do que travar ao fechar */ }
        },

        restaurarRascunho() {
            let bruto = null;
            try { bruto = localStorage.getItem('taskarduino:rascunho'); } catch (e) { bruto = null; }
            if (!bruto) { this.criarEsqueleto(); this.marcarLimpo(); return; }
            try {
                const d = JSON.parse(bruto);
                if (d.placa && Boards.get(d.placa)) {
                    this.placa = d.placa;
                    Boards.selecionar(d.placa);
                    $('sel-placa').value = d.placa;
                    this.ws.updateToolbox(Toolbox.construir());
                }
                Blockly.serialization.workspaces.load(d.workspace, this.ws);
                this.projeto = { caminho: d.caminho || null, nome: d.nome || 'sem título', sujo: false };
            } catch (e) {
                this.criarEsqueleto();
            }
            this.marcarLimpo();
        },

        /* ============================================================ */

        abrirAba(nome) {
            document.querySelectorAll('.aba').forEach(a => a.classList.toggle('ativa', a.dataset.aba === nome));
            document.querySelectorAll('.conteudo-aba').forEach(c =>
                c.classList.toggle('ativa', c.dataset.conteudo === nome));
        },

        status(texto, tipo) {
            const el = $('status-mensagem');
            el.textContent = texto;
            el.className = 'status-item ' + (tipo || '');
        },

        async diagnostico() {
            this.abrirAba('saida');
            const v = await window.tb.cli.versao();
            this.logSaida('— diagnóstico da toolchain —', 'info');
            this.logSaida('binário: ' + v.caminho + (v.embutido ? ' (embutido)' : ' (do sistema)'));
            this.logSaida('versão: ' + (v.versao || 'não respondeu'));
            if (!v.disponivel) this.logSaida('erro: ' + v.erro, 'erro');
            const cores = await window.tb.cli.cores();
            this.logSaida('cores instalados: ' + (cores.length ? '' : 'nenhum'), cores.length ? '' : 'erro');
            cores.forEach(c => this.logSaida('  ' + c.id + ' ' + c.instalado + '  ' + (c.nome || '')));
            const faltando = Boards.ORDEM
                .map(id => Boards.get(id).core)
                .filter((c, i, a) => a.indexOf(c) === i)
                .filter(c => !cores.some(x => x.id === c));
            if (faltando.length) {
                this.logSaida('cores faltando para as placas suportadas: ' + faltando.join(', '), 'erro');
            }
        }
    };

    window.App = App;
    document.addEventListener('DOMContentLoaded', () => App.iniciar());

})();
