'use strict';
// =====================================================================
//  CATÁLOGO DE ITENS
//  Todos os humanos sumiram, mas as coisas ficaram.
//
//  Como ler cada linha:
//    A( id, nome, 'tags separadas por espaço', raridade, peso_kg, { extras } )
//
//  - raridade: quanto MAIOR, mais comum (peso do sorteio dentro da tag).
//  - tags: é o que os locais usam para decidir o que pode aparecer ali.
//  - extras: uso (efeito ao consumir), dano, ruido, slot, prot, cap, etc.
//  - qtd: [min, max] quantidade encontrada de uma vez (padrão 1).
// =====================================================================
const ITENS = {};

function A(id, nome, tags, raridade, peso, extra) {
  if (ITENS[id]) throw new Error('Item duplicado: ' + id);
  ITENS[id] = Object.assign(
    { id, nome, tags: tags.split(' '), raridade, peso, qtd: [1, 1] },
    extra || {}
  );
}

// ---------------------------------------------------------------------
// COMIDA ENLATADA / SECA (dura muito tempo)
// ---------------------------------------------------------------------
A('feijao_lata', 'Feijão em lata', 'comida comida_conserva', 60, 0.4, { uso: { fome: 30 }, req: 'abridor_ou_faca' });
A('atum_lata', 'Atum em lata', 'comida comida_conserva', 55, 0.2, { uso: { fome: 35 }, req: 'abridor_ou_faca' });
A('sardinha_lata', 'Sardinha em lata', 'comida comida_conserva', 50, 0.15, { uso: { fome: 30 }, req: 'abridor_ou_faca' });
A('milho_lata', 'Milho em lata', 'comida comida_conserva', 50, 0.3, { uso: { fome: 20 }, req: 'abridor_ou_faca' });
A('sopa_lata', 'Sopa em lata', 'comida comida_conserva', 45, 0.4, { uso: { fome: 25, sede: 8 }, req: 'abridor_ou_faca' });
A('salsicha_lata', 'Salsicha em lata', 'comida comida_conserva', 40, 0.3, { uso: { fome: 28 }, req: 'abridor_ou_faca' });
A('pessego_calda', 'Pêssego em calda', 'comida comida_conserva doce', 30, 0.4, { uso: { fome: 18, sede: 5, moral: 3 }, req: 'abridor_ou_faca' });
A('leite_condensado', 'Leite condensado', 'comida comida_conserva doce', 30, 0.4, { uso: { fome: 25, moral: 4 }, req: 'abridor_ou_faca' });
A('macarrao_instantaneo', 'Macarrão instantâneo', 'comida comida_seca', 60, 0.1, { uso: { fome: 28 }, melhorCozido: true });
A('arroz_cru', 'Arroz (pacote)', 'comida comida_seca', 45, 1, { uso: { fome: 6 }, cozinhar: { fome: 45 } });
A('feijao_cru', 'Feijão (pacote)', 'comida comida_seca', 40, 1, { uso: { fome: 4 }, cozinhar: { fome: 42 } });
A('macarrao_cru', 'Macarrão (pacote)', 'comida comida_seca', 40, 0.5, { uso: { fome: 5 }, cozinhar: { fome: 40 } });
A('farinha_trigo', 'Farinha de trigo', 'comida comida_seca', 25, 1, { uso: { fome: 3 }, cozinhar: { fome: 30 } });
A('acucar', 'Açúcar', 'comida comida_seca doce', 30, 1, { uso: { fome: 8, energia: 4 } });
A('sal', 'Sal', 'comida comida_seca', 25, 0.5, { efeito: 'conserva carne; ingrediente' });
A('oleo_cozinha', 'Óleo de cozinha', 'comida comida_seca cozinha_util', 25, 0.9, { efeito: 'ingrediente; combustível fraco' });
A('cafe_po', 'Café em pó', 'comida comida_seca', 25, 0.5, { uso: { energia: 10 }, cozinhar: { energia: 12 } });
A('biscoito_agua_sal', 'Biscoito água e sal', 'comida comida_seca', 60, 0.2, { uso: { fome: 15 } });
A('bolacha_recheada', 'Bolacha recheada', 'comida comida_seca doce', 55, 0.15, { uso: { fome: 14, moral: 2 } });
A('barra_cereal', 'Barra de cereal', 'comida comida_seca', 50, 0.05, { uso: { fome: 15, energia: 4 } });
A('amendoim', 'Amendoim', 'comida comida_seca', 40, 0.2, { uso: { fome: 15 } });
A('castanhas', 'Mix de castanhas', 'comida comida_seca', 25, 0.2, { uso: { fome: 20, energia: 4 } });
A('granola', 'Granola', 'comida comida_seca', 30, 0.4, { uso: { fome: 22 } });
A('cereal_matinal', 'Cereal matinal', 'comida comida_seca', 40, 0.4, { uso: { fome: 20 } });
A('salgadinho', 'Salgadinho', 'comida comida_seca', 50, 0.1, { uso: { fome: 10, moral: 1 } });
A('chocolate', 'Barra de chocolate', 'comida comida_seca doce', 40, 0.1, { uso: { fome: 12, moral: 5 } });
A('bala_pacote', 'Pacote de balas', 'comida comida_seca doce', 35, 0.1, { uso: { fome: 4, moral: 2 } });
A('pacoquinha', 'Paçoquinha', 'comida comida_seca doce', 25, 0.05, { uso: { fome: 10 } });
A('pipoca_micro', 'Pipoca de micro-ondas', 'comida comida_seca', 20, 0.1, { uso: { fome: 8 }, cozinhar: { fome: 14 } });
A('mel', 'Pote de mel', 'comida comida_seca doce', 15, 0.5, { uso: { fome: 20, energia: 6, pv: 2 } });
A('geleia', 'Geleia', 'comida comida_conserva doce', 20, 0.3, { uso: { fome: 12, moral: 2 } });
A('manteiga_amendoim', 'Pasta de amendoim', 'comida comida_conserva', 20, 0.4, { uso: { fome: 28 } });
A('racao_militar', 'Ração militar', 'comida comida_conserva', 8, 0.5, { uso: { fome: 60, sede: 5, energia: 5 } });
A('racao_pet', 'Ração de animal', 'comida comida_seca', 15, 1, { uso: { fome: 10, moral: -4 }, efeito: 'só para desesperados' });

