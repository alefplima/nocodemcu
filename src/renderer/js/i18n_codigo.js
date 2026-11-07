'use strict';
/**
 * O C++ gerado, em inglês: comentários e nomes que o próprio gerador escreve.
 *
 * Usado por i18n.js (I18N.codigo) só quando o idioma é inglês. Duas regras:
 *
 *   - comentário traduzido linha a linha, cada linha do português vira uma
 *     linha do inglês: o número de linhas não muda e o mapa linha → bloco
 *     (erros do compilador apontando para o bloco) continua valendo;
 *   - nome trocado só fora de strings e de comentários, palavra inteira. O
 *     que o aluno escreveu entre aspas (rótulos, botões, avisos) não muda;
 *     os nomes dos blocos do aluno também não, a menos que coincidam com um
 *     nome daqui — e aí mudam em todo lugar, então o programa continua igual.
 *
 * Nenhum nome novo pode já existir no código: tools/i18n_codigo_test.js confere.
 */
(function (global) {

    /* Comentários do runtime, exatamente como saem no .ino (sem o "// "). */
    const COMENTARIOS = {
        // ultrassom
        'Distancia por ultrassom, em centimetros.': 'Ultrasonic distance, in centimeters.',
        'Sem eco o pulseIn devolve 0, que como distancia seria "colado no':
            'With no echo pulseIn returns 0, which as a distance would mean "touching the',
        'sensor" — o oposto do que aconteceu. Vira 400, o alcance maximo.':
            'sensor" — the opposite of what happened. It becomes 400, the maximum range.',

        // página web
        'Pagina servida pela propria placa: quem olha e um celular no':
            'Page served by the board itself: the viewer is a phone in the',
        'navegador, sem cabo e sem instalar nada. Os botoes e os valores sao':
            'browser, with no cable and nothing to install. The buttons and values are',
        'registrados no inicio do programa e a pagina se monta a partir deles.':
            'registered at the start of the program and the page is built from them.',
        'ms que um toque vale': 'ms that a touch stays valid',
        'Camera na pagina: o video em si vem da porta 81 (ver absCameraLigar);':
            'Camera on the page: the video itself comes from port 81 (see absCameraStart);',
        'aqui fica so a ordem de abrir ou fechar, que a pagina le junto com os numeros.':
            'here is only the order to open or close it, which the page reads with the numbers.',
        'Avisado quando o video entra ou sai da pagina: a camera usa isto para':
            'Called when the video enters or leaves the page: the camera uses this to',
        'dormir enquanto ninguem olha (ver absCameraAcordar).':
            'sleep while nobody is watching (see absCameraWake).',
        'O nome do botao chega da pagina em porcentagem (%C3%A0, +): um nome com':
            'The button name arrives from the page percent-encoded (%C3%A0, +): a name with',
        'acento ou espaco nunca casaria com o do bloco sem desfazer isso.':
            'an accent or a space would never match the block one without undoing that.',
        'Verdadeiro enquanto o dedo esta no botao: a pagina repete o aviso a':
            'True while the finger is on the button: the page repeats the touch every',
        'cada 150 ms, entao um aviso velho e dedo que ja soltou.':
            '150 ms, so an old touch means a finger that has already let go.',
        'Os numeros que a pagina le a cada 300 ms, uma linha por coisa.':
            'The numbers the page reads every 300 ms, one line per item.',
        'Uma volta do servidor: recebe um toque, responde os numeros ou serve a':
            'One server round: takes a touch, answers the numbers or serves the',
        'pagina. Nao trava esperando: cliente que nao falou em 300 ms fica para':
            'page. It never blocks waiting: a client silent for 300 ms is left for',
        'a proxima volta, e o robo continua andando.':
            'the next round, and the robot keeps moving.',
        'Qual pagina servir. A da camera (pilotagem) troca este ponteiro no':
            'Which page to serve. The camera (driving) page swaps this pointer at the',
        'inicio do programa; sem camera fica a pagina de sempre.':
            'start of the program; without a camera the usual page stays.',
        'Espera sem abandonar a pagina: durante uma manobra longa o celular':
            'Wait without leaving the page: during a long maneuver the phone',
        'continua respondendo, em vez de parecer travado.':
            'keeps responding instead of looking frozen.',

        // motores
        'Ponte H dos dois motores. O lado que anda recebe a intensidade e o':
            'H-bridge of the two motors. The side that moves gets the intensity and the',
        'outro fica em zero; trocar os dois de papel inverte o sentido.':
            'other stays at zero; swapping their roles reverses the direction.',
        'Sempre analogWrite nos quatro, nunca digitalWrite: no ESP32 o':
            'Always analogWrite on all four, never digitalWrite: on the ESP32',
        'analogWrite prende o pino ao LEDC e a escrita digital nao pegaria.':
            'analogWrite ties the pin to the LEDC and a digital write would not take.',
        'A intensidade entra em porcentagem e sai de 0 a 255, arredondada para':
            'The intensity comes in as a percentage and goes out as 0 to 255, rounded to',
        'o mais proximo: com casa decimal da para pedir um valor exato da':
            'the nearest: with a decimal place you can ask for an exact value from the',
        'bancada (29,4 % = 75 de 255), que o arredondamento para baixo perderia.':
            'test bench (29.4 % = 75 of 255), which rounding down would lose.',

        // rede
        'Endereco fixo na rede. Sem isto quem escolhe o endereco e o roteador,':
            'Fixed address on the network. Without this the router picks the address,',
        'e ele muda de uma ligacao para outra: a pagina troca de lugar sem avisar.':
            'and it changes from one power-up to the next: the page moves without notice.',
        'O DNS fica no proprio roteador, que e o que uma placa dessas precisa.':
            'The DNS is the router itself, which is all a board like this needs.',
        'O estado sai dos mesmos cortes do Para-Analisador (0,5 e -0,5),':
            'The state comes from the same cuts as the Para-Analyzer (0.5 and -0.5),',
        'para a pagina mostrar o nome junto com o ponto no reticulado.':
            'so the page shows its name next to the point on the lattice.',

        'http://192.168.4.1 — endereco fixo do modo ponto de acesso.':
            'http://192.168.4.1 — fixed address in access point mode.',

        // câmera
        'Pinagem da ESP32-S3 CAM (igual a da ESP32-S3-EYE e da Freenove).':
            'ESP32-S3 CAM pinout (same as the ESP32-S3-EYE and the Freenove).',
        'Quem usa estes pinos e a camera: eles nao aparecem na lista de pinos.':
            'These pins are used by the camera: they do not appear in the pin list.',
        'dormir enquanto o video nao esta na pagina': 'sleep while the video is not on the page',
        'O sensor filma sem parar desde que liga, com ou sem alguem olhando, e o':
            'The sensor films nonstop from power-up, whether anyone is watching or not, and the',
        'OV5640 esquenta muito assim. Em espera (bit 6 do registro 0x3008) ele':
            'OV5640 gets very hot like that. In standby (bit 6 of register 0x3008) it',
        'para de filmar; acordado, o primeiro quadro sai em ~50 ms (medido).':
            'stops filming; once awake, the first frame comes out in ~50 ms (measured).',
        'So o OV5640 foi testado: com outro sensor a camera fica sempre ligada.':
            'Only the OV5640 was tested: with another sensor the camera stays always on.',
        'Um quadro atras do outro na mesma conexao (MJPEG): o navegador mostra':
            'One frame after another on the same connection (MJPEG): the browser shows it',
        'como video numa tag <img>, sem nenhum programa no celular.':
            'as video in an <img> tag, with no app on the phone.',
        'No maximo ~10 quadros/s: com o video a toda, os comandos do':
            'At most ~10 frames/s: with the video at full speed, the joystick',
        'analogico disputavam o WiFi com ele e o carro respondia atrasado.':
            'commands competed with it for the WiFi and the car responded late.',
        'Um quadro perdido (queda de tensao, camera acordando) nao encerra':
            'A lost frame (voltage drop, camera waking up) does not end',
        'o video: so desiste depois de ~2 s sem nenhum quadro.':
            'the video: it only gives up after ~2 s without any frame.',
        'a pagina escondeu a camera: fim do video': 'the page hid the camera: end of the video',
        'longe dos canais que o analogWrite usa': 'away from the channels analogWrite uses',
        'um pouco mais leve: ~20 % menos bytes por quadro': 'a bit lighter: ~20 % fewer bytes per frame',
        'sempre o quadro mais novo, sem fila': 'always the newest frame, no queue',
        'camera montada de cabeca para baixo: vira e espelha': 'camera mounted upside down: flip and mirror',
        'dorme ate a pagina pedir': 'sleep until the page asks',
        'Pagina de pilotagem: a que entra quando o programa usa a camera. Feita':
            'Driving page: the one used when the program uses the camera. Made',
        'para o celular em pe: o video em cima (ou o reticulado, enquanto a LPA2v':
            'for the phone held upright: the video on top (or the lattice, while PAL2v',
        'dirige) e, embaixo, numa linha so, o botao Assumir/Liberar e o analogico.':
            'drives) and, below, on a single row, the Take over/Release button and the joystick.',
        'O analogico manda os mesmos nomes dos botoes de direcao (frente, tras,':
            'The joystick sends the same names as the direction buttons (forward, back,',
        'esquerda, direita): o programa nao muda nada para ser pilotado assim.':
            'left, right): the program does not change at all to be driven this way.',
        'Os nomes valem em portugues ou em ingles (forward, back, left, right,':
            'The names work in Portuguese or in English (frente, tras, esquerda, direita,',
        'take over, release): a pagina usa os que o programa registrou.':
            'assumir, liberar): the page uses the ones the program registered.',
        'Sem "//" no JavaScript: o pre-processador do Arduino (ctags) nao entende a':
            'No "//" in the JavaScript: the Arduino preprocessor (ctags) does not understand the',
        'string crua e leria aquilo como comentario. Por isso o "http:\\/\\/".':
            'raw string and would read that as a comment. Hence the "http:\\/\\/".',

        // LPA2v
        'Estados do reticulado da LPA2v': 'PAL2v lattice states',
        'Grau de Evidencia: leitura -> [0,1] no Universo de Discurso [a1,a2].':
            'Evidence Degree: reading -> [0,1] over the Universe of Discourse [a1,a2].',
        'fn: 0 linear crescente, 1 linear decrescente, 2 funcao S, 3 funcao Z':
            'fn: 0 linear increasing, 1 linear decreasing, 2 S function, 3 Z function',
        'Grau de Certeza': 'Certainty Degree',
        'Grau de Contradicao': 'Contradiction Degree',
        'Intervalo de Certeza (= Intervalo de Evidencia)': 'Certainty Interval (= Evidence Interval)',
        'Distancia do estado ao vertice de certeza maxima': 'Distance from the state to the maximum certainty vertex',
        'A analise nao conclui quando a contradicao come toda a certeza.':
            'The analysis does not conclude when contradiction eats all the certainty.',
        'Grau de Certeza Real: a certeza ja descontado o efeito da contradicao.':
            'Real Certainty Degree: the certainty with the effect of contradiction removed.',
        'Grau de Evidencia Resultante Real, normalizado em [0,1]':
            'Real Resulting Evidence Degree, normalized to [0,1]',
        'Para-Analisador: reticulado em 12 regioes.': 'Para-Analyzer: lattice in 12 regions.',
        'c1=Vscc  c2=Vicc  c3=Vscct  c4=Vicct': 'c1=Vscc  c2=Vicc  c3=Vscct  c4=Vicct',
        'As quatro faixas do algoritmo, na mesma ordem: elas se tocam':
            'The four bands of the algorithm, in the same order: they touch',
        'em Gc=0 e Gct=0, e quem vem antes decide o empate.':
            'at Gc=0 and Gct=0, and the earlier one breaks the tie.',
        'Reticulado em 4 regioes: o vertice mais proximo do estado.':
            'Lattice in 4 regions: the vertex nearest to the state.',
        'E o mesmo que colapsar os 12 estados no vertice de cada um.':
            'It is the same as collapsing the 12 states onto their vertices.',
        'Nome do estado, para o monitor serial': 'State name, for the serial monitor',
        'Conectivos da LPA2v: OR maximiza, AND minimiza.': 'PAL2v connectives: OR maximizes, AND minimizes.',
        'ParaExtrctr: reduz n Graus de Evidencia sobre a MESMA proposicao':
            'ParaExtrctr: reduces n Evidence Degrees about the SAME proposition',
        'a um unico grau resultante, extraindo os efeitos da contradicao.':
            'to a single resulting degree, extracting the effects of contradiction.',
        'Trabalha sobre uma copia, entao o vetor de origem nao e alterado.':
            'It works on a copy, so the source array is not changed.'
    };

    /* Comentários com parte variável: padrão em português → texto em inglês. */
    const PADROES = [
        [/^valor sem uso: (.*)$/, 'unused value: $1'],
        [/^erro ao gerar o código: (.*)$/, 'error generating the code: $1'],
        [/^Rede propria, aberta: o celular conecta em (.*) e abre$/, 'Own open network: the phone connects to $1 and opens']
    ];

    /* Nomes do runtime: funções, variáveis, constantes, parâmetros e locais. */
    const NOMES = {
        // motores
        ABS_FRENTE: 'ABS_FORWARD',
        ABS_RE: 'ABS_REVERSE',
        ABS_ESQ: 'ABS_LEFT',
        ABS_DIR: 'ABS_RIGHT',
        ABS_PARAR: 'ABS_STOP',
        absMotores: 'absMotors',
        manobra: 'maneuver',
        e1: 'l1',
        e2: 'l2',
        d1: 'r1',
        d2: 'r2',

        // ultrassom
        absDistanciaCm: 'absDistanceCm',

        // rede e página
        absWifiIpFixo: 'absWifiStaticIp',
        ABS_WEB_VALIDADE: 'ABS_WEB_VALIDITY',
        absWebServidor: 'absWebServer',
        absWebBotoes: 'absWebButtons',
        absWebNBotoes: 'absWebNButtons',
        absWebRotulos: 'absWebLabels',
        absWebValores: 'absWebValues',
        absWebNValores: 'absWebNValues',
        absWebTemReticulado: 'absWebHasLattice',
        absWebEstado: 'absWebState',
        absWebToque: 'absWebTouch',
        absWebToqueEm: 'absWebTouchAt',
        absWebAberto: 'absWebStarted',
        absWebTemCamera: 'absWebHasCamera',
        absWebCameraVisivel: 'absWebCameraVisible',
        absWebCameraAviso: 'absWebCameraNotice',
        absWebAoMostrarCamera: 'absWebOnShowCamera',
        absWebRegistrarBotao: 'absWebRegisterButton',
        absWebIndice: 'absWebIndex',
        absWebRegistrarValor: 'absWebRegisterValue',
        absWebValor: 'absWebValue',
        absWebTexto: 'absWebText',
        absWebApertado: 'absWebPressed',
        absWebCabecalho: 'absWebHeader',
        absWebDados: 'absWebData',
        absWebPagina: 'absWebPage',
        absWebPaginaFn: 'absWebPageFn',
        absWebPaginaPiloto: 'absWebDrivingPage',
        absWebAtender: 'absWebServe',
        absWebEsperar: 'absWebWait',
        absWebReticulado: 'absWebLattice',
        visivel: 'visible',
        aviso: 'notice',
        nome: 'name',
        rotulo: 'label',
        tipo: 'contentType',
        fim: 'endPos',

        // câmera
        absCameraSoNaPagina: 'absCameraOnlyOnPage',
        absCameraAcordar: 'absCameraWake',
        absCameraLigar: 'absCameraStart',
        acordada: 'awake',
        cab: 'hdr',
        falhas: 'failures',
        ultimo: 'lastFrame',
        falta: 'remaining',
        tamanho: 'frameSize',
        girar: 'flip',

        // LPA2v
        LpaEstado: 'LpaState',
        lpaEstado: 'lpaState',
        lpaEstado4: 'lpaState4',
        lpaEvidencia: 'lpaEvidence',
        lpaIndefinido: 'lpaUndefined',
        lpaNomeEstado: 'lpaStateName'
    };

    global.I18N_CODIGO = { COMENTARIOS: COMENTARIOS, PADROES: PADROES, NOMES: NOMES };
    if (typeof module !== 'undefined' && module.exports) module.exports = global.I18N_CODIGO;

})(typeof window !== 'undefined' ? window : global);
