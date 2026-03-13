import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Upload, Link, Sparkles } from "lucide-react";

const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];

export default function AddClothingModal({ userEmail, onClose, onAdded }) {
  const [tab, setTab] = useState("upload");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("top");
  const [brand, setBrand] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const processWithAI = async (imageUrl) => {
    // Use AI to remove background and clean up the clothing image
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fashion image processor. The image at this URL contains a clothing item. 
               Describe it briefly and confirm it's a clothing item. Return JSON with: 
               { "is_clothing": boolean, "suggested_name": string, "suggested_category": string }
               Categories: top, bottom, dress, outerwear, shoes, accessory, underwear, bag`,
      file_urls: [imageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_clothing: { type: "boolean" },
          suggested_name: { type: "string" },
          suggested_category: { type: "string" }
        }
      }
    });
    return result;
  };

  const handleSubmit = async () => {
    if (!name || !category) { setError("Please fill in name and category."); return; }
    setProcessing(true);
    setError("");

    let originalUrl = "";
    let processedUrl = "";

    if (tab === "upload" && file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      originalUrl = file_url;
      // AI background removal
      try {
        const { image_url: cleanedUrl } = await base44.integrations.Core.RemoveImageBackground({ image_url: originalUrl });
        processedUrl = cleanedUrl;
      } catch {
        processedUrl = originalUrl;
      }
    } else if (tab === "url" && url) {
      originalUrl = url;
      // Fetch the image as a blob, upload it, then do AI background removal
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const fileFromUrl = new File([blob], "clothing.jpg", { type: blob.type || "image/jpeg" });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileFromUrl });
        const { url: cleaned } = await base44.integrations.Core.GenerateImage({
          prompt: `Extract only the clothing item from this image and place it on a pure transparent/white background. Show just the garment, no person, no background, no shadows. Clean product photo cutout.`,
          existing_image_urls: [file_url]
        });
        processedUrl = cleaned;
        originalUrl = file_url;
      } catch {
        processedUrl = url;
      }
    }

    const item = await base44.entities.ClothingItem.create({
      user_email: userEmail,
      name,
      category,
      brand,
      original_image_url: originalUrl,
      processed_image_url: processedUrl || originalUrl,
      source: tab === "upload" ? "upload" : "url",
      source_url: url || originalUrl,
    });

    setProcessing(false);
    onAdded(item);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">Add Clothing Item</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1"><Upload className="w-4 h-4 mr-1" /> Upload Photo</TabsTrigger>
              <TabsTrigger value="url" className="flex-1"><Link className="w-4 h-4 mr-1" /> From URL</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-rose-200 rounded-xl p-6 text-center hover:bg-rose-50 transition">
                  {preview ? (
                    <img src={preview} className="h-32 mx-auto object-contain rounded-lg" alt="preview" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-rose-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload clothing photo</p>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </TabsContent>
            <TabsContent value="url" className="mt-4">
              <div>
                <Label>Image URL (from any website, Pinterest, etc.)</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://..." className="mt-1" />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI will clean up the background automatically
                </p>
                {url && <img src={url} className="h-24 mt-2 object-contain rounded-lg border" alt="preview" onError={() => {}} />}
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Item Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. White blouse" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Brand (optional)</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Zara" className="mt-1" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSubmit} disabled={processing} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
            {processing ? (
              <><Sparkles className="mr-2 w-4 h-4 animate-spin" /> AI is processing...</>
            ) : "Add to Wardrobe"}
          </Button>
        </div>
      </div>
    </div>
  );
}