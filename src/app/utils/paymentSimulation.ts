// Simulated payment processing functions
// In a real app, these would integrate with Shopify Payments, Stripe, etc.

export interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolderName: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderDetails {
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    options?: {
      size?: string;
      color?: string;
    };
  }>;
  total: number;
  currency: 'USD' | 'AED';
  shippingAddress: ShippingAddress;
  paymentDetails: PaymentDetails;
}

// Simulate payment validation
export const validatePayment = (paymentDetails: PaymentDetails): { isValid: boolean; error?: string } => {
  // Basic validation
  if (!paymentDetails.cardNumber || paymentDetails.cardNumber.length < 16) {
    return { isValid: false, error: 'Invalid card number' };
  }
  
  if (!paymentDetails.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentDetails.expiryDate)) {
    return { isValid: false, error: 'Invalid expiry date' };
  }
  
  if (!paymentDetails.cvv || paymentDetails.cvv.length < 3) {
    return { isValid: false, error: 'Invalid CVV' };
  }
  
  if (!paymentDetails.cardHolderName.trim()) {
    return { isValid: false, error: 'Card holder name is required' };
  }
  
  return { isValid: true };
};

// Simulate Shopify-style payment processing
export const processPayment = async (orderDetails: OrderDetails): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Validate payment details
  const validation = validatePayment(orderDetails.paymentDetails);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }
  
  // Simulate 5% chance of payment failure for demo purposes
  if (Math.random() < 0.05) {
    return { success: false, error: 'Payment declined. Please try a different card.' };
  }
  
  // Generate mock order ID
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return { success: true, orderId };
};

// Simulate order tracking
export const generateTrackingInfo = (orderId: string) => {
  return {
    orderId,
    trackingNumber: `TRK${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    status: 'Processing',
    carrier: 'Express Delivery Services'
  };
};

// Simulate inventory check
export const checkInventory = (items: Array<{ id: number; quantity: number }>): Promise<{
  available: boolean;
  unavailableItems?: Array<{ id: number; availableQuantity: number }>;
}> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // For demo, assume all items are available
      resolve({ available: true });
    }, 500);
  });
};