export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="font-display text-4xl font-black text-amber">Awea</div>
      <p className="text-muted mt-3 max-w-sm">
        Tap-to-view digital menus, rewards, and retargeting for restaurants.
      </p>
      <p className="text-muted text-sm mt-8">
        Restaurant menus live at <span className="text-cream font-medium">/r/[restaurant-slug]</span>.
        Manage everything at <a href="/admin" className="text-amber underline">/admin</a>.
      </p>
    </main>
  );
}