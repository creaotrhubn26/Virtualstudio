export interface SharingLink {
  id: string;
  token: string;
  url: string;
  projectId: string;
  clientName?: string;
  clientEmail?: string;
  expiresAt?: string;
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  permissions: {
    canComment: boolean;
    canDownload: boolean;
    canApprove: boolean;
    canViewOriginals: boolean;
  };
  password?: string;
  isActive: boolean;
}

export interface ClientFeedback {
  id: string;
  linkId: string;
  imageId?: string;
  comment: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  approved?: boolean;
  createdAt: string;
  authorName?: string;
}

class ClientSharingService {
  private links: SharingLink[] = [];
  private feedbacks: ClientFeedback[] = [];

  createLink(opts: {
    projectId: string;
    clientName?: string;
    clientEmail?: string;
    expiresIn?: number;
    permissions?: Partial<SharingLink['permissions']>;
    password?: string;
  }): SharingLink {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const link: SharingLink = {
      id: `link-${Date.now()}`,
      token,
      url: `${window.location.origin}/client/${token}`,
      projectId: opts.projectId,
      clientName: opts.clientName,
      clientEmail: opts.clientEmail,
      expiresAt: opts.expiresIn ? new Date(Date.now() + opts.expiresIn * 86400000).toISOString() : undefined,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      permissions: {
        canComment: true,
        canDownload: false,
        canApprove: true,
        canViewOriginals: false,
        ...opts.permissions,
      },
      password: opts.password,
      isActive: true,
    };
    this.links.push(link);
    return link;
  }

  getLinks(projectId: string): SharingLink[] {
    return this.links.filter((l) => l.projectId === projectId);
  }

  deactivateLink(id: string): void {
    const link = this.links.find((l) => l.id === id);
    if (link) link.isActive = false;
  }

  deleteLink(id: string): void {
    this.links = this.links.filter((l) => l.id !== id);
  }

  addFeedback(feedback: Omit<ClientFeedback, 'id' | 'createdAt'>): ClientFeedback {
    const fb: ClientFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.feedbacks.push(fb);
    return fb;
  }

  getFeedbacks(linkId: string): ClientFeedback[] {
    return this.feedbacks.filter((f) => f.linkId === linkId);
  }

  async sendEmailInvite(_link: SharingLink, _email: string): Promise<void> {
    console.log(`[ClientSharingService] Email invite sent`);
  }
}

export const clientSharingService = new ClientSharingService();
export default clientSharingService;
