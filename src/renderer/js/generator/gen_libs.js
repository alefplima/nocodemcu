'use strict';
/**
 * forBlock da categoria BIBLIOTECAS.
 *
 * Cada bloco pede o #include e a instância do objeto que usa. Os blocos de
 * "init" (LCD, DHT, SoftwareSerial) declaram a instância com os parâmetros
 * reais e sobrescrevem qualquer declaração padrão criada por outro bloco.
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    function obj(block, gen, padrao) {
        return gen.identificador(block.getFieldValue('OBJ'), padrao);
    }

    /* ---------- Servo ---------- */

    function servo(gen, nome) {
        gen.usarInclude('Servo.h');
        gen.usarGlobal('obj:' + nome, 'Servo ' + nome + ';');
    }

    A.forBlock['ard_servo_attach'] = function (block, gen) {
        const o = obj(block, gen, 'meuServo');
        servo(gen, o);
        return o + '.attach(' + block.getFieldValue('PIN') + ');\n';
    };

    A.forBlock['ard_servo_write'] = function (block, gen) {
        const o = obj(block, gen, 'meuServo');
        servo(gen, o);
        return o + '.write(' + gen.valorOu(block, 'ANGULO', gen.ORDER_COMMA, '90') + ');\n';
    };

    A.forBlock['ard_servo_writemicroseconds'] = function (block, gen) {
        const o = obj(block, gen, 'meuServo');
        servo(gen, o);
        return o + '.writeMicroseconds(' + gen.valorOu(block, 'US', gen.ORDER_COMMA, '1500') + ');\n';
    };

    A.forBlock['ard_servo_read'] = function (block, gen) {
        const o = obj(block, gen, 'meuServo');
        servo(gen, o);
        return [o + '.read()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_servo_detach'] = function (block, gen) {
        const o = obj(block, gen, 'meuServo');
        servo(gen, o);
        return o + '.detach();\n';
    };

    /* ---------- Wire (I2C) ---------- */

    function wire(gen) { gen.usarInclude('Wire.h'); }

    A.forBlock['ard_wire_begin'] = function (block, gen) {
        wire(gen);
        return 'Wire.begin();\n';
    };

    A.forBlock['ard_wire_begintransmission'] = function (block, gen) {
        wire(gen);
        return 'Wire.beginTransmission(' + gen.valorOu(block, 'ENDERECO', gen.ORDER_COMMA, '0x27') + ');\n';
    };

    A.forBlock['ard_wire_write'] = function (block, gen) {
        wire(gen);
        return 'Wire.write(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_wire_endtransmission'] = function (block, gen) {
        wire(gen);
        return 'Wire.endTransmission();\n';
    };

    A.forBlock['ard_wire_requestfrom'] = function (block, gen) {
        wire(gen);
        return 'Wire.requestFrom(' + gen.valorOu(block, 'ENDERECO', gen.ORDER_COMMA, '0x27') + ', ' +
            gen.valorOu(block, 'QTD', gen.ORDER_COMMA, '1') + ');\n';
    };

    A.forBlock['ard_wire_available'] = function (block, gen) {
        wire(gen);
        return ['Wire.available()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_wire_read'] = function (block, gen) {
        wire(gen);
        return ['Wire.read()', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- SPI ---------- */

    A.forBlock['ard_spi_begin'] = function (block, gen) {
        gen.usarInclude('SPI.h');
        return 'SPI.begin();\n';
    };

    A.forBlock['ard_spi_transfer'] = function (block, gen) {
        gen.usarInclude('SPI.h');
        return ['SPI.transfer(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- EEPROM ---------- */

    A.forBlock['ard_eeprom_read'] = function (block, gen) {
        gen.usarInclude('EEPROM.h');
        return ['EEPROM.read(' + gen.valorOu(block, 'ENDERECO', gen.ORDER_COMMA, '0') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_eeprom_write'] = function (block, gen) {
        gen.usarInclude('EEPROM.h');
        return 'EEPROM.' + block.getFieldValue('FUNC') + '(' +
            gen.valorOu(block, 'ENDERECO', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_eeprom_begin'] = function (block, gen) {
        gen.usarInclude('EEPROM.h');
        return 'EEPROM.begin(' + gen.valorOu(block, 'TAMANHO', gen.ORDER_COMMA, '512') + ');\n';
    };

    A.forBlock['ard_eeprom_commit'] = function (block, gen) {
        gen.usarInclude('EEPROM.h');
        return 'EEPROM.commit();\n';
    };

    /* ---------- LCD I2C ---------- */

    function lcdPadrao(gen, nome) {
        gen.usarInclude('LiquidCrystal_I2C.h');
        gen.usarGlobal('obj:' + nome, 'LiquidCrystal_I2C ' + nome + '(0x27, 16, 2);');
    }

    A.forBlock['ard_lcd_init'] = function (block, gen) {
        const o = obj(block, gen, 'lcd');
        gen.usarInclude('LiquidCrystal_I2C.h');
        gen.usarGlobal('obj:' + o, 'LiquidCrystal_I2C ' + o + '(' +
            String(block.getFieldValue('ENDERECO') || '0x27').trim() + ', ' +
            String(block.getFieldValue('COLS') || '16').trim() + ', ' +
            String(block.getFieldValue('ROWS') || '2').trim() + ');', true);
        return o + '.init();\n';
    };

    A.forBlock['ard_lcd_backlight'] = function (block, gen) {
        const o = obj(block, gen, 'lcd');
        lcdPadrao(gen, o);
        return o + '.backlight();\n';
    };

    A.forBlock['ard_lcd_setcursor'] = function (block, gen) {
        const o = obj(block, gen, 'lcd');
        lcdPadrao(gen, o);
        return o + '.setCursor(' + gen.valorOu(block, 'COL', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'LIN', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_lcd_print'] = function (block, gen) {
        const o = obj(block, gen, 'lcd');
        lcdPadrao(gen, o);
        return o + '.print(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '""') + ');\n';
    };

    A.forBlock['ard_lcd_clear'] = function (block, gen) {
        const o = obj(block, gen, 'lcd');
        lcdPadrao(gen, o);
        return o + '.clear();\n';
    };

    /* ---------- SoftwareSerial ---------- */

    function softPadrao(gen, nome) {
        gen.usarInclude('SoftwareSerial.h');
        gen.usarGlobal('obj:' + nome, 'SoftwareSerial ' + nome + '(2, 3);');
    }

    A.forBlock['ard_softserial_begin'] = function (block, gen) {
        const o = obj(block, gen, 'serialSoft');
        gen.usarInclude('SoftwareSerial.h');
        gen.usarGlobal('obj:' + o, 'SoftwareSerial ' + o + '(' +
            block.getFieldValue('RX') + ', ' + block.getFieldValue('TX') + ');', true);
        return o + '.begin(' + block.getFieldValue('BAUD') + ');\n';
    };

    A.forBlock['ard_softserial_println'] = function (block, gen) {
        const o = obj(block, gen, 'serialSoft');
        softPadrao(gen, o);
        return o + '.println(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '""') + ');\n';
    };

    A.forBlock['ard_softserial_available'] = function (block, gen) {
        const o = obj(block, gen, 'serialSoft');
        softPadrao(gen, o);
        return [o + '.available()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_softserial_read'] = function (block, gen) {
        const o = obj(block, gen, 'serialSoft');
        softPadrao(gen, o);
        return [o + '.read()', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- DHT ---------- */

    function dhtPadrao(gen, nome) {
        gen.usarInclude('DHT.h');
        gen.usarGlobal('obj:' + nome, 'DHT ' + nome + '(2, DHT11);');
    }

    A.forBlock['ard_dht_begin'] = function (block, gen) {
        const o = obj(block, gen, 'dht');
        gen.usarInclude('DHT.h');
        gen.usarGlobal('obj:' + o, 'DHT ' + o + '(' + block.getFieldValue('PIN') + ', ' +
            block.getFieldValue('TIPO') + ');', true);
        return o + '.begin();\n';
    };

    A.forBlock['ard_dht_read'] = function (block, gen) {
        const o = obj(block, gen, 'dht');
        dhtPadrao(gen, o);
        return [o + '.' + block.getFieldValue('FUNC') + '()', gen.ORDER_UNARY_POSTFIX];
    };

})(typeof window !== 'undefined' ? window : global);
