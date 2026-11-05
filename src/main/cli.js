'use strict';
/**
 * Camada sobre o arduino-cli: onde está o binário, como falar com ele,
 * como compilar e como gravar.
 *
 * A toolchain vem embutida no aplicativo (resources/toolchain), mas os cores
 * ocupados ficam num diretório somente-leitura depois de instalado. O
 * arduino-cli precisa escrever metadados, então o diretório de dados fica no
 * userData e a pasta pesada (packages) é ligada por symlink/junction.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let ctx = null;

function plataforma() {
    if (process.platform === 'win32') return 'win';
    if (process.platform === 'darwin') return 'mac';
    return 'linux';
}

function nomeBinario() {
    return process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
}

/**
 * Procura o arduino-cli, em ordem:
 *   1. toolchain embutida do app empacotado (process.resourcesPath/toolchain)
 *   2. toolchain do repositório, em desenvolvimento (resources/toolchain/<plat>)
 *   3. instalação do próprio usuário, no PATH
 */
function localizarBinario(raizApp, empacotado) {
    const candidatos = [];
    if (empacotado && process.resourcesPath) {
        candidatos.push(path.join(process.resourcesPath, 'toolchain', nomeBinario()));
    }
    candidatos.push(path.join(raizApp, 'resources', 'toolchain', plataforma(), nomeBinario()));
    candidatos.push(path.join(raizApp, 'resources', 'toolchain', nomeBinario()));

    for (const c of candidatos) {
        if (fs.existsSync(c)) return { caminho: c, embutido: true };
    }
    return { caminho: nomeBinario(), embutido: false };
}

/** Diretório de dados embutido (onde ficam os cores instalados no build). */
function localizarDadosEmbutidos(raizApp, empacotado) {
    const candidatos = [];
    if (empacotado && process.resourcesPath) {
        candidatos.push(path.join(process.resourcesPath, 'toolchain', 'data'));
    }
    candidatos.push(path.join(raizApp, 'resources', 'toolchain', plataforma(), 'data'));
    candidatos.push(path.join(raizApp, 'resources', 'toolchain', 'data'));
    return candidatos.find(c => fs.existsSync(c)) || null;
}

/**
 * Prepara um diretório de dados gravável apontando para os cores embutidos.
 * Symlink/junction evita copiar gigabytes na primeira execução.
 */
function prepararDados(dirUsuario, dadosEmbutidos) {
    const dados = path.join(dirUsuario, 'arduino-data');
    fs.mkdirSync(dados, { recursive: true });

    if (dadosEmbutidos) {
        const origem = path.join(dadosEmbutidos, 'packages');
        const destino = path.join(dados, 'packages');

        // Se o app mudou de lugar, o link antigo aponta para outro canto: refaz.
        // Não basta testar se o link resolve. Quando a pasta antiga ainda existe
        // — sobra de uma mudança de lugar, ou recriada por um arduino-cli que
        // rodou com config velha — o link continua válido e aponta para uma
        // árvore de cores vazia. O sintoma é "0 core(s)" com tudo instalado.
        try {
            const st = fs.lstatSync(destino);
            if (st.isSymbolicLink()) {
                let alvo = null;
                try { alvo = fs.realpathSync(destino); } catch (e) { /* quebrado */ }
                const esperado = fs.existsSync(origem) ? fs.realpathSync(origem) : origem;
                if (alvo !== esperado) fs.unlinkSync(destino);
            }
        } catch (e) { /* não existe ainda */ }

        if (fs.existsSync(origem) && !fs.existsSync(destino)) {
            try {
                fs.symlinkSync(origem, destino, process.platform === 'win32' ? 'junction' : 'dir');
            } catch (e) {
                // Sem permissão de symlink (Windows sem modo desenvolvedor): copia.
                fs.cpSync(origem, destino, { recursive: true });
            }
        }
        // Índices são pequenos; copiar mantém o diretório de dados autossuficiente.
        for (const arquivo of fs.existsSync(dadosEmbutidos) ? fs.readdirSync(dadosEmbutidos) : []) {
            if (!/\.(json|yaml)$/.test(arquivo)) continue;
            const de = path.join(dadosEmbutidos, arquivo);
            const para = path.join(dados, arquivo);
            if (!fs.existsSync(para)) {
                try { fs.copyFileSync(de, para); } catch (e) { /* segue sem o índice */ }
            }
        }
    }
    return dados;
}

