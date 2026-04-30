'use client';

import { Service } from '@/app/types';
import { X } from 'lucide-react'
import React from 'react'
import ServiceCard from './ServiceCard';

interface AddServiceFormProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

function AddServiceForm({ isActive, setIsActive }: AddServiceFormProps) {
  function closeForm() {
    setIsActive(false);
  }

  const [previewService, setPreviewService] = React.useState<Service>({
    id: 'PREVIEW',
    name: '',
    description: '',
    category: '',
    unitPrice: 0,
    unit: '',
    taxRate: 0,
  });

  function handleServiceChange(field: keyof Service, value: string | number) {
    setPreviewService((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setPreviewService({
      id: 'PREVIEW',
      name: '',
      description: '',
      category: '',
      unitPrice: 0,
      unit: '',
      taxRate: 0,
    });
  }

  if(!isActive) {
    return null;
  }

  return (
    <>
      <div className="dark-layer fixed z-20 inset-0 bg-black/50 backdrop-blur-lg"></div>
      <div className="fixed z-30 inset-0 flex items-center justify-center p-4 ">
        <div className="form-container bg-white rounded-md shadow-lg overflow-y-auto max-h-160 w-full max-w-220 md:flex md:flex-row-reverse">
          <form className="p-6 w-full md:w-4/6 md:h-full">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-title font-black text-zinc-700">Créer un service</h2>
              <X onClick={() => {
                closeForm();
                resetForm();
                }} />
            </div>
            <p className="text-sm text-gray-400 mb-6">Remplissez les détails pour votre catalogue</p>
            
            {/* Champs principaux */}
            <div className='space-y-4'>
              <div className="flex flex-col gap-2">
                <label htmlFor="service-name" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Nom du service</label>
                <input
                  type="text"
                  id="service-name"
                  name="name"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: Pose de carrelage'
                  onChange={(e) => handleServiceChange('name', e.target.value)}
                  value={previewService.name}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="service-description" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Description</label>
                <textarea
                  id="service-description"
                  name="description"
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: Pose de carrelage sur-mesure.'
                  onChange={(e) => handleServiceChange('description', e.target.value)}
                  value={previewService.description}
                >
                </textarea>
              </div>


              <div className="flex flex-col gap-2">
                <label htmlFor="service-category" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Catégorie</label>
                <input
                  type="text"
                  id="service-category"
                  name='category'
                  className="border-b border-gray-300 py-2 px-3 focus:outline-none"
                  placeholder='ex: Artisanat'
                  onChange={(e) => handleServiceChange('category', e.target.value)}
                  value={previewService.category}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">

              <div className="flex flex-col gap-2 mt-4 md:flex-row md:gap-6">
                <div className="flex flex-col gap-2 md:w-1/2">
                  <label htmlFor="service-unit-price" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Prix unitaire</label>
                  <input
                    type="number"
                    id="service-unit-price"
                    name='unitPrice'
                    className="bg-custom-gray-dark border-b border-gray-300 rounded-tr-md rounded-tl-md py-2 px-3 focus:outline-none"
                    placeholder='ex: 50'
                    min={0}
                    onChange={(e) => handleServiceChange('unitPrice', e.target.value)}
                    value={previewService.unitPrice}
                  />
                </div>

                <div className="flex flex-col gap-2 md:w-1/2">
                  <label htmlFor="service-unit" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">Unité</label>
                  <input
                    type="text"
                    id="service-unit"
                    name='unit'
                    className="bg-custom-gray-dark border-b border-gray-300 rounded-tr-md rounded-tl-md py-2 px-3 focus:outline-none"
                    placeholder='ex: m²'
                    onChange={(e) => handleServiceChange('unit', e.target.value)}
                    value={previewService.unit}
                  />
                </div>
              </div>

              {/* TVA */}
              <div className="flex flex-col gap-2">
                <label htmlFor="service-tax-rate" className="uppercase text-gray-600 text-xs font-title font-semibold tracking-wide">TVA</label>
                <input
                  type="number"
                  id="service-tax-rate"
                  name='taxRate'
                  className="bg-custom-gray-dark border-b border-gray-300 rounded-tr-md rounded-tl-md py-2 px-3 focus:outline-none"
                  placeholder='ex: 5.5'
                  min={0}
                  step="0.01"
                  onChange={(e) => handleServiceChange('taxRate', e.target.value)}
                  value={previewService.taxRate}
                />
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button className="bg-primary hover:bg-bg-secondary text-white py-2 px-4 rounded-md focus:outline-none">
                Créer le service
              </button>
            </div>
          </form>

          <div className="preview bg-custom-gray-light p-6 w-full md:w-2/6 md:h-150">
            <span className="uppercase text-gray-300 text-xs font-title font-semibold tracking-wide">Aperçu direct</span>
            <div className="mt-4">
              <ServiceCard service={previewService} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddServiceForm