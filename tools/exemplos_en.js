'use strict';
/**
 * Traduções dos exemplos para exemplos/en/ (usado por tools/traduzir_exemplos.js).
 *
 * Três dicionários comuns a todos os exemplos — caixas, textos dos campos e
 * comentários dos blocos — e, por exemplo, só o que é dele: arquivo, nome e,
 * quando há, trocas dentro do código livre.
 *
 * Os comentários são procurados com os espaços e quebras de linha reduzidos
 * a um espaço só; a tradução é quebrada de novo em linhas de até 70 colunas.
 */

/** Exemplos: de → para, nome em inglês e trocas no código livre (blocos de C++ à mão). */
const EXEMPLOS = [
    { de: '01-blink.tbk', para: '01-blink.tbk', nome: 'Blink' },
    { de: '02-potenciometro-plotter.tbk', para: '02-potentiometer-plotter.tbk', nome: 'Potentiometer on the plotter' },
    { de: '03-botao-com-pullup.tbk', para: '03-button-with-pullup.tbk', nome: 'Button with internal pull-up' },
    { de: '04-pwm-com-map.tbk', para: '04-pwm-with-map.tbk', nome: 'PWM controlled by a potentiometer' },
    { de: '05-esp32-wifi.tbk', para: '05-esp32-wifi.tbk', nome: 'ESP32 connecting to WiFi' },
    { de: '06-lpa2v-classificacao.tbk', para: '06-pal2v-part-sorting.tbk', nome: 'PAL2v — part sorting' },
    { de: '07-lpa2v-desvio-emmy.tbk', para: '07-pal2v-emmy-obstacle-avoidance.tbk', nome: 'PAL2v — obstacle avoidance (adapted Emmy, HC-SR04)' },
    { de: '08-lpa2v-esteira-braco.tbk', para: '08-pal2v-conveyor-arm.tbk', nome: 'PAL2v — conveyor, ultrasonic sensors and robotic arm' },
    { de: '09-abstrato-esteira-braco.tbk', para: '09-abstract-conveyor-arm.tbk', nome: 'Abstract — conveyor, ultrasonic sensors and arm' },
    { de: '10-lpa2v-emmy-esp32.tbk', para: '10-pal2v-emmy-esp32.tbk', nome: 'PAL2v — Emmy on the ESP32 (two HC-SR04 and H-bridge)' },
    { de: '11-abstrato-emmy-esp32.tbk', para: '11-abstract-emmy-esp32.tbk', nome: 'Abstract — Emmy on the ESP32' },
    {
        de: '12-lpa2v-emmy-wifi.tbk', para: '12-pal2v-emmy-wifi.tbk', nome: 'PAL2v — Emmy on the ESP32 with the lattice over WiFi',
        codigo: [
            ['lang=pt-br', 'lang=en'],
            ['<title>Emmy - reticulado</title>', '<title>Emmy - lattice</title>'],
            ['"   |   esq "', '"   |   left "'],
            ['" cm    dir "', '" cm    right "'],
            ['"sem sinal"', '"no signal"'],
            ['"falha ao fixar o IP"', '"could not set the fixed IP"'],
            // nomes: palavra inteira, também logo depois de um "\n" escrito no campo
            [/(\\n|\b)fundo\b/g, '$1drawGrid'],
            [/(\\n|\b)pinta\b/g, '$1paint'],
            [/(\\n|\b)servidor\b/g, '$1server'],
            [/(\\n|\b)ligado\b/g, '$1started'],
            [/(\\n|\b)mascara\b/g, '$1mask']
        ]
    },
    { de: '13-abstrato-emmy2-wifi-controle.tbk', para: '13-abstract-emmy2-wifi-control.tbk', nome: 'Emmy 2 robot — WiFi with remote control' },
    { de: '14-abstrato-qualidade-esteira.tbk', para: '14-abstract-conveyor-quality-control.tbk', nome: 'Abstract — quality control on the conveyor' },
    { de: '15-abstrato-carro4x4-camera.tbk', para: '15-abstract-4x4-car-camera.tbk', nome: '4x4 car — PAL2v with camera and operator' },
    { de: '16-abstrato-carro4x4-tarefas.tbk', para: '16-abstract-4x4-car-tasks.tbk', nome: '4x4 car — PAL2v in tasks', manter: true }
];

/** Caixas (variáveis). Também valem dentro do código livre. */
const CAIXAS = {
    leitura: 'reading',
    brilho: 'brightness',
    distEsq: 'distLeft',
    distDir: 'distRight',
    dist1: 'dist1',
    dist2: 'dist2',
    anguloDestino: 'targetAngle',
    LIM_PECA: 'PART_LIMIT',
    UD_RASA: 'UD_SHALLOW',
    UD_ALTA: 'UD_TALL',
    evidencia1: 'evidence1',
    evidencia2: 'evidence2',
    VEL_FRENTE: 'FORWARD_SPEED',
    VEL_LENTA: 'SLOW_SPEED',
    VEL_ARRANQUE: 'START_SPEED',
    VEL_RE: 'REVERSE_SPEED',
    VEL_GIRO: 'TURN_SPEED',
    UD_LONGE: 'UD_FAR',
    UD_PERTO: 'UD_NEAR',
    evidEsq: 'evidLeft',
    evidDir: 'evidRight',
    muEsq: 'muLeft',
    lamDir: 'lamRight',
    estadoAtual: 'currentState',
    semDecidir: 'undecided',
    LIMITE_TRAVA: 'STALL_LIMIT',
    manual: 'manual',
    VELOCIDADE: 'SPEED',
    UD_MIN1: 'UD_MIN1',
    UD_MIN2: 'UD_MIN2',
    UD_MAX1: 'UD_MAX1',
    UD_MAX2: 'UD_MAX2',
    evid1: 'evid1',
    evid2: 'evid2',
    CORTE: 'CUTOFF',
    tentativas: 'attempts',
    desvios: 'swerves',
    LIMITE_PRESO: 'STUCK_LIMIT',
    preso: 'stuck',
    TEMPO_GIRO: 'TURN_TIME'
};

