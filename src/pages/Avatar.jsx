import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Upload, Save, User, Ruler, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
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
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, data);
    } else {
      const created = await base44.entities.UserProfile.create(data);
      setProfile(created);
    }
    setSaving(false);
    toast({ title: "Avatar saved!", description: "Your profile has been updated.", duration: 3000 });
  };

  const handleGenerateAvatar = async () => {
    if (!form.avatar_photo_url) return;
    setGenerating(true);
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: `Full body fashion avatar of this exact person. She is wearing a plain skin-toned seamless bodysuit, no patterns, no clothing details. Relaxed standing pose, arms relaxed at sides, facing forward, full body head to toe visible, plain white background. Match her face, hair colour and skin tone from the photo exactly.`,
      existing_image_urls: [form.avatar_photo_url],
    });
    setForm((f) => ({ ...f, avatar_generated_url: url }));
    setGenerating(false);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const measurementsAreFresh = profile && (
    profile.bust_cm !== 88 || profile.waist_cm !== 68 || profile.hips_cm !== 94
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <User className="text-orange-500" /> My Avatar
        </h1>
        <p className="text-gray-500 mb-6">Fine-tune your measurements first — they control how clothes fit your avatar.</p>

        {/* Prominent callout if measurements haven't been set */}
        {!measurementsAreFresh && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 mb-6">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800">Set your measurements before uploading your photo</p>
              <p className="text-sm text-orange-600 mt-0.5">
                Bust, waist, and hips tell the app how to scale clothes onto your body. Don't skip this step!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: form — Measurements FIRST */}
          <div className="space-y-6">

            {/* ① Measurements — shown first so users see it */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-orange-300">
              <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-orange-500" />
                <span>Measurements</span>
                <span className="ml-auto text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Step 1</span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">These numbers scale clothes to your body on the builder.</p>
              <div className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <Input value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. Sofia" className="mt-1" />
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
                      <Label>{label}</Label>
                      <span className="text-sm font-medium text-orange-500">{form[key]}</span>
                    </div>
                    <Slider min={min} max={max} step={1} value={[form[key]]} onValueChange={([v]) => set(key, v)} />
                  </div>
                ))}
              </div>
            </div>

            {/* ② Photo upload — shown second */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Body Photo</span>
                <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Step 2</span>
              </h2>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                  {form.avatar_photo_url ? (
                    <img src={form.avatar_photo_url} className="h-40 mx-auto object-contain rounded-lg" alt="avatar" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload a full-body photo</p>
                      <p className="text-xs text-gray-400 mt-1">Best: stand straight, neutral background</p>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {uploading && <p className="text-sm text-orange-400 mt-2 text-center">Uploading...</p>}
              {form.avatar_photo_url && (
                <Button
                  onClick={handleGenerateAvatar}
                  disabled={generating}
                  variant="outline"
                  className="w-full mt-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles className={`mr-2 w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "Generating avatar..." : "Generate My Avatar"}
                </Button>
              )}
              {form.avatar_generated_url && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1 text-center">Generated Avatar</p>
                  <img src={form.avatar_generated_url} className="h-40 mx-auto object-contain rounded-lg border border-gray-100" alt="generated avatar" />
                </div>
              )}
            </div>

            {/* ③ Appearance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4">Appearance</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Skin Tone</Label>
                  <Select value={form.skin_tone} onValueChange={v => set("skin_tone", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["light","medium-light","medium","medium-dark","dark"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Body Shape</Label>
                  <Select value={form.body_shape} onValueChange={v => set("body_shape", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["hourglass","pear","apple","rectangle","inverted-triangle"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hair Color</Label>
                  <input type="color" value={form.hair_color} onChange={e => set("hair_color", e.target.value)}
                    className="mt-1 w-full h-10 rounded-lg border border-gray-200 cursor-pointer" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-3">
              <Save className="mr-2 w-5 h-5" /> {saving ? "Saving..." : "Save Avatar"}
            </Button>
          </div>

          {/* Right: preview */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 w-full flex flex-col items-center">
              <h2 className="font-semibold text-gray-800 mb-6">Avatar Preview</h2>
              <AvatarPreview profile={form} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
