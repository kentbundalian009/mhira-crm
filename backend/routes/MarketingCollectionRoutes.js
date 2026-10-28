import express from 'express';
import { 
    getPublicProducts, 
    getPublicProductById,
    getCategories,
    getAllCatalogProducts, 
    getInventoryProducts,
    createCatalogProduct, 
    updateCatalogProduct, 
    deleteCatalogProduct 
} from '../controllers/MarketingCollectionController.js';

const router = express.Router();

// Public Routes (Customer Side & Navbar)
router.get('/', getPublicProducts);
router.get('/public', getPublicProducts);
router.get('/public/:id', getPublicProductById);
router.get('/categories', getCategories);

// Marketing & Catalog Routes
router.get('/catalog', getAllCatalogProducts);
router.get('/inventory-products', getInventoryProducts);
router.post('/catalog', createCatalogProduct);
router.put('/catalog/:id', updateCatalogProduct);
router.delete('/catalog/:id', deleteCatalogProduct);

export default router;