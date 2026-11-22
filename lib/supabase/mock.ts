export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("YOUR-PROJECT") &&
      !key.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

export function createMockSupabaseClient(): any {
  const makeQuery = (result: { data: any; error: any }) => {
    const builder: any = {
      select: () => builder,
      insert: () => makeQuery({ data: null, error: { message: "Supabase non configuré." } }),
      update: () => makeQuery({ data: null, error: { message: "Supabase non configuré." } }),
      delete: () => makeQuery({ data: null, error: { message: "Supabase non configuré." } }),
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => makeQuery({ data: null, error: null }),
      then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase non configuré." },
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => makeQuery({ data: [], error: null }),
  };
}
