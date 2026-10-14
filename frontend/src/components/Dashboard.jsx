// src/components/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import api from "../api";

export default function Dashboard({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Filter States
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotalPages, setTxnTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query string for transactions
      const params = new URLSearchParams({ page: txnPage });
      if (statusFilter) params.append("status", statusFilter);

      const [lineItemsRes, transactionsRes] = await Promise.all([
        api.get("/line-items/"),
        api.get(`/transactions/?${params.toString()}`)
      ]);

      // DRF Pagination returns { count, next, previous, results }
      setLineItems(lineItemsRes.data.results || lineItemsRes.data || []);
      
      const txnData = transactionsRes.data.results || [];
      const txnCount = transactionsRes.data.count || 0;
      setTransactions(txnData);
      setTxnTotalPages(Math.ceil(txnCount / 10) || 1); // Assuming 10 items per page
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      setTransactions([]);
      setLineItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [txnPage, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {isLoading && <p>Loading data...</p>}
      
      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        
        {/* Line Items Table */}
        <div style={{ flex: 1 }}>
          <h3>Line Items (Ledger)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Investor</th>
                <th>Expected Ref</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lineItems?.map((li) => (
                <tr key={li.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{li.investor_entity}</td>
                  <td>{li.expected_reference}</td>
                  <td>${li.amount_remaining}</td>
                  <td>{li.status}</td>
                </tr>
              ))}
              {lineItems?.length === 0 && (
                <tr><td colSpan="4" style={{ padding: "1rem", textAlign: "center" }}>No line items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions Table */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Transactions</h3>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setTxnPage(1); }}
              style={{ padding: "0.25rem" }}
            >
              <option value="">All Statuses</option>
              <option value="suggested">Suggested</option>
              <option value="needs_review">Needs Review</option>
              <option value="reconciled">Reconciled</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((txn) => (
                <tr key={txn.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{txn.date}</td>
                  <td>${txn.amount}</td>
                  <td>
                    <span style={{ 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "4px", 
                      backgroundColor: txn.status === 'suggested' ? '#dff0d8' : '#fcf8e3' 
                    }}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions?.length === 0 && (
                <tr><td colSpan="3" style={{ padding: "1rem", textAlign: "center" }}>No transactions found.</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button disabled={txnPage === 1} onClick={() => setTxnPage(p => p - 1)}>Previous</button>
            <span>Page {txnPage} of {txnTotalPages}</span>
            <button disabled={txnPage === txnTotalPages} onClick={() => setTxnPage(p => p + 1)}>Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}