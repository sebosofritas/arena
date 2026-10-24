# Arena de Sobrevivência — Decisões de design (v0.3)

Este arquivo guarda o que foi decidido para o jogo. Quando algo mudar, é aqui que se atualiza.

## Premissa
Todos os humanos sumiram da Terra, e só eles. Casas, carros, ferramentas, roupas e comida
ficaram onde estavam (alguém sumiu consertando um poste: a escada, o capacete e o uniforme
continuam lá). Os jogadores são os únicos que restaram. É um battle royale: **o objetivo
oficial e único é sobreviver.**

Escapar existe, mas não é explícito: surge por acaso (dicas no mapa, fragmentos de mapa,
sussurros) e é difícil e trabalhoso. Quem escapa some do jogo e aparece como "desaparecido".

## Decisões do criador
- Até 24 por sala (limite técnico), pensado para 16; no dia a dia, 8 a 10 jogadores.
- Sem NPCs, só jogadores.
- Período de 2:30 para escolher ações (e planejar o próximo ao mesmo tempo).
- Nomes escolhidos pelos jogadores.
- O mapa não muda de forma física. Só mudanças naturais (chuva alaga, seca, nevoeiro).
- Atributos (FOR / AGI / AST / CAR) **sorteados**, influenciados por "classe" e descrição
  escolhidas pelo jogador, nunca fixos, para sempre haver desafio.
- Até **10 ações por período**, que diminuem conforme a condição do personagem
  (perna machucada: anda menos ou não anda; fome: força e astúcia caem; etc.).
  Isso vale para tudo.
- Ponto de partida: o jogador **escolhe** onde começar (opção principal) ou sorteia.
- Itens por localidade e aleatoriedade, estilo Project Zomboid: delegacia tem muito mais
  chance de armas; também pode vir vazia. Máxima diversidade de itens.

## O que já está pronto no código
- `data/itens.js`: 328 itens (comida, bebida, medicina, armas, munição, ferramentas, roupas,
  mochilas, eletrônicos, camping, livros, itens de história, natureza...).
- `data/locais.js`: 33 locais e 123 cômodos, cada um com sua tabela de chances.
- `data/sorteio.js`: sorteia o que alguém acha ao vasculhar.
- `teste-dados.js`: valida tudo e simula 20.000 buscas por local (`node teste-dados.js`).

Como o sorteio funciona: o jogador vasculha um local → cai num cômodo (ou escolhe, se
conhecer) → cada rolagem sorteia uma categoria pelo peso (ou "vazio") → dentro da categoria
o item sai pela raridade. Para mudar qualquer chance, só alterar números nesses arquivos.

## Decisões confirmadas (rodada 2)
1. **Padrão: período de 3:30 e 40 pontos de ação (PA).** Quanto mais complexa a ação, mais PA
   ela gasta. Mover-se, olhar e se comunicar custam pouco (0,5 ou menos) para incentivar
   exploração e conversa. Alianças, negociações, craft e combate custam mais.
   Condições ruins (perna machucada, fome, dor...) reduzem os PA e a eficácia das ações,
   mas o piso é 16 PA: o jogador sempre tem opções, só que menos.
   **O anfitrião pode configurar tempo e PA ao criar a sala; os valores padrão aparecem
   marcados como "Recomendado".**
   Gastar muito em uma área (ex.: alianças) deixa menos pontos para outra (sobrevivência):
   é a troca estratégica central do jogo.
1b. **Dormir não gasta PA fixo**: consome os pontos que sobrarem do período, recupera
   energia (menos cansaço no período seguinte) e deixa o personagem vulnerável (emboscada
   contra quem dorme tem bônus).
