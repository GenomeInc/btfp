/**
 * Hand-curated set of well-known dangers, shown first on an unfiltered
 * browse (see SearchService). Matched by exact Thing.name — update this
 * list by hand as new entries turn out to be common knowledge; there's no
 * usage-based signal (view/search counts) to derive it from yet.
 */
export const COMMON_THING_NAMES = new Set<string>([
  'Chocolate / cocoa',
  'Xylitol (birch sugar)',
  'Grapes / raisins / currants / sultanas',
  'Onions, garlic, leeks, chives, shallots (Allium spp.)',
  'Ibuprofen (Advil, Motrin)',
  'Acetaminophen (Tylenol, paracetamol)',
  'Aspirin',
  'Naproxen (Aleve)',
  'Macadamia nuts',
  'Avocado',
  'Caffeine (coffee, tea, energy drinks, pills)',
  'Nicotine (cigarettes, vape liquid, patches, gum)',
  'Marijuana',
  'Alcohol (ethanol)',
  'Sago Palm',
  'Foxglove',
  'Oleander',
  'Rhododendron',
  'Azalea',
  'Aloe',
  'Poinsettia',
  'Lily of the Valley',
  'Wild mushrooms',
  'Raw yeast dough',
  'Leaving a pet in a parked car',
  'Antidepressants (SSRIs/SNRIs: sertraline, fluoxetine, venlafaxine)',
  'ADHD stimulants (amphetamines: Adderall, Vyvanse; methylphenidate: Ritalin)',
  'Vitamin D3 (cholecalciferol) supplements & some rodenticides',
  'Swimming in or drinking from water with a blue-green algae bloom',
  'Socks',
  'Underwear / elastic waistband clothing',
  'String, yarn, ribbon, dental floss, tinsel (linear foreign bodies)',
]);
