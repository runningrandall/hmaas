export default function Home() {
  const hasApi = !!process.env.NEXT_PUBLIC_API_URL;

  if (!hasApi) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-md max-w-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Configuration Required</h1>
          <p className="mb-4 text-gray-700">
            Please configure the <code className="bg-gray-200 px-1 py-0.5 rounded">NEXT_PUBLIC_API_URL</code> environment variable.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Deploy the backend using <code className="bg-gray-200 px-1 py-0.5 rounded">pnpm --filter infra run deploy</code></li>
            <li>Copy the <strong>ApiUrl</strong> from the output.</li>
            <li>Create <code className="bg-gray-200 px-1 py-0.5 rounded">frontend/.env.local</code> and add:</li>
          </ol>
          <pre className="mt-4 bg-gray-800 p-4 rounded text-white overflow-x-auto">
            NEXT_PUBLIC_API_URL=https://your-api-url...
          </pre>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Versa</h1>
            <p className="text-sm text-gray-500 mt-1">Premium Property Management</p>
          </div>
          <div className="flex gap-4">
            <a href="/login" className="text-blue-600 hover:underline">Login / Sign Up</a>
            <a href="/profile" className="text-blue-600 hover:underline">Profile</a>
            <a href="/admin" className="text-blue-600 hover:underline">Admin Dashboard</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">All Your Property Needs, One Simple Bundle</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lawn care, pest control, window cleaning, fertilizer, sprinkler maintenance, winterizing, and more.
            Save money and time with Versa.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[
            { name: 'Lawn Care', desc: 'Regular mowing, edging, and maintenance' },
            { name: 'Pest Control', desc: 'Keep your property pest-free year-round' },
            { name: 'Window Cleaning', desc: 'Crystal clear windows inside and out' },
            { name: 'Fertilizer', desc: 'Professional lawn fertilization programs' },
            { name: 'Sprinkler', desc: 'Installation, repair, and maintenance' },
            { name: 'Winterizing', desc: 'Prepare your property for winter' },
            { name: 'Snow Removal', desc: 'Reliable snow clearing services' },
            { name: 'Gutter Cleaning', desc: 'Keep gutters flowing freely' },
            { name: 'Power Washing', desc: 'Deep clean driveways, decks, and siding' },
            { name: 'Tree Trimming', desc: 'Professional tree care and trimming' },
          ].map((service) => (
            <div key={service.name} className="rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-sm text-gray-600">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