1c. **Ações em etapas**: tudo que pode ser dividido em partes pode começar num período e
   terminar no seguinte quando faltam pontos. Vale para construir, cozinhar, ferver água,
   craft, barricadas, tratar feridas longas, conversas, negociações e alianças. Não vale
   para ações de momento (atacar, emboscar, fugir). O progresso fica registrado como "em
   andamento". Se o jogador sair do lugar, a etapa pausa. O que está sendo feito fica no
   local e pode ser visto, roubado ou atrapalhado por outros. Conversas e alianças em etapas
   dependem de a outra pessoa continuar presente e disposta.
2. **Mapa em regiões** com saque que se esgota: a escassez é parte do jogo.
3. **Atributos sorteados com até 3 rolagens**: o jogador pode re-rolar 3 vezes se não gostar.
4. **Os humanos sumiram há ~2 horas**: comida fresca ainda presta (mas vai estragar nos
   primeiros dias de jogo) e a energia elétrica ainda funciona (por enquanto).
5. **O "círculo que aperta" continua**, de forma mais sutil, mas de grande importância.
6. **Uma rodada de 3:30 = 3 dias de jogo** (decidido). Cada dia tem 4 turnos: manhã, tarde,
   noite e madrugada, então a rodada tem 12 turnos. Noite e madrugada são escuras: visão
   menor, mais frio, bônus para emboscadas. Isso encaixa melhor construir, cozinhar e outras
   ações demoradas. O modelo para preservar a dinâmica dos turnos do dia dentro da rodada
   está em "Proposta: como encaixar 3 dias na rodada" (aguardando aprovação).

### Proposta: como encaixar 3 dias na rodada
- O jogador monta a fila de ações da rodada com 40 PA, como antes (os 3:30 reais continuam
  sendo leitura do resultado anterior mais planejamento da próxima rodada).
- Cada ação pode ter um "quando" opcional: de manhã, de tarde, à noite, de madrugada ou
  qualquer hora. Sem "quando", o jogo encaixa sozinho nos 12 turnos.
- O servidor resolve os 12 turnos em ordem; encontros acontecem quando dois jogadores
  estão no mesmo lugar no mesmo turno. O log narra "Dia 4, manhã: ...", "Dia 4, noite: ...".
- "Postura" por rodada para reagir a encontros sem o jogador presente: evitar, receber
  bem, atacar quem encontrar, só se defender.
- **Comer e beber NÃO são automáticos** (decidido). O jogador escolhe quando comer e beber
  (0,5 PA cada, com "quando" opcional). Quem não achou comida precisa caçar, pescar, colher
  ou comer qualquer coisa para sobreviver: restos, carne crua, cogumelos, ração de animal,
  insetos (cada um com risco ou penalidade). Se a fila não tiver refeição, o jogo apenas
  AVISA antes de enviar ("você vai passar fome nesta rodada"), sem comer por ele.
- Proposta de necessidades (ajustável): fome 0 a 100, cai 25 por dia (75 por rodada);
  sede cai 34 por dia (cerca de 3 dias sem beber é crítico). Dois ou três itens de comida
  e dois ou três de bebida por rodada mantêm o personagem estável.
- Novas ações: caçar 4 PA (precisa de arma à distância, estilingue ou armadilha),
  pescar 2 (precisa de kit), armadilha de animais 4 (resultado na rodada seguinte),
  coletar água da chuva 1. Animais domésticos e de fazenda continuaram no mundo e podem
  ser caçados, o que também pesa na moral do personagem.
- **A comida estraga mais devagar**: os dias de estrago dos itens são multiplicados por 2,5
  (ex.: banana ~12 dias, carne crua ~7 dias, batata ~50 dias). Sal, fogueira e defumação
  podem prolongar. Enlatados e secos praticamente não estragam.
- Névoa e apagões passam a andar em dias de jogo (3 por rodada).
- Linha do tempo para arrastar ações entre os 12 turnos fica para uma versão futura.

