import * as github from '@actions/github';

const HIDDEN_MARKER = '<!-- NOTION_TO_PR_COMMENTS -->';

export class GithubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  async findExistingComment(): Promise<number | null> {
    const { owner, repo } = this.context.repo;
    const issue_number = this.context.issue.number;
    const comments = await this.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number,
    });
    return (
      comments.data.find(
        c => c.user?.login === 'github-actions[bot]' && c.body?.includes(HIDDEN_MARKER)
      )?.id || null
    );
  }

  async postNewComment(body: string): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const issue_number = this.context.issue.number;
    const response = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: body + '\n' + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }

  async updateExistingComment(commentId: number, body: string): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const response = await this.octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: body + '\n' + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }
}
