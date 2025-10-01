const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCRIPT_FILE = 'bot.js';  // Nome do arquivo separado com o seu script

// Função helper para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    // Verifica se o arquivo existe
    if (!fs.existsSync(SCRIPT_FILE)) {
      throw new Error(`Arquivo ${SCRIPT_FILE} não encontrado! Crie-o com o seu script do bot.`);
    }

    // Lança o navegador
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });

    const page = await browser.newPage();

    // Navega para a página do Haxball Headless
    console.log('Navegando para https://www.haxball.com/headless...');
    await page.goto('https://www.haxball.com/headless', { waitUntil: 'networkidle2' });

    // Espera a página carregar
    await delay(5000);

    // Lê o conteúdo do arquivo separado
    const scriptContent = fs.readFileSync(SCRIPT_FILE, 'utf8');
    console.log('Script lido do arquivo. Injetando na página...');

    // Injeta o script na página
    await page.evaluate(scriptContent);

    // Espera um pouco mais para o link aparecer (ajuste conforme necessário)
    await delay(2000);

    // Extrai o link do elemento <a> na página
    const roomLink = await page.evaluate(() => {
      const linkElement = document.querySelector('a[href*="play?"]');
      return linkElement ? linkElement.href : null;
    });

    if (roomLink) {
      console.log('Sala criada! Link:', roomLink);
    } else {
      console.log('Não foi possível encontrar o link da sala. Verifique o console do navegador (F12).');
    }

    console.log('Navegador aberto. Feche manualmente quando quiser parar o bot.');
    console.log('Dica: Verifique o console do navegador (F12) para logs adicionais.');

  } catch (error) {
    console.error('Erro:', error.message);
  }
})();