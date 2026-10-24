'use strict';
// =====================================================================
//  LOCAIS E CÔMODOS (inspirado no sistema de loot do Project Zomboid)
//
//  Cada LOCAL tem vários CÔMODOS. Quando alguém vasculha, o jogo:
//    1) escolhe um cômodo (pelo peso, ou o jogador escolhe se conhecer)
//    2) rola de [min, max] vezes na tabela do cômodo
//    3) cada rolagem sorteia uma TAG pelo peso (ou "vazio" = nada)
//    4) dentro da tag, sorteia o item pela raridade de cada item
//
//  Pesos não precisam somar 100. Só importa a proporção.
//  Para mudar o jogo, basta mexer nos números aqui.
//
//  tipo: 'predio' | 'veiculo' | 'natural'
// =====================================================================
const LOCAIS = {};

function C(nome, peso, rolagens, tabela) {
  return { nome, peso, rolagens, tabela };
}
function L(id, nome, icone, tipo, desc, comodos) {
  if (LOCAIS[id]) throw new Error('Local duplicado: ' + id);
  LOCAIS[id] = { id, nome, icone, tipo, desc, comodos };
}

// ------------------------------ RESIDENCIAL ------------------------------
L('casa', 'Casa', '🏠', 'predio', 'A porta ainda está entreaberta. A TV, ligada no mudo.', [
  C('cozinha', 30, [1, 3], { comida_conserva: 22, comida_seca: 18, comida_fresca: 14, bebida: 12, cozinha_util: 14, medicina: 3, limpeza: 4, lixo: 4, vazio: 14 }),
  C('quarto', 25, [1, 3], { roupa: 34, calcado: 6, mochila: 5, eletronico: 8, livro: 8, brinquedo: 5, lixo: 8, lore: 5, medicina: 2, arma_fogo: 1.5, vazio: 22 }),
  C('banheiro', 12, [1, 2], { medicina: 28, higiene: 32, limpeza: 8, lixo: 5, vazio: 27 }),
  C('sala', 13, [1, 2], { eletronico: 14, livro: 12, brinquedo: 8, lixo: 12, luz: 6, decoracao: 3, lore: 4, vazio: 41 }),
  C('garagem', 12, [1, 3], { ferramenta: 28, material: 18, combustivel: 10, luz: 7, esporte: 8, camping: 5, jardinagem: 6, veiculo_item: 5, vazio: 13 }),
  C('quintal', 8, [1, 2], { jardinagem: 30, horta: 12, material: 14, esporte: 8, vazio: 36 }),
]);

L('apartamento', 'Apartamento', '🏢', 'predio', 'Um café esfriou na mesa. Ninguém voltou para tomá-lo.', [
  C('cozinha', 30, [1, 3], { comida_conserva: 22, comida_seca: 18, comida_fresca: 14, bebida: 12, cozinha_util: 14, medicina: 3, limpeza: 4, lixo: 4, vazio: 14 }),
  C('quarto', 28, [1, 3], { roupa: 34, calcado: 6, mochila: 5, eletronico: 8, livro: 8, brinquedo: 5, lixo: 8, lore: 5, medicina: 2, vazio: 23 }),
  C('banheiro', 14, [1, 2], { medicina: 28, higiene: 32, limpeza: 8, lixo: 5, vazio: 27 }),
  C('sala', 16, [1, 2], { eletronico: 14, livro: 12, brinquedo: 8, lixo: 12, luz: 6, decoracao: 3, lore: 4, vazio: 41 }),
  C('despensa', 12, [1, 3], { comida_conserva: 30, comida_seca: 25, bebida: 14, limpeza: 10, vazio: 21 }),
]);

