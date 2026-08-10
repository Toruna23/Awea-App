import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MenuClient from "./MenuClient";

export const revalidate = 0;

export default async function RestaurantPage({ params }) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!restaurant) return notFound();

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order");

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order");

  return <MenuClient restaurant={restaurant} categories={categories || []} items={items || []} />;
}