/**
 * Bibliotecas são código-fonte e ficam no diretório de usuário, que precisa ser
 * gravável. São poucos MB, então copiar do bundle é mais simples que ligar.
 */
function instalarBibliotecas(dirUsuario, raizToolchain) {
    if (!raizToolchain) return;
    const origem = path.join(raizToolchain, 'libraries');
    if (!fs.existsSync(origem)) return;
    const destino = path.join(dirUsuario, 'arduino-user', 'libraries');
    fs.mkdirSync(destino, { recursive: true });
    for (const nome of fs.readdirSync(origem)) {
        const alvo = path.join(destino, nome);
        if (fs.existsSync(alvo)) continue;
        try {
            fs.cpSync(path.join(origem, nome), alvo, { recursive: true });
        } catch (e) { /* biblioteca ausente é problema do compilador reportar */ }
    }
}

function escreverConfig(dirUsuario, dados) {
    const user = path.join(dirUsuario, 'arduino-user');
    fs.mkdirSync(user, { recursive: true });
    fs.mkdirSync(path.join(dirUsuario, 'builds'), { recursive: true });

    const yaml = [
        'directories:',
        '  data: ' + dados,
        '  downloads: ' + path.join(dados, 'staging'),
        '  user: ' + user,
        'logging:',
        '  level: warn',
        'library:',
        '  enable_unsafe_install: false',
        ''
    ].join('\n');

    const cfg = path.join(dirUsuario, 'arduino-cli.yaml');
    fs.writeFileSync(cfg, yaml, 'utf8');
    return cfg;
}

/**
 * @param {object} opcoes {raizApp, dirUsuario, empacotado}
 */
function iniciar(opcoes) {
    const bin = localizarBinario(opcoes.raizApp, opcoes.empacotado);
    const dadosEmbutidos = localizarDadosEmbutidos(opcoes.raizApp, opcoes.empacotado);
    const dados = prepararDados(opcoes.dirUsuario, dadosEmbutidos);
    const config = escreverConfig(opcoes.dirUsuario, dados);
    instalarBibliotecas(opcoes.dirUsuario, dadosEmbutidos ? path.dirname(dadosEmbutidos) : null);

    ctx = {
        bin: bin.caminho,
        embutido: bin.embutido,
        config: config,
        dados: dados,
        dirUsuario: opcoes.dirUsuario,
        buildsDir: path.join(opcoes.dirUsuario, 'builds'),
        sketchesDir: path.join(opcoes.dirUsuario, 'sketches')
    };
    fs.mkdirSync(ctx.sketchesDir, { recursive: true });
    return ctx;
}

function contexto() {
    if (!ctx) throw new Error('cli.iniciar() ainda não foi chamado');
    return ctx;
}

/**
 * Executa o arduino-cli. `aoVivo` recebe cada linha de stdout/stderr enquanto
 * o processo roda — é o que alimenta a barra de progresso da gravação.
 */
