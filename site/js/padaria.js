/* =========================================================
   PADARIA.JS
   O "cérebro" do modelo com pedidos.
   1. Configurações (número do WhatsApp, taxa de entrega...)
   2. Ferramentas (formatar dinheiro, hora de Brasília)
   3. Aberto agora / Fechado
   4. Fornadas do dia
   5. O pedido (carrinho): guardar, somar, desenhar na tela
   6. Cardápio: botões de quantidade e filtros
   7. Monte o seu bolo
   8. Janela do pedido e envio pelo WhatsApp
   ========================================================= */


/* ---------- 1. CONFIGURAÇÕES ----------
   Ao usar este modelo para um cliente de verdade, é AQUI que se troca. */
const CONFIG = {
  // Número com 55 (Brasil) + DDD + número, só algarismos.
  // No modelo é o número da Nycolle; num site real, o da padaria
  whatsapp: '5553992032750',
  // Primeira linha da mensagem. Num site real: 'Olá! Quero fazer um pedido:'
  saudacao: 'Olá, Nycolle! Vi o modelo de padaria e testei o pedido:',
  taxaEntrega: 8,
  entregaGratisAcima: 80,
  diasAntecedenciaBolo: 2,
  // Horário de funcionamento. 0 = domingo, 1 = segunda ... 6 = sábado
  horarios: {
    0: ['07:00', '12:00'],
    1: ['06:00', '20:00'],
    2: ['06:00', '20:00'],
    3: ['06:00', '20:00'],
    4: ['06:00', '20:00'],
    5: ['06:00', '20:00'],
    6: ['06:00', '20:00']
  }
};


/* ---------- 2. FERRAMENTAS ---------- */

// 12.5 -> "R$ 12,50". Intl é o "tradutor" de números que já vem no navegador
const formatoReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function dinheiro(valor) {
  return formatoReal.format(valor);
}

// Hora de Brasília, mesmo que a pessoa esteja com o celular em outro fuso.
// Devolve { diaSemana, minutos } (minutos desde a meia-noite: 7h30 = 450)
function agoraBrasilia() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(new Date());
  const pegar = function (tipo) { return partes.find(function (p) { return p.type === tipo; }).value; };
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    diaSemana: dias.indexOf(pegar('weekday')),
    minutos: (Number(pegar('hour')) % 24) * 60 + Number(pegar('minute'))
  };
}

// "07:30" -> 450
function paraMinutos(texto) {
  const [h, m] = texto.split(':').map(Number);
  return h * 60 + m;
}

// 450 -> "7h30"   |   360 -> "6h"
function horaBonita(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h + 'h' + (m ? String(m).padStart(2, '0') : '');
}

// Data de hoje + N dias, no formato que o <input type="date"> entende: "2026-11-28"
function dataDaqui(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mes + '-' + dia;
}

// "2026-11-28" -> "28/11"
function dataBonita(texto) {
  if (!texto) return '';
  const [, mes, dia] = texto.split('-');
  return dia + '/' + mes;
}


/* ---------- 3. ABERTO AGORA / FECHADO ---------- */
const status = document.querySelector('[data-status]');

function atualizarStatus() {
  const agora = agoraBrasilia();
  const [abre, fecha] = CONFIG.horarios[agora.diaSemana];
  const aberto = agora.minutos >= paraMinutos(abre) && agora.minutos < paraMinutos(fecha);

  status.classList.toggle('aberto', aberto);
  status.classList.toggle('fechado', !aberto);
  if (aberto) {
    status.textContent = 'Aberto agora · fecha às ' + horaBonita(paraMinutos(fecha));
  } else if (agora.minutos < paraMinutos(abre)) {
    status.textContent = 'Fechado · abre hoje às ' + horaBonita(paraMinutos(abre));
  } else {
    const amanha = CONFIG.horarios[(agora.diaSemana + 1) % 7][0];
    status.textContent = 'Fechado · abre amanhã às ' + horaBonita(paraMinutos(amanha)) + ' (já pode deixar o pedido)';
  }
}


/* ---------- 4. FORNADAS DO DIA ----------
   Marca as que já saíram e destaca a próxima.
   O cartão "Próxima fornada" do topo mostra a mesma informação */
const fornadas = document.querySelectorAll('.fornadas li');
const proximaTexto = document.querySelector('[data-proxima-texto]');

