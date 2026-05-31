export function Avatar({
  emoji,
  size = "md",
}: {
  emoji?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-10 w-10 text-xl"
      : size === "sm"
        ? "h-7 w-7 text-sm"
        : "h-8 w-8 text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 ${cls}`}
    >
      {emoji || "🧑"}
    </span>
  );
}