function executar(args, opcoes) {
    opcoes = opcoes || {};
    const c = contexto();
    const argv = ['--config-file', c.config].concat(args);

    return new Promise(resolve => {
        let proc;
        try {
            proc = spawn(c.bin, argv, { env: Object.assign({}, process.env) });
        } catch (e) {
            resolve({ ok: false, codigo: -1, stdout: '', stderr: String(e.message), erroSpawn: true });
            return;
        }

        let saida = '';
        let erro = '';
        let restoOut = '';
        let restoErr = '';

        function emitir(texto, canal, resto) {
            const partes = (resto + texto).split(/\r?\n/);
            const ultimo = partes.pop();
            partes.forEach(l => opcoes.aoVivo && opcoes.aoVivo(l, canal));
            return ultimo;
        }

        proc.stdout.on('data', d => {
            const t = d.toString();
            saida += t;
            restoOut = emitir(t, 'out', restoOut);
        });
        proc.stderr.on('data', d => {
            const t = d.toString();
            erro += t;
            restoErr = emitir(t, 'err', restoErr);
        });

        proc.on('error', e => {
            resolve({ ok: false, codigo: -1, stdout: saida, stderr: String(e.message), erroSpawn: true });
        });

        let temporizador = null;
        if (opcoes.timeoutMs) {
            temporizador = setTimeout(() => {
                try { proc.kill(); } catch (e) { /* já morreu */ }
            }, opcoes.timeoutMs);
        }

        proc.on('close', codigo => {
            if (temporizador) clearTimeout(temporizador);
            if (restoOut && opcoes.aoVivo) opcoes.aoVivo(restoOut, 'out');
            if (restoErr && opcoes.aoVivo) opcoes.aoVivo(restoErr, 'err');
            resolve({ ok: codigo === 0, codigo: codigo, stdout: saida, stderr: erro });
        });
    });
}

