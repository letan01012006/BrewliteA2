export function Pagination({
  page,
  totalPages,
  onChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="flex items-center justify-center gap-6 py-6 text-sm text-cafe-ink "
    >
      <button
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        className="min-h-11 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:text-cafe-primary "
      >
        ← Trang trước
      </button>
      <span className="font-medium">
        Trang {page}/{totalPages}
      </span>
      <button
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="min-h-11 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:text-cafe-primary "
      >
        Trang sau →
      </button>
    </nav>
  );
}
