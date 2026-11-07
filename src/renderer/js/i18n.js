'use strict';
/**
 * Idioma da interface: português (padrão) ou inglês.
 *
 * O texto-fonte do programa continua sendo o português: cada bloco, aba e
 * mensagem é escrito em português no próprio arquivo, e este módulo troca na
 * hora de mostrar. A chave do dicionário é o texto original; o que não estiver
 * no dicionário aparece em português, nunca some.
 *
 * O idioma é escolhido em Opções → Idioma. Trocar recarrega a janela (o
 * rascunho é salvo antes), porque os blocos são definidos uma vez só, quando
 * os scripts carregam.
 *
 * Onde o idioma é lido, nesta ordem:
 *   - ?lang=en na URL da página (o processo principal põe ao abrir a janela);
 *   - global NOCODEMCU_LANG ou a variável de ambiente NOCODEMCU_LANG (harnesses).
 *
 * Deve ser carregado depois do blockly_compressed.js e antes dos blocos.
 */
(function (global) {

    function lerIdioma() {
        try {
            if (global.location && global.location.search) {
                const q = new URLSearchParams(global.location.search).get('lang');
                if (q) return q;
            }
        } catch (e) { /* sem URL: harness */ }
        if (global.NOCODEMCU_LANG) return global.NOCODEMCU_LANG;
        if (typeof process !== 'undefined' && process.env && process.env.NOCODEMCU_LANG) {
            return process.env.NOCODEMCU_LANG;
        }
        return 'pt';
    }

    const lang = lerIdioma() === 'en' ? 'en' : 'pt';

    /* ================================================================== */
    /* Dicionário exato: texto em português → texto em inglês             */
    /* ================================================================== */

    const EN = {

        /* ---------- categorias da caixa de ferramentas ---------- */
        'Estrutura': 'Structure',
        'E/S digital': 'Digital I/O',
        'E/S analógica': 'Analog I/O',
        'E/S avançada': 'Advanced I/O',
        'Tempo': 'Time',
        'Controle': 'Control',
        'Operadores': 'Operators',
        'Matemática': 'Math',
        'Variáveis': 'Variables',
        'Tipos e valores': 'Types and values',
        'Interrupções': 'Interrupts',
        'Bibliotecas': 'Libraries',
        'Lógica Paraconsistente': 'Paraconsistent Logic',
        'Código livre': 'Free code',
        'Começo': 'Start',
        'Tarefas': 'Tasks',
        'Sensores e atuadores': 'Sensors and actuators',
        'Mostrar': 'Show',
        'Decidir e repetir': 'Decide and repeat',
        'Contas e comparações': 'Math and comparisons',
        'Guardar valores': 'Store values',
        'Página web': 'Web page',
        'Criar caixa…': 'Create box…',

        /* ---------- blocos do Modo Literal ---------- */
        'chamar %1 ( %2 %3 %4 )': 'call %1 ( %2 %3 %4 )',
        'shiftOut ( dados %1 clock %2 %3 , %4 )': 'shiftOut ( data %1 clock %2 %3 , %4 )',
        'shiftIn ( dados %1 clock %2 %3 )': 'shiftIn ( data %1 clock %2 %3 )',
        '%1 : LCD I2C endereço %2 %3 colunas × %4 linhas — init()':
            '%1 : LCD I2C address %2 %3 columns × %4 rows — init()',
        '%1 : DHT pino %2 tipo %3 — begin ( )': '%1 : DHT pin %2 type %3 — begin ( )',
        'código C++ %1': 'C++ code %1',
        'expressão %1': 'expression %1',
        'evidência de %1 no universo de %2 a %3 , %4': 'evidence of %1 in the universe %2 to %3 , %4',
        'complemento de %1': 'complement of %1',
        '%1 de μ %2 λ %3': '%1 of μ %2 λ %3',
        'estado de μ %1 λ %2 em %3 regiões': 'state of μ %1 λ %2 in %3 regions',
        'nome do estado %1': 'state name %1',
        'indefinição em μ %1 λ %2 ?': 'indefiniteness at μ %1 λ %2 ?',
        'NAP de μ %1 λ %2': 'PAN of μ %1 λ %2',
        'μEr em %1 , φE em %2': 'μEr into %1 , φE into %2',
        'Para-Analisador  μ %1  fonte 2 %2 %3': 'Para-Analyzer  μ %1  source 2 %2 %3',
        'em %1 regiões, limites %2 %3 %4 %5': 'in %1 regions, limits %2 %3 %4 %5',
        'Para-Analisador  sensor 1 %1  sensor 2 %2': 'Para-Analyzer  sensor 1 %1  sensor 2 %2',
        'universo de %1 a %2 , em %3 regiões': 'universe %1 to %2 , in %3 regions',
        'estado %1': 'state %1',
        'nos demais estados': 'in all other states',
        '%1 entre %2 e %3': '%1 between %2 and %3',
        'ParaExtrctr sobre %1 com %2 graus': 'ParaExtrctr over %1 with %2 degrees',

        /* ---------- blocos do Modo Abstrato ---------- */
        'Ao iniciar': 'On start',
        'Sempre': 'Forever',
        'tarefa %1': 'task %1',
        'fazer a tarefa %1': 'do the task %1',
        'escrita digital pino %1 %2': 'digital write pin %1 %2',
        'leitura digital pino %1': 'digital read pin %1',
        'botão no pino %1 apertado ?': 'button on pin %1 pressed ?',
        'intensidade do pino %1 em %2 %%': 'intensity of pin %1 at %2 %%',
        'leitura analógica pino %1 em %%': 'analog read pin %1 in %%',
        'distância em cm  disparo %1  eco %2': 'distance in cm  trigger %1  echo %2',
        'servo no pino %1 em %2 graus': 'servo on pin %1 at %2 degrees',
        'tocar %1 Hz por %2 ms no pino %3': 'play %1 Hz for %2 ms on pin %3',
        'motores  esquerda %1 %2  direita %3 %4': 'motors  left %1 %2  right %3 %4',
        'motores %1 a %2 %%': 'motors %1 at %2 %%',
        'esperar %1 %2': 'wait %1 %2',
        'tempo ligado em %1': 'time since power-on in %1',
        'mostrar %1 %2': 'show %1 %2',
        'mostrar no gráfico %1 %2': 'show on the chart %1 %2',
        'mostrar no reticulado  μ %1  λ %2': 'show on the lattice  μ %1  λ %2',
        'criar rede WiFi aberta %1': 'create open WiFi network %1',
        'a página abre em http://192.168.4.1 %1': 'the page opens at http://192.168.4.1 %1',
        'entrar na rede WiFi %1 senha %2': 'join WiFi network %1 password %2',
        'usar IP fixo %1  roteador %2  máscara %3': 'use fixed IP %1  router %2  mask %3',
        'servidor web na porta de rede %1': 'web server on network port %1',
        'botão %1 da página apertado ?': 'page button %1 pressed ?',
        'mostrar %1 %2 na página': 'show %1 %2 on the page',
        'mostrar o reticulado na página  μ %1  λ %2': 'show the lattice on the page  μ %1  λ %2',
        'atender a página': 'serve the page',
        'esperar %1 ms atendendo a página': 'wait %1 ms serving the page',
        'ligar a câmera  imagem %1  %2': 'turn on the camera  image %1  %2',
        'o vídeo sai na porta 81: http://192.168.4.1:81/video %1':
            'video goes out on port 81: http://192.168.4.1:81/video %1',
        'mostrar a câmera na página com o aviso %1': 'show the camera on the page with the notice %1',
        'esconder a câmera da página': 'hide the camera from the page',
        'se %1': 'if %1',
        'então %1': 'then %1',
        'senão %1': 'else %1',
        'repetir %1 vezes': 'repeat %1 times',
        'repetir enquanto %1': 'repeat while %1',
        'mapear %1 de %2 a %3 para %4 a %5': 'map %1 from %2 – %3 to %4 – %5',
        'sorteio de %1 a %2': 'random from %1 to %2',
        'criar %1 com %2': 'create %1 with %2',
        'definir %1 para %2': 'set %1 to %2',
        'evidência de %1 entre %2 e %3': 'evidence of %1 between %2 and %3',
        'analisar  fonte 1 %1  fonte 2 %2': 'analyze  source 1 %1  source 2 %2',
        'quando o estado for %1': 'when the state is %1',
        '%1 de  fonte 1 %2  fonte 2 %3': '%1 of  source 1 %2  source 2 %3',
        'fontes %1 e %2 se contradizem ?': 'sources %1 and %2 contradict each other ?',
        'combinar %1 e %2 pelo %3': 'combine %1 and %2 by the %3',

        /* ---------- opções de listas ---------- */
        'linear crescente': 'increasing linear',
        'linear decrescente': 'decreasing linear',
        'função S': 'S-function',
        'função Z': 'Z-function',
        'Grau de Certeza Gc': 'Certainty Degree Gc',
        'Grau de Contradição Gct': 'Contradiction Degree Gct',
        'Intervalo de Certeza φ': 'Certainty Interval φ',
        'Grau de Contradição normalizado μctr': 'normalized Contradiction Degree μctr',
        'distância D': 'distance D',
        'Grau de Certeza Real Gcr': 'Real Certainty Degree Gcr',
        'Grau de Evidência Resultante Real μEr': 'Real Resultant Evidence Degree μEr',
        'é evidência favorável (usa 1 − μ2)': 'is favorable evidence (uses 1 − μ2)',
        'já é o λ': 'is already λ',
        'V — Verdadeiro': 'V — True',
        'F — Falso': 'F — False',
        'T — Inconsistente': 'T — Inconsistent',
        '⊥ — Indeterminado': '⊥ — Indeterminate (paracomplete)',
        'Qv→T — quase-verdadeiro tendendo ao inconsistente': 'Qv→T — quasi-true tending to inconsistent',
        'Qv→⊥ — quase-verdadeiro tendendo ao indeterminado': 'Qv→⊥ — quasi-true tending to indeterminate',
        'Qf→T — quase-falso tendendo ao inconsistente': 'Qf→T — quasi-false tending to inconsistent',
        'Qf→⊥ — quase-falso tendendo ao indeterminado': 'Qf→⊥ — quasi-false tending to indeterminate',
        'T→v — inconsistente tendendo ao verdadeiro': 'T→v — inconsistent tending to true',
        'T→f — inconsistente tendendo ao falso': 'T→f — inconsistent tending to false',
        '⊥→v — indeterminado tendendo ao verdadeiro': '⊥→v — indeterminate tending to true',
        '⊥→f — indeterminado tendendo ao falso': '⊥→f — indeterminate tending to false',
        'OR — maximização': 'OR — maximization',
        'AND — minimização': 'AND — minimization',
        'liga': 'on',
        'desliga': 'off',
        'ir para frente': 'go forward',
        'dar ré': 'reverse',
        'girar à esquerda': 'turn left',
        'girar à direita': 'turn right',
        'parar': 'stop',
        'segundos': 'seconds',
        'milissegundos': 'milliseconds',
        '320 × 240 (mais fluida)': '320 × 240 (smoother)',
        'como sai da câmera': 'as the camera gives it',
        'girada 180°': 'rotated 180°',
        'e': 'and',
        'ou': 'or',
        'V — verdadeiro': 'V — true',
        'F — falso': 'F — false',
        'T — inconsistente (as fontes brigam)': 'T — inconsistent (the sources disagree)',
        '⊥ — indeterminado (brigam ao contrário)': '⊥ — indeterminate (they disagree the other way)',
        'Qv→T — quase verdadeiro, começando a divergir': 'Qv→T — quasi-true, starting to diverge',
        'Qv→⊥ — quase verdadeiro, evidência fraca': 'Qv→⊥ — quasi-true, weak evidence',
        'Qf→T — quase falso, começando a divergir': 'Qf→T — quasi-false, starting to diverge',
        'Qf→⊥ — quase falso, evidência fraca': 'Qf→⊥ — quasi-false, weak evidence',
        'T→v — divergindo, puxando para verdadeiro': 'T→v — diverging, pulling toward true',
        'T→f — divergindo, puxando para falso': 'T→f — diverging, pulling toward false',
        '⊥→v — sem força, puxando para verdadeiro': '⊥→v — weak, pulling toward true',
        '⊥→f — sem força, puxando para falso': '⊥→f — weak, pulling toward false',
        'certeza': 'certainty',
        'contradição': 'contradiction',
        'espaço para certeza': 'room for certainty',
        'certeza real': 'real certainty',
        'evidência resultante': 'resultant evidence',
        'maior': 'greater',
        'menor': 'smaller',

        /* ---------- valores padrão de campos ---------- */
        'comentário': 'comment',
        'minhaFuncao': 'myFunction',
        'meuServo': 'myServo',
        'olá': 'hello',
        'valor: ': 'value: ',
        'minhaISR': 'myISR',
        'minha-rede': 'my-network',
        'senha123': 'password123',
        '// seu código aqui': '// your code here',
        'minha tarefa': 'my task',
        'valor': 'value',
        'frente': 'forward',
        'você está no controle': 'you are in control',
        'contador': 'counter',
        'lista': 'list',
        'evidencias': 'evidences',

        /* ---------- dicas (tooltips) ---------- */
        'Executa uma única vez, ao ligar ou resetar a placa.': 'Runs once, when the board powers on or resets.',
        'Executa repetidamente, para sempre, depois do setup().': 'Runs over and over, forever, after setup().',
        'Inclui uma biblioteca. Vai para o topo do arquivo, esteja o bloco onde estiver.':
            'Includes a library. It goes to the top of the file, wherever the block is.',
        'Cria uma constante de pré-processador. Vai para o topo do arquivo.':
            'Creates a preprocessor constant. It goes to the top of the file.',
        'Comentário de uma linha.': 'Single-line comment.',
        'Define uma função. Parâmetros com tipo, ex.: int a, int b':
            'Defines a function. Typed parameters, e.g.: int a, int b',
        'Retorna da função. Sem valor conectado, gera return;':
            'Returns from the function. With no value attached, it generates return;',
        'Chama uma função sem usar o retorno. Argumentos vazios são ignorados.':
            'Calls a function without using its return value. Empty arguments are ignored.',
        'Chama uma função e usa o valor retornado.': 'Calls a function and uses the returned value.',
        'Configura o pino como entrada ou saída.': 'Configures the pin as input or output.',
        'Escreve HIGH ou LOW num pino digital.': 'Writes HIGH or LOW to a digital pin.',
        'Lê o estado de um pino digital: HIGH ou LOW.': 'Reads the state of a digital pin: HIGH or LOW.',
        'Lê a tensão de um pino analógico.': 'Reads the voltage on an analog pin.',
        'Gera PWM num pino que suporte PWM.': 'Generates PWM on a PWM-capable pin.',
        'Define a referência de tensão do conversor A/D.': 'Sets the voltage reference of the A/D converter.',
        'Muda a resolução do analogRead (ESP32).': 'Changes the analogRead resolution (ESP32).',
        'Gera uma onda quadrada na frequência indicada, até chamar noTone().':
            'Generates a square wave at the given frequency until noTone() is called.',
        'Gera uma onda quadrada por uma duração em milissegundos.':
            'Generates a square wave for a duration in milliseconds.',
        'Interrompe o tone() do pino.': 'Stops the tone() on the pin.',
        'Mede a duração de um pulso, em microssegundos.': 'Measures the length of a pulse, in microseconds.',
        'pulseIn com tempo limite em microssegundos.': 'pulseIn with a timeout in microseconds.',
        'Envia um byte bit a bit.': 'Shifts out a byte one bit at a time.',
        'Lê um byte bit a bit.': 'Shifts in a byte one bit at a time.',
        'Pausa o programa por N milissegundos.': 'Pauses the program for N milliseconds.',
        'Pausa o programa por N microssegundos.': 'Pauses the program for N microseconds.',
        'Milissegundos desde que a placa ligou.': 'Milliseconds since the board powered on.',
        'Microssegundos desde que a placa ligou.': 'Microseconds since the board powered on.',
        'Abre a comunicação serial na velocidade indicada.': 'Opens serial communication at the given speed.',
        'Envia o valor pela serial, sem quebrar linha.': 'Sends the value over serial, without a line break.',
        'Envia o valor pela serial e quebra a linha.': 'Sends the value over serial and ends the line.',
        'Envia o valor numa base numérica específica.': 'Sends the value in a specific number base.',
        'Envia um byte cru pela serial.': 'Sends a raw byte over serial.',
        'Quantos bytes chegaram e estão esperando leitura.': 'How many bytes arrived and are waiting to be read.',
        'Lê o próximo byte recebido (-1 se não houver nada).': 'Reads the next received byte (-1 if there is none).',
        'Lê caracteres até encontrar o terminador.': 'Reads characters until the terminator is found.',
        'Lê o próximo número inteiro que chegar pela serial.': 'Reads the next integer that arrives over serial.',
        'Espera terminar a transmissão dos dados pendentes.': 'Waits for pending outgoing data to be sent.',
        'Encerra a comunicação serial.': 'Closes serial communication.',
        'Laço for com variável de contagem declarada no próprio for.':
            'for loop with the counter variable declared in the for itself.',
        'Repete enquanto a condição for verdadeira (testa antes).': 'Repeats while the condition is true (tests first).',
        'Executa o corpo e só então testa a condição.': 'Runs the body and only then tests the condition.',
        'Desvia conforme o valor da expressão. Use blocos case e default dentro.':
            'Branches on the value of the expression. Use case and default blocks inside.',
        'Um caso do switch. Desmarque o break para "cair" no caso seguinte.':
            'A switch case. Uncheck break to "fall through" to the next case.',
        'Caso padrão do switch.': 'Default case of the switch.',
        'Sai do laço ou do switch.': 'Leaves the loop or the switch.',
        'Pula para a próxima repetição do laço.': 'Skips to the next iteration of the loop.',
        'Operação aritmética. O % é o resto da divisão inteira.':
            'Arithmetic operation. % is the remainder of integer division.',
        'Atribuição composta: x += 1 é o mesmo que x = x + 1.': 'Compound assignment: x += 1 is the same as x = x + 1.',
        'Incrementa ou decrementa a variável em 1.': 'Increments or decrements the variable by 1.',
        'Operação bit a bit.': 'Bitwise operation.',
        'Inverte todos os bits.': 'Inverts all bits.',
        'Lê um bit de um número.': 'Reads one bit of a number.',
        'Escreve um bit numa variável.': 'Writes one bit of a variable.',
        'Liga (bitSet) ou desliga (bitClear) um bit da variável.': 'Sets (bitSet) or clears (bitClear) a bit of the variable.',
        'Valor do bit N: bit(3) é 8.': 'Value of bit N: bit(3) is 8.',
        'Converte um número de uma faixa para outra.': 'Converts a number from one range to another.',
        'Limita o número entre um mínimo e um máximo.': 'Limits the number between a minimum and a maximum.',
        'Menor ou maior entre dois valores.': 'Smaller or greater of two values.',
        'Funções matemáticas de um argumento.': 'One-argument math functions.',
        'Potência: base elevada ao expoente.': 'Power: base raised to the exponent.',
        'Número aleatório de mín (inclusive) até máx (exclusive).': 'Random number from min (inclusive) to max (exclusive).',
        'Número aleatório de 0 até máx (exclusive).': 'Random number from 0 to max (exclusive).',
        'Inicializa o gerador de números aleatórios.': 'Seeds the random number generator.',
        'Declara uma variável no ponto em que o bloco está.': 'Declares a variable where the block is.',
        'Declara a variável fora do setup/loop, visível no sketch inteiro.':
            'Declares the variable outside setup/loop, visible in the whole sketch.',
        'Declara um vetor global.': 'Declares a global array.',
        'Lê uma posição do vetor.': 'Reads one element of the array.',
        'Escreve numa posição do vetor.': 'Writes one element of the array.',
        'Converte o valor para outro tipo.': 'Converts the value to another type.',
        'Constante da linguagem Arduino.': 'Arduino language constant.',
        'Número literal.': 'Number literal.',
        'Texto literal entre aspas.': 'Text literal in double quotes.',
        'Caractere literal entre aspas simples.': 'Character literal in single quotes.',
        'Liga o objeto Servo a um pino.': 'Attaches the Servo object to a pin.',
        'Move o servo para o ângulo (0 a 180).': 'Moves the servo to the angle (0 to 180).',
        'Comanda o servo pela largura de pulso, em microssegundos.': 'Drives the servo by pulse width, in microseconds.',
        'Último ângulo comandado.': 'Last commanded angle.',
        'Solta o pino do servo.': 'Detaches the servo pin.',
        'Inicia o barramento I2C como mestre.': 'Starts the I2C bus as master.',
        'Começa uma transmissão para o dispositivo do endereço.': 'Begins a transmission to the device at the address.',
        'Enfileira um byte para envio.': 'Queues a byte for sending.',
        'Envia os bytes enfileirados e encerra a transmissão.': 'Sends the queued bytes and ends the transmission.',
        'Pede N bytes a um dispositivo.': 'Requests N bytes from a device.',
        'Quantos bytes chegaram pelo I2C.': 'How many bytes arrived over I2C.',
        'Lê o próximo byte recebido pelo I2C.': 'Reads the next byte received over I2C.',
        'Inicia o barramento SPI.': 'Starts the SPI bus.',
        'Envia um byte pelo SPI e devolve o byte recebido.': 'Sends a byte over SPI and returns the received byte.',
        'Lê um byte da memória permanente.': 'Reads a byte from permanent memory.',
        'Grava um byte na memória permanente. update só grava se mudou.':
            'Writes a byte to permanent memory. update only writes if it changed.',
        'Reserva N bytes de EEPROM emulada (ESP32 / ESP8266).': 'Reserves N bytes of emulated EEPROM (ESP32 / ESP8266).',
        'Grava na flash o que foi escrito na EEPROM emulada (ESP32 / ESP8266).':
            'Commits what was written to the emulated EEPROM to flash (ESP32 / ESP8266).',
        'Declara o display e chama init(). Use uma vez, no setup().': 'Declares the display and calls init(). Use once, in setup().',
        'Liga a luz de fundo do display.': 'Turns on the display backlight.',
        'Posiciona o cursor (coluna, linha), contando de 0.': 'Places the cursor (column, row), counting from 0.',
        'Escreve no display a partir do cursor.': 'Writes on the display from the cursor.',
        'Apaga o display.': 'Clears the display.',
        'Cria uma serial por software em dois pinos quaisquer.': 'Creates a software serial port on any two pins.',
        'Envia texto pela serial de software.': 'Sends text over the software serial port.',
        'Bytes esperando na serial de software.': 'Bytes waiting on the software serial port.',
        'Lê um byte da serial de software.': 'Reads a byte from the software serial port.',
        'Declara o sensor DHT e chama begin(). Use uma vez, no setup().':
            'Declares the DHT sensor and calls begin(). Use once, in setup().',
        'Lê temperatura (°C) ou umidade (%) do DHT.': 'Reads temperature (°C) or humidity (%) from the DHT.',
        'Chama a função quando o pino mudar. A função precisa existir (bloco de função).':
            'Calls the function when the pin changes. The function must exist (function block).',
        'Desliga a interrupção do pino.': 'Turns off the pin interrupt.',
        'Habilita ou desabilita todas as interrupções.': 'Enables or disables all interrupts.',
        'Conecta à rede WiFi.': 'Connects to the WiFi network.',
        'Estado da conexão. Compare com WL_CONNECTED.': 'Connection status. Compare with WL_CONNECTED.',
        'Endereço IP obtido na rede.': 'IP address obtained on the network.',
        'Força do sinal WiFi, em dBm.': 'WiFi signal strength, in dBm.',
        'Desconecta da rede WiFi.': 'Disconnects from the WiFi network.',
        'Reinicia o microcontrolador.': 'Restarts the microcontroller.',
        'Entra em sono profundo por N microssegundos.': 'Enters deep sleep for N microseconds.',
        'Memória livre, em bytes.': 'Free memory, in bytes.',
        'Configura PWM por hardware no pino (ESP32 core 3.x).': 'Sets up hardware PWM on the pin (ESP32 core 3.x).',
        'Define o duty cycle do PWM por hardware.': 'Sets the hardware PWM duty cycle.',
        'Solta o pino do PWM por hardware.': 'Releases the pin from hardware PWM.',
        'Insere o código exatamente como escrito, no lugar do bloco. Use \\n para quebrar linha.':
            'Inserts the code exactly as written, in place of the block. Use \\n for a line break.',
        'Uma expressão C++ escrita à mão, para encaixar em qualquer entrada.':
            'A hand-written C++ expression, to plug into any input.',
        'Normaliza a leitura de um sensor para um Grau de Evidência entre 0 e 1, dentro do Universo de Discurso escolhido. Fora dos limites satura em 0 ou 1.':
            'Normalizes a sensor reading into an Evidence Degree between 0 and 1, within the chosen Universe of Discourse. Outside the limits it saturates at 0 or 1.',
        'Devolve 1 − μ. Transforma uma evidência favorável em desfavorável e é também o operador NOT da LPA2v.':
            'Returns 1 − μ. Turns favorable evidence into unfavorable evidence; it is also the PAL2v NOT operator.',
        'Calcula uma das grandezas da LPA2v a partir da anotação (μ, λ). Gcr e μEr já aplicam a guarda de indefinição do NAP.':
            'Computes one of the PAL2v quantities from the annotation (μ, λ). Gcr and μEr already apply the PAN indefiniteness guard.',
        'Devolve o estado lógico do reticulado como um código. Em 4 regiões vale o vértice mais próximo; em 12, o Para-Analisador completo.':
            'Returns the logical state of the lattice as a code. In 4 regions it is the nearest vertex; in 12, the full Para-Analyzer.',
        'Converte o código do estado em texto ("Qv->T"), para o monitor serial.':
            'Converts the state code into text ("Qv->T"), for the serial monitor.',
        'Verdadeiro quando a análise não conclui: φE ≤ 0,25 ou D > 1. Nesse caso Gcr vale 0 e μEr vale 0,5.':
            'True when the analysis is inconclusive: φE ≤ 0.25 or D > 1. In that case Gcr is 0 and μEr is 0.5.',
        'Nó de Análise Paraconsistente: guarda o Grau de Evidência Resultante Real e o Intervalo de Evidência nas duas variáveis. As variáveis precisam existir.':
            'Paraconsistent Analysis Node: stores the Real Resultant Evidence Degree and the Evidence Interval in the two variables. The variables must exist.',
        'Analisa a anotação e desvia para o caso do estado encontrado. Os limites são Vscc, Vicc, Vscct e Vicct, nessa ordem. Use blocos "estado" e "senão" dentro.':
            'Analyzes the annotation and branches to the case of the resulting state. The limits are Vscc, Vicc, Vscct and Vicct, in this order. Use "state" and "else" blocks inside.',
        'Versão direta: normaliza as duas leituras no mesmo Universo de Discurso (linear crescente), toma a segunda como evidência desfavorável e analisa. As duas fontes precisam falar da mesma proposição.':
            'Direct version: normalizes both readings in the same Universe of Discourse (increasing linear), takes the second as unfavorable evidence and analyzes. Both sources must refer to the same proposition.',
        'O que fazer quando a análise cair neste estado do reticulado.': 'What to do when the analysis falls in this state of the lattice.',
        'Caso padrão: vale para todo estado que não tem bloco próprio.': 'Default case: applies to every state without its own block.',
        'Conectivo da LPA2v entre dois Graus de Evidência: OR maximiza, AND minimiza.':
            'PAL2v connective between two Evidence Degrees: OR maximizes, AND minimizes.',
        'Reduz um vetor de Graus de Evidência sobre a mesma proposição a um único Grau de Evidência resultante, extraindo os efeitos da contradição.':
            'Reduces an array of Evidence Degrees about the same proposition to a single resultant Evidence Degree, extracting the effects of contradiction.',
        'Roda uma vez, quando a placa liga. É o void setup() do Modo Literal.':
            'Runs once, when the board powers on. It is the void setup() of Literal Mode.',
        'Repete para sempre, enquanto a placa estiver ligada. É o void loop().':
            'Repeats forever, while the board is powered. It is the void loop().',
        'Dá nome a um pedaço do programa. Ele só roda quando um bloco "fazer a tarefa" com o mesmo nome é alcançado.':
            'Gives a name to a piece of the program. It only runs when a "do the task" block with the same name is reached.',
        'Roda a tarefa com este nome e volta para o bloco seguinte.': 'Runs the task with this name and returns to the next block.',
        'Liga ou desliga o pino. O pinMode de saída é declarado sozinho.':
            'Turns the pin on or off. The output pinMode is declared automatically.',
        'Lê se o pino está em nível alto. O pinMode de entrada é declarado sozinho.':
            'Reads whether the pin is high. The input pinMode is declared automatically.',
        'Verdadeiro quando o botão está apertado. Usa o resistor interno, então o botão vai do pino direto ao GND.':
            'True while the button is pressed. Uses the internal resistor, so the button goes from the pin straight to GND.',
        'Controla a intensidade de 0 a 100 %. Serve para brilho de LED e velocidade de motor.':
            'Controls the intensity from 0 to 100 %. Works for LED brightness and motor speed.',
        'Lê o sensor e devolve de 0 a 100 %, em vez do 0 a 1023 do conversor.':
            'Reads the sensor and returns 0 to 100 %, instead of the converter\'s 0 to 1023.',
        'Mede a distância com um sensor de ultrassom HC-SR04. Sem eco, devolve 400 cm em vez de zero.':
            'Measures distance with an HC-SR04 ultrasonic sensor. With no echo, it returns 400 cm instead of zero.',
        'Move o servo para o ângulo, de 0 a 180. O objeto e o attach são criados sozinhos, um por pino.':
            'Moves the servo to the angle, 0 to 180. The object and the attach are created automatically, one per pin.',
        'Toca uma nota num buzzer ligado ao pino.': 'Plays a note on a buzzer connected to the pin.',
        'Diz em que pinos está a ponte H dos dois motores. Vai uma vez no "Ao iniciar"; depois disso os blocos de manobra só falam em frente, ré e giro.':
            'Tells which pins the H-bridge of the two motors uses. Goes once in "On start"; after that the maneuver blocks only speak of forward, reverse and turn.',
        'Uma manobra inteira num bloco só, de 0 a 100 %. A velocidade fica aqui, num lugar só: ligue a mesma caixa nas manobras que devem andar igual.':
            'A whole maneuver in a single block, 0 to 100 %. The speed lives here, in one place: plug the same box into maneuvers that should move alike.',
        'Para o programa pelo tempo escolhido.': 'Pauses the program for the chosen time.',
        'Quanto tempo passou desde que a placa ligou.': 'How much time has passed since the board powered on.',
        'Escreve no Monitor serial. O Serial.begin é feito sozinho.': 'Writes to the Serial monitor. Serial.begin is done automatically.',
        'Escreve no formato que a aba Plotter entende, virando uma curva.':
            'Writes in the format the Plotter tab understands, turning it into a curve.',
        'Manda a anotação para a aba Reticulado, que marca o ponto em tempo real.':
            'Sends the annotation to the Lattice tab, which plots the point in real time.',
        'A placa vira o ponto de acesso: o celular se conecta nela direto, sem roteador. O endereço da página é sempre 192.168.4.1, fixado pelo próprio modo ponto de acesso.':
            'The board becomes the access point: the phone connects to it directly, with no router. The page address is always 192.168.4.1, fixed by access point mode itself.',
        'Entra numa rede que já existe e espera até conectar. O endereço da página aparece no Monitor serial.':
            'Joins an existing network and waits until connected. The page address appears in the Serial monitor.',
        'Fixa o endereço da placa na rede, antes de entrar nela. Sem isto quem escolhe o endereço é o roteador, e ele muda de uma ligação para outra — a página troca de lugar sem avisar.':
            'Fixes the board\'s address on the network, before joining it. Without this the router picks the address, and it changes from one power-up to the next — the page moves without warning.',
        'Abre a página da placa. Vai no "Ao iniciar", depois da rede. Porta de rede não é pino: é o número que vem depois dos dois-pontos no endereço, e 80 é o que o navegador usa sozinho.':
            'Opens the board\'s page. Goes in "On start", after the network. A network port is not a pin: it is the number after the colon in the address, and 80 is what the browser uses by default.',
        'Verdadeiro enquanto o dedo está no botão da página. O botão aparece sozinho na tela do celular, com este nome.':
            'True while a finger is on the page button. The button appears automatically on the phone screen, with this name.',
        'Escreve um número na página, que se atualiza sozinha.': 'Writes a number on the page, which updates by itself.',
        'Desenha o reticulado da LPA2v na própria página, com o rastro dos últimos pontos — o mesmo QUPC da aba Reticulado, no celular.':
            'Draws the PAL2v lattice on the page itself, with the trail of the latest points — the same USCP of the Lattice tab, on the phone.',
        'Dá uma volta no servidor: recebe os toques e responde. Vai no começo do "Sempre".':
            'Runs one round of the server: receives the taps and replies. Goes at the start of "Forever".',
        'Espera sem abandonar a página: durante uma manobra longa, o celular continua respondendo. É o "esperar" de quem tem servidor.':
            'Waits without abandoning the page: during a long maneuver the phone keeps responding. It is the "wait" for programs with a server.',
        'Liga a câmera da placa e abre o vídeo na porta 81. Vai no "Ao iniciar", depois da rede. Sozinho ele não põe o vídeo na página: quem decide quando mostrar é o bloco "mostrar a câmera".':
            'Turns on the board camera and opens the video on port 81. Goes in "On start", after the network. By itself it does not put the video on the page: the "show the camera" block decides when.',
        'O vídeo aparece no topo da página do celular, com o aviso em destaque. Fica lá até o bloco "esconder a câmera".':
            'The video appears at the top of the phone page, with the notice highlighted. It stays there until the "hide the camera" block.',
        'Tira o vídeo da página. O celular fecha a conexão do vídeo e a rede fica livre para o resto.':
            'Removes the video from the page. The phone closes the video connection and the network is free for the rest.',
        'Faz o que está dentro só quando a condição é verdadeira.': 'Does what is inside only when the condition is true.',
        'Escolhe entre dois caminhos.': 'Chooses between two paths.',
        'Repete um número fixo de vezes.': 'Repeats a fixed number of times.',
        'Repete enquanto a condição continuar verdadeira.': 'Repeats while the condition stays true.',
        'Compara dois valores.': 'Compares two values.',
        'Combina duas condições.': 'Combines two conditions.',
        'Uma conta entre dois valores.': 'An arithmetic operation between two values.',
        'Um número sorteado na faixa.': 'A random number in the range.',
        'Cria uma caixa para guardar um número, visível em todo o programa.':
            'Creates a box to store a number, visible in the whole program.',
        'Guarda um valor novo na caixa.': 'Stores a new value in the box.',
        'Lê o que está guardado na caixa.': 'Reads what is stored in the box.',
        'Transforma uma medida em Grau de Evidência entre 0 e 1. O primeiro limite é onde a evidência é nula, o segundo é onde ela é total.':
            'Turns a measurement into an Evidence Degree between 0 and 1. The first limit is where the evidence is null, the second is where it is full.',
        'Compara duas fontes que falam da MESMA coisa e desvia conforme o resultado. Use blocos "quando o estado for" dentro.':
            'Compares two sources about the SAME thing and branches on the result. Use "when the state is" blocks inside.',
        'O que fazer quando a análise cair neste estado.': 'What to do when the analysis falls in this state.',
        'Vale para todo estado que não tem bloco próprio. Os quatro estados extremos são a minoria do reticulado: sem este bloco, uma leitura que caia numa região intermediária não faz nada, e o equipamento fica repetindo a última ação.':
            'Applies to every state without its own block. The four extreme states are a minority of the lattice: without this block, a reading that falls in an intermediate region does nothing, and the device keeps repeating the last action.',
        'Um dos números da análise paraconsistente entre as duas fontes.':
            'One of the numbers of the paraconsistent analysis between the two sources.',
        'Verdadeiro quando a discordância entre as fontes é tão grande que a análise não conclui nada.':
            'True when the disagreement between the sources is so large that the analysis concludes nothing.',
        'Junta duas evidências tomando a maior (OR) ou a menor (AND).':
            'Joins two pieces of evidence by taking the greater (OR) or the smaller (AND).',

        /* ---------- interface (index.html) ---------- */
        'sem título': 'untitled',
        'Arduino Nano (bootloader novo)': 'Arduino Nano (new bootloader)',
        'Arduino Nano (bootloader antigo)': 'Arduino Nano (old bootloader)',
        'ESP32-S3 CAM (WROOM-1, câmera)': 'ESP32-S3 CAM (WROOM-1, camera)',
        'Placa': 'Board',
        'Porta': 'Port',
        'Atualizar lista de portas': 'Refresh port list',
        'Compilar': 'Compile',
        'Compilar e gravar': 'Compile and upload',
        'Código': 'Code',
        'Monitor serial': 'Serial monitor',
        'Reticulado': 'Lattice',
        'Saída': 'Output',
        'Recolher o painel': 'Collapse the panel',
        'Mostrar o painel': 'Show the panel',
        'Copiar': 'Copy',
        'Exportar .ino': 'Export .ino',
        'Conectar': 'Connect',
        'Desconectar': 'Disconnect',
        'Nova linha': 'Newline',
        'Retorno': 'Carriage return',
        'Ambos': 'Both',
        'Nenhum': 'None',
        'rolar': 'autoscroll',
        'Limpar': 'Clear',
        'Salvar': 'Save',
        'mensagem para a placa…': 'message to the board…',
        'Enviar': 'Send',
        'Linhas no formato': 'Lines in the format',
        'rotulo:valor': 'label:value',
        'ou números separados por vírgula viram séries.': 'or comma-separated numbers become series.',
        'janela': 'window',
        'Linhas com': 'Lines with',
        'marcam o ponto no reticulado.': 'mark the point on the lattice.',
        'rastro': 'trail',
        'aguardando dados da serial…': 'waiting for serial data…',
        'compilação e gravação': 'compile and upload',
        'pronto': 'ready',
        'verificando toolchain…': 'checking toolchain…',

        /* ---------- mensagens do aplicativo ---------- */
        'código copiado': 'code copied',
        'modo abstrato': 'abstract mode',
        'modo literal': 'literal mode',
        'Abstrato': 'Abstract',
        '  nada ficou de fora; o código gerado não mudou': '  nothing was left out; the generated code did not change',
        '  ficaram no formato anterior (o código gerado não mudou):':
            '  kept in the previous form (the generated code did not change):',
        'arduino-cli não encontrado': 'arduino-cli not found',
        'nenhuma placa detectada': 'no board detected',
        '> a placa selecionada não aceita este programa:': '> the selected board does not accept this program:',
        'corrija os avisos antes de compilar': 'fix the warnings before compiling',
        'nenhuma porta selecionada': 'no port selected',
        '  monte a toolchain completa: node tools/fetch_toolchain.mjs': '  build the full toolchain: node tools/fetch_toolchain.mjs',
        'compilando…': 'compiling…',
        'compilação falhou': 'compilation failed',
        'compilado com sucesso': 'compiled successfully',
        'gravando…': 'uploading…',
        'gravado na placa': 'uploaded to the board',
        'gravação falhou': 'upload failed',
        'falha ao abrir a porta': 'failed to open the port',
        '— desconectado —': '— disconnected —',
        'projeto salvo': 'project saved',
        'projeto aberto': 'project opened',
        'sketch exportado': 'sketch exported',
        'falha ao exportar': 'export failed',
        '— diagnóstico da toolchain —': '— toolchain diagnostics —',
        'não respondeu': 'no response',
        'cores instalados: ': 'installed cores: ',
        'cores instalados: nenhum': 'installed cores: none',
        'aviso': 'warning',
        'avisos': 'warnings',
        'Erro: ': 'Error: ',
        'Aviso: ': 'Warning: ',
        ' de ': ' of ',
        'INDEFINIÇÃO': 'INDEFINITENESS',
        'φ ≤ 0,25': 'φ ≤ 0.25',

        /* reticulado: nomes dos estados */
        'Verdadeiro': 'True',
        'Falso': 'False',
        'Inconsistente': 'Inconsistent',
        'Indeterminado': 'Indeterminate',
        'quase-verdadeiro tendendo ao inconsistente': 'quasi-true tending to inconsistent',
        'quase-verdadeiro tendendo ao indeterminado': 'quasi-true tending to indeterminate',
        'quase-falso tendendo ao inconsistente': 'quasi-false tending to inconsistent',
        'quase-falso tendendo ao indeterminado': 'quasi-false tending to indeterminate',
        'inconsistente tendendo ao verdadeiro': 'inconsistent tending to true',
        'inconsistente tendendo ao falso': 'inconsistent tending to false',
        'indeterminado tendendo ao verdadeiro': 'indeterminate tending to true',
        'indeterminado tendendo ao falso': 'indeterminate tending to false',

        /* validação: tipos de pino */
        'saída digital': 'digital output',
        'entrada digital': 'digital input',
        'entrada analógica': 'analog input',
        'interrupção': 'interrupt',
        'não há bloco simplificado equivalente': 'there is no equivalent simplified block',

        /* avisos do gerador sem parte variável */
        'Há blocos fora de void setup() e void loop() — eles não entram no programa.':
            'There are blocks outside void setup() and void loop() — they are not part of the program.',
        'Falta o bloco void setup().': 'The void setup() block is missing.',
        'Falta o bloco void loop().': 'The void loop() block is missing.',
        'Existe mais de um bloco "Ao iniciar"; só o último vale.': 'There is more than one "On start" block; only the last one counts.',
        'Existe mais de um bloco "Sempre"; só o último vale.': 'There is more than one "Forever" block; only the last one counts.',
        'Existe mais de um bloco void setup(); só o último vale.': 'There is more than one void setup() block; only the last one counts.',
        'Existe mais de um bloco void loop(); só o último vale.': 'There is more than one void loop() block; only the last one counts.',
        'A análise está sem nenhum estado — ela não faz nada.': 'The analysis has no state — it does nothing.',
        'O Para-Analisador está sem nenhum estado — a análise não faz nada.':
            'The Para-Analyzer has no state — the analysis does nothing.',
        'Falta o bloco que diz em que pinos estão os motores; estou usando os da bancada (2, 4, 18, 19).':
            'The block that says which pins the motors use is missing; using the test bench ones (2, 4, 18, 19).',
        'A página vai abrir o vídeo, mas nenhum bloco "ligar a câmera" está no programa: o quadro fica vazio.':
            'The page will open the video, but there is no "turn on the camera" block in the program: the frame stays empty.',
        'Este é um bloco do Modo Abstrato e não está na paleta do Modo Literal. Troque o modo em Exibir → Modo para editá-lo.':
            'This is an Abstract Mode block and is not in the Literal Mode palette. Switch the mode in View → Mode to edit it.',

        // Relatório da troca de modo (converter.js): por que um bloco ficou como estava
        'código C++ escrito à mão não tem forma simplificada': 'hand-written C++ code has no simplified form',
        'expressão C++ escrita à mão não tem forma simplificada': 'a hand-written C++ expression has no simplified form',
        'switch/case não tem equivalente no Modo Abstrato': 'switch/case has no equivalent in Abstract Mode',
        'operações de bit são recurso do Modo Literal': 'bit operations are a Literal Mode feature',
        'conversão de tipo é recurso do Modo Literal': 'type casting is a Literal Mode feature',
        'shiftOut é recurso do Modo Literal': 'shiftOut is a Literal Mode feature',
        'shiftIn é recurso do Modo Literal': 'shiftIn is a Literal Mode feature',
        'pulseIn cru é recurso do Modo Literal; use "distância em cm"': 'raw pulseIn is a Literal Mode feature; use "distance in cm"',
        'pulseIn cru é recurso do Modo Literal': 'raw pulseIn is a Literal Mode feature',
        'interrupções são recurso do Modo Literal': 'interrupts are a Literal Mode feature',
        'função com tipo de retorno ou parâmetros é recurso do Modo Literal; só a void sem parâmetros vira tarefa':
            'a function with a return type or parameters is a Literal Mode feature; only a void function without parameters becomes a task',
        'funções próprias são recurso do Modo Literal': 'custom functions are a Literal Mode feature',
        'chamada com argumentos, ou de função que não é tarefa, é recurso do Modo Literal':
            'a call with arguments, or to a function that is not a task, is a Literal Mode feature',
        'incluir biblioteca à mão é recurso do Modo Literal': 'including a library by hand is a Literal Mode feature',
        '#define é recurso do Modo Literal': '#define is a Literal Mode feature',
        'vetores são recurso do Modo Literal': 'arrays are a Literal Mode feature',
        'medir distância é uma sequência de comandos; no Modo Literal ela se escreve dentro de uma função':
            'measuring distance is a sequence of commands; in Literal Mode it is written inside a function',
        'a forma literal mudaria a posição da declaração do servo no arquivo gerado; o bloco continua funcionando como está':
            'the literal form would move the servo declaration in the generated file; the block keeps working as it is',
        'os motores viram uma função no arquivo gerado, e função é recurso do Modo Literal':
            'the motors become a function in the generated file, and functions are a Literal Mode feature',
        'a manobra vira uma chamada de função; no Modo Literal ela se escreve como quatro escritas analógicas dentro de uma função':
            'the maneuver becomes a function call; in Literal Mode it is written as four analog writes inside a function',
        'criar a rede é uma sequência de comandos no início do programa; no Modo Literal ela se escreve linha a linha':
            'creating the network is a sequence of commands at the start of the program; in Literal Mode it is written line by line',
        'entrar na rede é uma sequência de comandos; no Modo Literal ela se escreve linha a linha, com a espera na mão':
            'joining the network is a sequence of commands; in Literal Mode it is written line by line, with the wait by hand',
        'fixar o endereço é uma sequência de comandos no início do programa; no Modo Literal ela se escreve linha a linha':
            'fixing the address is a sequence of commands at the start of the program; in Literal Mode it is written line by line',
        'o servidor da página é um bloco de funções no arquivo gerado; no Modo Literal ele se escreve em código livre':
            'the page server is a set of functions in the generated file; in Literal Mode it is written as free code',
        'o botão da página depende do servidor, que no Modo Literal se escreve em código livre':
            'the page button depends on the server, which in Literal Mode is written as free code',
        'mostrar na página depende do servidor, que no Modo Literal se escreve em código livre':
            'showing on the page depends on the server, which in Literal Mode is written as free code',
        'o reticulado da página depende do servidor, que no Modo Literal se escreve em código livre':
            'the page lattice depends on the server, which in Literal Mode is written as free code',
        'atender a página depende do servidor, que no Modo Literal se escreve em código livre':
            'serving the page depends on the server, which in Literal Mode is written as free code',
        'esperar atendendo depende do servidor, que no Modo Literal se escreve em código livre':
            'waiting while serving depends on the server, which in Literal Mode is written as free code',
        'ligar a câmera e abrir o vídeo é um bloco de funções no arquivo gerado; no Modo Literal ele se escreve em código livre':
            'turning on the camera and opening the video is a set of functions in the generated file; in Literal Mode it is written as free code',
        'a câmera na página depende do servidor, que no Modo Literal se escreve em código livre':
            'the camera on the page depends on the server, which in Literal Mode is written as free code',
        'não há bloco simplificado para este comando': 'there is no simplified block for this command',
        'sem I2C livre: os pinos padrão são da câmera': 'no free I2C: the default pins belong to the camera'
    };

    /*
     * Padrões com partes variáveis: {0}, {1}... casam com qualquer texto, e o
     * que casou também passa pelo dicionário (o tipo de pino, por exemplo).
     * Os mais específicos vêm antes dos genéricos.
     */
    const PADROES_EN = [
        ['> Modo {0}: {1} bloco(s) convertido(s)', '> {0} Mode: {1} block(s) converted'],
        ['log salvo em {0}', 'log saved to {0}'],
        ['placa: {0}', 'board: {0}'],
        ['placa detectada na porta: {0} (troque no seletor se quiser)', 'board detected on the port: {0} (change it in the selector if you want)'],
        ['> o suporte à {0} ({1}) não está instalado nesta versão do aplicativo.',
            '> support for the {0} ({1}) is not installed in this version of the app.'],
        ['core {0} ausente', 'core {0} missing'],
        ['não foi possível abrir {0}: {1}', 'could not open {0}: {1}'],
        ['— conectado em {0} a {1} baud —', '— connected to {0} at {1} baud —'],
        ['falha ao enviar: {0}', 'failed to send: {0}'],
        ['não deu para salvar: {0}', 'could not save: {0}'],
        ['não deu para abrir: {0}', 'could not open: {0}'],
        ['binário: {0} (embutido)', 'binary: {0} (bundled)'],
        ['binário: {0} (do sistema)', 'binary: {0} (system)'],
        ['versão: {0}', 'version: {0}'],
        ['erro: {0}', 'error: {0}'],
        ['cores faltando para as placas suportadas: {0}', 'cores missing for the supported boards: {0}'],
        ['série {0}', 'series {0}'],
        ['// erro ao gerar o código: {0}', '// error generating the code: {0}'],

        ['A variável "{0}" é usada mas nunca foi declarada.', 'The variable "{0}" is used but never declared.'],
        ['Entrada "{0}" vazia em {1}', 'Input "{0}" is empty in {1}'],
        ['A tarefa não pode se chamar "{0}": esse nome já é do {1}.', 'The task cannot be named "{0}": that name belongs to {1}.'],
        ['Existem duas tarefas chamadas "{0}"; o programa não compila assim.', 'There are two tasks named "{0}"; the program will not compile like this.'],
        ['Não existe tarefa chamada "{0}".', 'There is no task named "{0}".'],

        ['O pino {0} não serve como {1} na {2}.', 'Pin {0} cannot be used as {1} on the {2}.'],
        ['A {0} não tem EEPROM.update — use EEPROM.write seguido de EEPROM.commit.',
            'The {0} has no EEPROM.update — use EEPROM.write followed by EEPROM.commit.'],
        ['A {0} não tem {1}.', 'The {0} has no {1}.'],
        ['Este comando não existe na {0}.', 'This command does not exist on the {0}.'],
        ['A biblioteca {0} não está disponível para a {1}.', 'The {0} library is not available for the {1}.'],
        ['Na {0} a EEPROM é real: não existe begin() nem commit().', 'On the {0} the EEPROM is real: there is no begin() or commit().'],
        ['Com o WiFi ligado, o ESP32 não lê o pino {0} (ADC2). Use 32, 33, 34, 35, 36 ou 39.',
            'With WiFi on, the ESP32 cannot read pin {0} (ADC2). Use 32, 33, 34, 35, 36 or 39.'],
        ['Dentro do switch só entram blocos case e default — o "{0}" ali dentro nunca vai rodar.',
            'Only case and default blocks go inside the switch — the "{0}" in there will never run.'],
        ['Dentro do Para-Analisador só entram blocos de estado e o "nos demais estados" — o "{0}" ali dentro nunca vai rodar.',
            'Only state blocks and "in all other states" go inside the Para-Analyzer — the "{0}" in there will never run.'],
        ['Em 4 regiões a análise só devolve V, F, T e ⊥. O caso "{0}" nunca vai rodar — passe para 12 regiões ou troque o estado.',
            'In 4 regions the analysis only returns V, F, T and ⊥. The case "{0}" will never run — switch to 12 regions or change the state.'],
        ['Este é um bloco do Modo Literal: {0}. Ele funciona, mas não está na paleta do Modo Abstrato.',
            'This is a Literal Mode block: {0}. It works, but it is not in the Abstract Mode palette.']
    ];

    /*
     * Textos que a placa mostra (página no celular, Monitor serial). São
     * trocados no .ino pronto e só em pedaços que o próprio gerador escreve,
     * nunca em nomes que o aluno deu. A página aceita os nomes dos botões nos
     * dois idiomas (ver gen_abstrato.js), então só muda o que ela exibe.
     */
    const CODIGO_EN = [
        ['<html lang=pt-br>', '<html lang=en>'],
        ['<title>Pilotagem</title>', '<title>Driving</title>'],
        ['<button id=tg>Assumir</button>', '<button id=tg>Take over</button>'],
        ['tg.textContent=camOn?"Liberar":"Assumir"', 'tg.textContent=camOn?"Release":"Take over"'],
        ['md.textContent=camOn?"operador":"LPA2v"', 'md.textContent=camOn?"operator":"PAL2v"'],
        ['<span id=modo>LPA2v</span>', '<span id=modo>PAL2v</span>'],
        ['textContent="sem sinal"', 'textContent="no signal"'],
        ['Serial.print("pagina em http://")', 'Serial.print("page at http://")'],
        ['Serial.println("endereco IP invalido")', 'Serial.println("invalid IP address")'],
        ['Serial.println("falha ao fixar o IP")', 'Serial.println("could not set the fixed IP")'],
        ['Serial.println("video na porta 81, em /video")', 'Serial.println("video on port 81, at /video")'],
        ['Serial.printf("camera nao iniciou (erro 0x%x): confira o cabo flat\\n", e)',
            'Serial.printf("camera did not start (error 0x%x): check the flat cable\\n", e)'],
        ['case LPA_PC: return "Indeterminado";', 'case LPA_PC: return "Indeterminate";']
    ];

    /* ================================================================== */

    function escaparRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const padroes = PADROES_EN.map(([pt, en]) => {
        const partes = pt.split(/\{(\d)\}/);
        let fonte = '^';
        const ordem = [];
        partes.forEach((p, i) => {
            if (i % 2) { fonte += '([\\s\\S]*?)'; ordem.push(Number(p)); } else fonte += escaparRegex(p);
        });
        return { re: new RegExp(fonte + '$'), ordem: ordem, en: en };
    });

    /** Normaliza espaços para casar texto vindo do HTML, que tem quebras de linha. */
    function compacto(s) {
        return s.replace(/\s+/g, ' ').trim();
    }

    /**
     * Traduz um texto. Em português, ou sem tradução conhecida, devolve o
     * próprio texto: nada some da tela por falta de entrada no dicionário.
     */
    function t(texto) {
        if (lang !== 'en' || typeof texto !== 'string' || !texto) return texto;
        if (Object.prototype.hasOwnProperty.call(EN, texto)) return EN[texto];
        for (const p of padroes) {
            const m = texto.match(p.re);
            if (!m) continue;
            const valores = {};
            p.ordem.forEach((n, i) => { valores[n] = t(m[i + 1]); });
            return p.en.replace(/\{(\d)\}/g, (_, n) => valores[n] !== undefined ? valores[n] : '');
        }
        return texto;
    }

    /** Traduz uma definição JSON de bloco, sem tocar em valores que vão para o código. */
    function traduzirBloco(def) {
        Object.keys(def).forEach(k => {
            if (/^message\d+$/.test(k) || k === 'tooltip') def[k] = t(def[k]);
            if (/^args\d+$/.test(k) && Array.isArray(def[k])) {
                def[k].forEach(arg => {
                    if (Array.isArray(arg.options)) {
                        arg.options = arg.options.map(o =>
                            Array.isArray(o) && typeof o[0] === 'string' ? [t(o[0])].concat(o.slice(1)) : o);
                    }
                    if (arg.type === 'field_input' && typeof arg.text === 'string') arg.text = t(arg.text);
                    if (typeof arg.variable === 'string') arg.variable = t(arg.variable);
                });
            }
        });
        return def;
    }

    /** Categorias, rótulos e textos-sombra da caixa de ferramentas. */
    function traduzirToolbox(no) {
        if (lang !== 'en' || !no || typeof no !== 'object') return no;
        if (Array.isArray(no)) { no.forEach(traduzirToolbox); return no; }
        if (no.kind === 'category' && no.name) no.name = t(no.name);
        if ((no.kind === 'label' || no.kind === 'button') && no.text) no.text = t(no.text);
        if (no.fields && typeof no.fields.TEXTO === 'string') no.fields.TEXTO = t(no.fields.TEXTO);
        Object.keys(no).forEach(k => {
            if (no[k] && typeof no[k] === 'object') traduzirToolbox(no[k]);
        });
        return no;
    }

    /** Textos fixos do index.html: nós de texto e os atributos title e placeholder. */
    function traduzirDom(raiz) {
        if (lang !== 'en' || !raiz || !global.document) return;
        const doc = global.document;
        doc.documentElement.setAttribute('lang', 'en');
        const andar = doc.createTreeWalker(raiz, 4 /* NodeFilter.SHOW_TEXT */);
        const nos = [];
        while (andar.nextNode()) nos.push(andar.currentNode);
        nos.forEach(n => {
            const limpo = compacto(n.nodeValue);
            if (!limpo) return;
            const trad = t(limpo);
            if (trad === limpo) return;
            const antes = /^\s/.test(n.nodeValue) ? ' ' : '';
            const depois = /\s$/.test(n.nodeValue) ? ' ' : '';
            n.nodeValue = antes + trad + depois;
        });
        raiz.querySelectorAll('[title],[placeholder]').forEach(el => {
            ['title', 'placeholder'].forEach(a => {
                if (el.hasAttribute(a)) el.setAttribute(a, t(compacto(el.getAttribute(a))));
            });
        });
    }

    /** Comentário de uma linha, sem o "//": traduzido se for do gerador. */
    function comentario(texto, C) {
        const espaco = texto.startsWith(' ') ? ' ' : '';
        const limpo = texto.slice(espaco.length).replace(/\s+$/, '');
        if (Object.prototype.hasOwnProperty.call(C.COMENTARIOS, limpo)) return espaco + C.COMENTARIOS[limpo];
        for (const [re, en] of C.PADROES) {
            if (re.test(limpo)) return espaco + limpo.replace(re, en);
        }
        return texto;
    }

    /**
     * Nomes e comentários do runtime em inglês (ver i18n_codigo.js). Anda pelo
     * código como o compilador: strings, caracteres, strings cruas R"x(...)x"
     * e comentários de bloco passam intactos; só nomes soltos e comentários de
     * linha mudam. Nenhuma quebra de linha entra ou sai.
     */
    function nomesEComentarios(s) {
        const C = global.I18N_CODIGO;
        if (!C) return s;
        const N = C.NOMES;
        let out = '';
        let i = 0;
        const n = s.length;
        while (i < n) {
            const ch = s[i];
            if (ch === '/' && s[i + 1] === '/') {
                let fim = s.indexOf('\n', i);
                if (fim < 0) fim = n;
                out += '//' + comentario(s.slice(i + 2, fim), C);
                i = fim;
            } else if (ch === '/' && s[i + 1] === '*') {
                let fim = s.indexOf('*/', i + 2);
                fim = fim < 0 ? n : fim + 2;
                out += s.slice(i, fim);
                i = fim;
            } else if (ch === '"' || ch === '\'') {
                let j = i + 1;
                while (j < n && s[j] !== ch && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1;
                out += s.slice(i, j + 1);
                i = j + 1;
            } else if (/[0-9]/.test(ch)) {
                let j = i + 1;
                while (j < n && /[0-9A-Za-z_.']/.test(s[j])) j++;
                out += s.slice(i, j);
                i = j;
            } else if (/[A-Za-z_]/.test(ch)) {
                let j = i + 1;
                while (j < n && /[A-Za-z0-9_]/.test(s[j])) j++;
                const palavra = s.slice(i, j);
                if (/^(u8|u|U|L)?R$/.test(palavra) && s[j] === '"') {
                    // string crua: R"delim( ... )delim"
                    const abre = s.indexOf('(', j);
                    const delim = s.slice(j + 1, abre);
                    let fim = s.indexOf(')' + delim + '"', abre);
                    fim = fim < 0 ? n : fim + delim.length + 2;
                    out += s.slice(i, fim);
                    i = fim;
                } else {
                    out += Object.prototype.hasOwnProperty.call(N, palavra) ? N[palavra] : palavra;
                    i = j;
                }
            } else {
                out += ch;
                i++;
            }
        }
        return out;
    }

    /** O .ino já pronto em inglês: textos que a placa exibe, nomes e comentários do runtime. */
    function codigo(fonte) {
        if (lang !== 'en' || typeof fonte !== 'string') return fonte;
        let s = fonte;
        CODIGO_EN.forEach(([pt, en]) => { s = s.split(pt).join(en); });
        return nomesEComentarios(s);
    }

    /* ------------------------------------------------------------------ */
    /* Ganchos                                                             */
    /* ------------------------------------------------------------------ */

    // Toda definição de bloco passa por aqui antes de chegar ao Blockly.
    if (global.Blockly && typeof global.Blockly.defineBlocksWithJsonArray === 'function' && lang === 'en') {
        const original = global.Blockly.defineBlocksWithJsonArray;
        global.Blockly.defineBlocksWithJsonArray = function (lista) {
            return original.call(this, (lista || []).map(traduzirBloco));
        };
    }

    // Mensagens do próprio Blockly (menus de contexto, blocos de variável):
    // o arquivo do idioma entra logo depois deste script, ainda na leitura da página.
    if (global.document && global.document.readyState === 'loading') {
        global.document.write('<script src="vendor/blockly/msg/' +
            (lang === 'en' ? 'en' : 'pt-br') + '.js"><\/script>');
    }

    global.I18N = {
        lang: lang,
        t: t,
        traduzirBloco: traduzirBloco,
        traduzirToolbox: traduzirToolbox,
        traduzirDom: traduzirDom,
        codigo: codigo
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = global.I18N;

})(typeof window !== 'undefined' ? window : global);
