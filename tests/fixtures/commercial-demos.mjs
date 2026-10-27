/** Fictitious public fixtures. Only the local showcase runner imports this module. */
const slug = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uuid = (brand, kind, index) => `${String(brand).padStart(8, '0')}-${String(kind).padStart(4, '0')}-4000-8000-${String(index).padStart(12, '0')}`;
const definitions = [
  {
    id: 'iris', name: 'Bijuterii Iris', theme: 'plum', accent: '#785477', background: '#f5eef3',
    tagline: 'Forme delicate. Stil personal.', hero: 'Detalii mici,\nprezență aparte.',
    description: 'Bijuterii handmade cu linii curate și accente botanice. Descoperă piese ușor de purtat, de oferit și de păstrat aproape.',
    highlights: ['Forme botanice și finisaje discrete', 'Variante de culoare pentru fiecare stil', 'Colecție fictivă · prețuri demonstrative'],
    categories: ['Coliere', 'Cercei', 'Brățări'], collection: 'Botanica de zi cu zi',
    variantLabels: ['Auriu satinat', 'Argintiu mat'], variantAttribute: 'Finisaj', variantExtra: 12,
    products: [
      ['Colier Petală', 129, 0, 'O petală stilizată pe un lanț fin, pentru ținute simple și momente speciale. Lungime demonstrativă 42 cm, cu extensie de 5 cm.'],
      ['Cercei Lunaria', 89, 1, 'Două forme ovale inspirate de frunzele uscate de lunaria. Siluetă ușoară, cu un finisaj satinat și o lungime de aproximativ 3 cm.'],
      ['Brățară Fir de lumină', 69, 2, 'Un șnur delicat și un detaliu metalic discret. Model reglabil, potrivit pentru o combinație de mai multe brățări.'],
      ['Colier Cerc senin', 119, 0, 'Un cerc simplu, cu proporții echilibrate, pe lanț subțire. O piesă versatilă pentru ținute de zi.'],
      ['Cercei Iris', 99, 1, 'Petale geometrice în tonuri de mov prună. Un accent de culoare cu textură mată, conceput pentru colecția demonstrativă.'],
      ['Brățară Nod fin', 79, 2, 'Un nod sculptural într-o compoziție minimalistă. Sistem reglabil și finisaj atent descris în opțiunile produsului.'],
      ['Colier Rouă', 139, 0, 'Pandantiv cu formă de picătură și reflexii calde. Lungime demonstrativă 45 cm; se oferă într-un săculeț textil.'],
      ['Cercei Arc', 109, 1, 'Arce mici cu profil rotunjit, ușor de asociat cu un colier fin. Modelul este disponibil în două finisaje.'],
      ['Brățară Petale', 95, 2, 'Trei detalii botanice pe o brățară fină. O idee de cadou pentru aniversări, ilustrată prin date fictive.'],
      ['Colier Solitar', 159, 0, 'O formă organică centrală, realizată pentru o ținută cu puține accesorii. Dimensiunile sunt orientative în acest demo.'],
    ],
  },
  {
    id: 'soare', name: 'Lumânări Soare', theme: 'terracotta', accent: '#a56442', background: '#f7efe2',
    tagline: 'Ritualuri calde pentru acasă.', hero: 'Un colț de liniște,\nîn fiecare seară.',
    description: 'Lumânări în recipiente simple și decorațiuni în tonuri naturale. Alege aroma, pregătește o carte și fă loc unui moment doar al tău.',
    highlights: ['Arome inspirate de natură', 'Două dimensiuni, același ritual', 'Colecție fictivă · fără vânzare reală'],
    categories: ['Lumânări parfumate', 'Lumânări decorative', 'Accesorii'], collection: 'Seri de toamnă',
    variantLabels: ['Recipient 120 g', 'Recipient 220 g'], variantAttribute: 'Cantitate', variantExtra: 28,
    products: [
      ['Lumânare Amurg', 59, 0, 'Note demonstrative de portocală și lemn de cedru, într-un recipient ambră. Lasă lumânarea pe o suprafață stabilă, departe de materiale inflamabile.'],
      ['Lumânare Lavandă', 55, 0, 'Un acord floral discret pentru o seară liniștită. Recipient cu capac, în două dimensiuni. Nu lăsa lumânarea aprinsă nesupravegheată.'],
      ['Lumânare Floare de bumbac', 57, 0, 'O aromă curată și delicată într-un recipient simplu. Descrierea și gramajul sunt exemple fictive pentru configurarea catalogului.'],
      ['Lumânare Coloana', 39, 1, 'Formă canelată, în nuanță de fildeș, pentru un raft sau o masă festivă. Folosește un suport termorezistent când este aprinsă.'],
      ['Lumânare Sferă', 35, 1, 'O formă rotundă cu relief fin, potrivită unei compoziții naturale. Produs decorativ fictiv, ilustrat prin grafică originală.'],
      ['Lumânare Vanilie și tonka', 62, 0, 'Un parfum cald, cu note dulci și lemnoase. Alege dimensiunea recipientului pentru exemplul de variantă din configurator.'],
      ['Tăviță Nisip', 45, 2, 'O tăviță ovală cu textură minerală, pentru aranjarea obiectelor decorative. Exemplu de accesoriu, fără certificări de rezistență termică presupuse.'],
      ['Lumânare Pădure', 65, 0, 'Note verzi de brad și lemn, într-o prezentare caldă și simplă. Păstrează lumânările aprinse departe de copii și animale.'],
      ['Suport Arc', 49, 2, 'Un obiect decorativ cu formă de arc, în ton de teracotă. Dimensiuni orientative 12 × 8 cm; nu este prezentat ca suport termic certificat.'],
      ['Lumânare Dimineață', 58, 0, 'Un acord de citrice și ceai pentru spațiile de zi. Arome, gramaje și prețuri demonstrative, fără promisiuni terapeutice.'],
    ],
  },
  {
    id: 'poveste', name: 'Cadouri cu Poveste', theme: 'evergreen', accent: '#416a59', background: '#edf2eb',
    tagline: 'Un nume. Un mesaj. O amintire.', hero: 'Cadouri care spun\nce ai pe suflet.',
    description: 'Obiecte personalizate pentru aniversări, mulțumiri și începuturi noi. Alege un model și adaugă un mesaj care face darul al tău.',
    highlights: ['Mesaje și nume în configurator', 'Ocazii speciale, prezentate simplu', 'Concept fictiv · fără comenzi reale'],
    categories: ['Pentru aniversări', 'Pentru familie', 'Mici mulțumiri'], collection: 'Momente de păstrat',
    variantLabels: ['Format compact', 'Format generos'], variantAttribute: 'Format', variantExtra: 20,
    products: [
      ['Cutie Amintiri', 99, 1, 'O cutie pentru bilețele, fotografii și obiecte mici cu însemnătate. Personalizează capacul cu un nume și alege ocazia în configurator.'],
      ['Ramă Împreună', 89, 1, 'O ramă decorativă pentru un loc drag din casă. Mesajul scurt și numele sunt exemple de personalizare text, fără upload privat de imagini.'],
      ['Semn de carte Poveste', 29, 2, 'Un semn de carte cu nume, pentru cititori pasionați. Un dar simplu de mulțumire, cu text de până la 24 de caractere.'],
      ['Plachetă La mulți ani', 79, 0, 'O plachetă decorativă pentru aniversări, cu un mesaj ales de tine. Dimensiunile și timpul de realizare sunt orientative în demo.'],
      ['Breloc Aproape', 35, 2, 'Un breloc cu nume sau inițiale, pentru un gest mic și personal. Alege formatul și verifică prețul orientativ înainte de adăugarea în coș.'],
      ['Album Prima noastră vară', 119, 1, 'Un album cu copertă personalizată pentru amintiri în familie. Exemplul demonstrează textul de pe copertă, nu încărcarea fotografiilor.'],
      ['Cutie Mulțumesc', 69, 2, 'O cutie decorativă pentru un mesaj de apreciere. Conținutul interior nu este inclus; produsul ilustrează personalizări și ambalaj opțional.'],
      ['Ornament Un nou început', 45, 0, 'Un ornament cu nume pentru casă nouă sau o aniversare. Alege ocazia și un mesaj scurt pentru exemplul de comandă personalizată.'],
      ['Ramă Bunici', 95, 1, 'O ramă decorativă cu un mesaj pentru bunici. Date fictive și ilustrație originală, fără fotografii sau informații despre persoane reale.'],
      ['Plachetă O zi a ta', 85, 0, 'O plachetă cu mesaj pentru cineva care merită sărbătorit. Personalizarea text și ambalajul sunt configurabile în exemplul local.'],
    ],
  },
];