// ---------------------------------------------------------------------
// COMIDA FRESCA / PRONTA (estraga com os dias)
// ---------------------------------------------------------------------
A('maca', 'Maçã', 'comida comida_fresca', 40, 0.2, { uso: { fome: 10, sede: 4 }, estraga: 10 });
A('banana', 'Banana', 'comida comida_fresca', 40, 0.15, { uso: { fome: 12 }, estraga: 5 });
A('laranja', 'Laranja', 'comida comida_fresca', 35, 0.2, { uso: { fome: 8, sede: 8 }, estraga: 10 });
A('tomate', 'Tomate', 'comida comida_fresca', 30, 0.15, { uso: { fome: 6, sede: 4 }, estraga: 6 });
A('batata', 'Batata', 'comida comida_fresca', 35, 0.3, { uso: { fome: 4 }, cozinhar: { fome: 22 }, estraga: 20 });
A('cenoura', 'Cenoura', 'comida comida_fresca', 30, 0.2, { uso: { fome: 8 }, estraga: 14 });
A('cebola', 'Cebola', 'comida comida_fresca', 30, 0.2, { uso: { fome: 4 }, estraga: 25 });
A('ovo', 'Ovo', 'comida comida_fresca', 30, 0.06, { uso: { fome: 6 }, cozinhar: { fome: 14 }, estraga: 14, risco: 0.15, qtd: [2, 6] });
A('queijo', 'Queijo', 'comida comida_fresca', 25, 0.3, { uso: { fome: 18 }, estraga: 10 });
A('presunto', 'Presunto fatiado', 'comida comida_fresca', 25, 0.2, { uso: { fome: 16 }, estraga: 5 });
A('linguica', 'Linguiça', 'comida comida_fresca', 20, 0.4, { uso: { fome: 8 }, cozinhar: { fome: 30 }, estraga: 6, risco: 0.3 });
A('carne_crua', 'Carne crua', 'comida comida_fresca', 20, 0.6, { uso: { fome: 6 }, cozinhar: { fome: 38 }, estraga: 3, risco: 0.6 });
A('frango_cru', 'Frango cru', 'comida comida_fresca', 20, 0.8, { uso: { fome: 5 }, cozinhar: { fome: 36 }, estraga: 3, risco: 0.7 });
A('pao_forma', 'Pão de forma', 'comida comida_fresca', 40, 0.4, { uso: { fome: 22 }, estraga: 6 });
A('pao_frances', 'Pão francês', 'comida comida_fresca', 45, 0.1, { uso: { fome: 12 }, estraga: 3, qtd: [1, 4] });
A('bolo', 'Fatia de bolo', 'comida comida_fresca doce', 25, 0.2, { uso: { fome: 18, moral: 4 }, estraga: 4 });
A('marmita', 'Marmita pronta', 'comida comida_pronta', 25, 0.6, { uso: { fome: 45 }, estraga: 3 });
A('sanduiche', 'Sanduíche embalado', 'comida comida_pronta', 30, 0.3, { uso: { fome: 28 }, estraga: 2 });
A('pizza_fria', 'Pizza (sobras)', 'comida comida_pronta', 20, 0.5, { uso: { fome: 30 }, estraga: 2 });

// ---------------------------------------------------------------------
// BEBIDAS
// ---------------------------------------------------------------------
A('agua_garrafa', 'Garrafa de água', 'bebida agua', 60, 0.5, { uso: { sede: 40 } });
A('agua_galao', 'Galão de água 5L', 'bebida agua', 18, 5, { uso: { sede: 40 }, usos: 5 });
A('refrigerante_lata', 'Refrigerante em lata', 'bebida', 55, 0.35, { uso: { sede: 20, fome: 4, moral: 2 } });
A('suco_caixa', 'Suco de caixinha', 'bebida', 45, 0.25, { uso: { sede: 22, fome: 4 } });
A('cerveja_lata', 'Cerveja em lata', 'bebida alcool', 35, 0.35, { uso: { sede: 8, moral: 3, alcool: 1 } });
A('vinho', 'Garrafa de vinho', 'bebida alcool', 15, 1.2, { uso: { sede: 6, moral: 5, alcool: 2 } });
A('whisky', 'Garrafa de uísque', 'bebida alcool', 10, 1.1, { uso: { moral: 6, alcool: 3 }, efeito: 'serve como antisséptico fraco' });
A('energetico', 'Energético', 'bebida', 30, 0.3, { uso: { sede: 10, energia: 18 } });
A('isotonico', 'Isotônico', 'bebida', 25, 0.5, { uso: { sede: 30, energia: 6 } });
A('leite_caixa', 'Leite de caixinha', 'bebida comida_conserva', 30, 1, { uso: { sede: 15, fome: 12 } });
A('agua_coco', 'Água de coco', 'bebida', 15, 0.4, { uso: { sede: 25 } });
A('garrafa_vazia', 'Garrafa vazia', 'agua sobrevivencia', 40, 0.1, { efeito: 'pode encher em rio ou lago (água suja)' });
A('cantil', 'Cantil', 'agua sobrevivencia camping', 18, 0.3, { usos: 4, efeito: 'carrega 4 goles' });
A('agua_rio', 'Água do rio (suja)', 'agua_natural', 60, 0.5, { uso: { sede: 35 }, risco: 0.45, efeito: 'ferve ou purifica antes de beber' });

