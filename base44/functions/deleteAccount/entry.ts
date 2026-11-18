import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;
    const sr = base44.asServiceRole;

    // Likes other users left on this user's outfits, then the outfits themselves
    const outfits = await sr.entities.Outfit.filter({ user_email: email });
    for (const outfit of outfits) {
      await sr.entities.OutfitLike.deleteMany({ outfit_id: outfit.id });
    }

    // Everything this user owns: wardrobe, outfits, avatar/profile, calendar, packing lists, likes
    await sr.entities.OutfitLike.deleteMany({ user_email: email });
    await sr.entities.ClothingItem.deleteMany({ user_email: email });
    await sr.entities.Outfit.deleteMany({ user_email: email });
    await sr.entities.ScheduledOutfit.deleteMany({ user_email: email });
    await sr.entities.PackingList.deleteMany({ user_email: email });
    await sr.entities.UserProfile.deleteMany({ user_email: email });

    // The account itself — also ends every active session for it
    await sr.entities.User.delete(user.id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}