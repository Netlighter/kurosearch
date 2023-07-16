import { replaceHtmlEntities } from '$lib/logic/replace-html-entities';
import { getTagTypePriority } from '$lib/logic/tag-type-data';
import { fetchAbortPrevious } from '../fetchAbortPrevious';

export const PAGE_SIZE = 20;

let getPageAbortController: AbortController | null = null;

export const getPage = async (pageNumber: number, tags: string) => {
	const response = await fetchAbortPrevious(getPostsUrl(pageNumber, tags), getPageAbortController);
	throwOnUnexpectedStatus(response);

	try {
		const data = await response.json();
		const posts = data.map(parsePost);

		return posts;
	} catch {
		return [];
	}
};

export const getCount = async (tags: string) => {
	const response = await fetchAbortPrevious(getCountUrl(tags), getPageAbortController);

	throwOnUnexpectedStatus(response);

	const text = await response.text();
	const parser = new DOMParser();
	const xml = parser.parseFromString(text, 'text/xml');
	const count = Number(xml.getElementsByTagName('posts')[0].getAttribute('count'));

	throwOnInvalidCount(count);

	return count;
};

const throwOnUnexpectedStatus = (response: Response) => {
	if (!response.ok) {
		throw new Error(`getPage failed with http status ${response.status}`);
	}
};

const parsePost = (post: r34.Post): kurosearch.Post => {
	const height = post.height;
	const score = post.score;
	const preview_url = post.preview_url;
	const file_url = post.file_url;
	const parent_id = post.parent_id;
	const sample_url = post.sample_url;
	const sample_width = post.sample_width;
	const sample_height = post.sample_height;
	const rating = post.rating;
	const tagInfo = post.tag_info;
	const id = post.id;
	const width = post.width;
	const change = post.change;
	const comment_count = post.comment_count;
	const status = post.status;
	const source = post.source;

	return {
		preview_url,
		sample_url,
		file_url,
		comment_count: Number(comment_count),
		height: Number(height),
		id: Number(id),
		change: Number(change) * 1000,
		parent_id: parent_id ? Number(parent_id) : undefined,
		rating,
		sample_height: Number(sample_height),
		sample_width: Number(sample_width),
		score: Number(score),
		source,
		status,
		tags: parseTagInfo(tagInfo),
		width: Number(width),
		type: parsePostType(file_url)
	};
};

const parseTagInfo = (tagInfo: r34.Tag[]): kurosearch.Tag[] => {
	return tagInfo.map(parseTag).sort(byDescendingPriority);
};

const parseTag = ({ tag, count, type }: r34.Tag): kurosearch.Tag => {
	return {
		name: replaceHtmlEntities(tag),
		count,
		type
	};
};

const byDescendingPriority = (a: kurosearch.Tag, b: kurosearch.Tag) =>
	getTagTypePriority(a.type) - getTagTypePriority(b.type);

export const getPostsUrl = (pageNumber: number, serializedTags: string) => {
	const baseApiPostsUrl = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&fields=tag_info&json=1`;
	const url = `${baseApiPostsUrl}&limit=${PAGE_SIZE}&pid=${pageNumber}`;
	return serializedTags === '' ? url : `${url}&tags=${serializedTags}`;
};

export const getCountUrl = (serializedTags: string) => {
	const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=0`;
	return serializedTags === '' ? url : `${url}&tags=${serializedTags}`;
};

const throwOnInvalidCount = (count: unknown) => {
	if (typeof count !== 'number') {
		throw new Error('Unexpected response received in getPage');
	}
};

const parsePostType = (file_url: string): kurosearch.PostType => {
	return file_url.endsWith('.webm') || file_url.endsWith('.mp4')
		? 'video'
		: file_url.includes('.gif')
		? 'gif'
		: 'image';
};
