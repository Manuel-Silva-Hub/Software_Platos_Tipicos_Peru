// src/views/components/SkeletonCard.tsx
/**
  Simple skeleton placeholder for dish card while loading.
 */


export function SkeletonCard() {
  return (
    <article className="dish-card" aria-hidden="true" style={{ minHeight: 280 }}>
      <div className="dish-image-container" style={{ background: 'linear-gradient(90deg,#f3f4f6,#e5e7eb)' }}>
        <div style={{ height: '100%' }} />
      </div>
      <div className="dish-content">
        <div className="dish-header">
          <div style={{ width: '60%', height: 18, background: '#e5e7eb', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ width: '30%', height: 14, background: '#f3f4f6', borderRadius: 6 }} />
        </div>
        <div className="dish-body">
          <div style={{ width: '100%', height: 12, background: '#f3f4f6', borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: '80%', height: 12, background: '#f3f4f6', borderRadius: 6 }} />
        </div>
      </div>
    </article>
  );
}
