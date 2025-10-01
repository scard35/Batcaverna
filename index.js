const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCRIPT_FILE = 'bot.js';  // Seu arquivo do bot
const MONITOR_INTERVAL = 30000;  // Verifica a cada 30s

// Função helper para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  let page;
  let monitorInterval;

  try {
    // Verifica se o arquivo existe
    if (!fs.existsSync(SCRIPT_FILE)) {
      throw new Error(`Arquivo ${SCRIPT_FILE} não encontrado!`);
    }

    // Lança o navegador
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
    });

    page = await browser.newPage();

    // Evento para crash de página
    page.on('pagecrash', async () => {
      console.log('Página crashed! Fechando browser...');
      clearInterval(monitorInterval);
      await browser.close();
      process.exit(1);
    });

    // Evento para desconexão do browser
    browser.on('disconnected', async () => {
      console.log('Browser desconectado! Fechando...');
      clearInterval(monitorInterval);
      process.exit(1);
    });

    // Navega para o Haxball
    console.log('Navegando para https://www.haxball.com/cCknefUv/__cache_static__/g/headless.html...');
    await page.goto('https://www.haxball.com/cCknefUv/__cache_static__/g/headless.html', { waitUntil: 'networkidle2' });

    // Aumenta o delay inicial para garantir que a página carregue
    await delay(7000);  // Aumentado de 5000 para 7000ms

    // Lê e injeta o script do bot
    const scriptContent = fs.readFileSync(SCRIPT_FILE, 'utf8');
    console.log('Injetando script...');
    await page.evaluate(scriptContent);

    // Aguarda mais tempo para o link ser gerado
    await delay(5000);  // Adicionado delay extra pós-injeção

    // Tenta capturar o link com retry (até 3 tentativas)
    let roomLink = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      roomLink = await page.evaluate(() => {
        const linkElement = document.querySelector('a[href*="play?"]');
        return linkElement ? linkElement.href : null;
      });
      console.log(`Tentativa ${attempt} de capturar link. Resultado: ${roomLink || 'Nenhum link encontrado'}`);
      if (roomLink) break;
      await delay(2000);  // Espera 2s entre tentativas
    }

    if (roomLink) {
      console.log('Sala criada! Link:', roomLink);
    } else {
      throw new Error('Falha ao capturar o link da sala após 3 tentativas. Verifique o console do navegador (F12).');
    }

    // Função de monitoramento
    const monitorRoom = async () => {
      try {
        const currentLink = await page.evaluate(() => {
          const linkElement = document.querySelector('a[href*="play?"]');
          return linkElement ? linkElement.href : null;
        });

        const errorMsg = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('body, .error, [class*="error"]');
          for (let el of errorElements) {
            if (el.textContent && (el.textContent.toLowerCase().includes('closed') || el.textContent.toLowerCase().includes('error') || el.textContent.toLowerCase().includes('disconnect'))) {
              return el.textContent.trim();
            }
          }
          return null;
        });

        if (!currentLink || errorMsg) {
          console.log('Sala caiu detectada! (Link perdido ou erro:', errorMsg || 'desconhecido', ') Fechando browser...');
          clearInterval(monitorInterval);
          await browser.close();
          process.exit(1);
        } else {
          console.log('Sala OK.');
        }
      } catch (err) {
        console.error('Erro no monitoramento:', err.message);
        clearInterval(monitorInterval);
        await browser.close();
        process.exit(1);
      }
    };

    // Inicia o monitoramento
    monitorInterval = setInterval(monitorRoom, MONITOR_INTERVAL);
    console.log(`Monitoramento iniciado. Verificação a cada ${MONITOR_INTERVAL / 1000}s.`);

    await new Promise(() => {});  // Mantém vivo

  } catch (error) {
    console.error('Erro fatal:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();