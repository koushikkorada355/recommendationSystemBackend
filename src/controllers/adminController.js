const { execFile } = require('child_process');
const path = require('path');
const Product = require('../models/Product');
const ProductEmbedding = require('../models/ProductEmbedding');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const ML_SCRIPT = path.join(__dirname, '../../../ml/extract_embedding.py');

const extractEmbedding = (imagePath) => {
  return new Promise((resolve, reject) => {
    execFile(PYTHON_PATH, [ML_SCRIPT, 'extract', imagePath], { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Python script error: ${error.message}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result.embedding);
      } catch (e) {
        reject(new Error(`Failed to parse embedding output: ${e.message}`));
      }
    });
  });
};

const createProduct = async (req, res) => {
  try {
    const { name, category, description, price } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Product image is required' });
    }

    const imagePath = req.file.path;
    const imageRelPath = 'uploads/' + req.file.filename;

    const product = await Product.create({
      name,
      category,
      description,
      price,
      image_path: imageRelPath
    });

    const embedding = await extractEmbedding(imagePath);

    await ProductEmbedding.create({
      product_id: product.id,
      embedding
    });

    res.status(201).json({
      message: 'Product created with embedding',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, price } = req.body;

    const existing = await Product.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let imageRelPath = existing.image_path;

    if (req.file) {
      const imagePath = req.file.path;
      imageRelPath = 'uploads/' + req.file.filename;

      const embedding = await extractEmbedding(imagePath);

      const existingEmbedding = await ProductEmbedding.getByProductId(id);
      if (existingEmbedding) {
        await ProductEmbedding.update(id, { embedding });
      } else {
        await ProductEmbedding.create({ product_id: id, embedding });
      }
    }

    const product = await Product.update(id, {
      name: name || existing.name,
      category: category || existing.category,
      description: description || existing.description,
      price: price || existing.price,
      image_path: imageRelPath
    });

    res.json({
      message: 'Product updated',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Product.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Product.delete(id);

    res.json({
      message: 'Product deleted',
      data: existing
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createProduct, updateProduct, deleteProduct, extractEmbedding };
