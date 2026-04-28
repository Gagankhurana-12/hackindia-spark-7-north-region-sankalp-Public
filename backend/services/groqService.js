// groqService.js
// Canonical export for Wow Factors generation via Groq.

const {
  generateWowFactors,
  generateWowFactorsFromMetadata,
  _internals,
} = require('./geminiService');

module.exports = {
  generateWowFactors,
  generateWowFactorsFromMetadata,
  _internals,
};
