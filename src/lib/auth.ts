import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export function buildNextAuthOptions(): any {
  const ADMIN_USER = process.env.ADMIN_USERNAME;
  const ADMIN_PASS = process.env.ADMIN_PASSWORD;

  return {
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials) return null;
          const { username, password } = credentials;
          if (ADMIN_USER && ADMIN_PASS && username === ADMIN_USER && password === ADMIN_PASS) {
            return { id: 'admin', name: ADMIN_USER };
          }
          return null;
        },
      }),
    ],
    session: { strategy: 'jwt' },
    jwt: { secret: process.env.NEXTAUTH_JWT_SECRET || process.env.API_KEY || 'dev-secret' },
  } as any;
}

export default NextAuth(buildNextAuthOptions() as any);
