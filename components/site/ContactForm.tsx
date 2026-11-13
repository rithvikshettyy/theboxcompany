"use client";

import { useState, type FormEvent } from "react";
import { COMPANY } from "@/lib/company";

const field =
  "mt-2 block w-full rounded-chip border border-line2 bg-transparent px-4 py-3 text-base text-tx placeholder:text-mu focus-visible:border-brand2";
const label = "block text-sm text-mu";

/**
 * Enquiry form. There is no server behind it: sending opens the visitor's email app with the
 * details filled in, addressed to the company. The note under the button says so.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const body = [
      `Name: ${get("name")}`,
      `Company: ${get("company")}`,
      `Email: ${get("email")}`,
      `Boxes a month: ${get("quantity") || "not given"}`,
      "",
      get("needs"),
    ].join("\n");
    const subject = `Box enquiry from ${get("company") || get("name")}`;
    window.location.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
      <label className={label}>
        Name
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className={label}>
        Company
        <input name="company" autoComplete="organization" className={field} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className={label}>
        Boxes a month
        <input name="quantity" inputMode="numeric" placeholder="For example 20,000" className={field} />
      </label>
      <label className={`${label} md:col-span-2`}>
        What do you ship?
        <textarea
          name="needs"
          required
          rows={5}
          placeholder="The product, its size and weight, and how it travels."
          className={field}
        />
      </label>
      <div className="flex flex-col items-start gap-3 md:col-span-2">
        <button
          type="submit"
          className="inline-flex h-12 items-center rounded-chip bg-brand px-6 text-base font-medium text-bg transition-colors duration-150 hover:bg-tx"
        >
          Send enquiry
        </button>
        <p className="text-sm text-mu" aria-live="polite">
          {sent
            ? `Your email app should now be open with the enquiry filled in. If not, write to ${COMPANY.email}.`
            : "This opens your email app with the details filled in."}
        </p>
      </div>
    </form>
  );
}
