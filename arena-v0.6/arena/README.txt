ARENA DE SOBREVIVENCIA - versao 0.6 (um dia por rodada, tela nova)

Pastas e arquivos:
  server.js          o servidor (liga a tela ao jogo e salva as salas)
  package.json       lista de pecas que o servidor precisa
  public/index.html  a pagina do jogo
  public/mapa.js     o mapa 2D estilo Worldbox
  jogo/              as regras: config, mundo, personagem, acoes, motor, sala, persistencia
  data/              itens (328), locais (33) e o sorteio de loot
  teste-*.js         testes automaticos (nao sao usados no site)
  DESIGN.md          decisoes de design e regras

Comando de inicio (Render): npm start
Comando de build (Render):  npm install

Para atualizar o site: suba TODOS estes arquivos e pastas no GitHub (repositorio "arena"),
substituindo os antigos. O Render atualiza sozinho em ~2 minutos.

SOBRE SALVAMENTO: o servidor grava as salas na pasta "saves". No plano gratis do Render, essa
pasta some quando o servidor dorme (15 min sem acesso) ou quando voce atualiza o site. Para o
servidor nao dormir no meio da partida, crie um monitor gratis em uptimerobot.com apontando para
https://SEU-SITE.onrender.com/saude (a cada 5 minutos).
