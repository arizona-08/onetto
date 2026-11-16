import React from "react";
interface BurgerMenuProps {
  trigger: () => void;
  expanded: boolean;
}
function BurgerMenu({ trigger, expanded }: BurgerMenuProps) {
  return (
    <button
      type="button"
      aria-label={expanded ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
      aria-expanded={expanded}
      aria-controls="app-navigation"
      className="relative h-10 w-10 shrink-0 rounded-xl text-[#34364A] transition-colors hover:bg-[#EEEFFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      onClick={trigger}
    >
      <span className="absolute left-2.5 top-3 block h-0.5 w-5 rounded-full bg-current" />
      <span className="absolute left-2.5 top-[19px] block h-0.5 w-5 rounded-full bg-current" />
      <span className="absolute left-2.5 top-[26px] block h-0.5 w-5 rounded-full bg-current" />
    </button>
  );
}

export default BurgerMenu;