// ------------------------------ COMÉRCIO ------------------------------
L('mercado', 'Mercado', '🛒', 'predio', 'Os carrinhos estão largados no meio do corredor.', [
  C('corredor de alimentos', 35, [2, 4], { comida_conserva: 30, comida_seca: 30, doce: 8, bebida: 12, comida_fresca: 8, vazio: 12 }),
  C('bebidas e limpeza', 15, [1, 3], { bebida: 40, limpeza: 20, higiene: 20, vazio: 20 }),
  C('hortifruti e açougue', 12, [1, 3], { comida_fresca: 70, vazio: 30 }),
  C('estoque', 25, [2, 5], { comida_conserva: 22, comida_seca: 22, bebida: 18, limpeza: 8, ferramenta: 4, material: 5, mochila: 3, vazio: 18 }),
  C('caixas', 8, [1, 2], { lixo: 25, eletronico: 8, escritorio: 15, doce: 12, lore: 6, chave: 4, vazio: 30 }),
]);

L('padaria', 'Padaria', '🥖', 'predio', 'O cheiro de pão ainda paira no ar.', [
  C('balcão', 50, [1, 3], { comida_fresca: 45, doce: 25, bebida: 15, vazio: 15 }),
  C('forno', 30, [1, 2], { comida_seca: 30, cozinha_util: 30, vazio: 40 }),
  C('depósito', 20, [1, 3], { comida_seca: 40, bebida: 15, limpeza: 8, vazio: 37 }),
]);

L('restaurante', 'Restaurante', '🍽️', 'predio', 'Mesas postas para clientes que nunca vieram.', [
  C('cozinha', 40, [2, 4], { comida_fresca: 25, comida_conserva: 20, comida_seca: 15, cozinha_util: 25, vazio: 15 }),
  C('salão', 25, [1, 2], { bebida: 20, lixo: 20, cozinha_util: 20, lore: 5, vazio: 35 }),
  C('despensa', 25, [2, 3], { comida_conserva: 30, comida_seca: 30, bebida: 15, vazio: 25 }),
  C('escritório', 10, [1, 2], { escritorio: 30, lore: 10, chave: 8, vazio: 52 }),
]);

L('farmacia', 'Farmácia', '💊', 'predio', 'Prateleiras brancas, luzes frias piscando.', [
  C('balcão', 40, [1, 3], { medicina: 45, higiene: 25, doce: 5, vazio: 25 }),
  C('estoque', 35, [2, 4], { medicina: 45, medicina_forte: 15, vazio: 20 }),
  C('prateleiras', 25, [1, 3], { higiene: 40, medicina: 25, doce: 8, bebida: 8, vazio: 19 }),
]);

L('loja_ferragens', 'Loja de ferragens', '🔧', 'predio', 'Ferramentas penduradas em ordem, como se alguém acabasse de arrumar.', [
  C('corredor', 55, [2, 4], { ferramenta: 45, material: 25, luz: 8, jardinagem: 8, quimico: 6, vazio: 8 }),
  C('depósito', 30, [1, 3], { material: 30, ferramenta: 25, combustivel: 8, corda: 10, jardinagem: 8, vazio: 19 }),
  C('balcão', 15, [1, 2], { escritorio: 15, chave: 12, lixo: 10, vazio: 63 }),
]);

L('loja_esportes', 'Loja de esportes e caça', '🏹', 'predio', 'Uma vitrine de arcos e barracas, coberta de poeira recente.', [
  C('seção de caça', 30, [1, 3], { caca: 50, camping: 15, vazio: 35 }),
  C('seção de camping', 30, [1, 3], { camping: 40, sobrevivencia: 25, pesca: 12, mochila: 8, vazio: 15 }),
  C('esportes', 25, [1, 3], { esporte: 45, roupa: 15, calcado: 12, protecao: 8, vazio: 20 }),
  C('provadores', 15, [1, 2], { roupa: 40, calcado: 15, vazio: 45 }),
]);

L('loja_roupas', 'Loja de roupas', '👕', 'predio', 'Manequins vestidos, e só eles.', [
  C('vitrine', 60, [1, 3], { roupa: 60, calcado: 15, mochila: 10, vazio: 15 }),
  C('estoque', 40, [2, 4], { roupa: 60, calcado: 18, mochila: 8, protecao: 4, vazio: 10 }),
]);

L('loja_eletronicos', 'Loja de eletrônicos', '📻', 'predio', 'Dezenas de telas ligadas, todas em silêncio.', [
  C('vitrine', 55, [1, 3], { eletronico: 50, comunicacao: 15, luz: 8, vazio: 27 }),
  C('estoque', 45, [2, 3], { eletronico: 45, comunicacao: 15, luz: 10, vazio: 30 }),
]);

