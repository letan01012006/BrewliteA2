"use client";

import { AuthGate } from "@/components/auth/auth-gate";
import { LogoutButton } from "@/components/auth/logout-button";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { apiFetch, ApiError } from "@/lib/api/client";
import { StatusBadge } from "@/components/ui/badge";
import type { Order, PaginatedResponse } from "@/types";

import Link from "next/link";

interface BaristaOrder extends Order {
  user: {
    fullName: string;
    email: string | null;
  };
}

export default function BaristaKitchenPage() {
  const userId = useAuthStore((state) => state.user?.id);
  return (
    <AuthGate path="/barista" barista>
      <BaristaContent key={userId} />
    </AuthGate>
  );
}

function BaristaContent() {
  const token = useAuthStore((state) => state.token);

  const [orders, setOrders] = useState<BaristaOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const refreshCurrentView = useRef<(() => Promise<void>) | null>(null);
  const cancelRequests = useCallback(() => {
    requestId.current += 1;
    requestController.current?.abort();
  }, []);

  const fetchBaristaOrders = useCallback(
    async (force = false) => {
      // Polls should not continually abort a slow but valid request.
      if (
        !force &&
        requestController.current &&
        !requestController.current.signal.aborted
      )
        return;
      const id = ++requestId.current;
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      try {
        if (selectedTab === "ACTIVE") {
          const data = await apiFetch<BaristaOrder[]>("/orders/active", {
            token: token ?? undefined,
            signal: controller.signal,
          });
          if (id !== requestId.current) return;
          setOrders(data);
        } else {
          const result = await apiFetch<PaginatedResponse<BaristaOrder>>(
            `/orders?limit=50&page=${page}`,
            { token: token ?? undefined, signal: controller.signal },
          );
          if (id !== requestId.current) return;
          setOrders(result.data);
          setTotalPages(result.meta.totalPages);
          setTotalOrders(result.meta.total);
        }
        setErrorMsg(null);
      } catch (err) {
        if (id !== requestId.current || controller.signal.aborted) return;
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : "Không thể tải danh sách đơn hàng quầy Barista.",
        );
      } finally {
        if (id === requestId.current && !controller.signal.aborted) {
          requestController.current = null;
          setIsLoading(false);
        }
      }
    },
    [selectedTab, page, token],
  );

  useEffect(() => {
    refreshCurrentView.current = () => fetchBaristaOrders(true);
    const initial = setTimeout(() => void fetchBaristaOrders(), 0);
    const interval = setInterval(() => void fetchBaristaOrders(), 8000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      refreshCurrentView.current = null;
      cancelRequests();
    };
  }, [fetchBaristaOrders, cancelRequests]);

  const switchTab = (tab: "ACTIVE" | "ALL") => {
    if (tab === selectedTab) return;
    setOrders([]);
    setIsLoading(true);
    setPage(1);
    setSelectedTab(tab);
  };
  const changePage = (next: number) => {
    setOrders([]);
    setIsLoading(true);
    setPage(next);
  };

  // Cập nhật trạng thái pha chế (PATCH /api/orders/:id/status)
  const handleUpdateStatus = async (
    orderId: number,
    newStatus: "PREPARING" | "READY" | "COMPLETED",
  ) => {
    setActionLoadingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      // Làm mới danh sách ngay lập tức
      await refreshCurrentView.current?.();
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Barista hủy đơn khẩn cấp (POST /api/orders/:id/cancel)
  const handleCancelOrder = async (orderId: number) => {
    if (
      !confirm(
        `Xác nhận hủy đơn #${orderId}? Toàn bộ tiền và tồn kho sẽ được hoàn trả cho khách.`,
      )
    ) {
      return;
    }

    setActionLoadingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/cancel`, {
        method: "POST",
      });
      await refreshCurrentView.current?.();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể hủy đơn hàng");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Phân loại đơn theo cột Kanban / Trạng thái
  const paidOrders = orders.filter((o) => o.status === "PAID");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");

  return (
    <div className="min-h-screen pb-16 bg-cafe-soft/60 ">
      {/* Barista navigation and account actions */}
      <div className=" border-b px-4 py-2.5 flex items-center justify-between bg-cafe-surface border-cafe-line text-cafe-ink ">
        <Link href="/barista/inventory" className="text-xs font-semibold hover:text-amber-400 transition-colors text-cafe-muted ">Nguyên liệu &amp; Kho</Link>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>

      {/* Barista Header Bar */}
      <div className=" px-4 py-4 border-b sticky top-0 z-30 bg-cafe-surface text-cafe-ink border-cafe-line">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧑‍🍳</span>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                <span>Quầy Pha Chế Barista (KDS)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-normal border bg-cafe-accent text-cafe-primary border-cafe-line">
                  Auto-sync (8s)
                </span>
              </h1>
              <p className="text-xs text-cafe-muted">
                Theo dõi và xử lý đơn hàng theo State Machine chuẩn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex p-1 rounded-xl text-xs font-semibold bg-cafe-soft">
              <button
                onClick={() => switchTab("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === "ACTIVE"
                    ? "bg-amber-600 text-white shadow-cafe-card cafe-primary "
                    : " text-cafe-primary hover:text-cafe-hover"
                }`}
              >
                Đơn đang làm (
                {paidOrders.length +
                  preparingOrders.length +
                  readyOrders.length}
                )
              </button>
              <button
                onClick={() => switchTab("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTab === "ALL"
                    ? "bg-amber-600 text-white shadow-cafe-card cafe-primary "
                    : " text-cafe-primary hover:text-cafe-hover"
                }`}
              >
                Toàn bộ lịch sử
              </button>
            </div>

            <button
              onClick={() => void fetchBaristaOrders(true)}
              className="bg-amber-800 hover:bg-amber-700 text-amber-100 p-2 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer cafe-icon"
              title="Làm mới ngay"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Báo lỗi nếu có */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 mb-6 flex justify-between items-center">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => void fetchBaristaOrders(true)}
              className="font-bold underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Chế độ Kanban KDS: 3 Cột Quy Trình (PAID -> PREPARING -> READY) */}
        {isLoading && (
          <p role="status" className="p-4 text-center text-cafe-muted ">
            Đang tải đơn hàng...
          </p>
        )}
        {selectedTab === "ACTIVE" && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* CỘT 1: Chờ pha chế (PAID) */}
            <div className=" rounded-2xl border p-4 space-y-3 bg-cafe-surface border-cafe-line shadow-cafe-card ">
              <div className="flex items-center justify-between pb-3 border-b border-cafe-line ">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h2 className="font-bold text-sm text-cafe-ink ">
                    1. Chờ Pha Chế
                  </h2>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono">
                  {paidOrders.length}
                </span>
              </div>

              {paidOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-cafe-muted ">
                  Không có đơn mới đang chờ
                </div>
              ) : (
                <div className="space-y-3">
                  {paidOrders.map((order) => (
                    <div
                      key={order.id}
                      className=" border rounded-xl p-3.5 space-y-3 transition-colors bg-cafe-page border-cafe-line hover:border-cafe-primary "
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black font-mono text-sm block text-cafe-ink ">
                            #{order.id}
                          </span>
                          <span className="text-[11px] text-cafe-muted ">
                            {order.user?.fullName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cafe-muted ">
                          {new Date(order.createdAt).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      {/* Danh sách món */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className=" p-2 rounded-lg border space-y-0.5 bg-cafe-surface border-cafe-line "
                          >
                            <div className="font-bold flex justify-between text-cafe-ink ">
                              <span>
                                {item.qty}x {item.productName} ({item.size})
                              </span>
                            </div>
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="text-[10px] text-cafe-muted ">
                                + {item.toppings.map((t) => t.name).join(", ")}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                ✍️ {item.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Nút hành động Barista */}
                      <div className="pt-2 border-t flex gap-2 border-cafe-line ">
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() =>
                            handleUpdateStatus(order.id, "PREPARING")
                          }
                          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-cafe-card "
                        >
                          <span>▶ Bắt đầu pha chế</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                          className=" hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors text-xs cursor-pointer text-cafe-muted "
                          title="Hủy đơn"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CỘT 2: Đang pha chế (PREPARING) */}
            <div className=" rounded-2xl border p-4 space-y-3 bg-cafe-surface border-cafe-line shadow-cafe-card ">
              <div className="flex items-center justify-between pb-3 border-b border-cafe-line ">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-spin" />
                  <h2 className="font-bold text-sm text-cafe-ink ">
                    2. Đang Pha Chế
                  </h2>
                </div>
                <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-mono">
                  {preparingOrders.length}
                </span>
              </div>

              {preparingOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-cafe-muted ">
                  Chưa có đơn đang làm
                </div>
              ) : (
                <div className="space-y-3">
                  {preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-purple-50/40 border border-purple-200 rounded-xl p-3.5 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black font-mono text-sm block text-cafe-ink ">
                            #{order.id}
                          </span>
                          <span className="text-[11px] text-cafe-muted ">
                            {order.user?.fullName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cafe-muted ">
                          {new Date(order.createdAt).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      {/* Danh sách món */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className=" p-2 rounded-lg border border-purple-100 space-y-0.5 bg-cafe-surface "
                          >
                            <div className="font-bold flex justify-between text-cafe-ink ">
                              <span>
                                {item.qty}x {item.productName} ({item.size})
                              </span>
                            </div>
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="text-[10px] text-cafe-muted ">
                                + {item.toppings.map((t) => t.name).join(", ")}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                ✍️ {item.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Nút hoàn thành món */}
                      <div className="pt-2 border-t border-purple-200 ">
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() => handleUpdateStatus(order.id, "READY")}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-cafe-card "
                        >
                          <span>✓ Đã pha chế xong (READY)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CỘT 3: Sẵn sàng nhận (READY) */}
            <div className=" rounded-2xl border p-4 space-y-3 bg-cafe-surface border-cafe-line shadow-cafe-card ">
              <div className="flex items-center justify-between pb-3 border-b border-cafe-line ">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="font-bold text-sm text-cafe-ink ">
                    3. Đã Sẵn Sàng (Chờ khách lấy)
                  </h2>
                </div>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono">
                  {readyOrders.length}
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-cafe-muted ">
                  Chưa có ly nào đang chờ lấy
                </div>
              ) : (
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black font-mono text-base block text-cafe-ink ">
                            #{order.id}
                          </span>
                          <span className="text-xs font-semibold text-emerald-900 ">
                            {order.user?.fullName}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                          Gọi khách
                        </span>
                      </div>

                      <div className="text-xs text-cafe-muted ">
                        Tổng cộng: {order.items.reduce((s, i) => s + i.qty, 0)}{" "}
                        ly đồ uống
                      </div>

                      {/* Khách đã nhận */}
                      <div className="pt-2 border-t border-emerald-200 ">
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() =>
                            handleUpdateStatus(order.id, "COMPLETED")
                          }
                          className="w-full disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-cafe-ink hover:bg-cafe-ink shadow-cafe-card "
                        >
                          <span>📦 Khách đã nhận (Hoàn tất)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chế độ Toàn bộ lịch sử (Tab ALL) */}
        {selectedTab === "ALL" && !isLoading && (
          <div className=" rounded-2xl border overflow-hidden bg-cafe-surface border-cafe-line shadow-cafe-card ">
            <div className="p-4 border-b flex justify-between items-center border-cafe-line ">
              <h3 className="font-bold text-sm text-cafe-ink ">
                Toàn bộ danh sách đơn hàng
              </h3>
              <span className="text-xs text-cafe-muted ">
                {totalOrders} đơn • Trang {page}/{totalPages}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className=" font-bold uppercase tracking-wider border-b bg-cafe-page text-cafe-muted border-cafe-line ">
                  <tr>
                    <th className="p-3.5">Mã đơn</th>
                    <th className="p-3.5">Khách hàng</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Số ly</th>
                    <th className="p-3.5">Tổng tiền</th>
                    <th className="p-3.5">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 ">
                  {orders.map((o) => (
                    <tr key={o.id} className=" hover:bg-cafe-page/60 ">
                      <td className="p-3.5 font-bold font-mono text-cafe-ink ">
                        #{o.id}
                      </td>
                      <td className="p-3.5 text-cafe-ink ">{o.user?.fullName}</td>
                      <td className="p-3.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="p-3.5 text-cafe-ink ">
                        {o.items?.reduce((s, i) => s + i.qty, 0) || 0}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-cafe-primary ">
                        {o.total.toLocaleString("vi-VN")}₫
                      </td>
                      <td className="p-3.5 text-cafe-muted ">
                        {new Date(o.createdAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between p-4 border-t text-sm border-cafe-line text-cafe-ink ">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => changePage(page - 1)}
                className="disabled:opacity-40 cursor-pointer hover:text-cafe-primary "
              >
                ← Trang trước
              </button>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => changePage(page + 1)}
                className="disabled:opacity-40 cursor-pointer hover:text-cafe-primary "
              >
                Trang sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
