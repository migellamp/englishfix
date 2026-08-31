export function EmptyState() {
  return (
    <section className="empty-state" aria-label="How EnglishFix works">
      <div className="empty-step"><span>1</span><div><strong>Write naturally</strong><p>Do not worry about typos or grammar yet.</p></div></div>
      <div className="empty-divider" aria-hidden="true" />
      <div className="empty-step"><span>2</span><div><strong>Learn from each fix</strong><p>See explanations, word meanings, and context.</p></div></div>
      <div className="empty-divider" aria-hidden="true" />
      <div className="empty-step"><span>3</span><div><strong>Keep your voice</strong><p>Apply only the changes that feel right to you.</p></div></div>
    </section>
  );
}