## Proposta (aguardando aprovação)
### Tabela de custo das ações (base de 40 PA)
- Movimento: andar dentro da região 0,25 | ir à região vizinha 0,5 | fugir 0,5
- Exploração: observar 0,25 | vasculhar um cômodo 1 | vasculhar a fundo 2 | colher/pescar 1 a 2 | caçar 4 | armadilha de animais 4 | esconder-se 0,5 | montar esconderijo 2
- Itens: pegar/equipar 0,25 | comer/beber 0,5 | usar bandagem 1 | tratar ferida grave 5 | cozinhar 1,5 | fogueira 2 | purificar água 1 | arrombar 1 a 2 | craft simples 2 | craft complexo 8 | consertar 2
- Social: falar 0,5 | trocar itens 2 | persuadir/interrogar 5 | propor trégua 5 | entrar em aliança 6 | criar aliança 10 | furtar 3
- Combate: fugir de luta 1 | atacar 5 | emboscar 7 | rastrear alguém 3 | montar armadilha 4
- Descanso: descansar 6 | dormir: sem custo fixo (usa o que sobrar)

### Condições que reduzem PA e eficácia
- Fome: leve -2, grave -5 | Sede: leve -3, grave -6 | Cansaço: -2 a -6 | Dor: -2 a -5
- Frio/calor extremo: -2 a -3 | Sangramento: -2 por período | Infecção/doença: -3
- Perna ferida: mover custa o dobro (quebrada: impossível) | Braço ferido: combate e craft custam 1,5x
- Cabeça ferida: astúcia e visão caem
- Piso de 16 PA por período, para ninguém ficar travado.

### O "círculo" sutil: a Névoa
Uma névoa avança das bordas do mapa em direção ao centro, região por região. Dentro dela:
perda lenta de PV, itens estragam mais rápido, visão e ouvido reduzidos. No começo são só
sinais (clima estranho, rádio chiando, animais fugindo). Também há apagões por região e
a comida fresca estragando. A Névoa pode ser parte do mistério do sumiço e do escape secreto.

## Perguntas abertas
- Aprovar ou ajustar a tabela de custos e a Névoa como "círculo".
- O que significa "escapar"? (Para onde? Existe uma explicação para o sumiço?)
- Lista de classes iniciais e quantos traços aleatórios cada jogador recebe.
- (resolvido) Tempo de jogo por período: ver decisão 6.

## Próximos passos
1. Motor de períodos: timer de 2:30, 16 PA por jogador, resolução simultânea.
2. Ligar o sorteio de itens à ação "vasculhar", com inventário e peso das mochilas.
3. Criação de personagem (classe, descrição, atributos sorteados com 3 rolagens, ponto inicial).
4. Condições do corpo e seus efeitos nas ações.
5. Combate, alianças, tréguas, mortes (regras do jogo de texto do amigo).
6. Mapa 2D estilo Worldbox (só depois que o jogo estiver divertido em texto).

## v0.3: o que já está implementado (jogável)
- **Fluxo**: sala de espera (anfitrião configura, com "Recomendado") → criação de personagem
  (classe, descrição, sorteio de atributos com re-rolagens, onde começar) → rodadas → fim.
- **Rodada** = 12 turnos (3 dias × manhã/tarde/noite/madrugada). Cada jogador monta uma fila de
  ações; as que têm "quando" ocupam horário fixo, as demais vão na ordem para o próximo espaço
  livre. O que não cabe fica para a rodada seguinte; ações divisíveis continuam na seguinte.
- **Mapa** 5×5 (cidade, bairro, indústria, rural, mata, montanha, lago, pântano, base militar),
  novo a cada partida. Cada local tem cômodos que se esgotam (repetir cômodo rende pouco).
- **Necessidades manuais**: fome −25/dia, sede −34/dia, energia −24/dia; dormir recupera.
  Comida estraga ×2,5 mais devagar. Água encanada funciona por alguns dias (depois, lago/chuva).
