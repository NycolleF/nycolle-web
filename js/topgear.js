/* =========================================================
   TOPGEAR.JS
   0. Links do menu (rolagem do próprio navegador)
   1. Menu: encolhe ao rolar + gaveta do celular
   2. Blocos que aparecem ao rolar + título palavra por palavra + paralaxe
   3. Números que contam
   4. "Aberto agora / Fechado" pelo horário de Brasília
   5. Galeria de lubrificantes: setas e arrastar com o mouse
   6. Carrossel de avaliações: avança sozinho
   7. Janela dos vídeos do Instagram
   8. Balão "Posso ajudar?" do WhatsApp
   ========================================================= */

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- 0. LINKS DO MENU ----------
   Usamos a rolagem do próprio navegador (sem biblioteca): é a mais leve e nunca trava.
   Os links (#servicos, #contato...) deslizam até a seção, descontando a altura do menu */
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (evento) {
    const alvo = document.querySelector(link.getAttribute('href'));
    if (!alvo) return;
    evento.preventDefault();
    fecharMenu();
    const altura = menu.offsetHeight;
    window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - altura + 1, behavior: reduzirMovimento ? 'auto' : 'smooth' });
    // Move o foco para a seção (importante para quem usa teclado ou leitor de tela)
    alvo.setAttribute('tabindex', '-1');
    alvo.focus({ preventScroll: true });
  });
});


/* ---------- 1. MENU ---------- */
const menu = document.querySelector('.menu');
const menuBotao = document.querySelector('.menu-botao');
const menuLista = document.querySelector('.menu-lista');

// Só troca a classe quando o estado muda (trocar à toa a cada pixel rolado pesa)
let menuRolou = null;
function aoRolar() {
  const rolou = window.scrollY > 40;
  if (rolou !== menuRolou) {
    menuRolou = rolou;
    menu.classList.toggle('rolou', rolou);
  }
}
window.addEventListener('scroll', aoRolar, { passive: true });
aoRolar();

function fecharMenu() {
  menuLista.classList.remove('aberta');
  menuBotao.setAttribute('aria-expanded', 'false');
}

menuBotao.addEventListener('click', function () {
  const abrir = !menuLista.classList.contains('aberta');
  menuLista.classList.toggle('aberta', abrir);
  menuBotao.setAttribute('aria-expanded', String(abrir));
});

// Tecla Esc fecha a gaveta
document.addEventListener('keydown', function (evento) {
  if (evento.key === 'Escape') fecharMenu();
});


/* ---------- 2. APARECER AO ROLAR ---------- */
// O "vigia" (IntersectionObserver) avisa quando um bloco entra na tela
const vigia = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (entrada) {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('visivel');
      vigia.unobserve(entrada.target);   // já apareceu: não precisa vigiar mais
    }
  });
}, { rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('[data-revelar]').forEach(function (bloco) {
  vigia.observe(bloco);
});

// Título do hero: separa em palavras. Cada palavra ganha um número (--i) para entrar em sequência.
// O <em> ("E tu também.") continua em itálico vermelho porque separamos dentro dele também
const titulo = document.querySelector('[data-palavras]');
if (titulo && !reduzirMovimento) {
  let contador = 0;
  function separar(no) {
    Array.from(no.childNodes).forEach(function (filho) {
      if (filho.nodeType === Node.TEXT_NODE) {
        const pedacos = filho.textContent.split(/(\s+)/);
        const fragmento = document.createDocumentFragment();
        pedacos.forEach(function (pedaco) {
          if (pedaco.trim() === '') {
            fragmento.appendChild(document.createTextNode(pedaco));
          } else {
            const caixa = document.createElement('span');
            caixa.className = 'palavra';
            const interno = document.createElement('span');
            interno.textContent = pedaco;
            interno.style.setProperty('--i', contador++);
            caixa.appendChild(interno);
            fragmento.appendChild(caixa);
          }
        });
        filho.replaceWith(fragmento);
      } else {
        separar(filho);
      }
    });
  }
  // O leitor de tela lê o título inteiro de uma vez, não palavra por palavra
  titulo.setAttribute('aria-label', titulo.textContent);
  separar(titulo);
  Array.from(titulo.children).forEach(function (filho) { filho.setAttribute('aria-hidden', 'true'); });
}

// Paralaxe: a foto anda mais devagar que a página (só no computador).
// Para não pesar: só calcula quando a pessoa ROLA (não a cada quadro),
// no máximo uma vez por quadro, e só para as fotos que estão na tela
if (!reduzirMovimento && window.matchMedia('(min-width: 820px)').matches) {
  const fotosNaTela = new Set();
  let agendado = false;

  const vigiaParalaxe = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) fotosNaTela.add(entrada.target);
      else fotosNaTela.delete(entrada.target);
    });
    pedirParalaxe();
  });
  document.querySelectorAll('[data-paralaxe]').forEach(function (foto) {
    vigiaParalaxe.observe(foto.parentElement);
  });

  function paralaxe() {
    agendado = false;
    const alturaTela = window.innerHeight;
    fotosNaTela.forEach(function (moldura) {
      const caixa = moldura.getBoundingClientRect();
      // -1 quando a foto está saindo por cima, +1 quando está entrando por baixo
      const posicao = (caixa.top + caixa.height / 2 - alturaTela / 2) / alturaTela;
      moldura.querySelector('[data-paralaxe]').style.transform =
        'scale(1.12) translate3d(0,' + (posicao * -6).toFixed(2) + '%,0)';
    });
  }
  function pedirParalaxe() {
    if (agendado || fotosNaTela.size === 0) return;
    agendado = true;
    requestAnimationFrame(paralaxe);
  }
  window.addEventListener('scroll', pedirParalaxe, { passive: true });
}


