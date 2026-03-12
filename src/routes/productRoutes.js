const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getProductsByCategory } = require('../controllers/productController');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/category/:category', getProductsByCategory);

module.exports = router;