/** Texto dos campos: nomes de função e de tarefa, rótulos, botões, avisos, mensagens. */
const TEXTOS = {
    // funções do Modo Literal
    medirSensores: 'readSensors',
    pararMotores: 'stopMotors',
    andarFrente: 'driveForward',
    andarDevagar: 'driveSlowly',
    darRe: 'backUp',
    girarDireita: 'turnRight',
    desviar: 'swerve',
    desempatar: 'breakTie',
    enviarPagina: 'sendPage',
    atenderWeb: 'serveWeb',
    esperarAtendendo: 'waitServing',
    depositar: 'deposit',
    // objetos de servo
    garra: 'gripper',
    base: 'base',

    // mensagens no Monitor serial
    'pot:': 'pot:',
    'apertado': 'pressed',
    'brilho:': 'brightness:',
    '.': '.',
    'rssi:': 'rssi:',
    'mu:': 'mu:',
    ' lambda:': ' lambda:',
    'esq:': 'left:',
    ' dir:': ' right:',
    ' estado: ': ' state: ',
    ' estado:': ' state:',
    'reticulado em http://': 'lattice at http://',
    'tipo A': 'type A',
    'tipo A (leve discordancia)': 'type A (slight disagreement)',
    'tipo B': 'type B',
    'tipo B (evidencia fraca)': 'type B (weak evidence)',
    'ALARME: sensores em contradicao': 'ALARM: sensors in contradiction',
    'ALARME: contradicao invertida': 'ALARM: inverted contradiction',
    'indefinido — remedir': 'undefined — measure again',
    'V: obstaculo — recuar e girar 90': 'V: obstacle — back up and turn 90',
    'Qv->T: provavel obstaculo — girar 45': 'Qv->T: likely obstacle — turn 45',
    'F: livre — avancar': 'F: clear — go forward',
    'T: contradicao — avancar devagar': 'T: contradiction — go forward slowly',
    'perp: conflito — parar': 'perp: conflict — stop',
    'perp: conflito — recuar e remedir': 'perp: conflict — back up and measure again',
    'demais estados — avancar devagar': 'other states — go forward slowly',
    'peca ALTA -> esquerda': 'TALL part -> left',
    'alta (sensores discordam um pouco) -> esquerda': 'tall (sensors disagree a little) -> left',
    'alta (evidencia fraca) -> esquerda': 'tall (weak evidence) -> left',
    'peca RASA -> direita': 'SHALLOW part -> right',
    'rasa (sensores discordam um pouco) -> direita': 'shallow (sensors disagree a little) -> right',
    'rasa (evidencia fraca) -> direita': 'shallow (weak evidence) -> right',
    'ALARME: sensor 1 ve alta, sensor 2 ve rasa': 'ALARM: sensor 1 sees tall, sensor 2 sees shallow',
    'ALARME: sensor 2 ve alta, sensor 1 ve rasa': 'ALARM: sensor 2 sees tall, sensor 1 sees shallow',
    'altura ambigua — peca segue sem classificar': 'ambiguous height — part goes on unsorted',
    'esteira vazia': 'empty conveyor',

    // rede
    'minha-rede': 'my-network',
    'senha123': 'password123',
    // exemplo 12: a rede da bancada vira um exemplo genérico, como no 05
    'Ale': 'my-network',
    'alelima12': 'password123',
    'emmy2': 'emmy2',
    'carro4x4': 'car4x4',

    // rótulos na página e no plotter
    'esteira': 'conveyor',
    'peca': 'part',
    'alarme': 'alarm',
    'esq': 'left',
    'dir': 'right',
    'estado': 'state',
    'desvios': 'swerves',
    'preso': 'stuck',
    'controle de qualidade': 'quality control',
    'distancia 1': 'distance 1',
    'distancia 2': 'distance 2',
    'contradicao': 'contradiction',
    'certeza real': 'real certainty',
    'aprovada - dentro do padrao': 'approved - within spec',
    'rejeitada - fora do padrao': 'rejected - out of spec',
    'sem certeza real para decidir': 'not enough real certainty to decide',
    'contradicao insistente - rejeita por precaucao': 'persistent contradiction - rejected as a precaution',

    // botões e avisos da página
    'frente': 'forward',
    'tras': 'back',
    'esquerda': 'left',
    'direita': 'right',
    'liberar': 'release',
    'assumir': 'take over',
    'PRESO: dirija pelos botoes e toque liberar': 'STUCK: drive with the buttons and tap release',
    'controle manual: toque liberar para devolver': 'manual control: tap release to hand back',

    // tarefas (exemplo 16)
    'ligar a rede e a câmera': 'start the network and camera',
    'medir as distâncias': 'measure the distances',
    'calcular as evidências': 'compute the evidence',
    'dirigir pela LPA2v': 'drive by PAL2v',
    'conferir se está preso': 'check if stuck',
    'arrancar devagar': 'start slowly',
    'dirigir pelo operador': 'drive by operator',
    'ver se o operador assumiu': 'check if operator took over',
    'mostrar o estado na página': 'show the status on the page'
};

