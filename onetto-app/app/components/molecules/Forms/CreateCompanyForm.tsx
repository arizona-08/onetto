import { CreateCompanyDto } from '@/lib/companies/dtos/create-company.dto';
import React, { useState } from 'react'

interface CreateCompanyFormProps {
  companyOwnerId?: string;
}
function CreateCompanyForm({ companyOwnerId }: CreateCompanyFormProps) {

  const [companyInfos, setCompanyInfos] = useState<CreateCompanyDto>({
    name: "",
    email: "",
    phoneNumber: "",
    siren: "",
    siret: "",
    address: "",
    postalCode: "",
    city: "",
    country: "",
    subjectToVat: false,
    vatNumber: "",
    IBAN: "",
    BIC: ""
  });

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    setCompanyInfos(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    // Handle form submission logic here
  }

  return (
    <div>
      <form>

      </form>
    </div>
  )
}

export default CreateCompanyForm