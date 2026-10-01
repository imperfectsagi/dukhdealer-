import type { MetadataRoute } from "next";
import { getBlogPosts, getPackages } from "@/lib/d1";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // The static pages must always be listed. If D1 is briefly unavailable the
  // sitemap used to throw and answer 500 for the whole file, which Search
  // Console reports as "Couldn't fetch". Fall back to the static URLs instead.
  let packages: Awaited<ReturnType<typeof getPackages>> = [];
  let posts: Awaited<ReturnType<typeof getBlogPosts>> = [];
  try {
    [packages, posts] = await Promise.all([getPackages(true), getBlogPosts(true)]);
  } catch {
    // keep the empty lists
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
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
