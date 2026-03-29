import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await req.json();
    
    // Update user profile directly with the image URL
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, { avatar_generated_url: imageUrl });
      return Response.json({ success: true, file_url: imageUrl });
    }
    
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});