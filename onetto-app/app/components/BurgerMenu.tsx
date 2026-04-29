import React from 'react'
interface BurgerMenuProps {
  trigger: () => void
}
function BurgerMenu({ trigger }: BurgerMenuProps) {
  return (
    <div className="relative w-6 h-4 lg:hidden cursor-pointer" onClick={trigger}>
      <span className="block w-full h-0.5 bg-zinc-700 absolute left-0 top-0"></span>
      <span className="block w-full h-0.5 bg-zinc-700 absolute left-0 top-1/2"></span>
      <span className="block w-full h-0.5 bg-zinc-700 absolute left-0 top-full"></span>
    </div>
  )
}

export default BurgerMenu