export function createDemoProfile(id) {
  const index = definitions.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Unknown local showcase profile');
  const d = definitions[index];
  const brand = index + 1;
  const categories = d.categories.map((name, i) => ({ id: uuid(brand, 1, i + 1), name, slug: slug(name), description: `Selecție demonstrativă: ${name.toLocaleLowerCase('ro-RO')}.` }));
  const collections = [{ id: uuid(brand, 2, 1), name: d.collection, slug: slug(d.collection), description: 'O colecție fictivă, pregătită pentru prezentarea template-ului.' }];
  const products = d.products.map(([name, price, category, description], i) => {
    const productId = uuid(brand, 3, i + 1);
    const customizable = id === 'poveste';
    const variants = (id !== 'soare' || category === 0) ? d.variantLabels.map((title, v) => ({ id: uuid(brand, 4, (i + 1) * 10 + v), title, attributes: { [d.variantAttribute]: title }, price_override: price + v * d.variantExtra, is_active: true, display_order: v })) : [];
    const customizations = customizable ? [
      { id: uuid(brand, 5, (i + 1) * 10), name: 'Nume sau mesaj', description: 'Exemplu fictiv de text pentru personalizare.', option_type: 'text', is_required: true, additional_cost: 10, configuration: { min_length: 2, max_length: 24, multiline: false }, display_order: 0, is_active: true },
      { id: uuid(brand, 5, (i + 1) * 10 + 1), name: 'Ocazia', description: 'Alege motivul darului.', option_type: 'selection', is_required: true, additional_cost: 0, configuration: { values: ['Aniversare', 'Mulțumire', 'Casă nouă'] }, display_order: 1, is_active: true },
      { id: uuid(brand, 5, (i + 1) * 10 + 2), name: 'Ambalaj cadou', description: 'Panglică și cartonaș, în prezentarea demonstrativă.', option_type: 'boolean', is_required: false, additional_cost: 8, configuration: {}, display_order: 2, is_active: true },
    ] : [];
    return { id: productId, name, slug: slug(name), description, base_price: price, product_type: customizable ? 'made_to_order' : 'standard', availability_status: customizable ? 'made_to_order' : 'in_stock', publication_status: 'published', is_customizable: customizable, lead_time_days: customizable ? 5 : 2, created_at: `2026-10-${String(27 - i).padStart(2, '0')}T09:00:00Z`, product_images: [{ storage_path: `${id}/${slug(name)}.svg`, display_order: 0, alt_text: `Ilustrație originală demonstrativă — ${name}` }], product_variants: variants, customization_options: customizations, product_categories: [{ category_id: categories[category].id }], product_collections: [{ collection_id: collections[0].id }] };
  });
  const settings = { display_name: d.name, tagline: d.tagline, short_description: d.description, seo_description: `${d.name}: concept comercial fictiv, fără vânzare reală.`, footer_description: 'DEMO FICTIV · Prețuri și produse demonstrative. Ilustrații originale, nu fotografii de produs. Fără comenzi, plăți sau expediere reale.', public_email: null, public_phone: null, whatsapp: null, instagram_url: null, facebook_url: null, tiktok_url: null };
  const homepage = [
    ['hero', 'Concept demonstrativ · România', d.hero.replace('\n', ' '), d.description, 'Descoperă colecția', '/shop', 0],
    ['products', 'Selecția atelierului', id === 'iris' ? 'Piese care te însoțesc' : id === 'soare' ? 'Alege atmosfera de acasă' : 'Începe cu un gând frumos', 'Produse fictive · prețuri demonstrative în lei', 'Vezi toate produsele', '/shop', 10],
    ['categories', 'Găsește inspirația', 'Alege ce ți se potrivește', null, 'Toate categoriile', '/categories', 20],
    ['collections', 'O selecție cu personalitate', d.collection, null, 'Vezi colecțiile', '/collections', 30],
    ['promo', 'Doar în prezentarea locală', 'Un singur template. Identitatea ta.', 'Această prezentare demonstrează catalogul și designul. Checkout-ul și plățile nu sunt validate aici.', 'Explorează magazinul', '/shop', 40],
  ].map(([slot, eyebrow, title, subtitle, cta_label, cta_href, display_order]) => ({ slot, eyebrow, title, subtitle, cta_label, cta_href, display_order, is_active: true }));
  const inventory = products.flatMap((p, i) => (p.product_variants.length ? p.product_variants.map((v, j) => ({ id: uuid(brand, 6, (i + 1) * 10 + j), product_id: null, variant_id: v.id, quantity: 8 + i + j, low_stock_threshold: 3 })) : [{ id: uuid(brand, 6, (i + 1) * 10), product_id: p.id, variant_id: null, quantity: 8 + i, low_stock_threshold: 3 }]));
  return { version: 1, id, fictitious: true, checkoutValidated: false, theme: d.theme, art: { accent: d.accent, background: d.background }, store: { name: d.name, tagline: d.tagline, description: d.description, seoDescription: settings.seo_description, footerDescription: settings.footer_description, theme: d.theme, assets: { logo: `/branding/${id}-logo.svg`, icon: `/branding/${id}-icon.svg`, ogImage: null }, copy: { heroTitle: d.hero.replace('\n', ' '), highlightsTitle: 'În atelierul nostru demonstrativ', highlights: d.highlights, shopDescription: `${d.description} Catalog fictiv, fără vânzare reală.` } }, settings, homepage, categories, collections, products, inventory, reviews: [], orders: [], payments: [] };
}

