import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Upload, Link, Sparkles, FolderOpen, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];
const REMOVEBG_KEY = "dx2dhWT2m31UEp3NvgxYMivt";

async function removeBackground(imageSource, useFile = false) {
  const formData = new FormData();
  if (useFile) {
    formData.append("image_file", imageSource);
  } else {
    formData.append("image_url", imageSource);
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
  const [uploadedUrl, setUploadedUrl] = useState(""); // proxied/uploaded version of the URL
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState("");
  const [processing, setProcessing] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [error, setError]       = useState("");

  // Bulk upload state
  const [bulkFiles, setBulkFiles]   = useState([]);
  const [bulkProgress, setBulkProgress] = useState([]); // per-file: "pending"|"processing"|"done"|"error"
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("top");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const convertAvifToJpeg = (f) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        resolve(new File([blob], f.name.replace(/\.avif$/i, ".jpg"), { type: "image/jpeg" }));
      }, "image/jpeg", 0.95);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(f);
  });

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    setUploadedUrl("");
  };

  const isProductPageUrl = (u) => {
    // Detect product page URLs (not direct image URLs)
    const imagePattern = /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i;
    return !imagePattern.test(u.split('?')[0]);
  };

  const handleUrlFetch = async () => {
    if (!url) return;

    // If it's a product page URL, show instructions immediately — don't spin
    if (isProductPageUrl(url)) {
      setError("This looks like a product page, not a direct image URL.\n\nTo get the image URL: right-click the product photo on the website → \"Copy image address\" → paste that URL here.");
      return;
    }

    setUrlLoading(true);
    setUploadedUrl("");
    setError("");
    try {
      // Try direct fetch first (works for public CDN images)
      const res = await fetch(url);
      if (!res.ok) throw new Error("direct fetch failed");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not an image");
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const f = new File([blob], `url-image.${ext}`, { type: blob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setUploadedUrl(file_url);
    } catch {
      // Fall back to server-side proxy for CORS-blocked CDN images
      try {
        const { data } = await base44.functions.invoke("proxyImage", { image_url: url });
        if (data?.file_url) {
          setUploadedUrl(data.file_url);
        } else {
          setError("Could not load image. Please right-click the product image → \"Copy image address\" and paste that URL.");
        }
      } catch {
        setError("Could not load image. Please right-click the product image → \"Copy image address\" and paste that URL.");
      }
    } finally {
      setUrlLoading(false);
    }
  };

  const handleBulkFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBulkFiles(files);
    setBulkProgress(files.map(() => "pending"));
  };

  const processSingleFile = async (f, idx) => {
    setBulkProgress(prev => { const n = [...prev]; n[idx] = "processing"; return n; });
    try {
      const uploadFile = f.type === "image/avif" ? await convertAvifToJpeg(f) : f;
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      let processedUrl = file_url;
      try {
        const { url: generatedUrl } = await base44.integrations.Core.GenerateImage({
          prompt: "Extract only the clothing item from this photo. Show the garment as a ghost mannequin style with no person, no body, no skin, no white blocks or artifacts visible. Pure white background only. Keep all fabric details, color and texture exactly as they are. Remove any background elements completely.",
          existing_image_urls: [file_url],
        });
        const blob = await removeBackground(generatedUrl);
        const processed = new File([blob], "processed.png", { type: "image/png" });
        const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processed });
        processedUrl = pUrl;
      } catch { /* keep original */ }

      const itemName = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const item = await base44.entities.ClothingItem.create({
        user_email: userEmail,
        name: itemName,
        category: bulkCategory,
        original_image_url: file_url,
        processed_image_url: processedUrl,
        source: "upload",
        source_url: file_url,
      });
      onAdded(item);
      setBulkProgress(prev => { const n = [...prev]; n[idx] = "done"; return n; });
    } catch {
      setBulkProgress(prev => { const n = [...prev]; n[idx] = "error"; return n; });
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkFiles.length) return;
    setBulkRunning(true);
    for (let i = 0; i < bulkFiles.length; i++) {
      await processSingleFile(bulkFiles[i], i);
    }
    setBulkRunning(false);
  };

  const handleSubmit = async () => {
    if (!name || !category) { setError("Please fill in name and category."); return; }
    setProcessing(true);
    setError("");

    let originalUrl  = "";
    let processedUrl = "";

    try {
      if (tab === "upload" && file) {
        // Convert AVIF to JPEG if needed
        const uploadFile = file.type === "image/avif" ? await convertAvifToJpeg(file) : file;
        // Upload original
        const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
        originalUrl = file_url;
        // Generate clean garment image, then remove background
        try {
          const { url: generatedUrl } = await base44.integrations.Core.GenerateImage({
            prompt: "Extract only the clothing item from this photo. Show the garment as a ghost mannequin style with no person, no body, no skin, no white blocks or artifacts visible. Pure white background only. Keep all fabric details, color and texture exactly as they are. Remove any background elements completely.",
            existing_image_urls: [file_url],
          });
          const blob = await removeBackground(generatedUrl);
          const processed = new File([blob], "processed.png", { type: "image/png" });
          const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processed });
          processedUrl = pUrl;
        } catch {
          processedUrl = originalUrl;
        }

      } else if (tab === "url" && url) {
        // First, proxy the image server-side to get a hosted URL
        let sourceUrl = uploadedUrl;
        if (!sourceUrl) {
          try {
            const { data } = await base44.functions.invoke("proxyImage", { image_url: url });
            sourceUrl = data?.file_url || url;
          } catch {
            sourceUrl = url;
          }
        }
        originalUrl = sourceUrl;
        // Remove background from the proxied image
        try {
          const blob = await removeBackground(sourceUrl);
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
          <h2 className="text-lg font-bold text-gray-900">{tab === "bulk" ? "Bulk Upload" : "Add Clothing Item"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1"><Upload className="w-4 h-4 mr-1" /> Upload Photo</TabsTrigger>
              <TabsTrigger value="url"    className="flex-1"><Link    className="w-4 h-4 mr-1" /> From URL</TabsTrigger>
              <TabsTrigger value="bulk"   className="flex-1"><FolderOpen className="w-4 h-4 mr-1" /> Bulk</TabsTrigger>
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
                <div className="flex gap-2 mt-1">
                  <Input value={url} onChange={handleUrlChange} placeholder="https://..." className="flex-1" onKeyDown={e => e.key === "Enter" && handleUrlFetch()} />
                  <Button type="button" onClick={handleUrlFetch} disabled={!url || urlLoading} className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white px-3">
                    {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Paste a direct image URL (right-click image → "Copy image address")
                </p>
                {uploadedUrl && !urlLoading && (
                  <img src={uploadedUrl} className="h-24 mt-2 object-contain rounded-lg border border-gray-100" alt="preview" />
                )}
                {error && tab === "url" && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 whitespace-pre-line">{error}</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="bulk" className="mt-4 space-y-4">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                  <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Click to select multiple images</p>
                  <p className="text-xs text-gray-400 mt-1">Items will be named from filenames automatically</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFileChange} />
              </label>

              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Category for all items</Label>
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                    {bulkFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1">
                        {bulkProgress[i] === "pending"    && <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
                        {bulkProgress[i] === "processing" && <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />}
                        {bulkProgress[i] === "done"       && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {bulkProgress[i] === "error"      && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span className="truncate text-gray-700">{f.name}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleBulkSubmit}
                    disabled={bulkRunning}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {bulkRunning ? (
                      <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Processing {bulkProgress.filter(s => s === "done").length}/{bulkFiles.length}...</>
                    ) : `Upload ${bulkFiles.length} item${bulkFiles.length > 1 ? "s" : ""}`}
                  </Button>
                  {bulkProgress.every(s => s === "done" || s === "error") && !bulkRunning && (
                    <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className={`grid grid-cols-2 gap-3 ${tab === "bulk" ? "hidden" : ""}`}>
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

          <div className={tab === "bulk" ? "hidden" : ""}>
            <Label>Brand (optional)</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Zara" className="mt-1" />
          </div>

          {error && tab === "upload" && <p className="text-sm text-red-500">{error}</p>}

          {tab !== "bulk" && <Button onClick={handleSubmit} disabled={processing} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {processing ? (
              <><Sparkles className="mr-2 w-4 h-4 animate-spin" /> Processing...</>
            ) : "Add to Wardrobe"}
          </Button>}
        </div>
      </div>
    </div>
  );
}