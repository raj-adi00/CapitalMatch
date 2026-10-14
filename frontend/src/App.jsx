import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "./api";
import "./App.css";
import { Toaster, toast } from "react-hot-toast";
import UploadSection from "./components/UploadSection";
import Dashboard from "./components/Dashboard";

function App() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  //Fetch organizations on load
  useEffect(() => {
    setIsLoading(true);
    Cookies.remove("selected_org");
    api
      .get("/organizations/")
      .then((res) => {
        console.log(res.data)
        const orgData = res.data || [];
        setOrganizations(orgData);
      })
      .catch((err) => {
        console.error("Failed to load organizations", err);
        setError("Failed to load organizations");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSelectOrg = (e) => {
    const slug = e.target.value;
    setSelectedOrg(slug);
    Cookies.set("selected_org", slug);
  };

  const handleResetOrg = () => {
    Cookies.remove("selected_org");
    setSelectedOrg("");
  };

  return (
    <>
      {/* Global Notification Container */}
      <Toaster position="top-right" />

      {/* Global Loading State Wrapper*/}
      <div
        className={`max-w-7xl mx-auto p-4 sm:p-8 font-sans min-h-screen text-gray-900 transition-opacity duration-300 ${
          isLoading
            ? "opacity-50 pointer-events-none select-none"
            : "opacity-100"
        }`}
      >
        <header className="bg-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-200 pb-5 gap-4 rounded-lg">
          <div>
            <h1 className="m-0 text-3xl font-extrabold text-blue-900 tracking-tight">
              CapitalMatch
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Automated Ledger Reconciliation
            </p>
          </div>

          {/* Organization Selector */}
          <div className="w-full sm:w-auto">
            {!selectedOrg ? (
              <div className="flex items-center gap-3">
                <select
                  onChange={handleSelectOrg}
                  defaultValue=""
                  disabled={isLoading}
                  className="w-full sm:w-64 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    Select Organization
                  </option>
                  {organizations.map((org) => (
                    <option key={org.slug} value={org.slug}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium text-sm text-gray-700">
                    {selectedOrg}
                  </span>
                </div>
                <button
                  onClick={handleResetOrg}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium rounded-md text-xs border border-gray-200 transition-colors cursor-pointer shadow-sm"
                >
                  Switch
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        {!selectedOrg ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to CapitalMatch
            </h2>
            <p className="text-gray-500 max-w-md">
              Please select an organization from the dropdown above to view
              ledgers and import bank statements.
            </p>
          </div>
        ) : (
          <main className="space-y-8 animate-fade-in-up">
            <UploadSection
              onUploadSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
            <Dashboard refreshTrigger={refreshTrigger} />
          </main>
        )}
      </div>
    </>
  );
}

export default App;
