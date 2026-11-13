"use client";

import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { useLang, localHref } from "@/lib/i18n";

/** next/link that keeps English visitors on the English pages. */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...rest }, ref) {
  const lang = useLang();
  const h = typeof href === "string" ? localHref(lang, href) : href;
  return <NextLink ref={ref} href={h} {...rest} />;
});
export default Link;
