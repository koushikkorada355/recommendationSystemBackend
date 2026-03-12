const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { createProduct, updateProduct, deleteProduct } = require('../controllers/adminController');

router.post('/product', adminAuth, upload.single('image'), createProduct);
router.put('/product/:id', adminAuth, upload.single('image'), updateProduct);
router.delete('/product/:id', adminAuth, deleteProduct);

module.exports = router;