// ---------------------------------------------------------------------
// MEDICINA E PRIMEIROS SOCORROS
// ---------------------------------------------------------------------
A('bandagem', 'Bandagem', 'medicina', 55, 0.05, { uso: { sangramento: 'estanca', pv: 6 } });
A('atadura', 'Atadura', 'medicina', 40, 0.1, { uso: { sangramento: 'estanca', pv: 4 } });
A('curativo', 'Curativo adesivo', 'medicina', 60, 0.01, { uso: { pv: 2, infeccao: -5 }, qtd: [2, 8] });
A('gaze', 'Gaze estéril', 'medicina', 35, 0.05, { uso: { sangramento: 'estanca' }, qtd: [1, 4] });
A('alcool_70', 'Álcool 70%', 'medicina quimico', 45, 0.5, { uso: { infeccao: -25 }, usos: 4, efeito: 'também combustível' });
A('iodo', 'Iodo/Povidine', 'medicina', 25, 0.1, { uso: { infeccao: -30 }, usos: 3 });
A('agua_oxigenada', 'Água oxigenada', 'medicina quimico', 30, 0.3, { uso: { infeccao: -20 }, usos: 3 });
A('analgesico', 'Analgésico', 'medicina', 55, 0.02, { uso: { dor: -30 }, qtd: [2, 10] });
A('ibuprofeno', 'Anti-inflamatório', 'medicina', 35, 0.02, { uso: { dor: -25, inflamacao: -20 }, qtd: [2, 8] });
A('antibiotico', 'Antibiótico', 'medicina medicina_forte', 14, 0.03, { uso: { infeccao: -80 }, qtd: [2, 8] });
A('antidiarreico', 'Antidiarreico', 'medicina', 25, 0.02, { uso: { doenca: 'diarreia' }, qtd: [1, 4] });
A('antialergico', 'Antialérgico', 'medicina', 25, 0.02, { uso: { doenca: 'alergia' }, qtd: [1, 4] });
A('kit_primeiros_socorros', 'Kit de primeiros socorros', 'medicina', 22, 0.8, { uso: { sangramento: 'estanca', pv: 18, infeccao: -20 }, usos: 3 });
A('kit_medico', 'Kit médico', 'medicina medicina_forte', 10, 1.2, { uso: { sangramento: 'estanca', pv: 35, infeccao: -40, dor: -20 }, usos: 2 });
A('kit_sutura', 'Kit de sutura', 'medicina medicina_forte', 10, 0.2, { uso: { sangramento: 'estanca', pv: 14 }, req: 'astucia 5+' });
A('torniquete', 'Torniquete', 'medicina', 15, 0.1, { uso: { sangramento: 'estanca_membro' } });
A('tala', 'Tala', 'medicina', 15, 0.3, { uso: { fratura: 'imobiliza' } });
A('morfina', 'Ampola de morfina', 'medicina medicina_forte', 6, 0.02, { uso: { dor: -100 }, efeito: 'tontura leve' });
A('epinefrina', 'Epinefrina (autoinjetor)', 'medicina medicina_forte', 5, 0.02, { uso: { energia: 25, doenca: 'anafilaxia' } });
A('soro', 'Bolsa de soro', 'medicina medicina_forte', 9, 0.6, { uso: { sede: 40, pv: 8 } });
A('vitaminas', 'Vitaminas', 'medicina', 25, 0.05, { uso: { energia: 6, imunidade: 10 }, qtd: [3, 15] });
A('repelente', 'Repelente', 'medicina higiene', 25, 0.2, { efeito: 'evita picadas e doenças no Pântano' });
A('protetor_solar', 'Protetor solar', 'medicina higiene', 25, 0.2, { efeito: 'evita queimaduras no Campo' });
A('colirio', 'Colírio', 'medicina', 15, 0.05, { uso: { visao: 8 } });
A('termometro', 'Termômetro', 'medicina', 12, 0.02, { efeito: 'revela febre' });
A('mascara_cirurgica', 'Máscara cirúrgica', 'medicina protecao', 30, 0.01, { qtd: [1, 6], efeito: 'reduz risco de doença' });
A('luvas_latex', 'Luvas de látex', 'medicina protecao', 25, 0.05, { qtd: [1, 4], efeito: 'reduz infecção ao tratar feridas' });
A('pomada', 'Pomada cicatrizante', 'medicina', 25, 0.1, { uso: { pv: 5, infeccao: -10 }, usos: 3 });

// ---------------------------------------------------------------------
// HIGIENE E LIMPEZA
// ---------------------------------------------------------------------
A('sabonete', 'Sabonete', 'higiene', 45, 0.1, { uso: { higiene: 10 } });
A('shampoo', 'Shampoo', 'higiene', 35, 0.4, { uso: { higiene: 10 } });
A('pasta_dente', 'Pasta de dente', 'higiene', 40, 0.15, { uso: { higiene: 5 } });
A('escova_dente', 'Escova de dentes', 'higiene', 40, 0.02, { uso: { higiene: 4 } });
A('papel_higienico', 'Papel higiênico', 'higiene', 55, 0.3, { efeito: 'moral +; vira pavio improvisado' });
A('absorvente', 'Absorventes', 'higiene medicina', 30, 0.1, { uso: { sangramento: 'estanca_fraco' }, efeito: 'curativo improvisado' });
A('desodorante', 'Desodorante', 'higiene', 35, 0.15, { efeito: 'moral +' });
A('toalha', 'Toalha', 'higiene material', 40, 0.4, { efeito: 'seca roupa; vira bandagem improvisada' });
A('barbeador', 'Aparelho de barbear', 'higiene arma_branca', 30, 0.05, { dano: [2, 5], ruido: 0, dur: 4 });
A('agua_sanitaria', 'Água sanitária', 'limpeza quimico', 40, 1, { efeito: 'purifica água (poucas gotas); tóxica se bebida' });
A('detergente', 'Detergente', 'limpeza', 40, 0.5, {});
A('desinfetante', 'Desinfetante', 'limpeza quimico', 35, 0.8, {});
A('esponja', 'Esponja', 'limpeza lixo', 30, 0.02, {});
A('sacos_lixo', 'Sacos de lixo', 'limpeza material', 35, 0.2, { efeito: 'capa de chuva improvisada' });
A('amonia', 'Amônia', 'limpeza quimico', 12, 0.5, { efeito: 'atordoa se jogada no rosto' });

// ---------------------------------------------------------------------
// UTENSÍLIOS DE COZINHA
// ---------------------------------------------------------------------
A('abridor_lata', 'Abridor de latas', 'cozinha_util', 40, 0.1, { efeito: 'necessário para latas (ou faca)' });
A('panela', 'Panela', 'cozinha_util', 45, 0.8, { efeito: 'cozinhar e ferver água' });
A('frigideira', 'Frigideira', 'cozinha_util arma_branca', 30, 1.1, { dano: [6, 14], ruido: 4, dur: 40, atributo: 'FOR', efeito: 'cozinhar; arma improvisada' });
A('faca_cozinha', 'Faca de cozinha', 'cozinha_util arma_branca', 50, 0.2, { dano: [8, 16], ruido: 1, dur: 30, atributo: 'AGI', efeito: 'abre latas, corta carne' });
A('rolo_massa', 'Rolo de massa', 'cozinha_util arma_branca', 20, 0.5, { dano: [5, 11], ruido: 3, dur: 40, atributo: 'FOR' });
A('talheres', 'Talheres', 'cozinha_util lixo', 40, 0.1, {});
A('pratos', 'Pratos', 'cozinha_util lixo', 40, 0.6, {});

