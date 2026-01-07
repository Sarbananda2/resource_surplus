import { getStripeSync, getUncachableStripeClient, isUsingCustomStripe, getCustomWebhookSecret } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    if (isUsingCustomStripe()) {
      await WebhookHandlers.processCustomWebhook(payload, signature);
    } else {
      await WebhookHandlers.processReplitWebhook(payload, signature);
    }
  }

  static async processCustomWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = getCustomWebhookSecret();
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required when using custom Stripe keys');
    }

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    console.log('Processing Stripe event (custom mode):', event.type);
    await WebhookHandlers.handleStripeEvent(event);
  }

  static async processReplitWebhook(payload: Buffer, signature: string): Promise<void> {
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await sync.getWebhookSecret();
      
      if (!webhookSecret) {
        console.log('No webhook secret available, skipping custom event handling');
        return;
      }

      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      await WebhookHandlers.handleStripeEvent(event);
    } catch (err: any) {
      console.error('Error in custom webhook handler:', err.message);
    }
  }

  static async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await WebhookHandlers.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.async_payment_failed':
        await WebhookHandlers.handleCheckoutFailed(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Processing checkout.session.completed:', session.id);
    
    const donation = await storage.getMonetaryDonationByCheckoutSession(session.id);
    if (!donation) {
      console.log('No monetary donation found for session:', session.id);
      return;
    }

    if (donation.status !== 'pending') {
      console.log('Donation already processed:', donation.id, donation.status);
      return;
    }

    if (session.payment_status === 'paid') {
      await storage.updateMonetaryDonation(donation.id, {
        status: 'completed',
        stripePaymentIntentId: session.payment_intent as string || undefined,
        completedAt: new Date(),
      });
      console.log('Donation marked as completed:', donation.id);
    } else if (session.payment_status === 'unpaid') {
      console.log('Payment status is unpaid, waiting for payment:', donation.id);
    }
  }

  static async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Processing checkout.session.expired:', session.id);
    
    const donation = await storage.getMonetaryDonationByCheckoutSession(session.id);
    if (!donation) {
      console.log('No monetary donation found for expired session:', session.id);
      return;
    }

    if (donation.status !== 'pending') {
      console.log('Donation already processed:', donation.id, donation.status);
      return;
    }

    await storage.updateMonetaryDonation(donation.id, {
      status: 'expired',
    });
    console.log('Donation marked as expired:', donation.id);
  }

  static async handleCheckoutFailed(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Processing checkout.session.async_payment_failed:', session.id);
    
    const donation = await storage.getMonetaryDonationByCheckoutSession(session.id);
    if (!donation) {
      console.log('No monetary donation found for failed session:', session.id);
      return;
    }

    if (donation.status === 'completed') {
      console.log('Donation already completed, not marking as failed:', donation.id);
      return;
    }

    await storage.updateMonetaryDonation(donation.id, {
      status: 'failed',
    });
    console.log('Donation marked as failed:', donation.id);
  }
}
