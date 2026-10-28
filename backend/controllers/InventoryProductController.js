import Product from '../models/InventoryProduct.js';

// Get all products
export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: searchRegex },
        { category: searchRegex },
        { itemName: searchRegex },
        { itemDescription: searchRegex },
        { specification: searchRegex },
        { manufacturer: searchRegex },
        { brand: searchRegex },
        { accountTo: searchRegex },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(products || []);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(200).json([]);
  }
};

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    if (!productData.code || productData.code.trim() === '') {
      const allProducts = await Product.find({}, 'code');
      let maxNum = 0;
      allProducts.forEach((p) => {
        if (p.code) {
          const match = p.code.match(/^(?:FG-INV-|FG)(\d+)/i);
          if (match) {
            const numPart = parseInt(match[1], 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      });
      productData.code = `FG${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      const existingProduct = await Product.findOne({ code: productData.code });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product code already exists' });
      }
    }

    const newProduct = new Product({
      image: productData.image || '',
      code: productData.code,
      category: productData.category || 'Finished Goods',
      itemName: productData.itemName || '',
      itemDescription: productData.itemDescription || '',
      specification: productData.specification || '',
      standardBatchSize: Number(productData.standardBatchSize) || 5,
      batchSizeUom: productData.batchSizeUom || 'kg',
      netWeight: productData.netWeight || '',
      quantity: 0,
      uom: productData.uom || 'pcs',
      manufacturer: productData.manufacturer || productData.brand || 'N/A',
      brand: productData.brand || '',
      accountTo: productData.accountTo || '',
      ingredients: productData.ingredients || [],
      criticalLevel: Number(productData.criticalLevel ?? 0),
      restockWarningPoint: Number(productData.restockWarningPoint ?? 10),
      overstockLimitPoint: Number(productData.overstockLimitPoint ?? 1000),
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

// Update existing product details
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      image,
      code,
      category,
      itemName,
      itemDescription,
      specification,
      standardBatchSize,
      batchSizeUom,
      netWeight,
      uom,
      manufacturer,
      brand,
      accountTo,
      ingredients,
      criticalLevel,
      restockWarningPoint,
      overstockLimitPoint,
    } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        image,
        code,
        category,
        itemName,
        itemDescription,
        specification,
        standardBatchSize: Number(standardBatchSize) || 5,
        batchSizeUom: batchSizeUom || 'kg',
        netWeight: netWeight || '',
        uom,
        manufacturer,
        brand,
        accountTo,
        ingredients,
        criticalLevel: Number(criticalLevel ?? 0),
        restockWarningPoint: Number(restockWarningPoint ?? 10),
        overstockLimitPoint: Number(overstockLimitPoint ?? 1000),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

// Toggle archive product
export const toggleArchiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isArchived = !product.isArchived;
    const updated = await product.save();

    res.status(200).json({
      message: product.isArchived ? 'Product archived successfully' : 'Product unarchived successfully',
      product: updated,
    });
  } catch (error) {
    console.error('Error archiving product:', error);
    res.status(500).json({ message: 'Failed to toggle archive status', error: error.message });
  }
};