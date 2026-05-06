import React from 'react'

function CustomerDetails() {
  return (
    <div className="border border-gray-200 rounded-md p-4 mb-6">
      <header className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-semibold font-title">
          <span>01</span>
        </div>
        <h2 className="text-lg font-title font-semibold mb-1">Détails du client</h2>

      </header>

        <div className='space-y-8'>

          <div>
            <label htmlFor="customer-name" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Nom du client</label>
            <input
              type="text"
              id="customer-name"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
              placeholder="e.g. Société ABC"
            />
          </div>

          <div>
            <label htmlFor="customer-email" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Email du client</label>
            <input
              type="email"
              id="customer-email"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
              placeholder="e.g. contact@societe-abc.com"
            />
          </div>
        </div>
    </div>
  )
}

export default CustomerDetails