/* =========================================================
   FOTOGRAFIA.JS
   1. Menu: ganha fundo quando a pessoa rola a página
   2. Menu do celular: abre e fecha
   3. Blocos que aparecem ao rolar + parallax
   4. Palavras que "acendem" conforme a rolagem
   5. Portfólio em "filme": rola para baixo, as fotos andam para o lado
   6. Tipos de ensaio: foto flutuante que segue o mouse
   7. Lightbox: as fotos do portfólio abrem em tela cheia
   8. Janela dos vídeos + selo que some no fim da página
   ========================================================= */

// Quem pediu "reduzir movimento" no aparelho não vê os efeitos mais fortes
const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- 1. MENU QUE MUDA AO ROLAR ---------- */
function atualizarMenu() {
  // window.scrollY = quantos pixels a página já rolou.
  // classList.toggle('rolou', condição) coloca a classe se for verdade e tira se for mentira.
  // A classe vai no <body> para o menu E o selo "Modelo por Nycolle Web" poderem usar
  document.body.classList.toggle('rolou', window.scrollY > 60);
}

atualizarMenu();
window.addEventListener('scroll', atualizarMenu, { passive: true });


/* ---------- 2. MENU DO CELULAR ---------- */
const botaoMenu = document.querySelector('.menu-botao');

function fecharMenu() {
  document.body.classList.remove('menu-aberto');
  botaoMenu.setAttribute('aria-expanded', 'false');
}

botaoMenu.addEventListener('click', function () {
  const abriu = document.body.classList.toggle('menu-aberto');
  botaoMenu.setAttribute('aria-expanded', String(abriu));
});

// Ao tocar num link do menu, ele fecha (e a página desliza até a seção)
document.querySelectorAll('.menu-lista a').forEach(function (link) {
  link.addEventListener('click', fecharMenu);
});


/* ---------- 3a. APARECER AO ROLAR ----------
   IntersectionObserver = um "vigia" que avisa quando um elemento entra na tela.
   É bem mais leve do que ficar medindo a posição a cada rolada. */
const vigia = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (entrada) {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('visivel');
      vigia.unobserve(entrada.target); // já apareceu: para de vigiar
    }
  });
}, {
  threshold: 0.12,                 // aparece quando 12% do bloco está visível
  rootMargin: '0px 0px -40px 0px'  // ...e um pouquinho antes do fim da tela
});

document.querySelectorAll('[data-revelar]').forEach(function (elemento) {
  vigia.observe(elemento);
});


/* ---------- 3b. PARALLAX ----------
   A foto se move mais devagar que a página, dando sensação de profundidade. */
const fotosParallax = document.querySelectorAll('[data-parallax]');

function moverParallax() {
  fotosParallax.forEach(function (foto) {
    const caixa = foto.parentElement.getBoundingClientRect();
    // Quanto o centro da moldura está longe do centro da tela (de -1 a 1, mais ou menos)
    const distancia = (caixa.top + caixa.height / 2 - window.innerHeight / 2) / window.innerHeight;
    foto.style.transform = 'translateY(' + (distancia * -6) + '%)';
  });
}


/* ---------- 4. PALAVRAS QUE ACENDEM ----------
   Separa o texto em palavras, cada uma dentro de um <span class="palavra">.
   Conforme o parágrafo sobe pela tela, mais palavras recebem a classe "acesa". */
const textosAcender = document.querySelectorAll('[data-acender]');

textosAcender.forEach(function (paragrafo) {
  const palavras = paragrafo.textContent.trim().split(/\s+/); // \s+ = um ou mais espaços
  paragrafo.innerHTML = palavras.map(function (palavra) {
    return '<span class="palavra">' + palavra + '</span>';
  }).join(' ');
});

function acenderPalavras() {
  textosAcender.forEach(function (paragrafo) {
    const caixa = paragrafo.getBoundingClientRect();
    const altura = window.innerHeight;
    // Começa a acender quando o topo do texto chega a 85% da tela
    // e termina quando o fim do texto chega a 45% da tela
    const inicio = altura * 0.85;
    const fim = altura * 0.45;
    let progresso = (inicio - caixa.top) / (inicio - fim + caixa.height);
    progresso = Math.min(Math.max(progresso, 0), 1); // trava entre 0 e 1

    const spans = paragrafo.querySelectorAll('.palavra');
    const quantas = Math.round(progresso * spans.length);
    spans.forEach(function (span, numero) {
      span.classList.toggle('acesa', numero < quantas);
    });
  });
}


