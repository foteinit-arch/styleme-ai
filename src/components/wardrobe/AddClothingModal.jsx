import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Upload, Link, Sparkles } from "lucide-react";

const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];
const REMOVEBG_KEY = "dx2dhWT2m31UEp3NvgxYMivt";

async function removeBackground(imageUrl, isBlob = false) {
  const formData = new FormData();
  if (isBlob) {
    formData.append("image_url", imageUrl);
  } else {
    formData.append("image_url", imageUrl);
  }
  formData.append("size", "auto");
  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": REMOVEBG_KEY },
    body: formData,
  });
  if (!res.ok) throw new Error("remove.bg failed");
  return res.blob();
}

export default function AddClothingModal({ userEmail, onClose, onAdded }) {
  const [tab, setTab]           = useState("upload");
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("top");
  const [brand, setBrand]       = useState("");
  const [url, setUrl]           = useState("");
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError]       = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!name || !category) { setError("Please fill in name and category."); return; }
    setProcessing(true);
    setError("");

    let originalUrl  = "";
    let processedUrl = "";

    try {
      if (tab === "upload" && file) {
        // Upload original
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        originalUrl = file_url;
        // Remove background
        try {
          const blob = await removeBackground(file_url);
          const processed = new File([blob], "processed.png", { type: "image/png" });
          const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processed });
          processedUrl = pUrl;
        } catch {
          processedUrl = originalUrl;
        }

      } else if (tab === "url" && url) {
        originalUrl = url;
        // Remove background from URL
        try {
          const blob = await removeBackground(url);
          const processed = new File([blob], "processed.png", { type: "image/png" });
          const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processed });
          processedUrl = pUrl;
        } catch {
          processedUrl = originalUrl;
        }
      }

      const item = await base44.entities.ClothingItem.create({
        user_email:            userEmail,
        name,
        category,
        brand,
        original_image_url:   originalUrl,
        processed_image_url:  processedUrl || originalUrl,
        source:                tab === "upload" ? "upload" : "url",
        source_url:            url || originalUrl,
      });

      onAdded(item);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Clothing Item</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1"><Upload className="w-4 h-4 mr-1" /> Upload Photo</TabsTrigger>
              <TabsTrigger value="url"    className="flex-1"><Link    className="w-4 h-4 mr-1" /> From URL</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                  {preview ? (
                    <img src={preview} className="h-32 mx-auto object-contain rounded-lg" alt="preview" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
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
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Background will be removed automatically
                </p>
                {url && <img src={url} className="h-24 mt-2 object-contain rounded-lg border border-gray-100" alt="preview" onError={() => {}} />}
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

          <Button onClick={handleSubmit} disabled={processing} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {processing ? (
              <><Sparkles className="mr-2 w-4 h-4 animate-spin" /> Processing...</>
            ) : "Add to Wardrobe"}
          </Button>
        </div>
      </div>
    </div>
  );
}