L('posto_gasolina', 'Posto de gasolina', '⛽', 'predio', 'As bombas ainda marcam o último valor.', [
  C('loja de conveniência', 45, [1, 3], { doce: 18, bebida: 25, comida_seca: 20, lixo: 8, higiene: 5, luz: 3, eletronico: 3, vazio: 18 }),
  C('bombas', 20, [0, 2], { combustivel: 40, lixo: 10, vazio: 50 }),
  C('borracharia', 20, [1, 3], { ferramenta: 30, veiculo_item: 12, material: 15, combustivel: 10, vazio: 33 }),
  C('escritório', 15, [1, 2], { escritorio: 20, chave: 15, lore: 10, lixo: 10, vazio: 45 }),
]);

L('oficina', 'Oficina mecânica', '🛠️', 'predio', 'Um carro suspenso no elevador. Faltou o mecânico.', [
  C('bancada', 45, [2, 4], { ferramenta: 45, material: 20, quimico: 8, vazio: 27 }),
  C('depósito', 30, [1, 3], { combustivel: 15, veiculo_item: 20, material: 20, quimico: 10, vazio: 35 }),
  C('vestiário', 15, [1, 2], { roupa: 30, protecao: 15, calcado: 15, higiene: 8, vazio: 32 }),
  C('escritório', 10, [1, 2], { escritorio: 25, chave: 20, lore: 8, vazio: 47 }),
]);

// ------------------------------ INSTITUIÇÕES ------------------------------
L('hospital', 'Hospital', '🏥', 'predio', 'Macas vazias, monitores apitando para ninguém.', [
  C('pronto-socorro', 30, [2, 4], { medicina: 40, medicina_forte: 15, protecao: 4, eletronico: 2, vazio: 39 }),
  C('farmácia hospitalar', 22, [2, 4], { medicina_forte: 38, medicina: 30, vazio: 32 }),
  C('refeitório', 14, [1, 3], { comida_pronta: 20, comida_conserva: 20, bebida: 20, cozinha_util: 10, vazio: 30 }),
  C('quarto de paciente', 20, [1, 2], { lore: 10, livro: 8, roupa: 10, bebida: 8, medicina: 10, vazio: 54 }),
  C('vestiário', 14, [1, 2], { roupa: 40, calcado: 10, protecao: 8, higiene: 10, vazio: 32 }),
]);

L('delegacia', 'Delegacia', '🚓', 'predio', 'Café quente, rádio chiando. Nenhum policial à vista.', [
  C('recepção', 20, [1, 2], { escritorio: 30, lore: 8, chave: 8, eletronico: 6, lixo: 10, vazio: 38 }),
  C('arsenal', 8, [1, 3], { arma_policial: 30, policial: 35, vazio: 35 }),
  C('sala de evidências', 14, [1, 3], { arma_fogo: 12, arma_branca: 14, quimico: 6, medicina_forte: 6, eletronico: 10, roupa: 8, lixo: 12, lore: 10, vazio: 22 }),
  C('vestiário', 18, [1, 3], { policial: 25, roupa: 20, calcado: 10, protecao: 10, higiene: 8, vazio: 27 }),
  C('copa', 14, [1, 3], { comida_seca: 25, comida_conserva: 15, bebida: 25, cozinha_util: 10, vazio: 25 }),
  C('sala do delegado', 10, [1, 2], { escritorio: 20, policial: 15, lore: 12, chave: 10, alcool: 8, vazio: 35 }),
  C('cela', 8, [0, 1], { lixo: 10, lore: 6, chave: 5, vazio: 79 }),
]);

