import { Component as DockComponent } from '@/components/ui/docks'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-500">
      {/* Fixed dock in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <DockComponent />
      </div>

      {/* Page content placeholder */}
      <main className="p-8 pt-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GameVault</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Your personal game collection.</p>
      </main>
    </div>
  )
}
