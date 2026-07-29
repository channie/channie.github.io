/* RSS feed for the Experimenting blog → /experimenting/rss.xml.
   Mirrors the list page: published posts, newest first, with the excerpt
   as the item description. Linked from every page's <head> (BaseLayout). */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '../../data/site';

export async function GET(context: APIContext) {
  const posts = (await getCollection('experiments', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: `Experimenting — ${site.name}`,
    description: 'Projects, experiments, and AI workflows as they take shape.',
    // `context.site` comes from `site:` in astro.config (https://channie.org).
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      categories: [post.data.category],
      // co-located posts are <slug>/index → strip the trailing /index
      link: `/experimenting/${post.id.replace(/\/index$/, '')}/`,
    })),
  });
}
