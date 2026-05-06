import React from 'react'
import CustomerDetails from '../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../molecules/InvoiceFormComponents/ServiceLineItems'

function InvoiceForm() {
  return (
    <div>
      <CustomerDetails />
      <ServiceLineItems />
    </div>
  )
}

export default InvoiceForm