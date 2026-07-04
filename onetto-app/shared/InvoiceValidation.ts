import { Client } from "@/app/types";
import { InvoiceClientError, InvoiceDateError } from "./invoiceErrorsTypes";
import { err, ok, Result } from "./result";

export function verifyDates({
    creationDate,
    dueDate
  } : {
    creationDate: string,
    dueDate: string
  }) : Result<boolean, InvoiceDateError> {

    const errors: InvoiceDateError = {};
    if(!creationDate || creationDate === ""){
      errors.creationDate?.push("La date de création est manquante")
    }

    if(!dueDate || dueDate === ""){
      errors.dueDate?.push("La date d'échéance est manquante")
    }

    const creationDateObj : Date = new Date(creationDate);
    const dueDateObj : Date = new Date(dueDate);
    const now : Date = new Date();

    if(creationDateObj < now){
      errors.creationDate?.push("La date de création ne peut pas être antérieur à aujourd'hui.")
    }

    if(dueDateObj < now){
      errors.dueDate?.push("La date d'échéance ne peut pas être antérieur à aujourd'hui.")
    }

    if(creationDateObj > dueDateObj){
      errors.creationDate?.push("La date de création ne peut pas être postérieur à la date d'échéance.")
    }

    if(errors.creationDate || errors.dueDate) {
      return err(errors)
    }

    return ok(true);
  }

  export function verifyClient(client: Client | null): Result<boolean, InvoiceClientError>{
    const errors: InvoiceClientError = {
      general: ["test"]
    };

    if(!client) {
      errors.general?.push("Les informations du client sont manquantes");
      return err(errors);
    }

    for(const key in client){
      const clientKey = key as keyof Client;
      console.log(client[clientKey]);

      if(client[clientKey].length === 0 || client[clientKey] === ""){
        const errorKey = clientKey as keyof InvoiceClientError;
        errors[errorKey]?.push(`${clientKey} ne peut pas être vide.`)
      }
    }

    errors.general?.push("Veuillez remplir toutes les informations du client avant de continuer.");

    const hasErrors = Object.values(errors).some((errorArray) => errorArray && errorArray.length > 0)

    if(hasErrors) {
      return err(errors);
    }

    return ok(true)
  }