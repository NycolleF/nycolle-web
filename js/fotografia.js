/* =========================================================
   FOTOGRAFIA.JS
   0. Rolagem suave (Lenis)
   1. Menu: vidro fosco, some ao descer, volta ao subir + barrinha de progresso
   2. Menu do celular: abre e fecha
   3. Blocos que aparecem ao rolar + títulos palavra por palavra + parallax
   4. Palavras que "acendem" conforme a rolagem
   5. Portfólio em "filme": rola para baixo, as fotos andam para o lado (e inclinam)
   6. Coisas que seguem o mouse: foto dos ensaios, cursor "Ver", capa, botões-ímã
   7. Lightbox: as fotos do portfólio abrem em tela cheia
   8. Janela dos vídeos + números que contam + selo que some no fim da página
   ========================================================= */

// Quem pediu "reduzir movimento" no aparelho não vê os efeitos mais fortes
const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Aparelho com mouse e tela grande (computador). No celular, os efeitos de mouse ficam desligados
const temMouse = window.matchMedia('(hover: hover) and (min-width: 900px)').matches;

// "Regra de três" entre dois valores: lerp(10, 20, 0.1) = 11.
// Usamos para as coisas irem ATRÁS de um alvo aos pouquinhos (é isso que dá a sensação fluida)
function lerp(de, para, quanto) {
  return de + (para - de) * quanto;
}

// Trava um número entre um mínimo e um máximo
function travar(numero, minimo, maximo) {
  return Math.min(Math.max(numero, minimo), maximo);
}


/* ---------- 0. ROLAGEM SUAVE ----------
   A Lenis faz a página deslizar com inércia: a rodinha do mouse empurra,
   e a página freia devagar, em vez de andar "aos trancos".
   No celular ela deixa a rolagem do próprio aparelho (que já é suave). */
let rolagem = null;

if (!reduzirMovimento && typeof Lenis !== 'undefined') {
  rolagem = new Lenis({
    lerp: 0.085           // quanto menor, mais "macia" (e mais demorada) a freada
  });

  // A Lenis precisa ser avisada a cada quadro da tela
  function quadro(tempo) {
    rolagem.raf(tempo);
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}

// Pausa a rolagem da página (quando abre o menu, a foto grande ou o vídeo) e volta depois
function pausarRolagem() {
  if (rolagem) rolagem.stop();
}
function voltarRolagem() {
  // Só religa se estava pausada (religar à toa cancelaria um deslize em andamento)
  if (rolagem && rolagem.isStopped) rolagem.start();
}

// Links do menu (#portfolio, #sobre...): a Lenis desliza até a seção
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (evento) {
    const alvo = document.querySelector(link.getAttribute('href'));
    if (!rolagem || !alvo) return;   // sem Lenis, o navegador cuida sozinho
    evento.preventDefault();
    voltarRolagem();                 // se o menu do celular estava aberto, a rolagem estava pausada
    rolagem.scrollTo(alvo, { duration: 1.6 });
  });
});


/* ---------- 1. MENU QUE MUDA AO ROLAR ---------- */
let ultimaPosicao = 0;

function atualizarMenu() {
  // window.scrollY = quantos pixels a página já rolou.
  // classList.toggle('classe', condição) coloca a classe se for verdade e tira se for mentira.
  // As classes vão no <body> para o menu E o selo "Modelo por Nycolle Web" poderem usar
  const posicao = window.scrollY;
  document.body.classList.toggle('rolou', posicao > 60);

  // Descendo (e já longe do topo): esconde o menu. Subindo: mostra
  const descendo = posicao > ultimaPosicao;
  if (Math.abs(posicao - ultimaPosicao) > 4) {   // ignora tremidinhas pequenas
    document.body.classList.toggle('menu-some', descendo && posicao > 400);
    ultimaPosicao = posicao;
  }

  // Barrinha de progresso: quanto já foi lido, de 0 (topo) a 1 (fim)
  const total = document.documentElement.scrollHeight - window.innerHeight;
  document.documentElement.style.setProperty('--progresso', total > 0 ? posicao / total : 0);
}


/* ---------- 2. MENU DO CELULAR ---------- */
const botaoMenu = document.querySelector('.menu-botao');

function fecharMenu() {
  document.body.classList.remove('menu-aberto');
  botaoMenu.setAttribute('aria-expanded', 'false');
  voltarRolagem();
}

botaoMenu.addEventListener('click', function () {
  const abriu = document.body.classList.toggle('menu-aberto');
  botaoMenu.setAttribute('aria-expanded', String(abriu));
  if (abriu) pausarRolagem(); else voltarRolagem();
});

