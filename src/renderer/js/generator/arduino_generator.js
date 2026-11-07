'use strict';
/**
 * Gerador Arduino — subclasse de Blockly.Generator.
 *
 * Diferente de um walker manual, aqui o aninhamento, a precedência e as
 * variáveis saem do próprio mecanismo do Blockly. O que este arquivo acrescenta:
 *
 *  - a tabela ORDER_* com a precedência real do C++;
 *  - um repositório de definições (includes, defines, globais, instâncias de
 *    biblioteca, protótipos) que qualquer bloco pode alimentar de onde estiver;
 *  - finish(), que monta o .ino na ordem canônica;
 *  - um mapa linha → bloco, para ligar erro do compilador ao bloco culpado.
 *
 * No Modo Literal nada é injetado por conta própria: se o aluno não colocou
 * Serial.begin(), ele não aparece no código. No Modo Abstrato a regra continua
 * valendo, só que quem pede é o bloco em vez do aluno — é para isso que existe
 * usarSetup().
 */
(function (global) {

    const Blockly = global.Blockly;
    if (!Blockly) return;

    const Arduino = new Blockly.Generator('Arduino');

    Arduino.INDENT = '  ';

    /* Precedência do C++ — do mais forte para o mais fraco. */
    Arduino.ORDER_ATOMIC = 0;          // literais, nomes, (expr)
    Arduino.ORDER_UNARY_POSTFIX = 1;   // expr++  expr--  ()  []  .
    Arduino.ORDER_UNARY_PREFIX = 2;    // ! ~ ++expr --expr +expr -expr (tipo)
    Arduino.ORDER_MULTIPLICATIVE = 3;  // * / %
    Arduino.ORDER_ADDITIVE = 4;        // + -
    Arduino.ORDER_SHIFT = 5;           // << >>
    Arduino.ORDER_RELATIONAL = 6;      // < <= > >=
    Arduino.ORDER_EQUALITY = 7;        // == !=
    Arduino.ORDER_BITWISE_AND = 8;     // &
    Arduino.ORDER_BITWISE_XOR = 9;     // ^
    Arduino.ORDER_BITWISE_OR = 10;     // |
    Arduino.ORDER_LOGICAL_AND = 11;    // &&
    Arduino.ORDER_LOGICAL_OR = 12;     // ||
    Arduino.ORDER_CONDITIONAL = 13;    // ?:
    Arduino.ORDER_ASSIGNMENT = 14;     // = += -= ...
    Arduino.ORDER_COMMA = 15;          // ,
    Arduino.ORDER_NONE = 99;

    Arduino.addReservedWords(
        'setup,loop,if,else,for,while,do,switch,case,default,break,continue,return,goto,' +
        'int,long,short,char,float,double,void,bool,boolean,byte,word,String,unsigned,signed,' +
        'const,static,volatile,struct,class,public,private,protected,new,delete,this,sizeof,' +
        'true,false,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,LED_BUILTIN,' +
        'pinMode,digitalWrite,digitalRead,analogRead,analogWrite,delay,delayMicroseconds,' +
        'millis,micros,tone,noTone,pulseIn,shiftIn,shiftOut,map,constrain,min,max,abs,' +
        'random,randomSeed,Serial,Serial1,Serial2,Serial3,Wire,SPI,EEPROM,WiFi,ESP'
    );

    /**
     * Marcador temporário que carrega a identidade do bloco até o pós-processamento.
     * Guarda um índice, não o id: id do Blockly pode conter @, * e / e estragaria
     * o delimitador.
     */
    const MARCA = /\/\*@blk:(\d+)@\*\//;
    const MARCA_G = /\/\*@blk:(\d+)@\*\//g;

    /* ------------------------------------------------------------------ */
    /* Repositório de definições                                           */
    /* ------------------------------------------------------------------ */

    /** #include <lib> — emitido uma vez, mesmo que 20 blocos peçam. */
    Arduino.usarInclude = function (lib) {
        this.includes_.set(lib, '#include <' + lib + '>');
    };

    Arduino.usarDefine = function (nome, valor) {
        this.defines_.set(nome, '#define ' + nome + ' ' + valor);
    };

    /**
     * Declaração global (variável ou instância de biblioteca).
     * A chave evita duplicata; o primeiro a declarar vence, então o bloco
     * "init" de uma biblioteca sempre deve declarar antes do uso comum.
     */
    Arduino.usarGlobal = function (chave, codigo, forcar) {
        if (forcar || !this.globais_.has(chave)) this.globais_.set(chave, codigo);
    };

    Arduino.temGlobal = function (chave) {
        return this.globais_.has(chave);
    };

    Arduino.usarPrototipo = function (nome, codigo) {
        this.prototipos_.set(nome, codigo);
    };

    /**
     * Linha que entra no início de void setup(), venha o pedido de onde vier.
     *
     * É o que permite um bloco do Modo Abstrato dentro do "Sempre" declarar o
     * pinMode que ele mesmo precisa: no Modo Literal quem escreve o pinMode é o
     * aluno, aqui é o bloco. A chave evita duplicata — dez blocos mexendo no
     * pino 13 declaram uma vez só — e a ordem de inserção é preservada, porque
     * declaração tem de vir antes do uso.
     */
    Arduino.usarSetup = function (chave, codigo) {
        if (!this.setup_.has(chave)) this.setup_.set(chave, codigo);
    };

    Arduino.temNoSetup = function (chave) {
        return this.setup_.has(chave);
    };

    Arduino.aviso = function (mensagem, blockId) {
        if (global.I18N) mensagem = global.I18N.t(mensagem);
        this.avisos_.push({ mensagem: mensagem, blockId: blockId || null });
    };

    /** Identificador C seguro a partir do campo de variável do bloco. */
    Arduino.nomeVar = function (block, campo) {
        campo = campo || 'VAR';
        const id = block.getFieldValue(campo);
        try {
            return this.getVariableName(id);
        } catch (e) {
            return String(id || 'variavel').replace(/[^A-Za-z0-9_]/g, '_');
        }
    };

    /** Identificador C seguro a partir de um campo de texto (objetos, funções). */
    Arduino.identificador = function (texto, padrao) {
        let s = String(texto == null ? '' : texto).trim();
        s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
        s = s.replace(/[^A-Za-z0-9_]/g, '_');
        if (!s) s = padrao || 'obj';
        if (/^[0-9]/.test(s)) s = '_' + s;
        return s;
    };

    /* ------------------------------------------------------------------ */
    /* Ciclo de geração                                                    */
    /* ------------------------------------------------------------------ */

    Arduino.init = function (workspace) {
        this.includes_ = new Map();
        this.defines_ = new Map();
        this.globais_ = new Map();
        this.prototipos_ = new Map();
        this.setup_ = new Map();
        this.funcoes_ = [];
        this.corpoSetup_ = null;
        this.corpoLoop_ = null;
        this.temSetup_ = false;
        this.temLoop_ = false;
        this.avisos_ = [];
        this.mapaLinhas = {};
        this.blocosMarcados_ = [];
        this.objetosDeclarados_ = new Set();
        this.varsDeclaradas_ = new Set();
        this.varsUsadas_ = new Map();
        this.absMotores_ = null;
        this.tarefasGeradas_ = new Set();

        if (!this.nameDB_) {
            this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
        } else {
            this.nameDB_.reset();
        }
        if (workspace) {
            this.nameDB_.setVariableMap(workspace.getVariableMap());
            this.nameDB_.populateVariables(workspace);
            this.nameDB_.populateProcedures(workspace);
        }
    };

    /**
     * Monta o arquivo final. O `code` que chega é o texto solto dos blocos de
     * topo — só interessa para descobrir que existem blocos fora de setup/loop.
     */
    Arduino.finish = function (code) {
        const solto = (code || '').replace(MARCA_G, '').trim();
        if (solto) {
            this.aviso('Há blocos fora de void setup() e void loop() — eles não entram no programa.');
        }

        const partes = [];

        if (this.includes_.size) {
            partes.push(Array.from(this.includes_.values()).sort().join('\n'));
        }
        if (this.defines_.size) {
            partes.push(Array.from(this.defines_.values()).join('\n'));
        }
        if (this.globais_.size) {
            partes.push(Array.from(this.globais_.values()).join('\n'));
        }
        if (this.prototipos_.size) {
            partes.push(Array.from(this.prototipos_.values()).join('\n'));
        }
        if (this.funcoes_.length) {
            partes.push(this.funcoes_.join('\n\n'));
        }

        // O que os blocos pediram vem antes do que o aluno escreveu: pinMode
        // precisa estar de pé antes da primeira leitura ou escrita.
        //
        // Antes disso, tira da injeção o que o aluno já escreveu com as próprias
        // mãos. É o que mantém o C++ igual ao converter entre os modos: se o
        // programa literal já tinha pinMode(13, OUTPUT), o bloco abstrato que
        // pediria a mesma linha não a duplica nem a desloca de lugar.
        // As linhas do corpo vêm com o marcador de bloco na frente; sem tirá-lo
        // a comparação nunca casaria.
        const jaEscritas = new Set(
            String(this.corpoSetup_ || '').replace(MARCA_G, '')
                .split('\n').map(l => l.trim()).filter(Boolean)
        );
        const pedidas = Array.from(this.setup_.values()).filter(l => !jaEscritas.has(l.trim()));
        const injetado = pedidas.length
            ? pedidas.map(l => this.INDENT + l).join('\n') + '\n'
            : '';
        partes.push('void setup() {\n' + injetado + (this.corpoSetup_ || '') + '}');
        partes.push('void loop() {\n' + (this.corpoLoop_ || '') + '}');

        if (!this.temSetup_) this.aviso('Falta o bloco void setup().');
        if (!this.temLoop_) this.aviso('Falta o bloco void loop().');

        // Em C nada existe sem declaração: acusa variável usada e nunca declarada.
        this.varsUsadas_.forEach((blockId, nome) => {
            if (!this.varsDeclaradas_.has(nome)) {
                this.aviso('A variável "' + nome + '" é usada mas nunca foi declarada.', blockId);
            }
        });

        const fonte = partes.join('\n\n') + '\n';
        const pronto = this.extrairMarcas_(fonte);
        // Em inglês, o que a placa mostra na página e no Monitor serial também
        // sai em inglês. A troca é dentro das linhas, então o mapa de linhas vale.
        return global.I18N ? global.I18N.codigo(pronto) : pronto;
    };

    /**
     * Tira os marcadores do texto e devolve o código limpo, guardando
     * mapaLinhas[linha] = blockId. É isso que liga "sketch.ino:23: error" ao bloco.
     */
    Arduino.extrairMarcas_ = function (fonte) {
        const linhas = fonte.split('\n');
        const mapa = {};
        for (let i = 0; i < linhas.length; i++) {
            const m = linhas[i].match(MARCA);
            if (m) {
                mapa[i + 1] = this.blocosMarcados_[Number(m[1])];
                linhas[i] = linhas[i].replace(MARCA_G, '');
            }
            // linha que ficou só com espaços por causa da marca vira vazia
            if (/^\s+$/.test(linhas[i])) linhas[i] = '';
        }
        this.mapaLinhas = mapa;
        return linhas.join('\n');
    };

    /**
     * Encadeia o próximo bloco e marca a linha inicial deste bloco.
     * Blocos de valor passam direto — eles são expressões, não linhas.
     */
    Arduino.scrub_ = function (block, code, thisOnly) {
        if (block.outputConnection) return code;

        let comentario = '';
        const c = block.getCommentText && block.getCommentText();
        if (c) {
            comentario = this.prefixLines(c.replace(/\n$/, ''), '// ') + '\n';
        }

        let marcado = code;
        if (code) {
            const indice = this.blocosMarcados_.length;
            this.blocosMarcados_.push(block.id);
            marcado = '/*@blk:' + indice + '@*/' + comentario + code;
        }

        const proximo = block.nextConnection && block.nextConnection.targetBlock();
        const codigoProximo = thisOnly ? '' : this.blockToCode(proximo);
        return marcado + codigoProximo;
    };

    /** Valor solto (sem statement) — em C não faz sentido; vira comentário. */
    Arduino.scrubNakedValue = function (linha) {
        return '// valor sem uso: ' + linha + '\n';
    };

    /* ------------------------------------------------------------------ */
    /* Utilidades usadas pelos forBlock                                    */
    /* ------------------------------------------------------------------ */

    /** valueToCode com um padrão explícito quando a entrada está vazia. */
    Arduino.valorOu = function (block, nome, ordem, padrao) {
        const v = this.valueToCode(block, nome, ordem);
        if (v === '' || v == null) {
            if (padrao === null) {
                this.aviso('Entrada "' + nome + '" vazia em ' + block.type, block.id);
                return '0';
            }
            return padrao;
        }
        return v;
    };

    global.ArduinoGen = Arduino;
    if (typeof module !== 'undefined' && module.exports) module.exports = Arduino;

})(typeof window !== 'undefined' ? window : global);
