export function Footer() {
  return (
    <footer className="bg-brand-footer text-white py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <p className="text-lg font-bold tracking-tight">BuildCityBulk</p>
          <p className="text-sm opacity-60 mt-1">
            Admin-brokered, double-blind building-material procurement.
          </p>
        </div>
        <p className="text-sm opacity-40 text-center sm:text-right">
          &copy; {new Date().getFullYear()} BuildCityBulk. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
