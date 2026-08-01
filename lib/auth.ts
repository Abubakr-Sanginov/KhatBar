export type SessionUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export async function getCurrentUser(): Promise<SessionUser> {
  return {
    id: 'user_me',
    username: 'abubakr',
    displayName: 'Abubakr',
    avatarUrl: 'https://avatars.githubusercontent.com/u/180834790?v=4',
  }
}
