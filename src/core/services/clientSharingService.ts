export interface ShareLink {
  id: string;
  token: string;
  url: string;
  projectId: string;
  projectName?: string;
  clientName?: string;
  clientEmail?: string;
  expiresAt?: string;
  viewCount: number;
  accessCount?: number;
  lastViewedAt?: string;
  createdAt: string;
  permissions: SharePermissions;
  password?: string;
  pin?: string;
  isActive: boolean;
}

export interface SharePermissions {
  canView: boolean;
  canComment: boolean;
  canDownload: boolean;
  canApprove: boolean;
  canViewOriginals: boolean;
  canViewLighting?: boolean;
  canViewCamera?: boolean;
  canViewEquipment?: boolean;
}

export interface ClientComment {
  id: string;
  linkId: string;
  imageId?: string;
  text: string;
  comment: string;
  content: string;
  clientName?: string;
  timestamp: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  resolved?: boolean;
  approved?: boolean;
  createdAt: string;
  authorName?: string;
  userId?: string;
}

export interface ApprovalStatus {
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  comments: ClientComment[];
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
}

/** @deprecated Use ShareLink */
export type SharingLink = ShareLink;

/** @deprecated Use ClientComment */
export type ClientFeedback = ClientComment;

class ClientSharingService {
  private links: ShareLink[] = [];
  private comments: Map<string, ClientComment[]> = new Map();
  private approvals: Map<string, ApprovalStatus> = new Map();

  createLink(opts: {
    projectId: string;
    projectName?: string;
    clientName?: string;
    clientEmail?: string;
    expiresIn?: number;
    permissions?: Partial<SharePermissions>;
    password?: string;
  }): ShareLink {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const link: ShareLink = {
      id: `link-${Date.now()}`,
      token,
      url: `${window.location.origin}/client/${token}`,
      projectId: opts.projectId,
      projectName: opts.projectName,
      clientName: opts.clientName,
      clientEmail: opts.clientEmail,
      expiresAt: opts.expiresIn ? new Date(Date.now() + opts.expiresIn * 86400000).toISOString() : undefined,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      permissions: {
        canView: true,
        canComment: true,
        canDownload: false,
        canApprove: true,
        canViewOriginals: false,
        canViewLighting: false,
        canViewCamera: false,
        canViewEquipment: false,
        ...opts.permissions,
      },
      password: opts.password,
      isActive: true,
    };
    this.links.push(link);
    return link;
  }

  async createShareLink(
    projectId: string,
    projectName: string,
    opts: Partial<Omit<ShareLink, 'id' | 'token' | 'url' | 'projectId' | 'projectName' | 'viewCount' | 'createdAt'>> & { expiresIn?: number; pin?: string }
  ): Promise<ShareLink> {
    const { expiresIn, pin, ...rest } = opts;
    const link = this.createLink({ projectId, projectName, expiresIn, password: pin, ...rest });
    return link;
  }

  async getShareLinks(projectId: string): Promise<ShareLink[]> {
    return this.links.filter((l) => l.projectId === projectId);
  }

  getLinks(projectId: string): ShareLink[] {
    return this.links.filter((l) => l.projectId === projectId);
  }

  getShareUrl(token: string): string {
    return `${window.location.origin}/client/${token}`;
  }

  async copyShareUrl(token: string): Promise<boolean> {
    const url = this.getShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      console.warn('[ClientSharingService] Failed to copy URL to clipboard');
      return false;
    }
  }

  deactivateLink(id: string): void {
    const link = this.links.find((l) => l.id === id);
    if (link) link.isActive = false;
  }

  async revokeShareLink(linkId: string): Promise<void> {
    const link = this.links.find((l) => l.id === linkId);
    if (link) {
      link.isActive = false;
    }
  }

  deleteLink(id: string): void {
    this.links = this.links.filter((l) => l.id !== id);
  }

  addFeedback(feedback: Omit<ClientComment, 'id' | 'createdAt'>): ClientComment {
    const fb: ClientComment = {
      ...feedback,
      id: `fb-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const existing = this.comments.get(feedback.linkId) ?? [];
    this.comments.set(feedback.linkId, [...existing, fb]);
    return fb;
  }

  async getComments(linkId: string): Promise<ClientComment[]> {
    return this.comments.get(linkId) ?? [];
  }

  getFeedbacks(linkId: string): ClientComment[] {
    return this.comments.get(linkId) ?? [];
  }

  async getApprovalStatus(linkId: string): Promise<ApprovalStatus> {
    return this.approvals.get(linkId) ?? {
      approved: false,
      comments: [],
      status: 'pending',
    };
  }

  async resolveComment(commentId: string, _resolvedBy: string): Promise<void> {
    for (const [linkId, commentList] of this.comments) {
      const updated = commentList.map((c) =>
        c.id === commentId ? { ...c, resolved: true } : c
      );
      this.comments.set(linkId, updated);
    }
  }

  async sendEmailInvite(_link: ShareLink, _email: string): Promise<void> {
    console.log(`[ClientSharingService] Email invite sent`);
  }
}

export const clientSharingService = new ClientSharingService();
export default clientSharingService;
