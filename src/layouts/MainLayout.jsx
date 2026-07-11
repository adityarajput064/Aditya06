import { Sidebar } from "../components/Sidebar";

export const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-main)" }}>
      {/* Sidebar hamesha yahan rahega */}
      <Sidebar />

      {/* Content yahan badlega */}
      <main className="ml-20 flex-1 p-8">
        {children}
      </main>
    </div>
  );
};