/* ---------- 3. NÚMEROS QUE CONTAM ----------
   "4,9" conta com uma casa decimal; "2019" começa de 1999 (contar desde o zero ficaria estranho) */
const vigiaNumeros = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (entrada) {
    if (!entrada.isIntersecting) return;
    vigiaNumeros.unobserve(entrada.target);

    const elemento = entrada.target;
    const texto = elemento.dataset.contar;
    const final = parseFloat(texto.replace(',', '.'));
    const decimais = texto.includes(',') ? 1 : 0;
    const ano = final > 1900;
    const inicio = ano ? final - 20 : 0;
    const duracao = 1800;
    const comeco = performance.now();

    function contar(agora) {
      const t = Math.min((agora - comeco) / duracao, 1);
      const suave = 1 - Math.pow(1 - t, 3);   // começa rápido e freia no fim
      const valor = inicio + (final - inicio) * suave;
      elemento.textContent = valor.toFixed(decimais).replace('.', ',');
      if (t < 1) requestAnimationFrame(contar);
    }
    requestAnimationFrame(contar);
  });
}, { threshold: 0.6 });

if (!reduzirMovimento) {
  document.querySelectorAll('[data-contar]').forEach(function (numero) {
    vigiaNumeros.observe(numero);
  });
}


/* ---------- 4. ABERTO AGORA ----------
   Pega a hora de Brasília (mesmo que a pessoa esteja com o celular em outro fuso)
   e compara com o horário da oficina. Para mudar o horário, mude só esta tabela.
   0 = domingo, 1 = segunda ... 6 = sábado. Horas em minutos: 8h = 480, 18h30 = 1110 */
const HORARIO = {
  0: null,
  1: [480, 1110], 2: [480, 1110], 3: [480, 1110], 4: [480, 1110], 5: [480, 1110],
  6: [480, 720]
};
const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function horaFormatada(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h + 'h' + (m ? String(m).padStart(2, '0') : '');
}

function agoraEmBrasilia() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(new Date());
  const pegar = function (tipo) { return partes.find(function (p) { return p.type === tipo; }).value; };
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(pegar('weekday'));
  const minutos = (parseInt(pegar('hour'), 10) % 24) * 60 + parseInt(pegar('minute'), 10);
  return { dia: dia, minutos: minutos };
}

function atualizarStatus() {
  const agora = agoraEmBrasilia();
  const hoje = HORARIO[agora.dia];
  let aberto = false;
  let texto;

  if (hoje && agora.minutos >= hoje[0] && agora.minutos < hoje[1]) {
    aberto = true;
    texto = 'Aberto agora · fecha às ' + horaFormatada(hoje[1]);
  } else {
    // Procura o próximo dia (ou hoje mais tarde) em que abre
    for (let i = 0; i < 7; i++) {
      const dia = (agora.dia + i) % 7;
      const horario = HORARIO[dia];
      if (!horario) continue;
      if (i === 0 && agora.minutos >= horario[0]) continue;
      const quando = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : NOMES_DIAS[dia];
      texto = 'Fechado · abre ' + quando + ' às ' + horaFormatada(horario[0]);
      break;
    }
  }

  document.querySelectorAll('[data-status]').forEach(function (selo) {
    selo.textContent = texto;
    selo.dataset.aberto = aberto ? 'sim' : 'nao';
  });

  // Destaca a linha de hoje na tabela de horários
  document.querySelectorAll('.horarios tr').forEach(function (linha) {
    linha.classList.toggle('hoje', linha.dataset.dias.split(',').includes(String(agora.dia)));
  });
}
atualizarStatus();
setInterval(atualizarStatus, 60000);   // confere de novo a cada minuto


/* ---------- 5. GALERIA DE LUBRIFICANTES ---------- */
// Setas: andam uma foto para o lado
document.querySelectorAll('[data-trilho]').forEach(function (seta) {
  seta.addEventListener('click', function () {
    const trilho = document.getElementById(seta.dataset.trilho);
    const passo = trilho.querySelector('li').offsetWidth + 18;
    trilho.scrollBy({ left: passo * Number(seta.dataset.direcao), behavior: reduzirMovimento ? 'auto' : 'smooth' });
  });
});

