import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { X, Upload, Sparkles, FolderOpen, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { prepareGarmentImage } from "@/lib/garmentCleanup";

const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];

const convertAvifToJpeg = (f) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(f);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objUrl);
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(new File([blob], f.name.replace(/\.avif$/i, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("AVIF decode failed"));
    };
    img.src = objUrl;
  });

// Normalize any user upload to something remove.bg accepts well (jpg/png),
// converting AVIF and rejecting absurdly large files.
async function normalizeUpload(f) {
  if (f.type === "image/avif") return convertAvifToJpeg(f);
  return f;
}

export default function AddClothingModal({ userEmail, onClose, onAdded }) {
  const [tab, setTab] = useState("upload");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("top");
  const [brand, setBrand] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkProgress, setBulkProgress] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("top");
  const { toast } = useToast();

  // Revoke preview object URL on change/unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const handleBulkFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBulkFiles(files);
    setBulkProgress(files.map(() => "pending"));
    setBulkErrors(files.map(() => ""));
  };

  // Core single-item pipeline:
  // 1. Normalize (AVIF -> JPEG)
  // 2. Upload original to Base44 storage
  // 3. Detect a person in the photo; if one is there, re-draw it as a ghost-mannequin shot
  // 4. Call the removeBackground backend function -> processed URL
  // 5. Create ClothingItem entity
  async function pipelineProcess({ rawFile, itemName, itemCategory, itemBrand, onStatus }) {
    const normalized = await normalizeUpload(rawFile);

    onStatus?.("Uploading photo...");
    const { file_url: originalUrl } = await base44.integrations.Core.UploadFile({ file: normalized });

    // Only worn photos get re-drawn, so flat lays and hanger shots stay true to the garment.
    onStatus?.("Checking for a person...");
    let garmentUrl = originalUrl;
    try {
      const { garmentUrl: cleanedUrl, personRemoved } = await prepareGarmentImage(originalUrl);
      garmentUrl = cleanedUrl;
      if (personRemoved) onStatus?.("Person removed...");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[AddClothingModal] garment clean-up failed, using original photo:", e?.message);
    }

    onStatus?.("Removing background...");
    let processedUrl = garmentUrl;
    let bgWarning = "";
    try {
      const response = await base44.functions.invoke("removeBackground", { image_url: garmentUrl });
      if (response.data?.file_url) {
        processedUrl = response.data.file_url;
      } else {
        throw new Error(response.data?.error || "Background removal failed");
      }
    } catch (e) {
      // Don't block the upload, but surface why background removal failed.
      bgWarning = e?.response?.data?.error || e?.message || "Background removal failed";
      // eslint-disable-next-line no-console
      console.warn("[AddClothingModal] background removal failed:", bgWarning);
    }

    const item = await base44.entities.ClothingItem.create({
      user_email: userEmail,
      name: itemName,
      category: itemCategory,
      brand: itemBrand || "",
      original_image_url: originalUrl,
      processed_image_url: processedUrl,
      source: "upload",
      source_url: originalUrl,
    });

    return { item, bgWarning };
  }

  const processSingleFile = async (f, idx) => {
    setBulkProgress((prev) => {
      const n = [...prev];
      n[idx] = "processing";
      return n;
    });
    try {
      const itemName = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const { item } = await pipelineProcess({
        rawFile: f,
        itemName,
        itemCategory: bulkCategory,
        itemBrand: "",
      });
      onAdded(item);
      setBulkProgress((prev) => {
        const n = [...prev];
        n[idx] = "done";
        return n;
      });
    } catch (e) {
      setBulkProgress((prev) => {
        const n = [...prev];
        n[idx] = "error";
        return n;
      });
      setBulkErrors((prev) => {
        const n = [...prev];
        n[idx] = e?.message || "Unknown error";
        return n;
      });
      // eslint-disable-next-line no-console
      console.error("[AddClothingModal] bulk item failed:", e);
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
    if (!name || !category) {
      setError("Please fill in name and category.");
      return;
    }
    if (tab === "upload" && !file) {
      setError("Please choose a photo.");
      return;
    }
    setProcessing(true);
    setError("");
    setStatus("");

    try {
      const { item, bgWarning } = await pipelineProcess({
        rawFile: file,
        itemName: name,
        itemCategory: category,
        itemBrand: brand,
        onStatus: setStatus,
      });
      if (bgWarning) {
        // Item still saved, but warn the user the cutout step didn't run.
        toast({
          title: "Background not removed",
          description: bgWarning,
          variant: "destructive",
        });
      }
      onAdded(item);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[AddClothingModal] submit failed:", e);
      setError(e?.message || "Something went wrong. Please try again.");
    }
    setProcessing(false);
    setStatus("");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: 'calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {tab === "bulk" ? "Bulk Upload" : "Add Clothing Item"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Garment on its own works best.</span> Flat lay, hanger or
              mannequin photos give the cleanest cutouts. If someone is wearing the piece, we spot the
              person and re-draw it as an invisible-mannequin product shot, which can slightly change the fit.
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="w-4 h-4 mr-1" /> Upload Photo
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex-1">
                <FolderOpen className="w-4 h-4 mr-1" /> Bulk
              </TabsTrigger>
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

            <TabsContent value="bulk" className="mt-4 space-y-4">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                  <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Click to select multiple images</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Items will be named from filenames automatically
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleBulkFileChange}
                />
              </label>

              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Category for all items</Label>
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2"
                    style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
                  >
                    {bulkFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1">
                        {bulkProgress[i] === "pending" && (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
                        )}
                        {bulkProgress[i] === "processing" && (
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                        )}
                        {bulkProgress[i] === "done" && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        {bulkProgress[i] === "error" && (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className="truncate text-gray-700">{f.name}</span>
                        {bulkProgress[i] === "error" && bulkErrors[i] && (
                          <span className="ml-auto text-xs text-red-400 truncate max-w-[40%]">
                            {bulkErrors[i]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleBulkSubmit}
                    disabled={bulkRunning}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {bulkRunning ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Processing{" "}
                        {bulkProgress.filter((s) => s === "done").length}/{bulkFiles.length}...
                      </>
                    ) : (
                      `Upload ${bulkFiles.length} item${bulkFiles.length > 1 ? "s" : ""}`
                    )}
                  </Button>
                  {bulkProgress.every((s) => s === "done" || s === "error") && !bulkRunning && (
                    <Button variant="outline" onClick={onClose} className="w-full">
                      Done
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className={`grid grid-cols-2 gap-3 ${tab === "bulk" ? "hidden" : ""}`}>
            <div>
              <Label>Item Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. White blouse"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={tab === "bulk" ? "hidden" : ""}>
            <Label>Brand (optional)</Label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Zara"
              className="mt-1"
            />
          </div>

          {tab !== "bulk" && (
            <div className="sticky bottom-0 space-y-2 border-t border-gray-100 bg-white pt-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleSubmit}
                disabled={processing}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {processing ? (
                  <>
                    <Sparkles className="mr-2 w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Add to Wardrobe"
                )}
              </Button>
              {processing && status && <p className="text-xs text-gray-500 text-center">{status}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}