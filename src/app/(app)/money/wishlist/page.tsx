import { getWishes } from "@/actions/wishlist";
import { getGoals } from "@/actions/goals";
import { WishlistBoard } from "@/components/modules/money/wishlist-board";

// Wishlist page. Goals are passed in so each card can show whether it is already
// being saved for (linked by name).
export default async function WishlistPage() {
  const [wishes, goals] = await Promise.all([getWishes(), getGoals()]);
  return <WishlistBoard wishes={wishes} goals={goals} />;
}