L('quartel', 'Quartel / base militar', '🪖', 'predio', 'Uma bandeira tremula sobre um pátio sem soldados.', [
  C('alojamento', 25, [1, 3], { roupa: 20, calcado: 10, militar: 15, higiene: 12, livro: 5, vazio: 38 }),
  C('arsenal militar', 12, [1, 3], { militar: 60, arma_policial: 10, vazio: 30 }),
  C('rancho', 22, [2, 4], { comida_conserva: 25, comida_seca: 20, militar: 8, bebida: 15, cozinha_util: 12, vazio: 20 }),
  C('enfermaria', 18, [1, 3], { medicina: 35, medicina_forte: 22, vazio: 43 }),
  C('depósito', 23, [1, 3], { ferramenta: 20, material: 15, combustivel: 12, camping: 10, luz: 8, militar: 5, corda: 5, vazio: 25 }),
]);

L('bombeiros', 'Quartel dos bombeiros', '🚒', 'predio', 'O caminhão continua na garagem. Os capacetes, nos cabides.', [
  C('garagem', 30, [1, 3], { ferramenta: 30, combustivel: 10, protecao: 8, corda: 10, material: 8, veiculo_item: 4, vazio: 30 }),
  C('alojamento', 25, [1, 3], { roupa: 20, higiene: 12, comida_seca: 12, bebida: 10, protecao: 8, livro: 4, vazio: 34 }),
  C('depósito', 25, [1, 3], { medicina: 25, ferramenta: 20, corda: 10, protecao: 15, luz: 8, vazio: 22 }),
  C('cozinha', 20, [1, 3], { comida_conserva: 20, comida_seca: 20, comida_fresca: 10, cozinha_util: 15, bebida: 15, vazio: 20 }),
]);

L('escola', 'Escola', '🏫', 'predio', 'Mochilas penduradas nas carteiras. Cadernos abertos.', [
  C('sala de aula', 35, [1, 3], { escritorio: 30, livro: 15, brinquedo: 5, lixo: 12, mochila: 6, vazio: 32 }),
  C('cantina', 20, [1, 3], { comida_conserva: 20, comida_seca: 25, comida_pronta: 10, bebida: 25, cozinha_util: 10, vazio: 10 }),
  C('quadra / ginásio', 20, [1, 3], { esporte: 55, roupa: 10, calcado: 8, vazio: 27 }),
  C('secretaria', 10, [1, 2], { escritorio: 25, chave: 12, lore: 8, vazio: 55 }),
  C('enfermaria escolar', 15, [1, 2], { medicina: 45, higiene: 10, vazio: 45 }),
]);

L('biblioteca', 'Biblioteca', '📚', 'predio', 'O silêncio aqui já era assim. Agora é completo.', [
  C('estantes', 70, [1, 3], { livro: 65, mapa: 6, lore: 4, vazio: 25 }),
  C('balcão', 30, [1, 2], { escritorio: 30, eletronico: 8, lixo: 8, lore: 6, vazio: 48 }),
]);

L('igreja', 'Igreja', '⛪', 'predio', 'Velas acesas, bancos cheios de nada.', [
  C('altar', 30, [1, 2], { religioso: 40, lore: 8, vazio: 52 }),
  C('sacristia', 30, [1, 2], { religioso: 15, roupa: 15, livro: 10, comida_seca: 8, bebida: 10, lore: 6, vazio: 36 }),
  C('salão paroquial', 40, [1, 3], { cozinha_util: 15, comida_seca: 15, comida_conserva: 12, bebida: 15, brinquedo: 8, roupa: 8, lixo: 8, vazio: 19 }),
]);

// ------------------------------ TRABALHO / INDÚSTRIA ------------------------------
L('escritorios', 'Prédio de escritórios', '🏙️', 'predio', 'Computadores ligados, cadeiras ainda girando.', [
  C('salas', 45, [1, 3], { escritorio: 35, eletronico: 15, lixo: 10, lore: 8, comida_seca: 6, bebida: 6, vazio: 20 }),
  C('copa', 20, [1, 3], { comida_seca: 22, bebida: 25, cozinha_util: 15, doce: 8, vazio: 30 }),
  C('sala de TI', 10, [1, 3], { eletronico: 40, comunicacao: 15, vazio: 45 }),
  C('recepção', 15, [1, 2], { escritorio: 20, chave: 10, lore: 10, vazio: 60 }),
  C('sala do chefe', 10, [1, 2], { alcool: 15, escritorio: 20, lore: 15, eletronico: 10, vazio: 40 }),
]);

