const fs = require('fs');

/**
 * Iterates through a 1d array and removes all instances of null and undefined 
 * @param {string[]} arr 
 */
const cleanArray = arr => arr.filter(el => el != (null || undefined));

/**
 * @param {string} dir 
 * @returns {string} Returns a random file path from a directory
 */
const randomFileFromDir = dir => {
  const files = fs.readdirSync(dir);
  return files[randomBetween(0, files.length)];
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const randomBetween = (min, max) => Math.floor(Math.random() * max) + min; 

module.exports = { cleanArray, randomFileFromDir, randomBetween };