function atualizarFornadas() {
  const agora = agoraBrasilia().minutos;
  let proxima = null;

  fornadas.forEach(function (item) {
    const horario = paraMinutos(item.dataset.hora);
    const jaSaiu = horario <= agora;
    item.classList.toggle('saiu', jaSaiu);
    item.classList.remove('proxima');
    if (!jaSaiu && !proxima) proxima = item;   // a primeira que ainda não saiu
  });

  if (proxima) {
    proxima.classList.add('proxima');
    const falta = paraMinutos(proxima.dataset.hora) - agora;
    const nome = proxima.textContent.replace(proxima.querySelector('time').textContent, '').trim();
    proximaTexto.textContent = nome + ' às ' + proxima.querySelector('time').textContent +
      (falta <= 60 ? ' (em ' + falta + ' min)' : '');
  } else {
    // Depois da última fornada: mostra a primeira de amanhã
    const primeira = fornadas[0];
    proximaTexto.textContent = 'Amanhã às ' + primeira.querySelector('time').textContent + ': ' +
      primeira.textContent.replace(primeira.querySelector('time').textContent, '').trim();
  }
}


/* ---------- 5. O PEDIDO (CARRINHO) ----------
   O pedido é uma lista de "linhas". Cada linha:
   { id, nome, detalhe, preco, qtd }
   Fica guardado no navegador (localStorage): se a pessoa recarregar
   a página, o pedido continua lá. Usamos try/catch porque em
   aba anônima o navegador pode bloquear isso, e o site não pode quebrar */
let pedido = [];

try {
  pedido = JSON.parse(localStorage.getItem('forno-da-vila-pedido')) || [];
} catch (erro) {
  pedido = [];
}

function salvarPedido() {
  try {
    localStorage.setItem('forno-da-vila-pedido', JSON.stringify(pedido));
  } catch (erro) { /* sem problema: o pedido só não fica salvo */ }
}

function acharLinha(id) {
  return pedido.find(function (linha) { return linha.id === id; });
}

function mudarQuantidade(id, quanto, dados) {
  let linha = acharLinha(id);
  if (!linha && quanto > 0) {
    linha = { id: id, nome: dados.nome, detalhe: dados.detalhe || '', preco: dados.preco, qtd: 0 };
    pedido.push(linha);
  }
  if (!linha) return;
  linha.qtd += quanto;
  if (linha.qtd <= 0) {
    pedido = pedido.filter(function (l) { return l.id !== id; });  // tira da lista
  }
  salvarPedido();
  desenharTudo();
}

function contas() {
  const subtotal = pedido.reduce(function (soma, l) { return soma + l.preco * l.qtd; }, 0);
  const quantidade = pedido.reduce(function (soma, l) { return soma + l.qtd; }, 0);
  const entregar = formPedido.receber.value === 'entregar';
  const taxa = entregar && subtotal < CONFIG.entregaGratisAcima ? CONFIG.taxaEntrega : 0;
  return { subtotal: subtotal, quantidade: quantidade, entregar: entregar, taxa: taxa, total: subtotal + taxa };
}

// Avisinho que aparece e some sozinho
const aviso = document.querySelector('[data-aviso]');
let avisoTimer;
function avisar(texto) {
  aviso.textContent = texto;
  aviso.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(function () { aviso.classList.remove('visivel'); }, 2200);
}


/* ---------- 6. CARDÁPIO ---------- */
const itens = document.querySelectorAll('.item');

// Desenha o botão de cada produto: "Adicionar" (se ainda não está no pedido)
// ou "−  2  +" (se já está)
function desenharItens() {
  itens.forEach(function (item) {
    const linha = acharLinha(item.dataset.id);
    const controle = item.querySelector('.controle');
    item.classList.toggle('no-pedido', !!linha);
    if (linha) {
      controle.innerHTML =
        '<button type="button" class="qtd-botao" data-acao="menos" aria-label="Tirar um ' + item.dataset.nome + '">−</button>' +
        '<span class="qtd" aria-label="Quantidade">' + linha.qtd + '</span>' +
        '<button type="button" class="qtd-botao" data-acao="mais" aria-label="Mais um ' + item.dataset.nome + '">+</button>';
    } else {
      controle.innerHTML = '<button type="button" class="btn-adicionar" data-acao="mais">Adicionar</button>';
    }
  });
}

// UM só "ouvinte" para todos os botões do cardápio (isso se chama delegação de eventos):
// o clique "sobe" até a lista, e a gente descobre qual botão e qual produto foi
document.querySelector('.itens').addEventListener('click', function (evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const item = botao.closest('.item');
  const dados = { nome: item.dataset.nome, preco: Number(item.dataset.preco) };
  const quanto = botao.dataset.acao === 'mais' ? 1 : -1;
  const eraNovo = !acharLinha(item.dataset.id);
  mudarQuantidade(item.dataset.id, quanto, dados);
  if (quanto > 0) avisar(dados.nome + ' no pedido ✓');
  // Depois de redesenhar, devolve o foco para o botão certo (para quem usa teclado)
  const novoBotao = item.querySelector(eraNovo ? '[data-acao="mais"]' : '[data-acao="' + botao.dataset.acao + '"]') ||
    item.querySelector('[data-acao]');
  if (novoBotao) novoBotao.focus();
});

