'use strict';
// Salva as salas em arquivos (uma por sala) e carrega quando o servidor liga.
const fs = require('fs');
const path = require('path');

function pasta() { return process.env.SAVE_DIR || path.join(__dirname, '..', 'saves'); }
function garantir() { try { fs.mkdirSync(pasta(), { recursive: true }); return true; } catch (e) { return false; } }

function salvar(sala) {
  if (!garantir()) return false;
  const alvo = path.join(pasta(), sala.codigo + '.json'), tmp = alvo + '.tmp';
  try { fs.writeFileSync(tmp, JSON.stringify(sala.exportar())); fs.renameSync(tmp, alvo); return true; }
  catch (e) { console.error('Falha ao salvar sala', sala.codigo, e.message); return false; }
}
function apagar(codigo) { try { fs.unlinkSync(path.join(pasta(), codigo + '.json')); } catch (e) {} }
function carregarTodas() {
  const out = [];
  if (!garantir()) return out;
  for (const f of fs.readdirSync(pasta())) {
    if (!f.endsWith('.json')) continue;
    try { out.push(JSON.parse(fs.readFileSync(path.join(pasta(), f), 'utf8'))); } catch (e) { console.error('Save inválido ignorado:', f); }
  }
  return out;
}
module.exports = { salvar, apagar, carregarTodas };
