/**
 * Unit Tests: Stock Calculator
 */

import {
  calculateStockFromVariants,
  hasVariants,
} from '@/lib/utils/stock-calculator';

describe('calculateStockFromVariants', () => {
  it('should sum variant stocks when variants exist', () => {
    const product = {
      stock_quantity: 100,
      product_variants: [
        { stock_quantity: 10 },
        { stock_quantity: 20 },
        { stock_quantity: 30 },
      ],
    };
    
    expect(calculateStockFromVariants(product)).toBe(60);
  });

  it('should return product stock when no variants', () => {
    const product = {
      stock_quantity: 100,
    };
    
    expect(calculateStockFromVariants(product)).toBe(100);
  });

  it('should handle null stock quantities', () => {
    const product = {
      stock_quantity: null,
      product_variants: [
        { stock_quantity: 10 },
        { stock_quantity: null },
        { stock_quantity: 20 },
      ],
    };
    
    expect(calculateStockFromVariants(product)).toBe(30);
  });

  it('should return 0 when product stock is null and no variants', () => {
    const product = {
      stock_quantity: null,
    };
    
    expect(calculateStockFromVariants(product)).toBe(0);
  });

  it('should handle empty variants array', () => {
    const product = {
      stock_quantity: 50,
      product_variants: [],
    };
    
    expect(calculateStockFromVariants(product)).toBe(50);
  });
});

describe('hasVariants', () => {
  it('should return true when variants exist', () => {
    const product = {
      stock_quantity: 100,
      product_variants: [
        { stock_quantity: 10 },
      ],
    };
    
    expect(hasVariants(product)).toBe(true);
  });

  it('should return false when no variants', () => {
    const product = {
      stock_quantity: 100,
    };
    
    expect(hasVariants(product)).toBe(false);
  });

  it('should return false when variants array is empty', () => {
    const product = {
      stock_quantity: 100,
      product_variants: [],
    };
    
    expect(hasVariants(product)).toBe(false);
  });
});