// Ao tocar num link do menu, ele fecha (e a página desliza até a seção)
document.querySelectorAll('.menu-lista a').forEach(function (link) {
  link.addEventListener('click', fecharMenu);
});


/* ---------- 3a. TÍTULOS PALAVRA POR PALAVRA ----------
   Cada palavra do h2 vai para dentro de uma "janelinha" (.mascara).
   O CSS faz elas subirem uma depois da outra quando o título aparece.
   Precisa vir ANTES do vigia (3b), porque ele é quem dispara a animação. */
document.querySelectorAll('h2[data-revelar]').forEach(function (titulo) {
  const texto = titulo.textContent.trim();
  titulo.setAttribute('aria-label', texto); // o leitor de tela lê a frase inteira, não palavra por palavra
  titulo.innerHTML = texto.split(/\s+/).map(function (palavra, numero) {
    return '<span class="mascara" aria-hidden="true"><span style="--i: ' + numero + '">' + palavra + '</span></span>';
  }).join(' ');
  titulo.classList.add('titulo-dividido');
});


/* ---------- 3b. APARECER AO ROLAR ----------
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


/* ---------- 3c. PARALLAX ----------
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
    const progresso = travar((inicio - caixa.top) / (inicio - fim + caixa.height), 0, 1);

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
let esperaEndireitar = null;

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
  const rolado = travar(-filme.getBoundingClientRect().top, 0, distanciaFilme);
  trilho.style.transform = 'translateX(' + (-rolado) + 'px)';

  // As fotos inclinam conforme a VELOCIDADE da rolagem (a Lenis sabe a velocidade)...
  const velocidade = rolagem ? rolagem.velocity : 0;
  trilho.style.setProperty('--inclinar', travar(velocidade * -0.25, -6, 6) + 'deg');

  // ...e quando a pessoa para de rolar, voltam retinhas
  clearTimeout(esperaEndireitar);
  esperaEndireitar = setTimeout(function () {
    trilho.style.setProperty('--inclinar', '0deg');
  }, 120);
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
  atualizarMenu();
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


/* ---------- 6. COISAS QUE SEGUEM O MOUSE (só no computador) ----------
   Truque da fluidez: guardamos onde o mouse ESTÁ (o "alvo") e, a cada quadro,
   cada coisa anda só um pedacinho do caminho até ele (lerp). Assim ela chega "deslizando". */
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

window.addEventListener('mousemove', function (evento) {
  mouse.x = evento.clientX;
  mouse.y = evento.clientY;
}, { passive: true });

// 6a. Foto flutuante dos ensaios: aparece ao passar num item e segue o mouse balançando
const lista = document.querySelector('.ensaios-lista');
const flutuante = document.querySelector('.ensaios-flutuante');
const fotoFlutuante = flutuante.querySelector('img');
const posFoto = { x: mouse.x, y: mouse.y };

lista.querySelectorAll('li').forEach(function (item) {
  item.addEventListener('mouseenter', function () {
    fotoFlutuante.src = item.querySelector('img').src; // usa a mesma foto da miniatura
    flutuante.classList.add('ativa');
  });
});

lista.addEventListener('mouseleave', function () {
  flutuante.classList.remove('ativa');
});

// 6b. Cursor "Ver" / "Play": uma bolinha que aparece em cima das fotos e dos vídeos
const bolinha = document.createElement('div');
bolinha.className = 'cursor-bolinha';
bolinha.setAttribute('aria-hidden', 'true');
document.body.appendChild(bolinha);
const posBolinha = { x: mouse.x, y: mouse.y };

function ligarBolinha(seletor, texto) {
  document.querySelectorAll(seletor).forEach(function (item) {
    item.addEventListener('mouseenter', function () {
      bolinha.textContent = texto;
      bolinha.classList.add('ativa');
    });
    item.addEventListener('mouseleave', function () {
      bolinha.classList.remove('ativa');
    });
  });
}

// 6c. Capa: as camadas (arco, foto pequena, selo) se mexem de leve com o mouse
const abertura = document.querySelector('.abertura');

