import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFormulaSheets, createFormulaSummaryPdf, getFormulaMaterialType, getFormulaProducts } from '../src/utils/formulaSummaryPdf.js';

test('IPM is paired with a single fragrance using the compact print ratio', () => {
  const materials = [
    { _id: 'wax', name: 'Soy Wax', category: 'Wax', unit: 'g' },
    { _id: 'oil', name: 'Essential Oil Amber', category: 'Essential Oil', unit: 'ml' },
    { _id: 'ipm', name: 'IPM', category: 'Phụ gia', unit: 'ml' },
  ];
  assert.equal(getFormulaMaterialType(materials[2]), 'ipm');
  const [sheet] = buildFormulaSheets([{
    name: 'Amber Candle',
    base_ingredients: [
      { ingredient_id: 'wax', quantity: 100 },
      { ingredient_id: 'oil', quantity: 10 },
      { ingredient_id: 'ipm', quantity: 3 },
    ],
  }], materials);
  assert.deepEqual(sheet.variants[0].fragrances, [{
    name: 'Essential Oil Amber/IPM', unit: 'ml', quantity: 10, ipmQuantity: 3, ipmUnit: 'ml',
  }]);
});

test('sub formulas are printable with their batch yield metadata', () => {
  const materials = [
    { _id: 'wax', name: 'Soy Wax', category: 'Wax', unit: 'g' },
    { _id: 'oil', name: 'Essential Oil Amber', category: 'Essential Oil', unit: 'ml' },
  ];
  const base = { base_ingredients: [{ ingredient_id: 'wax', quantity: 100 }, { ingredient_id: 'oil', quantity: 10 }] };
  const products = [
    { _id: 'sellable', name: 'Amber Candle', productId: 'SP-1', ...base },
    { _id: 'formula', name: 'Amber Premix', productId: 'CTP-1', product_type: 'sub_formula', batch_yield: 10, ...base },
  ];
  assert.deepEqual(getFormulaProducts(products, materials).map(product => product._id), ['sellable', 'formula']);
  const sheets = buildFormulaSheets(products, materials);
  assert.equal(sheets[1].isSubFormula, true);
  assert.equal(sheets[1].batchYield, 10);
});

test('duplicate recipes show the shared name without repeating packaging variants', () => {
  const materials = [
    { _id: 'wax', name: 'Sáp ong', unit: 'g' },
    { _id: 'oil', name: 'Tinh dầu Amber', unit: 'g' },
  ];
  const product = {
    base_ingredients: [{ ingredient_id: 'wax', quantity: 100 }],
    variant_groups: [
      { options: [{ id: 'golden', label: 'Golden Warmth' }, { id: 'forest', label: 'Forest Calm' }] },
      { options: [{ id: 'box', label: 'Hộp' }, { id: 'gift', label: 'Hộp, Túi và Thiệp' }] },
    ],
  };
  const sku = (combination, quantity = 8) => ({ combination, extra_ingredients: [{ ingredient_id: 'oil', quantity }] });
  const labels = skus => buildFormulaSheets([{ ...product, skus }], materials)[0].variants.map(variant => variant.label);
  assert.deepEqual(labels([sku(['golden', 'box']), sku(['gift', 'golden'])]), ['Golden Warmth']);
  assert.deepEqual(labels([sku(['golden', 'box'])]), ['Golden Warmth · Hộp']);
  assert.deepEqual(labels([sku(['golden', 'box']), sku(['golden', 'gift'], 10)]), ['Golden Warmth · Hộp', 'Golden Warmth · Hộp, Túi và Thiệp']);
  assert.deepEqual(labels([sku(['golden', 'box']), sku(['forest', 'box'])]), ['Golden Warmth · Hộp / Forest Calm · Hộp']);
});

test('mixed wax and wick categories retain wax while excluding actual wicks', () => {
  for (const name of ['Sáp đậu nành', 'Sáp ong']) {
    assert.equal(getFormulaMaterialType({ name, category: 'Sáp & Bấc' }), 'wax');
  }
  assert.equal(getFormulaMaterialType({ name: 'Soy wax', category: 'Wax & Wicks' }), 'wax');
  for (const name of ['Bấc cotton', 'Bấc vân', 'Dán bấc', 'Bấc phủ sáp', 'Wax-coated wick']) {
    assert.equal(getFormulaMaterialType({ name, category: 'Sáp & Bấc' }), null);
  }
  assert.equal(getFormulaMaterialType({ name: 'Cotton CD-12', category: 'Bấc nến' }), null);
});

