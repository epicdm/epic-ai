export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-default-500 mb-6">
        The page you're looking for doesn't exist.
      </p>
      <a 
        href="/dashboard" 
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
