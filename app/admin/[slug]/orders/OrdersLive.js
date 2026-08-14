"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUS_STYLE = {
  pending: { label: "Awaiting payment", bg: "bg-line/40", text: "text-muted" },
  complete: { label: "Paid", bg: "bg-sage/10", text: "text-sage" },
  cancelled: { label: "Cancelled", bg: "bg-line/40", text: "text-muted" },
  error: { label: "Failed", bg: "bg-rust/10", text: "text-rust" },
};

export default function OrdersLive({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders(data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (loading) return <div className="text-muted text-sm">Loading...</div>;
  if (orders.length === 0) return <div className="text-muted text-sm">No orders yet.</div>;

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
        return (
          <div key={order.id} className={`border border-line rounded-xl p-4 ${status.bg}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display font-bold">
                  {order.table_number ? `Table ${order.table_number}` : "No table given"}
                </div>
                <div className="text-muted text-xs mt-0.5">
                  {order.customer_name} · {new Date(order.created_at).toLocaleTimeString()}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.text}`}>{status.label}</span>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="text-sm flex justify-between">
                  <span>{item.qty} × {item.name}</span>
                  <span className="text-muted">R{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line mt-3 pt-2 text-sm flex justify-between font-bold">
              <span>Total</span>
              <span>R{order.total}</span>
            </div>
            {order.tip > 0 && (
              <div className="text-muted text-xs mt-1">Includes R{order.tip} tip</div>
            )}
          </div>
        );
      })}
    </div>
  );
}