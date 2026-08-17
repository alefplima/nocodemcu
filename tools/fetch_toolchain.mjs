#!/usr/bin/env node
/**
 * Monta a toolchain embutida em resources/toolchain/<so>/.
 *
 *   node tools/fetch_toolchain.mjs                 # SO atual, tudo
 *   node tools/fetch_toolchain.mjs --slim          # só AVR (Uno/Nano/Mega/Leonardo)
 *   node tools/fetch_toolchain.mjs --so=win        # bundle do Windows, montado daqui
 *   node tools/fetch_toolchain.mjs --so=linux,win  # os dois
 *
 * Dois caminhos, conforme o alvo:
 *
 *   - alvo == máquina atual: usa o próprio arduino-cli (`core install`), que é
 *     o jeito confiável e testado;
 *   - alvo != máquina atual: baixa direto dos índices de pacote, escolhendo os
 *     binários do host alvo. É o que permite gerar o bundle do Windows a partir
 *     do Linux, sem precisar de uma segunda máquina.
 *
 * Depois de rodar, resources/toolchain/<so>/ tem o binário, data/packages com
 * os cores e libraries/ com as bibliotecas — tudo que o app precisa sem rede.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const VERSAO_CLI = '1.3.1';

const INDICES = [
    { nome: 'package_index.json', url: 'https://downloads.arduino.cc/packages/package_index.json' },
    { nome: 'package_esp32_index.json', url: 'https://espressif.github.io/arduino-esp32/package_esp32_index.json' },
    { nome: 'package_esp8266com_index.json', url: 'https://arduino.esp8266.com/stable/package_esp8266com_index.json' }
];

// packager:arquitetura que cada família de placas precisa
const CORES = {
    avr: { packager: 'arduino', arch: 'avr', indice: 'package_index.json' },
    esp32: { packager: 'esp32', arch: 'esp32', indice: 'package_esp32_index.json' },
    esp8266: { packager: 'esp8266', arch: 'esp8266', indice: 'package_esp8266com_index.json' }
};

const BIBLIOTECAS = [
    'Servo',
    'LiquidCrystal I2C',
    'DHT sensor library',
    'Adafruit Unified Sensor'
];

// host declarado nos índices, por SO alvo
const HOSTS = {
    linux: ['x86_64-pc-linux-gnu', 'x86_64-linux-gnu'],
    win: ['x86_64-mingw32', 'i686-mingw32'],
    mac: ['x86_64-apple-darwin', 'x86_64-apple-darwin12', 'arm64-apple-darwin']
};

const CLI_ARQUIVO = {
    linux: `arduino-cli_${VERSAO_CLI}_Linux_64bit.tar.gz`,
    win: `arduino-cli_${VERSAO_CLI}_Windows_64bit.zip`,
    mac: `arduino-cli_${VERSAO_CLI}_macOS_64bit.tar.gz`
};

/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const slim = args.includes('--slim');
const semPodar = args.includes('--sem-podar');
const argSo = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '');
const soAtual = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const alvos = (argSo ? argSo.split(',') : [soAtual]).map(s => s.trim()).filter(Boolean);
const familias = slim ? ['avr'] : ['avr', 'esp32', 'esp8266'];

function log(...a) { console.log(...a); }
function passo(t) { console.log('\n▸ ' + t); }

/* ------------------------------------------------------------------ */
/* Rede e arquivos                                                     */
/* ------------------------------------------------------------------ */

async function baixar(url, destino, rotulo) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (fs.existsSync(destino) && fs.statSync(destino).size > 0) {
        log('  · já baixado: ' + (rotulo || path.basename(destino)));
        return destino;
    }
    log('  ↓ ' + (rotulo || url));
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
    const tmp = destino + '.parcial';
    await pipeline(r.body, fs.createWriteStream(tmp));
    fs.renameSync(tmp, destino);
    return destino;
}

function sha256(arquivo) {
    const h = createHash('sha256');
    h.update(fs.readFileSync(arquivo));
    return h.digest('hex');
}

