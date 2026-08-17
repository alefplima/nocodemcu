'use strict';
/**
 * Categorias INTERRUPÇÕES, ESP (WiFi/ESP32/ESP8266) e CÓDIGO LIVRE.
 * As categorias ESP só aparecem na toolbox quando a placa selecionada as tem.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const INT = 0;
    const ESP = 100;
    const RAW = 45;

    Blockly.defineBlocksWithJsonArray([

        /* ---------- interrupções ---------- */
        {
            type: 'ard_attachinterrupt',
            message0: 'attachInterrupt ( digitalPinToInterrupt ( %1 ) , %2 , %3 )',
            args0: [
                { type: 'field_pin_interrupt', name: 'PIN' },
                { type: 'field_input', name: 'FUNC', text: 'minhaISR' },
                {
                    type: 'field_dropdown', name: 'MODO', options: [
                        ['RISING', 'RISING'], ['FALLING', 'FALLING'], ['CHANGE', 'CHANGE'],
                        ['LOW', 'LOW'], ['HIGH', 'HIGH']
                    ]
                }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: INT,
            tooltip: 'Chama a função quando o pino mudar. A função precisa existir (bloco de função).'
        },
        {
            type: 'ard_detachinterrupt',
            message0: 'detachInterrupt ( digitalPinToInterrupt ( %1 ) )',
            args0: [{ type: 'field_pin_interrupt', name: 'PIN' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: INT,
            tooltip: 'Desliga a interrupção do pino.'
        },
        {
            type: 'ard_interrupts',
            message0: '%1 ( )',
            args0: [{
                type: 'field_dropdown', name: 'FUNC', options: [
                    ['interrupts', 'interrupts'], ['noInterrupts', 'noInterrupts']
                ]
            }],
            previousStatement: null, nextStatement: null,
            colour: INT,
            tooltip: 'Habilita ou desabilita todas as interrupções.'
        },

        /* ---------- WiFi (ESP32 / ESP8266) ---------- */
        {
            type: 'ard_wifi_begin',
            message0: 'WiFi.begin ( %1 , %2 )',
            args0: [
                { type: 'field_input', name: 'SSID', text: 'minha-rede' },
                { type: 'field_input', name: 'SENHA', text: 'senha123' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: ESP,
            tooltip: 'Conecta à rede WiFi.'
        },
        {
            type: 'ard_wifi_status',
            message0: 'WiFi.status ( )',
            output: 'Number',
            colour: ESP,
            tooltip: 'Estado da conexão. Compare com WL_CONNECTED.'
        },
        {
            type: 'ard_wifi_localip',
            message0: 'WiFi.localIP ( )',
            output: null,
            colour: ESP,
            tooltip: 'Endereço IP obtido na rede.'
        },
        {
            type: 'ard_wifi_rssi',
            message0: 'WiFi.RSSI ( )',
            output: 'Number',
            colour: ESP,
            tooltip: 'Força do sinal WiFi, em dBm.'
        },
        {
            type: 'ard_wifi_disconnect',
            message0: 'WiFi.disconnect ( )',
            previousStatement: null, nextStatement: null,
            colour: ESP,
            tooltip: 'Desconecta da rede WiFi.'
        },
        {
            type: 'ard_esp_restart',
            message0: 'ESP.restart ( )',
            previousStatement: null,
            colour: ESP,
            tooltip: 'Reinicia o microcontrolador.'
        },
        {
            type: 'ard_esp_deepsleep',
            message0: 'ESP.deepSleep ( %1 )',
            args0: [{ type: 'input_value', name: 'US' }],
            previousStatement: null, inputsInline: true,
            colour: ESP,
            tooltip: 'Entra em sono profundo por N microssegundos.'
        },
        {
            type: 'ard_esp_freeheap',
            message0: 'ESP.getFreeHeap ( )',
            output: 'Number',
            colour: ESP,
            tooltip: 'Memória livre, em bytes.'
        },

        /* ---------- LEDC (PWM por hardware do ESP32) ---------- */
        {
            type: 'ard_ledc_attach',
            message0: 'ledcAttach ( %1 , freq %2 , %3 bits )',
            args0: [
                { type: 'field_pin_pwm', name: 'PIN' },
                { type: 'input_value', name: 'FREQ' },
                { type: 'input_value', name: 'RES' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: ESP,
            tooltip: 'Configura PWM por hardware no pino (ESP32 core 3.x).'
        },
        {
            type: 'ard_ledc_write',
            message0: 'ledcWrite ( %1 , %2 )',
            args0: [
                { type: 'field_pin_pwm', name: 'PIN' },
                { type: 'input_value', name: 'DUTY' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: ESP,
            tooltip: 'Define o duty cycle do PWM por hardware.'
        },
        {
            type: 'ard_ledc_detach',
            message0: 'ledcDetach ( %1 )',
            args0: [{ type: 'field_pin_pwm', name: 'PIN' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: ESP,
            tooltip: 'Solta o pino do PWM por hardware.'
        },

        /* ---------- código livre ---------- */
        {
            type: 'ard_raw_stmt',
            message0: 'código C++ %1',
            args0: [{ type: 'field_input', name: 'CODE', text: '// seu código aqui' }],
            previousStatement: null, nextStatement: null,
            colour: RAW,
            tooltip: 'Insere o código exatamente como escrito, no lugar do bloco. ' +
                'Use \\n para quebrar linha.'
        },
        {
            type: 'ard_raw_expr',
            message0: 'expressão %1',
            args0: [{ type: 'field_input', name: 'CODE', text: 'analogRead(A0) * 2' }],
            output: null,
            colour: RAW,
            tooltip: 'Uma expressão C++ escrita à mão, para encaixar em qualquer entrada.'
        }

    ]);
})();
