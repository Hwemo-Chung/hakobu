import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Dashboard
      llmConfigured={Boolean(process.env.NEBIUS_API_KEY?.trim())}
      ratesConfigured={Boolean(process.env.EASYPOST_API_KEY?.trim())}
    />
  );
}
