import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await req.json();
    
    // Fetch the image from URL and convert to blob
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.arrayBuffer();
    
    // Convert to base64 for the integration
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBlob)));
    const dataUrl = `data:image/png;base64,${base64}`;
    
    // Upload using the integration
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: dataUrl });
    
    // Update user profile with the uploaded URL
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, { avatar_generated_url: file_url });
    }
    
    return Response.json({ success: true, file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});