function json(texto) {
    if (!texto) return null;
    // O arduino-cli às vezes escreve avisos antes do JSON.
    const i = texto.indexOf('{');
    const j = texto.indexOf('[');
    const inicio = (i === -1) ? j : (j === -1 ? i : Math.min(i, j));
    if (inicio === -1) return null;
    try {
        return JSON.parse(texto.slice(inicio));
    } catch (e) {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/* Operações                                                           */
/* ------------------------------------------------------------------ */

async function versao() {
    const r = await executar(['version', '--format', 'json'], { timeoutMs: 20000 });
    const j = json(r.stdout);
    return {
        disponivel: r.ok,
        versao: j && (j.VersionString || j.version) || null,
        caminho: contexto().bin,
        embutido: contexto().embutido,
        erro: r.ok ? null : (r.stderr || r.stdout || 'arduino-cli não encontrado')
    };
}

/** Cores instalados — é o que diz se a toolchain embutida chegou inteira. */
async function coresInstalados() {
    const r = await executar(['core', 'list', '--format', 'json'], { timeoutMs: 30000 });
    const j = json(r.stdout);
    const lista = Array.isArray(j) ? j : (j && (j.platforms || j.installed_platforms)) || [];
    return lista.map(p => ({
        id: p.id || (p.ID) || '',
        instalado: p.installed_version || p.installed || '',
        nome: (p.releases && p.latest && p.releases[p.latest] && p.releases[p.latest].name) || p.name || ''
    })).filter(p => p.id);
}

/** Portas com placa detectada. */
async function listarPortas() {
    const r = await executar(['board', 'list', '--format', 'json'], { timeoutMs: 20000 });
    const j = json(r.stdout);
    const portas = [];

    const detectadas = Array.isArray(j) ? j : (j && (j.detected_ports || j.ports)) || [];
    detectadas.forEach(item => {
        const p = item.port || item;
        if (!p || !p.address) return;
        if (p.protocol && p.protocol !== 'serial') return;
        const casadas = item.matching_boards || item.boards || [];
        portas.push({
            porta: p.address,
            rotulo: p.label || p.address,
            fabricante: (p.properties && (p.properties.vid ? 'VID ' + p.properties.vid + ' PID ' + p.properties.pid : '')) || '',
            placaDetectada: casadas.length ? casadas[0].name : null,
            fqbnDetectado: casadas.length ? casadas[0].fqbn : null
        });
    });
    return portas;
}

/** Escreve o sketch em disco, no formato que o arduino-cli espera (pasta com .ino de mesmo nome). */
function gravarSketch(nome, codigo) {
    const c = contexto();
    const seguro = String(nome || 'sketch').replace(/[^A-Za-z0-9_-]/g, '_') || 'sketch';
    const pasta = path.join(c.sketchesDir, seguro);
    fs.mkdirSync(pasta, { recursive: true });
    const arquivo = path.join(pasta, seguro + '.ino');
    fs.writeFileSync(arquivo, codigo, 'utf8');
    return { pasta: pasta, arquivo: arquivo, nome: seguro };
}

function caminhoBuild(fqbn) {
    const c = contexto();
    // A vírgula também sai: as opções de menu do FQBN vêm separadas por vírgula
    // (esp32s3:CDCOnBoot=cdc,PSRAM=opi,...) e o linker recebe o caminho dentro
    // de um -Wl,..., que se parte nas vírgulas ("cannot find PSRAM_opi/....map").
    return path.join(c.buildsDir, fqbn.replace(/[:=,]/g, '_'));
}

/**
 * Extrai erros do compilador no formato arquivo:linha:coluna: error: mensagem.
 * É o que permite ligar a falha ao bloco, via mapa de linhas do gerador.
 */
function analisarErros(texto, arquivoSketch) {
    const linhas = String(texto || '').split(/\r?\n/);
    const erros = [];
    const re = /^(.*?):(\d+):(?:(\d+):)?\s*(error|erro|warning|aviso):\s*(.*)$/i;
    linhas.forEach(l => {
        const m = l.match(re);
        if (!m) return;
        const arquivo = m[1];
        const ehSketch = arquivoSketch && path.basename(arquivo) === path.basename(arquivoSketch);
        erros.push({
            arquivo: arquivo,
            noSketch: !!ehSketch,
            linha: Number(m[2]),
            coluna: m[3] ? Number(m[3]) : null,
            nivel: /warn|aviso/i.test(m[4]) ? 'aviso' : 'erro',
            mensagem: m[5]
        });
    });
    return erros;
}

async function compilar(opcoes, aoVivo) {
    const sk = gravarSketch(opcoes.nome, opcoes.codigo);
    const build = caminhoBuild(opcoes.fqbn);
    fs.mkdirSync(build, { recursive: true });

    const r = await executar([
        'compile',
        '--fqbn', opcoes.fqbn,
        '--build-path', build,
        '--format', 'json',
        sk.pasta
    ], { aoVivo: aoVivo, timeoutMs: 15 * 60 * 1000 });

    const j = json(r.stdout);
    const textoErro = [r.stderr, j && j.compiler_err ? j.compiler_err : ''].join('\n');
    const problemas = analisarErros(textoErro, sk.arquivo);

    // O arduino-cli devolve as seções como lista: [{name,size,max_size}, ...]
    const secoes = (j && j.builder_result && j.builder_result.executable_sections_size) ||
        (j && j.executable_sections_size) || null;
    const tamanho = Array.isArray(secoes) ? secoes.map(s => ({
        nome: s.name === 'text' ? 'programa' : s.name === 'data' ? 'memória' : s.name,
        usado: s.size,
        max: s.max_size || null,
        pct: s.max_size ? Math.round((s.size / s.max_size) * 100) : null
    })) : null;

    return {
        ok: r.ok,
        buildPath: build,
        sketch: sk.arquivo,
        problemas: problemas,
        tamanho: tamanho,
        saida: (r.stdout || '') + '\n' + (r.stderr || '')
    };
}

async function gravar(opcoes, aoVivo) {
    const build = caminhoBuild(opcoes.fqbn);
    const sk = path.join(contexto().sketchesDir, String(opcoes.nome || 'sketch').replace(/[^A-Za-z0-9_-]/g, '_'));

    const r = await executar([
        'upload',
        '-p', opcoes.porta,
        '--fqbn', opcoes.fqbn,
        '--input-dir', build,
        sk
    ], { aoVivo: aoVivo, timeoutMs: 5 * 60 * 1000 });

    return {
        ok: r.ok,
        saida: (r.stdout || '') + '\n' + (r.stderr || ''),
        erro: r.ok ? null : (r.stderr || r.stdout || 'falha na gravação')
    };
}

module.exports = {
    iniciar, contexto, executar, versao, coresInstalados, listarPortas,
    compilar, gravar, gravarSketch, analisarErros, caminhoBuild, plataforma
};
