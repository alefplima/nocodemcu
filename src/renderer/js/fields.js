'use strict';
/**
 * Campos customizados de pino.
 *
 * São dropdowns dinâmicos: a lista de opções é gerada na hora de abrir o menu,
 * a partir da placa ativa em Boards. Assim, trocar de placa muda os pinos
 * oferecidos sem redefinir bloco nenhum.
 *
 * A validação de classe é permissiva de propósito — um projeto salvo com pino 9
 * abre numa placa que não tem o 9 sem perder o valor; quem acusa o problema é a
 * revalidação em validate.js, que marca o bloco com aviso.
 */
(function (global) {

    if (typeof Blockly === 'undefined') return;

    function criarCampoPino(tipo) {
        class FieldPino extends Blockly.FieldDropdown {
            constructor(valor) {
                super(() => Boards.pinos(tipo));
                this.tipoPino = tipo;
                if (valor != null) this.setValue(String(valor));
            }
            // Aceita qualquer string; a coerência com a placa é checada depois.
            doClassValidation_(valor) {
                return valor == null ? null : String(valor);
            }
            static fromJson(options) {
                return new FieldPino(options && options.pin);
            }
        }
        return FieldPino;
    }

    // Portas seriais também variam por placa (o Uno só tem Serial).
    class FieldSerialPort extends Blockly.FieldDropdown {
        constructor(valor) {
            super(() => Boards.atual().seriais.map(s => [s, s]));
            // Marca de classe, como o tipoPino dos campos de pino: é por ela que
            // a validação reconhece uma porta serial. Reconhecer pelo NOME do
            // campo ("PORTA") confundia a porta de rede do servidor web, que é
            // um número de porta TCP e não tem nada a ver com a placa.
            this.portaSerial = true;
            if (valor != null) this.setValue(String(valor));
        }
        doClassValidation_(valor) {
            return valor == null ? null : String(valor);
        }
        static fromJson(options) {
            return new FieldSerialPort(options && options.port);
        }
    }

    const TIPOS = {
        field_pin_digital: 'digital',
        field_pin_digital_in: 'digitalIn',
        field_pin_analog: 'analog',
        field_pin_pwm: 'pwm',
        field_pin_interrupt: 'interrupt'
    };

    Object.keys(TIPOS).concat(['field_serial_port']).forEach(nome => {
        const Classe = nome === 'field_serial_port' ? FieldSerialPort : criarCampoPino(TIPOS[nome]);
        // Registrar duas vezes lança; nos harnesses o arquivo pode ser recarregado.
        if (Blockly.registry.hasItem(Blockly.registry.Type.FIELD, nome)) {
            Blockly.fieldRegistry.unregister(nome);
        }
        Blockly.fieldRegistry.register(nome, Classe);
    });

    global.TAFields = { TIPOS: TIPOS };

})(typeof window !== 'undefined' ? window : global);
