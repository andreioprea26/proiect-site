import Link from "next/link";

import { listAdminReviews, REVIEW_STATUSES, type ReviewStatus } from "@/lib/reviews/server";
import { moderateReview } from "./actions";

const labels: Record<ReviewStatus, string> = { pending: "În așteptare", approved: "Aprobată", rejected: "Respinsă" };
const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status ?? "";
  const status = REVIEW_STATUSES.includes(requested as ReviewStatus) ? requested as ReviewStatus : "";
  const reviews = await listAdminReviews(status);
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-emerald-400">Moderare</p><h1 className="mt-2 text-3xl font-semibold">Recenzii</h1></div><nav className="flex flex-wrap gap-2 text-sm"><Link className="rounded-full border border-stone-700 px-3 py-1.5" href="/admin/reviews">Toate</Link>{REVIEW_STATUSES.map((item) => <Link className="rounded-full border border-stone-700 px-3 py-1.5" href={`/admin/reviews?status=${item}`} key={item}>{labels[item]}</Link>)}</nav></div><div className="mt-8 grid gap-5">{reviews.length === 0 ? <p className="rounded-xl border border-dashed border-stone-700 p-6 text-stone-400">Nu există recenzii pentru filtrul selectat.</p> : reviews.map((review) => <article className="rounded-2xl border border-stone-800 bg-stone-900 p-6" key={review.id}><div className="flex flex-wrap justify-between gap-4"><div><p className="text-sm text-emerald-400">{review.productName}</p><h2 className="mt-1 font-semibold">{review.rating}/5 · {review.authorDisplayName}</h2></div><span className="h-fit rounded-full bg-stone-800 px-3 py-1 text-xs font-semibold">{labels[review.status]}</span></div><p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-300">{review.text}</p><p className="mt-4 text-xs text-stone-500">Achiziție verificată · {dateFormatter.format(new Date(review.createdAt))}</p><div className="mt-5 flex gap-3"><form action={moderateReview}><input name="reviewId" type="hidden" value={review.id} /><input name="status" type="hidden" value="approved" /><button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold" type="submit">Aprobă</button></form><form action={moderateReview}><input name="reviewId" type="hidden" value={review.id} /><input name="status" type="hidden" value="rejected" /><button className="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold" type="submit">Respinge</button></form></div></article>)}</div></div>;
}
