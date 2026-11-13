import { inrParts } from "@/lib/format";
import { cn } from "@/lib/utils";

type RupeeFigureProps = {
  value: number;
  /** Always show + or −, for amounts recovered against a baseline. */
  signed?: boolean;
  className?: string;
  /** Size of the "L" / "Cr" unit. Set it a step smaller so ₹1.84 Cr fits a phone at 72px. */
  unitClassName?: string;
};

/** A ₹ amount in Indian units, with the unit set smaller than the figure. */
export function RupeeFigure({ value, signed = false, className, unitClassName }: RupeeFigureProps) {
  const { sign, amount, unit } = inrParts(value, signed);
  return (
    <span className={cn("num whitespace-nowrap", className)}>
      {sign}₹{amount}
      {unit ? <span className={unitClassName}>{` ${unit}`}</span> : null}
    </span>
  );
}