// ---------------------------------------------------------------------
// ARMAS BRANCAS / IMPROVISADAS
// ---------------------------------------------------------------------
A('taco_beisebol', 'Taco de beisebol', 'arma_branca esporte', 22, 0.9, { dano: [8, 18], ruido: 4, dur: 60, atributo: 'FOR' });
A('taco_golfe', 'Taco de golfe', 'arma_branca esporte', 14, 0.7, { dano: [6, 14], ruido: 3, dur: 45, atributo: 'FOR' });
A('taco_sinuca', 'Taco de sinuca', 'arma_branca esporte', 14, 0.5, { dano: [4, 10], ruido: 2, dur: 30, atributo: 'AGI' });
A('raquete_tenis', 'Raquete de tênis', 'arma_branca esporte', 14, 0.4, { dano: [3, 8], ruido: 2, dur: 20, atributo: 'AGI' });
A('machado', 'Machado', 'arma_branca ferramenta', 14, 2, { dano: [15, 32], ruido: 5, dur: 80, atributo: 'FOR', cansaco: 3, efeito: 'também racha lenha e arromba portas' });
A('machadinha', 'Machadinha', 'arma_branca ferramenta camping', 16, 1, { dano: [11, 22], ruido: 4, dur: 60, atributo: 'FOR', cansaco: 2 });
A('canivete', 'Canivete', 'arma_branca ferramenta camping', 30, 0.1, { dano: [5, 11], ruido: 1, dur: 25, atributo: 'AGI' });
A('faca_caca', 'Faca de caça', 'arma_branca camping', 12, 0.3, { dano: [10, 19], ruido: 1, dur: 50, atributo: 'AGI' });
A('facao', 'Facão', 'arma_branca jardinagem', 12, 0.9, { dano: [12, 24], ruido: 3, dur: 55, atributo: 'FOR' });
A('martelo', 'Martelo', 'arma_branca ferramenta', 40, 0.7, { dano: [7, 15], ruido: 3, dur: 60, atributo: 'FOR' });
A('chave_inglesa', 'Chave inglesa', 'arma_branca ferramenta', 35, 1, { dano: [8, 16], ruido: 3, dur: 70, atributo: 'FOR' });
A('pe_de_cabra', 'Pé de cabra', 'arma_branca ferramenta', 18, 1.5, { dano: [10, 20], ruido: 4, dur: 90, atributo: 'FOR', efeito: 'arromba portas e cadeados' });
A('cano_ferro', 'Cano de ferro', 'arma_branca material', 28, 1.5, { dano: [9, 17], ruido: 4, dur: 80, atributo: 'FOR' });
A('pa', 'Pá', 'arma_branca ferramenta jardinagem', 25, 1.8, { dano: [9, 18], ruido: 4, dur: 70, atributo: 'FOR', efeito: 'cava; enterra' });
A('picareta', 'Picareta', 'arma_branca ferramenta', 8, 2.5, { dano: [14, 28], ruido: 5, dur: 90, atributo: 'FOR', cansaco: 3 });
A('foice', 'Foice', 'arma_branca jardinagem', 12, 1, { dano: [11, 21], ruido: 3, dur: 50, atributo: 'AGI' });
A('enxada', 'Enxada', 'arma_branca jardinagem', 25, 1.5, { dano: [7, 15], ruido: 3, dur: 60, atributo: 'FOR' });
A('tesoura', 'Tesoura grande', 'arma_branca ferramenta escritorio', 30, 0.2, { dano: [5, 12], ruido: 1, dur: 20, atributo: 'AGI' });
A('cassetete', 'Cassetete', 'arma_branca', 6, 0.5, { dano: [7, 14], ruido: 3, dur: 100, atributo: 'FOR' });
A('espada_decorativa', 'Espada decorativa', 'arma_branca', 4, 1.5, { dano: [10, 22], ruido: 3, dur: 25, atributo: 'AGI', efeito: 'quebra fácil' });
A('motosserra', 'Motosserra', 'arma_branca ferramenta', 3, 5, { dano: [25, 50], ruido: 10, dur: 40, atributo: 'FOR', usaCombustivel: true, cansaco: 4, efeito: 'barulho ouvido por toda a região' });
A('estaca_afiada', 'Estaca afiada', 'craft', 5, 0.6, { dano: [10, 27], ruido: 2, dur: 20, atributo: 'FOR', efeito: 'improvisada com madeira' });
A('garrafa_quebrada', 'Garrafa quebrada', 'craft', 5, 0.3, { dano: [6, 13], ruido: 1, dur: 3, atributo: 'AGI' });

// ---------------------------------------------------------------------
// ARMAS À DISTÂNCIA / DE FOGO / NÃO LETAIS
// ---------------------------------------------------------------------
A('arco_caca', 'Arco de caça', 'arma_distancia', 10, 1.2, { dano: [12, 24], ruido: 1, municao: 'flechas', alcance: 'distancia', atributo: 'AGI' });
A('besta', 'Besta', 'arma_distancia', 6, 3, { dano: [16, 30], ruido: 2, municao: 'virotes', alcance: 'distancia', atributo: 'AGI' });
A('estilingue', 'Estilingue', 'arma_distancia brinquedo', 18, 0.1, { dano: [2, 7], ruido: 1, municao: 'pedra', alcance: 'distancia', atributo: 'AGI' });
A('pistola_9mm', 'Pistola 9mm', 'arma_fogo', 20, 0.9, { dano: [18, 30], ruido: 9, municao: 'municao_9mm', alcance: 'distancia', atributo: 'AGI', cap: 15 });
A('revolver_38', 'Revólver .38', 'arma_fogo', 18, 1, { dano: [20, 32], ruido: 9, municao: 'municao_38', alcance: 'distancia', atributo: 'AGI', cap: 6 });
A('espingarda_12', 'Espingarda calibre 12', 'arma_fogo', 12, 3.2, { dano: [25, 50], ruido: 10, municao: 'cartucho_12', alcance: 'distancia', atributo: 'FOR', cap: 5 });
A('rifle_caca', 'Rifle de caça', 'arma_fogo', 8, 3.5, { dano: [28, 45], ruido: 10, municao: 'municao_rifle', alcance: 'distancia', atributo: 'AGI', cap: 5 });
A('fuzil_assalto', 'Fuzil de assalto', 'arma_fogo', 2, 4, { dano: [22, 38], ruido: 10, municao: 'municao_fuzil', alcance: 'distancia', atributo: 'FOR', cap: 30, rajada: true });
A('pistola_sinalizadora', 'Pistola sinalizadora', 'arma_fogo sobrevivencia', 6, 0.6, { dano: [6, 16], ruido: 8, municao: 'cartucho_sinalizador', alcance: 'distancia', efeito: 'o clarão é visto de longe' });
A('taser', 'Arma de choque (taser)', 'arma_nao_letal', 8, 0.4, { dano: [0, 4], ruido: 2, efeito: 'paralisa o alvo por um turno', usos: 3 });
A('spray_pimenta', 'Spray de pimenta', 'arma_nao_letal', 12, 0.15, { dano: [0, 2], ruido: 1, efeito: 'cega o alvo por um turno', usos: 4 });
A('pistola_brinquedo', 'Pistola de brinquedo', 'brinquedo arma_nao_letal', 10, 0.3, { dano: [0, 1], ruido: 0, efeito: 'blefe: pode intimidar com CAR alto' });
A('municao_9mm', 'Munição 9mm', 'municao', 40, 0.02, { qtd: [4, 16] });
A('municao_38', 'Munição .38', 'municao', 35, 0.02, { qtd: [3, 12] });
A('cartucho_12', 'Cartuchos calibre 12', 'municao', 35, 0.05, { qtd: [2, 10] });
A('municao_rifle', 'Munição de rifle', 'municao', 25, 0.03, { qtd: [3, 10] });
A('municao_fuzil', 'Munição de fuzil', 'municao', 8, 0.03, { qtd: [8, 30] });
A('flechas', 'Flechas', 'municao', 40, 0.05, { qtd: [3, 12] });
A('virotes', 'Virotes de besta', 'municao', 25, 0.05, { qtd: [3, 10] });
A('cartucho_sinalizador', 'Cartucho sinalizador', 'municao sobrevivencia', 25, 0.05, { qtd: [1, 3] });