/** Comentários dos blocos (chave com os espaços reduzidos a um). */
const COMENTARIOS = {
    // 01 a 05
    'pino 13 = LED que ja vem soldado na placa: nao precisa de fio nenhum':
        'pin 13 = LED already soldered on the board: no wires needed',
    'Ligacao: pino A0 = cursor (perna do meio) do potenciometro; as outras duas pernas vao em 5V e GND. O Monitor serial tem de estar no mesmo 9600':
        'Wiring: pin A0 = potentiometer wiper (middle leg); the other two legs go to 5V and GND. The Serial monitor must be set to the same 9600',
    'o rotulo "nome:valor" e o que a aba Plotter usa para nomear a curva':
        'the "name:value" label is what the Plotter tab uses to name the curve',
    'analogRead devolve 0 a 1023 (0 V a 5 V)': 'analogRead returns 0 to 1023 (0 V to 5 V)',
    'pino 2 = botao, ligado entre o pino e o GND (so dois fios). INPUT_PULLUP usa o resistor de dentro do chip, entao a leitura fica invertida: solto le HIGH, apertado le LOW':
        'pin 2 = button, wired between the pin and GND (just two wires). INPUT_PULLUP uses the resistor inside the chip, so the reading is inverted: released reads HIGH, pressed reads LOW',
    'pino 13 = LED da placa': 'pin 13 = on-board LED',
    'Ligacao: A0 = cursor do potenciometro | pino 9 = LED com resistor de 220 ohm para o GND. O 9 e um dos pinos com ~ na placa, os unicos que aceitam analogWrite (PWM) na Uno: 3, 5, 6, 9, 10 e 11':
        'Wiring: A0 = potentiometer wiper | pin 9 = LED with a 220 ohm resistor to GND. Pin 9 is one of the pins marked ~ on the board, the only ones that accept analogWrite (PWM) on the Uno: 3, 5, 6, 9, 10 and 11',
    'o potenciometro entrega 0..1023, o PWM aceita 0..255: map converte':
        'the potentiometer gives 0..1023, PWM takes 0..255: map converts',
    'A ESP32 nao usa pino nenhum aqui: o radio WiFi e interno. 115200 e o padrao dela — o Monitor serial precisa do mesmo valor, senao a tela vem embaralhada':
        'The ESP32 uses no pins here: the WiFi radio is internal. 115200 is its default — the Serial monitor needs the same value, otherwise the screen shows garbage',
    'troque pelo nome e senha da sua rede (2,4 GHz: a ESP32 nao ve 5 GHz)':
        'replace with your network name and password (2.4 GHz: the ESP32 cannot see 5 GHz)',

    // 06
    'Ligacao: A0 e A1 = dois sensores de altura de SAIDA ANALOGICA (0-5 V), medindo a MESMA peca - e por medirem o mesmo que a discordancia entre eles e contradicao, e nao ruido. A leitura 0..1023 vira milimetros pelo map; o Universo de Discurso vai de 20 mm a 60 mm. Saidas: pino 7 = desvio para o destino A':
        'Wiring: A0 and A1 = two height sensors with ANALOG OUTPUT (0-5 V), measuring the SAME part - and because they measure the same thing, the disagreement between them is contradiction, not noise. The 0..1023 reading becomes millimeters through map; the Universe of Discourse goes from 20 mm to 60 mm. Outputs: pin 7 = diverter to destination A',
    'pino 8 = desvio para o destino B': 'pin 8 = diverter to destination B',
    'pino 9 = rejeito (peca fora de especificacao)': 'pin 9 = reject (part out of spec)',

    // 07 e 10: Emmy no Literal
    'sensor esquerdo: pulso de 10 us no trigger (pino 2), eco no pino 3':
        'left sensor: 10 us pulse on the trigger (pin 2), echo on pin 3',
    'ida e volta do som: 58 us por centimetro. O cast evita divisao inteira':
        'sound round trip: 58 us per centimeter. The cast avoids integer division',
    'sensor direito: trigger no pino 4, eco no pino 8': 'right sensor: trigger on pin 4, echo on pin 8',
    'sem eco o pulseIn devolve 0. Zero centimetro seria "obstaculo colado" - o oposto do que aconteceu. Vira 400 cm, que e o alcance maximo do sensor e significa "nao tem nada ai"':
        'with no echo pulseIn returns 0. Zero centimeters would mean "obstacle touching" - the opposite of what happened. It becomes 400 cm, which is the sensor maximum range and means "nothing there"',
    'velocidade zero nos dois: ENA (pino 5) e ENB (pino 6) do L298N':
        'zero speed on both: ENA (pin 5) and ENB (pin 6) of the L298N',
    'sentido do motor esquerdo: IN1 alto e IN2 baixo = para a frente':
        'left motor direction: IN1 high and IN2 low = forward',
    'sentido do motor direito: IN3 alto e IN4 baixo': 'right motor direction: IN3 high and IN4 low',
    'mesmo sentido, metade da velocidade: e assim que se dilui contradicao':
        'same direction, half the speed: this is how contradiction is diluted',
    'os dois invertidos: IN1 baixo e IN2 alto': 'both reversed: IN1 low and IN2 high',
    'esquerdo para a frente e direito para tras: o carrinho gira no proprio eixo. Com roda boba na frente nao ha o que esterçar, entao curva e diferenca entre as duas rodas de tras':
        'left forward and right backward: the cart spins on its own axis. With a caster wheel at the front there is nothing to steer, so turning is the difference between the two rear wheels',
    'esquerdo para a frente e direito para tras: o carrinho gira no proprio eixo. Com roda boba na frente nao ha o que estercar, entao curva e diferenca entre as duas rodas de tras':
        'left forward and right backward: the cart spins on its own axis. With a caster wheel at the front there is nothing to steer, so turning is the difference between the two rear wheels',
    'Robo Emmy adaptado (Da Silva Filho). Proposicao: "existe obstaculo a frente". Chassi: carrinho de 2 motores traseiros com roda boba na frente. Sensores: HC-SR04 esquerdo trig 2 / echo 3, direito trig 4 / echo 8, lado a lado apontados para a frente. Ponte H L298N: ENA 5 e ENB 6 (velocidade, tem de ser pino PWM), IN1 7 / IN2 12 (sentido do motor esquerdo), IN3 9 / IN4 10 (sentido do motor direito). Alimente os motores pela fonte do L298N, nao pelo 5V do Arduino':
        'Adapted Emmy robot (Da Silva Filho). Proposition: "there is an obstacle ahead". Chassis: cart with 2 rear motors and a caster wheel at the front. Sensors: HC-SR04 left trig 2 / echo 3, right trig 4 / echo 8, side by side pointing forward. L298N H-bridge: ENA 5 and ENB 6 (speed, must be PWM pins), IN1 7 / IN2 12 (left motor direction), IN3 9 / IN4 10 (right motor direction). Power the motors from the L298N supply, not from the Arduino 5V',
    'nasce parado': 'starts stopped',
    'as duas distancias no Monitor, para conferir o alinhamento dos sensores':
        'both distances on the Monitor, to check the sensor alignment',
    'A MESMA anotacao que o Para-Analisador vai usar logo abaixo, mandada para a aba Reticulado: mu = evidencia do sensor esquerdo, lambda = complemento da evidencia do direito. Sao contas sobre as distancias ja guardadas, entao nao dispara os sensores de novo e o ponto plotado e exatamente o que decide o movimento':
        'The SAME annotation the Para-Analyzer uses right below, sent to the Lattice tab: mu = evidence from the left sensor, lambda = complement of the evidence from the right one. These are calculations on the distances already stored, so the sensors are not fired again and the plotted point is exactly what decides the movement',
    'Universo de Discurso invertido de proposito: 80 cm (longe, sem evidencia) a 10 cm (colado, evidencia total). Como a2 < a1, a valoracao ja sai invertida sozinha - perto vira evidencia alta':
        'Universe of Discourse inverted on purpose: 80 cm (far, no evidence) to 10 cm (touching, full evidence). Since a2 < a1, the valuation comes out inverted by itself - near becomes high evidence',
    'os dois sensores concordam que ha obstaculo: recua e gira no eixo':
        'both sensors agree there is an obstacle: back up and spin in place',
    'T3 = 2 s: o giro de 90 graus do artigo': 'T3 = 2 s: the 90 degree turn from the paper',
    'evidencia alta mas com discordancia: desvio parcial em vez de 90 graus':
        'high evidence but with disagreement: partial swerve instead of 90 degrees',
    'T2 = 1,5 s: meio giro, ~45 graus': 'T2 = 1.5 s: half turn, ~45 degrees',
    'os dois concordam que nao ha nada: toca em frente': 'both agree there is nothing: keep going',
    'os dois veem coisas incompativeis. Contradicao alta nao manda parar: manda diluir a contradicao, andando devagar para as proximas leituras chegarem mais perto e desempatarem':
        'the two see incompatible things. High contradiction does not mean stop: it means dilute the contradiction, moving slowly so the next readings get closer and break the tie',
    'T1 = 0,75 s': 'T1 = 0.75 s',
    'o perpendicular e a contradicao espelhada do T (Gct = mu1 - mu2), nao ausencia de leitura: um sensor ve obstaculo e o outro ve caminho livre. Um dos dois esta errado - na duvida, para':
        'perpendicular is the mirrored contradiction of T (Gct = mu1 - mu2), not a missing reading: one sensor sees an obstacle and the other sees a free path. One of the two is wrong - when in doubt, stop',
    'os outros 7 estados do reticulado: evidencia fraca demais para decidir, entao anda devagar e mede de novo':
        'the other 7 lattice states: evidence too weak to decide, so move slowly and measure again',
    'respiro entre disparos do ultrassom': 'pause between ultrasonic pings',

    // 08
    'abaixo disto ha peca sob o sensor; acima e a lona da esteira (10 cm)':
        'below this there is a part under the sensor; above it is the conveyor belt (10 cm)',
    'Universo de Discurso, limite inferior: peca rasa (8 cm) -> evidencia ~0':
        'Universe of Discourse, lower limit: shallow part (8 cm) -> evidence ~0',
    'limite superior: peca alta (6 cm) -> evidencia ~1. Mais alta, mais perto':
        'upper limit: tall part (6 cm) -> evidence ~1. Taller means closer',
    'garra: 60 graus = aberta. A esteira ja chega parada: quem a para e o portao de presenca, antes de medir':
        'gripper: 60 degrees = open. The conveyor arrives already stopped: the presence gate stops it, before measuring',
    'base: 90 graus = centro, sobre a esteira': 'base: 90 degrees = center, over the conveyor',
    '15 graus = fechada: pegou a peca': '15 degrees = closed: it grabbed the part',
    'abre: soltou no destino': 'open: released at the destination',
    'volta ao centro para o proximo ciclo': 'back to the center for the next cycle',
    'Ligacao: 2/3 = ultrassom 1 (trig/echo) | 4/8 = ultrassom 2 | pino 7 = rele da esteira | pino 9 = servo da base | pino 10 = servo da garra':
        'Wiring: 2/3 = ultrasonic 1 (trig/echo) | 4/8 = ultrasonic 2 | pin 7 = conveyor relay | pin 9 = base servo | pin 10 = gripper servo',
    'para a esteira antes de medir e de a garra descer': 'stop the conveyor before measuring and before the gripper comes down',
    'deixa a peca acomodar': 'let the part settle',
    'remede com tudo parado: e esta leitura que vale': 'measure again with everything stopped: this is the reading that counts',
    'religa a esteira, tenha sido qual for o estado': 'restart the conveyor, whatever the state was',

    // 09
    'Ligacao: pino 7 = rele da esteira | 2/3 = ultrassom 1 (trig/echo) | 4/8 = ultrassom 2 | 9 = servo da base | 10 = servo da garra':
        'Wiring: pin 7 = conveyor relay | 2/3 = ultrasonic 1 (trig/echo) | 4/8 = ultrasonic 2 | 9 = base servo | 10 = gripper servo',
    'liga a esteira': 'start the conveyor',
    'abaixo de 9 cm ha peca; acima e a lona da esteira, a 10 cm':
        'below 9 cm there is a part; above it is the conveyor belt, at 10 cm',
    'Universo de Discurso: 8,5 cm = peca rasa, evidencia perto de 0':
        'Universe of Discourse: 8.5 cm = shallow part, evidence near 0',
    '5,5 cm = peca alta, evidencia perto de 1. Mais alta, mais perto':
        '5.5 cm = tall part, evidence near 1. Taller means closer',
    'sensor 1 (trig 2, echo 3): so para ver se chegou peca': 'sensor 1 (trig 2, echo 3): only to see whether a part arrived',
    'so analisa quando ha peca: esteira vazia daria F (peca rasa)':
        'only analyze when there is a part: an empty conveyor would give F (shallow part)',
    'pino 7 = rele. Para a esteira antes de medir e de a garra descer':
        'pin 7 = relay. Stop the conveyor before measuring and before the gripper comes down',
    'remede parado: e esta leitura que vale': 'measure again while stopped: this is the reading that counts',
    'evita o eco cruzado entre os dois sensores': 'avoids cross-echo between the two sensors',
    'sensor 2 (trig 4, echo 8), meio centimetro a frente do 1': 'sensor 2 (trig 4, echo 8), half a centimeter ahead of sensor 1',
    'normaliza a distancia do sensor 1 no Universo de Discurso': 'normalize the sensor 1 distance over the Universe of Discourse',
    'sensor 2, mesmo Universo de Discurso': 'sensor 2, same Universe of Discourse',
    'mu = sensor 1, lambda = 1 - sensor 2 (o bloco faz o complemento)':
        'mu = sensor 1, lambda = 1 - sensor 2 (the block takes the complement)',
    'V: os dois sensores veem peca alta -> esquerda': 'V: both sensors see a tall part -> left',
    'pino 10 = garra. 60 graus = aberta': 'pin 10 = gripper. 60 degrees = open',
    'pino 9 = base. 90 graus = centro, sobre a esteira': 'pin 9 = base. 90 degrees = center, over the conveyor',
    'gira para a esquerda (170 graus)': 'turn to the left (170 degrees)',
    'abre: soltou a peca no destino': 'open: released the part at the destination',
    'F: os dois veem peca rasa -> direita': 'F: both see a shallow part -> right',
    'gira para a direita (10 graus)': 'turn to the right (10 degrees)',
    'esteira ja esta parada: segura 3 s para o operador olhar':
        'the conveyor is already stopped: hold 3 s for the operator to look',
    'respiro entre leituras do ultrassom': 'pause between ultrasonic readings',

    // 10
    'PWM de 0 a 255. 150 = ~60 por cento do curso: caminho livre':
        'PWM from 0 to 255. 150 = ~60 percent of the range: free path',
    'a marcha do estado T. Abaixo de ~70 o L298N nao tira o motor do lugar':
        'the speed for state T. Below ~70 the L298N cannot get the motor moving',
    'o empurrao de 80 ms que tira o motor da inercia antes da marcha lenta':
        'the 80 ms kick that gets the motor out of inertia before the slow speed',
    'o giro precisa vencer o atrito das duas rodas em sentidos opostos':
        'turning has to overcome the friction of the two wheels in opposite directions',
    'sensor esquerdo: pulso de 10 us no trigger (D26), eco em D27':
        'left sensor: 10 us pulse on the trigger (D26), echo on D27',
    'o eco do sensor 1 ainda viaja quando o 2 dispara: sem esta pausa o segundo sensor cronometra o eco do primeiro':
        'the echo from sensor 1 is still traveling when sensor 2 fires: without this pause the second sensor times the echo of the first',
    'sensor direito: trigger em D32, eco em D33': 'right sensor: trigger on D32, echo on D33',
    'IN1 D2 / IN2 D4 = motor esquerdo | IN3 D18 / IN4 D19 = direito. ENA e ENB estao nos jumpers de 5 V, sempre habilitados: a velocidade sai do proprio pino de sentido. Os quatro em 0: parado. Sempre analogWrite nestes pinos, nunca digitalWrite - no ESP32 o analogWrite prende o pino ao LEDC e a escrita digital nao pegaria':
        'IN1 D2 / IN2 D4 = left motor | IN3 D18 / IN4 D19 = right. ENA and ENB are on the 5 V jumpers, always enabled: the speed comes from the direction pin itself. All four at 0: stopped. Always analogWrite on these pins, never digitalWrite - on the ESP32 analogWrite ties the pin to the LEDC and a digital write would not take',
    'motor esquerdo: IN1 com PWM e IN2 em zero = frente, na velocidade de VEL_FRENTE. Trocar os dois de papel inverte o sentido':
        'left motor: IN1 with PWM and IN2 at zero = forward, at FORWARD_SPEED. Swapping their roles reverses the direction',
    'motor direito: IN3 com PWM e IN4 em zero': 'right motor: IN3 with PWM and IN4 at zero',
    'os dois lados trocados: o PWM vai para IN2 e IN4': 'both sides swapped: the PWM goes to IN2 and IN4',
    'o empurrao: sair do zero exige mais torque que seguir andando. Sem estes 80 ms o motor so zumbia em VEL_LENTA e o robo parecia travar sempre que a analise dava T':
        'the kick: starting from zero takes more torque than keeping moving. Without these 80 ms the motor only hummed at SLOW_SPEED and the robot seemed to freeze whenever the analysis gave T',
    'assenta na marcha lenta: e assim que se dilui a contradicao - aproximar-se devagar ate as duas leituras desempatarem':
        'settle at the slow speed: this is how contradiction is diluted - approaching slowly until the two readings break the tie',
    'Robo Emmy adaptado (Da Silva Filho) no ESP32 DevKit. Proposicao: "existe obstaculo a frente". Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33. Ponte H: IN1/IN2 D2 / D4 (esquerdo), IN3/IN4 D18 / D19 (direito). O echo do HC-SR04 sai em 5 V e o ESP32 e de 3,3 V: divisor resistivo ou conversor de nivel em D27 e D33. Alimente os motores pela fonte da ponte H, nao pelo ESP32':
        'Adapted Emmy robot (Da Silva Filho) on the ESP32 DevKit. Proposition: "there is an obstacle ahead". Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33. H-bridge: IN1/IN2 D2 / D4 (left), IN3/IN4 D18 / D19 (right). The HC-SR04 echo is 5 V and the ESP32 is 3.3 V: resistive divider or level shifter on D27 and D33. Power the motors from the H-bridge supply, not from the ESP32',
    'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido a velocidade cheia - mexeu em VEL_GIRO, remeca o angulo':
        'T3 = 2 s: the 90 degree turn from the paper. This time was measured at full speed - if you change TURN_SPEED, measure the angle again',
    'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido a velocidade cheia - mexeu em VEL_GIRO, remeça o angulo':
        'T3 = 2 s: the 90 degree turn from the paper. This time was measured at full speed - if you change TURN_SPEED, measure the angle again',
    'o perpendicular e a contradicao espelhada do T (Gct = mu1 - mu2), nao ausencia de leitura: um sensor ve obstaculo e o outro ve caminho livre. Um dos dois esta errado. Parar aqui era uma decisao que NAO mudava a evidencia: parado, os sensores repetiam a mesma discordancia, o ciclo seguinte caia em perpendicular de novo e o robo ficava ali para sempre. Meia manobra muda a geometria e permite medir outra vez':
        'perpendicular is the mirrored contradiction of T (Gct = mu1 - mu2), not a missing reading: one sensor sees an obstacle and the other sees a free path. One of the two is wrong. Stopping here was a decision that did NOT change the evidence: stopped, the sensors repeated the same disagreement, the next cycle fell into perpendicular again and the robot stayed there forever. A half maneuver changes the geometry and allows measuring again',

    // 11
    'Emmy no ESP32. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 | ponte H IN1/IN2 D2 / D4 (motor esquerdo), IN3/IN4 D18 / D19 (direito). Universo de Discurso: 80 cm = caminho livre, evidencia perto de 0':
        'Emmy on the ESP32. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 | H-bridge IN1/IN2 D2 / D4 (left motor), IN3/IN4 D18 / D19 (right). Universe of Discourse: 80 cm = free path, evidence near 0',
    '10 cm = obstaculo colado, evidencia perto de 1. Como este numero e menor que o outro, a valoracao ja sai invertida sozinha':
        '10 cm = obstacle touching, evidence near 1. Since this number is smaller than the other, the valuation comes out inverted by itself',
    'intensidade de 0 a 100 %. 60 % = caminho livre': 'intensity from 0 to 100 %. 60 % = free path',
    'a marcha do estado T. Abaixo de ~28 % a maioria dos motores com L298N nao sai do lugar: a ponte ja come de 1,5 a 2 V':
        'the speed for state T. Below ~28 % most motors with an L298N do not move: the bridge itself eats 1.5 to 2 V',
    'IN1 2 / IN2 4 = motor esquerdo | IN3 18 / IN4 19 = motor direito. Os quatro em 0 %: parado':
        'IN1 2 / IN2 4 = left motor | IN3 18 / IN4 19 = right motor. All four at 0 %: stopped',
    'sensor esquerdo (trig D26, echo D27)': 'left sensor (trig D26, echo D27)',
    'evita o eco cruzado: o eco do primeiro sensor ainda esta no ar':
        'avoids cross-echo: the echo from the first sensor is still in the air',
    'sensor direito (trig D32, echo D33)': 'right sensor (trig D32, echo D33)',
    'as duas distancias no Monitor, para conferir o alinhamento': 'both distances on the Monitor, to check the alignment',
    'normaliza a distancia do sensor esquerdo no Universo de Discurso':
        'normalize the left sensor distance over the Universe of Discourse',
    'sensor direito, mesmo Universo de Discurso': 'right sensor, same Universe of Discourse',
    'mu = sensor esquerdo, lambda = 1 - sensor direito (o bloco faz o complemento). Gc = consenso dos dois; Gct = discordancia entre eles':
        'mu = left sensor, lambda = 1 - right sensor (the block takes the complement). Gc = consensus of the two; Gct = disagreement between them',
    'V: os dois veem obstaculo -> recua e gira 90 graus': 'V: both see an obstacle -> back up and turn 90 degrees',
    'os dois lados trocados: marcha a re': 'both sides swapped: reverse',
    'esquerdo para a frente e direito para tras: gira no proprio eixo':
        'left forward and right backward: spin on its own axis',
    'F: os dois veem caminho livre -> toca em frente': 'F: both see a free path -> keep going',
    'IN1 com intensidade e IN2 em zero (e IN3/IN4 igual): os dois motores para a frente, na velocidade da caixa VEL_FRENTE':
        'IN1 with intensity and IN2 at zero (and the same for IN3/IN4): both motors forward, at the speed in the FORWARD_SPEED box',
    'T: contradicao -> avanca devagar para as leituras desempatarem':
        'T: contradiction -> move forward slowly so the readings break the tie',
    'o empurrao: tira o motor da inercia antes de assentar na marcha lenta':
        'the kick: gets the motor out of inertia before settling at the slow speed',
    'assenta na marcha lenta: e assim que se dilui contradicao': 'settle at the slow speed: this is how contradiction is diluted',
    'perpendicular: um ve obstaculo e o outro ve livre. Um dos dois esta errado. Parar aqui era uma decisao que NAO mudava a evidencia: parado, os sensores repetiam a mesma discordancia e o robo ficava ali para sempre. Meia manobra muda a geometria e permite remedir':
        'perpendicular: one sees an obstacle and the other sees it clear. One of the two is wrong. Stopping here was a decision that did NOT change the evidence: stopped, the sensors repeated the same disagreement and the robot stayed there forever. A half maneuver changes the geometry and allows measuring again',

    // 12
    '0,5 e o valor de "sem informacao" da LPA2v: antes da primeira medida as duas ja valem exatamente o que significa nao saber':
        '0.5 is the "no information" value in PAL2v: before the first measurement both already hold exactly what not knowing means',
    'codigo do estado no reticulado, o mesmo que a pagina mostra por extenso':
        'code of the state on the lattice, the same one the page shows by name',
    'ciclos seguidos sem cair em V nem em F. Passou de LIMITE_TRAVA, desvia':
        'consecutive cycles without reaching V or F. Past STALL_LIMIT, it swerves',
    'PWM de 0 a 255. Baixe este primeiro se o carro estiver rapido demais':
        'PWM from 0 to 255. Lower this one first if the car is too fast',
    'o empurrao que tira o motor da inercia: 80 ms antes da marcha lenta, 120 ms antes do giro':
        'the kick that gets the motor out of inertia: 80 ms before the slow speed, 120 ms before turning',
    'a pagina inteira mora no flash do ESP32: sem internet, sem CDN, sem nada para instalar no celular. So abrir o IP que o Monitor mostrou':
        'the whole page lives in the ESP32 flash: no internet, no CDN, nothing to install on the phone. Just open the IP the Monitor showed',
    'o losango e a fronteira do que e alcancavel: |Gc| + |Gct| <= 1':
        'the diamond is the boundary of what is reachable: |Gc| + |Gct| <= 1',
    'tracejado em +-0,5 = os valores de controle. As diagonais separam os nao-extremos. E a mesma geometria da aba Reticulado do TaskArduino':
        'dashed at +-0.5 = the control values. The diagonals separate the non-extreme states. It is the same geometry as the IDE Lattice tab',
    'o rastro guarda os ultimos 120 pontos: da para ver a trajetoria da decisao dentro do reticulado, nao so o ponto do instante':
        'the trail keeps the last 120 points: you can see the path of the decision inside the lattice, not just the current point',
    'o servidor e static aqui dentro porque so esta funcao precisa dele - nasce na primeira chamada e vive o programa inteiro. Sem cliente na fila, a funcao volta na hora: o robo nao espera ninguem':
        'the server is static in here because only this function needs it - it is created on the first call and lives for the whole program. With no client waiting, the function returns at once: the robot waits for no one',
    'a rota /d devolve a anotacao crua, em uma linha: mu, lambda, codigo do estado, nome do estado e as duas distancias. O desenho e do navegador':
        'the /d route returns the raw annotation, on one line: mu, lambda, state code, state name and both distances. The drawing is done by the browser',
    'delay() puro deixaria a pagina muda durante os 2 s do giro. Esta espera atende o navegador enquanto o robo manobra - o ponto continua andando':
        'a plain delay() would leave the page silent during the 2 s turn. This wait serves the browser while the robot maneuvers - the point keeps moving',
    'sem eco o pulseIn devolve 0. Zero centimetro seria "obstaculo colado" - o oposto do que aconteceu. Vira 400 cm: "nao tem nada ai"':
        'with no echo pulseIn returns 0. Zero centimeters would mean "obstacle touching" - the opposite of what happened. It becomes 400 cm: "nothing there"',
    'IN1 D2 / IN2 D4 = motor esquerdo | IN3 D18 / IN4 D19 = direito. Sempre analogWrite nestes quatro, nunca digitalWrite: no ESP32 o analogWrite prende o pino ao LEDC e a escrita digital nao pegaria':
        'IN1 D2 / IN2 D4 = left motor | IN3 D18 / IN4 D19 = right. Always analogWrite on these four, never digitalWrite: on the ESP32 analogWrite ties the pin to the LEDC and a digital write would not take',
    'IN1 com PWM e IN2 em zero = frente. Trocar os dois inverte o sentido':
        'IN1 with PWM and IN2 at zero = forward. Swapping the two reverses the direction',
    'assenta na marcha lenta: e assim que se dilui a contradicao': 'settle at the slow speed: this is how contradiction is diluted',
    'esquerdo para a frente e direito para tras: gira no proprio eixo. Comeca com o empurrao, como o andarDevagar: girar parado arrasta as rodas de lado e pede mais torque que andar reto. Sem ele o Qv->T, que gira a partir do robo parado, so fazia o motor zumbir':
        'left forward and right backward: spin on its own axis. It starts with the kick, like driveSlowly: turning from a standstill drags the wheels sideways and takes more torque than going straight. Without it Qv->T, which turns from a stopped robot, only made the motor hum',
    'assenta na velocidade de giro': 'settle at the turning speed',
    'a manobra do V: para, recua e gira 90 graus': 'the V maneuver: stop, back up and turn 90 degrees',
    'T3 = 2 s: o giro de 90 graus do artigo. O tempo depende de VEL_GIRO - mexeu na velocidade, remeca o angulo com o carro no chao':
        'T3 = 2 s: the 90 degree turn from the paper. The time depends on TURN_SPEED - if you change the speed, measure the angle again with the car on the floor',
    'a saida do ⊥: meia manobra. Parar seria uma decisao que nao muda a evidencia - parado, os sensores repetem a mesma discordancia e o estado se repete para sempre. Recuar e girar muda a geometria':
        'the way out of ⊥: a half maneuver. Stopping would be a decision that does not change the evidence - stopped, the sensors repeat the same disagreement and the state repeats forever. Backing up and turning changes the geometry',
    'Robo Emmy adaptado (Da Silva Filho) no ESP32 DevKit, com o reticulado servido por WiFi. Proposicao: "existe obstaculo a frente". Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33. Ponte H: IN1/IN2 D2 / D4 (esquerdo), IN3/IN4 D18 / D19 (direito). O echo do HC-SR04 sai em 5 V e o ESP32 e de 3,3 V: divisor resistivo ou conversor de nivel em D27 e D33':
        'Adapted Emmy robot (Da Silva Filho) on the ESP32 DevKit, with the lattice served over WiFi. Proposition: "there is an obstacle ahead". Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33. H-bridge: IN1/IN2 D2 / D4 (left), IN3/IN4 D18 / D19 (right). The HC-SR04 echo is 5 V and the ESP32 is 3.3 V: resistive divider or level shifter on D27 and D33',
    'IP fixo: o robo sempre atende no mesmo endereco, sem precisar do Monitor Serial para descobrir qual IP o roteador deu. Os tres primeiros numeros tem de ser os da sua rede (veja o IP do celular) e o ultimo, um que ninguem use. Gateway e DNS = IP do roteador. Tem de vir ANTES do WiFi.begin':
        'Fixed IP: the robot always answers at the same address, with no need for the Serial Monitor to find out which IP the router gave. The first three numbers must be those of your network (check the phone IP) and the last one, a number nobody uses. Gateway and DNS = router IP. It must come BEFORE WiFi.begin',
    'a rede da bancada. A ESP32 nao ve 5 GHz: tem de ser a rede de 2,4 GHz':
        'the test bench network. The ESP32 cannot see 5 GHz: it must be the 2.4 GHz network',
    'segura aqui ate conectar - com os motores ja parados, entao um erro de senha deixa o carro quieto em vez de solto':
        'hold here until connected - with the motors already stopped, so a wrong password leaves the car still instead of loose',
    'confirma o IP fixo - e o endereco que voce abre no celular': 'confirms the fixed IP - it is the address you open on the phone',
    'uma passada no servidor por ciclo, alem das que a espera faz': 'one pass through the server per cycle, besides the ones the wait makes',
    'lambda = 1 - mu2. Com esse complemento, Gc = mu1 + mu2 - 1 e o consenso dos dois sensores e Gct = mu1 - mu2 e a discordancia':
        'lambda = 1 - mu2. With this complement, Gc = mu1 + mu2 - 1 is the consensus of the two sensors and Gct = mu1 - mu2 is the disagreement',
    'o estado sai da MESMA anotacao que decide logo abaixo: e ele que a pagina mostra por extenso':
        'the state comes from the SAME annotation that decides right below: it is the one the page shows by name',
    'com o cabo plugado, esta linha continua alimentando a aba Reticulado do TaskArduino. Sem cabo, quem mostra e a pagina do proprio robo':
        'with the cable plugged in, this line keeps feeding the IDE Lattice tab. Without the cable, the robot own page shows it',
    'MU e LAMBDA entram prontos: e o mesmo par que foi para a pagina e para o Monitor. Nao ha um calculo "para ver" e outro "para andar"':
        'MU and LAMBDA come in ready: it is the same pair that went to the page and to the Monitor. There is no calculation "for showing" and another "for driving"',
    'os dois sensores concordam que ha obstaculo: decidiu, zera o contador':
        'both sensors agree there is an obstacle: it decided, so reset the counter',
    'evidencia alta mas com discordancia: desvio parcial, nao 90 graus':
        'high evidence but with disagreement: partial swerve, not 90 degrees',
    'os dois veem coisas incompativeis. Contradicao alta nao manda parar: manda diluir a contradicao, chegando mais perto para desempatar':
        'the two see incompatible things. High contradiction does not mean stop: it means dilute the contradiction, getting closer to break the tie',
    'o perpendicular e a contradicao espelhada do T: um sensor ve obstaculo e o outro ve caminho livre. Um dos dois esta errado - e a unica forma de descobrir qual e mudar de lugar e medir de novo':
        'perpendicular is the mirrored contradiction of T: one sensor sees an obstacle and the other sees a free path. One of the two is wrong - and the only way to find out which is to move and measure again',
    'os demais estados do reticulado: evidencia fraca demais para decidir, entao anda devagar e mede de novo':
        'the other lattice states: evidence too weak to decide, so move slowly and measure again',
    'o seguro: ciclos demais sem cair em V nem em F significa que a geometria nao esta mudando sozinha. Desvia por conta propria':
        'the safeguard: too many cycles without reaching V or F means the geometry is not changing by itself. Swerve on its own',
    'so cresce: V e F zeram o contador nos proprios casos': 'only grows: V and F reset the counter in their own cases',

    // 13
    'Emmy 2. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 | ponte H IN1/IN2 D2 / D4 (motor esquerdo), IN3/IN4 D18 / D19 (direito). Este bloco diz isso uma vez; depois so se fala em frente, re e giro':
        'Emmy 2. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 | H-bridge IN1/IN2 D2 / D4 (left motor), IN3/IN4 D18 / D19 (right). This block says it once; after that it is only forward, reverse and turn',
    'Universo de Discurso: 80 cm = caminho livre, evidencia perto de 0':
        'Universe of Discourse: 80 cm = free path, evidence near 0',
    '0,5 e o valor de "sem informacao" da LPA2v: antes da primeira medida as duas caixas ja valem exatamente o que significa nao saber':
        '0.5 is the "no information" value in PAL2v: before the first measurement both boxes already hold exactly what not knowing means',
    'ciclos seguidos sem cair em V nem em F. Passou de LIMITE_TRAVA, o robo desvia por conta propria: e o seguro contra qualquer canto do reticulado que a gente nao previu':
        'consecutive cycles without reaching V or F. Past STALL_LIMIT, the robot swerves on its own: it is the safeguard against any corner of the lattice we did not foresee',
    'vale 1 no ciclo em que algum botao da pagina esta apertado. E o que faz o dedo passar na frente da decisao automatica':
        'is 1 in the cycle when some page button is pressed. It is what puts the finger ahead of the automatic decision',
    'intensidade de 0 a 100 %. UMA caixa para o andar do robo: a mesma velocidade do botao frente e da marcha lenta do estado T. Na bancada as duas acabaram no mesmo numero: 29,4 % = 75 de 255':
        'intensity from 0 to 100 %. ONE box for how the robot moves: the same speed for the forward button and for the slow speed of state T. On the test bench both ended up at the same number: 29.4 % = 75 of 255',
    '43,1 % = 110 de 255. O empurrao de 80 ms que tira o motor da inercia: abaixo de ~100 o L298N nao vence o atrito parado. TODA arrancada passa por aqui - sem isso o robo fica zumbindo no lugar quando o ciclo anterior terminou com os motores parados':
        '43.1 % = 110 of 255. The 80 ms kick that gets the motor out of inertia: below ~100 the L298N cannot overcome static friction. EVERY start goes through here - without it the robot just hums in place when the previous cycle ended with the motors stopped',
    'a placa cria a propria rede, aberta e sem senha, chamada "emmy2". No celular: conectar na rede emmy2 e abrir http://192.168.4.1 Esse endereco nao muda - e o padrao do modo ponto de acesso, entao nao ha IP para descobrir nem para configurar aqui. Sem roteador no meio, e o robo anda longe da bancada':
        'the board creates its own network, open and with no password, called "emmy2". On the phone: join the emmy2 network and open http://192.168.4.1 That address does not change - it is the access point mode default, so there is no IP to find out or to configure here. No router in between, and the robot can go far from the bench',
    'primeira coisa do ciclo: recebe os toques e responde o celular':
        'first thing in the cycle: take the touches and answer the phone',
    'evita o eco cruzado: o eco do primeiro sensor ainda esta no ar. Esperar "atendendo" e o que mantem a pagina viva durante a espera':
        'avoids cross-echo: the echo from the first sensor is still in the air. Waiting "while serving" is what keeps the page alive during the wait',
    'as duas distancias no celular, para conferir o alinhamento': 'both distances on the phone, to check the alignment',
    'o ponto que aparece no celular e o MESMO que decide logo abaixo: sai destas caixas. Aqui o lambda e explicito (1 - evidDir); no bloco de analise o complemento e feito por dentro':
        'the point shown on the phone is the SAME one that decides right below: it comes from these boxes. Here lambda is explicit (1 - evidRight); in the analysis block the complement is done inside',
    'ninguem apertou nada ate prova em contrario': 'nobody pressed anything until proven otherwise',
    'os quatro botoes da pagina. Cada um vale enquanto o dedo esta em cima: soltou, a LPA2v volta a mandar no ciclo seguinte':
        'the four page buttons. Each one holds while the finger is on it: let go, and PAL2v is back in charge on the next cycle',
    'so quando ninguem esta com o dedo na tela e que a analise decide':
        'only when nobody has a finger on the screen does the analysis decide',
    'V e F sao os estados em que o robo DECIDE: zeram o contador': 'V and F are the states where the robot DECIDES: they reset the counter',
    'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido com VEL_GIRO nesta bancada - mexeu na velocidade, remeca o angulo':
        'T3 = 2 s: the 90 degree turn from the paper. This time was measured with TURN_SPEED on this bench - if you change the speed, measure the angle again',
    'quase-verdadeiro comecando a divergir: ja ha obstaculo, mas as fontes comecaram a discordar. Meio giro resolve antes de virar contradicao - e o mesmo tratamento do exemplo 12':
        'quasi-true starting to diverge: there is already an obstacle, but the sources started to disagree. A half turn solves it before it becomes contradiction - the same treatment as example 12',
    'F: os dois veem caminho livre -> toca em frente. SEM empurrao: este e o estado da maior parte do tempo, e repetir o empurrao a cada ciclo faria o carro andar aos trancos. Liga o PWM e deixa rolar; quem precisa de empurrao e quem arranca do zero, nos estados abaixo':
        'F: both see a free path -> keep going. NO kick: this is the state most of the time, and repeating the kick every cycle would make the car jerk. Turn on the PWM and let it roll; the kick is for starting from zero, in the states below',
    'T: contradicao -> avanca devagar para as leituras desempatarem. Mesma arrancada do F, e assenta na mesma VELOCIDADE: uma caixa so':
        'T: contradiction -> move forward slowly so the readings break the tie. Same start as F, and it settles at the same SPEED: a single box',
    'perpendicular: um ve obstaculo e o outro ve livre. Um dos dois esta errado. Parar aqui era uma decisao que NAO mudava a evidencia: parado, os sensores repetiam a mesma discordancia. Meia manobra muda a geometria e permite remedir':
        'perpendicular: one sees an obstacle and the other sees it clear. One of the two is wrong. Stopping here was a decision that did NOT change the evidence: stopped, the sensors repeated the same disagreement. A half maneuver changes the geometry and allows measuring again',
    'os quatro estados acima sao os EXTREMOS do reticulado, e com os cortes em 0,5 eles sao a minoria das leituras. Uma medida como 35 cm de um lado e 50 do outro cai em Qv->T ou T->v, regiao intermediaria: sem este ramo o robo ficaria parado no lugar. A acao e a que a LPA2v indica para contradicao nao resolvida: seguir devagar e remedir - com empurrao, para sair da inercia':
        'the four states above are the EXTREMES of the lattice, and with the cuts at 0.5 they are the minority of readings. A measurement like 35 cm on one side and 50 on the other falls into Qv->T or T->v, an intermediate region: without this branch the robot would stand still. The action is the one PAL2v indicates for unresolved contradiction: go on slowly and measure again - with a kick, to get out of inertia',
    'o seguro: ciclos demais sem decidir nada, desvia e recomeca': 'the safeguard: too many cycles without deciding anything, swerve and start over',
    'respiro entre disparos do ultrassom, sem largar a pagina': 'pause between ultrasonic pings, without leaving the page',

    // 14
    'Ligacao: 2/3 = ultrassom 1 (disparo/eco) | 4/8 = ultrassom 2 | 5 e 6 = IN1 e IN2 da ponte H do motor da esteira (ENA no jumper de 5 V, entao a velocidade sai no proprio pino de sentido) | 11 = LED verde | 12 = LED amarelo | 13 = LED vermelho':
        'Wiring: 2/3 = ultrasonic 1 (trigger/echo) | 4/8 = ultrasonic 2 | 5 and 6 = IN1 and IN2 of the conveyor motor H-bridge (ENA on the 5 V jumper, so the speed comes out on the direction pin itself) | 11 = green LED | 12 = yellow LED | 13 = red LED',
    'abaixo de 9,5 cm ha peca; acima e a lona da esteira, a 10 cm. Este numero e mais permissivo que o limite de rejeicao de proposito: se fosse mais apertado, a peca baixa demais seria lida como "esteira vazia" e passaria sem ser analisada':
        'below 9.5 cm there is a part; above it is the conveyor belt, at 10 cm. This number is more permissive than the rejection limit on purpose: if it were tighter, a part that is too low would be read as "empty conveyor" and would pass without being analyzed',
    'Rampa do limite de 1,0 cm. Com a lona a 10 cm, peca de 1,0 cm esta a 9,0 cm e peca de 0,85 cm esta a 9,15 cm: a 9,15 a evidencia e 0 e a 8,95 ja e 1':
        'Ramp for the 1.0 cm limit. With the belt at 10 cm, a 1.0 cm part is at 9.0 cm and a 0.85 cm part is at 9.15 cm: at 9.15 the evidence is 0 and at 8.95 it is already 1',
    'Rampa do limite de 1,5 cm: peca de 1,5 cm esta a 8,5 cm e peca de 1,65 cm esta a 8,35 cm. As duas rampas tem 0,2 cm de largura, e e essa largura que poe os limites 1,0 e 1,5 exatamente sobre o Grau de Certeza 0,5 - o valor em que a analise decide V':
        'Ramp for the 1.5 cm limit: a 1.5 cm part is at 8.5 cm and a 1.65 cm part is at 8.35 cm. Both ramps are 0.2 cm wide, and that width is what puts the 1.0 and 1.5 limits exactly on the Certainty Degree 0.5 - the value at which the analysis decides V',
    'as distancias viram caixas porque cada uma e usada duas vezes: para ver se ha peca e para virar evidencia. Sem elas o ultrassom seria disparado de novo a cada uso, e daria outro numero':
        'the distances go into boxes because each one is used twice: to see whether there is a part and to become evidence. Without them the ultrasonic sensor would fire again on each use, and give another number',
    'o valor de controle da decisao, aplicado ao Grau de Certeza REAL. E o mesmo +-0,5 que o Para-Analisador usa no Grau de Certeza; a diferenca esta em qual grandeza ele mede':
        'the control value for the decision, applied to the REAL Certainty Degree. It is the same +-0.5 the Para-Analyzer uses on the Certainty Degree; the difference is in which quantity it measures',
    'quantas vezes esta peca ja voltou sem que a analise concluisse':
        'how many times this part has come back without the analysis reaching a conclusion',
    'Portao de presenca. Sem ele a esteira vazia entraria na analise com os dois sensores vendo a lona: evidencia 0 nos dois, Grau de Certeza -1, estado F - o sistema rejeitaria uma peca que nao existe, de tres em tres segundos, para sempre. Basta UM dos dois enxergar a peca: se o outro discorda, isso e contradicao para a analise resolver, nao motivo para ignorar':
        'Presence gate. Without it the empty conveyor would enter the analysis with both sensors seeing the belt: evidence 0 on both, Certainty Degree -1, state F - the system would reject a part that does not exist, every three seconds, forever. It is enough for ONE of the two to see the part: if the other disagrees, that is contradiction for the analysis to resolve, not a reason to ignore it',
    'a peca assenta antes de medir: com a lona andando, os dois ecos discordam por tremor, e essa contradicao nao e da peca':
        'the part settles before measuring: with the belt moving, the two echoes disagree because of vibration, and that contradiction does not come from the part',
    'a medida que vale e esta, com a esteira parada': 'the measurement that counts is this one, with the conveyor stopped',
    'as duas rampas unidas pelo menor: e o AND da LPA2v': 'the two ramps joined by the smaller one: it is the PAL2v AND',
    'a segunda fonte entra como evidencia favoravel e vira desfavoravel pelo complemento: lambda = 1 - evid2':
        'the second source comes in as favorable evidence and becomes unfavorable through the complement: lambda = 1 - evid2',
    'o sinal diz quem viu mais: positivo e o sensor 1, negativo e o sensor 2. Nao e ausencia de peca - disso cuida o portao':
        'the sign tells which one saw more: positive is sensor 1, negative is sensor 2. It is not a missing part - the gate takes care of that',
    'Quem decide aqui e o Grau de Certeza REAL, e nao o Grau de Certeza. A diferenca nao e sutil. O Para-Analisador testa o Grau de Certeza antes do Grau de Contradicao, entao quem passa no teste de V nunca chega ao teste de T. Com evid1 = 1,00 e evid2 = 0,60 saem Gc = +0,6 e Gct = +0,4: os dois sensores discordam em mais da metade da tolerancia da peca, e o algoritmo responde V. A peca passa. O Grau de Certeza Real ja e, por definicao, a certeza livre do efeito da contradicao: Gcr = 1 - D, com D = raiz((1 - |Gc|)^2 + Gct^2). Nesse mesmo caso ele vale +0,434, fica abaixo do corte, e a peca volta para remedir. De brinde vem a guarda de indefinicao do NAP (phi <= 0,25 ou D > 1), que o bloco de certeza real ja aplica por dentro: contradicao alta demais devolve zero, e zero nao aprova nem rejeita. Uma grandeza so, no lugar de uma guarda inventada':
        'What decides here is the REAL Certainty Degree, not the Certainty Degree. The difference is not subtle. The Para-Analyzer tests the Certainty Degree before the Contradiction Degree, so whatever passes the V test never reaches the T test. With evid1 = 1.00 and evid2 = 0.60 we get Gc = +0.6 and Gct = +0.4: the two sensors disagree by more than half the part tolerance, and the algorithm answers V. The part passes. The Real Certainty Degree is, by definition, the certainty free from the effect of contradiction: Gcr = 1 - D, with D = sqrt((1 - |Gc|)^2 + Gct^2). In this same case it is +0.434, stays below the cutoff, and the part goes back to be measured again. As a bonus comes the NAP indefiniteness guard (phi <= 0.25 or D > 1), which the real certainty block already applies inside: too much contradiction returns zero, and zero neither approves nor rejects. A single quantity, instead of an invented guard',
    'segura a esteira ligada ate a peca sair da janela de medida':
        'keep the conveyor running until the part leaves the measurement window',
    'certeza real negativa e forte: os dois sensores concordam que a peca esta fora da faixa. Maior ou menor, sai pelo mesmo lado - a distancia no monitor diz qual dos dois foi':
        'strong negative real certainty: both sensors agree the part is out of range. Larger or smaller, it leaves by the same side - the distance on the monitor tells which one it was',
    'de re ate a peca sair pela entrada e cair na caixa de refugo':
        'in reverse until the part leaves through the entrance and falls into the reject bin',
    'a peca esta na fronteira da faixa, ou os sensores discordam o bastante para consumir a certeza. Nos dois casos falta evidencia, e a saida e a mesma: medir de novo':
        'the part is on the edge of the range, or the sensors disagree enough to use up the certainty. In both cases evidence is missing, and the way out is the same: measure again',
    'de re o bastante para a peca sair pela entrada da esteira e cair na caixa de refugo. Se ela ficasse na lona, a esteira a traria de volta aos sensores e o ciclo se repetiria sem fim':
        'in reverse long enough for the part to leave through the conveyor entrance and fall into the reject bin. If it stayed on the belt, the conveyor would bring it back to the sensors and the cycle would repeat endlessly',
    'recua o suficiente para a peca sair de baixo dos sensores': 'back up just enough for the part to leave from under the sensors',
    'reentra a 35%: devagar, a peca trepida menos e os dois ecos se aproximam':
        'comes back in at 35%: slowly, the part vibrates less and the two echoes get closer',

    // 15
    'Carro 4x4, um L298N, dois motores em paralelo por lado. Neste carro o lado ESQUERDO ficou em OUT3/OUT4 (IN3/IN4 = GPIO 42 / 41) e o DIREITO em OUT1/OUT2 (IN1/IN2 = GPIO 1 / 2): conferido no analogico. Se o giro sair trocado no seu, troque os pares aqui':
        '4x4 car, one L298N, two motors in parallel per side. On this car the LEFT side ended up on OUT3/OUT4 (IN3/IN4 = GPIO 42 / 41) and the RIGHT on OUT1/OUT2 (IN1/IN2 = GPIO 1 / 2): checked with the joystick. If turning comes out swapped on yours, swap the pairs here',
    '15 cm = obstaculo colado. Um pouco mais folgado que os 10 da Emmy: o 4x4 e mais pesado e demora mais para parar':
        '15 cm = obstacle touching. A bit looser than the 10 of Emmy: the 4x4 is heavier and takes longer to stop',
    '0,5 = "sem informacao" na LPA2v, antes da primeira medida': '0.5 = "no information" in PAL2v, before the first measurement',
    'ciclos seguidos sem cair em V nem em F (o seguro da Emmy 2)':
        'consecutive cycles without reaching V or F (the Emmy 2 safeguard)',
    'desvios seguidos sem chegar a caminho livre. O estado F zera':
        'consecutive swerves without reaching a free path. State F resets it',
    'tres desvios e ainda nada de caminho livre: o carro esta num canto sem saida, e a decisao passa para o operador':
        'three swerves and still no free path: the car is in a dead end, and the decision goes to the operator',
    '0 = a LPA2v dirige | 1 = o operador dirige pela pagina': '0 = PAL2v drives | 1 = the operator drives from the page',
    'vale 1 no ciclo em que algum botao de direcao esta apertado':
        'is 1 in the cycle when some direction button is pressed',
    'intensidade de 0 a 100 %. Quatro motores num L298N pedem mais que os dois da Emmy: comece em 50 e ajuste na bancada':
        'intensity from 0 to 100 %. Four motors on one L298N need more than the two of Emmy: start at 50 and adjust on the bench',
    'o empurrao de 80 ms que tira o carro da inercia': 'the 80 ms kick that gets the car out of inertia',
    'o giro do 4x4 arrasta as rodas de lado (skid steer): precisa de bem mais forca que o giro da Emmy':
        'turning the 4x4 drags the wheels sideways (skid steer): it needs much more force than turning Emmy',
    'ms girando para dar ~90 graus. CALIBRE: depende do piso e da bateria':
        'ms turning to make ~90 degrees. CALIBRATE: it depends on the floor and the battery',
    'rede propria e aberta. No celular: entrar em "carro4x4" e abrir http://192.168.4.1':
        'own open network. On the phone: join "car4x4" and open http://192.168.4.1',
    'a camera dorme enquanto a LPA2v dirige e so acorda quando a pagina mostra o video: o OV5640 esquenta muito filmando a toa. "girada 180": nesta placa a imagem sai de cabeca para baixo':
        'the camera sleeps while PAL2v drives and only wakes up when the page shows the video: the OV5640 gets very hot filming for nothing. "rotated 180": on this board the image comes out upside down',
    'sensor esquerdo (trig GPIO 14, echo GPIO 21 com divisor)': 'left sensor (trig GPIO 14, echo GPIO 21 with divider)',
    'sensor direito (trig GPIO 47, echo GPIO 40 com divisor)': 'right sensor (trig GPIO 47, echo GPIO 40 with divider)',
    'o reticulado continua no celular nos dois modos: o operador ve o que a LPA2v estaria decidindo enquanto ele dirige':
        'the lattice stays on the phone in both modes: the operator sees what PAL2v would be deciding while they drive',
    'quem dirige neste ciclo?': 'who drives in this cycle?',
    'os quatro botoes valem enquanto o dedo esta em cima, como na Emmy 2':
        'the four buttons hold while the finger is on them, as in Emmy 2',
    'dedo fora da tela: o carro para e espera o operador': 'finger off the screen: the car stops and waits for the operator',
    '"liberar": o operador tirou o carro do canto e devolve o volante. Os contadores recomecam do zero e o video sai da pagina':
        '"release": the operator got the car out of the corner and hands back the wheel. The counters start over from zero and the video leaves the page',
    'V: os dois veem obstaculo -> conta o desvio, recua e gira': 'V: both see an obstacle -> count the swerve, back up and turn',
    'quase-verdadeiro comecando a divergir: meio giro antes de virar contradicao':
        'quasi-true starting to diverge: half a turn before it becomes contradiction',
    'caminho livre: o desvio anterior deu certo, a contagem recomeca':
        'free path: the previous swerve worked, the count starts over',
    'F: os dois veem caminho livre -> toca em frente (sem empurrao, para nao andar aos trancos)':
        'F: both see a free path -> keep going (no kick, so it does not jerk)',
    'um ve obstaculo e o outro ve livre: meia manobra para remedir. Tambem e desvio, e tambem conta':
        'one sees an obstacle and the other sees it clear: half a maneuver to measure again. It is also a swerve, and it also counts',
    'regioes intermediarias do reticulado: seguir devagar e remedir':
        'intermediate lattice regions: go on slowly and measure again',
    'o seguro da Emmy 2: ciclos demais sem decidir, desvia (e conta)':
        'the Emmy 2 safeguard: too many cycles without deciding, swerve (and count it)',
    'PRESO: desviou LIMITE_PRESO vezes e nunca achou caminho livre. O carro para, a camera abre no celular e o operador assume':
        'STUCK: it swerved STUCK_LIMIT times and never found a free path. The car stops, the camera opens on the phone and the operator takes over',
    '"assumir": o operador pega o volante quando quiser, preso ou nao. Vale a partir do proximo ciclo':
        '"take over": the operator takes the wheel whenever they want, stuck or not. It applies from the next cycle'
};

module.exports = { EXEMPLOS, CAIXAS, TEXTOS, COMENTARIOS };
