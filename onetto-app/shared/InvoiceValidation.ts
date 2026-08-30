import { Client, ServiceLineItem } from "@/app/types";
import { DocumentClientError, DocumentDateError, DocumentLineItemsError } from "./DocumentErrorsTypes";
import { err, ok, Result } from "./result";

export function verifyDates({ dueDate }: { dueDate: string }): Result<boolean, DocumentDateError> {

    const errors: DocumentDateError = {};
    if(!dueDate || dueDate === ""){
      errors.dueDate = ["La date d'échéance est manquante"]
    }

    if (errors.dueDate) {
      return err(errors);
    }

    const dueDateObj : Date = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);

    const now : Date = new Date();
    now.setHours(0, 0, 0, 0);
    

    if(dueDateObj < now){
      errors.dueDate = ["La date d'échéance ne peut pas être antérieur à aujourd'hui."]
    }

    if(errors.dueDate) {
      return err(errors)
    }

    return ok(true);
  }

export function verifyClient(client: Client | null): Result<boolean, DocumentClientError>{
  const errors: DocumentClientError = {};

  if(!client) {
    errors.general = ["Les informations du client sont manquantes"];
    return err(errors);
  }

  for(const key in client){
    const clientKey = key as keyof Client;

    if (['id', 'siren', 'vatNumber', 'electronicAddress', 'electronicAddressScheme'].includes(clientKey)) continue;

    if(String(client[clientKey] ?? '').length === 0){
      const errorKey = clientKey as keyof DocumentClientError;
      errors[errorKey] = [(`${clientKey} ne peut pas être vide.`)]
    }
  }

  const hasErrors = Object.values(errors).some((errorArray) => errorArray && errorArray.length > 0)

  if(hasErrors) {
    return err(errors);
  }

  return ok(true)
}

export function verifyLineItems(lineItems: ServiceLineItem[]): Result<boolean, DocumentLineItemsError> {
  const errors: DocumentLineItemsError = {};

  if(lineItems.length === 0){
    errors.general = ["La facture doit contenir au moins un service."];
    return err(errors);
  }

  const hasErrors = Object.keys(errors).length > 0;

  if(hasErrors) {
    return err(errors);
  }

  return ok(true);
}
