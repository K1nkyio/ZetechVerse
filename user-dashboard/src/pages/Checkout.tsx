import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartWishlistContext } from '@/contexts/cart-wishlist-context';
import { useToast } from '@/hooks/use-toast';
import { paymentsApi } from '@/api/payments.api';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, cartTotal, updateCartQuantity, removeFromCart, clearCart } = useCartWishlistContext();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [phone, setPhone] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState<string | null>(null);
  const [mpesaStatusMessage, setMpesaStatusMessage] = useState('');

  const serviceFee = cartItems.length > 0 ? Math.round(cartTotal * 0.015) : 0;
  const total = cartTotal + serviceFee;

  const hasValidPaymentDetails =
    paymentMethod === 'mpesa'
      ? phone.trim().length >= 10
      : cardHolder.trim().length > 2 && cardNumber.trim().length >= 12 && expiry.trim().length >= 4 && cvv.trim().length >= 3;

  const handleCompletePayment = async () => {
    if (cartItems.length === 0 || !hasValidPaymentDetails || processing) return;

    setProcessing(true);
    try {
      if (paymentMethod === 'mpesa') {
        setMpesaStatusMessage('Sending payment prompt to your phone...');
        const push = await paymentsApi.initiateMpesaStkPush({
          phone_number: phone.trim(),
          amount: total,
          account_reference: 'ZetechVerse',
          transaction_desc: 'Marketplace checkout'
        });

        setMpesaCheckoutId(push.checkout_request_id);
        setMpesaStatusMessage(push.customer_message || 'Prompt sent. Enter your M-Pesa PIN on your phone.');
        toast({
          title: 'M-Pesa prompt sent',
          description: 'Check your phone and enter your PIN to complete payment.',
        });

        const maxChecks = 20;
        for (let attempt = 0; attempt < maxChecks; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const status = await paymentsApi.getMpesaTransactionStatus(push.checkout_request_id);

          if (status.status === 'success') {
            clearCart();
            setMpesaStatusMessage('Payment confirmed.');
            toast({
              title: 'Payment successful',
              description: `Receipt: ${status.mpesa_receipt_number || 'Received'}`,
            });
            navigate('/marketplace');
            return;
          }

          if (status.status === 'cancelled' || status.status === 'failed' || status.status === 'timeout') {
            const readable = status.result_desc || `Payment ${status.status}`;
            setMpesaStatusMessage(readable);
            toast({
              title: 'Payment not completed',
              description: readable,
              variant: 'destructive',
            });
            return;
          }

          setMpesaStatusMessage('Waiting for payment confirmation from M-Pesa...');
        }

        setMpesaStatusMessage('Still waiting for confirmation. You can retry status check shortly.');
        toast({
          title: 'Still pending',
          description: 'No final payment callback yet. If you entered PIN, wait a little and retry.',
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
      clearCart();
      toast({
        title: 'Payment successful',
        description: 'Your order has been confirmed.',
      });
      navigate('/marketplace');
    } catch {
      toast({
        title: 'Payment failed',
        description: paymentMethod === 'mpesa'
          ? 'Could not start or confirm M-Pesa payment. Please verify number and try again.'
          : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Cashout / Payment</h1>
          <Badge variant="secondary" className="gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Checkout
          </Badge>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty.</p>
            <Button asChild>
              <Link to="/marketplace">Back to marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-border p-4 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Order Items</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={normalizeImageUrl(item.image_url)}
                        alt={item.title}
                        className="h-16 w-16 rounded-md object-cover"
                        onError={applyImageFallback}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.location || 'Campus pickup'}</p>
                        <p className="text-sm font-semibold text-primary">
                          KES {(
                            (typeof item.price === 'number'
                              ? item.price
                              : Number(String(item.price).replace(/[^\d.]/g, '')) || 0) * item.quantity
                          ).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-xl border border-border p-4">
              <h2 className="text-lg font-semibold mb-4">Payment</h2>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  type="button"
                  variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('mpesa')}
                  className="w-full"
                >
                  M-Pesa
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </Button>
              </div>

              {paymentMethod === 'mpesa' ? (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="mpesa-phone">Phone Number</Label>
                  <Input
                    id="mpesa-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    You will receive an STK push prompt on this number.
                  </p>
                  {mpesaStatusMessage && (
                    <p className="text-xs text-primary">{mpesaStatusMessage}</p>
                  )}
                  {mpesaCheckoutId && (
                    <p className="text-[11px] text-muted-foreground break-all">
                      Checkout ID: {mpesaCheckoutId}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="card-holder">Card Holder Name</Label>
                  <Input
                    id="card-holder"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Full Name"
                  />
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="card-expiry">Expiry</Label>
                      <Input
                        id="card-expiry"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-cvv">CVV</Label>
                      <Input
                        id="card-cvv"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>KES {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>KES {serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">KES {total.toLocaleString()}</span>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleCompletePayment}
                disabled={!hasValidPaymentDetails || processing}
              >
                {processing
                  ? paymentMethod === 'mpesa'
                    ? 'Waiting for M-Pesa confirmation...'
                    : 'Processing payment...'
                  : paymentMethod === 'mpesa'
                    ? 'Pay with M-Pesa'
                    : 'Complete Payment'}
              </Button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