// ---------------------------------------------------------------------
// FERRAMENTAS, LUZ, FOGO, MATERIAIS
// ---------------------------------------------------------------------
A('chave_fenda', 'Chave de fenda', 'ferramenta', 45, 0.15, { efeito: 'desparafusa; arma fraca' });
A('alicate', 'Alicate', 'ferramenta', 40, 0.3, {});
A('serrote', 'Serrote', 'ferramenta', 25, 0.6, { efeito: 'corta madeira; arma ruim' });
A('fita_adesiva', 'Fita adesiva', 'ferramenta material', 45, 0.15, { efeito: 'talas, reparos e armadilhas' });
A('corda', 'Corda', 'ferramenta corda', 30, 1, { efeito: 'amarra, escala, armadilha' });
A('arame', 'Rolo de arame', 'ferramenta material', 30, 0.5, {});
A('cadeado', 'Cadeado', 'ferramenta', 20, 0.2, { efeito: 'tranca esconderijo' });
A('kit_arrombamento', 'Kit de arrombamento', 'ferramenta', 5, 0.1, { efeito: 'abre portas e carros em silêncio' });
A('chave_mestra', 'Chave mestra', 'ferramenta chave', 4, 0.1, { efeito: 'abre portas de um prédio' });
A('cortador_cerca', 'Cortador de cerca', 'ferramenta', 9, 1.5, {});
A('extintor', 'Extintor', 'ferramenta quimico', 18, 3, { dano: [3, 6], efeito: 'nuvem que esconde e atordoa; apaga fogo' });
A('lanterna', 'Lanterna', 'luz ferramenta', 40, 0.3, { efeito: 'precisa de pilhas' });
A('pilhas', 'Pilhas', 'luz eletronico', 50, 0.05, { qtd: [1, 4] });
A('lampiao', 'Lampião a querosene', 'luz camping', 8, 1, { efeito: 'luz forte e duradoura' });
A('vela', 'Vela', 'luz fogo', 40, 0.1, { qtd: [1, 5] });
A('isqueiro', 'Isqueiro', 'fogo', 45, 0.03, { efeito: 'acende fogueira' });
A('fosforos', 'Caixa de fósforos', 'fogo', 50, 0.03, { qtd: [3, 20], efeito: 'molha e estraga na chuva' });
A('fluido_isqueiro', 'Fluido de isqueiro', 'fogo quimico', 15, 0.1, {});
A('tabua', 'Tábuas de madeira', 'material', 40, 2, { qtd: [1, 3], efeito: 'barricada, estaca, fogueira' });
A('pregos', 'Caixa de pregos', 'material ferramenta', 35, 0.4, { qtd: [5, 30] });
A('pano', 'Trapos', 'material', 50, 0.1, { qtd: [1, 4], efeito: 'vira bandagem improvisada' });
A('lencol', 'Lençol', 'material', 30, 0.5, { efeito: 'rasga em 4 bandagens improvisadas' });
A('fio_cobre', 'Fio de cobre', 'material', 25, 0.3, {});
A('sucata_metal', 'Sucata de metal', 'material', 50, 1.5, {});
A('cacos_vidro', 'Cacos de vidro', 'material', 30, 0.3, {});
A('cano_pvc', 'Cano de PVC', 'material', 20, 0.8, {});
A('bateria_carro', 'Bateria de carro', 'material eletronico veiculo_item', 10, 12, {});
A('cabo_aco', 'Cabo de aço', 'material corda', 10, 2, {});
A('tijolo', 'Tijolo', 'material arma_branca', 30, 2, { dano: [4, 10], ruido: 3, dur: 100, atributo: 'FOR' });
A('pedra', 'Pedra', 'material forrageio', 60, 1, { dano: [2, 7], ruido: 2, dur: 100, atributo: 'FOR', qtd: [1, 3] });
A('galho', 'Galho resistente', 'material forrageio', 60, 0.8, { dano: [3, 8], ruido: 2, dur: 15, atributo: 'FOR', efeito: 'vira estaca com uma faca' });
A('lenha', 'Lenha', 'material forrageio fogo', 60, 2, { qtd: [1, 4] });
A('sementes', 'Pacote de sementes', 'jardinagem', 30, 0.05, {});
A('adubo', 'Adubo', 'jardinagem quimico', 20, 2, {});
A('mangueira', 'Mangueira', 'jardinagem material', 25, 1.5, { efeito: 'sifona combustível' });
A('tesoura_poda', 'Tesoura de poda', 'jardinagem ferramenta', 20, 0.4, { dano: [5, 11], ruido: 1, dur: 40, atributo: 'AGI' });
A('luvas_jardim', 'Luvas de jardinagem', 'jardinagem roupa protecao', 25, 0.1, { slot: 'maos', prot: 3 });

// ---------------------------------------------------------------------
// COMBUSTÍVEL E QUÍMICOS
// ---------------------------------------------------------------------
A('galao_gasolina', 'Galão de gasolina', 'combustivel', 25, 6, { usos: 5 });
A('galao_vazio', 'Galão vazio', 'combustivel', 25, 0.6, {});
A('botijao_gas', 'Botijão de gás', 'combustivel', 12, 13, { efeito: 'explosivo perto de fogo' });
A('alcool_combustivel', 'Álcool combustível', 'combustivel quimico', 20, 1, {});
A('thinner', 'Thinner', 'quimico', 20, 0.8, {});
A('tinta_spray', 'Tinta spray', 'quimico', 25, 0.3, { efeito: 'com isqueiro vira lança-chamas curto' });
A('cloro_piscina', 'Cloro de piscina', 'quimico', 10, 1, { efeito: 'purifica muita água; gás tóxico se misturado' });
A('fertilizante', 'Fertilizante', 'quimico jardinagem', 10, 3, {});