L('fabrica', 'Fábrica', '🏭', 'predio', 'As máquinas ainda giram em falso.', [
  C('linha de produção', 40, [1, 3], { material: 35, ferramenta: 25, quimico: 12, vazio: 28 }),
  C('depósito', 30, [1, 3], { material: 25, ferramenta: 15, quimico: 10, combustivel: 10, roupa: 8, protecao: 8, vazio: 24 }),
  C('vestiário', 15, [1, 2], { roupa: 30, calcado: 15, protecao: 15, higiene: 10, vazio: 30 }),
  C('escritório', 15, [1, 2], { escritorio: 25, chave: 12, lore: 8, vazio: 55 }),
]);

L('armazem', 'Armazém / galpão', '📦', 'predio', 'Paletes empilhados até o teto, sem ninguém para movê-los.', [
  C('prateleiras', 60, [1, 4], { comida_conserva: 10, comida_seca: 10, bebida: 8, material: 15, ferramenta: 10, limpeza: 6, eletronico: 6, roupa: 6, camping: 4, vazio: 25 }),
  C('docas', 40, [0, 3], { material: 20, combustivel: 10, veiculo_item: 10, lixo: 15, vazio: 45 }),
]);

L('fazenda', 'Fazenda', '🚜', 'predio', 'Os animais ainda estão aqui. Os donos, não.', [
  C('celeiro', 40, [1, 3], { jardinagem: 30, ferramenta: 20, comida_seca: 15, combustivel: 8, corda: 8, material: 10, vazio: 9 }),
  C('galinheiro', 15, [1, 3], { ovos: 55, vazio: 45 }),
  C('casa-sede', 25, [1, 3], { comida_conserva: 15, comida_seca: 15, comida_fresca: 15, bebida: 10, cozinha_util: 10, roupa: 10, medicina: 4, vazio: 21 }),
  C('horta', 20, [1, 3], { horta: 60, jardinagem: 10, vazio: 30 }),
]);

// ------------------------------ VEÍCULOS ------------------------------
L('carro', 'Carro abandonado', '🚗', 'veiculo', 'A porta aberta, o motor ainda quente.', [
  C('porta-malas', 40, [1, 3], { ferramenta: 18, camping: 10, esporte: 8, mochila: 8, material: 8, comida_seca: 6, bebida: 8, roupa: 6, veiculo_item: 8, vazio: 20 }),
  C('porta-luvas', 25, [0, 2], { chave: 10, lixo: 20, escritorio: 10, medicina: 8, lore: 10, vazio: 42 }),
  C('bancos', 35, [0, 2], { lixo: 20, roupa: 10, bebida: 8, comida_seca: 8, eletronico: 8, lore: 6, vazio: 40 }),
]);

L('caminhao', 'Caminhão de carga', '🚚', 'veiculo', 'O baú está lacrado. A cabine, vazia.', [
  C('carga', 70, [2, 5], { comida_conserva: 14, comida_seca: 14, bebida: 14, material: 12, ferramenta: 6, eletronico: 8, roupa: 8, limpeza: 6, vazio: 18 }),
  C('cabine', 30, [1, 2], { comida_seca: 10, bebida: 10, lixo: 12, chave: 8, lore: 8, ferramenta: 6, vazio: 46 }),
]);

L('onibus', 'Ônibus', '🚌', 'veiculo', 'Cartões de passagem espalhados pelo chão.', [
  C('bancos', 60, [0, 2], { lixo: 25, mochila: 12, roupa: 8, eletronico: 8, livro: 6, lore: 8, vazio: 33 }),
  C('banco do motorista', 25, [0, 2], { escritorio: 15, chave: 10, lixo: 15, lore: 10, vazio: 50 }),
]);