// Filtros: mostram só uma categoria
const botoesFiltro = document.querySelectorAll('[data-filtro]');
botoesFiltro.forEach(function (botao) {
  botao.addEventListener('click', function () {
    const filtro = botao.dataset.filtro;
    botoesFiltro.forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
    itens.forEach(function (item) {
      item.hidden = filtro !== 'todos' && item.dataset.categoria !== filtro;
    });
  });
});


/* ---------- 7. MONTE O SEU BOLO ---------- */
const formBolo = document.querySelector('[data-form-bolo]');
const precoBolo = document.querySelector('[data-preco-bolo]');

// Ninguém pode encomendar para amanhã: o dia mínimo é hoje + 2
formBolo.data.min = dataDaqui(CONFIG.diasAntecedenciaBolo);

// Lê o que está escolhido e soma: tamanho + extras do recheio + extras da cobertura
function lerBolo() {
  const tamanho = formBolo.querySelector('[name="tamanho"]:checked');
  const cobertura = formBolo.querySelector('[name="cobertura"]:checked');
  const recheio = formBolo.recheio.selectedOptions[0];
  const massa = formBolo.massa.selectedOptions[0];
  const preco = Number(tamanho.dataset.preco) + Number(recheio.dataset.preco) +
    Number(cobertura.dataset.preco) + Number(massa.dataset.preco);
  return {
    tamanho: tamanho.value,
    massa: massa.value,
    recheio: recheio.textContent.replace(/\s*\(.*\)/, ''),   // tira o "(+ R$ 15)" do nome
    cobertura: cobertura.value,
    escrita: formBolo.escrita.value.trim(),
    data: formBolo.data.value,
    preco: preco
  };
}

// 'input' dispara a cada mudança: o preço atualiza na hora
formBolo.addEventListener('input', function () {
  precoBolo.textContent = dinheiro(lerBolo().preco);
});

formBolo.addEventListener('submit', function (evento) {
  evento.preventDefault();               // não recarrega a página
  if (!formBolo.reportValidity()) return; // mostra o aviso do navegador se faltar a data
  const bolo = lerBolo();
  let detalhe = 'massa de ' + bolo.massa.toLowerCase() + ', recheio de ' + bolo.recheio.toLowerCase() +
    ', ' + bolo.cobertura.toLowerCase() + ' · retirar dia ' + dataBonita(bolo.data);
  if (bolo.escrita) detalhe += ' · escrita: "' + bolo.escrita + '"';
  // Cada bolo é uma linha única (id com a hora exata), mesmo que seja igual a outro
  mudarQuantidade('bolo-' + Date.now(), 1, { nome: 'Bolo de ' + bolo.tamanho, detalhe: detalhe, preco: bolo.preco });
  avisar('Bolo no pedido ✓');
  abrirPedido();
});


/* ---------- 8. JANELA DO PEDIDO ---------- */
const janela = document.querySelector('[data-pedido]');
const formPedido = document.querySelector('[data-form-pedido]');
const lista = document.querySelector('[data-lista]');

formPedido.dia.min = dataDaqui(0);
formPedido.dia.value = dataDaqui(0);

function abrirPedido() {
  desenharTudo();
  janela.showModal();
}

document.querySelectorAll('[data-abrir-pedido]').forEach(function (botao) {
  botao.addEventListener('click', abrirPedido);
});
document.querySelector('[data-fechar-pedido]').addEventListener('click', function () {
  janela.close();
});
// Clicar no fundo escuro (fora da comanda) também fecha
janela.addEventListener('click', function (evento) {
  if (evento.target === janela) janela.close();
});

// Botões + e − dentro da comanda
lista.addEventListener('click', function (evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const id = botao.closest('li').dataset.id;
  mudarQuantidade(id, botao.dataset.acao === 'mais' ? 1 : -1, acharLinha(id));
});

// Trocar entre "buscar" e "entregar" mostra ou esconde o endereço e a taxa
formPedido.addEventListener('change', function (evento) {
  if (evento.target.name === 'receber') desenharTudo();
});