- **Combate**: até 3 trocas, acerto por agilidade, dano por arma + força − proteção, golpes
  críticos, ferimentos (perna/braço/cabeça), sangramento, fuga, emboscada, sono = vulnerável.
- **Posturas** (evitar, receber bem, só defender, atacar) valem quando o encontro acontece sem
  o jogador agir. **Trégua** e **aliança** por proposta (aceitar/recusar); atacar quem tem
  acordo é **traição** pública.
- **Névoa**: avança das bordas (detalhes na v0.5).
- **Saída secreta**: 3 fragmentos de mapa raros revelam coluna, linha e a região. Lá aparece a
  ação "Atravessar". Quem atravessa vira "desaparecido".
- **Chat** só com quem estava na mesma região no começo da rodada (e aliados); mortos falam entre si.
- **Fim**: último sobrevivente (ou ninguém). Anfitrião pode reiniciar a sala.

## v0.4: tudo que faltava
- **Mapa 2D estilo Worldbox**: ilha em pixels gerada por semente (cidade, bairros, fábricas, plantações,
  florestas, montanhas com neve, lago, pântano, base militar), água animada, névoa que se move, e
  bonequinhos (você em verde, aliados em azul, outros em vermelho). Clique na região vizinha para andar.
  Na criação do personagem, o ponto de partida também é escolhido clicando no mapa.
- **Fabricar**: bandagens de pano, lança, faca, arco, flechas, armadilha de laço, mochila improvisada.
- **Armadilhas**: de urso (achada) ou de laço (fabricada). Caçam sozinhas (recolha as presas na
  rodada seguinte) e ferem quem pisar (quem desconfia nota a tempo).
- **Arrombar**: casas, lojas e veículos podem estar trancados. Pé de cabra, kit de arrombamento e
  chave-mestra ajudam (os dois últimos fazem menos barulho). **Barricar** por dentro (2 tábuas ou
  cadeado) deixa você escondido e o local trancado para os outros.
- **Abrigo** (lona, ou 4 galhos + pano/lençol/cobertor).
- **Frio e calor**: cada região tem temperatura que muda com a hora, o dia e a névoa. Casaco,
  cobertor, prédio, abrigo e fogueira aquecem. Montanha é bem mais fria. O calor aumenta a sede.
- **Salvamento**: cada sala é gravada em disco 2 s depois de cada mudança e restaurada quando o
  servidor religa (jogadores voltam pelo mesmo navegador). Veja o aviso no README sobre o plano
  gratuito do Render.

## v0.5: mundo maior e mapa de respeito
- **49 regiões (7×7)** e 15 tipos: centro, zona comercial, complexo hospitalar, campus, bairro, indústria,
  rodovia, área rural, mata, montanha, lago, pântano, ruínas, base militar e litoral (sempre na costa).
  O centro da cidade fica no meio; montanhas mais para fora.
- **Mapa novo**: rios que descem das montanhas até o lago e o mar, pontes, estradas ligando tudo com
  faixas, quarteirões cheios de prédios com sombra e janelas, praças com chafariz, estacionamentos,
  casas com quintal e piscina, plantações, gado andando no pasto, fábricas soltando fumaça, praia com
  coqueiros e guarda-sóis, barcos, carros abandonados no meio da rua (todo mundo sumiu de repente).
  Cada local real do jogo (hospital, delegacia, igreja, posto, quartel...) aparece desenhado no mapa.
  As janelas apagam quando a região fica sem luz. Zoom, arrastar, tela cheia e nomes das regiões.
- **Névoa sutil**: começa na rodada 6, avança a cada 4 rodadas e para sozinha — no máximo cobre a faixa
  das bordas (24 das 49 regiões); o meio do mapa nunca é tomado. Dano baixo (1 a 2 PV por período).

### Ainda fora (sugestões)
- Salvamento que sobrevive a "dormir/atualizar" no Render grátis (precisa de banco ou disco pago).
- Sons, animações de combate no mapa, ícones de itens.
