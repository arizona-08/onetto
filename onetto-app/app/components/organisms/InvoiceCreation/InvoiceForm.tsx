import React from 'react'
import CustomerDetails from '../../molecules/InvoiceFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/InvoiceFormComponents/ServiceLineItems'


function InvoiceForm() {
  return (
    <div className="">
      <CustomerDetails />
      <ServiceLineItems />
    </div>
  )
}

export default InvoiceForm