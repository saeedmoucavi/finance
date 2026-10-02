// Minimal line icons on a 24-unit grid (same set as the Android app).
const P = {
  home: 'M3 10.6 12 3.5l9 7.1 M5.5 9.7V20h13V9.7',
  receipt: 'M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z M9.2 8.4h5.6 M9.2 12h5.6',
  plus: 'M12 5.5v13 M5.5 12h13',
  minus: 'M5.5 12h13',
  bank: 'M3.4 9.6 12 4.6l8.6 5 M5.6 10.4v7.2 M12 10.4v7.2 M18.4 10.4v7.2 M3.4 19.4h17.2',
  more: 'M4.2 12a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0 M10.7 12a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0 M17.2 12a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0',
  bell: 'M7 10.4v5.8L5.4 18h13.2L17 16.2v-5.8a5 5 0 0 0-10 0Z M10.4 20.2h3.2',
  arrow_out: 'M17 7 7 17 M8 7h9v9',
  search: 'M4.8 11a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0 -12.4 0 M15.6 15.6l4 4',
  filter: 'M4.5 7h15 M7.5 12h9 M10.5 17h3',
  chev_right: 'M9 6l6 6-6 6',
  chev_left: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12 M18 6 6 18',
  up: 'M12 19V5.6 M6.6 11l5.4-5.4 5.4 5.4',
  down: 'M12 5.6V19 M6.6 13.6l5.4 5.4 5.4-5.4',
  cart: 'M5 9h14l-1.3 10.5H6.3Z M9 9V7a3 3 0 0 1 6 0v2',
  bowl: 'M4 11h16 M6 11v1a6 6 0 0 0 12 0v-1 M9 7.5c0-1 .6-2 1.5-2.5 M13 7.5c0-1 .6-2 1.5-2.5',
  car: 'M5 16V9.5L7 5h10l2 4.5V16 M3.5 16h17v3h-17Z M5 9.5h14',
  house: 'M4 11 12 4.5l8 6.5 M6 9.5V19.5h12V9.5 M10 19.5v-5h4v5',
  bolt: 'M13 3.5 6 13.5h5.5L10.5 20.5l7.5-10.5h-5.5Z',
  health: 'M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
  shirt: 'M8.5 4.5 4 7.5l2 3.5 2-1V19.5h8V10l2 1 2-3.5-4.5-3a3.5 3.5 0 0 1-7 0Z',
  book: 'M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2Z M5 19.5a2 2 0 0 0 2 2h12v-4',
  fun: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M8.8 14.2a4.2 4.2 0 0 0 6.4 0 M9.5 9.5v1 M14.5 9.5v1',
  family: 'M5 19.5v-1.5a4 4 0 0 1 8 0v1.5 M6 8.5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 11.5a2.5 2.5 0 1 0 0-5 M16 14.5a3.5 3.5 0 0 1 3.5 3.5v1.5',
  phone: 'M7.5 3.5h9v17h-9Z M11 17.5h2',
  wrench: 'M14.5 5a4 4 0 0 0-4.9 5.2L4 15.8 6.2 18l5.6-5.6A4 4 0 0 0 17 7.5l-2.5 2.5-2-2Z',
  other: 'M5 5h5.5v5.5H5Z M13.5 5H19v5.5h-5.5Z M5 13.5h5.5V19H5Z M13.5 13.5H19V19h-5.5Z',
  wallet: 'M3.5 6.5h17v11h-17Z M9.6 12a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0',
  briefcase: 'M4 8.5h16v10.5H4Z M8.5 8.5V6h7v2.5 M4 13h16',
  gift: 'M4.5 10h15v3h-15Z M6 13v6.5h12V13 M12 10v9.5 M12 10c-1.5-3-5-3.5-5-1.5S10 10 12 10Z M12 10c1.5-3 5-3.5 5-1.5S14 10 12 10Z',
  coins: 'M5 8a7 2.5 0 1 0 14 0a7 2.5 0 1 0 -14 0 M5 8v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V8 M5 12v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4',
  safe: 'M5 5.5h14v13H5Z M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M7 18.5v1.5 M17 18.5v1.5',
  chart: 'M5 19V11 M10 19V6 M15 19v-5 M20 19V9',
  list: 'M4 7h16 M4 12h16 M4 17h10',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z',
  globe: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M4 12h16 M12 4c2.5 2.6 2.5 13.4 0 16 M12 4c-2.5 2.6-2.5 13.4 0 16',
  lock: 'M6 10.5h12v9H6Z M9 10.5V8a3 3 0 0 1 6 0v2.5',
  download: 'M12 4v11 M7.5 10.5l4.5 4.5 4.5-4.5 M5 19.5h14',
  upload: 'M12 15V4 M7.5 8.5 12 4l4.5 4.5 M5 19.5h14',
  share: 'M12 14V4 M8 7.5 12 3.5l4 4 M6 11v8.5h12V11',
  trash: 'M5 7h14 M9.5 7V5h5v2 M7 7l1 12.5h8L17 7',
  edit: 'M5 19h3.5L18 9.5 14.5 6 5 15.5Z M13 7.5l3.5 3.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  swap: 'M7 7h11l-3-3 M17 17H6l3 3',
  calendar: 'M4.5 6h15v14h-15Z M4.5 10h15 M8.5 4v4 M15.5 4v4',
  backspace: 'M9 6h10.5v12H9l-5-6Z M12 9.5l5 5 M17 9.5l-5 5',
  file: 'M6.5 3.5h7l4 4v13h-11Z M13.5 3.5v4h4 M9 12.5h6 M9 16h6',
  print: 'M7 9V4h10v5 M5 9h14v7h-3 M8 16H5V9 M8 13h8v7H8Z',
  coin: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0',
  goldbar: 'M4.5 17.5 7.5 9.5h9l3 8Z M9.5 9.5 10.5 6.5h3l1 3',
  banknote: 'M3 7h18v10H3Z M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M6 10v4 M18 10v4',
  crypto: 'M12 3.5 19.5 8v8L12 20.5 4.5 16V8Z M9.5 9h4a1.5 1.5 0 0 1 0 3h-4 M9.5 12h4.5a1.5 1.5 0 0 1 0 3H9.5 M9.5 9v6',
  refresh: 'M19 12a7 7 0 1 1-2.05-4.95 M19 4.5V8h-3.5',
};

