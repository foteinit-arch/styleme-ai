import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClothingCard({ item, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const imgSrc = item.processed_image_url || item.original_image_url;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={item.name} className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-5xl">👗</span>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          {confirming ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" className="text-xs h-6 px-2"
                onClick={() => onDelete(item.id)}>Yes</Button>
              <Button size="sm" variant="outline" className="text-xs h-6 px-2"
                onClick={() => setConfirming(false)}>No</Button>
            </div>
          ) : (
            <Button size="icon" variant="ghost" className="w-7 h-7 bg-white/80 hover:bg-red-50"
              onClick={() => setConfirming(true)}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge variant="secondary" className="text-xs capitalize bg-orange-50 text-orange-500 border-0">
            {item.category}
          </Badge>
          {item.brand && <span className="text-xs text-gray-400 truncate ml-1">{item.brand}</span>}
        </div>
      </div>
    </div>
  );
}