/* ---------- 5. PORTFÓLIO EM "FILME" ----------
   Só no computador. A seção fica bem alta; a "tela" dentro dela gruda no topo (sticky)
   e, enquanto a pessoa rola, o trilho de fotos anda para a esquerda. */
const filme = document.querySelector('.filme');
const trilho = document.querySelector('.filme-trilho');
const telaGrande = window.matchMedia('(min-width: 900px)');
let distanciaFilme = 0;

function montarFilme() {
  if (telaGrande.matches && !reduzirMovimento) {
    filme.classList.add('filme-ativo');
    // Quanto o trilho precisa andar: a largura dele menos a largura da tela
    distanciaFilme = trilho.scrollWidth - window.innerWidth;
    // A seção fica alta o bastante para "caber" esse caminho todo na rolagem
    filme.style.height = (distanciaFilme + window.innerHeight) + 'px';
  } else {
    filme.classList.remove('filme-ativo');
    filme.style.height = '';
    trilho.style.transform = '';
    distanciaFilme = 0;
  }
}

function moverFilme() {
  if (distanciaFilme <= 0) return;
  // Quanto já rolamos DENTRO da seção (0 no começo, distanciaFilme no fim)
  const rolado = Math.min(Math.max(-filme.getBoundingClientRect().top, 0), distanciaFilme);
  trilho.style.transform = 'translateX(' + (-rolado) + 'px)';
}

montarFilme();
// Se a janela mudar de tamanho (ou o celular girar), recalcula
window.addEventListener('resize', function () {
  montarFilme();
  aoRolar();
});
// Quando todas as fotos terminarem de carregar, mede de novo (por garantia)
window.addEventListener('load', montarFilme);


/* ---------- TUDO QUE ACONTECE AO ROLAR ----------
   requestAnimationFrame: só redesenha uma vez por quadro da tela, para não pesar */
let agendado = false;

function aoRolar() {
  if (!reduzirMovimento) moverParallax();
  acenderPalavras();
  moverFilme();
  agendado = false;
}

window.addEventListener('scroll', function () {
  if (!agendado) {
    agendado = true;
    requestAnimationFrame(aoRolar);
  }
}, { passive: true });

aoRolar();


/* ---------- 6. FOTO FLUTUANTE DOS ENSAIOS ----------
   Ao passar o mouse num item da lista, a foto dele aparece e segue o cursor.
   (No celular a foto flutuante fica escondida pelo CSS, então nada disso aparece.) */
const lista = document.querySelector('.ensaios-lista');
const flutuante = document.querySelector('.ensaios-flutuante');
const fotoFlutuante = flutuante.querySelector('img');

lista.querySelectorAll('li').forEach(function (item) {
  item.addEventListener('mouseenter', function () {
    fotoFlutuante.src = item.querySelector('img').src; // usa a mesma foto da miniatura
    flutuante.classList.add('ativa');
  });
});

lista.addEventListener('mouseleave', function () {
  flutuante.classList.remove('ativa');
});

lista.addEventListener('mousemove', function (evento) {
  // clientX/clientY = posição do mouse na tela. Tiramos metade do tamanho da foto
  // para o centro dela ficar perto do cursor
  flutuante.style.translate = (evento.clientX - 120) + 'px ' + (evento.clientY - 160) + 'px';
});


/* ---------- 7. LIGHTBOX ----------
   Ao clicar numa foto do portfólio, ela abre grande, por cima da página.
   Dá para passar com as setas (na tela ou no teclado) e, no celular, arrastando o dedo. */
const lightbox = document.querySelector('.lightbox');
const fotoGrande = lightbox.querySelector('.lightbox-foto');
const contador = lightbox.querySelector('.lightbox-contador');
const itens = Array.from(document.querySelectorAll('.galeria-item')); // Array.from: vira uma lista "de verdade"
let atual = 0; // número da foto aberta (a primeira é 0)

