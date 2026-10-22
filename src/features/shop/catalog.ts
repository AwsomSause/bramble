/** What the Patch Shop sells. All cosmetic, all applied on top of whatever theme you're using. */
export type ItemType = 'cursor' | 'accent';

export type ShopItem = { id: string; type: ItemType; name: string; cost: number; blurb: string };

/** 'default' ids are free, always owned, and mean "none / the normal look". */
export const DEFAULT_ITEMS: Record<ItemType, string> = { cursor: 'cursor-default', accent: 'accent-default' };

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'cursor-default', type: 'cursor', name: 'Normal pointer', cost: 0, blurb: 'The usual cursor.' },
  { id: 'cursor-berry', type: 'cursor', name: 'Berry cursor', cost: 60, blurb: 'A little blackberry follows your pointer.' },
  { id: 'cursor-leaf', type: 'cursor', name: 'Leaf cursor', cost: 60, blurb: 'A fresh green leaf.' },
  { id: 'cursor-star', type: 'cursor', name: 'Star cursor', cost: 80, blurb: 'A twinkling gold star.' },
  { id: 'accent-default', type: 'accent', name: 'Bramble purple', cost: 0, blurb: 'The default berry accent.' },
  { id: 'accent-bubblegum', type: 'accent', name: 'Bubblegum', cost: 120, blurb: 'Bright pink buttons and highlights.' },
  { id: 'accent-forest', type: 'accent', name: 'Forest', cost: 120, blurb: 'Leafy green accents.' },
  { id: 'accent-sunset', type: 'accent', name: 'Sunset', cost: 120, blurb: 'Warm orange accents.' },
  { id: 'accent-ocean', type: 'accent', name: 'Ocean', cost: 150, blurb: 'Cool teal accents.' },
];

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);
export const isDefaultItem = (id: string): boolean => Object.values(DEFAULT_ITEMS).includes(id);
