import type { MetadataRoute } from "next";
import { getBlogPosts, getPackages } from "@/lib/d1";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://dukhdealer.online";

  const [packages, posts] = await Promise.all([
    getPackages(true),
    getBlogPosts(true),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
    },
    {
      url: `${baseUrl}/about`,
    },
    {
      url: `${baseUrl}/services`,
    },
    {
      url: `${baseUrl}/packages`,
    },
    {
      url: `${baseUrl}/blog`,
    },
  ];

  const packagePages: MetadataRoute.Sitemap = packages.map((pkg) => ({
    url: `${baseUrl}/packages/${pkg.id}`,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
  }));

  return [...staticPages, ...packagePages, ...blogPages];
}
