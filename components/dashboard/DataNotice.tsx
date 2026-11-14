/** What the numbers are. Shown on every dashboard view so nobody reads sample figures as plant results. */
export const SAMPLE_DATA_NOTE =
  "Sample data: this dashboard runs on a simulated plant (seeded, repeatable) and sample records. The figures show how the method works. They are not real plant results.";

/** Plain-text footer repeat, for the bottom of the page. */
export function DataFooter() {
  return (
    <footer className="px-5 pb-10 text-xs text-mu md:px-8 lg:px-10">
      <p className="max-w-3xl">{SAMPLE_DATA_NOTE}</p>
    </footer>
  );
}
