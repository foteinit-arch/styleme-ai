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

  const handleSubmit = async () => {
  if (!name || !category) { setError("Please fill in name and category."); return; }
  setProcessing(true);
  setError("");

  let originalUrl = "";
  let processedUrl = "";

  try {
    if (tab === "upload" && file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      originalUrl = file_url;
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(file);
        const processedFile = new File([blob], "processed.png", { type: "image/png" });
        const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processedFile });
        processedUrl = pUrl;
      } catch {
        processedUrl = originalUrl;
      }
    } else if (tab === "url" && url) {
      originalUrl = url;
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const res = await fetch(url);
        const blob = await res.blob();
        const processedBlob = await removeBackground(blob);
        const processedFile = new File([processedBlob], "processed.png", { type: "image/png" });
        const { file_url: pUrl } = await base44.integrations.Core.UploadFile({ file: processedFile });
        processedUrl = pUrl;
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

    onAdded(item);
  } catch (e) {
    setError("Something went wrong. Please try again.");
  }
  setProcessing(false);
};