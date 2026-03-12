const { spawn } = require('child_process');
const path = require('path');
const ProductEmbedding = require('../models/ProductEmbedding');
const Product = require('../models/Product');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const ML_SCRIPT = path.join(__dirname, '../../../ml/extract_embedding.py');

const recommend = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const imagePath = req.file.path;

    const allEmbeddings = await ProductEmbedding.getAllEmbeddings();
    if (allEmbeddings.length === 0) {
      return res.json({ message: 'No products to compare', data: [] });
    }

    const storedEmbeddings = allEmbeddings.map(row => {
      const emb = row.embedding;
      if (typeof emb === 'string') {
        return JSON.parse(emb.replace('[', '[').replace(']', ']'));
      }
      return emb;
    });
    const productIds = allEmbeddings.map(row => row.product_id);

    const inputData = JSON.stringify({
      stored_embeddings: storedEmbeddings,
      product_ids: productIds,
      top_n: 5
    });

    const result = await new Promise((resolve, reject) => {
      const py = spawn(PYTHON_PATH, [ML_SCRIPT, 'recommend', imagePath], { timeout: 120000 });
      let stdout = '';
      let stderr = '';

      py.stdin.write(inputData);
      py.stdin.end();

      py.stdout.on('data', (data) => { stdout += data.toString(); });
      py.stderr.on('data', (data) => { stderr += data.toString(); });

      py.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Python error: ${stderr || stdout}`));
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.error) return reject(new Error(parsed.error));
          resolve(parsed.recommendations);
        } catch (e) {
          reject(new Error(`Failed to parse output: ${e.message}`));
        }
      });
    });

    const products = await Promise.all(
      result.map(async (rec) => {
        const product = await Product.getById(rec.product_id);
        return { ...product, distance: rec.distance };
      })
    );

    res.json({
      message: 'Similar products found',
      data: products
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { recommend };
