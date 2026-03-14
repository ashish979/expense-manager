import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: 28, md: 36, lg: 48 };
const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const px = sizes[size];
  const initials = name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "avatar"}
        width={px}
        height={px}
        className="rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium ${textSizes[size]}`}
      style={{ width: px, height: px }}
    >
      {initials ?? "?"}
    </div>
  );
}
