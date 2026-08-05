import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Pareton",
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
