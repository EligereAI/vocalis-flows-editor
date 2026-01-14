export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Vocalis Flows Editor</h1>
        <p className="text-muted-foreground">
          Please navigate to <code className="text-foreground">/agentId/versionNumber</code> to
          access the editor.
        </p>
      </div>
    </div>
  );
}
