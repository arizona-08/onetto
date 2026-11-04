import { getPublicPaymentServer } from "@/lib/documents/document.server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/payment", request.url));
  }

  const payment = await getPublicPaymentServer(token);
  if (payment.ok && payment.data.paymentLink) {
    return NextResponse.redirect(payment.data.paymentLink);
  }
  return NextResponse.redirect(
    new URL(`/payment?token=${encodeURIComponent(token)}`, request.url),
  );
}
