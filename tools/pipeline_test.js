'use strict';
/**
 * Testa o caminho real do aplicativo, não um atalho: usa src/main/cli.js —
 * o mesmo módulo que o Electron usa — com um userData temporário.
 *
 *   node tools/pipeline_test.js
 *
 * Cobre o que só aparece quando as peças rodam juntas:
 *   - preparar o diretório de dados (symlink para os cores embutidos);
 *   - copiar as bibliotecas do bundle;
 *   - compilar um programa gerado pelos blocos;
 *   - transformar erro do compilador em bloco culpado, pelo mapa de linhas.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { carregar, novoWorkspace, RAIZ } = require('./carregar.js');
const cli = require(path.join(RAIZ, 'src/main/cli.js'));

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;

let passou = 0, falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
    if (cond) { passou++; console.log('   ✓ ' + nome); return true; }
    falhou++;
    console.log('   ✗ ' + nome);
    falhas.push(nome + (detalhe ? '\n      ' + String(detalhe).replace(/\n/g, '\n      ') : ''));
    return false;
}

const N = v => ({ t: 'ard_number', f: { NUM: v } });
const K = v => ({ t: 'ard_const', f: { CONST: v } });

async function main() {
    const dirUsuario = fs.mkdtempSync(path.join(os.tmpdir(), 'nocodemcu-pipeline-'));
    console.log('\nNoCodeMCU — pipeline real (userData: ' + dirUsuario + ')');

    console.log('\n— preparação da toolchain');
    const ctx = cli.iniciar({ raizApp: RAIZ, dirUsuario: dirUsuario, empacotado: false });

    ok(fs.existsSync(ctx.config), 'arduino-cli.yaml criado no userData');
    ok(fs.existsSync(path.join(ctx.dados, 'packages')), 'diretório de packages disponível');
    ok(fs.existsSync(path.join(dirUsuario, 'arduino-user', 'libraries', 'Servo')),
        'bibliotecas do bundle copiadas para o userData');

    const v = await cli.versao();
    ok(v.disponivel, 'arduino-cli responde (' + (v.versao || v.erro) + ')');
    ok(v.embutido, 'o binário usado é o embutido, não o do sistema');

    const cores = await cli.coresInstalados();
    ok(cores.length > 0, 'cores visíveis: ' + cores.map(c => c.id).join(', '));

    console.log('\n— compilação de um programa dos blocos');
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, [
        {
            t: 'ard_setup', s: {
                BODY: [
                    { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                    { t: 'ard_pinmode', f: { PIN: '13', MODO: 'OUTPUT' } }
                ]
            }
        },
        {
            t: 'ard_loop', s: {
                BODY: [
                    { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } },
                    { t: 'ard_delay', v: { MS: N(200) } },
                    { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('LOW') } },
                    { t: 'ard_delay', v: { MS: N(200) } },
                    { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_millis' } } }
                ]
            }
        }
    ]);
    const codigo = Gen.workspaceToCode(ws);

    const r = await cli.compilar({ nome: 'teste_pipeline', codigo: codigo, fqbn: 'arduino:avr:uno' });
    ok(r.ok, 'programa dos blocos compila', r.ok ? '' : r.saida.split('\n').slice(-12).join('\n'));
    const secaoPrograma = (r.tamanho || []).find(s => s.nome === 'programa');
    ok(secaoPrograma && secaoPrograma.usado > 0 && secaoPrograma.max > 0,
        'tamanho do binário reportado: ' + JSON.stringify(r.tamanho));
    ok(fs.existsSync(path.join(r.buildPath, 'teste_pipeline.ino.hex')) ||
        fs.readdirSync(r.buildPath).some(f => /\.hex$|\.bin$/.test(f)),
        'binário gerado no build path');

    console.log('\n— erro do compilador vira bloco culpado');
    const ws2 = novoWorkspace(Bk, [
        { t: 'ard_setup', s: { BODY: [] } },
        {
            t: 'ard_loop', s: {
                BODY: [
                    { t: 'ard_delay', v: { MS: N(10) } },
                    // Chamada a uma função que não existe: erro de compilação de verdade
                    { t: 'ard_call', f: { NOME: 'funcaoInexistente' }, v: { ARG0: N(1) } },
                    { t: 'ard_delay', v: { MS: N(10) } }
                ]
            }
        }
    ]);
    const codigo2 = Gen.workspaceToCode(ws2);
    const mapa2 = Object.assign({}, Gen.mapaLinhas);

    const r2 = await cli.compilar({ nome: 'teste_erro', codigo: codigo2, fqbn: 'arduino:avr:uno' });
    ok(!r2.ok, 'programa com função inexistente falha a compilação');

    const erros = (r2.problemas || []).filter(p => p.nivel === 'erro' && p.noSketch);
    ok(erros.length > 0, 'erro foi extraído da saída do compilador',
        JSON.stringify((r2.problemas || []).slice(0, 3)));

    if (erros.length) {
        const id = mapa2[erros[0].linha];
        const bloco = id && ws2.getBlockById(id);
        ok(!!bloco, 'a linha do erro (' + erros[0].linha + ') está no mapa de blocos');
        ok(bloco && bloco.type === 'ard_call',
            'o bloco apontado é justamente a chamada errada (' + (bloco && bloco.type) + ')');
    } else {
        falhou += 2;
        falhas.push('sem erros extraídos, não deu para checar o mapeamento');
    }

    console.log('\n— portas seriais');
    const portas = await cli.listarPortas();
    console.log('   · ' + (portas.length ? portas.map(p => p.porta + (p.placaDetectada ? ' (' + p.placaDetectada + ')' : '')).join(', ')
        : 'nenhuma placa conectada — normal se não houver hardware plugado'));
    ok(Array.isArray(portas), 'listagem de portas responde sem erro');

    fs.rmSync(dirUsuario, { recursive: true, force: true });

    console.log('\n----------------------------------------');
    console.log('passou: ' + passou + '   falhou: ' + falhou);
    if (falhas.length) {
        console.log('\nFalhas:');
        falhas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    }
    console.log('----------------------------------------\n');
    process.exit(falhou ? 1 : 0);
}

main().catch(e => {
    console.error('\n✗ ' + e.stack);
    process.exit(1);
});