function conferir(arquivo, checksum) {
    if (!checksum) return true;
    const [algo, esperado] = String(checksum).split(':');
    if (algo !== 'SHA-256') return true;
    const obtido = sha256(arquivo);
    if (obtido.toLowerCase() !== esperado.toLowerCase()) {
        throw new Error('checksum não confere em ' + path.basename(arquivo));
    }
    return true;
}

function extrair(arquivo, destino) {
    fs.mkdirSync(destino, { recursive: true });
    const ext = arquivo.toLowerCase();

    if (/\.(tar\.gz|tgz|tar\.bz2|tar\.xz)$/.test(ext)) {
        const r = spawnSync('tar', ['-xf', arquivo, '-C', destino]);
        if (r.status !== 0) throw new Error('tar falhou em ' + arquivo + ': ' + r.stderr);
        return;
    }
    if (/\.zip$/.test(ext)) {
        let r = spawnSync('unzip', ['-q', '-o', arquivo, '-d', destino]);
        if (r.status !== 0) {
            // sem unzip, o Python resolve
            r = spawnSync('python3', ['-m', 'zipfile', '-e', arquivo, destino]);
            if (r.status !== 0) throw new Error('não consegui descompactar ' + arquivo);
        }
        return;
    }
    throw new Error('formato desconhecido: ' + arquivo);
}

/**
 * Os pacotes vêm com uma pasta raiz própria (ex.: avr-gcc-7.3.0/).
 * O arduino-cli espera o conteúdo direto em tools/<nome>/<versao>/.
 */
function achatarSePreciso(dir) {
    const itens = fs.readdirSync(dir);
    if (itens.length !== 1) return;
    const unico = path.join(dir, itens[0]);
    if (!fs.statSync(unico).isDirectory()) return;

    const temp = dir + '.mover';
    fs.renameSync(unico, temp);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(temp, dir);
}

/* ------------------------------------------------------------------ */
/* arduino-cli                                                         */
/* ------------------------------------------------------------------ */

async function instalarCli(alvo, raizAlvo) {
    passo('arduino-cli ' + VERSAO_CLI + ' para ' + alvo);
    const arquivo = CLI_ARQUIVO[alvo];
    const url = 'https://downloads.arduino.cc/arduino-cli/' + arquivo;
    const cache = path.join(RAIZ, '.cache-toolchain', arquivo);
    await baixar(url, cache, arquivo);

    const tmp = path.join(RAIZ, '.cache-toolchain', 'cli-' + alvo);
    fs.rmSync(tmp, { recursive: true, force: true });
    extrair(cache, tmp);

    const nome = alvo === 'win' ? 'arduino-cli.exe' : 'arduino-cli';
    const origem = path.join(tmp, nome);
    if (!fs.existsSync(origem)) throw new Error('binário não veio no pacote: ' + nome);

    fs.mkdirSync(raizAlvo, { recursive: true });
    fs.copyFileSync(origem, path.join(raizAlvo, nome));
    if (alvo !== 'win') fs.chmodSync(path.join(raizAlvo, nome), 0o755);
    log('  ✓ ' + path.join(raizAlvo, nome));
}

/**
 * Cópia recursiva idempotente. O fs.cpSync do Node tropeça quando o destino já
 * existe parcialmente (EEXIST no meio da árvore), e aqui isso acontece sempre
 * que uma execução anterior foi interrompida.
 */
function copiarArvore(origem, destino) {
    fs.mkdirSync(destino, { recursive: true });
    for (const entrada of fs.readdirSync(origem, { withFileTypes: true })) {
        const de = path.join(origem, entrada.name);
        const para = path.join(destino, entrada.name);
        if (entrada.isDirectory()) {
            copiarArvore(de, para);
        } else if (entrada.isFile()) {
            fs.copyFileSync(de, para);
        }
        // links simbólicos das bibliotecas não interessam ao compilador
    }
}

