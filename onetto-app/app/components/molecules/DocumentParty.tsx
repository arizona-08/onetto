type Detail = { label: string; value: string | null | undefined };

export default function DocumentParty({
  heading,
  name,
  address,
  details,
  right = false,
}: {
  heading: string;
  name: string;
  address: string[];
  details: Detail[];
  right?: boolean;
}) {
  const visibleDetails = details.filter((detail) => detail.value);

  return (
    <section className="min-w-0">
      <div className={right ? "sm:text-right" : undefined}>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ui-secondary">{heading}</h3>
        <p className="font-title text-sm font-semibold text-ui-text">{name}</p>
        <div className="mt-1 text-xs text-ui-text">
          {address.filter(Boolean).map((line, index) => <p key={index} className="break-words">{line}</p>)}
        </div>
      </div>
      {visibleDetails.length > 0 && (
        <dl className="mt-3  text-[10px] leading-snug text-ui-secondary">
          {visibleDetails.map(({ label, value }) => (
            <div key={label} className="min-w-0 break-words">
              <dt className="inline font-medium">{label} : </dt>
              <dd className="inline break-all">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
