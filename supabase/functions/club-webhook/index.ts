// Quiltopia Club payments: Stripe calls this when someone joins the Club or pays for another month,
// and it records how long their membership lasts (players.club_until). See README, "The Quiltopia Club".
//
// Deploy:  supabase functions deploy club-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to every function automatically.)
//
// Not yet run against a real Stripe account: test it with Stripe's test mode before going live.

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// The end of the period a subscription is paid up to.
async function paidUntil(subscriptionId: string): Promise<string> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return new Date(sub.current_period_end * 1000).toISOString();
}

Deno.serve(async (req) => {
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      req.headers.get('stripe-signature') ?? '',
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (e) {
    return new Response(`Not from Stripe: ${(e as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      // Someone joined: the game's Join button put their player id in client_reference_id.
      const s = event.data.object as Stripe.Checkout.Session;
      const player = s.client_reference_id, subscription = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
      if (s.mode === 'subscription' && player && subscription) {
        await db.from('club_subscriptions').upsert({ subscription, player });
        const { error } = await db.rpc('club_paid', { p_player: player, p_until: await paidUntil(subscription) });
        if (error) throw error;
      }
    } else if (event.type === 'invoice.paid') {
      // Another month paid: extend the membership of whoever this subscription belongs to.
      const inv = event.data.object as Stripe.Invoice;
      const subscription = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
      if (subscription) {
        const { data } = await db.from('club_subscriptions').select('player').eq('subscription', subscription).maybeSingle();
        if (data) {
          const { error } = await db.rpc('club_paid', { p_player: data.player, p_until: await paidUntil(subscription) });
          if (error) throw error;
        }
      }
    }
    // A cancelled subscription simply isn't extended: the member keeps the Club to the end of what they paid for.
  } catch (e) {
    // A failure here makes Stripe retry later.
    return new Response(`Couldn't record it: ${(e as Error).message}`, { status: 500 });
  }
  return new Response('ok');
});