test('a single remaining recipe uses the product name, including packaging-only SKUs', () => {
  const materials = [
    { _id: 'wax', name: 'Sáp ong', unit: 'Kg' },
    { _id: 'oil', name: 'Tinh dầu Jasmine', unit: 'Ml' },
  ];
  const product = {
    name: 'Soft Healing',
    base_ingredients: [{ ingredient_id: 'wax', quantity: 0.05 }, { ingredient_id: 'oil', quantity: 10 }],
    variant_groups: [{ options: [{ id: 'regular', label: 'Thường' }, { id: 'gift', label: 'Set Quà Tặng' }] }],
  };
  for (const skus of [[], [{ combination: ['regular'] }], [{ combination: ['regular'] }, { combination: ['gift'] }]]) {
    const [sheet] = buildFormulaSheets([{ ...product, skus }], materials);
    assert.equal(sheet.variants.length, 1);
    assert.equal(sheet.variants[0].label, 'Soft Healing');
    assert.deepEqual(sheet.variants[0].oils, [{ name: 'Tinh dầu Jasmine', unit: 'Ml', quantity: 10 }]);
  }
});

test('wick exclusion preserves mint oils and excludes colorants', () => {
  for (const name of ['Tinh dầu bạc hà', 'Tinh dau bac ha', 'Tinh dầu phương Bắc']) {
    assert.equal(getFormulaMaterialType({ name, category: 'Tinh dầu' }), 'oil');
  }
  assert.equal(getFormulaMaterialType({ name: 'Màu đỏ', category: 'Tinh dầu & Màu' }), null);
});

test('products remain printable with shared wax/wick categories and populated or ID references', () => {
  const materials = [
    { _id: 'wax', name: 'Sáp đậu nành', category: 'Sáp & Bấc', unit: 'Kg' },
    { _id: 'wick', name: 'Bấc cotton', category: 'Sáp & Bấc', unit: 'Cái' },
    { _id: 'oil', name: 'Tinh dầu Floral', category: 'Tinh dầu', unit: 'Ml' },
  ];
  for (const populated of [false, true]) {
    const entry = (index, quantity) => ({ ingredient_id: populated ? materials[index] : materials[index]._id, quantity });
    const products = [
      { _id: 'base-oil', name: 'Base oil', base_ingredients: [entry(0, 0.11), entry(1, 1), entry(2, 10)] },
      { _id: 'sku-oil', name: 'SKU oil', base_ingredients: [entry(0, 0.105), entry(1, 1)], skus: [{ extra_ingredients: [entry(2, 8), entry(1, 1)] }] },
      { _id: 'wick-only', base_ingredients: [entry(1, 1), entry(2, 10)] },
    ];
    assert.deepEqual(getFormulaProducts(products, materials).map(product => product._id), ['base-oil', 'sku-oil']);
    const sheets = buildFormulaSheets(products, materials);
    assert.equal(sheets.length, 2);
    assert.deepEqual(sheets[0].waxIngredients, [{ name: 'Sáp đậu nành', unit: 'g', quantity: 110 }]);
    assert.deepEqual(sheets[1].variants[0].oils, [{ name: 'Tinh dầu Floral', unit: 'Ml', quantity: 8 }]);
    assert.ok(!JSON.stringify(sheets).includes('Bấc'));
  }
});

test('print quantities convert kilograms to grams without changing source data or liquid units', () => {
  const materials = [
    { _id: 'wax', name: 'Sáp đậu nành', unit: ' Kg ' },
    { _id: 'oil', name: 'Tinh dầu Amber', unit: 'kilogram' },
    { _id: 'liquid', name: 'Tinh dầu Floral', unit: 'Ml' },
  ];
  const product = {
    base_ingredients: [{ ingredient_id: 'wax', quantity: 0.11 }, { ingredient_id: 'wax', quantity: 0.05 }],
    skus: [{ extra_ingredients: [{ ingredient_id: 'oil', quantity: 0.0025 }, { ingredient_id: 'liquid', quantity: 10 }] }],
  };
  const before = JSON.stringify({ materials, product });
  const [sheet] = buildFormulaSheets([product], materials);
  assert.deepEqual(sheet.waxIngredients, [{ name: 'Sáp đậu nành', unit: 'g', quantity: 160 }]);
  assert.deepEqual(sheet.variants[0].oils, [
    { name: 'Tinh dầu Amber', unit: 'g', quantity: 2.5 },
    { name: 'Tinh dầu Floral', unit: 'Ml', quantity: 10 },
  ]);
  assert.equal(JSON.stringify({ materials, product }), before);
});

