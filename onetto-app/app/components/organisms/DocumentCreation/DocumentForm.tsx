import React from 'react'
import CustomerDetails from '../../molecules/DocumentFormComponents/CustomerDetails'
import ServiceLineItems from '../../molecules/DocumentFormComponents/ServiceLineItems'
import { Client, DocumentDates, Service, ServiceLineItem } from '@/app/types';
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from '@/shared/DocumentErrorsTypes';


interface DocumentFormProps {
  client?: Client | null;
  lineItems?: ServiceLineItem[];
  documentDates?: DocumentDates
  onClientChange: (client: Client | null) => void;
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onDocumentDatesChange: (dates: DocumentDates) => void;
  errors?: {
    documentDateErrors?: DocumentDateError,
    documentClientErrors?: DocumentClientError,
    documentLineItemsErrors?: DocumentLineItemsError
  }
}

function DocumentForm({ client, lineItems, documentDates, onClientChange, onLineItemsChange, onDocumentDatesChange, errors }: DocumentFormProps) {
  
  return (
    <div className="">
      <CustomerDetails client={client} onClientChange={onClientChange} documentClientErrors={errors?.documentClientErrors} />
      <ServiceLineItems hydratedLineItems={lineItems} hydratedDocumentDates={documentDates} onLineItemsChange={onLineItemsChange} onDocumentDatesChange={onDocumentDatesChange} documentDateErrors={errors?.documentDateErrors} documentLineItemsErrors={errors?.documentLineItemsErrors} />
    </div>
  )
}

export default DocumentForm
