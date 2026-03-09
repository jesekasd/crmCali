"use client";

interface PaginationControlsProps {
  page: number;
  hasNextPage: boolean;
  itemCount: number;
  pageSize: number;
  itemLabel: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  hasNextPage,
  itemCount,
  pageSize,
  itemLabel,
  disabled = false,
  onPageChange
}: PaginationControlsProps) {
  const startItem = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = (page - 1) * pageSize + itemCount;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-500">
        Mostrando {startItem}-{endItem} {itemLabel}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Página {page}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNextPage}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