export function ic(name, size = 20, stroke = 1.8, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" stroke-width="${stroke}"><path d="${P[name] || P.other}"/></svg>`;
}

/** A line icon for a category, guessed from its (Persian) name; name_en can be stale after a rename. */
export function forCategory(nameFa = '', nameEn = '', kind = 'expense') {
  const rules = [
    [['رستوران', 'غذا', 'کافه'], 'bowl'], [['خوراک', 'خواربار', 'سوپر'], 'cart'], [['حمل', 'تاکسی', 'بنزین', 'خودرو'], 'car'],
    [['اجاره', 'مسکن', 'خانه'], 'house'], [['قبوض', 'شارژ', 'قبض'], 'bolt'], [['درمان', 'سلامت', 'دارو', 'پزشک'], 'health'],
    [['پوشاک', 'لباس'], 'shirt'], [['آموزش', 'کتاب', 'کلاس'], 'book'], [['تفریح', 'سرگرمی', 'سفر'], 'fun'],
    [['خانواده', 'فرزند'], 'family'], [['موبایل', 'اینترنت', 'تلفن'], 'phone'], [['تعمیر'], 'wrench'],
    [['حقوق'], 'wallet'], [['آزاد', 'پروژه'], 'briefcase'], [['پاداش', 'هدیه'], 'gift'],
  ];
  for (const [keys, icon] of rules) if (keys.some((k) => nameFa.includes(k))) return icon;
  const en = [
    [['restaurant', 'dining', 'cafe'], 'bowl'], [['food', 'grocer'], 'cart'], [['transport', 'taxi', 'fuel', 'car'], 'car'],
    [['rent', 'housing'], 'house'], [['bill', 'utilit'], 'bolt'], [['health', 'medic'], 'health'], [['cloth'], 'shirt'],
    [['educat'], 'book'], [['entertain', 'travel'], 'fun'], [['family'], 'family'], [['phone', 'internet'], 'phone'],
    [['repair'], 'wrench'], [['salary'], 'wallet'], [['freelance'], 'briefcase'], [['bonus', 'gift'], 'gift'],
  ];
  const lower = nameFa.toLowerCase();
  for (const [keys, icon] of en) if (keys.some((k) => lower.includes(k))) return icon;
  if (!nameFa) for (const [keys, icon] of en) if (keys.some((k) => nameEn.toLowerCase().includes(k))) return icon;
  return kind === 'income' ? 'coins' : 'other';
}

export const forAsset = (kind) => ({ bank: 'bank', cash: 'wallet', gold: 'goldbar', coin: 'coin', currency: 'banknote', crypto: 'crypto', property: 'house', investment: 'chart', savings: 'safe' }[kind] || 'briefcase');