// ---------------------------------------------------------------------
// ROUPAS E PROTEÇÃO
// ---------------------------------------------------------------------
A('capacete_obra', 'Capacete de obra', 'roupa protecao capacete', 22, 0.4, { slot: 'cabeca', prot: 12 });
A('capacete_moto', 'Capacete de moto', 'roupa protecao capacete', 12, 1, { slot: 'cabeca', prot: 22, penal: { visao: 3 } });
A('capacete_ciclista', 'Capacete de ciclista', 'roupa protecao capacete esporte', 16, 0.3, { slot: 'cabeca', prot: 8 });
A('capacete_militar', 'Capacete militar', 'roupa protecao capacete', 3, 1.4, { slot: 'cabeca', prot: 30 });
A('colete_balistico', 'Colete balístico', 'roupa protecao', 4, 4, { slot: 'torso', prot: 40, penal: { AGI: 1 } });
A('colete_refletivo', 'Colete refletivo', 'roupa', 25, 0.2, { slot: 'torso', prot: 0, efeito: 'visível de longe' });
A('jaqueta_couro', 'Jaqueta de couro', 'roupa protecao', 15, 1.2, { slot: 'torso', prot: 10, frio: 15 });
A('jaqueta_jeans', 'Jaqueta jeans', 'roupa', 25, 0.8, { slot: 'torso', prot: 4, frio: 8 });
A('casaco_impermeavel', 'Casaco impermeável', 'roupa', 22, 0.7, { slot: 'torso', prot: 2, frio: 10, chuva: true });
A('casaco_inverno', 'Casaco de inverno', 'roupa', 15, 1.5, { slot: 'torso', prot: 3, frio: 30 });
A('moletom', 'Moletom', 'roupa', 40, 0.6, { slot: 'torso', prot: 1, frio: 14 });
A('camiseta', 'Camiseta', 'roupa', 60, 0.2, { slot: 'torso', prot: 0, frio: 2 });
A('calca_jeans', 'Calça jeans', 'roupa', 50, 0.6, { slot: 'pernas', prot: 4, frio: 6 });
A('shorts', 'Shorts', 'roupa', 40, 0.2, { slot: 'pernas', prot: 0, frio: 1 });
A('botas_trabalho', 'Botas de trabalho', 'roupa calcado protecao', 20, 1.2, { slot: 'pes', prot: 8, frio: 6 });
A('botas_militares', 'Botas militares', 'roupa calcado protecao', 4, 1.3, { slot: 'pes', prot: 12, frio: 8 });
A('tenis', 'Tênis', 'roupa calcado', 45, 0.7, { slot: 'pes', prot: 2, frio: 3, bonus: { AGI: 1 } });
A('chinelo', 'Chinelo', 'roupa calcado', 35, 0.2, { slot: 'pes', prot: 0, frio: 0 });
A('luvas_trabalho', 'Luvas de trabalho', 'roupa protecao', 25, 0.2, { slot: 'maos', prot: 5, frio: 3 });
A('luvas_couro', 'Luvas de couro', 'roupa protecao', 15, 0.2, { slot: 'maos', prot: 6, frio: 8 });
A('mascara_gas', 'Máscara de gás', 'roupa protecao', 3, 0.8, { slot: 'rosto', prot: 4, efeito: 'imune a fumaça e gás' });
A('oculos_protecao', 'Óculos de proteção', 'roupa protecao', 20, 0.1, { slot: 'rosto', prot: 3 });
A('joelheiras', 'Joelheiras', 'roupa protecao esporte', 12, 0.3, { slot: 'pernas', prot: 5 });
A('uniforme_policial', 'Uniforme policial', 'roupa protecao', 6, 1.2, { slot: 'torso', prot: 8, frio: 8 });
A('uniforme_bombeiro', 'Roupa de bombeiro', 'roupa protecao', 5, 4, { slot: 'torso', prot: 20, frio: 20, efeito: 'resiste a fogo' });
A('jaleco', 'Jaleco', 'roupa', 20, 0.3, { slot: 'torso', prot: 1, frio: 3 });
A('bone', 'Boné', 'roupa', 35, 0.1, { slot: 'cabeca', prot: 0, efeito: 'protege do sol' });
A('cachecol', 'Cachecol', 'roupa', 25, 0.2, { slot: 'rosto', prot: 0, frio: 6 });
A('meias_la', 'Meias de lã', 'roupa', 30, 0.1, { slot: 'pes', prot: 0, frio: 6 });

// ---------------------------------------------------------------------
// MOCHILAS E BOLSAS (capacidade em kg)
// ---------------------------------------------------------------------
A('sacola_plastica', 'Sacola plástica', 'mochila', 55, 0.02, { cap: 5 });
A('pochete', 'Pochete', 'mochila', 25, 0.1, { cap: 4 });
A('bolsa_lado', 'Bolsa', 'mochila', 30, 0.4, { cap: 8 });
A('mochila_escolar', 'Mochila escolar', 'mochila', 35, 0.6, { cap: 12 });
A('mochila_trilha', 'Mochila de trilha', 'mochila camping', 10, 1.5, { cap: 28 });
A('mala_viagem', 'Mala de viagem', 'mochila', 15, 3, { cap: 22, penal: { mov: 1 } });
A('cinto_utilidades', 'Cinto de utilidades', 'mochila ferramenta', 8, 0.5, { cap: 6 });
A('maleta', 'Maleta', 'mochila escritorio', 20, 1, { cap: 7 });

// ---------------------------------------------------------------------
// ELETRÔNICOS E COMUNICAÇÃO
// ---------------------------------------------------------------------
A('radio_pilha', 'Rádio a pilha', 'eletronico comunicacao', 12, 0.5, { efeito: 'só chia... ou será que alguém transmite?' });
A('walkie_talkie', 'Walkie-talkie', 'eletronico comunicacao', 6, 0.3, { efeito: 'sussurro a distância com quem tiver o outro' });
A('celular_sem_sinal', 'Celular sem sinal', 'eletronico lore', 30, 0.2, { efeito: 'mensagens e fotos de antes' });
A('power_bank', 'Power bank', 'eletronico', 14, 0.3, {});
A('carregador_solar', 'Carregador solar', 'eletronico camping', 6, 0.4, {});
A('relogio', 'Relógio de pulso', 'eletronico', 25, 0.05, { efeito: 'marca a hora real do jogo' });
A('gps', 'GPS portátil', 'eletronico', 4, 0.3, { efeito: 'mostra onde você já esteve' });
A('notebook', 'Notebook', 'eletronico escritorio', 15, 2, {});
A('fone_ouvido', 'Fones de ouvido', 'eletronico lixo', 30, 0.05, {});
A('megafone', 'Megafone', 'eletronico comunicacao', 5, 0.8, { efeito: 'ouvido pela região toda' });
A('alarme_portatil', 'Alarme portátil', 'eletronico', 8, 0.2, { efeito: 'distração sonora' });
A('camera', 'Câmera fotográfica', 'eletronico', 8, 0.5, {});
A('controle_remoto', 'Controle remoto', 'eletronico lixo', 40, 0.1, {});

