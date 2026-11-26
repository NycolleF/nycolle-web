/* =========================================================
   INDEX.JS
   JavaScript da página inicial.
   1. Ano do rodapé
   2. Menu ganha sombra ao rolar
   3. Conversa da janelinha: mensagens aparecem uma por uma
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


/* ---------- 3. CONVERSA DA JANELINHA ----------
   Ordem: cliente pergunta → loja "digitando..." → loja responde → cliente responde.
   Depois de um tempo, tudo some e começa de novo */
const conversa = document.querySelector('.janela-conversa');
const mensagens = Array.from(conversa.querySelectorAll('.msg'));
const digitando = conversa.querySelector('.digitando');

// "esperar(1000)" = pausa de 1 segundo. Deixa a sequência fácil de ler, de cima para baixo
function esperar(ms) {
  return new Promise(function (pronto) { setTimeout(pronto, ms); });
}

async function animarConversa() {
  while (true) {
    mensagens.forEach(function (m) { m.classList.remove('mostrar'); });
    await esperar(700);
    mensagens[0].classList.add('mostrar');   // cliente pergunta
    await esperar(1200);
    digitando.classList.add('mostrar');      // loja digitando...
    await esperar(1600);
    digitando.classList.remove('mostrar');
    mensagens[2].classList.add('mostrar');   // loja responde
    await esperar(1500);
    mensagens[3].classList.add('mostrar');   // cliente: "10h, por favor"
    await esperar(4500);                     // deixa a conversa um tempo na tela
  }
}

if (reduzirMovimento) {
  // Sem animação: mostra a conversa completa, sem os pontinhos
  mensagens.forEach(function (m) { if (m !== digitando) m.classList.add('mostrar'); });
} else {
  animarConversa();
}


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
