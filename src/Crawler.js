const { cleanArray } = require('./helpers');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

/**
 * This class is responsible for interacting with www.replacementdocs.com in
 * a number of ways ;)
 * 
 * Enjoy!
 * 
 * ~~~information should be free and not hoarded~~~
 */
class Crawler {

  constructor(params) {
    const {apiBaseURL, outputDir} = params;
    this._apiBaseURL = apiBaseURL;
    this._outputDir = outputDir;
    this._errors = [];
  }

  checkErrors = () => {
    if (this._errors.length >= 5) {
      throw new Error(this._errors);
    }
  }

  /**
   * @param {string} gameURL 
   * @returns {string} Returns the game ID
   */
  parseIdFromGamePageURL = gameURL => {
    const qs = gameURL.split('?')[1];
    const id = qs.split('.')[1];
    return id;
  }

  /**
   * @param {} $ 
   * @returns {string[]} Each element in the array contains
   * a download link for the game.
   */
  getGameLinks = $ => {

    const gameURLS = [];
    $('.fborder tr').each((i, el) => {
      if (i === 0 || i === 1) {
        return;
      }
      const first = $(el).find('td').first();
      const gameURL = first.find('a').first().attr('href');
      gameURLS.push(gameURL);
    });
    const cleaned = cleanArray(gameURLS);
    return cleaned;

  };

  /**
   * @param {Cheerio} $ 
   * @returns {string[]} Each element in the array contains a link to the system page (these are pagination links)
   */
  getSystemPageLinks = $ => {
    const pageURLS = $('.nextprev select option').map((i, element) => $(element).val()).get();
    return pageURLS;
  };

  /**
   * @params {string} gameid - The id of the game
   * @returns {Promise}
   */
  downloadManual = gameid => new Promise(async (resolve, reject) => {
    const downloadURL = `http://www.replacementdocs.com/request.php?${gameid}`;
    try {
      this.checkErrors();

      const res = await fetch(downloadURL);
      const filename = res.headers.get('Content-Disposition').split('filename=')[1].replace(/\"/g, '');

      const filepath = path.join(this._outputDir, filename);

      // before writing, check to see if the file already exists
      const exists = fs.existsSync(filepath);

      if (exists) {
        resolve(filepath);
      }

      const filestream = fs.createWriteStream(filepath);

      res.body.pipe(filestream);

      filestream.on('finish', () => {
        resolve(filepath)
      });
      
    } catch(error) {
      this._errors.push(error);
      reject(error);
    }
  }); 

}

module.exports = Crawler