// ---------------------------------------------------------------------
// VEÍCULOS E TRANSPORTE
// ---------------------------------------------------------------------
A('chave_carro', 'Chave de carro', 'chave veiculo_item', 14, 0.05, { efeito: 'procure o carro certo' });
A('chave_moto', 'Chave de moto', 'chave veiculo_item', 6, 0.05, {});
A('bicicleta', 'Bicicleta', 'veiculo_item esporte', 6, 12, { efeito: 'raio de movimento maior; silenciosa' });
A('patinete', 'Patinete', 'veiculo_item esporte', 5, 4, { efeito: 'movimento um pouco maior' });
A('skate', 'Skate', 'veiculo_item esporte brinquedo', 10, 2, {});
A('macaco_hidraulico', 'Macaco hidráulico', 'veiculo_item ferramenta', 10, 5, {});

// ---------------------------------------------------------------------
// CAMPING E SOBREVIVÊNCIA
// ---------------------------------------------------------------------
A('barraca', 'Barraca', 'camping sobrevivencia', 8, 3.5, { efeito: 'esconderijo portátil' });
A('saco_dormir', 'Saco de dormir', 'camping sobrevivencia', 12, 1.5, { efeito: 'descanso melhor; menos frio' });
A('cobertor', 'Cobertor', 'sobrevivencia material', 30, 1, { frio: 15 });
A('fogareiro', 'Fogareiro de camping', 'camping cozinha_util', 10, 0.8, { efeito: 'cozinha sem fogueira' });
A('purificador_agua', 'Filtro de água', 'camping sobrevivencia', 4, 0.3, { usos: 20 });
A('pastilha_purificadora', 'Pastilhas de purificação', 'camping sobrevivencia', 10, 0.02, { qtd: [3, 12] });
A('bussola', 'Bússola', 'camping sobrevivencia', 14, 0.1, { efeito: 'evita se perder' });
A('binoculo', 'Binóculo', 'camping sobrevivencia', 8, 0.5, { efeito: 'enxerga zonas vizinhas' });
A('apito', 'Apito', 'camping sobrevivencia', 20, 0.02, {});
A('lona', 'Lona', 'camping material', 18, 2, { efeito: 'abrigo contra chuva' });
A('kit_costura', 'Kit de costura', 'sobrevivencia', 22, 0.1, { efeito: 'conserta roupas' });
A('manta_termica', 'Manta térmica', 'sobrevivencia medicina', 12, 0.1, { frio: 25 });
A('kit_pesca', 'Kit de pesca', 'pesca camping', 12, 0.8, { efeito: 'permite pescar no Lago' });
A('vara_pesca', 'Vara de pescar', 'pesca camping', 10, 0.8, {});
A('anzol_linha', 'Anzóis e linha', 'pesca', 20, 0.05, {});
A('rede_pesca', 'Rede de pesca', 'pesca', 5, 1.5, {});
A('armadilha_urso', 'Armadilha de urso', 'armadilha camping', 3, 6, { dano: [18, 35], efeito: 'imobiliza a vítima' });
A('arame_farpado', 'Arame farpado', 'armadilha material', 12, 2, { dano: [3, 9], efeito: 'dificulta passagem' });

// ---------------------------------------------------------------------
// LIVROS, MAPAS E PAPÉIS
// ---------------------------------------------------------------------
A('livro_sobrevivencia', 'Manual de sobrevivência', 'livro', 8, 0.4, { efeito: 'bônus em forragear e fogueiras' });
A('livro_primeiros_socorros', 'Guia de primeiros socorros', 'livro', 8, 0.4, { efeito: 'curas mais eficientes' });
A('livro_culinaria', 'Livro de culinária', 'livro', 14, 0.5, { efeito: 'comida cozida rende mais' });
A('livro_carpintaria', 'Livro de carpintaria', 'livro', 8, 0.5, { efeito: 'barricadas melhores' });
A('manual_armas', 'Manual de armas', 'livro', 4, 0.5, { efeito: 'menos ruído e mais precisão' });
A('manual_mecanica', 'Manual de mecânica', 'livro', 8, 0.5, { efeito: 'consertos e carros' });
A('livro_pesca', 'Guia de pesca', 'livro', 8, 0.3, {});
A('enciclopedia_plantas', 'Enciclopédia de plantas', 'livro', 6, 0.7, { efeito: 'reconhece comida e remédio' });
A('romance', 'Romance', 'livro lixo', 40, 0.4, { uso: { moral: 3 } });
A('revista', 'Revista', 'livro lixo', 50, 0.2, { uso: { moral: 1 } });
A('jornal_velho', 'Jornal', 'livro lixo', 40, 0.2, { efeito: 'acendalha' });
A('mapa_cidade', 'Mapa da cidade', 'mapa', 12, 0.1, { efeito: 'revela zonas e prédios' });
A('mapa_trilhas', 'Mapa de trilhas', 'mapa', 8, 0.1, { efeito: 'revela caminhos pela mata' });

