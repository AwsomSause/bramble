import { usePageTitle } from '../../app/usePageTitle';
import { Button } from '../../ui/Button';
import { SHOP_ITEMS, type ItemType, type ShopItem } from './catalog';
import { buy, equip, isOwned, unequip, useShop } from './shopStore';
import styles from './Shop.module.css';

const SECTIONS: { type: ItemType; title: string; note: string }[] = [
  { type: 'cursor', title: 'Cursors', note: 'Swap your mouse pointer.' },
  { type: 'accent', title: 'Colour packs', note: 'Recolour buttons and highlights, on any theme.' },
];

function Preview({ item }: { item: ShopItem }) {
  if (item.type === 'accent') {
    const swatch: Record<string, string> = {
      'accent-default': '#6b2d8b',
      'accent-bubblegum': '#e0387d',
      'accent-forest': '#3f8f3f',
      'accent-sunset': '#e8792a',
      'accent-ocean': '#0e8fa3',
    };
    return <span className={styles.swatch} style={{ background: swatch[item.id] ?? '#6b2d8b' }} aria-hidden="true" />;
  }
  return <span className={styles.cursorPreview} data-cursor={item.id} aria-hidden="true">✦</span>;
}

function ItemCard({ item, equippedId }: { item: ShopItem; equippedId: string }) {
  const owned = isOwned(item.id);
  const equipped = equippedId === item.id;
  const isDefault = item.cost === 0;
  return (
    <li className={styles.item}>
      <Preview item={item} />
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemBlurb}>{item.blurb}</span>
      </div>
      <div className={styles.itemAction}>
        {!owned ? (
          <Button onClick={() => buy(item.id)} aria-label={`Buy ${item.name} for ${item.cost} coins`}>
            🪙 {item.cost}
          </Button>
        ) : equipped ? (
          isDefault ? (
            <span className={styles.equipped}>In use</span>
          ) : (
            <Button onClick={() => unequip(item.type)}>Remove</Button>
          )
        ) : (
          <Button variant="primary" onClick={() => equip(item.id)}>
            Use
          </Button>
        )}
      </div>
    </li>
  );
}

export default function ShopPage() {
  usePageTitle('The Patch Shop');
  const { wallet, equipped } = useShop();
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>The Patch Shop</h1>
        <span className={styles.balance} aria-live="polite">
          🪙 <strong>{wallet.coins}</strong> coins
        </span>
      </div>
      <p className={styles.note}>
        Earn coins by playing games and visiting each day, then spend them on cosmetics. Coins are just for fun — there are
        no real purchases, and everything stays in this browser.
      </p>
      {SECTIONS.map((section) => (
        <section key={section.type} aria-labelledby={`shop-${section.type}`}>
          <h2 id={`shop-${section.type}`} className={styles.sectionTitle}>
            {section.title}
          </h2>
          <p className={styles.note}>{section.note}</p>
          <ul className={styles.grid}>
            {SHOP_ITEMS.filter((i) => i.type === section.type).map((item) => (
              <ItemCard key={item.id} item={item} equippedId={equipped[item.type]} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
