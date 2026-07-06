import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;
    const sr = base44.asServiceRole;

    // 1. Delete likes the user made on any outfits
    await sr.entities.OutfitLike.deleteMany({ user_email: email });

    // 2. Delete likes from OTHER users on this user's outfits, then delete outfits
    const outfits = await sr.entities.Outfit.filter({ user_email: email });
    for (const outfit of outfits) {
      await sr.entities.OutfitLike.deleteMany({ outfit_id: outfit.id });
    }

    // 3. Delete all user-owned entities
    await sr.entities.UserProfile.deleteMany({ user_email: email });
    await sr.entities.ClothingItem.deleteMany({ user_email: email });
    await sr.entities.Outfit.deleteMany({ user_email: email });
    await sr.entities.ScheduledOutfit.deleteMany({ user_email: email });
    await sr.entities.PackingList.deleteMany({ user_email: email });

    // 4. Attempt to delete the auth account itself
    try {
      await sr.entities.User.delete(user.id);
    } catch (e) {
      console.log('Could not delete User record:', e?.message || String(e));
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});