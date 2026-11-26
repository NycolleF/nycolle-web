/* =========================================================
   INDEX.JS
   JavaScript da página inicial.
   1. Ano do rodapé
   2. Menu ganha sombra ao rolar
   3. Vitrine: o celular que troca de site (e o título junto)
   4. Blocos que aparecem suavemente ao rolar a página
   ========================================================= */

// A pessoa pediu "reduzir movimento" no celular/computador? Então nada de animação
const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- 1. ANO DO RODAPÉ ----------
   Todo ano novo, o "© 2026" vira "© 2027" sozinho */
document.getElementById('ano').textContent = new Date().getFullYear();


/* ---------- 2. MENU COM SOMBRA ----------
   Quando a página desce um pouquinho, o menu ganha a classe "rolou"
   e o CSS coloca uma sombra embaixo dele */
const menu = document.querySelector('.menu');
function conferirRolagem() {
  menu.classList.toggle('rolou', window.scrollY > 10);
}
// passive: true avisa ao navegador que não vamos travar a rolagem (fica mais leve)
window.addEventListener('scroll', conferirRolagem, { passive: true });
conferirRolagem();


/* ---------- 3. VITRINE: O CELULAR QUE TROCA DE SITE ----------
   A cada 6,5 segundos passa para o próximo site. Junto com ele trocam:
   o começo do título, a notificação do WhatsApp, a etiqueta e o link do celular.
   Os dados de cada site estão nos botões, no HTML (data-palavra, data-msg...) */
const TEMPO_POR_SITE = 6500; // em milésimos de segundo (6500 = 6,5 s)

const telas = document.querySelectorAll('.tela-site');
const botoesVitrine = document.querySelectorAll('.vitrine-botoes button');
const celular = document.querySelector('[data-celular]');
const palavra = document.querySelector('[data-palavra]');
const notificacao = document.querySelector('[data-notificacao]');
const notificacaoNome = document.querySelector('[data-notificacao-nome]');
const notificacaoTexto = document.querySelector('[data-notificacao-texto]');
const etiqueta = document.querySelector('[data-etiqueta]');

let atual = 0;
let relogio;           // guarda o "timer" da troca automática, para poder reiniciar
let timerNotificacao;

// Para uma animação de CSS começar DE NOVO, tiramos a classe, forçamos o navegador
// a "reparar" (ler offsetWidth faz isso) e colocamos a classe de volta
function reiniciarAnimacao(elemento, classe) {
  elemento.classList.remove(classe);
  void elemento.offsetWidth;
  elemento.classList.add(classe);
}

function mostrarSite(numero) {
  atual = numero;
  const botao = botoesVitrine[numero];

  telas.forEach(function (tela, i) {
    if (i === numero) reiniciarAnimacao(tela, 'ativo');
    else tela.classList.remove('ativo');
  });
  botoesVitrine.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === numero)); });

  palavra.textContent = botao.dataset.palavra;
  reiniciarAnimacao(palavra, 'entrando');

  celular.href = botao.dataset.pagina;
  celular.setAttribute('aria-label', 'Abrir o site: ' + botao.textContent.replace(/^\S+\s/, ''));
  etiqueta.textContent = botao.dataset.tipo;

  // A notificação some e "chega" de novo um pouquinho depois do site aparecer
  notificacao.classList.remove('mostrar');
  clearTimeout(timerNotificacao);
  timerNotificacao = setTimeout(function () {
    notificacaoNome.textContent = botao.dataset.nome;
    notificacaoTexto.textContent = botao.dataset.msg;
    notificacao.classList.add('mostrar');
  }, reduzirMovimento ? 0 : 900);
}

function proximo() {
  mostrarSite((atual + 1) % telas.length);  // % = "resto": depois do último, volta ao 0
}

function ligarRelogio() {
  clearInterval(relogio);
  if (!reduzirMovimento) relogio = setInterval(proximo, TEMPO_POR_SITE);
}

// Clicou num botão: mostra aquele site e recomeça a contagem
botoesVitrine.forEach(function (botao, i) {
  botao.addEventListener('click', function () {
    mostrarSite(i);
    ligarRelogio();
  });
});

// Mouse em cima do celular: pausa (a pessoa está olhando). Saiu: continua
const vitrine = document.querySelector('.vitrine');
vitrine.addEventListener('mouseenter', function () { clearInterval(relogio); });
vitrine.addEventListener('mouseleave', ligarRelogio);

mostrarSite(0);
ligarRelogio();


/* ---------- 4. APARECER AO ROLAR ----------
   Os blocos começam invisíveis e um pouco mais baixos (classe "revelar" no CSS).
   O IntersectionObserver "vigia" a tela e avisa quando cada bloco entra nela:
   aí ganha a classe "visivel" e sobe suavemente */
const blocos = document.querySelectorAll(
  'main > section:not(.hero):not(.faixa) > :is(.sobre, h2, h2 + p), .trabalho, .cartao, .passos li, #perguntas details, .video-grade'
);

if (!reduzirMovimento && 'IntersectionObserver' in window) {
  const vigia = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        const alvo = entrada.target;
        alvo.classList.add('visivel');
        vigia.unobserve(alvo);   // já apareceu: não precisa vigiar mais
        // Depois de aparecer, tira o atraso da cascata, senão o efeito de passar o mouse fica lento
        setTimeout(function () { alvo.style.transitionDelay = ''; }, 1200);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px' }); // só dispara quando o bloco já entrou 60px na tela

  blocos.forEach(function (bloco) {
    // Cartões lado a lado aparecem um pouquinho depois do outro (efeito "cascata")
    const irmaos = Array.from(bloco.parentElement.children);
    const posicao = irmaos.indexOf(bloco);
    if (bloco.matches('.cartao, .passos li')) {
      bloco.style.transitionDelay = (posicao * 0.08) + 's';
    }
    bloco.classList.add('revelar');
    vigia.observe(bloco);
  });
}
