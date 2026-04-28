import React from 'react'

function InvoiceTable() {
  return (
    <div className="rounded-lg overflow-hidden mt-6">
      <table className="w-full border-collapse border border-zinc-200 ">
        <thead className="bg-slate-200">
          <tr>
            <th>Facture</th>
            <th>Client</th>
            <th>Date</th>
            <th>Montant</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>F001</td>
            <td>Client 1</td>
            <td>2023-10-01</td>
            <td>€1,234.56</td>
            <td>Payé</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default InvoiceTable