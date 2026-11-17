"use client";

import { useEffect, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { StaffDialog, type StaffMember } from "@/components/manager/staff-dialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { PaginatedResponse } from "@/types";

export function StaffList({ managerId }: { managerId: number }) {
  const token = useAuthStore((state) => state.token);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<PaginatedResponse<StaffMember> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ mode: "edit" | "delete"; staff: StaffMember } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const currentSession = () =>
      !controller.signal.aborted &&
      !!token &&
      useAuthStore.getState().token === token &&
      useAuthStore.getState().user?.id === managerId &&
      useAuthStore.getState().user?.role === "MANAGER";
    if (token && currentSession()) {
      void apiFetch<PaginatedResponse<StaffMember>>(
        `/admin/staff?page=${page}&limit=10`,
        {
          token,
          signal: controller.signal,
        },
      )
        .then((data) => {
          if (currentSession()) setResult(data);
        })
        .catch((cause: unknown) => {
          if (currentSession())
            setError(
              cause instanceof ApiError
                ? cause.message
                : "Chưa tải được danh sách nhân viên. Vui lòng thử lại.",
            );
        })
        .finally(() => {
          if (currentSession()) setLoading(false);
        });
    }
    return () => controller.abort();
  }, [managerId, page, reload, token]);

  function refresh() {
    setError(null);
    setResult(null);
    setLoading(true);
    setReload((value) => value + 1);
  }

  function changePage(next: number) {
    if (loading || next === page) return;
    setError(null);
    setResult(null);
    setLoading(true);
    setPage(next);
  }

  return (
    <section
      aria-labelledby="staff-list-title"
      aria-busy={loading}
      className="rounded-2xl border border-cafe-line bg-cafe-surface p-5 shadow-cafe-card sm:p-7"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="staff-list-title" className="text-xl font-bold">
            Danh sách nhân viên
          </h2>
          {result && (
            <p className="mt-1 text-sm text-cafe-muted">
              {result.meta.total} nhân viên · Mới nhất trước
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="cursor-pointer rounded-xl border border-cafe-line px-4 py-2 text-sm font-semibold text-cafe-primary hover:bg-cafe-soft disabled:cursor-wait disabled:opacity-60"
        >
          Làm mới
        </button>
      </header>

      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {loading && (
        <p role="status" className="py-8 text-center text-sm text-cafe-muted">
          Đang tải danh sách nhân viên…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 cursor-pointer font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {result && result.data.length === 0 && (
        <p className="py-8 text-center text-sm text-cafe-muted">
          Chưa có nhân viên nào. Tạo tài khoản ở phía trên để thêm nhân viên.
        </p>
      )}
      {result && result.data.length > 0 && (
        <ul aria-label="Nhân viên" className="mt-5 divide-y divide-cafe-line">
          {result.data.map((staff) => (
            <li key={staff.id} className="py-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0">
                  <dt className="text-xs text-cafe-muted">Họ tên</dt>
                  <dd className="mt-1 break-words font-semibold">
                    {staff.fullName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-cafe-muted">Số điện thoại</dt>
                  <dd className="mt-1">{staff.phone || "Chưa có SĐT"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-cafe-muted">Email</dt>
                  <dd className="mt-1 break-words">
                    {staff.email || "Chưa có email"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-cafe-muted">Ngày tạo</dt>
                  <dd className="mt-1">
                    {new Date(staff.createdAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" aria-label={`Sửa nhân viên ${staff.fullName}`}
                  onClick={() => { setNotice(null); setAction({ mode: "edit", staff }); }}
                  className="cursor-pointer rounded-lg border border-cafe-line px-3 py-2 text-sm font-semibold text-cafe-primary hover:bg-cafe-soft">Sửa</button>
                <button type="button" aria-label={`Xóa nhân viên ${staff.fullName}`}
                  onClick={() => { setNotice(null); setAction({ mode: "delete", staff }); }}
                  className="cursor-pointer rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Xóa</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {result && (
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          onChange={changePage}
          disabled={loading}
        />
      )}
      {action && <StaffDialog key={`${action.mode}-${action.staff.id}`} staff={action.staff} mode={action.mode}
        managerId={managerId} onClose={() => setAction(null)} onSaved={message => {
          if (action.mode === "delete" && result?.data.length === 1 && page > 1) setPage(page - 1);
          setAction(null);
          setNotice(message);
          refresh();
        }} />}
    </section>
  );
}
