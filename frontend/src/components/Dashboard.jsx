// src/components/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api";

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

export default function Dashboard({ refreshTrigger }) {
  const [activeTab, setActiveTab] = useState("ledger");
  const [transactions, setTransactions] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  //Transactions Pagination & Filters
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotalPages, setTxnTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const txnParams = new URLSearchParams({ page: txnPage });
      if (statusFilter) txnParams.append("status", statusFilter);

      const [lineItemsRes, transactionsRes] = await Promise.all([
        api.get("/line-items/"),
        api.get(`/transactions/?${txnParams.toString()}`),
      ]);

      setLineItems(lineItemsRes.data.results || lineItemsRes.data || []);

      setTransactions(transactionsRes.data.results || []);
      setTxnTotalPages(Math.ceil((transactionsRes.data.count || 0) / 10) || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [txnPage, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (matchId, action) => {
    setProcessingId(matchId);
    try {
      await api.post(`/matches/${matchId}/${action}/`);
      toast.success(`Match ${action}d successfully!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action} match.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors ${
            activeTab === "transactions"
              ? "text-blue-700 bg-white border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <List className="w-4 h-4" /> Transactions Pipeline
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors ${
            activeTab === "ledger"
              ? "text-blue-700 bg-white border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" /> Line Items (Ledger)
        </button>
      </div>

      <div className="p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTxnPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="suggested">Suggested</option>
                <option value="needs_review">Needs Review</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Description</th>
                    <th className="p-3 font-semibold">Amount</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">
                      Suggested Investor & Reference
                    </th>
                    <th className="p-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions?.map((txn) => {
                    const suggestion = txn.matches?.find(
                      (m) => m.status === "proposed",
                    );

                    return (
                      <tr
                        key={txn.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 text-gray-500">{txn.date}</td>
                        <td
                          className="p-3 truncate max-w-xs"
                          title={txn.description}
                        >
                          {txn.description}
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          {formatMoney(txn.amount)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              txn.status === "suggested"
                                ? "bg-amber-100 text-amber-800"
                                : txn.status === "reconciled"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {txn.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {suggestion ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-blue-900">
                                {suggestion.line_item.investor_entity} (
                                {suggestion.line_item.expected_reference})
                              </span>
                              <span className="text-xs text-gray-500">
                                {suggestion.reason}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">
                              {txn.reason || "No suggestions"}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {suggestion && txn.status === "suggested" && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  handleAction(suggestion.id, "approve")
                                }
                                disabled={processingId === suggestion.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {processingId === suggestion.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(suggestion.id, "reject")
                                }
                                disabled={processingId === suggestion.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions?.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Transactions Pagination */}
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">
                Page {txnPage} of {txnTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={txnPage === 1}
                  onClick={() => setTxnPage((p) => p - 1)}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={txnPage === txnTotalPages || txnTotalPages === 0}
                  onClick={() => setTxnPage((p) => p + 1)}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-semibold">Investor Entity</th>
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold text-right">
                      Amount Called
                    </th>
                    <th className="p-3 font-semibold text-right">Funded</th>
                    <th className="p-3 font-semibold text-right text-blue-700">
                      Remaining
                    </th>
                    <th className="p-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems?.map((li) => (
                    <tr
                      key={li.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 font-medium text-gray-900">
                        {li.investor_entity}
                      </td>
                      <td className="p-3 text-gray-500 font-mono text-xs">
                        {li.expected_reference}
                      </td>
                      <td className="p-3 text-right">
                        {formatMoney(li.amount_called)}
                      </td>
                      <td className="p-3 text-right text-green-700">
                        {formatMoney(li.amount_funded)}
                      </td>
                      <td className="p-3 text-right font-bold text-blue-700">
                        {formatMoney(li.amount_remaining)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            li.status === "closed"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {li.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lineItems?.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