// Arrastar com o mouse (no celular o dedo já arrasta sozinho)
function arrastavel(trilho) {
  let segurando = false;
  let inicioX = 0;
  let inicioScroll = 0;
  let moveu = false;

  trilho.addEventListener('pointerdown', function (evento) {
    if (evento.pointerType !== 'mouse') return;
    segurando = true;
    moveu = false;
    inicioX = evento.clientX;
    inicioScroll = trilho.scrollLeft;
  });
  window.addEventListener('pointermove', function (evento) {
    if (!segurando) return;
    const distancia = evento.clientX - inicioX;
    if (Math.abs(distancia) > 4) {
      moveu = true;
      trilho.classList.add('arrastando');
    }
    trilho.scrollLeft = inicioScroll - distancia;
  });
  window.addEventListener('pointerup', function () {
    if (!segurando) return;
    segurando = false;
    trilho.classList.remove('arrastando');
  });
  // Se arrastou, o clique de soltar não deve abrir nenhum link
  trilho.addEventListener('click', function (evento) {
    if (moveu) { evento.preventDefault(); evento.stopPropagation(); }
  }, true);
}
document.querySelectorAll('.trilho, .carrossel-trilho').forEach(arrastavel);


/* ---------- 6. CARROSSEL DE AVALIAÇÕES ---------- */
const carrossel = document.querySelector('[data-carrossel]');
if (carrossel) {
  const trilho = carrossel.querySelector('.carrossel-trilho');
  const itens = Array.from(trilho.children);
  const pontinhos = carrossel.querySelector('.pontinhos');
  let atual = 0;
  let timer = null;

  itens.forEach(function () { pontinhos.appendChild(document.createElement('span')); });

  function irPara(indice) {
    atual = (indice + itens.length) % itens.length;
    trilho.scrollTo({ left: itens[atual].offsetLeft - trilho.offsetLeft, behavior: reduzirMovimento ? 'auto' : 'smooth' });
  }

  // Descobre qual avaliação está visível (quando a pessoa arrasta com o dedo, por exemplo)
  trilho.addEventListener('scroll', function () {
    const meio = trilho.scrollLeft + 4;
    itens.forEach(function (item, i) {
      if (item.offsetLeft - trilho.offsetLeft <= meio) atual = i;
    });
    Array.from(pontinhos.children).forEach(function (p, i) { p.classList.toggle('ativo', i === atual); });
  }, { passive: true });
  pontinhos.children[0].classList.add('ativo');

  carrossel.querySelectorAll('[data-trilho-carrossel]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      irPara(atual + Number(botao.dataset.trilhoCarrossel));
      reiniciar();
    });
  });

  // Avança sozinho a cada 6 s, mas para enquanto a pessoa está com o mouse ou o dedo em cima
  function reiniciar() {
    clearInterval(timer);
    if (!reduzirMovimento) timer = setInterval(function () { irPara(atual + 1); }, 6000);
  }
  carrossel.addEventListener('pointerenter', function () { clearInterval(timer); });
  carrossel.addEventListener('pointerleave', reiniciar);
  carrossel.addEventListener('focusin', function () { clearInterval(timer); });
  carrossel.addEventListener('focusout', reiniciar);
  reiniciar();
}


/* ---------- 7. JANELA DOS VÍDEOS ---------- */
const janelaVideo = document.querySelector('.video-janela');
const caixaVideo = janelaVideo.querySelector('.video-janela-caixa');

document.querySelectorAll('.video-cartao').forEach(function (cartao) {
  cartao.addEventListener('click', function (evento) {
    // Navegadores muito antigos não têm <dialog>: deixa abrir no Instagram
    if (typeof janelaVideo.showModal !== 'function') return;
    evento.preventDefault();
    // O iframe do Instagram só é criado agora: antes disso, nada do Instagram é baixado
    caixaVideo.innerHTML = '<iframe src="' + cartao.dataset.video + '" title="' +
      cartao.querySelector('.video-titulo').textContent + ', vídeo no Instagram" allowfullscreen></iframe>';
    janelaVideo.showModal();
  });
});

janelaVideo.querySelector('.video-janela-fechar').addEventListener('click', function () {
  janelaVideo.close();
});
janelaVideo.addEventListener('click', function (evento) {
  if (evento.target === janelaVideo) janelaVideo.close();   // clicou no fundo escuro
});
janelaVideo.addEventListener('close', function () {
  caixaVideo.innerHTML = '';   // apaga o iframe: o vídeo para de tocar
});


/* ---------- 8. BALÃO DO WHATSAPP ----------
   Aparece depois de 7 segundos na página e some sozinho depois de 8 */
const whats = document.querySelector('.whats-flutuante');
setTimeout(function () {
  whats.classList.add('com-balao');
  setTimeout(function () { whats.classList.remove('com-balao'); }, 8000);
}, 7000);
