const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { SYS_NES, SYS_SNES, SYS_PC, SYS_PLAYSTATION } = require('./types');
const Crawler = require('./Crawler');
const path = require('path');
const throttledQueue = require('throttled-queue');
const clear = require('clear');
const chalk = require('chalk');

// These should remain constant throughout this application 
const PER_PAGE = '50';
const ORDER = 'ASC';

const MAX_REQUESTS = 10;
const ONE_MINUTE = 60000;
const MAX_REQUESTS_PER = ONE_MINUTE;

(async () => {

  const apiBaseURL = "http://www.replacementdocs.com/download.php";

  // Throttle our requests so the connection doesn't go bang
  const tq = throttledQueue(MAX_REQUESTS, MAX_REQUESTS_PER, true);

  /**
   * Crawls the replacementdocs website for game manual URLs, then downloads them.
   * @param {string} apiBaseURL 
   * @param {string} systemType 
   * @param {string} offset 
   */
  const crawlSystem = async (apiBaseURL, systemType, offset, outputDir) => {

    const crawler = new Crawler({ apiBaseURL, outputDir });

    // Get the data on the first page, we will use this to build
    // our links
    const firstPageURL = `${apiBaseURL}?${offset}.list.${systemType}.${PER_PAGE}.download_name.${ORDER}`;
    const firstPageRes = await fetch(firstPageURL);
    const firstPageData = await firstPageRes.text();
    const $firstpage = cheerio.load(firstPageData);

    // Get the page URLS (they are paginated)
    const systemPageURLs = crawler.getSystemPageLinks($firstpage);
    const systemPagePromises = systemPageURLs.map(url => new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        const $ = cheerio.load(text);
        resolve($);
      } catch (error) {
        reject(error);
      }
    }));

    // Get all of the page data, from here we need to grab
    // the game URLS from each of the pages 
    const pagedata = await Promise.all(systemPagePromises);
    const gameLinks = pagedata.map(pd => crawler.getGameLinks(pd));
    const glinks = gameLinks.flat(Infinity);

    glinks.forEach((glink, i) => {

      tq(() => {
        const gameid = crawler.parseIdFromGamePageURL(glink);
        crawler.downloadManual(gameid)
          .then(filepath => {
            clear();
            console.log(chalk.red(`REQUESTS LIMITED TO ${MAX_REQUESTS} REQUESTS PER ${MAX_REQUESTS_PER} MS`));
            console.log(`${chalk.blue.bold(i)} of ${chalk.bold(glinks.length)} caught!`);
            console.log(chalk.green(`Wrote ${chalk.bold(filepath)}`));
            console.log(chalk.yellow(`${Math.random() > 0.5 ? '^' : '-'}_${Math.random() > 0.5 ? '^' : '-'}`));
          })
          .catch(error => { throw new Error(error) })
      });
    });
  }

  [SYS_SNES].forEach(item => {
    let p;

    if (item === SYS_SNES) {
      p = 'snes';
    }

    if (item === SYS_PC) {
      p = 'pc';
    }

    if (item === SYS_PLAYSTATION) {
      p = 'ps1'
    }

    crawlSystem(apiBaseURL, item, 0, path.join(__dirname, '..', 'caught', p));
  });

})();