function rodarCli(bin, args, cfg) {
    return new Promise(resolve => {
        const p = spawn(bin, ['--config-file', cfg].concat(args), { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        p.stdout.on('data', d => { out += d; process.stdout.write('    ' + d.toString().replace(/\n(?!$)/g, '\n    ')); });
        p.stderr.on('data', d => { err += d; });
        p.on('close', c => resolve({ ok: c === 0, out, err }));
    });
}

function escreverConfig(dados, user, cfg) {
    fs.mkdirSync(dados, { recursive: true });
    fs.mkdirSync(user, { recursive: true });
    fs.writeFileSync(cfg, [
        'directories:',
        '  data: ' + dados,
        '  downloads: ' + path.join(dados, 'staging'),
        '  user: ' + user,
        'board_manager:',
        '  additional_urls:',
        '    - https://espressif.github.io/arduino-esp32/package_esp32_index.json',
        '    - https://arduino.esp8266.com/stable/package_esp8266com_index.json',
        // O toolchain do ESP32 tem 320 MB e o padrão não dá conta em conexão
        // lenta. Mas timeout muito alto é pior: conexão que trava fica pendurada
        // em vez de morrer e deixar a repetição agir. 10 min é o meio-termo —
        // os arquivos já baixados ficam em staging e não voltam do zero.
        'network:',
        '  connection_timeout: 600s',
        ''
    ].join('\n'), 'utf8');
}

/* ------------------------------------------------------------------ */
/* Caminho 1 — alvo é a máquina atual                                  */
/* ------------------------------------------------------------------ */

async function montarNoHost(raizAlvo) {
    const bin = path.join(raizAlvo, soAtual === 'win' ? 'arduino-cli.exe' : 'arduino-cli');
    const dados = path.join(raizAlvo, 'data');
    const user = path.join(raizAlvo, 'user');
    const cfg = path.join(raizAlvo, 'arduino-cli.build.yaml');
    escreverConfig(dados, user, cfg);

    passo('atualizando índices de placas');
    await rodarCli(bin, ['core', 'update-index'], cfg);

    for (const f of familias) {
        const c = CORES[f];
        passo('instalando core ' + c.packager + ':' + c.arch);

        // Download grande em rede instável cai; tentar de novo é mais barato
        // do que refazer o bundle inteiro.
        let r = null;
        for (let tentativa = 1; tentativa <= 4; tentativa++) {
            r = await rodarCli(bin, ['core', 'install', c.packager + ':' + c.arch], cfg);
            if (r.ok) break;
            log('  ! tentativa ' + tentativa + ' falhou; repetindo em 5s');
            await new Promise(res => setTimeout(res, 5000));
        }
        if (!r.ok) throw new Error('falha ao instalar ' + c.packager + ':' + c.arch + '\n' + r.err);
    }

    passo('instalando bibliotecas');
    await rodarCli(bin, ['lib', 'update-index'], cfg);
    for (const lib of BIBLIOTECAS) {
        await rodarCli(bin, ['lib', 'install', lib], cfg);
    }

    // As bibliotecas ficam no diretório de usuário; o app copia para o userData.
    const libsOrigem = path.join(user, 'libraries');
    const libsDestino = path.join(raizAlvo, 'libraries');
    if (fs.existsSync(libsOrigem)) {
        copiarArvore(libsOrigem, libsDestino);
    }
}

/* ------------------------------------------------------------------ */
/* Caminho 2 — alvo diferente da máquina atual                         */
/* ------------------------------------------------------------------ */

function escolherSistema(sistemas, alvo) {
    const hosts = HOSTS[alvo] || [];
    for (const h of hosts) {
        const achado = (sistemas || []).find(s => s.host === h);
        if (achado) return achado;
    }
    // alguns índices usam prefixos (ex.: "i686-mingw32" cobre "x86_64-mingw32")
    for (const h of hosts) {
        const base = h.split('-').slice(1).join('-');
        const achado = (sistemas || []).find(s => s.host && s.host.endsWith(base));
        if (achado) return achado;
    }
    return null;
}

function ultimaVersao(lista) {
    return lista.slice().sort((a, b) =>
        String(a.version).localeCompare(String(b.version), undefined, { numeric: true })
    ).pop();
}

async function montarCruzado(alvo, raizAlvo) {
    const dados = path.join(raizAlvo, 'data');
    const cacheDir = path.join(RAIZ, '.cache-toolchain', 'pacotes');
    fs.mkdirSync(dados, { recursive: true });

    passo('baixando índices de pacotes');
    const indices = {};
    for (const idx of INDICES) {
        const destino = path.join(dados, idx.nome);
        await baixar(idx.url, destino, idx.nome);
        indices[idx.nome] = JSON.parse(fs.readFileSync(destino, 'utf8'));
    }

    for (const f of familias) {
        const c = CORES[f];
        const indice = indices[c.indice];
        const pacote = indice.packages.find(p => p.name === c.packager);
        if (!pacote) throw new Error('packager ' + c.packager + ' não achado em ' + c.indice);

        const plataformas = pacote.platforms.filter(p => p.architecture === c.arch);
        const plat = ultimaVersao(plataformas);
        passo(alvo + ': core ' + c.packager + ':' + c.arch + ' ' + plat.version);

        // 1. o core em si (independente de host)
        const destinoCore = path.join(dados, 'packages', c.packager, 'hardware', c.arch, plat.version);
        if (!fs.existsSync(path.join(destinoCore, 'boards.txt'))) {
            const arq = await baixar(plat.url, path.join(cacheDir, plat.archiveFileName), plat.archiveFileName);
            conferir(arq, plat.checksum);
            fs.rmSync(destinoCore, { recursive: true, force: true });
            extrair(arq, destinoCore);
            achatarSePreciso(destinoCore);
        } else {
            log('  · core já montado');
        }

        // 2. ferramentas de que o core depende, na versão do host alvo
        for (const dep of plat.toolsDependencies || []) {
            const dono = [pacote].concat(
                Object.values(indices).flatMap(i => i.packages)
            ).find(p => p.name === dep.packager);
            if (!dono) { log('  ! sem packager para ' + dep.name); continue; }

            const ferramenta = (dono.tools || []).find(t => t.name === dep.name && t.version === dep.version);
            if (!ferramenta) { log('  ! ferramenta ausente no índice: ' + dep.name + ' ' + dep.version); continue; }

            const sistema = escolherSistema(ferramenta.systems, alvo);
            if (!sistema) { log('  ! sem binário de ' + dep.name + ' para ' + alvo); continue; }

            const destinoTool = path.join(dados, 'packages', dep.packager, 'tools', dep.name, dep.version);
            if (fs.existsSync(destinoTool) && fs.readdirSync(destinoTool).length) {
                continue;
            }
            const arq = await baixar(sistema.url, path.join(cacheDir, sistema.archiveFileName),
                dep.name + ' ' + dep.version + ' (' + sistema.host + ')');
            conferir(arq, sistema.checksum);
            extrair(arq, destinoTool);
            achatarSePreciso(destinoTool);
        }
    }

    // 3. ferramentas internas do arduino-cli (descoberta de portas, ctags)
    passo(alvo + ': ferramentas internas (builtin)');
    const idxArduino = indices['package_index.json'];
    const builtin = idxArduino.packages.find(p => p.name === 'builtin');

    // O índice lista todas as versões de cada ferramenta; só a mais nova interessa.
    const porNome = new Map();
    for (const t of (builtin && builtin.tools) || []) {
        const atual = porNome.get(t.name);
        if (!atual || String(t.version).localeCompare(String(atual.version), undefined, { numeric: true }) > 0) {
            porNome.set(t.name, t);
        }
    }

    for (const t of porNome.values()) {
        const sistema = escolherSistema(t.systems, alvo);
        if (!sistema) continue;
        const destinoTool = path.join(dados, 'packages', 'builtin', 'tools', t.name, t.version);
        if (fs.existsSync(destinoTool) && fs.readdirSync(destinoTool).length) continue;
        const arq = await baixar(sistema.url, path.join(cacheDir, sistema.archiveFileName),
            t.name + ' ' + t.version);
        conferir(arq, sistema.checksum);
        extrair(arq, destinoTool);
        achatarSePreciso(destinoTool);
    }

    // 4. bibliotecas são código-fonte: valem para qualquer SO
    const libsHost = path.join(RAIZ, 'resources', 'toolchain', soAtual, 'libraries');
    const libsAlvo = path.join(raizAlvo, 'libraries');
    if (fs.existsSync(libsHost) && !fs.existsSync(libsAlvo)) {
        fs.cpSync(libsHost, libsAlvo, { recursive: true });
        log('  ✓ bibliotecas copiadas do bundle ' + soAtual);
    }
}

/* ------------------------------------------------------------------ */
/* Poda                                                                */
/* ------------------------------------------------------------------ */

function podar(raizAlvo) {
    passo('podando o que o app não usa');
    const dados = path.join(raizAlvo, 'data');
    let liberado = 0;

    const apagar = (dir, motivo) => {
        if (!fs.existsSync(dir)) return;
        liberado += tamanho(dir);
        fs.rmSync(dir, { recursive: true, force: true });
        log('  − ' + motivo + ': ' + path.relative(dados, dir));
    };

    // pacotes já extraídos
    apagar(path.join(dados, 'staging'), 'downloads');

    // O app só suporta o ESP32 clássico (xtensa); o RISC-V é para C3/C6/H2.
    // O diretório da ferramenta se chama esp-rv32 (o tarball é que é riscv32-*).
    const toolsEsp32 = path.join(dados, 'packages', 'esp32', 'tools');
    if (fs.existsSync(toolsEsp32)) {
        fs.readdirSync(toolsEsp32)
            .filter(n => /riscv|rv32/i.test(n))
            .forEach(n => apagar(path.join(toolsEsp32, n), 'toolchain RISC-V'));
    }

    // O core traz um pacote de bibliotecas pré-compiladas por SoC da família
    // (esp32s3-libs, esp32c6-libs, esp32p4-libs...), ~240 MB cada. O app só
    // oferece o DevKit clássico, então fica apenas o esp32-libs.
    if (fs.existsSync(toolsEsp32)) {
        fs.readdirSync(toolsEsp32)
            .filter(n => /^esp32.+-libs$/i.test(n) && n !== 'esp32-libs')
            .forEach(n => apagar(path.join(toolsEsp32, n), 'libs de outro SoC'));
    }

    log('  ✓ liberados ' + (liberado / 1048576).toFixed(0) + ' MB');
}

function tamanho(dir) {
    let total = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        try {
            total += e.isDirectory() ? tamanho(p) : fs.statSync(p).size;
        } catch (err) { /* link quebrado */ }
    }
    return total;
}

/* ------------------------------------------------------------------ */

async function main() {
    log('TaskArduino — toolchain embutida');
    log('alvos: ' + alvos.join(', ') + '   cores: ' + familias.join(', '));

    for (const alvo of alvos) {
        const raizAlvo = path.join(RAIZ, 'resources', 'toolchain', alvo);
        fs.mkdirSync(raizAlvo, { recursive: true });

        await instalarCli(alvo, raizAlvo);

        if (alvo === soAtual) {
            await montarNoHost(raizAlvo);
        } else {
            await montarCruzado(alvo, raizAlvo);
        }

        if (!semPodar) podar(raizAlvo);

        const total = tamanho(raizAlvo);
        log('\n✓ ' + alvo + ': ' + (total / 1048576).toFixed(0) + ' MB em ' + path.relative(RAIZ, raizAlvo));
    }

    log('\nPronto. Agora dá para empacotar com electron-builder.');
}

main().catch(e => {
    console.error('\n✗ ' + e.message);
    process.exit(1);
});
