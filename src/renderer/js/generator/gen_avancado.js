'use strict';
/** forBlock de INTERRUPÇÕES, ESP (WiFi/LEDC) e CÓDIGO LIVRE. */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    /* ---------- interrupções ---------- */

    A.forBlock['ard_attachinterrupt'] = function (block, gen) {
        const func = gen.identificador(block.getFieldValue('FUNC'), 'minhaISR');
        return 'attachInterrupt(digitalPinToInterrupt(' + block.getFieldValue('PIN') + '), ' +
            func + ', ' + block.getFieldValue('MODO') + ');\n';
    };

    A.forBlock['ard_detachinterrupt'] = function (block) {
        return 'detachInterrupt(digitalPinToInterrupt(' + block.getFieldValue('PIN') + '));\n';
    };

    A.forBlock['ard_interrupts'] = function (block) {
        return block.getFieldValue('FUNC') + '();\n';
    };

    /* ---------- WiFi ---------- */

    // O cabeçalho do WiFi muda com o chip: ESP8266WiFi.h no 8266, WiFi.h no ESP32.
    function incluirWifi(gen) {
        const arch = global.Boards ? global.Boards.atual().arch : 'esp32';
        gen.usarInclude(arch === 'esp8266' ? 'ESP8266WiFi.h' : 'WiFi.h');
    }

    // Publicada para os blocos de rede do Modo Abstrato usarem a MESMA escolha
    // de cabeçalho: duas cópias divergiriam no dia em que uma placa nova entrar.
    A.incluirWifi = function (gen) { incluirWifi(gen || A); };

    A.forBlock['ard_wifi_begin'] = function (block, gen) {
        incluirWifi(gen);
        const ssid = String(block.getFieldValue('SSID') || '').replace(/"/g, '\\"');
        const senha = String(block.getFieldValue('SENHA') || '').replace(/"/g, '\\"');
        return 'WiFi.begin("' + ssid + '", "' + senha + '");\n';
    };

    A.forBlock['ard_wifi_status'] = function (block, gen) {
        incluirWifi(gen);
        return ['WiFi.status()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_wifi_localip'] = function (block, gen) {
        incluirWifi(gen);
        return ['WiFi.localIP()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_wifi_rssi'] = function (block, gen) {
        incluirWifi(gen);
        return ['WiFi.RSSI()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_wifi_disconnect'] = function (block, gen) {
        incluirWifi(gen);
        return 'WiFi.disconnect();\n';
    };

    A.forBlock['ard_esp_restart'] = function () {
        return 'ESP.restart();\n';
    };

    A.forBlock['ard_esp_deepsleep'] = function (block, gen) {
        return 'ESP.deepSleep(' + gen.valorOu(block, 'US', gen.ORDER_COMMA, '1000000') + ');\n';
    };

    A.forBlock['ard_esp_freeheap'] = function (block, gen) {
        return ['ESP.getFreeHeap()', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- LEDC (PWM por hardware, ESP32 core 3.x) ---------- */

    A.forBlock['ard_ledc_attach'] = function (block, gen) {
        return 'ledcAttach(' + block.getFieldValue('PIN') + ', ' +
            gen.valorOu(block, 'FREQ', gen.ORDER_COMMA, '5000') + ', ' +
            gen.valorOu(block, 'RES', gen.ORDER_COMMA, '8') + ');\n';
    };

    A.forBlock['ard_ledc_write'] = function (block, gen) {
        return 'ledcWrite(' + block.getFieldValue('PIN') + ', ' +
            gen.valorOu(block, 'DUTY', gen.ORDER_COMMA, '128') + ');\n';
    };

    A.forBlock['ard_ledc_detach'] = function (block) {
        return 'ledcDetach(' + block.getFieldValue('PIN') + ');\n';
    };

    /* ---------- código livre ---------- */

    A.forBlock['ard_raw_stmt'] = function (block) {
        // O campo é de uma linha só; \n digitado vira quebra de verdade no .ino
        const code = String(block.getFieldValue('CODE') || '')
            .replace(/\\n/g, '\n')
            .replace(/\s+$/, '');
        return code ? code + '\n' : '';
    };

    A.forBlock['ard_raw_expr'] = function (block, gen) {
        const code = String(block.getFieldValue('CODE') || '0').trim();
        return [code, gen.ORDER_NONE];
    };

})(typeof window !== 'undefined' ? window : global);