// ---------------------------------------------------------------------
// ESCRITÓRIO, BRINQUEDOS, ESPORTE, LIXO
// ---------------------------------------------------------------------
A('caneta', 'Caneta', 'escritorio lixo', 60, 0.02, {});
A('caderno', 'Caderno', 'escritorio', 40, 0.3, { efeito: 'anotar pistas' });
A('papel', 'Folhas de papel', 'escritorio material', 40, 0.1, {});
A('grampeador', 'Grampeador', 'escritorio lixo', 30, 0.3, {});
A('calculadora', 'Calculadora', 'escritorio eletronico', 25, 0.1, {});
A('cartao_acesso', 'Cartão de acesso', 'escritorio chave', 8, 0.01, { efeito: 'abre portas eletrônicas (se houver energia)' });
A('agenda', 'Agenda', 'escritorio lore', 20, 0.2, {});
A('bola_futebol', 'Bola de futebol', 'esporte brinquedo', 25, 0.4, {});
A('bola_basquete', 'Bola de basquete', 'esporte brinquedo', 18, 0.6, {});
A('halteres', 'Halteres', 'esporte arma_branca', 12, 5, { dano: [8, 16], ruido: 4, dur: 100, atributo: 'FOR', cansaco: 3 });
A('corda_pular', 'Corda de pular', 'esporte corda brinquedo', 18, 0.2, {});
A('boneca', 'Boneca', 'brinquedo', 25, 0.3, { efeito: 'sinistra a qualquer hora' });
A('urso_pelucia', 'Urso de pelúcia', 'brinquedo', 25, 0.3, { uso: { moral: 3 } });
A('jogo_tabuleiro', 'Jogo de tabuleiro', 'brinquedo', 15, 0.8, { uso: { moral: 4 } });
A('baralho', 'Baralho', 'brinquedo', 25, 0.1, { uso: { moral: 3 } });
A('chaves_soltas', 'Chaves soltas', 'lixo chave', 45, 0.1, {});
A('carteira_vazia', 'Carteira', 'lixo lore', 40, 0.1, { efeito: 'dinheiro não vale mais nada' });
A('oculos', 'Óculos de grau', 'lixo', 30, 0.05, {});
A('guarda_chuva', 'Guarda-chuva', 'lixo arma_branca', 30, 0.5, { dano: [2, 6], ruido: 1, dur: 15, atributo: 'AGI' });
A('lata_vazia', 'Lata vazia', 'lixo material', 60, 0.05, {});
A('garrafa_plastica', 'Garrafa plástica vazia', 'lixo agua', 60, 0.05, {});

// ---------------------------------------------------------------------
// ITENS DA HISTÓRIA (pistas do que aconteceu)
// ---------------------------------------------------------------------
A('cracha_funcionario', 'Crachá de funcionário', 'lore escritorio', 30, 0.01, { efeito: 'o nome e a foto continuam lá...' });
A('diario_encontrado', 'Diário de alguém', 'lore', 14, 0.2, { efeito: 'a última página termina no meio da frase' });
A('foto_amassada', 'Foto de família', 'lore', 25, 0.02, { uso: { moral: -2 } });
A('bilhete_estranho', 'Bilhete estranho', 'lore', 14, 0.01, { efeito: 'pistas esparsas' });
A('relogio_parado', 'Relógio parado', 'lore eletronico', 14, 0.05, {});
A('carta_nao_lida', 'Carta fechada', 'lore escritorio', 18, 0.01, {});
A('jornal_ultima_edicao', 'Jornal da última edição', 'lore livro', 8, 0.2, { efeito: 'a manchete é de um dia normal' });
A('fragmento_mapa', 'Fragmento de mapa rasgado', 'lore mapa', 0.6, 0.02, { efeito: 'um pedaço de algo maior...' });

// ---------------------------------------------------------------------
// ENCONTRADOS NA NATUREZA
// ---------------------------------------------------------------------
A('cogumelo_silvestre', 'Cogumelos silvestres', 'forrageio comida', 40, 0.1, { uso: { fome: 10 }, risco: 0.25, efeito: 'alguns são venenosos' });
A('frutas_silvestres', 'Frutas silvestres', 'forrageio comida', 55, 0.1, { uso: { fome: 8, sede: 4 }, estraga: 4 });
A('ovos_ave', 'Ovos de aves rasteiras', 'forrageio comida', 40, 0.06, { uso: { fome: 6 }, cozinhar: { fome: 14 }, qtd: [1, 4], estraga: 7 });
A('espigas_milho', 'Espigas de milho selvagem', 'forrageio comida', 50, 0.2, { uso: { fome: 16 }, cozinhar: { fome: 22 }, qtd: [1, 3], estraga: 6 });
A('erva_medicinal', 'Ervas medicinais', 'forrageio medicina', 22, 0.05, { uso: { pv: 4, dor: -8 }, req: 'astucia 5+' });
A('peixe_pequeno', 'Peixe pequeno', 'pesca comida', 50, 0.3, { uso: { fome: 6 }, cozinhar: { fome: 26 }, estraga: 2, risco: 0.3 });
A('minhoca', 'Minhocas (isca)', 'pesca forrageio', 40, 0.02, { qtd: [2, 6] });

// ---------------------------------------------------------------------
// TAGS EXTRAS (agrupamentos temáticos usados pelos locais)
// Ex.: a delegacia sorteia a tag "policial" em vez de "arma_branca" inteira.
// ---------------------------------------------------------------------
function etiquetar(tag, ids) {
  for (const id of ids) {
    if (!ITENS[id]) throw new Error('etiquetar: item inexistente: ' + id);
    ITENS[id].tags.push(tag);
  }
}
etiquetar('policial', ['cassetete', 'taser', 'spray_pimenta', 'uniforme_policial', 'colete_balistico',
  'pistola_9mm', 'revolver_38', 'espingarda_12', 'municao_9mm', 'municao_38', 'cartucho_12']);
etiquetar('arma_policial', ['pistola_9mm', 'revolver_38', 'espingarda_12', 'fuzil_assalto']);
etiquetar('militar', ['fuzil_assalto', 'municao_fuzil', 'capacete_militar', 'colete_balistico',
  'botas_militares', 'racao_militar', 'mascara_gas', 'pistola_9mm', 'municao_9mm']);
etiquetar('caca', ['rifle_caca', 'municao_rifle', 'arco_caca', 'besta', 'flechas', 'virotes',
  'faca_caca', 'espingarda_12', 'cartucho_12']);
etiquetar('decoracao', ['espada_decorativa']);
etiquetar('religioso', ['vela', 'vinho']);
etiquetar('ovos', ['ovo', 'ovos_ave']);
etiquetar('ovos_silvestres', ['ovos_ave']);
etiquetar('horta', ['maca', 'laranja', 'banana', 'tomate', 'batata', 'cenoura', 'cebola']);
etiquetar('colheita', ['espigas_milho', 'batata', 'cenoura', 'cebola', 'tomate']);

// ---------------------------------------------------------------------
// VELOCIDADE DE ESTRAGO
// O número "estraga" de cada item é em dias normais. O jogo multiplica por este valor
// para a comida durar mais. Quanto MAIOR, mais devagar estraga.
// (Uma rodada = 3 dias de jogo.)
// ---------------------------------------------------------------------
const ESTRAGAR_MULTIPLICADOR = 2.5;
function diasAteEstragar(item) {
  return item.estraga ? Math.round(item.estraga * ESTRAGAR_MULTIPLICADOR * 10) / 10 : null;
}

module.exports = { ITENS, ESTRAGAR_MULTIPLICADOR, diasAteEstragar };
