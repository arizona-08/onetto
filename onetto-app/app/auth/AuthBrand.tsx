import Image from "next/image";
import Link from "next/link";

export default function AuthBrand() {
  return (
    <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 font-title text-3xl font-semibold tracking-tight text-ui-text">
      <Image src="/logos/Onetto logo purple.svg" alt="" width={42} height={42} unoptimized />
      Onetto
    </Link>
  );
}
