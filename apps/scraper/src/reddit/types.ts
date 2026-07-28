export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  created_utc: number;
  stickied: boolean;
}

export interface RedditListingChild {
  kind: string;
  data: RedditPost;
}

export interface RedditListing {
  data: {
    children: RedditListingChild[];
    after: string | null;
  };
}
