'use strict';
/**
 * Toolbox montada em tempo de execução, filtrada pela placa ativa.
 *
 * Não é XML estático: categorias e blocos que não existem na placa
 * selecionada simplesmente não aparecem (ESP no Uno, ledcWrite fora do ESP32,
 * SoftwareSerial no ESP32, analogReference fora do AVR).
 */
(function (global) {

    const Boards = global.Boards;

    function b(type, extra) {
        return Object.assign({ kind: 'block', type: type }, extra || {});
    }

    // Atalhos para blocos-sombra (valor padrão que já vem preenchido na entrada)
    function num(valor) {
        return { shadow: { type: 'ard_number', fields: { NUM: valor } } };
    }
    function txt(valor) {
        return { shadow: { type: 'ard_text', fields: { TEXTO: valor } } };
    }
    function konst(valor) {
        return { shadow: { type: 'ard_const', fields: { CONST: valor } } };
    }

    const Toolbox = {

        /** 'literal' (padrão) ou 'abstrato'. */
        modo: 'literal',

        construir(modo) {
            if (modo) this.modo = modo;
            if (this.modo === 'abstrato') return this.construirAbstrato();
            const placa = Boards.atual();
            const tem = r => (placa.recursos || []).indexOf(r) !== -1;
            const temLib = l => (placa.libs || []).indexOf(l) !== -1;
            const cats = [];

            cats.push({
                kind: 'category', name: 'Estrutura', colour: '260', contents: [
                    b('ard_setup'),
                    b('ard_loop'),
                    b('ard_include'),
                    b('ard_define'),
                    b('ard_comment'),
                    b('ard_function_def'),
                    b('ard_return'),
                    b('ard_call'),
                    b('ard_call_value')
                ]
            });

            cats.push({
                kind: 'category', name: 'E/S digital', colour: '20', contents: [
                    b('ard_pinmode'),
                    b('ard_digitalwrite', { inputs: { VALOR: konst('HIGH') } }),
                    b('ard_digitalread')
                ]
            });

            const analog = [
                b('ard_analogread'),
                b('ard_analogwrite', { inputs: { VALOR: num(128) } })
            ];
            if (tem('analogReference')) analog.push(b('ard_analogreference'));
            if (tem('analogReadResolution')) analog.push(b('ard_analogreadresolution', { inputs: { BITS: num(12) } }));
            cats.push({ kind: 'category', name: 'E/S analógica', colour: '45', contents: analog });

            const avancado = [];
            if (tem('tone')) {
                avancado.push(b('ard_tone', { inputs: { FREQ: num(440) } }));
                avancado.push(b('ard_tone_dur', { inputs: { FREQ: num(440), DUR: num(500) } }));
                avancado.push(b('ard_notone'));
            }
            if (tem('pulseIn')) {
                avancado.push(b('ard_pulsein'));
                avancado.push(b('ard_pulsein_timeout', { inputs: { TIMEOUT: num(1000000) } }));
            }
            if (tem('shift')) {
                avancado.push(b('ard_shiftout', { inputs: { VALOR: num(255) } }));
                avancado.push(b('ard_shiftin'));
            }
            if (avancado.length) {
                cats.push({ kind: 'category', name: 'E/S avançada', colour: '75', contents: avancado });
            }

            cats.push({
                kind: 'category', name: 'Tempo', colour: '120', contents: [
                    b('ard_delay', { inputs: { MS: num(1000) } }),
                    b('ard_delaymicroseconds', { inputs: { US: num(1000) } }),
                    b('ard_millis'),
                    b('ard_micros')
                ]
            });

            cats.push({
                kind: 'category', name: 'Serial', colour: '195', contents: [
                    b('ard_serial_begin'),
                    b('ard_serial_print', { inputs: { VALOR: txt('valor: ') } }),
                    b('ard_serial_println', { inputs: { VALOR: txt('olá') } }),
                    b('ard_serial_print_format', { inputs: { VALOR: num(255) } }),
                    b('ard_serial_write', { inputs: { VALOR: num(65) } }),
                    b('ard_serial_available'),
                    b('ard_serial_read'),
                    b('ard_serial_readstringuntil'),
                    b('ard_serial_parseint'),
                    b('ard_serial_flush'),
                    b('ard_serial_end')
                ]
            });

            cats.push({
                kind: 'category', name: 'Controle', colour: '210', contents: [
                    b('controls_if'),
                    b('ard_for', { inputs: { INICIO: num(0), LIMITE: num(10), PASSO: num(1) } }),
                    b('ard_while'),
                    b('ard_do_while'),
                    b('ard_switch'),
                    b('ard_case'),
                    b('ard_default'),
                    b('ard_break'),
                    b('ard_continue')
                ]
            });

            cats.push({
                kind: 'category', name: 'Operadores', colour: '230', contents: [
                    b('logic_compare'),
                    b('logic_operation'),
                    b('logic_negate'),
                    b('logic_boolean'),
                    b('ard_arith', { inputs: { A: num(1), B: num(1) } }),
                    b('ard_compound_assign', { inputs: { VALOR: num(1) } }),
                    b('ard_incdec'),
                    b('ard_bitwise', { inputs: { A: num(1), B: num(1) } }),
                    b('ard_bitnot', { inputs: { A: num(0) } }),
                    b('ard_bitread', { inputs: { VALOR: num(0), BIT: num(0) } }),
                    b('ard_bitwrite', { inputs: { BIT: num(0), ESTADO: num(1) } }),
                    b('ard_bitsetclear', { inputs: { BIT: num(0) } }),
                    b('ard_bit', { inputs: { N: num(0) } })
                ]
            });

            cats.push({
                kind: 'category', name: 'Matemática', colour: '250', contents: [
                    b('ard_map', {
                        inputs: {
                            VALOR: num(0), DE_MIN: num(0), DE_MAX: num(1023),
                            PARA_MIN: num(0), PARA_MAX: num(255)
                        }
                    }),
                    b('ard_constrain', { inputs: { VALOR: num(0), MIN: num(0), MAX: num(255) } }),
                    b('ard_minmax', { inputs: { A: num(0), B: num(0) } }),
                    b('ard_math_single', { inputs: { A: num(0) } }),
                    b('ard_pow', { inputs: { BASE: num(2), EXPO: num(3) } }),
                    b('ard_random', { inputs: { MIN: num(0), MAX: num(100) } }),
                    b('ard_random_max', { inputs: { MAX: num(100) } }),
                    b('ard_randomseed')
                ]
            });

            cats.push({
                kind: 'category', name: 'Variáveis', colour: '330', custom: 'VARIABLE'
            });

            cats.push({
                kind: 'category', name: 'Tipos e valores', colour: '340', contents: [
                    b('ard_var_declare', { inputs: { VALOR: num(0) } }),
                    b('ard_var_global', { inputs: { VALOR: num(0) } }),
                    b('ard_array_declare'),
                    b('ard_array_get', { inputs: { INDICE: num(0) } }),
                    b('ard_array_set', { inputs: { INDICE: num(0), VALOR: num(0) } }),
                    b('ard_cast', { inputs: { VALOR: num(0) } }),
                    b('ard_const'),
                    b('ard_number'),
                    b('ard_text'),
                    b('ard_char')
                ]
            });

            cats.push({
                kind: 'category', name: 'Interrupções', colour: '0', contents: [
                    b('ard_attachinterrupt'),
                    b('ard_detachinterrupt'),
                    b('ard_interrupts')
                ]
            });

            const libs = [];
            if (temLib('Servo')) {
                libs.push(
                    b('ard_servo_attach'),
                    b('ard_servo_write', { inputs: { ANGULO: num(90) } }),
                    b('ard_servo_writemicroseconds', { inputs: { US: num(1500) } }),
                    b('ard_servo_read'),
                    b('ard_servo_detach')
                );
            }
            if (temLib('Wire')) {
                libs.push(
                    b('ard_wire_begin'),
                    b('ard_wire_begintransmission', { inputs: { ENDERECO: num(0x27) } }),
                    b('ard_wire_write', { inputs: { VALOR: num(0) } }),
                    b('ard_wire_endtransmission'),
                    b('ard_wire_requestfrom', { inputs: { ENDERECO: num(0x27), QTD: num(1) } }),
                    b('ard_wire_available'),
                    b('ard_wire_read')
                );
            }
            if (temLib('SPI')) {
                libs.push(b('ard_spi_begin'), b('ard_spi_transfer', { inputs: { VALOR: num(0) } }));
            }
            if (temLib('EEPROM')) {
                if (tem('eepromEmulada')) libs.push(b('ard_eeprom_begin', { inputs: { TAMANHO: num(512) } }));
                libs.push(
                    b('ard_eeprom_read', { inputs: { ENDERECO: num(0) } }),
                    b('ard_eeprom_write', { inputs: { ENDERECO: num(0), VALOR: num(0) } })
                );
                if (tem('eepromEmulada')) libs.push(b('ard_eeprom_commit'));
            }
            if (temLib('LiquidCrystal_I2C')) {
                libs.push(
                    b('ard_lcd_init'),
                    b('ard_lcd_backlight'),
                    b('ard_lcd_setcursor', { inputs: { COL: num(0), LIN: num(0) } }),
                    b('ard_lcd_print', { inputs: { VALOR: txt('olá') } }),
                    b('ard_lcd_clear')
                );
            }
            if (temLib('SoftwareSerial')) {
                libs.push(
                    b('ard_softserial_begin'),
                    b('ard_softserial_println', { inputs: { VALOR: txt('olá') } }),
                    b('ard_softserial_available'),
                    b('ard_softserial_read')
                );
            }
            if (temLib('DHT')) {
                libs.push(b('ard_dht_begin'), b('ard_dht_read'));
            }
            if (libs.length) {
                cats.push({ kind: 'category', name: 'Bibliotecas', colour: '160', contents: libs });
            }

            if (tem('wifi') || tem('esp')) {
                const esp = [];
                if (tem('wifi')) {
                    esp.push(
                        b('ard_wifi_begin'),
                        b('ard_wifi_status'),
                        b('ard_wifi_localip'),
                        b('ard_wifi_rssi'),
                        b('ard_wifi_disconnect')
                    );
                }
                if (tem('esp')) {
                    esp.push(
                        b('ard_esp_restart'),
                        b('ard_esp_deepsleep', { inputs: { US: num(1000000) } }),
                        b('ard_esp_freeheap')
                    );
                }
                if (tem('ledc')) {
                    esp.push(
                        b('ard_ledc_attach', { inputs: { FREQ: num(5000), RES: num(8) } }),
                        b('ard_ledc_write', { inputs: { DUTY: num(128) } }),
                        b('ard_ledc_detach')
                    );
                }
                cats.push({ kind: 'category', name: 'ESP / WiFi', colour: '100', contents: esp });
            }

            // LPA2v é software puro: roda igual em qualquer placa, sem filtro.
            cats.push({
                kind: 'category', name: 'Lógica Paraconsistente', colour: '290', contents: [
                    b('lp_evidencia', { inputs: { X: num(0), A1: num(0), A2: num(1023) } }),
                    b('lp_complemento', { inputs: { MU: num(0.5) } }),
                    b('lp_grau', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                    b('lp_estado', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                    b('lp_estado_nome'),
                    b('lp_indefinicao', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                    b('lp_nap', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                    b('lp_para_analisador', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                    b('lp_para_analisador_simples', {
                        inputs: { S1: num(0), S2: num(0), A1: num(0), A2: num(1023) }
                    }),
                    b('lp_caso'),
                    b('lp_senao'),
                    b('lp_conectivo', { inputs: { A: num(0.5), B: num(0.5) } }),
                    b('lp_extractor', { inputs: { N: num(4) } })
                ]
            });

            cats.push({
                kind: 'category', name: 'Código livre', colour: '45', contents: [
                    b('ard_raw_stmt'),
                    b('ard_raw_expr')
                ]
            });

            return { kind: 'categoryToolbox', contents: cats };
        },

        /**
         * Toolbox do Modo Abstrato: blocos simplificados, só com parâmetros.
         * O filtro por placa continua valendo — servo e ultrassom dependem da
         * biblioteca e dos pinos, como no Modo Literal.
         */
        construirAbstrato() {
            const placa = Boards.atual();
            const tem = r => (placa.recursos || []).indexOf(r) !== -1;
            const temLib = l => (placa.libs || []).indexOf(l) !== -1;
            const cats = [];

            cats.push({
                kind: 'category', name: 'Começo', colour: '260', contents: [
                    b('abs_ao_iniciar'),
                    b('abs_sempre')
                ]
            });

            cats.push({
                kind: 'category', name: 'Tarefas', colour: '160', contents: [
                    b('abs_tarefa'),
                    b('abs_fazer_tarefa')
                ]
            });

            const io = [
                b('abs_escrita_digital'),
                b('abs_leitura_digital'),
                b('abs_botao'),
                b('abs_escrita_analogica', { inputs: { PCT: num(50) } }),
                b('abs_leitura_analogica'),
                b('abs_distancia')
            ];
            if (temLib('Servo')) io.push(b('abs_servo', { inputs: { ANGULO: num(90) } }));
            if (tem('tone')) io.push(b('abs_nota', { inputs: { FREQ: num(440), DUR: num(200) } }));
            io.push(b('abs_motores_pinos'));
            io.push(b('abs_motores', { inputs: { VEL: num(30) } }));
            cats.push({ kind: 'category', name: 'Sensores e atuadores', colour: '20', contents: io });

            cats.push({
                kind: 'category', name: 'Tempo', colour: '120', contents: [
                    b('abs_esperar', { inputs: { QTD: num(1) } }),
                    b('abs_tempo_ligado')
                ]
            });

            cats.push({
                kind: 'category', name: 'Mostrar', colour: '195', contents: [
                    b('abs_mostrar', { inputs: { VALOR: num(0) } }),
                    b('abs_mostrar_grafico', { inputs: { VALOR: num(0) } }),
                    b('abs_mostrar_reticulado', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } })
                ]
            });

            // A página é servida pela própria placa: só existe onde há rádio.
            if (tem('wifi')) {
                cats.push({
                    kind: 'category', name: 'Página web', colour: '100', contents: [
                        b('abs_wifi_rede_aberta'),
                        b('abs_wifi_entrar'),
                        b('abs_wifi_ip_fixo'),
                        b('abs_web_servidor'),
                        b('abs_web_botao'),
                        b('abs_web_mostrar', { inputs: { VALOR: num(0) } }),
                        b('abs_web_reticulado', { inputs: { MU: num(0.5), LAMBDA: num(0.5) } }),
                        b('abs_web_atender'),
                        b('abs_web_esperar', { inputs: { MS: num(100) } })
                    ].concat(tem('camera') ? [
                        b('abs_camera_ligar'),
                        b('abs_web_camera_mostrar'),
                        b('abs_web_camera_esconder')
                    ] : [])
                });
            }

            cats.push({
                kind: 'category', name: 'Decidir e repetir', colour: '210', contents: [
                    b('abs_se'),
                    b('abs_se_senao'),
                    b('abs_repetir', { inputs: { VEZES: num(10) } }),
                    b('abs_enquanto')
                ]
            });

            cats.push({
                kind: 'category', name: 'Contas e comparações', colour: '230', contents: [
                    b('abs_comparar', { inputs: { A: num(0), B: num(0) } }),
                    b('abs_logico'),
                    b('abs_conta', { inputs: { A: num(1), B: num(1) } }),
                    b('abs_mapear', {
                        inputs: {
                            VALOR: num(0), DE_MIN: num(0), DE_MAX: num(1023),
                            PARA_MIN: num(0), PARA_MAX: num(100)
                        }
                    }),
                    b('abs_sorteio', { inputs: { MIN: num(0), MAX: num(100) } })
                ]
            });

            cats.push({
                kind: 'category', name: 'Guardar valores', colour: '330', contents: [
                    // O Modo Literal usa a categoria dinâmica do Blockly
                    // (custom: 'VARIABLE'), que já traz o botão de criar. Aqui a
                    // lista é estática, para oferecer os blocos "caixa" em vez dos
                    // variables_* padrão — e sem este botão o aluno ficava preso à
                    // única variável que o campo cria sozinho.
                    { kind: 'button', text: 'Criar caixa…', callbackKey: 'ABS_CRIAR_CAIXA' },
                    b('abs_criar', { inputs: { VALOR: num(0) } }),
                    b('abs_definir', { inputs: { VALOR: num(0) } }),
                    b('abs_ler')
                ]
            });

            cats.push({
                kind: 'category', name: 'Lógica Paraconsistente', colour: '290', contents: [
                    b('abs_evidencia', { inputs: { X: num(0), A1: num(0), A2: num(1023) } }),
                    b('abs_quando_estado', { inputs: { MU1: num(0.5), MU2: num(0.5) } }),
                    b('abs_caso_estado'),
                    b('abs_senao_estado'),
                    b('abs_grau', { inputs: { MU1: num(0.5), MU2: num(0.5) } }),
                    b('abs_contradicao', { inputs: { MU1: num(0.5), MU2: num(0.5) } }),
                    b('abs_combinar', { inputs: { A: num(0.5), B: num(0.5) } })
                ]
            });

            return { kind: 'categoryToolbox', contents: cats };
        },

        /** Todos os tipos de bloco oferecidos pela placa ativa (para os testes). */
        tiposOferecidos() {
            const tipos = new Set();
            const varrer = lista => (lista || []).forEach(item => {
                if (item.kind === 'block' && item.type) tipos.add(item.type);
                if (item.contents) varrer(item.contents);
            });
            varrer(this.construir().contents);
            return Array.from(tipos);
        }
    };

    global.Toolbox = Toolbox;
    if (typeof module !== 'undefined' && module.exports) module.exports = Toolbox;

})(typeof window !== 'undefined' ? window : global);