function mostrarFoto(numero) {
  // O % faz a conta "dar a volta": depois da última vem a primeira, e antes da primeira, a última
  atual = (numero + itens.length) % itens.length;
  const item = itens[atual];
  fotoGrande.src = item.href;
  fotoGrande.alt = item.querySelector('img').alt;
  contador.textContent = (atual + 1) + ' / ' + itens.length;

  // Reinicia a animação de troca (tira a classe, força o navegador a perceber, coloca de novo)
  fotoGrande.classList.remove('trocando');
  void fotoGrande.offsetWidth;
  fotoGrande.classList.add('trocando');
}

itens.forEach(function (item, numero) {
  item.addEventListener('click', function (evento) {
    evento.preventDefault();   // não abre o link: abre o lightbox no lugar
    mostrarFoto(numero);
    lightbox.showModal();      // showModal: abre o <dialog> e prende o foco do teclado dentro dele
  });
});

lightbox.querySelector('.lightbox-fechar').addEventListener('click', function () {
  lightbox.close();
});
lightbox.querySelector('.lightbox-anterior').addEventListener('click', function () {
  mostrarFoto(atual - 1);
});
lightbox.querySelector('.lightbox-proxima').addEventListener('click', function () {
  mostrarFoto(atual + 1);
});

// Clicar no fundo escuro (fora da foto e dos botões) também fecha
lightbox.addEventListener('click', function (evento) {
  if (evento.target === lightbox) lightbox.close();
});

// Teclado: setas passam as fotos. (A tecla Esc o <dialog> já fecha sozinho)
document.addEventListener('keydown', function (evento) {
  if (lightbox.open) {
    if (evento.key === 'ArrowLeft') mostrarFoto(atual - 1);
    if (evento.key === 'ArrowRight') mostrarFoto(atual + 1);
  } else if (evento.key === 'Escape') {
    fecharMenu();
  }
});

/* ---------- 8. JANELA DOS VÍDEOS ----------
   Ao tocar num dos "celulares", o vídeo do Instagram abre numa janela por cima da página.
   Sem JavaScript, o link simplesmente abre o vídeo no Instagram. */
const janelaVideo = document.querySelector('.video-janela');
const caixaVideo = janelaVideo.querySelector('.video-janela-caixa');

document.querySelectorAll('.video-cartao').forEach(function (cartao) {
  cartao.addEventListener('click', function (evento) {
    evento.preventDefault();   // não sai do site: abre a janela no lugar
    // Cria o iframe do Instagram só agora (antes disso, nada do Instagram é carregado)
    caixaVideo.innerHTML = '<iframe src="' + cartao.dataset.video + '" title="' +
      cartao.querySelector('.video-titulo').textContent + ', vídeo no Instagram" allowfullscreen></iframe>';
    janelaVideo.showModal();
  });
});

janelaVideo.querySelector('.video-janela-fechar').addEventListener('click', function () {
  janelaVideo.close();
});

// Clicar no fundo escuro também fecha
janelaVideo.addEventListener('click', function (evento) {
  if (evento.target === janelaVideo) janelaVideo.close();
});

// Ao fechar (pelo X, pelo fundo ou pela tecla Esc), apaga o iframe: assim o vídeo para de tocar
janelaVideo.addEventListener('close', function () {
  caixaVideo.innerHTML = '';
});


// Celular: arrastar o dedo para o lado troca a foto
let inicioToque = 0;
lightbox.addEventListener('touchstart', function (evento) {
  inicioToque = evento.touches[0].clientX;
}, { passive: true });
lightbox.addEventListener('touchend', function (evento) {
  const arrasto = evento.changedTouches[0].clientX - inicioToque;
  if (arrasto > 50) mostrarFoto(atual - 1);   // arrastou para a direita: foto anterior
  if (arrasto < -50) mostrarFoto(atual + 1);  // arrastou para a esquerda: próxima
});


/* ---------- SELO "MODELO POR NYCOLLE WEB" SOME NO FIM ----------
   Quando o contato ou o rodapé aparecem na tela, o selo se esconde
   para não ficar por cima dos links e do botão final */
const vigiaFim = new IntersectionObserver(function (entradas) {
  const algumVisivel = entradas.some(function (entrada) { return entrada.isIntersecting; });
  document.body.classList.toggle('no-fim', algumVisivel);
});
vigiaFim.observe(document.querySelector('.rodape'));
