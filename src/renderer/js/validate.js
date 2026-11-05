'use strict';
/**
 * Revalidação do workspace contra a placa selecionada.
 *
 * Trocar de placa não apaga nada do programa: o que muda é a coerência.
 * Um pino 9 continua escrito no bloco, mas se a placa não tiver o 9, o bloco
 * ganha aviso e a compilação é barrada antes de gastar tempo com o compilador.
 */
(function (global) {

    const TIPO_POR_CAMPO = {
        field_pin_digital: 'digital',
        field_pin_digital_in: 'digitalIn',
        field_pin_analog: 'analog',
        field_pin_pwm: 'pwm',
        field_pin_interrupt: 'interrupt'
    };

    const ROTULO = {
        digital: 'saída digital',
        digitalIn: 'entrada digital',
        analog: 'entrada analógica',
        pwm: 'PWM',
        interrupt: 'interrupção'
    };

    // Blocos que só existem em placas com determinado recurso/biblioteca.
    const EXIGE_RECURSO = {
        ard_analogreference: 'analogReference',
        ard_analogreadresolution: 'analogReadResolution',
        ard_ledc_attach: 'ledc',
        ard_ledc_write: 'ledc',
        ard_ledc_detach: 'ledc',
        ard_tone: 'tone',
        ard_tone_dur: 'tone',
        ard_notone: 'tone',
        ard_wifi_begin: 'wifi',
        ard_wifi_status: 'wifi',
        ard_wifi_localip: 'wifi',
        ard_wifi_rssi: 'wifi',
        ard_wifi_disconnect: 'wifi',
        ard_esp_restart: 'esp',
        ard_esp_deepsleep: 'esp',
        ard_esp_freeheap: 'esp',
        abs_camera_ligar: 'camera',
        abs_web_camera_mostrar: 'camera',
        abs_web_camera_esconder: 'camera'
    };

    const EXIGE_LIB = {
        ard_servo_attach: 'Servo', ard_servo_write: 'Servo',
        ard_servo_writemicroseconds: 'Servo', ard_servo_read: 'Servo', ard_servo_detach: 'Servo',
        ard_softserial_begin: 'SoftwareSerial', ard_softserial_println: 'SoftwareSerial',
        ard_softserial_available: 'SoftwareSerial', ard_softserial_read: 'SoftwareSerial',
        ard_lcd_init: 'LiquidCrystal_I2C', ard_lcd_backlight: 'LiquidCrystal_I2C',
        ard_lcd_setcursor: 'LiquidCrystal_I2C', ard_lcd_print: 'LiquidCrystal_I2C',
        ard_lcd_clear: 'LiquidCrystal_I2C',
        ard_dht_begin: 'DHT', ard_dht_read: 'DHT'
    };

    // Estados extremos do reticulado — os únicos que sobrevivem na resolução 4.
    const EXTREMOS = ['LPA_V', 'LPA_F', 'LPA_T', 'LPA_PC'];

    // Valores crus que os dois modos usam igual: número, texto, constante e
    // caractere não são "blocos do Modo Literal", são as peças de que todo bloco
    // é feito. Avisar sobre eles encheria a tela de alertas inúteis.
    const PRIMITIVOS = ['ard_number', 'ard_text', 'ard_const', 'ard_char'];

    const Validate = {

        /**
         * Percorre o workspace e devolve os problemas encontrados.
         * Também escreve o aviso no próprio bloco, quando ele é renderizado.
         */
        revalidar(workspace) {
            const Boards = global.Boards;
            const placa = Boards.atual();
            const problemas = [];

            // No ESP32 o ADC2 para de funcionar com o WiFi ligado — é o clássico
            // "analogRead virou zero" que ninguém descobre sozinho.
            const usaWifi = placa.id === 'esp32' &&
                workspace.getAllBlocks(false).some(b => b.type.indexOf('ard_wifi_') === 0);
            const ADC2_ESP32 = ['0', '2', '4', '12', '13', '14', '15', '25', '26', '27'];

            workspace.getAllBlocks(false).forEach(bloco => {
                const msgs = [];

                // 1) pinos
                (bloco.inputList || []).forEach(input => {
                    (input.fieldRow || []).forEach(campo => {
                        const tipo = campo.tipoPino;
                        if (!tipo) return;
                        const valor = campo.getValue();
                        if (!Boards.pinoValido(tipo, valor)) {
                            msgs.push('O pino ' + valor + ' não serve como ' +
                                (ROTULO[tipo] || tipo) + ' na ' + placa.nome + '.');
                        }
                    });
                    // porta serial
                    (input.fieldRow || []).forEach(campo => {
                        if (campo.portaSerial && campo.getValue) {
                            const p = campo.getValue();
                            if (placa.seriais.indexOf(p) === -1) {
                                msgs.push('A ' + placa.nome + ' não tem ' + p + '.');
                            }
                        }
                    });
                });

                // 2) recursos do chip
                const rec = EXIGE_RECURSO[bloco.type];
                if (rec && !Boards.tem(rec)) {
                    msgs.push('Este comando não existe na ' + placa.nome + '.');
                }

                // 3) bibliotecas
                const lib = EXIGE_LIB[bloco.type];
                if (lib && !Boards.temLib(lib)) {
                    msgs.push('A biblioteca ' + lib + ' não está disponível para a ' + placa.nome + '.');
                }

                // 4) EEPROM.update só existe no AVR; nas ESP a classe é emulada
                if (bloco.type === 'ard_eeprom_write' &&
                    bloco.getFieldValue('FUNC') === 'update' && !Boards.tem('eepromUpdate')) {
                    msgs.push('A ' + placa.nome + ' não tem EEPROM.update — use EEPROM.write ' +
                        'seguido de EEPROM.commit.');
                }
                if ((bloco.type === 'ard_eeprom_begin' || bloco.type === 'ard_eeprom_commit') &&
                    !Boards.tem('eepromEmulada')) {
                    msgs.push('Na ' + placa.nome + ' a EEPROM é real: não existe begin() nem commit().');
                }

                // 5) ADC2 + WiFi no ESP32
                if (usaWifi && bloco.type === 'ard_analogread') {
                    const pino = bloco.getFieldValue('PIN');
                    if (ADC2_ESP32.indexOf(String(pino)) !== -1) {
                        msgs.push('Com o WiFi ligado, o ESP32 não lê o pino ' + pino + ' (ADC2). ' +
                            'Use 32, 33, 34, 35, 36 ou 39.');
                    }
                }

                // 6) o corpo do switch só faz sentido com case/default.
                // O Blockly aceita qualquer bloco de pilha aqui (checagem de tipo
                // é permissiva quando um dos lados não declara tipo), então a
                // cobrança é nossa.
                if (bloco.type === 'ard_switch') {
                    const entrada = bloco.getInput('CASOS');
                    let filho = entrada && entrada.connection && entrada.connection.targetBlock();
                    while (filho) {
                        if (filho.type !== 'ard_case' && filho.type !== 'ard_default') {
                            msgs.push('Dentro do switch só entram blocos case e default — ' +
                                'o "' + filho.type + '" ali dentro nunca vai rodar.');
                        }
                        filho = filho.nextConnection && filho.nextConnection.targetBlock();
                    }
                }

                // 7) o Para-Analisador é um switch sobre os estados do reticulado:
                // só blocos de estado fazem sentido na pilha.
                if (bloco.type === 'lp_para_analisador' ||
                    bloco.type === 'lp_para_analisador_simples') {
                    const entrada = bloco.getInput('CASOS');
                    let filho = entrada && entrada.connection && entrada.connection.targetBlock();
                    const res = bloco.getFieldValue('RES');
                    while (filho) {
                        if (filho.type !== 'lp_caso' && filho.type !== 'lp_senao') {
                            msgs.push('Dentro do Para-Analisador só entram blocos de estado ' +
                                'e o "nos demais estados" — o "' + filho.type + '" ali dentro ' +
                                'nunca vai rodar.');
                        }
                        // Em 4 regiões o reticulado só produz os quatro vértices;
                        // um caso de estado não-extremo ficaria morto.
                        if (res === '4' && filho.type === 'lp_caso' &&
                            EXTREMOS.indexOf(filho.getFieldValue('ESTADO')) === -1) {
                            msgs.push('Em 4 regiões a análise só devolve V, F, T e ⊥. ' +
                                'O caso "' + filho.getFieldValue('ESTADO') + '" nunca vai rodar — ' +
                                'passe para 12 regiões ou troque o estado.');
                        }
                        filho = filho.nextConnection && filho.nextConnection.targetBlock();
                    }
                }

                // 8) bloco do outro modo: continua funcionando e gerando o mesmo
                // C++, mas não está na paleta — sem o aviso o aluno procuraria
                // um bloco que não existe ali.
                const modo = global.Toolbox ? global.Toolbox.modo : 'literal';
                if (modo === 'abstrato' && bloco.type.indexOf('ard_') === 0 &&
                    PRIMITIVOS.indexOf(bloco.type) === -1) {
                    const motivo = (global.Converter && global.Converter.SEM_ABSTRATO[bloco.type]) ||
                        'não há bloco simplificado equivalente';
                    msgs.push('Este é um bloco do Modo Literal: ' + motivo + '. ' +
                        'Ele funciona, mas não está na paleta do Modo Abstrato.');
                } else if (modo === 'literal' && bloco.type.indexOf('abs_') === 0) {
                    msgs.push('Este é um bloco do Modo Abstrato e não está na paleta ' +
                        'do Modo Literal. Troque o modo em Exibir → Modo para editá-lo.');
                }

                if (bloco.setWarningText) {
                    bloco.setWarningText(msgs.length ? msgs.join('\n') : null);
                }
                msgs.forEach(m => problemas.push({ blockId: bloco.id, tipo: bloco.type, mensagem: m }));
            });

            return problemas;
        },

        /** Limpa avisos de placa (usado antes de recolocar avisos do compilador). */
        limparAvisos(workspace) {
            workspace.getAllBlocks(false).forEach(b => {
                if (b.setWarningText) b.setWarningText(null);
            });
        }
    };

    global.Validate = Validate;
    if (typeof module !== 'undefined' && module.exports) module.exports = Validate;

})(typeof window !== 'undefined' ? window : global);