export const DEMO_IDS = Object.freeze(definitions.map((d) => d.id));

/** Original vector illustrations, no downloaded artwork, fonts or external references. */
export function productIllustration(profile, product, index) {
  const color = profile.art.accent;
  const kind = profile.id;
  const motif = kind === 'iris'
    ? (index % 3 === 1 ? `<g fill="none" stroke="${color}" stroke-width="9"><path d="M246 196c-25-70 76-90 65-10l-12 108c-9 76-93 54-72-9z"/><path d="M453 196c25-70-76-90-65-10l12 108c9 76 93 54 72-9z"/></g>` : `<ellipse cx="350" cy="229" rx="126" ry="132" fill="none" stroke="#c3a16a" stroke-width="6"/><path d="M350 332c-78-70-54-124 0-144 54 20 78 74 0 144Z" fill="${color}"/><path d="M350 312v-94" stroke="#e9d9b6" stroke-width="2"/>`)
    : kind === 'soare'
      ? `<ellipse cx="350" cy="374" rx="111" ry="19" fill="${color}" opacity=".12"/><rect x="250" y="178" width="200" height="196" rx="22" fill="${index % 2 ? '#ddd2bb' : '#986545'}"/><ellipse cx="350" cy="181" rx="100" ry="22" fill="#f4e5c8"/><path d="M350 168v-35" stroke="#594535" stroke-width="4"/><path d="M350 142c-34-34-8-50 0-74 7 28 33 42 0 74" fill="#d9a35b"/><rect x="275" y="236" width="150" height="85" rx="3" fill="#fcf8f0"/><text x="350" y="270" text-anchor="middle" font-family="serif" font-size="21" fill="${color}">SOARE</text><path d="M312 288h76" stroke="${color}"/>`
      : `<ellipse cx="350" cy="378" rx="145" ry="18" fill="${color}" opacity=".1"/><rect x="210" y="190" width="280" height="181" rx="12" fill="#d4b88e"/><rect x="200" y="173" width="300" height="40" rx="7" fill="#e2c9a3"/><path d="M350 174v198" stroke="${color}" stroke-width="30"/><path d="M347 174c-100-5-115-86-51-66 41 12 51 66 51 66Zm6 0c100-5 115-86 51-66-41 12-51 66-51 66Z" fill="none" stroke="${color}" stroke-width="12"/><rect x="391" y="238" width="72" height="53" rx="5" fill="#fcfaf3" transform="rotate(10 391 238)"/><path d="m411 257 11 10 14-14" fill="none" stroke="${color}" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="520" viewBox="0 0 700 520" role="img" aria-label="Ilustrație demonstrativă"><rect width="700" height="520" fill="${profile.art.background}"/><circle cx="580" cy="85" r="130" fill="#fff" opacity=".5"/><path d="M0 424Q260 350 700 450V520H0" fill="#fff" opacity=".45"/>${motif}<text x="350" y="464" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="3" fill="${color}">ILUSTRAȚIE · CONCEPT FICTIV ${index + 1}</text></svg>`;
}

export function brandIllustration(profile, icon = false) {
  const color = profile.art.accent;
  const mark = profile.id === 'iris' ? '<path d="M25 6 41 24 25 42 9 24Z"/>' : profile.id === 'soare' ? '<circle cx="25" cy="24" r="12"/><path d="M25 2v6m0 32v6M3 24h6m32 0h6M9 8l5 5m22 22 5 5M9 40l5-5M36 13l5-5" fill="none" stroke-width="2"/>' : '<path d="M8 19h34v24H8zM5 13h40v8H5zM25 13v30" fill="none" stroke-width="3"/><path d="M25 13C7 14 10-1 19 5l6 8c18 1 15-14 6-8Z" fill="none" stroke-width="2"/>';
  const word = profile.id === 'iris' ? 'Iris' : profile.id === 'soare' ? 'Soare' : 'cu Poveste';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${icon ? 50 : 192}" height="48" viewBox="0 0 ${icon ? 50 : 192} 48"><g fill="${color}" stroke="${color}">${mark}</g>${icon ? '' : `<text x="53" y="32" font-family="serif" font-size="${profile.id === 'poveste' ? 24 : 31}" fill="${color}">${word}</text>`}</svg>`;
}
