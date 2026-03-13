import { Camera } from "lucide-react";

export default function AvatarPreview({ profile = {} }) {
  const { avatar_photo_url } = profile;

  if (avatar_photo_url) {
    return (
      <div className="w-56 h-96 rounded-3xl overflow-hidden border-2 border-rose-200 shadow-lg">
        <img
          src={avatar_photo_url}
          alt="Your avatar"
          className="w-full h-full object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div className="w-56 h-96 rounded-3xl border-2 border-dashed border-rose-300 bg-rose-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
        <Camera className="w-7 h-7 text-rose-400" />
      </div>
      <p className="text-rose-600 font-medium text-sm leading-snug">
        Upload your photo to see yourself here
      </p>
      <p className="text-rose-400 text-xs leading-snug">
        Go to <span className="font-semibold">My Avatar → Body Photo</span> to upload
      </p>
    </div>
  );
}