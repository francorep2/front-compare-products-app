import type { ReactNode } from "react";
import { IoOpenOutline } from "react-icons/io5";
import { STORES } from "../api/types";
import { money, pct, priceNumber } from "../lib/format";
import type { ProductGroup } from "../lib/group";
import { Img } from "../ui/Img";
import { StoreBadge } from "../ui/Misc";

/** Un producto con el precio en cada tienda; el más barato resaltado y el ahorro posible. */
export function ProductCard({ group, actions, compact }: { group: ProductGroup; actions?: ReactNode; compact?: boolean }) {
  const spread = group.count > 1 ? group.max - group.min : 0;
  return (
    <article className={`product${compact ? " compact" : ""}`}>
      <div className="product-top">
        <Img src={group.image ?? undefined} />
        <div className="grow">
          <h3 className="product-title">{group.title}</h3>
          <div className="product-meta">
            {group.barcode && <span className="pill">EAN {group.barcode}</span>}
            {spread > 0 && <span className="pill good">Ahorrás {money(spread)} ({pct((spread / group.max) * 100)})</span>}
            {group.count === 1 && <span className="pill">Solo en 1 tienda</span>}
          </div>
        </div>
        {actions && <div className="product-actions">{actions}</div>}
      </div>
      <div className="offers">
        {STORES.map((s) => {
          const o = group.offers[s];
          if (!o) return null;
          const best = s === group.cheapest && group.count > 1;
          return (
            <a key={s} className={`offer${best ? " best" : ""}`} href={o.url} target="_blank" rel="noreferrer" title={`Ver en ${s}`}>
              <StoreBadge store={s} size={18} />
              <span className="offer-price">{money(priceNumber(o.price))}</span>
              {o.promotion && <span className="badge">{o.promotion}</span>}
              {best && <span className="best-tag">más barato</span>}
              <IoOpenOutline size={14} className="open" />
            </a>
          );
        })}
      </div>
    </article>
  );
}