function desenharComanda(c) {
  lista.innerHTML = '';
  pedido.forEach(function (linha) {
    const li = document.createElement('li');
    li.dataset.id = linha.id;
    // textContent (e não innerHTML) para o texto digitado na escrita do bolo
    // nunca ser lido como código
    const texto = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = linha.nome;
    texto.append(nome);
    if (linha.detalhe) {
      const detalhe = document.createElement('small');
      detalhe.textContent = linha.detalhe;
      texto.append(detalhe);
    }
    const controle = document.createElement('div');
    controle.className = 'controle';
    controle.innerHTML =
      '<button type="button" class="qtd-botao" data-acao="menos" aria-label="Tirar um">−</button>' +
      '<span class="qtd">' + linha.qtd + '</span>' +
      '<button type="button" class="qtd-botao" data-acao="mais" aria-label="Mais um">+</button>';
    const valor = document.createElement('span');
    valor.className = 'valor';
    valor.textContent = dinheiro(linha.preco * linha.qtd);
    li.append(texto, controle, valor);
    lista.append(li);
  });

  document.querySelector('[data-vazio]').hidden = pedido.length > 0;
  formPedido.hidden = pedido.length === 0;

  // Endereço só é obrigatório na entrega
  const campoEndereco = document.querySelector('[data-campo-endereco]');
  campoEndereco.hidden = !c.entregar;
  formPedido.endereco.required = c.entregar;

  // Barrinha da entrega grátis
  const frete = document.querySelector('[data-frete]');
  frete.hidden = !c.entregar;
  const falta = CONFIG.entregaGratisAcima - c.subtotal;
  document.querySelector('[data-frete-texto]').textContent = falta > 0
    ? 'Faltam ' + dinheiro(falta) + ' para a entrega grátis'
    : 'Oba! A entrega é grátis 🎉';
  document.querySelector('[data-frete-barra]').style.width =
    Math.min(100, (c.subtotal / CONFIG.entregaGratisAcima) * 100) + '%';

  document.querySelector('[data-subtotal]').textContent = dinheiro(c.subtotal);
  document.querySelector('[data-linha-taxa]').hidden = !c.entregar;
  document.querySelector('[data-taxa]').textContent = c.taxa ? dinheiro(c.taxa) : 'Grátis';
  document.querySelector('[data-total]').textContent = dinheiro(c.total);
}

// Atualiza TUDO que depende do pedido: cardápio, contador, barra de baixo e comanda
function desenharTudo() {
  const c = contas();
  desenharItens();
  desenharComanda(c);
  document.querySelectorAll('[data-contador]').forEach(function (el) { el.textContent = c.quantidade; });
  const barra = document.querySelector('[data-barra]');
  barra.hidden = c.quantidade === 0;
  document.querySelector('[data-barra-qtd]').textContent = c.quantidade + (c.quantidade === 1 ? ' item' : ' itens');
  document.querySelector('[data-barra-total]').textContent = dinheiro(c.total);
}

// ENVIAR: monta o texto do pedido e abre o WhatsApp com ele já escrito.
// No WhatsApp, *texto* vira negrito
formPedido.addEventListener('submit', function (evento) {
  evento.preventDefault();
  if (!formPedido.reportValidity()) return;
  const c = contas();
  const f = formPedido;

  const linhas = [CONFIG.saudacao, '', '*Pedido · Forno da Vila*'];
  pedido.forEach(function (l) {
    linhas.push(l.qtd + 'x ' + l.nome + ' · ' + dinheiro(l.preco * l.qtd));
    if (l.detalhe) linhas.push('   (' + l.detalhe + ')');
  });
  linhas.push('');
  if (c.entregar) {
    linhas.push('Entregar em: ' + f.endereco.value.trim());
    linhas.push('Taxa de entrega: ' + (c.taxa ? dinheiro(c.taxa) : 'grátis'));
  } else {
    linhas.push('Vou buscar na padaria');
  }
  linhas.push('*Total: ' + dinheiro(c.total) + '*');
  linhas.push('');
  linhas.push('Nome: ' + f.nome.value.trim());
  linhas.push('Para: ' + dataBonita(f.dia.value) + (f.hora.value ? ' às ' + f.hora.value : ''));
  linhas.push('Pagamento: ' + f.pagamento.value);
  if (f.obs.value.trim()) linhas.push('Obs.: ' + f.obs.value.trim());

  // encodeURIComponent "traduz" acentos, espaços e quebras de linha para dentro do link
  const link = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(linhas.join('\n'));
  window.open(link, '_blank', 'noopener');
});


/* ---------- COMEÇAR ---------- */
atualizarStatus();
atualizarFornadas();
desenharTudo();
// A cada minuto, confere de novo o horário (a loja pode abrir/fechar, a fornada pode sair)
setInterval(function () {
  atualizarStatus();
  atualizarFornadas();
}, 60000);
