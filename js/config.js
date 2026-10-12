/* Quiltopia prototype settings. Everything you'd change before a test lives here. */
window.QUILT_CONFIG = {
  name: 'Quiltopia',
  season: 'Spring Meadow',

  // Prototype speed: fresh patches every hour, so testers see the loop quickly.
  // The real game uses 1440 (once a day). Online, the database setting wins (supabase/seed.sql).
  periodMinutes: 60,

  // Leave both empty to play the demo world that lives on this device.
  // Paste your Supabase project's URL and anon key to make it a live shared world (see README).
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Your live site, used in invite links. Left empty, links point at this page.
  siteUrl: '',

  // The design doc asks for sign-in before building in the Commons. It's off for the prototype
  // so an invited friend's very first action can be filling a Wonder slot.
  commonsRequiresSignIn: false,

  // National features: the nation picker and the Nations Cup. Players can switch them off in Settings.
  nationsEnabled: true,

  // The Quiltopia Club: a monthly membership that's only about looks (see js/rules.js). The price is
  // shown on the Club page; online, "Join" opens this Stripe Payment Link (see README). Leave the link
  // empty and the Club stays closed online. The demo world always shows a pretend checkout.
  clubPrice: '$2.99 a month',
  clubCheckoutUrl: '',

  // PLACEHOLDER nation list for the prototype only. Before any public launch, replace it with the
  // international sports list you choose (an open decision in the design doc).
  nations: [
    ['AR', 'Argentina'], ['AU', 'Australia'], ['AT', 'Austria'], ['BE', 'Belgium'], ['BR', 'Brazil'],
    ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'], ['CZ', 'Czechia'],
    ['DK', 'Denmark'], ['EG', 'Egypt'], ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'],
    ['GR', 'Greece'], ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IT', 'Italy'],
    ['JP', 'Japan'], ['KE', 'Kenya'], ['MY', 'Malaysia'], ['MX', 'Mexico'], ['MA', 'Morocco'],
    ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NG', 'Nigeria'], ['NO', 'Norway'], ['PE', 'Peru'],
    ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SA', 'Saudi Arabia'],
    ['SG', 'Singapore'], ['ZA', 'South Africa'], ['KR', 'South Korea'], ['ES', 'Spain'], ['SE', 'Sweden'],
    ['CH', 'Switzerland'], ['TH', 'Thailand'], ['TR', 'Türkiye'], ['UA', 'Ukraine'], ['GB', 'United Kingdom'],
    ['US', 'United States'], ['VN', 'Vietnam'],
  ],
};
