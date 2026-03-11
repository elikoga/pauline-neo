import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const GITLAB_TOKEN = env.GITLAB_TOKEN ?? '';

const PROJECT_ID = 8691;

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  // expect issueText; if it's not there, fail.
  // same with title
  const issueText = formData.get('issueText')?.toString();
  const title = formData.get('title')?.toString() ?? 'Feedback, no title';
  if (!issueText) {
    return new Response("Missing 'issueText' field", { status: 400 });
  }

  // send the issue to gitlab
  try {
    const response = await fetch(
      `https://git.cs.uni-paderborn.de/api/v4/projects/${PROJECT_ID}/issues`,
      {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': GITLAB_TOKEN
        },
        body: new URLSearchParams({
          title,
          description: issueText
        })
      }
    );
    return new Response('Thanks for your feedback!', { status: response.status });
  } catch (error) {
    console.error('Failed to send feedback to GitLab:', error);
    return new Response('Failed to send feedback. Please try again later.', { status: 502 });
  }
};

