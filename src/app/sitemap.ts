import type { MetadataRoute } from "next";
import { db } from "@/db";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const ligas = await db.query.ligas.findMany({
    where: (l, { eq }) => eq(l.activo, true),
    columns: { slug: true, updatedAt: true },
  });

  const secciones = ["", "/torneos", "/calendario", "/tabla", "/goleo", "/equipos", "/rol"];
  return [
    { url: base, changeFrequency: "weekly", priority: 0.5 },
    ...ligas.flatMap((l) =>
      secciones.map((s) => ({
        url: `${base}/${l.slug}${s}`,
        lastModified: l.updatedAt,
        changeFrequency: "daily" as const,
        priority: s === "" ? 1 : 0.8,
      }))
    ),
  ];
}
