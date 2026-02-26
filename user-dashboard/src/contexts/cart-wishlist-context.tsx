import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthContext } from '@/contexts/auth-context';

export interface MarketplaceSavedItem {
  id: number;
  title: string;
  price: number | string;
  image_url?: string;
  location?: string;
}

export interface CartItem extends MarketplaceSavedItem {
  quantity: number;
}

interface CartWishlistContextType {
  cartItems: CartItem[];
  wishlistItems: MarketplaceSavedItem[];
  cartCount: number;
  wishlistCount: number;
  cartTotal: number;
  addToCart: (item: MarketplaceSavedItem) => void;
  removeFromCart: (itemId: number) => void;
  updateCartQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (item: MarketplaceSavedItem) => boolean;
  addToWishlist: (item: MarketplaceSavedItem) => void;
  removeFromWishlist: (itemId: number) => void;
  clearWishlist: () => void;
  isInCart: (itemId: number) => boolean;
  isInWishlist: (itemId: number) => boolean;
}

const LEGACY_CART_KEY = 'zv_user_cart_items';
const LEGACY_WISHLIST_KEY = 'zv_user_wishlist_items';
const CART_KEY_PREFIX = 'zv_user_cart_items';
const WISHLIST_KEY_PREFIX = 'zv_user_wishlist_items';

const CartWishlistContext = createContext<CartWishlistContextType | undefined>(undefined);

const readStoredArray = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toNumberPrice = (price: number | string) => {
  if (typeof price === 'number') return Number.isFinite(price) ? price : 0;
  const numeric = Number(String(price).replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const resolveStorageScope = (user: { id?: string | number; email?: string } | null) => {
  if (user?.id !== undefined && user?.id !== null) return `user:${user.id}`;
  if (user?.email) return `email:${user.email.toLowerCase()}`;
  return 'guest';
};

const buildScopedKey = (prefix: string, scope: string) => `${prefix}:${scope}`;

export function CartWishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const scope = useMemo(() => resolveStorageScope(user), [user?.id, user?.email]);
  const cartStorageKey = useMemo(() => buildScopedKey(CART_KEY_PREFIX, scope), [scope]);
  const wishlistStorageKey = useMemo(() => buildScopedKey(WISHLIST_KEY_PREFIX, scope), [scope]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<MarketplaceSavedItem[]>([]);
  const [activeKeys, setActiveKeys] = useState({ cart: '', wishlist: '' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // One-time cleanup of legacy shared keys so user data does not bleed across accounts.
    window.localStorage.removeItem(LEGACY_CART_KEY);
    window.localStorage.removeItem(LEGACY_WISHLIST_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextCartItems = readStoredArray<CartItem>(cartStorageKey);
    const nextWishlistItems = readStoredArray<MarketplaceSavedItem>(wishlistStorageKey);
    setCartItems(nextCartItems);
    setWishlistItems(nextWishlistItems);
    setActiveKeys({ cart: cartStorageKey, wishlist: wishlistStorageKey });
  }, [cartStorageKey, wishlistStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeKeys.cart !== cartStorageKey) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [activeKeys.cart, cartItems, cartStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeKeys.wishlist !== wishlistStorageKey) return;
    window.localStorage.setItem(wishlistStorageKey, JSON.stringify(wishlistItems));
  }, [activeKeys.wishlist, wishlistItems, wishlistStorageKey]);

  const addToCart = (item: MarketplaceSavedItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((p) => Number(p.id) === Number(item.id));
      if (idx >= 0) {
        return prev.map((p, i) => (i === idx ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCartItems((prev) => prev.filter((item) => Number(item.id) !== Number(itemId)));
  };

  const updateCartQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(itemId) ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const addToWishlist = (item: MarketplaceSavedItem) => {
    setWishlistItems((prev) => {
      if (prev.some((p) => Number(p.id) === Number(item.id))) return prev;
      return [...prev, item];
    });
  };

  const removeFromWishlist = (itemId: number) => {
    setWishlistItems((prev) => prev.filter((item) => Number(item.id) !== Number(itemId)));
  };

  const clearWishlist = () => setWishlistItems([]);

  const isInCart = (itemId: number) =>
    cartItems.some((item) => Number(item.id) === Number(itemId));

  const isInWishlist = (itemId: number) =>
    wishlistItems.some((item) => Number(item.id) === Number(itemId));

  const toggleWishlist = (item: MarketplaceSavedItem) => {
    const exists = wishlistItems.some((p) => Number(p.id) === Number(item.id));
    if (exists) {
      removeFromWishlist(item.id);
      return false;
    }
    addToWishlist(item);
    return true;
  };

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems]
  );

  const wishlistCount = useMemo(() => wishlistItems.length, [wishlistItems]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + toNumberPrice(item.price) * item.quantity, 0),
    [cartItems]
  );

  const value = useMemo<CartWishlistContextType>(
    () => ({
      cartItems,
      wishlistItems,
      cartCount,
      wishlistCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      isInCart,
      isInWishlist
    }),
    [cartItems, wishlistItems, cartCount, wishlistCount, cartTotal]
  );

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlistContext() {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error('useCartWishlistContext must be used within CartWishlistProvider');
  }
  return context;
}