if (temMouse && !reduzirMovimento) {
  ligarBolinha('.galeria-item', 'Ver');
  ligarBolinha('.video-cartao', 'Play');

  abertura.addEventListener('mousemove', function (evento) {
    // Posição do mouse de -1 (esquerda/topo) a 1 (direita/baixo)
    const mx = (evento.clientX / window.innerWidth) * 2 - 1;
    const my = (evento.clientY / window.innerHeight) * 2 - 1;
    abertura.style.setProperty('--mx', mx.toFixed(3));
    abertura.style.setProperty('--my', my.toFixed(3));
  });

  // 6d. Botões-ímã: o botão vem um pouquinho na direção do mouse
  document.querySelectorAll('.btn-foto').forEach(function (botao) {
    botao.addEventListener('mousemove', function (evento) {
      const caixa = botao.getBoundingClientRect();
      const dx = evento.clientX - (caixa.left + caixa.width / 2);
      const dy = evento.clientY - (caixa.top + caixa.height / 2);
      botao.style.translate = (dx * 0.25) + 'px ' + (dy * 0.4) + 'px';
    });
    botao.addEventListener('mouseleave', function () {
      botao.style.translate = '';   // volta para o lugar (o CSS faz a volta suave)
    });
  });

  // O "motor": a cada quadro, a foto flutuante e a bolinha andam um pedaço até o mouse
  function seguirMouse() {
    // Foto flutuante: mais "preguiçosa" (0.12) e inclina conforme a distância que falta
    const antes = posFoto.x;
    posFoto.x = lerp(posFoto.x, mouse.x, 0.12);
    posFoto.y = lerp(posFoto.y, mouse.y, 0.12);
    const giro = travar((posFoto.x - antes) * 0.6, -12, 12);
    // Tiramos metade do tamanho da foto (240 x 320) para o centro dela ficar no mouse
    flutuante.style.translate = (posFoto.x - 120) + 'px ' + (posFoto.y - 160) + 'px';
    flutuante.style.rotate = giro + 'deg';

    // Bolinha: mais rápida (0.2), quase grudada no mouse
    posBolinha.x = lerp(posBolinha.x, mouse.x, 0.2);
    posBolinha.y = lerp(posBolinha.y, mouse.y, 0.2);
    bolinha.style.translate = posBolinha.x + 'px ' + posBolinha.y + 'px';

    requestAnimationFrame(seguirMouse);
  }
  requestAnimationFrame(seguirMouse);
}


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
    bolinha.classList.remove('ativa');
    pausarRolagem();
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

// Fechou (pelo X, pelo fundo ou pela tecla Esc): a página volta a rolar
lightbox.addEventListener('close', voltarRolagem);

// Teclado: setas passam as fotos. (A tecla Esc o <dialog> já fecha sozinho)
document.addEventListener('keydown', function (evento) {
  if (lightbox.open) {
    if (evento.key === 'ArrowLeft') mostrarFoto(atual - 1);
    if (evento.key === 'ArrowRight') mostrarFoto(atual + 1);
  } else if (evento.key === 'Escape') {
    fecharMenu();
  }
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


/* ---------- 8a. JANELA DOS VÍDEOS ----------
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
    bolinha.classList.remove('ativa');
    pausarRolagem();
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
  voltarRolagem();
});


/* ---------- 8b. NÚMEROS QUE CONTAM ----------
   "+20" e "6" começam do zero e sobem até o valor quando aparecem na tela */
const vigiaNumeros = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (entrada) {
    if (!entrada.isIntersecting) return;
    vigiaNumeros.unobserve(entrada.target);

    const elemento = entrada.target;
    const original = elemento.dataset.original;       // ex.: "+20"
    const final = parseInt(original.replace(/\D/g, ''), 10); // só os dígitos: 20
    const prefixo = original.replace(/\d/g, '');      // o que sobra: "+"
    const duracao = 1600;                             // 1,6 segundo
    const inicio = performance.now();

    function contar(agora) {
      const t = travar((agora - inicio) / duracao, 0, 1);
      const suave = 1 - Math.pow(1 - t, 3);           // começa rápido e freia no fim
      elemento.textContent = prefixo + Math.round(final * suave);
      if (t < 1) requestAnimationFrame(contar);
    }
    requestAnimationFrame(contar);
  });
}, { threshold: 0.6 });

if (!reduzirMovimento) {
  document.querySelectorAll('.numeros dt').forEach(function (numero) {
    numero.dataset.original = numero.textContent;                // guarda o "+20" verdadeiro
    numero.textContent = numero.textContent.replace(/\d+/, '0'); // e começa mostrando "+0"
    vigiaNumeros.observe(numero);
  });
}


/* ---------- 8c. SELO "MODELO POR NYCOLLE WEB" SOME NO FIM ----------
   Quando o rodapé aparece na tela, o selo se esconde
   para não ficar por cima dos links e do botão final */
const vigiaFim = new IntersectionObserver(function (entradas) {
  const algumVisivel = entradas.some(function (entrada) { return entrada.isIntersecting; });
  document.body.classList.toggle('no-fim', algumVisivel);
});
vigiaFim.observe(document.querySelector('.rodape'));