test('sellable products exclude sub-formula ingredients from resolved_base_ingredients on formula sheets', () => {
  const materials = [
    { _id: 'soy', name: 'Sáp đậu nành', category: 'Sáp & Bấc', unit: 'Kg' },
    { _id: 'bee', name: 'Sáp ong', category: 'Sáp & Bấc', unit: 'Kg' },
    { _id: 'floral', name: 'Tinh dầu Floral', category: 'Tinh dầu', unit: 'Ml' },
    { _id: 'ipm', name: 'IPM', category: 'Phụ gia', unit: 'Ml' },
  ];
  const product = {
    _id: 'love-whisper',
    name: 'Love Whisper',
    productId: 'LW',
    product_type: 'sellable',
    base_ingredients: [
      { ingredient_id: 'soy', quantity: 0.11 },
      { ingredient_id: 'bee', quantity: 0.01 },
      { ingredient_id: 'floral', quantity: 10 },
      { ingredient_id: 'ipm', quantity: 2 },
    ],
    formula_components: [{ formula_id: 'heart-sub', quantity: 1 }],
    resolved_base_ingredients: [
      { ingredient_id: 'soy', quantity: 0.1167 },
      { ingredient_id: 'bee', quantity: 0.0117 },
      { ingredient_id: 'floral', quantity: 10.3333 },
      { ingredient_id: 'ipm', quantity: 2 },
    ],
  };

  const [sheet] = buildFormulaSheets([product], materials);
  assert.deepEqual(sheet.waxIngredients, [
    { name: 'Sáp đậu nành', unit: 'g', quantity: 110 },
    { name: 'Sáp ong', unit: 'g', quantity: 10 },
  ]);
  assert.deepEqual(sheet.variants[0].fragrances, [
    { name: 'Tinh dầu Floral/IPM', unit: 'Ml', quantity: 10, ipmQuantity: 2, ipmUnit: 'Ml' },
  ]);
});

test('A4 layout groups main products onto one page and all sub-formulas together onto one page', () => {
  const materials = [
    { _id: 'soy', name: 'Sáp đậu nành', category: 'Sáp & Bấc', unit: 'g' },
    { _id: 'bee', name: 'Sáp ong', category: 'Sáp & Bấc', unit: 'g' },
    { _id: 'oil', name: 'Tinh dầu Floral', category: 'Tinh dầu', unit: 'Ml' },
  ];
  const base = [
    { ingredient_id: 'soy', quantity: 110 },
    { ingredient_id: 'bee', quantity: 10 },
    { ingredient_id: 'oil', quantity: 10 },
  ];
  const products = [
    { _id: 'sub-1', name: 'Trái tim', productId: 'CTP-1', product_type: 'sub_formula', batch_yield: 6, base_ingredients: base },
    { _id: 'main-1', name: 'Love Whisper', productId: 'LW', product_type: 'sellable', base_ingredients: base },
    { _id: 'sub-2', name: 'Bông Hoa', productId: 'CTP-2', product_type: 'sub_formula', batch_yield: 1, base_ingredients: base },
    { _id: 'main-2', name: 'Soft Healing', productId: 'SH', product_type: 'sellable', base_ingredients: base },
  ];

  const subOnly = createFormulaSummaryPdf({
    products: products.filter(p => p.product_type === 'sub_formula'),
    materials,
    width: 210,
    height: 297,
  });
  assert.equal(subOnly.sheets, 2);
  assert.equal(subOnly.pages, 1);

  const combined = createFormulaSummaryPdf({
    products,
    materials,
    width: 210,
    height: 297,
  });
  assert.equal(combined.sheets, 4);
  assert.equal(combined.pages, 2);
});
