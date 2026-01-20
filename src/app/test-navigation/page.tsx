/**
 * Test Navigation Page
 * Simple test to verify anchor tags work
 */

export const dynamic = 'force-dynamic';

export default function TestNavigationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Navigation Test</h1>
        <p>Click these links to test navigation:</p>
        <div className="space-y-2">
          <a 
            href="/" 
            className="block p-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Home (anchor tag)
          </a>
          <a 
            href="/products" 
            className="block p-4 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Products (anchor tag)
          </a>
          <a 
            href="/test-navigation" 
            className="block p-4 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Reload this page (anchor tag)
          </a>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          If these links work, the issue is specific to the header component.
        </p>
      </div>
    </div>
  );
}
