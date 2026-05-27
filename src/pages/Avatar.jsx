import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Upload, Save, User, Ruler, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AvatarPreview from "@/components/avatar/AvatarPreview";

export default function Avatar() {
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    height_cm: 165,
    weight_kg: 60,
    bust_cm: 88,
    waist_cm: 68,
    hips_cm: 94,
    skin_tone: "medium",
    hair_color: "#3b1f0a",
    body_shape: "hourglass",
    avatar_photo_url: "",
    avatar_generated_url: "",
  });

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      base44.entities.UserProfile.filter({ user_email: u.email }).then((profiles) => {
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          setForm((f) => ({ ...f, ...p }));
        }
      });
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, avatar_photo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, user_email: user.email };
    let savedProfile;
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, data);
      savedProfile = { ...profile, ...data };
    } else {
      savedProfile = await base44.entities.UserProfile.create(data);
      setProfile(savedProfile);
    }
    window.dispatchEvent(new CustomEvent('avatar-updated', { detail: savedProfile }));
    setSaving(false);
    toast.success("Avatar saved!");
  };

  const handleGenerateAvatar = async () => {
    if (!form.avatar_photo_url) return;
    setGenerating(true);
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: `Edit this photo: keep the person completely identical — same face, same hair, same skin, same body proportions. Only change: 1) replace whatever they are wearing with a plain neutral-colored form-fitting outfit (leggings and fitted top) so the body shape is clearly visible, 2) make the background plain white. Do NOT change the person's face, hair, or any physical features at all. Full body visible from head to toe.`,
      existing_image_urls: [form.avatar_photo_url],
    });
    const updatedForm = { ...form, avatar_generated_url: url };
    setForm(updatedForm);
    if (profile) {
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { ...profile, avatar_generated_url: url } }));
    }
    setGenerating(false);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleClearAvatar = async () => {
    setForm((f) => ({ ...f, avatar_generated_url: "" }));
    if (profile) {
      const updated = { ...profile, avatar_generated_url: "" };
      await base44.entities.UserProfile.update(profile.id, { avatar_generated_url: "" });
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: updated }));
    }
  };

  const measurementsAreFresh = profile && (
    profile.bust_cm !== 88 || profile.waist_cm !== 68 || profile.hips_cm !== 94
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading font-bold text-2xl text-white tracking-tight mb-1 flex items-center gap-3">
          <User className="text-[#e8b820] w-5 h-5 shrink-0" /> My avatar
        </h1>
        <p className="text-white/50 mb-6 font-body">Fine-tune your measurements first — they control how clothes fit your avatar.</p>

        {/* Prominent callout if measurements haven't been set */}
        {!measurementsAreFresh && (
          <div className="flex items-start gap-3 bg-yellow-300/10 border border-yellow-300/30 rounded-2xl px-5 py-4 mb-6">
            <AlertCircle className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-200">Set your measurements before uploading your photo</p>
              <p className="text-sm text-white/50 mt-0.5">
                Bust, waist, and hips tell the app how to scale clothes onto your body. Don't skip this step!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: form — Measurements FIRST */}
          <div className="space-y-6">

            {/* ① Measurements — shown first so users see it */}
            <div className="bg-white/5 rounded-2xl p-6 border-2 border-yellow-300/50">
              <h2 className="font-heading font-bold uppercase text-white text-xl mb-1 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-yellow-300" />
                <span>Measurements</span>
                <span className="ml-auto text-xs font-body font-medium bg-yellow-300/20 text-yellow-300 px-2 py-0.5 rounded-full">Step 1</span>
              </h2>
              <p className="text-xs text-white/40 mb-4 font-body">These numbers scale clothes to your body on the builder.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70">Display Name</Label>
                  <Input value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. Sofia" className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30" />
                </div>
                {[
                  { label: "Height (cm)", key: "height_cm", min: 140, max: 210 },
                  { label: "Bust (cm)",   key: "bust_cm",   min: 60,  max: 140 },
                  { label: "Waist (cm)",  key: "waist_cm",  min: 50,  max: 130 },
                  { label: "Hips (cm)",   key: "hips_cm",   min: 70,  max: 150 },
                  { label: "Weight (kg)", key: "weight_kg", min: 40,  max: 150 },
                ].map(({ label, key, min, max }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <Label className="text-white/70">{label}</Label>
                      <span className="text-sm font-medium text-[#d4a017]">{form[key]}</span>
                    </div>
                    <Slider min={min} max={max} step={1} value={[form[key]]} onValueChange={([v]) => set(key, v)} />
                  </div>
                ))}
              </div>
            </div>

            {/* ② Photo upload — shown second */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="font-heading font-bold uppercase text-white text-xl mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-yellow-300" />
                <span>Body Photo</span>
                <span className="ml-auto text-xs font-body font-medium bg-white/10 text-white/50 px-2 py-0.5 rounded-full">Step 2</span>
              </h2>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition">
                  {form.avatar_photo_url ? (
                    <img src={form.avatar_photo_url} className="h-40 mx-auto object-contain rounded-lg" alt="avatar" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-white/20 mx-auto mb-2" />
                      <p className="text-sm text-white/50">Click to upload a full-body photo</p>
                      <p className="text-xs text-white/30 mt-1">Best: stand straight, neutral background</p>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {uploading && <p className="text-sm text-yellow-300 mt-2 text-center">Uploading...</p>}
              {form.avatar_photo_url && (
                <div className="space-y-2 mt-3">
                  <Button
                    onClick={handleGenerateAvatar}
                    disabled={generating}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <Sparkles className={`mr-2 w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                    {generating ? "Generating avatar..." : "Generate My Avatar"}
                  </Button>
                  <Button
                    onClick={handleClearAvatar}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                  >
                    <Trash2 className="mr-2 w-4 h-4" />
                    Clear & Start Over
                  </Button>
                </div>
              )}
              {form.avatar_generated_url && (
                <div className="mt-3">
                  <p className="text-xs text-white/30 mb-1 text-center">Generated Avatar</p>
                  <img src={form.avatar_generated_url} className="h-40 mx-auto object-contain rounded-lg border border-white/10" alt="generated avatar" />
                </div>
              )}
            </div>

            {/* ③ Appearance */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="font-heading font-bold uppercase text-white text-xl mb-4">Appearance</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Skin Tone</Label>
                  <Select value={form.skin_tone} onValueChange={v => set("skin_tone", v)}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["light","medium-light","medium","medium-dark","dark"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70">Body Shape</Label>
                  <Select value={form.body_shape} onValueChange={v => set("body_shape", v)}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["hourglass","pear","apple","rectangle","inverted-triangle"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70">Hair Color</Label>
                  <input type="color" value={form.hair_color} onChange={e => set("hair_color", e.target.value)}
                    className="mt-1 w-full h-10 rounded-lg border border-white/20 cursor-pointer bg-white/5" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-bold text-lg py-3">
              <Save className="mr-2 w-5 h-5" /> {saving ? "Saving..." : "Save Avatar"}
            </Button>

            {/* Delete Account */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 bg-transparent mt-2">
                  <Trash2 className="mr-2 w-4 h-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a1a1a] border border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    This will permanently delete your account and all your data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => base44.auth.logout(createPageUrl ? createPageUrl("Home") : "/")}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Right: preview */}
          <div className="flex flex-col items-center">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 w-full flex flex-col items-center">
              <h2 className="font-heading font-bold uppercase text-white text-xl mb-6">Avatar Preview</h2>
              <AvatarPreview profile={form} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}