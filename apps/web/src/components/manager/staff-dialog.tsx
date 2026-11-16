"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";

export type StaffMember = Pick<User, "id" | "fullName" | "phone" | "email"> & {
  createdAt: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-cafe-line bg-cafe-surface px-3.5 py-3 text-sm text-cafe-ink focus:outline-none focus:ring-2 focus:ring-cafe-primary disabled:opacity-60";

export function StaffDialog({ staff, mode, managerId, onClose, onSaved }: {
  staff: StaffMember;
  mode: "edit" | "delete";
  managerId: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [fullName, setFullName] = useState(staff.fullName);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [email, setEmail] = useState(staff.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  function close() {
    if (!pending.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError(null);
    const name = fullName.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "edit") {
      if (name.length < 2 || name.length > 100) {
        setError("Họ tên cần từ 2 đến 100 ký tự.");
        return;
      }
      if (normalizedPhone && !/^0[0-9]{9}$/.test(normalizedPhone)) {
        setError("Số điện thoại gồm 10 chữ số bắt đầu bằng 0.");
        return;
      }
      if (!normalizedPhone && !normalizedEmail) {
        setError("Cần có ít nhất số điện thoại hoặc email để nhân viên đăng nhập.");
        return;
      }
    }
    const session = useAuthStore.getState();
    if (!session.token || session.user?.id !== managerId || session.user.role !== "MANAGER") return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    const currentSession = () =>
      !controller.signal.aborted &&
      useAuthStore.getState().token === session.token &&
      useAuthStore.getState().user?.id === managerId &&
      useAuthStore.getState().user?.role === "MANAGER";
    try {
      await apiFetch(`/admin/staff/${staff.id}`, {
        method: mode === "edit" ? "PATCH" : "DELETE",
        token: session.token,
        signal: controller.signal,
        ...(mode === "edit" ? {
          body: JSON.stringify({ fullName: name, phone: normalizedPhone || null, email: normalizedEmail || null }),
        } : {}),
      });
      if (currentSession()) onSaved(mode === "edit"
        ? `Đã cập nhật thông tin ${name}.`
        : `Đã xóa nhân viên ${staff.fullName}.`);
    } catch (cause) {
      if (currentSession()) setError(cause instanceof ApiError
        ? cause.message
        : "Chưa hoàn tất thao tác. Vui lòng thử lại.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (currentSession()) setSaving(false);
    }
  }

  return (
    <Modal labelledBy="staff-dialog-title" onClose={close}>
      <div className="w-full max-w-lg rounded-2xl bg-cafe-surface p-5 text-cafe-ink sm:p-7">
        <h2 id="staff-dialog-title" className="text-xl font-bold">
          {mode === "edit" ? "Sửa thông tin nhân viên" : "Xóa nhân viên"}
        </h2>
        <p className="mt-2 break-words text-sm text-cafe-muted">{staff.fullName}</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <form onSubmit={submit} aria-busy={saving} className="mt-5">
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            <legend className="sr-only">{mode === "edit" ? "Thông tin nhân viên" : "Xác nhận xóa nhân viên"}</legend>
            {mode === "edit" ? <>
              <label className="block text-sm font-semibold" htmlFor="edit-staff-name">
                Họ tên
                <input id="edit-staff-name" name="fullName" required minLength={2} maxLength={100}
                  value={fullName} onChange={event => setFullName(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold" htmlFor="edit-staff-phone">
                Số điện thoại
                <input id="edit-staff-phone" name="phone" type="tel" inputMode="numeric" pattern="0[0-9]{9}" maxLength={10}
                  value={phone} onChange={event => setPhone(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold" htmlFor="edit-staff-email">
                Email
                <input id="edit-staff-email" name="email" type="email" maxLength={150}
                  value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
              </label>
              <p className="text-xs text-cafe-muted">Cần có ít nhất số điện thoại hoặc email để đăng nhập.</p>
            </> : <p className="text-sm leading-6">
              Bạn có chắc muốn xóa nhân viên <strong>{staff.fullName}</strong>?
              Nhân viên sẽ không thể đăng nhập và sẽ được gỡ khỏi danh sách.
              Lịch sử đơn hàng và nhập kho vẫn được giữ lại.
            </p>}
            <div className="flex flex-wrap justify-end gap-3 pt-3">
              <button type="button" onClick={close} disabled={saving}
                className="cursor-pointer rounded-xl border border-cafe-line px-4 py-2.5 text-sm font-semibold disabled:opacity-60">Hủy</button>
              <button type="submit" disabled={saving}
                className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${mode === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-cafe-primary hover:bg-cafe-hover"}`}>
                {saving ? "Đang xử lý…" : mode === "edit" ? "Lưu thay đổi" : "Xóa nhân viên"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </Modal>
  );
}
