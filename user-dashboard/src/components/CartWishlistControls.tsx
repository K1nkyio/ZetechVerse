import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCartWishlistContext } from '@/contexts/cart-wishlist-context';
import { useToast } from '@/hooks/use-toast';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';

interface CartWishlistControlsProps {
  wishlistFirst?: boolean;
}

const NAV_BADGE_CLASS =
  'absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full px-1 flex items-center justify-center text-[10px] font-semibold ring-2 ring-background';

const formatPrice = (price: number | string) => {
  if (typeof price === 'number') return `KES ${price.toLocaleString()}`;
  return String(price);
};

export function CartWishlistControls({ wishlistFirst = false }: CartWishlistControlsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    cartItems,
    wishlistItems,
    cartCount,
    wishlistCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    removeFromWishlist,
    clearWishlist
  } = useCartWishlistContext();

  return (
    <div className="flex items-center gap-1.5">
      <div className={wishlistFirst ? 'order-2' : 'order-1'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <Badge
                  variant="destructive"
                  className={NAV_BADGE_CLASS}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1rem))] sm:w-96">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>Cart</span>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-80">
              {cartItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No items in cart yet
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="border rounded-md p-2 bg-muted/20">
                      <div className="flex items-start gap-2">
                        <button
                          className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0"
                          onClick={() => navigate(`/marketplace/${item.id}`)}
                        >
                          <img
                            src={normalizeImageUrl(item.image_url)}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={applyImageFallback}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            className="text-sm font-medium text-left truncate block w-full hover:underline"
                            onClick={() => navigate(`/marketplace/${item.id}`)}
                          >
                            {item.title}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">{item.location || 'Campus'}</p>
                          <p className="text-xs font-medium text-primary mt-0.5">{formatPrice(item.price)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(item.id)}
                          title="Remove from cart"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Subtotal: KES {(
                            (typeof item.price === 'number'
                              ? item.price
                              : Number(String(item.price).replace(/[^\d.]/g, '')) || 0) * item.quantity
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {cartItems.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-bold text-primary">KES {cartTotal.toLocaleString()}</span>
                </div>
                <div className="px-3 pb-3">
                  <Button asChild size="sm" className="w-full">
                    <Link to="/checkout">
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Checkout
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={wishlistFirst ? 'order-1' : 'order-2'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 && (
                <Badge
                  variant="destructive"
                  className={NAV_BADGE_CLASS}
                >
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1rem))] sm:w-96">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>Wishlist</span>
              {wishlistItems.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearWishlist}>
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-80">
              {wishlistItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No items in wishlist yet
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {wishlistItems.map((item) => (
                    <div key={item.id} className="border rounded-md p-2 bg-muted/20">
                      <div className="flex items-start gap-2">
                        <button
                          className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0"
                          onClick={() => navigate(`/marketplace/${item.id}`)}
                        >
                          <img
                            src={normalizeImageUrl(item.image_url)}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={applyImageFallback}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            className="text-sm font-medium text-left truncate block w-full hover:underline"
                            onClick={() => navigate(`/marketplace/${item.id}`)}
                          >
                            {item.title}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">{item.location || 'Campus'}</p>
                          <p className="text-xs font-medium text-primary mt-0.5">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            addToCart(item);
                            toast({
                              title: 'Added to cart',
                              description: 'Proceeding to checkout/payment.'
                            });
                            navigate('/checkout');
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to cart
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => removeFromWishlist(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {wishlistItems.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                    <Link to="/marketplace">Continue browsing</Link>
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