// ------------------------------ NATURAIS / ACAMPAMENTO ------------------------------
L('acampamento', 'Acampamento abandonado', '⛺', 'natural', 'A barraca montada, o fogo apagado. Nenhuma pegada.', [
  C('barraca', 50, [1, 3], { camping: 35, sobrevivencia: 25, comida_seca: 15, roupa: 10, vazio: 15 }),
  C('fogueira apagada', 25, [0, 2], { fogo: 25, lixo: 20, vazio: 55 }),
  C('caixa de mantimentos', 25, [1, 3], { comida_conserva: 30, comida_seca: 25, bebida: 15, cozinha_util: 10, vazio: 20 }),
]);

L('mata', 'Mata', '🌲', 'natural', 'Galhos estalam, mas só pelo vento.', [
  C('clareira', 35, [1, 3], { forrageio: 50, material: 15, vazio: 35 }),
  C('trilha', 30, [1, 2], { forrageio: 20, lixo: 10, mapa: 3, lore: 3, camping: 5, vazio: 59 }),
  C('tronco oco', 15, [1, 2], { forrageio: 35, lore: 5, vazio: 60 }),
  C('ninho', 20, [1, 2], { ovos_silvestres: 50, vazio: 50 }),
]);

L('lago', 'Lago', '🌊', 'natural', 'A água está parada demais.', [
  C('margem', 40, [1, 3], { agua_natural: 40, pesca: 20, forrageio: 15, lixo: 8, vazio: 17 }),
  C('águas fundas', 20, [1, 2], { pesca: 45, vazio: 55 }),
  C('píer', 20, [1, 2], { pesca: 15, lixo: 15, camping: 8, lore: 5, vazio: 57 }),
  C('barco abandonado', 20, [1, 3], { camping: 20, sobrevivencia: 20, ferramenta: 10, corda: 15, combustivel: 10, vazio: 25 }),
]);

L('plantacao', 'Campo e plantação', '🌾', 'natural', 'O trigo balança sozinho, sem ninguém para colher.', [
  C('milharal', 50, [1, 3], { colheita: 55, vazio: 45 }),
  C('espantalho', 10, [0, 2], { roupa: 25, lore: 8, vazio: 67 }),
  C('galpão do trator', 25, [1, 3], { ferramenta: 25, combustivel: 15, jardinagem: 20, vazio: 40 }),
  C('mato alto', 15, [1, 2], { forrageio: 25, ovos_silvestres: 20, vazio: 55 }),
]);

L('ruinas', 'Ruínas e escombros', '🧱', 'natural', 'Paredes caídas, anos antes de qualquer sumiço.', [
  C('entulho', 60, [1, 3], { material: 40, ferramenta: 10, lixo: 15, arma_branca: 6, vazio: 29 }),
  C('porão desabado', 20, [1, 3], { lore: 8, comida_conserva: 10, material: 20, ferramenta: 10, quimico: 6, vazio: 46 }),
  C('cofre antigo', 5, [1, 2], { lore: 20, municao: 6, arma_fogo: 6, escritorio: 10, vazio: 58 }),
]);

L('montanha', 'Montanha', '⛰️', 'natural', 'Pedras soltas e vento cortante.', [
  C('encosta', 40, [1, 2], { material: 30, forrageio: 10, vazio: 60 }),
  C('caverna', 30, [1, 3], { material: 15, lore: 6, camping: 8, forrageio: 10, vazio: 61 }),
  C('mirante', 15, [1, 2], { camping: 15, sobrevivencia: 15, lixo: 10, lore: 6, vazio: 54 }),
  C('mochila de trilheiro', 15, [1, 3], { camping: 30, mochila: 15, comida_seca: 15, sobrevivencia: 20, mapa: 6, vazio: 14 }),
]);

L('pantano', 'Pântano', '🐊', 'natural', 'O ar tem gosto de ferrugem e lama.', [
  C('lamaçal', 50, [1, 2], { forrageio: 20, agua_natural: 20, lixo: 10, vazio: 50 }),
  C('ilhota', 25, [1, 2], { lore: 8, material: 20, camping: 10, ovos_silvestres: 20, vazio: 42 }),
  C('cabana sobre palafitas', 25, [1, 3], { camping: 20, pesca: 20, comida_conserva: 12, medicina: 6, ferramenta: 10, vazio: 32 }),
]);

module.exports = { LOCAIS };
