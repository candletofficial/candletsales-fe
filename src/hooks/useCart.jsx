import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartService } from '../services/cartService';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await cartService.getCart();
      if (res.success) {
        setCart(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch cart', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (payload) => {
    try {
      const res = await cartService.addToCart(payload);
      if (res.success) setCart(res.data);
      return res;
    } catch (error) {
      throw error;
    }
  };

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      const res = await cartService.updateCartItem({
        product_id: item.product_id._id,
        sku_id: item.sku_id,
        quantity: newQuantity
      });
      if (res.success) setCart(res.data);
      return res;
    } catch (error) {
      console.error('Failed to update quantity', error);
    }
  };

  const removeItem = async (item) => {
    try {
      const res = await cartService.removeFromCart({
        product_id: item.product_id._id,
        sku_id: item.sku_id
      });
      if (res.success) setCart(res.data);
      return res;
    } catch (error) {
      console.error('Failed to remove item', error);
    }
  };

  const removeMultipleItems = async (items) => {
    try {
      const payload = items.map(i => ({
        product_id: i.product_id._id || i.product_id,
        sku_id: i.sku_id
      }));
      const res = await cartService.removeMultipleItems(payload);
      if (res.success) setCart(res.data);
      return res;
    } catch (error) {
      console.error('Failed to remove multiple items', error);
    }
  };

  const clearCart = async () => {
    try {
      const res = await cartService.clearCart();
      if (res.success) setCart(null);
    } catch (error) {
      console.error('Failed to clear cart', error);
    }
  };

  const calculateTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => {
      const product = item.product_id;
      if (!product) return total;
      
      let price = product.base_price || 0;
      if (item.sku_id && product.skus) {
        const sku = product.skus.find(s => s.id === item.sku_id);
        if (sku && sku.price > 0) price = sku.price;
      }
      return total + (price * item.quantity);
    }, 0);
  };
  
  const calculateItemPrice = (item) => {
    const product = item.product_id;
    if (!product) return 0;
    if (item.sku_id && product.skus) {
      const sku = product.skus.find(s => s.id === item.sku_id);
      if (sku && sku.price > 0) return sku.price;
    }
    return product.base_price || 0;
  };

  const cartItemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ 
      cart, 
      loading, 
      cartItemCount,
      fetchCart, 
      addToCart, 
      updateQuantity, 
      removeItem, 
      removeMultipleItems,
      clearCart,
      calculateTotal,
      calculateItemPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
