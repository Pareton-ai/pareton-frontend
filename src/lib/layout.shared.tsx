import Image from "next/image";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <Image
          src="/logo-text.png"
          alt="Pareton"
          width={2784}
          height={750}
          priority
          className="h-6 w-auto"
        />
      ),
      url: "/",
    },
    links: [
      {
        text: "Dashboard",
        url: "/dashboard",
      },
      {
        text: "GitHub",
        url: "https://github.com/pareton-ai",
        external: true,
      },
    ],
  };
}
